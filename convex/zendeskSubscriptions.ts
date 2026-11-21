import { internalQuery, internalMutation as securedMutation, internalAction as securedAction } from "./_generated/server";
// convex/zendeskSubscriptions.ts
// Manage Zendesk subscriptions (separate from main platform subscriptions)

import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

/**
 * Get subscription by Zendesk account key (subdomain)
 */
export const getByAccount = internalQuery({
  args: {
    zendeskAccountKey: v.string(),
  },
  handler: async (ctx, { zendeskAccountKey }) => {
    const subscription = await ctx.db
      .query("zendeskSubscriptions")
      .withIndex("by_zendeskAccountKey", (q) =>
        q.eq("zendeskAccountKey", zendeskAccountKey)
      )
      .first();

    return subscription
      ? {
          _id: subscription._id,
          zendeskAccountKey: subscription.zendeskAccountKey,
          lemonSubscriptionId: subscription.lemonSubscriptionId,
          productId: subscription.productId,
          variantId: subscription.variantId,
          status: subscription.status,
          planName: subscription.planName,
          currentPeriodEnd: subscription.currentPeriodEnd,
          renewsAt: subscription.renewsAt,
          canceledAt: subscription.canceledAt,
          trialEndsAt: subscription.trialEndsAt,
          customerPortal: subscription.customerPortal,
          updatePaymentMethodUrl: subscription.updatePaymentMethodUrl,
          updateSubscriptionUrl: subscription.updateSubscriptionUrl,
        }
      : null;
  },
});

/**
 * Get or create subscription record
 */
export const getOrCreate = internalMutation({
  args: {
    zendeskAccountKey: v.string(),
    lemonSubscriptionId: v.string(),
    productId: v.optional(v.string()),
    variantId: v.optional(v.string()),
    status: v.string(),
    planName: v.optional(v.string()),
    customerPortal: v.optional(v.string()),
    updatePaymentMethodUrl: v.optional(v.string()),
    updateSubscriptionUrl: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
    renewsAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("zendeskSubscriptions")
      .withIndex("by_subscription", (q) =>
        q.eq("lemonSubscriptionId", args.lemonSubscriptionId)
      )
      .first();

    if (existing) {
      // Security: Prevent subscription hijacking - if subscription exists but for different subdomain
      if (existing.zendeskAccountKey !== args.zendeskAccountKey) {
        console.error(
          `[Zendesk Security] Subscription hijacking attempt detected! Subscription ${args.lemonSubscriptionId} belongs to ${existing.zendeskAccountKey} but webhook claims ${args.zendeskAccountKey}`
        );

        // Critical security audit log
        await ctx.runMutation(internal.zendeskAudit.logEvent, {
          zendeskAccountKey: args.zendeskAccountKey,
          lemonSubscriptionId: args.lemonSubscriptionId,
          eventType: "hijacking_attempt",
          action: "subscription_hijack_prevented",
          severity: "critical",
          details: JSON.stringify({
            attemptedSubdomain: args.zendeskAccountKey,
            actualSubdomain: existing.zendeskAccountKey,
            subscriptionId: args.lemonSubscriptionId,
          }),
        });

        throw new Error(
          `Subscription ${args.lemonSubscriptionId} already belongs to a different Zendesk account`
        );
      }

      // Update existing subscription
      await ctx.db.patch(existing._id, {
        status: args.status,
        productId: args.productId,
        variantId: args.variantId,
        planName: args.planName,
        customerPortal: args.customerPortal ?? existing.customerPortal,
        updatePaymentMethodUrl:
          args.updatePaymentMethodUrl ?? existing.updatePaymentMethodUrl,
        updateSubscriptionUrl:
          args.updateSubscriptionUrl ?? existing.updateSubscriptionUrl,
        currentPeriodEnd: args.currentPeriodEnd,
        renewsAt: args.renewsAt,
        canceledAt: args.canceledAt,
        trialEndsAt: args.trialEndsAt,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new subscription
    const newId = await ctx.db.insert("zendeskSubscriptions", {
      zendeskAccountKey: args.zendeskAccountKey,
      lemonSubscriptionId: args.lemonSubscriptionId,
      productId: args.productId,
      variantId: args.variantId,
      status: args.status,
      planName: args.planName,
      customerPortal: args.customerPortal,
      updatePaymentMethodUrl: args.updatePaymentMethodUrl,
      updateSubscriptionUrl: args.updateSubscriptionUrl,
      currentPeriodEnd: args.currentPeriodEnd,
      renewsAt: args.renewsAt,
      canceledAt: args.canceledAt,
      trialEndsAt: args.trialEndsAt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return newId;
  },
});

/**
 * Update customer portal URL
 */
export const updatePortalUrl = internalMutation({
  args: {
    zendeskAccountKey: v.string(),
    customerPortal: v.string(),
  },
  handler: async (ctx, { zendeskAccountKey, customerPortal }) => {
    const subscription = await ctx.db
      .query("zendeskSubscriptions")
      .withIndex("by_zendeskAccountKey", (q) =>
        q.eq("zendeskAccountKey", zendeskAccountKey)
      )
      .first();

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    await ctx.db.patch(subscription._id, {
      customerPortal,
      updatedAt: Date.now(),
    });
  },
});
