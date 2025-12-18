import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getOrInit = internalMutation({
  args: {
    zendeskAccountKey: v.string(),
  },
  handler: async (ctx, { zendeskAccountKey }) => {
    const now = Date.now();
    // Use UTC to avoid timezone issues
    const nowUtc = new Date();
    const monthStart = Date.UTC(
      nowUtc.getUTCFullYear(),
      nowUtc.getUTCMonth(),
      1
    );

    const existing = await ctx.db
      .query("zendeskUsage")
      .withIndex("by_zendeskAccountKey", (q) =>
        q.eq("zendeskAccountKey", zendeskAccountKey)
      )
      .first();

    if (existing) {
      // reset monthly
      if (existing.periodStart !== monthStart) {
        await ctx.db.patch(existing._id, {
          usedThisMonth: 0,
          periodStart: monthStart,
        });
        return {
          _id: existing._id,
          _creationTime: existing._creationTime,
          zendeskAccountKey: existing.zendeskAccountKey,
          plan: existing.plan,
          monthlyQuota: existing.monthlyQuota,
          usedThisMonth: 0,
          periodStart: monthStart,
        };
      }
      return existing;
    }

    const newId = await ctx.db.insert("zendeskUsage", {
      zendeskAccountKey,
      plan: "trial",
      monthlyQuota: 10,
      usedThisMonth: 0,
      periodStart: monthStart,
    });

    // Return the full object, not just the ID
    const inserted = await ctx.db.get(newId);
    if (!inserted) {
      throw new Error("Failed to create usage record");
    }
    return inserted;
  },
});

export const increment = internalMutation({
  args: {
    zendeskAccountKey: v.string(),
  },
  handler: async (ctx, { zendeskAccountKey }) => {
    const record = await ctx.db
      .query("zendeskUsage")
      .withIndex("by_zendeskAccountKey", (q) =>
        q.eq("zendeskAccountKey", zendeskAccountKey)
      )
      .first();

    if (!record) throw new Error("Usage not found");

    await ctx.db.patch(record._id, {
      usedThisMonth: record.usedThisMonth + 1,
    });
  },
});

export const setPaidPlan = internalMutation({
  args: {
    zendeskAccountKey: v.string(),
  },
  handler: async (ctx, { zendeskAccountKey }) => {
    const record = await ctx.db
      .query("zendeskUsage")
      .withIndex("by_zendeskAccountKey", (q) =>
        q.eq("zendeskAccountKey", zendeskAccountKey)
      )
      .first();

    if (!record) {
      throw new Error("zendesk usage record not found");
    }

    // Prevent re-activation (idempotency)
    if (record.plan === "paid") {
      return;
    }

    await ctx.db.patch(record._id, {
      plan: "paid",
      monthlyQuota: 150,
      usedThisMonth: 0, // Reset counter on upgrade
    });
  },
});
