// convex/feature.gate.ts
import { v } from "convex/values";
import { query } from "./_generated/server";
import { limitsForTier } from "./billingPlan";

export const getOrgCapabilities = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const org = await ctx.db.get(organizationId);

    if (!org?.planTier) {
      return {
        tier: undefined,
        dailyAnalyses: 0,
        members: 0,
        exports: [],
        integrations: [],
        features: {},
        support: "email",
        billingStatus: org?.billingStatus ?? "none",
        renewsAt: null,
      };
    }

    const limits = limitsForTier(org.planTier);

    return {
      tier: org.planTier,
      dailyAnalyses: limits.dailyAnalyses,
      members: limits.members,
      exports: limits.exports,
      integrations: limits.integrations,
      features: limits.features,
      support: limits.support,
      billingStatus: org?.billingStatus ?? "none",
      renewsAt: org?.renewsAt ?? null,
    };
  },
});

/**
 * Count how many analyses the org has created today.
 */
export const getDailyAnalysisCount = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const now = Date.now();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayMs = startOfDay.getTime();

    const analyses = await ctx.db
      .query("chatAnalyses")
      .withIndex("by_org_createdAt", (q) =>
        q.eq("organizationId", organizationId).gte("createdAt", startOfDayMs)
      )
      .collect();

    return analyses.length;
  },
});

/**
 * Determine if the org can perform another analysis today.
 */
export const canPerformAnalysis = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const org = await ctx.db.get(organizationId);

    if (!org?.planTier) {
      return {
        allowed: false,
        reason: "no_plan",
        dailyLimit: 0,
        usedToday: 0,
        remaining: 0,
      };
    }

    const limits = limitsForTier(org.planTier);
    const dailyLimit = limits.dailyAnalyses;

    if (dailyLimit === "unlimited") {
      return {
        allowed: true,
        reason: "unlimited",
        dailyLimit: "unlimited",
        usedToday: 0,
        remaining: "unlimited",
      };
    }

    const now = Date.now();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayMs = startOfDay.getTime();

    const analyses = await ctx.db
      .query("chatAnalyses")
      .withIndex("by_org_createdAt", (q) =>
        q.eq("organizationId", organizationId).gte("createdAt", startOfDayMs)
      )
      .collect();

    const usedToday = analyses.length;
    const remaining = dailyLimit - usedToday;

    return {
      allowed: remaining > 0,
      reason: remaining > 0 ? "within_limit" : "limit_exceeded",
      dailyLimit,
      usedToday,
      remaining,
    };
  },
});
