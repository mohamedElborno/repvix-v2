import { query } from "./_generated/server";
import { v } from "convex/values";

export const getByOrg = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
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
      customerPortal: sub.customerPortal ?? null,
      updatePaymentMethodUrl: sub.updatePaymentMethodUrl ?? null,
      updateSubscriptionUrl: sub.updateSubscriptionUrl ?? null,
    };
  },
});
export const getById = query({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, { subscriptionId }) => {
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
      customerPortal: sub.customerPortal ?? null,
      updatePaymentMethodUrl: sub.updatePaymentMethodUrl ?? null,
      updateSubscriptionUrl: sub.updateSubscriptionUrl ?? null,
    };
  },
});
