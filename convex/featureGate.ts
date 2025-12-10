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
  args: {
    organizationId: v.id("organizations"),
    chatId: v.optional(v.id("chats")),
  },
  handler: async (ctx, { organizationId, chatId }) => {
    const org = await ctx.db.get(organizationId);

    const now = Date.now();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayMs = startOfDay.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // -------------------------------
    // Per-chat daily limit (1/day/chat)
    // -------------------------------
    if (chatId) {
      const chat = await ctx.db.get(chatId);
      if (!chat || chat.organizationId !== organizationId) {
        return {
          allowed: false,
          reason: "chat_not_found",
          dailyLimit: 1,
          usedToday: 0,
          remaining: 0,
        };
      }

      const analyses = await ctx.db
        .query("chatAnalyses")
        .withIndex("by_chat", (q) => q.eq("chatId", chatId))
        .collect();

      const usedToday = analyses.filter(
        (a) => a.createdAt >= startOfDayMs
      ).length;

      const lastCreatedAt = analyses.reduce(
        (latest, a) => (a.createdAt > latest ? a.createdAt : latest),
        0
      );

      if (lastCreatedAt && now - lastCreatedAt < oneDayMs) {
        const remainingMs = oneDayMs - (now - lastCreatedAt);
        const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
        return {
          allowed: false,
          reason: "per_chat_daily_limit",
          dailyLimit: 1,
          usedToday,
          remaining: 0,
          remainingHours,
        };
      }

      const remaining = Math.max(0, 1 - usedToday);
      return {
        allowed: remaining > 0,
        reason: "within_chat_limit",
        dailyLimit: 1,
        usedToday,
        remaining,
      };
    }

    // -------------------------------
    // Legacy per-org limits (plans) — keep for compatibility
    // -------------------------------
    const dailyLimit = org?.planTier
      ? limitsForTier(org.planTier).dailyAnalyses
      : 1;

    if (dailyLimit === "unlimited") {
      return {
        allowed: true,
        reason: "unlimited",
        dailyLimit: "unlimited",
        usedToday: 0,
        remaining: "unlimited",
      };
    }

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
