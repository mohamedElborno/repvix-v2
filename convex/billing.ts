// convex/billing.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { mapVariantToPlan, limitsForTier } from "./billingPlan";
import { Id } from "./_generated/dataModel";

function getTier(variantId?: string | null) {
  if (!variantId) return null;
  try {
    return mapVariantToPlan(variantId).tier; // "basic" | "starter" | "pro" | "business" (أياً كانت عندك)
  } catch {
    return null;
  }
}

function isUpgrade(currentTier: any, newTier: any) {
  if (!currentTier && newTier) return true; // لا توجد خطة حالية
  if (!currentTier || !newTier) return false;
  // إذا كانت التراتبية لديك string فحوّلها لمؤشر رقمي
  const order = ["basic", "starter", "pro", "business"];
  const idx = (x: any) => (typeof x === "string" ? order.indexOf(x) : -1);
  return idx(newTier) > idx(currentTier);
}

async function markProcessed(ctx: any, lemonId: string) {
  const ev = await ctx.db
    .query("webhookEvents")
    .withIndex("by_lemonId", (q: any) => q.eq("lemonId", lemonId))
    .first();
  if (ev) await ctx.db.patch(ev._id, { processed: true });
}

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
  console.log("meta", meta);
  const custom = meta?.custom_data ?? {};
  console.log("custom", custom);
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
// Get Current Plan
// ===========================================================
export const getCurrentPlan = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    const org = await ctx.db.get(organizationId);
    if (!org) {
      return {
        planTier: null,
        billingStatus: null,
        activeSubscriptionId: null,
      };
    }
    return {
      planTier: org.planTier ?? null,
      billingStatus: org.billingStatus ?? null,
      activeSubscriptionId: org.activeSubscriptionId ?? null,
    };
  },
});

// ===========================================================
// Get Billing Portal Data
// ===========================================================
export const getBillingPortalData = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    const org = await ctx.db.get(organizationId);
    if (!org) {
      return {
        plan: null,
        limits: null,
        portalUrl: null,
      };
    }

    const plan = org.planTier ?? null;

    // Calculate remaining analyses for today
    let remainingAnalyses: number | "unlimited" | undefined = undefined;
    if (org.planTier) {
      const limits = limitsForTier(org.planTier);
      const dailyLimit = limits.dailyAnalyses;

      if (dailyLimit === "unlimited") {
        remainingAnalyses = "unlimited";
      } else {
        // Calculate used analyses today
        const now = Date.now();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const startOfDayMs = startOfDay.getTime();

        const analyses = await ctx.db
          .query("chatAnalyses")
          .withIndex("by_org_createdAt", (q) =>
            q
              .eq("organizationId", organizationId)
              .gte("createdAt", startOfDayMs)
          )
          .collect();

        const usedToday = analyses.length;
        remainingAnalyses = Math.max(0, dailyLimit - usedToday);
      }
    }

    const limits = org.limits
      ? {
          remaining: remainingAnalyses,
          employees: org.limits.members,
          integrations: org.limits.integrations?.length ?? 0,
        }
      : null;

    return {
      plan,
      limits,
      portalUrl: org.customerPortalUrl ?? null,
    };
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

      const variantId =
        variantIdFromEvent ??
        data?.attributes?.first_subscription_item?.variant_id ??
        data?.attributes?.variant_id ??
        undefined;

      // =============================
      //   الحماية الأساسية
      // =============================

      if (organizationId) {
        const org = await ctx.db.get(organizationId);

        // حفظ رابط بوابة العميل
        const portalUrl =
          attr?.urls?.customer_portal ??
          attr?.urls?.customer_portal_update_subscription ??
          undefined;

        if (portalUrl) {
          await ctx.db.patch(organizationId, { customerPortalUrl: portalUrl });
        }

        if (org?.activeSubscriptionId) {
          const existingSub = await ctx.db.get(org.activeSubscriptionId);

          const currentTier = existingSub?.variantId
            ? getTier(existingSub.variantId)
            : (org.planTier ?? null);

          const newTier = getTier(variantId);

          const allowed = isUpgrade(currentTier, newTier);

          if (!allowed) {
            console.log("Blocked subscription (duplicate/downgrade)", {
              currentTier,
              newTier,
              subIdExternal,
            });

            await markProcessed(ctx, lemonId);

            await ctx.db.insert("billingAudit" as any, {
              organizationId,
              type: "blocked_subscription",
              reason: "duplicate_or_downgrade",
              currentTier,
              newTier,
              lemonSubscriptionId: subIdExternal,
              at: Date.now(),
              raw: payload,
            });

            return;
          }
        }
      }

      // =============================
      //   تابع لوجيك البناء الطبيعي
      // =============================

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

export const createCheckoutSession = mutation({
  args: {
    organizationId: v.id("organizations"),
    clerkUserId: v.string(),
    variantId: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    const activeSub = org.activeSubscriptionId;
    const currentTier = org.planTier ?? null;
    const desiredTier = getTier(args.variantId);

    // لديه اشتراك حالي → نسمح فقط بالـ Upgrade
    if (activeSub && currentTier) {
      const allowed = isUpgrade(currentTier, desiredTier);

      if (!allowed) {
        throw new Error(
          "You already have an active subscription. You cannot repurchase the same or lower plan."
        );
      }

      if (org.customerPortalUrl) {
        return { ok: true, upgrade: true, url: org.customerPortalUrl };
      }

      // fallback: use generic Lemon billing portal
      return {
        ok: true,
        upgrade: true,
        url: "https://repvix.lemonsqueezy.com/billing",
      };
    }

    // لا يوجد اشتراك → إنشاء checkout جديد
    const checkoutUrl = await createLemonCheckout({
      userEmail: args.userEmail,
      clerkUserId: args.clerkUserId,
      organizationId: args.organizationId,
      variantId: args.variantId,
    });

    return { ok: true, upgrade: false, url: checkoutUrl, checkoutUrl };
  },
});

async function createLemonCheckout({
  clerkUserId,
  organizationId,
  variantId,
  userEmail,
}: {
  clerkUserId: string;
  organizationId: Id<"organizations">;
  variantId: string;
  userEmail: string;
}): Promise<string> {
  const apiKey = process.env.LEMON_SECRET_KEY;
  const storeId = process.env.LEMON_STORE_ID;

  if (!apiKey || !storeId) {
    throw new Error("Missing Lemon Squeezy API keys.");
  }

  const payload = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email: userEmail,
          custom: { organizationId, clerkUserId },
        },
      },
      relationships: {
        store: { data: { type: "stores", id: storeId.toString() } },
        variant: { data: { type: "variants", id: variantId.toString() } },
      },
    },
  };

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("Failed to create checkout: " + text);
  }

  const json = await res.json();
  const url = json?.data?.attributes?.url;
  if (!url) throw new Error("Checkout URL missing");

  return url;
}
