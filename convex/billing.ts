// convex/billing.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { mapVariantToPlan, limitsForTier } from "./billingPlan";
import { Id } from "./_generated/dataModel";

// ===========================================================
// Helpers
// ===========================================================
function ts(input?: string | null): number | undefined {
  if (!input) return undefined;
  const n = Date.parse(input);
  return Number.isFinite(n) ? n : undefined;
}

function cents(n: any): number {
  const x = Number(n);
  return Number.isFinite(x) ? Math.round(x) : 0;
}

const ALLOWED = new Set([
  "order_created",
  "order_refunded",

  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_expired",
  "subscription_plan_changed",

  "subscription_payment_success",
  "subscription_payment_failed",
  "subscription_payment_refunded",
]);

// custom_data قد تحتوي Convex orgId أو Clerk org id
async function resolveOrganizationId(
  ctx: any,
  orgRef?: string
): Promise<Id<"organizations"> | undefined> {
  if (!orgRef) return undefined;

  // احتمال 1: قيمة orgRef هي Convex Id<"organizations">
  try {
    // Convex ids لها صيغة معيّنة، لكن أبسط اختبار عملي:
    const maybe = await ctx.db.get(orgRef as Id<"organizations">);
    if (maybe?._id) return maybe._id as Id<"organizations">;
  } catch {
    // ليس Convex Id
  }

  // احتمال 2: هي Clerk org id — ابحث عبر index by_clerkOrgId
  const byClerk = await ctx.db
    .query("organizations")
    .withIndex("by_clerkOrgId", (q: any) => q.eq("clerkOrgId", orgRef))
    .first();
  return byClerk?._id as Id<"organizations"> | undefined;
}

function extractContext(payload: any) {
  const meta = payload?.meta ?? {};
  const custom = meta?.custom_data ?? {};
  return {
    rawOrganizationRef: custom?.organizationId as string | undefined, // قد تكون Convex أو Clerk
    clerkUserId: (custom?.clerkUserId as string | undefined) ?? undefined,
  };
}

// ===========================================================
// Viewer Role
// ===========================================================
export const getViewerRole = query({
  args: {
    organizationId: v.id("organizations"),
    clerkUserId: v.string(),
  },
  handler: async (ctx, { organizationId, clerkUserId }) => {
    const member = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("clerkUserId"), clerkUserId))
      .first();
    return member?.role ?? null; // "owner" | "admin" | "member" | null
  },
});

// ===========================================================
// ingestWebhook - storing all events
// ===========================================================
export const ingestWebhook = mutation({
  args: {
    eventName: v.string(),
    lemonId: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const dup = await ctx.db
      .query("webhookEvents")
      .withIndex("by_lemonId", (q) => q.eq("lemonId", args.lemonId))
      .first();

    if (!dup) {
      await ctx.db.insert("webhookEvents", {
        eventName: args.eventName,
        lemonId: args.lemonId,
        payload: args.payload,
        receivedAt: Date.now(),
        processed: false,
      });
    }
  },
});

// ===========================================================
// handleEvent - the brain of billing
// ===========================================================
export const handleEvent = mutation({
  args: {
    eventName: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, { eventName, payload }) => {
    if (!ALLOWED.has(eventName)) {
      const lemonId = payload?.data?.id ?? "unknown";
      const ev = await ctx.db
        .query("webhookEvents")
        .withIndex("by_lemonId", (q) => q.eq("lemonId", lemonId))
        .first();
      if (ev) await ctx.db.patch(ev._id, { processed: true });
      return;
    }

    const { rawOrganizationRef, clerkUserId } = extractContext(payload);
    const organizationId = await resolveOrganizationId(ctx, rawOrganizationRef);
    const data = payload?.data ?? {};
    const attr = data?.attributes ?? {};

    const lemonId = String(data?.id ?? "");
    const productId = attr?.product_id ? String(attr.product_id) : undefined;
    const variantIdFromEvent = attr?.variant_id
      ? String(attr.variant_id)
      : undefined;
    const productName = attr?.product_name ?? undefined;
    const variantName = attr?.variant_name ?? undefined;

    // ===========================================================
    // ORDER CREATED
    // ===========================================================
    if (eventName === "order_created") {
      const lemonCustomerId = attr?.customer_id
        ? String(attr.customer_id)
        : undefined;
      const email = attr?.user_email ?? undefined;

      if (organizationId && lemonCustomerId) {
        const existing = await ctx.db
          .query("billingCustomers")
          .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
          .first();

        if (existing) {
          await ctx.db.patch(existing._id, {
            lemonCustomerId,
            email: email ?? existing.email,
            updatedAt: Date.now(),
          });
        } else {
          await ctx.db.insert("billingCustomers", {
            organizationId,
            clerkUserId: clerkUserId ?? "",
            lemonCustomerId,
            email,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }
    }

    // ===========================================================
    // ORDER REFUNDED
    // ===========================================================
    if (eventName === "order_refunded") {
      if (organizationId) {
        await ctx.db.insert("invoices", {
          organizationId,
          lemonInvoiceId: lemonId,
          subscriptionId: undefined,
          amountCents: cents(attr?.total ?? 0) * -1,
          currency: attr?.currency ?? "USD",
          status: "refunded",
          issuedAt: ts(attr?.created_at) ?? Date.now(),
          paidAt: ts(attr?.refunded_at),
          meta: attr,
          createdAt: Date.now(),
        });
      }
    }

    // ===========================================================
    // SUBSCRIPTION CREATED / UPDATED / PLAN CHANGED
    // ===========================================================
    if (
      eventName === "subscription_created" ||
      eventName === "subscription_updated" ||
      eventName === "subscription_plan_changed"
    ) {
      const subIdExternal = String(data?.id ?? "");
      const status = String(attr?.status ?? "active");
      const renewsAt = ts(attr?.renews_at);
      const canceledAt = ts(attr?.canceled_at);
      const trialEndsAt = ts(attr?.trial_ends_at);
      const variantId = variantIdFromEvent; // في هذه الأحداث عادةً موجود

      if (organizationId && subIdExternal) {
        const existing = await ctx.db
          .query("subscriptions")
          .withIndex("by_sub", (q) =>
            q.eq("lemonSubscriptionId", subIdExternal)
          )
          .first();

        let subscriptionId: Id<"subscriptions">;

        if (existing) {
          await ctx.db.patch(existing._id, {
            status,
            productId,
            variantId,
            planName: variantName ?? existing.planName ?? productName,
            currentPeriodEnd: renewsAt,
            renewsAt,
            canceledAt,
            trialEndsAt,
            updatedAt: Date.now(),
          });
          subscriptionId = existing._id;
        } else {
          subscriptionId = await ctx.db.insert("subscriptions", {
            organizationId,
            lemonSubscriptionId: subIdExternal,
            status,
            productId,
            variantId,
            planName: variantName ?? productName,
            currentPeriodEnd: renewsAt,
            renewsAt,
            canceledAt,
            trialEndsAt,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }

        // ---- APPLY PLAN TO ORGANIZATION ----
        if (variantId) {
          const { tier, limits } = mapVariantToPlan(variantId);

          await ctx.db.patch(organizationId, {
            planTier: tier,
            billingStatus:
              status === "active"
                ? "active"
                : status === "on_trial"
                  ? "trial"
                  : status === "past_due"
                    ? "past_due"
                    : status === "cancelled"
                      ? "cancelled"
                      : status === "expired"
                        ? "expired"
                        : "none",
            activeSubscriptionId: subscriptionId,
            renewsAt: renewsAt ?? undefined,
            limits: {
              members:
                limits.members === "unlimited" ? undefined : limits.members,
              dailyAnalyses:
                limits.dailyAnalyses === "unlimited"
                  ? undefined
                  : limits.dailyAnalyses,
              exports: limits.exports,
              integrations: limits.integrations,
              features: limits.features,
              support: limits.support,
            },
          });
        }
      }
    }

    // ===========================================================
    // SUBSCRIPTION CANCELLED / EXPIRED
    // ===========================================================
    if (
      eventName === "subscription_cancelled" ||
      eventName === "subscription_expired"
    ) {
      const subIdExternal = String(data?.id ?? "");

      if (subIdExternal) {
        const existing = await ctx.db
          .query("subscriptions")
          .withIndex("by_sub", (q) =>
            q.eq("lemonSubscriptionId", subIdExternal)
          )
          .first();

        if (existing) {
          await ctx.db.patch(existing._id, {
            status:
              eventName === "subscription_cancelled" ? "cancelled" : "expired",
            updatedAt: Date.now(),
          });

          // لا نُرجع إلى basic — نعيده إلى no-plan كما اتفقنا
          await ctx.db.patch(existing.organizationId, {
            billingStatus:
              eventName === "subscription_cancelled" ? "cancelled" : "expired",
            activeSubscriptionId: undefined,
            planTier: undefined,
            renewsAt: undefined,
            limits: undefined,
          });
        }
      }
    }

    // ===========================================================
    // SUBSCRIPTION PAYMENT (SUCCESS / FAILED / REFUNDED)
    // ===========================================================
    if (
      eventName === "subscription_payment_success" ||
      eventName === "subscription_payment_failed" ||
      eventName === "subscription_payment_refunded"
    ) {
      // تخزين الفاتورة/المعاملة
      if (organizationId) {
        const statusInvoice =
          eventName === "subscription_payment_success"
            ? "paid"
            : eventName === "subscription_payment_failed"
              ? "payment_failed"
              : "refunded";

        await ctx.db.insert("invoices", {
          organizationId,
          lemonInvoiceId: lemonId,
          subscriptionId: undefined, // يمكن ربطها لاحقًا لو أردت
          amountCents:
            cents(attr?.total ?? 0) * (statusInvoice === "refunded" ? -1 : 1),
          currency: attr?.currency ?? "USD",
          status: statusInvoice,
          issuedAt: ts(attr?.created_at) ?? Date.now(),
          paidAt:
            statusInvoice === "paid"
              ? (ts(attr?.paid_at) ?? Date.now())
              : statusInvoice === "refunded"
                ? ts(attr?.refunded_at)
                : undefined,
          meta: attr,
          createdAt: Date.now(),
        });

        // تجديد الاشتراك وتحديث المنظمة عند نجاح الدفع
        if (
          eventName === "subscription_payment_success" &&
          attr?.subscription_id
        ) {
          const subIdExternal = String(attr.subscription_id);

          const sub = await ctx.db
            .query("subscriptions")
            .withIndex("by_sub", (q) =>
              q.eq("lemonSubscriptionId", subIdExternal)
            )
            .first();

          if (sub) {
            const newRenew = ts(attr?.renews_at) ?? sub.renewsAt;
            await ctx.db.patch(sub._id, {
              status: "active",
              renewsAt: newRenew,
              currentPeriodEnd: newRenew,
              updatedAt: Date.now(),
            });

            // استخدم variantId من الاشتراك المخزّن (قد لا يأتي في هذا الحدث)
            const variantId = sub.variantId;
            if (variantId) {
              const { tier, limits } = mapVariantToPlan(variantId);
              await ctx.db.patch(organizationId, {
                billingStatus: "active",
                planTier: tier,
                renewsAt: newRenew,
                limits: {
                  members:
                    limits.members === "unlimited" ? undefined : limits.members,
                  dailyAnalyses:
                    limits.dailyAnalyses === "unlimited"
                      ? undefined
                      : limits.dailyAnalyses,
                  exports: limits.exports,
                  integrations: limits.integrations,
                  features: limits.features,
                  support: limits.support,
                },
              });
            }
          }
        }
      }
    }

    // ===========================================================
    // MARK AS PROCESSED
    // ===========================================================
    const ev = await ctx.db
      .query("webhookEvents")
      .withIndex("by_lemonId", (q) => q.eq("lemonId", lemonId || "unknown"))
      .first();
    if (ev) await ctx.db.patch(ev._id, { processed: true });
  },
});
