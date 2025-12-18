import { action } from "./_generated/server";
import { v } from "convex/values";
import {
  chooseAnalysisLanguage,
  chooseConversationLanguage,
  computeTimeRuleBased,
  type SupportedLanguage,
  type TimeRuleBasedResult,
} from "../lib/chat/ruleBasedTime";
import {
  computeRuleBasedFlags,
  type RuleBasedMetricsPatch,
} from "../lib/chat/ruleBasedFlags";
import {
  buildChatAnalysisAiInput,
  type AiInputMessage,
  type AiStructureMetricsInput,
} from "../lib/chat/buildChatAnalysisAiInput";
import { getOpenAiClient, CHAT_ANALYSIS_MODEL } from "../lib/openai/client";
import { getChatAnalysisSystemPrompt } from "@/lib/ai/chat_analysis_prompt";

type SenderRole = "customer" | "agent" | "system";

interface ZendeskMessageForStructure {
  senderType: SenderRole;
  textClean: string;
  internalTimestamp: number;
}

function cleanText(input: string | undefined | null): string {
  if (!input) return "";

  // إزالة HTML tags
  let cleaned = input.replace(/<[^>]+>/g, "");

  // إزالة HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // إزالة المسافات الزائدة وتنظيف النص
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

function computeStructureMetrics(messages: ZendeskMessageForStructure[]): {
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
      systemMessageCount++;
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

export const zendeskSidebarAnalyze = action({
  args: {
    subject: v.string(),
    comments: v.array(
      v.object({
        author_id: v.number(),
        body: v.string(),
        created_at: v.string(),
      })
    ),
    requesterId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.comments.length === 0) {
      throw new Error("No comments provided");
    }

    // ==========================================
    // المرحلة 1: تطبيع الرسائل (Normalization)
    // ==========================================
    const MAX_MESSAGES = 500;
    const commentsToProcess = args.comments.slice(0, MAX_MESSAGES);

    const normalizedMessages = commentsToProcess
      .map((c, idx) => {
        const ts = c.created_at ? new Date(c.created_at).getTime() : Date.now();
        const senderType: SenderRole =
          args.requesterId && c.author_id === args.requesterId
            ? "customer"
            : "agent";
        const textRaw = (c.body ?? "").toString();
        const textClean = cleanText(textRaw);

        return {
          id: `zd-${c.author_id}-${idx}`,
          senderType,
          senderName: c.author_id ? `User ${c.author_id}` : null,
          textRaw,
          textClean,
          internalTimestamp: ts,
          externalTimestamp: ts,
        };
      })
      .filter((m) => m.textClean && m.textClean.length > 0)
      .sort((a, b) => a.internalTimestamp - b.internalTimestamp);

    if (normalizedMessages.length === 0) {
      throw new Error("No valid messages after cleaning");
    }

    const startedAt = normalizedMessages[0].internalTimestamp;
    const endedAt =
      normalizedMessages[normalizedMessages.length - 1]?.internalTimestamp ??
      startedAt;

    // ==========================================
    // المرحلة 2: اختيار لغة التحليل ولغة المحادثة
    // ==========================================
    const analysisLanguage: SupportedLanguage = chooseAnalysisLanguage({
      analysisLanguageFromUser: undefined,
      chatLanguage: null,
      orgDefaultLanguage: undefined,
    });

    const timeMessages = normalizedMessages.map((m) => ({
      senderType: m.senderType,
      internalTimestamp: m.internalTimestamp,
      language: undefined,
    }));

    const conversationLanguage: SupportedLanguage = chooseConversationLanguage({
      chatLanguage: null,
      analysisLanguage,
      messages: timeMessages,
    });

    // ==========================================
    // المرحلة 3: حساب الوقت (SLA) - Rule-based
    // ==========================================
    // نحتاج chat mock للـ computeTimeRuleBased
    const mockChat = {
      sourceType: "integration" as const,
      sourceChannel: "zendesk" as const,
      language: undefined,
    };

    const timeResult: TimeRuleBasedResult = computeTimeRuleBased(
      mockChat,
      normalizedMessages.map((m) => ({
        senderType: m.senderType,
        internalTimestamp: m.internalTimestamp,
        language: undefined,
      })),
      normalizedMessages.filter((m) => m.senderType === "customer").length
    );

    // ==========================================
    // المرحلة 4: حساب بنية المحادثة - Rule-based
    // ==========================================
    const { structureMetrics } = computeStructureMetrics(
      normalizedMessages.map((m) => ({
        senderType: m.senderType,
        textClean: m.textClean,
        internalTimestamp: m.internalTimestamp,
      }))
    );

    // ==========================================
    // المرحلة 5: حساب الأعلام والكلمات المفتاحية - Rule-based
    // ==========================================
    const { flags, metricsPatch } = computeRuleBasedFlags({
      messages: normalizedMessages.map((m) => ({
        senderType: m.senderType,
        textClean: m.textClean,
        language: undefined,
        containsProfanity: undefined,
        toxicityScore: undefined,
      })),
      conversationLanguage,
      timeResult,
    });

    // ==========================================
    // المرحلة 6: بناء مدخلات الـ AI
    // ==========================================
    const aiInput = buildChatAnalysisAiInput({
      analysisLanguage,
      conversationLanguage,
      chat: {
        chatId: "zendesk-sidebar-temp",
        organizationId: "zendesk-sidebar",
        sourceType: "integration",
        sourceChannel: "zendesk",
        status: "open",
        title: args.subject,
        startedAt,
        endedAt,
        customerName: null,
      },
      messages: normalizedMessages.map(
        (m): AiInputMessage => ({
          id: m.id,
          role: m.senderType,
          senderName: m.senderName ?? null,
          text: m.textClean,
          originalText: m.textRaw !== m.textClean ? m.textRaw : undefined,
          timestamp: m.internalTimestamp,
        })
      ),
      channelType: timeResult.channelType,
      timeResult,
      structureMetrics,
      flags,
      keywordMetrics: metricsPatch,
    });

    // ==========================================
    // المرحلة 7: استدعاء GPT
    // ==========================================
    const client = getOpenAiClient();
    const systemPrompt = getChatAnalysisSystemPrompt(analysisLanguage);

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

    // Parse AI response with error handling
    const raw = completion.choices[0]?.message?.content ?? "{}";
    let analysisJson: any;
    try {
      analysisJson = JSON.parse(raw);
    } catch (parseError) {
      throw new Error(
        `AI returned invalid JSON: ${parseError instanceof Error ? parseError.message : "Unknown parse error"}`
      );
    }

    return analysisJson;
  },
});
