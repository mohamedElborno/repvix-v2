// convex/zendeskBilling.ts
// Zendesk-specific billing functions (separate from main platform billing)

import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { isZendeskVariant } from "./zendeskPlan";

/**
 * Get the current Zendesk plan for a subdomain
 */
export const getZendeskPlan = query({
  args: {
    zendeskAccountKey: v.string(), // subdomain
  },
  handler: async (ctx, { zendeskAccountKey }) => {
    const usage = await ctx.db
      .query("zendeskUsage")
      .withIndex("by_zendeskAccountKey", (q) =>
        q.eq("zendeskAccountKey", zendeskAccountKey)
      )
      .first();

    // Also check for active subscription
    const subscription = await ctx.db
      .query("zendeskSubscriptions")
      .withIndex("by_zendeskAccountKey", (q) =>
        q.eq("zendeskAccountKey", zendeskAccountKey)
      )
      .first();

    // If there's an active subscription, ensure plan is "pro"
    const hasActiveSubscription =
      subscription &&
      (subscription.status === "active" || subscription.status === "on_trial");

    if (!usage) {
      return {
        plan: hasActiveSubscription ? ("pro" as const) : ("trial" as const),
        monthlyQuota: hasActiveSubscription ? 200 : 10,
        usedThisMonth: 0,
        remaining: hasActiveSubscription ? 200 : 10,
        subscriptionStatus: subscription?.status ?? null,
      };
    }

    // If usage says "trial" but there's an active subscription, return "pro"
    const effectivePlan =
      hasActiveSubscription && usage.plan === "trial" ? "pro" : usage.plan;

    const effectiveQuota = hasActiveSubscription ? 200 : usage.monthlyQuota;
    const remaining = Math.max(0, effectiveQuota - usage.usedThisMonth);

    return {
      plan: effectivePlan,
      monthlyQuota: effectiveQuota,
      usedThisMonth: usage.usedThisMonth,
      remaining,
      subscriptionStatus: subscription?.status ?? null,
    };
  },
});

/**
 * Create a Lemon Squeezy checkout URL for Zendesk plan upgrade
 * This is similar to createCheckout in billing.ts but specifically for Zendesk
 */
export const createZendeskCheckout = action({
  args: {
    zendeskAccountKey: v.string(), // subdomain
    variantId: v.string(), // Lemon Squeezy variant ID for Zendesk plan
    userEmail: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { zendeskAccountKey, variantId, userEmail }
  ): Promise<{
    ok: boolean;
    error: string;
    details?: string;
    code?: string;
    url?: string;
    hint?: string;
    variantId?: string;
    storeId?: string;
  }> => {
    // Validate that this is a Zendesk variant
    if (!isZendeskVariant(variantId)) {
      return {
        ok: false,
        error: "Invalid variant ID for Zendesk plan",
        code: "INVALID_VARIANT",
        variantId,
        hint: "This variant ID is not configured for Zendesk plans.",
      };
    }

    // Check if already has active paid plan
    const currentPlan = await ctx.runQuery(api.zendeskBilling.getZendeskPlan, {
      zendeskAccountKey,
    });

    if (
      currentPlan.plan === "pro" ||
      currentPlan.subscriptionStatus === "active" ||
      currentPlan.subscriptionStatus === "on_trial"
    ) {
      return {
        ok: false,
        error: "You already have an active paid plan",
        code: "ALREADY_SUBSCRIBED",
        hint: "You already have a paid Zendesk plan. Please cancel your current subscription first if you want to change plans.",
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

    // (A) Ensure the store is reachable with the provided API key
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

    // (B) Ensure the variant exists and belongs to the same store/environment
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
    }

    // Create Checkout with Zendesk-specific custom data
    const checkoutPayload: any = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: userEmail,
            custom: {
              zendesk_subdomain: zendeskAccountKey,
              // Mark this as a Zendesk-only checkout (no organizationId)
              checkout_type: "zendesk",
            },
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
      const err: string = await res.text();
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
    const checkoutUrl = json?.data?.attributes?.url as string | undefined;
    if (!checkoutUrl) {
      return {
        ok: false,
        error: "Missing checkout URL",
        details: json?.data?.attributes?.url,
        variantId,
        storeId,
        hint: "Check if variant exists and is linked to the correct store",
      };
    }

    return { ok: true, url: checkoutUrl, error: "" };
  },
});

/**
 * Get billing portal URL for managing Zendesk subscription
 * Similar to createBillingPortal in billing.ts but for Zendesk
 */
export const getZendeskBillingPortal = action({
  args: {
    zendeskAccountKey: v.string(), // subdomain
  },
  handler: async (
    ctx,
    { zendeskAccountKey }
  ): Promise<{
    ok: boolean;
    error: string;
    details?: string;
    code?: string;
    url?: string;
    hint?: string;
  }> => {
    const apiKey = process.env.LEMON_SECRET_KEY;
    if (!apiKey) {
      return {
        ok: false,
        error: "Missing Lemon Squeezy API credentials",
        code: "MISSING_CREDENTIALS",
      };
    }

    // Get subscription from database
    const subscription = await ctx.runQuery(
      api.zendeskSubscriptions.getByAccount,
      {
        zendeskAccountKey,
      }
    );

    if (!subscription || !subscription.lemonSubscriptionId) {
      return {
        ok: false,
        error: "No active subscription found",
        code: "NO_ACTIVE_SUBSCRIPTION",
        hint: "You can only access the billing portal if you have an active subscription.",
      };
    }

    // Use stored portal URL if available
    if (subscription.customerPortal) {
      return {
        ok: true,
        error: "",
        url: subscription.customerPortal,
      };
    }

    // Fetch from Lemon Squeezy API
    const subRes = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${subscription.lemonSubscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/vnd.api+json",
        },
      }
    );

    if (!subRes.ok) {
      const errText = await subRes.text();
      return {
        ok: false,
        error: "Failed to fetch subscription from Lemon Squeezy",
        details: errText ?? undefined,
        code: "API_ERROR",
      };
    }

    const subJson = await subRes.json();
    const urls = subJson?.data?.attributes?.urls ?? {};

    const portalUrl = urls.customer_portal;

    if (!portalUrl) {
      return {
        ok: false,
        error: "Customer portal URL missing from Lemon Squeezy API",
        details: subJson?.data?.attributes?.urls?.customer_portal ?? undefined,
        code: "PORTAL_URL_MISSING",
      };
    }

    // Save portal URL to database for future use
    await ctx.runMutation(internal.zendeskSubscriptions.updatePortalUrl, {
      zendeskAccountKey,
      customerPortal: portalUrl,
    });

    return {
      ok: true,
      error: "",
      url: portalUrl,
    };
  },
});
