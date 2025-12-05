import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { mapVariantToPlan, limitsForTier } from "./billingPlan";

/* --------------------------------------------------------------
 * Helper Functions
 * -------------------------------------------------------------- */

function mapLemonStatus(
  s: string
): "none" | "trial" | "active" | "past_due" | "cancelled" | "expired" {
  if (s === "on_trial") return "trial";
  if (s === "active") return "active";
  if (s === "past_due") return "past_due";
  if (s === "cancelled") return "cancelled";
  if (s === "expired") return "expired";
  return "none";
}

function ts(input?: string | null): number | undefined {
  if (!input) return undefined;
  const n = Date.parse(input);
  return Number.isFinite(n) ? n : undefined;
}

function cents(n: any): number {
  const x = Number(n);
  return Number.isFinite(x) ? Math.round(x) : 0;
}

function getTier(variantId?: string | null) {
  if (!variantId) return null;
  try {
    return mapVariantToPlan(variantId).tier as
      | "basic"
      | "starter"
      | "pro"
      | "business";
  } catch {
    return null;
  }
}

function isUpgrade(
  currentTier: "basic" | "starter" | "pro" | "business" | null,
  newTier: "basic" | "starter" | "pro" | "business" | null
) {
  if (!currentTier && newTier) return true;
  if (!currentTier || !newTier) return false;

  const order = ["basic", "starter", "pro", "business"] as const;
  const idx = (x: "basic" | "starter" | "pro" | "business") => order.indexOf(x);

  return idx(newTier) > idx(currentTier);
}

async function resolveOrganizationId(ctx: any, ref?: string) {
  if (!ref) return undefined;

  try {
    const maybe = await ctx.db.get(ref as Id<"organizations">);
    if (maybe?._id) return maybe._id;
  } catch {}

  const viaClerk = await ctx.db
    .query("organizations")
    .withIndex("by_clerkOrgId", (q: any) => q.eq("clerkOrgId", ref))
    .first();

  return viaClerk?._id;
}

/* --------------------------------------------------------------
 * Queries
 * -------------------------------------------------------------- */

export const getViewerRole = query({
  args: { organizationId: v.id("organizations"), clerkUserId: v.string() },
  handler: async (ctx, { organizationId, clerkUserId }) => {
    const member = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("clerkUserId"), clerkUserId))
      .first();

    return member?.role ?? null;
  },
});

export const getCurrentPlan = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const org = await ctx.db.get(organizationId);
    if (!org)
      return {
        planTier: null,
        billingStatus: null,
        activeSubscriptionId: null,
      };

    return {
      planTier: org.planTier ?? null,
      billingStatus: org.billingStatus ?? null,
      activeSubscriptionId: org.activeSubscriptionId ?? null,
    };
  },
});

export const getBillingCustomer = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const bc = await ctx.db
      .query("billingCustomers")
      .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
      .first();

    return bc
      ? {
          email: bc.email ?? null,
          lemonCustomerId: bc.lemonCustomerId ?? null,
        }
      : null;
  },
});

export const getBillingPortalData = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const org = await ctx.db.get(organizationId);
    if (!org) return { plan: null, limits: null };

    const plan = org.planTier ?? null;
    let remainingAnalyses: number | "unlimited" | undefined = undefined;

    if (org.planTier) {
      const lim = limitsForTier(org.planTier);

      if (lim.dailyAnalyses === "unlimited") {
        remainingAnalyses = "unlimited";
      } else {
        const now = Date.now();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const startMs = start.getTime();

        const analyses = await ctx.db
          .query("chatAnalyses")
          .withIndex("by_org_createdAt", (q: any) =>
            q.eq("organizationId", organizationId).gte("createdAt", startMs)
          )
          .collect();

        remainingAnalyses = Math.max(0, lim.dailyAnalyses - analyses.length);
      }
    }

    const limits = org.limits
      ? {
          remaining: remainingAnalyses,
          employees: org.limits.members,
          integrations: org.limits.integrations?.length ?? 0,
        }
      : null;

    return { plan, limits };
  },
});

/* --------------------------------------------------------------
 * Insert Webhook Event
 * -------------------------------------------------------------- */

export const ingestWebhook = mutation({
  args: { eventName: v.string(), lemonId: v.string(), payload: v.any() },
  handler: async (ctx, args) => {
    const dup = await ctx.db
      .query("webhookEvents")
      .withIndex("by_lemonId", (q: any) => q.eq("lemonId", args.lemonId))
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

/* --------------------------------------------------------------
 * Main Billing Webhook Processor
 * -------------------------------------------------------------- */

export const handleEvent = mutation({
  args: { eventName: v.string(), payload: v.any() },
  handler: async (ctx, { eventName, payload }) => {
    const data = payload?.data ?? {};
    const attr = data?.attributes ?? {};
    const lemonId = String(data?.id ?? "");

    // Extract org + clerkUser from webhook custom data
    const custom = payload?.meta?.custom_data ?? {};
    const orgRef = custom?.organizationId as string | undefined;
    const clerkUserId = custom?.clerkUserId as string | undefined;

    const organizationId = await resolveOrganizationId(ctx, orgRef);

    /* -------------------------
     * ORDER CREATED
     * ------------------------- */
    if (eventName === "order_created") {
      if (organizationId && attr?.customer_id) {
        const existing = await ctx.db
          .query("billingCustomers")
          .withIndex("by_org", (q: any) =>
            q.eq("organizationId", organizationId)
          )
          .first();

        const email = attr?.user_email ?? undefined;

        if (existing) {
          await ctx.db.patch(existing._id, {
            lemonCustomerId: String(attr.customer_id),
            email: email ?? existing.email,
            updatedAt: Date.now(),
          });
        } else {
          await ctx.db.insert("billingCustomers", {
            organizationId,
            clerkUserId: clerkUserId ?? "",
            lemonCustomerId: String(attr.customer_id),
            email,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }
    }

    /* -------------------------
     * ORDER REFUNDED
     * ------------------------- */
    if (eventName === "order_refunded" && organizationId) {
      await ctx.db.insert("invoices", {
        organizationId,
        lemonInvoiceId: lemonId,
        subscriptionId: undefined,
        amountCents: -cents(attr?.total ?? 0),
        currency: attr?.currency ?? "USD",
        status: "refunded",
        issuedAt: ts(attr?.created_at) ?? Date.now(),
        paidAt: ts(attr?.refunded_at),
        meta: attr,
        createdAt: Date.now(),
      });
    }

    /* -------------------------
     * SUBSCRIPTIONS
     * ------------------------- */
    if (eventName.startsWith("subscription_")) {
      const subExternal = String(data?.id ?? "");
      const statusRaw = String(attr?.status ?? "none");
      const status = mapLemonStatus(statusRaw);

      const variantId =
        attr?.variant_id ??
        data?.attributes?.first_subscription_item?.variant_id ??
        undefined;

      const renewsAt = ts(attr?.renews_at);
      const canceledAt = ts(attr?.canceled_at);
      const trialEndsAt = ts(attr?.trial_ends_at);

      const subscriptionUpdate = {
        status: statusRaw,
        productId: attr?.product_id ? String(attr.product_id) : undefined,
        variantId: variantId ? String(variantId) : undefined,
        planName: attr?.variant_name ?? attr?.product_name,
        currentPeriodEnd: renewsAt,
        renewsAt,
        canceledAt,
        trialEndsAt,
        updatedAt: Date.now(),

        // Important URLs
        customerPortal: attr?.urls?.customer_portal ?? null,
        updatePaymentMethodUrl: attr?.urls?.update_payment_method ?? null,
        updateSubscriptionUrl:
          attr?.urls?.customer_portal_update_subscription ?? null,
      };

      if (organizationId) {
        // التحقق من الاشتراك المكرر في نفس الخطة
        if (eventName === "subscription_created") {
          const org = await ctx.db
            .query("organizations")
            .filter((q) => q.eq(q.field("_id"), organizationId))
            .first();
          const newTier = getTier(variantId);
          const currentTier = org?.planTier ?? null;

          // إذا كان لديه اشتراك نشط في نفس الخطة
          if (
            org?.activeSubscriptionId &&
            currentTier &&
            newTier &&
            currentTier === newTier &&
            status !== "cancelled" &&
            status !== "expired"
          ) {
            // نحفظ الاشتراك الجديد في قاعدة البيانات لكن لا نحدث organization
            await ctx.db.insert("subscriptions", {
              organizationId,
              lemonSubscriptionId: subExternal,
              createdAt: Date.now(),
              ...subscriptionUpdate,
              status: "cancelled", // نضع status كـ cancelled في قاعدة البيانات
            });

            // محاولة إلغاء الاشتراك الجديد عبر Lemon Squeezy API
            // ملاحظة: هذا يتطلب action وليس mutation، لكن يمكننا تجاهل الخطأ
            try {
              const apiKey = process.env.LEMON_SECRET_KEY;
              if (apiKey) {
                // إلغاء الاشتراك عبر Lemon Squeezy API
                await fetch(
                  `https://api.lemonsqueezy.com/v1/subscriptions/${subExternal}`,
                  {
                    method: "DELETE",
                    headers: {
                      Authorization: `Bearer ${apiKey}`,
                      Accept: "application/vnd.api+json",
                    },
                  }
                );
              }
            } catch (error) {
              // إذا فشل الإلغاء، نستمر - الاشتراك سيُلغى يدوياً لاحقاً
              console.error(
                `Failed to cancel duplicate subscription ${subExternal}:`,
                error
              );
            }

            // لا نحدث organization - نحتفظ بالاشتراك القديم
            console.warn(
              `Duplicate subscription detected and cancelled for org ${organizationId}: existing tier ${currentTier}, new tier ${newTier}, subscription ${subExternal}`
            );
            return; // نخرج من الدالة ولا نحدث organization
          }
        }

        const existing = await ctx.db
          .query("subscriptions")
          .withIndex("by_sub", (q: any) =>
            q.eq("lemonSubscriptionId", subExternal)
          )
          .first();

        let subscriptionId: Id<"subscriptions">;

        if (existing) {
          await ctx.db.patch(existing._id, subscriptionUpdate);
          subscriptionId = existing._id;
        } else {
          subscriptionId = await ctx.db.insert("subscriptions", {
            organizationId,
            lemonSubscriptionId: subExternal,
            createdAt: Date.now(),
            ...subscriptionUpdate,
          });
        }

        // Update org billing info
        const tier = getTier(subscriptionUpdate.variantId ?? null);

        if (tier) {
          const { limits } = mapVariantToPlan(subscriptionUpdate.variantId);

          await ctx.db.patch(organizationId, {
            planTier: tier,
            billingStatus: status,
            activeSubscriptionId: subscriptionId,
            renewsAt,
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

    /* -------------------------
     * SUBSCRIPTION PAYMENT
     * ------------------------- */
    if (eventName.startsWith("subscription_payment_") && organizationId) {
      const isRefund = eventName === "subscription_payment_refunded";
      const isFailed = eventName === "subscription_payment_failed";

      const invoiceStatus = isRefund
        ? "refunded"
        : isFailed
          ? "payment_failed"
          : "paid";

      await ctx.db.insert("invoices", {
        organizationId,
        lemonInvoiceId: lemonId,
        subscriptionId: undefined,
        amountCents: cents(attr?.total ?? 0) * (isRefund ? -1 : 1),
        currency: attr?.currency ?? "USD",
        status: invoiceStatus,
        issuedAt: ts(attr?.created_at) ?? Date.now(),
        paidAt: ts(attr?.paid_at),
        meta: attr,
        createdAt: Date.now(),
      });

      if (!isFailed && attr?.subscription_id) {
        const subId = String(attr.subscription_id);

        const existing = await ctx.db
          .query("subscriptions")
          .withIndex("by_sub", (q: any) => q.eq("lemonSubscriptionId", subId))
          .first();

        if (existing) {
          const newRenew = ts(attr?.renews_at) ?? existing.renewsAt;

          await ctx.db.patch(existing._id, {
            status: "active",
            renewsAt: newRenew,
            currentPeriodEnd: newRenew,
            updatedAt: Date.now(),
          });

          const tier = getTier(existing.variantId);
          if (tier) {
            const { limits } = mapVariantToPlan(existing.variantId!);

            await ctx.db.patch(existing.organizationId, {
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

    /* -------------------------
     * Mark Webhook Processed
     * ------------------------- */
    const ev = await ctx.db
      .query("webhookEvents")
      .withIndex("by_lemonId", (q: any) => q.eq("lemonId", lemonId))
      .first();

    if (ev) await ctx.db.patch(ev._id, { processed: true });
  },
});
