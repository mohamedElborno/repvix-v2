import { requireOrgMembership } from "./auth";
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getByOrg = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    const membership = await requireOrgMembership(ctx, organizationId);
    // الحصول على أحدث اشتراك للمنظمة
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .order("desc") // الأحدث أولاً
      .first();

    if (!sub) return null;

    // إعادة بيانات الاشتراك مع روابط البوابة
    return {
      id: sub._id,
      status: sub.status,
      productId: sub.productId ?? null,
      variantId: sub.variantId ?? null,
      planName: sub.planName ?? null,
      currentPeriodEnd: sub.currentPeriodEnd ?? null,
      renewsAt: sub.renewsAt ?? null,
      trialEndsAt: sub.trialEndsAt ?? null,

      // روابط Lemon Squeezy
      customerPortal: membership.role === "admin" ? sub.customerPortal ?? null : null,
      updatePaymentMethodUrl: membership.role === "admin" ? sub.updatePaymentMethodUrl ?? null : null,
      updateSubscriptionUrl: membership.role === "admin" ? sub.updateSubscriptionUrl ?? null : null,
    };
  },
});
export const getById = query({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    const authorizedSub = await ctx.db.get(subscriptionId);
    if (!authorizedSub) return null;
    const membership = await requireOrgMembership(ctx, authorizedSub.organizationId);
    const sub = await ctx.db.get(subscriptionId);
    if (!sub) return null;

    return {
      id: sub._id,
      lemonSubscriptionId: sub.lemonSubscriptionId,
      status: sub.status,
      productId: sub.productId ?? null,
      variantId: sub.variantId ?? null,
      planName: sub.planName ?? null,
      currentPeriodEnd: sub.currentPeriodEnd ?? null,
      renewsAt: sub.renewsAt ?? null,
      trialEndsAt: sub.trialEndsAt ?? null,
      customerPortal: membership.role === "admin" ? sub.customerPortal ?? null : null,
      updatePaymentMethodUrl: membership.role === "admin" ? sub.updatePaymentMethodUrl ?? null : null,
      updateSubscriptionUrl: membership.role === "admin" ? sub.updateSubscriptionUrl ?? null : null,
    };
  },
});
