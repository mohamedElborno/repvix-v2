// convex/billing.ts
import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { mapVariantToPlan, limitsForTier } from "./billingPlan";

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
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

async function markProcessed(ctx: any, lemonId: string) {
  const ev = await ctx.db
    .query("webhookEvents")
    .withIndex("by_lemonId", (q: any) => q.eq("lemonId", lemonId))
    .first();
  if (ev) await ctx.db.patch(ev._id, { processed: true });
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
    rawOrganizationRef: custom?.organizationId as string | undefined,
    clerkUserId: (custom?.clerkUserId as string | undefined) ?? undefined,
  };
}

// -------------------------------------------------------------
// Viewer Role
// -------------------------------------------------------------
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
    return member?.role ?? null; // "admin" | "member" | null
  },
});

// -------------------------------------------------------------
// Get Current Plan
// -------------------------------------------------------------
export const getCurrentPlan = query({
  args: { organizationId: v.id("organizations") },
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

// -------------------------------------------------------------
// Get Organization For Checkout (internal helper)
// -------------------------------------------------------------
export const getOrganizationForCheckout = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const org = await ctx.db.get(organizationId);
    if (!org) return null;
    return {
      activeSubscriptionId: org.activeSubscriptionId ?? null,
      planTier:
        (org.planTier as "basic" | "starter" | "pro" | "business" | null) ??
        null,
    };
  },
});

// -------------------------------------------------------------
// Get Billing Customer (internal helper)
// -------------------------------------------------------------
export const getBillingCustomer = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const billingCustomer = await ctx.db
      .query("billingCustomers")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .first();
    return billingCustomer
      ? {
          email: billingCustomer.email ?? null,
          lemonCustomerId: billingCustomer.lemonCustomerId ?? null,
        }
      : null;
  },
});

// -------------------------------------------------------------
// Get Billing Portal Data (بدون إرجاع URL ثابت)
// -------------------------------------------------------------
export const getBillingPortalData = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const org = await ctx.db.get(organizationId);
    if (!org) {
      return { plan: null, limits: null };
    }

    const plan =
      (org.planTier as "basic" | "starter" | "pro" | "business" | null) ?? null;

    // حساب عدد التحليلات المتبقية اليوم
    let remainingAnalyses: number | "unlimited" | undefined = undefined;
    if (org.planTier) {
      const limits = limitsForTier(org.planTier);
      const dailyLimit = limits.dailyAnalyses;

      if (dailyLimit === "unlimited") {
        remainingAnalyses = "unlimited";
      } else {
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

    // لا نعيد portalUrl هنا إطلاقاً
    return { plan, limits };
  },
});

// -------------------------------------------------------------
// ingestWebhook - storing all events
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// handleEvent - the brain of billing
// -------------------------------------------------------------
export const handleEvent = mutation({
  args: { eventName: v.string(), payload: v.any() },
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

    // ------------------------------
    // ORDER CREATED
    // ------------------------------
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

    // ------------------------------
    // ORDER REFUNDED
    // ------------------------------
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

    // ------------------------------
    // SUBSCRIPTION CREATED / UPDATED / PLAN CHANGED
    // ------------------------------
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

      // حماية ضد ازدواج/تخفيض غير مسموح
      if (organizationId) {
        const org = await ctx.db.get(organizationId);
        if (org?.activeSubscriptionId) {
          const existingSub = await ctx.db.get(org.activeSubscriptionId);
          const currentTier = existingSub?.variantId
            ? getTier(existingSub.variantId)
            : (org.planTier ?? null);
          const newTier = getTier(variantId);
          const allowed = isUpgrade(currentTier, newTier);
          if (!allowed) {
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

      // إنشاء/تحديث الاشتراك داخل DB
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

    // ------------------------------
    // SUBSCRIPTION CANCELLED / EXPIRED
    // ------------------------------
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

          // لا نعيد المستخدم إلى basic — نزيل الخطة نهائياً
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

    // ------------------------------
    // SUBSCRIPTION PAYMENT EVENTS
    // ------------------------------
    if (
      eventName === "subscription_payment_success" ||
      eventName === "subscription_payment_failed" ||
      eventName === "subscription_payment_refunded"
    ) {
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
          subscriptionId: undefined,
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

    // Mark processed
    const ev = await ctx.db
      .query("webhookEvents")
      .withIndex("by_lemonId", (q) => q.eq("lemonId", lemonId || "unknown"))
      .first();
    if (ev) await ctx.db.patch(ev._id, { processed: true });
  },
});

// -------------------------------------------------------------
// createCheckoutSession
// -------------------------------------------------------------
export const createCheckoutSession = action({
  args: {
    organizationId: v.id("organizations"),
    clerkUserId: v.string(),
    variantId: v.string(),
    userEmail: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ ok: true; upgrade: boolean; url: string }> => {
    // احصل على بيانات المنظمة
    const org: {
      activeSubscriptionId: Id<"subscriptions"> | null;
      planTier: "basic" | "starter" | "pro" | "business" | null;
    } | null = await ctx.runQuery(api.billing.getOrganizationForCheckout, {
      organizationId: args.organizationId,
    });

    if (!org) throw new Error("Organization not found");

    const activeSub = org.activeSubscriptionId;
    const currentTier = org.planTier ?? null;
    const desiredTier = getTier(args.variantId);

    // يوجد اشتراك؟ إذن نسمح فقط بالترقية
    if (activeSub && currentTier) {
      const allowed = isUpgrade(currentTier, desiredTier);
      if (!allowed) {
        throw new Error("You already have this or a higher subscription.");
      }

      // هنا لا نستخدم URL ثابت؛ ننشئ Portal Session جديد
      const portal = await ctx.runAction(api.billing.getFreshPortalUrl, {
        organizationId: args.organizationId,
      });

      return { ok: true, upgrade: true, url: portal.url };
    }

    // Fetch lemonCustomerId إن وُجد
    const billingCustomer: {
      email: string | null;
      lemonCustomerId: string | null;
    } | null = await ctx.runQuery(api.billing.getBillingCustomer, {
      organizationId: args.organizationId,
    });

    // بريد المستخدم
    const userEmail =
      args.userEmail ?? billingCustomer?.email ?? "customer@repvix.com";

    // إنشاء Checkout عبر Action منفصلة
    const result: { url: string } = await ctx.runAction(
      api.billing.createLemonCheckoutAction,
      {
        clerkUserId: args.clerkUserId,
        organizationId: args.organizationId,
        variantId: args.variantId,
        email: userEmail,
        lemonCustomerId: billingCustomer?.lemonCustomerId ?? undefined,
      }
    );

    return { ok: true, upgrade: false, url: result.url };
  },
});

// -------------------------------------------------------------
// createLemonCheckoutAction
// -------------------------------------------------------------
export const createLemonCheckoutAction = action({
  args: {
    clerkUserId: v.string(),
    organizationId: v.id("organizations"),
    variantId: v.string(),
    email: v.string(),
    lemonCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.LEMON_SECRET_KEY;
    const storeId = process.env.LEMON_STORE_ID;
    if (!apiKey || !storeId) {
      throw new Error("Missing Lemon Squeezy API keys.");
    }

    const payload: any = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: args.email,
            custom: {
              organizationId: args.organizationId,
              clerkUserId: args.clerkUserId,
            },
          },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId.toString() } },
          variant: {
            data: { type: "variants", id: args.variantId.toString() },
          },
        },
      },
    };

    // ربط العميل إن وجد
    if (args.lemonCustomerId) {
      payload.data.relationships.customer = {
        data: { type: "customers", id: args.lemonCustomerId },
      };
    }

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
      throw new Error("Lemon checkout failed: " + text);
    }

    const json = await res.json();
    const url = json?.data?.attributes?.url;
    if (!url) throw new Error("Missing checkout URL");
    return { url };
  },
});

// -------------------------------------------------------------
// getFreshPortalUrl — ينشئ Portal Session لحظيًا (Best Practice)
// -------------------------------------------------------------
export const getFreshPortalUrl = action({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }): Promise<{ url: string }> => {
    const apiKey = process.env.LEMON_SECRET_KEY;
    if (!apiKey) throw new Error("Missing Lemon Squeezy API key");

    // 1) الحصول على billing customer
    const customer = await ctx.runQuery(api.billing.getBillingCustomer, {
      organizationId,
    });

    if (!customer?.lemonCustomerId) {
      throw new Error("Customer not found for this organization");
    }

    const lemonCustomerId = customer.lemonCustomerId;

    // 2) إنشاء جلسة Portal جديدة عبر endpoint الرسمي
    const payload = {
      data: {
        type: "billing-portals",
        attributes: {
          customer_id: lemonCustomerId,
          // يمكنك جعله ديناميكيًا حسب اللغة/المسار
          return_url: `${process.env.APP_URL ?? "https://repvix.com"}/dashboard/billing`,
        },
      },
    };

    const res = await fetch("https://api.lemonsqueezy.com/v1/billing-portals", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error("Failed to create billing portal: " + txt);
    }

    const json = await res.json();
    const url = json?.data?.attributes?.url;
    if (!url) throw new Error("Portal URL missing from Lemon Squeezy");

    return { url };
  },
});
