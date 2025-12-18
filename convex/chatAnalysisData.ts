// convex/chatAnalysisData.ts

import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

import { CHAT_ANALYSIS_MODEL } from "../lib/openai/client";
import type { TimeRuleBasedResult } from "../lib/chat/ruleBasedTime";
import type {
  RuleBasedFlagsResult,
  RuleBasedMetricsPatch,
} from "../lib/chat/ruleBasedFlags";
import type { AiStructureMetricsInput } from "../lib/chat/buildChatAnalysisAiInput";
import type { ChatAnalysisAiOutput } from "../lib/ai/aiTypes";

const KEY_QUOTE_PURPOSES = [
  "frustration",
  "satisfaction",
  "objection",
  "appreciation",
  "threat",
  "other",
] as const;

type KeyQuotePurpose = (typeof KEY_QUOTE_PURPOSES)[number];

function normalizeKeyQuotePurpose(purpose: string): KeyQuotePurpose {
  const p = purpose.toLowerCase().trim();

  if (KEY_QUOTE_PURPOSES.includes(p as KeyQuotePurpose)) {
    return p as KeyQuotePurpose;
  }

  // You can add any specific purposes you want here
  if (p === "expectation" || p === "expectations") {
    // You can choose "other" or "objection" based on your preference
    return "other";
  }

  // fallback safe
  return "other";
}

const CUSTOMER_ACTION_CHANNELS = [
  "email",
  "whatsapp",
  "phone",
  "in_app",
  "other",
] as const;

type CustomerActionChannel = (typeof CUSTOMER_ACTION_CHANNELS)[number];

function normalizeCustomerActionChannel(
  channel: string | undefined
): CustomerActionChannel | undefined {
  if (!channel) return undefined;

  const c = channel.toLowerCase().trim();

  if (CUSTOMER_ACTION_CHANNELS.includes(c as CustomerActionChannel)) {
    return c as CustomerActionChannel;
  }

  // Map common variations to valid channels
  if (c.includes("email") || c === "mail") {
    return "email";
  }
  if (c.includes("whatsapp") || c === "wa") {
    return "whatsapp";
  }
  if (c.includes("phone") || c.includes("call") || c.includes("sms")) {
    return "phone";
  }
  if (c.includes("app") || c.includes("in-app") || c.includes("platform")) {
    return "in_app";
  }

  // For any other channel (bank_transfer, telegram, etc.), map to "other"
  return "other";
}

// =============================
// 1) Query: getChatWithMessagesForAnalysis
// =============================

export const getChatWithMessagesForAnalysis = query({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      return null;
    }

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_chat_timestamp", (q) => q.eq("chatId", args.chatId))
      .collect();

    return { chat, messages };
  },
});

// =============================
// 2) internalMutation: storeChatAnalysis
// =============================

export const storeChatAnalysis = internalMutation({
  args: {
    chatId: v.id("chats"),
    organizationId: v.id("organizations"),
    analysisLanguage: v.union(
      v.literal("ar"),
      v.literal("en"),
      v.literal("tr"),
      v.literal("fr"),
      v.literal("es"),
      v.literal("hi"),
      v.literal("ja")
    ),
    conversationLanguage: v.union(
      v.literal("ar"),
      v.literal("en"),
      v.literal("tr"),
      v.literal("fr"),
      v.literal("es"),
      v.literal("hi"),
      v.literal("ja")
    ),
    aiOutput: v.any(), // نضمن النوع في TypeScript
    ruleBased: v.any(), // timeResult + structureMetrics + ruleBasedMetrics + flags + keywordMetrics
    processingTimeMs: v.optional(v.number()),
    tokenInputCount: v.optional(v.number()),
    tokenOutputCount: v.optional(v.number()),
    chatStartedAt: v.optional(v.number()), // timestamp (ms) من chat.startedAt
    primaryAgentMemberId: v.optional(v.id("organizationMembers")), // الموظف المسؤول عن المحادثة
  },
  handler: async (ctx, args): Promise<Id<"chatAnalyses">> => {
    const { aiOutput, ruleBased } = args;

    const timeResult = ruleBased.timeResult as TimeRuleBasedResult;
    const structureMetrics =
      ruleBased.structureMetrics as AiStructureMetricsInput;
    const ruleBasedMetrics = (ruleBased.ruleBasedMetrics ?? {}) as {
      customerMessageCount?: number;
      agentMessageCount?: number;
      turnCount?: number;
      topicsCount?: number;
      durationMs?: number;
    };

    const flags = (ruleBased.flags ?? {}) as RuleBasedFlagsResult;
    const keywordMetrics = (ruleBased.keywordMetrics ??
      {}) as RuleBasedMetricsPatch;

    const now = Date.now();

    // حساب chatStartAtMs و chatStartHour من chatStartedAt
    // نستخدم getUTCHours() للحصول على ساعة موحدة بغض النظر عن timezone السيرفر
    const chatStartAtMs = args.chatStartedAt ?? undefined;
    const chatStartHour = args.chatStartedAt
      ? new Date(args.chatStartedAt).getUTCHours()
      : undefined;

    const insertedId = await ctx.db.insert("chatAnalyses", {
      // ربط أساسي
      chatId: args.chatId,
      organizationId: args.organizationId,
      language: args.analysisLanguage,
      modelVersion: CHAT_ANALYSIS_MODEL,
      analysisVersion:
        (aiOutput as ChatAnalysisAiOutput).analysisVersion ?? "v1",
      createdAt: now,
      updatedAt: now,
      primaryAgentMemberIdSnapshot: args.primaryAgentMemberId, // حفظ الموظف المسؤول عن المحادثة

      // 1) نتيجة المحادثة (Outcome)
      outcomeStatus: (aiOutput as ChatAnalysisAiOutput).outcome.outcomeStatus,
      outcomeConfidence:
        (aiOutput as ChatAnalysisAiOutput).outcome.outcomeConfidence ??
        undefined,
      outcomeSummary: (aiOutput as ChatAnalysisAiOutput).outcome.outcomeSummary,
      requiresFollowUp: (aiOutput as ChatAnalysisAiOutput).outcome
        .requiresFollowUp,
      followUpOwnerType: (aiOutput as ChatAnalysisAiOutput).outcome
        .followUpOwnerType,
      followUpDeadline:
        (aiOutput as ChatAnalysisAiOutput).outcome.followUpDeadline ??
        undefined,
      followUpNotes:
        (aiOutput as ChatAnalysisAiOutput).outcome.followUpNotes ?? undefined,

      // 2) تجربة العميل (Customer Experience & Sentiment)
      customerSatisfactionScore:
        (aiOutput as ChatAnalysisAiOutput).experience
          .customerSatisfactionScore ?? undefined,
      customerSatisfactionLabel:
        (aiOutput as ChatAnalysisAiOutput).experience
          .customerSatisfactionLabel ?? undefined,

      sentimentStartScore:
        (aiOutput as ChatAnalysisAiOutput).experience.sentimentStartScore ??
        undefined,
      sentimentStartLabel:
        (aiOutput as ChatAnalysisAiOutput).experience.sentimentStartLabel ??
        undefined,
      sentimentEndScore:
        (aiOutput as ChatAnalysisAiOutput).experience.sentimentEndScore ??
        undefined,
      sentimentEndLabel:
        (aiOutput as ChatAnalysisAiOutput).experience.sentimentEndLabel ??
        undefined,
      sentimentVolatilityScore:
        (aiOutput as ChatAnalysisAiOutput).experience
          .sentimentVolatilityScore ?? undefined,

      emotionTrajectory:
        (aiOutput as ChatAnalysisAiOutput).experience.emotionTrajectory ??
        undefined,

      // 3) هيكلة المحادثة والـ SLA (من AI + من rule-based)
      conversationComplexity:
        (aiOutput as ChatAnalysisAiOutput).structure.conversationComplexity ??
        undefined,
      conversationClarityScore:
        (aiOutput as ChatAnalysisAiOutput).structure.conversationClarityScore ??
        undefined,
      hadClearProblemStatement:
        (aiOutput as ChatAnalysisAiOutput).structure.hadClearProblemStatement ??
        undefined,
      hadClearResolutionSummary:
        (aiOutput as ChatAnalysisAiOutput).structure
          .hadClearResolutionSummary ?? undefined,

      // الحقول الزمنية الأساسية (من timeResult)
      avgResponseDelayMs: timeResult.avgAgentResponseMs ?? undefined,
      maxResponseDelayMs: timeResult.maxAgentResponseMs ?? undefined,
      slaBreached: timeResult.slaBreached,

      // كائن تفصيلي للوقت
      timeMetrics: {
        channelType: timeResult.channelType,
        firstResponseMs: timeResult.firstResponseMs,
        avgAgentResponseMs: timeResult.avgAgentResponseMs,
        maxAgentResponseMs: timeResult.maxAgentResponseMs,
        softViolationCount: timeResult.softViolationCount,
        hardViolationCount: timeResult.hardViolationCount,
      },

      // 4) أداء الموظف
      agentOverallScore:
        (aiOutput as ChatAnalysisAiOutput).agentPerformance.agentOverallScore ??
        undefined,
      agentClarityScore:
        (aiOutput as ChatAnalysisAiOutput).agentPerformance.agentClarityScore ??
        undefined,
      agentEmpathyScore:
        (aiOutput as ChatAnalysisAiOutput).agentPerformance.agentEmpathyScore ??
        undefined,
      agentOwnershipScore:
        (aiOutput as ChatAnalysisAiOutput).agentPerformance
          .agentOwnershipScore ?? undefined,
      agentProactivityScore:
        (aiOutput as ChatAnalysisAiOutput).agentPerformance
          .agentProactivityScore ?? undefined,
      agentProfessionalismScore:
        (aiOutput as ChatAnalysisAiOutput).agentPerformance
          .agentProfessionalismScore ?? undefined,

      agentStrengths:
        (aiOutput as ChatAnalysisAiOutput).agentPerformance.agentStrengths ??
        undefined,
      agentImprovements:
        (aiOutput as ChatAnalysisAiOutput).agentPerformance.agentImprovements ??
        undefined,
      agentCoachingTips:
        (aiOutput as ChatAnalysisAiOutput).agentPerformance.agentCoachingTips ??
        undefined,

      // 5) النوايا والمبيعات
      primaryIntent:
        (aiOutput as ChatAnalysisAiOutput).intentAndSales.primaryIntent ??
        undefined,
      secondaryIntents:
        (aiOutput as ChatAnalysisAiOutput).intentAndSales.secondaryIntents ??
        undefined,
      salesStage:
        (aiOutput as ChatAnalysisAiOutput).intentAndSales.salesStage ??
        undefined,
      purchaseIntentScore:
        (aiOutput as ChatAnalysisAiOutput).intentAndSales.purchaseIntentScore ??
        undefined,

      mainObjections:
        (aiOutput as ChatAnalysisAiOutput).intentAndSales.mainObjections ??
        undefined,

      // 6) الأسباب الجذرية
      primaryRootCauseCategory:
        (aiOutput as ChatAnalysisAiOutput).rootCauses
          .primaryRootCauseCategory ?? undefined,
      primaryRootCauseDetails:
        (aiOutput as ChatAnalysisAiOutput).rootCauses.primaryRootCauseDetails ??
        undefined,
      secondaryRootCauses:
        (aiOutput as ChatAnalysisAiOutput).rootCauses.secondaryRootCauses ??
        undefined,

      // 7) المخاطر
      churnRiskScore:
        (aiOutput as ChatAnalysisAiOutput).risks.churnRiskScore ?? undefined,
      churnRiskLevel:
        (aiOutput as ChatAnalysisAiOutput).risks.churnRiskLevel ?? undefined,
      escalationRiskScore:
        (aiOutput as ChatAnalysisAiOutput).risks.escalationRiskScore ??
        undefined,
      reputationalRiskScore:
        (aiOutput as ChatAnalysisAiOutput).risks.reputationalRiskScore ??
        undefined,
      riskNotes:
        (aiOutput as ChatAnalysisAiOutput).risks.riskNotes ?? undefined,

      // 8) التوصيات العملية
      internalActions:
        (aiOutput as ChatAnalysisAiOutput).actions.internalActions ?? undefined,
      customerActions:
        (aiOutput as ChatAnalysisAiOutput).actions.customerActions?.map(
          (action: {
            title: string;
            description: string;
            channel?: string;
          }) => ({
            title: action.title,
            description: action.description,
            channel: normalizeCustomerActionChannel(action.channel),
          })
        ) ?? undefined,
      productFeedback:
        (aiOutput as ChatAnalysisAiOutput).actions.productFeedback ?? undefined,

      // 9) الشواهد النصية (مع تطبيع الـ purpose)
      keyQuotes:
        (aiOutput as ChatAnalysisAiOutput).evidence.keyQuotes?.map(
          (q: {
            role: string;
            purpose: string;
            text: string;
            messageId?: Id<"chatMessages">;
          }) => ({
            role: q.role as "customer" | "agent" | "system",
            purpose: normalizeKeyQuotePurpose(q.purpose),
            text: q.text,
            // can be linked later via messageId via messageIndex if you want
            messageId: undefined,
          })
        ) ?? undefined,

      // 10) مرحلة التحليل القاعدي (Rule-based pre-analysis)
      ruleBasedFlags: {
        hasInsults: flags.hasInsults ?? undefined,
        hasProfanity: flags.hasProfanity ?? undefined,
        hasSlaViolation: timeResult.slaBreached ?? flags.hasSlaViolation,
        hasRefundRequest: flags.hasRefundRequest ?? undefined,
        hasCancellationThreat: flags.hasCancellationThreat ?? undefined,
        hasPriceNegotiation: flags.hasPriceNegotiation ?? undefined,
      },

      ruleBasedMetrics: {
        customerMessageCount:
          ruleBasedMetrics.customerMessageCount ?? undefined,
        agentMessageCount: ruleBasedMetrics.agentMessageCount ?? undefined,
        turnCount: ruleBasedMetrics.turnCount ?? undefined,
        topicsCount: ruleBasedMetrics.topicsCount ?? undefined,
        durationMs: ruleBasedMetrics.durationMs ?? undefined,
      },

      // كائن تفصيلي لبنية المحادثة (Rule-based)
      structureMetrics,

      // Counters من الكلمات المفتاحية
      profanityMessageCount: keywordMetrics.profanityMessageCount ?? undefined,
      refundKeywordHits: keywordMetrics.refundKeywordHits ?? undefined,
      cancellationThreatHits:
        keywordMetrics.cancellationThreatHits ?? undefined,
      priceNegotiationHits: keywordMetrics.priceNegotiationHits ?? undefined,

      // 11) مخرجات الـ AI الخام + ميتاداتا تقنية
      aiRawOutput: aiOutput,
      processingTimeMs: args.processingTimeMs ?? undefined,
      tokenInputCount: args.tokenInputCount ?? undefined,
      tokenOutputCount: args.tokenOutputCount ?? undefined,
      isPartial: false,
      chatStartAtMs,
      chatStartHour,
    });

    return insertedId;
  },
});

// =============================
// 3) Query: getAnalysesForOrg
// =============================

export const getAnalysesForOrg = query({
  args: {
    organizationId: v.id("organizations"),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organizationId, from, to } = args;

    // Get all analyses for the organization
    let analyses = await ctx.db
      .query("chatAnalyses")
      .withIndex("by_org_createdAt", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();

    // Filter by date range if provided
    if (from !== undefined) {
      analyses = analyses.filter((a) => a.createdAt >= from);
    }

    if (to !== undefined) {
      analyses = analyses.filter((a) => a.createdAt <= to);
    }

    return analyses;
  },
});
