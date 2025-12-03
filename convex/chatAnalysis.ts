// convex/chatAnalysis.ts

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";

import {
  chooseAnalysisLanguage,
  chooseConversationLanguage,
  computeTimeRuleBased,
  type ChatMessageDoc as TimeChatMessageDoc,
  type ChatDoc as TimeChatDoc,
  type TimeRuleBasedResult,
  type SupportedLanguage,
} from "../lib/chat/ruleBasedTime";

import { computeRuleBasedFlags } from "../lib/chat/ruleBasedFlags";

import {
  buildChatAnalysisAiInput,
  type AiStructureMetricsInput,
  type AiInputMessage,
} from "../lib/chat/buildChatAnalysisAiInput";

import type { ChatAnalysisAiOutput } from "../lib/ai/aiTypes";
import { getOpenAiClient, CHAT_ANALYSIS_MODEL } from "../lib/openai/client";
import { getChatAnalysisSystemPrompt } from "@/lib/ai/chat_analysis_prompt";
import { Id } from "./_generated/dataModel";

type SenderRole = "customer" | "agent" | "system";

interface MessageForStructure {
  senderType: SenderRole;
  textClean: string;
  internalTimestamp: number;
}

function normalizeTs(ts: number | null | undefined): number | undefined {
  if (ts == null) return undefined;
  // لو timestamp أقل من 1 تريليون → هذا يعني أنه seconds وليس ms
  if (ts > 0 && ts < 1e12) return ts * 1000;
  return ts;
}

/**
 * حساب بنية المحادثة (structureMetrics + ruleBasedMetrics)
 * بشكل Rule-based بالكامل.
 */
function computeStructureMetricsForAnalysis(messages: MessageForStructure[]): {
  structureMetrics: AiStructureMetricsInput;
  ruleBasedMetrics: {
    customerMessageCount?: number;
    agentMessageCount?: number;
    turnCount?: number;
    topicsCount?: number;
    durationMs?: number;
  };
} {
  if (messages.length === 0) {
    const empty: AiStructureMetricsInput = {
      totalMessages: 0,
      customerMessageCount: 0,
      agentMessageCount: 0,
      systemMessageCount: 0,
      turnCount: 0,
      roundTripCount: 0,
      customerTalkRatio: 0,
      agentTalkRatio: 0,
      avgCustomerCharsPerMessage: undefined,
      avgAgentCharsPerMessage: undefined,
      maxCustomerChars: 0,
      maxAgentChars: 0,
      durationMs: undefined,
    };

    return {
      structureMetrics: empty,
      ruleBasedMetrics: {
        customerMessageCount: 0,
        agentMessageCount: 0,
        turnCount: 0,
        topicsCount: undefined,
        durationMs: undefined,
      },
    };
  }

  const sorted = [...messages].sort(
    (a, b) => a.internalTimestamp - b.internalTimestamp
  );

  const totalMessages = sorted.length;

  let customerMessageCount = 0;
  let agentMessageCount = 0;
  let systemMessageCount = 0;

  let customerCharsTotal = 0;
  let agentCharsTotal = 0;
  let maxCustomerChars = 0;
  let maxAgentChars = 0;

  let turnCount = 0;
  let lastSpeaker: SenderRole | null = null;

  let roundTripCount = 0;
  let hasOpenCustomerBlock = false;

  for (const m of sorted) {
    const len = m.textClean?.length ?? 0;

    if (m.senderType === "customer") {
      customerMessageCount++;
      customerCharsTotal += len;
      if (len > maxCustomerChars) maxCustomerChars = len;

      if (lastSpeaker !== "customer") {
        turnCount++;
        lastSpeaker = "customer";
      }

      hasOpenCustomerBlock = true;
    } else if (m.senderType === "agent") {
      agentMessageCount++;
      agentCharsTotal += len;
      if (len > maxAgentChars) maxAgentChars = len;

      if (lastSpeaker !== "agent") {
        turnCount++;
        lastSpeaker = "agent";
      }

      if (hasOpenCustomerBlock) {
        roundTripCount++;
        hasOpenCustomerBlock = false;
      }
    } else {
      // system
      systemMessageCount++;
      // لا نغيّر turnCount ولا roundTripCount
    }
  }

  const customerTalkRatio =
    totalMessages > 0 ? customerMessageCount / totalMessages : 0;
  const agentTalkRatio =
    totalMessages > 0 ? agentMessageCount / totalMessages : 0;

  const avgCustomerCharsPerMessage =
    customerMessageCount > 0
      ? customerCharsTotal / customerMessageCount
      : undefined;

  const avgAgentCharsPerMessage =
    agentMessageCount > 0 ? agentCharsTotal / agentMessageCount : undefined;

  const firstTs = sorted[0]?.internalTimestamp;
  const lastTs = sorted[sorted.length - 1]?.internalTimestamp;
  const durationMs =
    typeof firstTs === "number" &&
    typeof lastTs === "number" &&
    lastTs >= firstTs
      ? lastTs - firstTs
      : undefined;

  const structureMetrics: AiStructureMetricsInput = {
    totalMessages,
    customerMessageCount,
    agentMessageCount,
    systemMessageCount,
    turnCount,
    roundTripCount,
    customerTalkRatio,
    agentTalkRatio,
    avgCustomerCharsPerMessage,
    avgAgentCharsPerMessage,
    maxCustomerChars,
    maxAgentChars,
    durationMs,
  };

  const ruleBasedMetrics = {
    customerMessageCount,
    agentMessageCount,
    turnCount,
    topicsCount: undefined as number | undefined,
    durationMs,
  };

  return { structureMetrics, ruleBasedMetrics };
}

export const analyzeSingleChat = action({
  args: {
    chatId: v.id("chats"),
    analysisLanguage: v.optional(
      v.union(
        v.literal("ar"),
        v.literal("en"),
        v.literal("tr"),
        v.literal("fr"),
        v.literal("es"),
        v.literal("hi"),
        v.literal("ja")
      )
    ),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    analysisId: Id<"chatAnalyses">;
    processingTimeMs: number;
    tokenInputCount: number | undefined;
    tokenOutputCount: number | undefined;
  }> => {
    // 1) جلب المحادثة والرسائل عبر الـ query المنفصل
    const result = await ctx.runQuery(
      api.chatAnalysisData.getChatWithMessagesForAnalysis,
      { chatId: args.chatId }
    );

    if (!result || !result.chat) {
      throw new Error("Chat not found");
    }

    const { chat, messages } = result;

    // 2) التحقق من حدود الخطة قبل المتابعة
    const canAnalyze = await ctx.runQuery(api.featureGate.canPerformAnalysis, {
      organizationId: chat.organizationId,
    });

    if (!canAnalyze.allowed) {
      if (canAnalyze.reason === "no_plan") {
        throw new Error("لا يمكن إجراء التحليل. يرجى الاشتراك في خطة أولاً.");
      } else if (canAnalyze.reason === "limit_exceeded") {
        throw new Error(
          `تم تجاوز الحد اليومي للتحليلات. الحد المسموح: ${canAnalyze.dailyLimit}، المستخدم اليوم: ${canAnalyze.usedToday}. يرجى المحاولة غداً أو ترقية خطتك.`
        );
      } else {
        throw new Error("لا يمكن إجراء التحليل في الوقت الحالي.");
      }
    }

    // ---------------------------
    // Normalize timestamps to ms
    // ---------------------------
    const normalizedMessages = messages.map((m: any) => ({
      ...m,
      internalTimestamp: normalizeTs(m.internalTimestamp),
      externalTimestamp: normalizeTs(m.externalTimestamp),
    }));

    if (!normalizedMessages || normalizedMessages.length === 0) {
      throw new Error("Chat has no messages");
    }

    // 2) اختيار لغة التحليل ولغة المحادثة
    const analysisLanguage: SupportedLanguage = chooseAnalysisLanguage({
      analysisLanguageFromUser: args.analysisLanguage as
        | SupportedLanguage
        | undefined,
      chatLanguage: (chat.language as string | null) ?? null,
      orgDefaultLanguage: undefined,
    });

    const timeMessages: TimeChatMessageDoc[] = normalizedMessages.map(
      (m: any) => ({
        senderType: m.senderType,
        internalTimestamp: m.internalTimestamp,
        language: (m.language as any) ?? undefined,
      })
    );

    const conversationLanguage: SupportedLanguage = chooseConversationLanguage({
      chatLanguage: (chat.language as string | null) ?? null,
      analysisLanguage,
      messages: timeMessages,
    });

    // 3) حساب الوقت (SLA) rule-based
    const timeResult: TimeRuleBasedResult = computeTimeRuleBased(
      {
        sourceType: chat.sourceType as TimeChatDoc["sourceType"],
        sourceChannel: (chat.sourceChannel as string | null) ?? null,
        language: (chat.language as any) ?? undefined,
      },
      timeMessages,
      normalizedMessages.filter((m: any) => m.senderType === "customer").length
    );

    // 4) حساب بنية المحادثة rule-based
    const { structureMetrics, ruleBasedMetrics } =
      computeStructureMetricsForAnalysis(
        normalizedMessages.map((m: any) => ({
          senderType: m.senderType as SenderRole,
          textClean: m.textClean as string,
          internalTimestamp: m.internalTimestamp as number,
        }))
      );

    // 5) حساب الفلاقز
    const { flags, metricsPatch } = computeRuleBasedFlags({
      messages: normalizedMessages.map((m: any) => ({
        senderType: m.senderType,
        textClean: m.textClean,
        language: (m.language as any) ?? undefined,
        containsProfanity: m.containsProfanity ?? undefined,
        toxicityScore: m.toxicityScore ?? undefined,
      })),
      conversationLanguage,
      timeResult,
    });

    // 6) بناء aiInput النهائي
    const aiInput = buildChatAnalysisAiInput({
      analysisLanguage,
      conversationLanguage,
      chat: {
        chatId: `${chat._id}`,
        organizationId: `${chat.organizationId}`,
        sourceType: chat.sourceType,
        sourceChannel: (chat.sourceChannel as string | null) ?? null,
        status: chat.status,
        title: (chat.title as string | null) ?? null,
        startedAt: chat.startedAt,
        endedAt: (chat.endedAt as number | null) ?? null,
        customerName:
          chat.customerIdentifier && typeof chat.customerIdentifier === "string"
            ? chat.customerIdentifier.trim()
            : null,
      },
      messages: normalizedMessages.map(
        (m): AiInputMessage => ({
          id: `${m._id}`,
          role: m.senderType, // "customer" | "agent" | "system"
          senderName: (m.senderName as string | null) ?? null,
          text: m.textClean as string,
          originalText:
            m.textRaw !== undefined && m.textRaw !== null
              ? (m.textRaw as string)
              : undefined,
          timestamp: m.internalTimestamp as number,
        })
      ),

      channelType: timeResult.channelType,
      timeResult,
      structureMetrics,
      flags,
      keywordMetrics: metricsPatch,
    });

    // 7) استدعاء GPT-5 Mini
    const client = getOpenAiClient();
    const systemPrompt = getChatAnalysisSystemPrompt(analysisLanguage);

    const startedAt = Date.now();

    const completion = await client.chat.completions.create({
      model: CHAT_ANALYSIS_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: JSON.stringify(aiInput),
        },
      ],
    });

    const finishedAt = Date.now();
    const processingTimeMs = finishedAt - startedAt;

    const rawContent = completion.choices[0]?.message?.content ?? "{}";

    let aiOutput: ChatAnalysisAiOutput;
    try {
      aiOutput = JSON.parse(rawContent) as ChatAnalysisAiOutput;
    } catch (error) {
      console.error("Failed to parse ChatAnalysisAiOutput:", rawContent);
      throw new Error("AI output is not valid JSON");
    }

    if (!aiOutput || !aiOutput.outcome) {
      throw new Error("AI output is missing required outcome block");
    }

    const tokenInputCount = completion.usage?.prompt_tokens ?? undefined;
    const tokenOutputCount = completion.usage?.completion_tokens ?? undefined;

    // 8) تخزين النتيجة في chatAnalyses عبر الـ internalMutation المنفصل
    const analysisId = await ctx.runMutation(
      internal.chatAnalysisData.storeChatAnalysis,
      {
        chatId: args.chatId,
        organizationId: chat.organizationId,
        analysisLanguage,
        conversationLanguage,
        aiOutput,
        ruleBased: {
          timeResult,
          structureMetrics,
          ruleBasedMetrics,
          flags,
          keywordMetrics: metricsPatch,
        },
        processingTimeMs,
        tokenInputCount,
        tokenOutputCount,
        chatStartedAt: chat.startedAt, // إضافة chat.startedAt لتعيين chatStartAtMs و chatStartHour
        primaryAgentMemberId:
          chat.primaryAgentMemberId ?? chat.createdByMemberId, // استخدام primaryAgentMemberId أو createdByMemberId كبديل
      }
    );

    return {
      analysisId,
      processingTimeMs,
      tokenInputCount,
      tokenOutputCount,
    };
  },
});
