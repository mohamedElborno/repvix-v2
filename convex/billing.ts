import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
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

/**
 * التحقق من وجود اشتراك نشط في variant معين
 */
export const hasActiveSubscriptionForVariant = query({
  args: {
    organizationId: v.id("organizations"),
    variantId: v.string(),
  },
  handler: async (ctx, { organizationId, variantId }) => {
    // البحث عن اشتراكات نشطة للمنظمة في هذا الـ variant
    const activeStatuses = ["active", "on_trial"];

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
      .collect();

    // التحقق من وجود اشتراك نشط في نفس الـ variant
    const hasActive = subscriptions.some(
      (sub) =>
        sub.variantId === variantId &&
        activeStatuses.includes(sub.status.toLowerCase())
    );

    return hasActive;
  },
});

/**
 * الحصول على الاشتراك النشط الحالي للمنظمة
 */
export const getActiveSubscription = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    const activeStatuses = ["active", "on_trial"];

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
      .collect();

    // البحث عن أول اشتراك نشط
    const activeSub = subscriptions.find((sub) =>
      activeStatuses.includes(sub.status.toLowerCase())
    );

    if (!activeSub) return null;

    return {
      lemonSubscriptionId: activeSub.lemonSubscriptionId,
      variantId: activeSub.variantId ?? null,
      productId: activeSub.productId ?? null,
      status: activeSub.status,
    };
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

          // عند الإلغاء، نحتفظ بالباقة والحدود حتى نهاية الفترة
          // لكن نحدث billingStatus إلى "cancelled"
          const orgUpdate: any = {
            billingStatus: status,
            activeSubscriptionId: subscriptionId,
            renewsAt,
          };

          // إذا لم يكن ملغى، نحدث الباقة والحدود
          if (status !== "cancelled") {
            orgUpdate.planTier = tier;
            orgUpdate.limits = {
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
            };
          }

          await ctx.db.patch(organizationId, orgUpdate);
        } else if (status === "cancelled") {
          // إذا كان ملغى وليس لدينا tier، نحدث فقط billingStatus
          await ctx.db.patch(organizationId, {
            billingStatus: status,
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

/* --------------------------------------------------------------
 * Create Checkout
 * -------------------------------------------------------------- */

export const createCheckout = action({
  args: {
    organizationId: v.id("organizations"),
    clerkUserId: v.string(),
    variantId: v.string(),
    userEmail: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { organizationId, clerkUserId, variantId, userEmail }
  ) => {
    if (!organizationId || !clerkUserId || !variantId) {
      return {
        ok: false,
        error: "Missing required fields",
      };
    }

    // التحقق من وجود اشتراك نشط في نفس الباقة
    const hasActive = await ctx.runQuery(
      api.billing.hasActiveSubscriptionForVariant,
      {
        organizationId,
        variantId,
      }
    );

    if (hasActive) {
      const { tier } = mapVariantToPlan(variantId);
      return {
        ok: false,
        error: "You already have an active subscription for this plan",
        code: "ALREADY_SUBSCRIBED",
        tier,
        hint: "You cannot subscribe to the same plan multiple times. Please cancel your current subscription first or upgrade/downgrade to a different plan.",
      };
    }

    const apiKey = process.env.LEMON_SECRET_KEY;
    const storeId = process.env.LEMON_STORE_ID;

    if (!apiKey || !storeId) {
      return {
        ok: false,
        error: "Missing Lemon Squeezy API credentials",
      };
    }

    // (A) تأكد أن الـ store صحيح ومتاح بالمفتاح الحالي
    {
      const checkStore = await fetch(
        `https://api.lemonsqueezy.com/v1/stores/${storeId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/vnd.api+json",
          },
        }
      );
      if (!checkStore.ok) {
        const msg = await checkStore.text();
        return {
          ok: false,
          error: "Store not accessible with this key",
          details: msg,
        };
      }
    }

    // (B) تأكد أن الـ variant موجود وتابع لنفس البيئة والـ store
    {
      const checkVariant = await fetch(
        `https://api.lemonsqueezy.com/v1/variants/${variantId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/vnd.api+json",
          },
        }
      );

      if (!checkVariant.ok) {
        const msg = await checkVariant.text();
        return {
          ok: false,
          error: "Variant not found or not accessible",
          details: msg,
          variantId,
          hint: "Make sure the variant ID exists in your Lemon Squeezy store and matches the environment (test/production)",
        };
      }

      // تحقق أن الـ variant مرتبط بنفس الـ store
      const variantData = await checkVariant.json();
      const variantStoreId =
        variantData?.data?.relationships?.product?.data?.id;

      // ملاحظة: قد نحتاج للتحقق من product ثم store، لكن هذا يعتمد على بنية Lemon API
      // للآن نكتفي بالتحقق من وجود الـ variant
    }

    // Create Checkout
    const checkoutPayload = {
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
      body: JSON.stringify(checkoutPayload),
    });

    if (!res.ok) {
      const err = await res.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(err);
      } catch {
        errorDetails = err;
      }

      return {
        ok: false,
        error: "Lemon API Error",
        details: errorDetails,
        variantId,
        storeId,
        hint:
          errorDetails?.errors?.[0]?.detail ||
          "Check if variant exists and is linked to the correct store",
      };
    }

    const json = await res.json();
    const checkoutUrl = json?.data?.attributes?.url;
    if (!checkoutUrl) {
      return {
        ok: false,
        error: "Missing checkout URL",
      };
    }

    return { ok: true, url: checkoutUrl };
  },
});

/* --------------------------------------------------------------
 * Get Billing Portal URL
 * -------------------------------------------------------------- */

export const getBillingPortalUrl = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    const apiKey = process.env.LEMON_SECRET_KEY;

    if (!apiKey) {
      return {
        ok: false,
        error: "Missing Lemon Squeezy API credentials",
      };
    }

    // الحصول على الاشتراك النشط
    const activeSubscription: {
      lemonSubscriptionId: string;
      variantId: string | null;
      productId: string | null;
      status: string;
    } | null = await ctx.runQuery(api.billing.getActiveSubscription, {
      organizationId,
    });

    if (!activeSubscription) {
      return {
        ok: false,
        error: "No active subscription found",
        hint: "You need an active subscription to access the billing portal",
      };
    }

    // الحصول على معلومات الاشتراك من Lemon Squeezy API
    const res: Response = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${activeSubscription.lemonSubscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/vnd.api+json",
        },
      }
    );

    if (!res.ok) {
      const errorText: string = await res.text();
      let errorDetails: any;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }

      return {
        ok: false,
        error: "Failed to get subscription details",
        details: errorDetails,
      };
    }

    const json = await res.json();
    const customerPortalUrl =
      json?.data?.attributes?.urls?.customer_portal ?? null;

    if (!customerPortalUrl) {
      return {
        ok: false,
        error: "Billing portal URL not available",
        hint: "The subscription may not have a customer portal URL yet",
      };
    }

    return { ok: true, url: customerPortalUrl };
  },
});
