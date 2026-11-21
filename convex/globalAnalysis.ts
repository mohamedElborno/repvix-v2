import { requireOrgMembership } from "./auth";
import { internalMutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Rule-based aggregation for all chatAnalyses of an organization.
 * This does NOT call AI.
 * It prepares a clean statistical summary to send later to GPT.
 */
export const prepareGlobalAnalysisStats = query({
  args: {
    organizationId: v.id("organizations"),
    from: v.optional(v.number()), // timestamp
    to: v.optional(v.number()), // timestamp
  },
  handler: async (ctx, args) => {
    await requireOrgMembership(ctx, args.organizationId);
    const { organizationId, from, to } = args;

    // 1) Fetch all chatAnalyses for this org
    const analyses = await ctx.runQuery(
      api.chatAnalysisData.getAnalysesForOrg,
      { organizationId, from, to }
    );

    if (!analyses || analyses.length === 0) {
      return {
        meta: { totalChats: 0 },
        stats: {},
      };
    }

    // Prepare accumulators
    let totalChats = 0;

    let outcomeCounts = {
      resolved: 0,
      partially_resolved: 0,
      unresolved: 0,
      escalated: 0,
      pending_customer: 0,
      pending_internal: 0,
    };

    let sentimentStartTotal = 0;
    let sentimentEndTotal = 0;
    let sentimentVolatilityTotal = 0;
    let sentimentCount = 0;

    let satisfactionTotal = 0;
    let satisfactionCount = 0;

    // Helper function to create ASCII-safe keys
    // We'll store both the key and the original value
    const createSafeKey = (text: string): string => {
      // Convert to a simple ASCII-safe key using base64-like encoding
      // Replace non-ASCII chars with their char codes
      return text
        .split("")
        .map((char) => {
          const code = char.charCodeAt(0);
          if (code < 128) {
            // ASCII character
            return char === " " ? "_" : char;
          }
          // Non-ASCII: use hex representation
          return `_${code.toString(16)}`;
        })
        .join("");
    };

    // Store counts with ASCII-safe keys, and keep original values
    let intentCounts: Record<string, number> = {};
    let intentKeyToValue: Record<string, string> = {};
    let secondaryIntentCounts: Record<string, number> = {};
    let secondaryIntentKeyToValue: Record<string, string> = {};

    let rootCauseCounts: Record<string, number> = {};
    let rootCauseKeyToValue: Record<string, string> = {};
    let secondaryRootCauseCounts: Record<string, number> = {};
    let secondaryRootCauseKeyToValue: Record<string, string> = {};

    let churnRiskTotal = 0;
    let escalationRiskTotal = 0;
    let reputationalRiskTotal = 0;
    let riskCount = 0;

    let slaBreaches = 0;
    let avgFirstResponseTotal = 0;
    let avgResponseCount = 0;

    let hourBuckets: Record<number, number> = {};

    // Agent performance
    let agentBuckets: Record<
      string,
      {
        count: number;
        overall: number;
        clarity: number;
        empathy: number;
        proactivity: number;
        professionalism: number;
        strengths: string[];
        improvements: string[];
      }
    > = {};

    // Loop through analyses
    for (const a of analyses) {
      totalChats++;

      // ===== OUTCOME =====
      if (a.outcomeStatus in outcomeCounts) {
        outcomeCounts[a.outcomeStatus as keyof typeof outcomeCounts]++;
      }

      // ===== SENTIMENT =====
      if (a.sentimentStartScore !== undefined) {
        sentimentStartTotal += a.sentimentStartScore;
        sentimentEndTotal += a.sentimentEndScore ?? 0;
        sentimentVolatilityTotal += a.sentimentVolatilityScore ?? 0;
        sentimentCount++;
      }

      // ===== SATISFACTION =====
      if (a.customerSatisfactionScore !== undefined) {
        satisfactionTotal += a.customerSatisfactionScore;
        satisfactionCount++;
      }

      // ===== INTENTS =====
      if (a.primaryIntent) {
        const safeKey = createSafeKey(a.primaryIntent);
        intentCounts[safeKey] = (intentCounts[safeKey] || 0) + 1;
        intentKeyToValue[safeKey] = a.primaryIntent;
      }

      if (a.secondaryIntents) {
        for (const x of a.secondaryIntents) {
          const safeKey = createSafeKey(x);
          secondaryIntentCounts[safeKey] =
            (secondaryIntentCounts[safeKey] || 0) + 1;
          secondaryIntentKeyToValue[safeKey] = x;
        }
      }

      // ===== ROOT CAUSES =====
      if (a.primaryRootCauseCategory) {
        const safeKey = createSafeKey(a.primaryRootCauseCategory);
        rootCauseCounts[safeKey] = (rootCauseCounts[safeKey] || 0) + 1;
        rootCauseKeyToValue[safeKey] = a.primaryRootCauseCategory;
      }

      if (a.secondaryRootCauses) {
        for (const rc of a.secondaryRootCauses) {
          if (!rc.category) continue;
          const safeKey = createSafeKey(rc.category);
          secondaryRootCauseCounts[safeKey] =
            (secondaryRootCauseCounts[safeKey] || 0) + (rc.weight ?? 1);
          secondaryRootCauseKeyToValue[safeKey] = rc.category;
        }
      }

      // ===== RISKS =====
      if (a.churnRiskScore !== undefined) {
        churnRiskTotal += a.churnRiskScore;
        escalationRiskTotal += a.escalationRiskScore ?? 0;
        reputationalRiskTotal += a.reputationalRiskScore ?? 0;
        riskCount++;
      }

      // ===== SLA / TIME =====
      if (a.timeMetrics) {
        if (a.timeMetrics.firstResponseMs !== undefined) {
          avgFirstResponseTotal += a.timeMetrics.firstResponseMs;
          avgResponseCount++;
        }
        if (
          a.timeMetrics.softViolationCount > 0 ||
          a.timeMetrics.hardViolationCount > 0
        ) {
          slaBreaches++;
        }
      }

      // ===== PEAK HOURS =====
      if (a.chatStartHour !== undefined) {
        hourBuckets[a.chatStartHour] = (hourBuckets[a.chatStartHour] || 0) + 1;
      }

      // ===== AGENT PERFORMANCE =====
      // Use primaryAgentMemberIdSnapshot if available, otherwise use "unknown"
      // Convert Id to string for agentLeaderboard schema compatibility
      const agentId = a.primaryAgentMemberIdSnapshot
        ? String(a.primaryAgentMemberIdSnapshot)
        : "unknown";
      if (!agentBuckets[agentId]) {
        agentBuckets[agentId] = {
          count: 0,
          overall: 0,
          clarity: 0,
          empathy: 0,
          proactivity: 0,
          professionalism: 0,
          strengths: [],
          improvements: [],
        };
      }

      const ag = agentBuckets[agentId];
      ag.count++;
      ag.overall += a.agentOverallScore ?? 0;
      ag.clarity += a.agentClarityScore ?? 0;
      ag.empathy += a.agentEmpathyScore ?? 0;
      ag.proactivity += a.agentProactivityScore ?? 0;
      ag.professionalism += a.agentProfessionalismScore ?? 0;

      if (a.agentStrengths) ag.strengths.push(a.agentStrengths);
      if (a.agentImprovements) ag.improvements.push(a.agentImprovements);
    }

    // ------------------------
    // Build final aggregated stats
    // ------------------------

    const stats = {
      counts: {
        totalChats,
        outcomeCounts,
      },

      sentiment: {
        avgStart: sentimentCount ? sentimentStartTotal / sentimentCount : null,
        avgEnd: sentimentCount ? sentimentEndTotal / sentimentCount : null,
        avgVolatility: sentimentCount
          ? sentimentVolatilityTotal / sentimentCount
          : null,
      },

      satisfaction: {
        avg: satisfactionCount ? satisfactionTotal / satisfactionCount : null,
      },

      intents: {
        primary: intentCounts,
        primaryValues: intentKeyToValue,
        secondary: secondaryIntentCounts,
        secondaryValues: secondaryIntentKeyToValue,
      },

      rootCauses: {
        primary: rootCauseCounts,
        primaryValues: rootCauseKeyToValue,
        secondary: secondaryRootCauseCounts,
        secondaryValues: secondaryRootCauseKeyToValue,
      },

      risks: {
        avgChurn: riskCount ? churnRiskTotal / riskCount : null,
        avgEscalation: riskCount ? escalationRiskTotal / riskCount : null,
        avgReputational: riskCount ? reputationalRiskTotal / riskCount : null,
      },

      time: {
        avgFirstResponseMs: avgResponseCount
          ? avgFirstResponseTotal / avgResponseCount
          : null,
        slaBreachRate: totalChats ? slaBreaches / totalChats : 0,
      },

      peakHours: hourBuckets,

      agents: Object.entries(agentBuckets).map(([agentId, data]) => ({
        agentId,
        count: data.count,
        avgOverall: data.count ? data.overall / data.count : null,
        avgClarity: data.count ? data.clarity / data.count : null,
        avgEmpathy: data.count ? data.empathy / data.count : null,
        avgProactivity: data.count ? data.proactivity / data.count : null,
        avgProfessionalism: data.count
          ? data.professionalism / data.count
          : null,
        strengths: data.strengths,
        improvements: data.improvements,
      })),
    };

    return {
      meta: { totalChats },
      stats,
    };
  },
});

export const getLatestByOrg = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireOrgMembership(ctx, organizationId);
    const items = await ctx.db
      .query("globalAnalyses")
      .withIndex("by_org_createdAt", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .take(1);

    const latest = items[0] ?? null;
    return { exists: !!latest, analysis: latest };
  },
});

export const storeGlobalAnalysis = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    analysisLanguage: v.string(),
    aiOutput: v.any(),
    processingTimeMs: v.optional(v.number()),
    tokenInputCount: v.optional(v.number()),
    tokenOutputCount: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"globalAnalyses">> => {
    const now = Date.now();

    const id = await ctx.db.insert("globalAnalyses", {
      organizationId: args.organizationId,
      analysisLanguage: args.analysisLanguage,
      modelVersion: "gpt-5-mini-2025-08",
      analysisVersion: args.aiOutput.analysisVersion ?? "v1",
      createdAt: now,
      updatedAt: now,

      overallSummary: args.aiOutput.overallSummary ?? "",
      overallSentiment: args.aiOutput.overallSentiment ?? "neutral",
      customerSatisfactionScore:
        args.aiOutput.customerSatisfactionScore ?? undefined,

      peakHours: args.aiOutput.peakHours ?? undefined,
      commonTopics: args.aiOutput.commonTopics ?? undefined,
      commonIssues: args.aiOutput.commonIssues ?? undefined,

      riskScore: args.aiOutput.riskScore ?? undefined,
      churnRiskLevel: args.aiOutput.churnRiskLevel ?? undefined,

      agentLeaderboard: args.aiOutput.agentLeaderboard ?? undefined,
      operationalInsights: args.aiOutput.operationalInsights ?? undefined,
      productInsights: args.aiOutput.productInsights ?? undefined,

      improvementActions: args.aiOutput.improvementActions ?? undefined,

      aiRawOutput: args.aiOutput,
      tokenInputCount: args.tokenInputCount,
      tokenOutputCount: args.tokenOutputCount,
    });

    return id;
  },
});
