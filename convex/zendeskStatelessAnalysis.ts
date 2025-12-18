import { action } from "./_generated/server";
import { v } from "convex/values";
import {
  chooseAnalysisLanguage,
  chooseConversationLanguage,
  computeTimeRuleBased,
  type SupportedLanguage,
  type TimeRuleBasedResult,
} from "../lib/chat/ruleBasedTime";
import { computeRuleBasedFlags } from "../lib/chat/ruleBasedFlags";
import {
  buildChatAnalysisAiInput,
  type AiInputMessage,
  type AiStructureMetricsInput,
} from "../lib/chat/buildChatAnalysisAiInput";
import {
  computeStructureRuleBased,
  type ChatMessageDoc as StructureChatMessageDoc,
} from "../lib/chat/ruleBasedStructure";
import { getOpenAiClient, CHAT_ANALYSIS_MODEL } from "../lib/openai/client";
import { getChatAnalysisSystemPrompt } from "@/lib/ai/chat_analysis_prompt";
import {
  normalizeMessages,
  type RawMessageInput,
  type NormalizedMessage,
} from "../lib/chat/normalize";

type SenderRole = "customer" | "agent" | "system";

function normalizeTs(ts: number | null | undefined): number | undefined {
  if (ts == null) return undefined;
  // لو timestamp أقل من 1 تريليون → هذا يعني أنه seconds وليس ms
  if (ts > 0 && ts < 1e12) return ts * 1000;
  return ts;
}

export const zendeskSidebarAnalyze = action({
  args: {
    subject: v.string(),
    comments: v.array(
      v.object({
        author_id: v.number(),
        body: v.string(),
        created_at: v.string(),
        public: v.optional(v.boolean()),
        via: v.optional(
          v.object({
            source: v.optional(
              v.object({
                from: v.optional(
                  v.object({
                    address: v.optional(v.string()),
                  })
                ),
              })
            ),
          })
        ),
      })
    ),
    requesterId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.comments.length === 0) {
      throw new Error("No comments provided");
    }

    // ==========================================
    // المرحلة 1: تطبيع الرسائل (Normalization) - نفس المراحل في التحليل العادي
    // ==========================================
    const MAX_MESSAGES = 500;
    const commentsToProcess = args.comments.slice(0, MAX_MESSAGES);

    // تحويل Zendesk comments إلى RawMessageInput format
    // استخدام نفس منطق Zendesk لتحديد customer vs agent
    const rawMessages: RawMessageInput[] = commentsToProcess
      .map((c) => {
        const externalTs = c.created_at
          ? new Date(c.created_at).getTime()
          : undefined;
        const normalizedTs = normalizeTs(externalTs);

        // تحديد customer vs agent - نفس المنطق المستخدم في Zendesk integration
        // 1. إذا كان author_id === requesterId → customer
        // 2. إذا كان via.source.from.address === author_id → customer (رسالة من العميل)
        // 3. إذا كان public === true → غالباً customer
        // 4. غير ذلك → agent
        let senderType: "customer" | "agent" = "agent";

        if (args.requesterId && c.author_id === args.requesterId) {
          senderType = "customer";
        } else if (
          c.via?.source?.from?.address &&
          String(c.via.source.from.address) === String(c.author_id)
        ) {
          senderType = "customer";
        } else if (c.public === true && !args.requesterId) {
          // إذا كانت الرسالة public ولا يوجد requesterId، افترض أنها من customer
          // (هذا ليس دقيق 100% لكنه أفضل من افتراض agent)
          senderType = "customer";
        }

        return {
          senderType,
          senderName: c.author_id ? `User ${c.author_id}` : undefined,
          text: (c.body ?? "").toString(),
          externalMessageId: `zd-${c.author_id}-${c.created_at}`,
          externalTimestamp: normalizedTs,
          metadata: {
            zendeskAuthorId: c.author_id,
            zendeskPublic: c.public,
            zendeskVia: c.via,
          },
        };
      })
      .filter((m) => m.text && m.text.trim().length > 0);

    // استخدام normalizeMessages من lib/chat/normalize.ts (نفس التحليل العادي)
    const normalizedMessages: NormalizedMessage[] = normalizeMessages(
      rawMessages,
      {
        detectLanguage: true, // كشف اللغة تلقائياً
        defaultLanguage: "en",
      }
    );

    // تحويل إلى format مناسب للتحليل
    const messagesForAnalysis = normalizedMessages
      .map((m, idx) => ({
        id: m.externalMessageId ?? `zd-msg-${idx}`,
        senderType: m.senderType as SenderRole,
        senderName: m.senderName ?? null,
        textRaw: m.textRaw,
        textClean: m.textClean,
        language: m.language,
        internalTimestamp: m.internalTimestamp,
        externalTimestamp: m.externalTimestamp,
      }))
      .sort((a, b) => a.internalTimestamp - b.internalTimestamp);

    if (messagesForAnalysis.length === 0) {
      throw new Error("No valid messages after cleaning");
    }

    const startedAt = messagesForAnalysis[0].internalTimestamp;
    const endedAt =
      messagesForAnalysis[messagesForAnalysis.length - 1]?.internalTimestamp ??
      startedAt;

    // ==========================================
    // المرحلة 2: اختيار لغة التحليل ولغة المحادثة
    // ==========================================
    // استخدام اللغة المكتشفة من الرسائل
    const detectedLanguages = messagesForAnalysis
      .map((m) => m.language)
      .filter(
        (l): l is SupportedLanguage =>
          typeof l === "string" &&
          l !== "unknown" &&
          ["ar", "en", "tr", "fr", "es", "hi", "ja"].includes(l)
      );
    const mostCommonLanguage: SupportedLanguage | null =
      detectedLanguages.length > 0
        ? (detectedLanguages.reduce((a, b, _, arr) =>
            arr.filter((v) => v === a).length >=
            arr.filter((v) => v === b).length
              ? a
              : b
          ) as SupportedLanguage)
        : null;

    const analysisLanguage: SupportedLanguage = chooseAnalysisLanguage({
      analysisLanguageFromUser: undefined,
      chatLanguage: mostCommonLanguage,
      orgDefaultLanguage: undefined,
    });

    const timeMessages = messagesForAnalysis.map((m) => ({
      senderType: m.senderType,
      internalTimestamp: m.internalTimestamp,
      language: m.language,
    }));

    const conversationLanguage: SupportedLanguage = chooseConversationLanguage({
      chatLanguage: mostCommonLanguage,
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
      language: mostCommonLanguage ?? undefined,
    };

    const timeResult: TimeRuleBasedResult = computeTimeRuleBased(
      mockChat,
      messagesForAnalysis.map((m) => ({
        senderType: m.senderType,
        internalTimestamp: m.internalTimestamp,
        language: m.language,
      })),
      messagesForAnalysis.filter((m) => m.senderType === "customer").length
    );

    // ==========================================
    // المرحلة 4: حساب بنية المحادثة - Rule-based
    // ==========================================
    // استخدام computeStructureRuleBased من lib/chat/ruleBasedStructure.ts
    // (نفس الدالة المستخدمة في التحليل العادي)
    const structureResult = computeStructureRuleBased(
      messagesForAnalysis.map(
        (m): StructureChatMessageDoc => ({
          senderType: m.senderType,
          internalTimestamp: m.internalTimestamp,
          textRaw: m.textRaw, // مهم: نستخدم textRaw وليس textClean
          language: m.language,
        })
      )
    );

    // تحويل StructureMetrics إلى AiStructureMetricsInput
    // ملاحظة: StructureMetrics لا يحتوي على durationMs، لكن ruleBasedMetricsPatch يحتوي عليه
    const structureMetrics: AiStructureMetricsInput = {
      totalMessages: structureResult.structureMetrics.totalMessages,
      customerMessageCount:
        structureResult.structureMetrics.customerMessageCount,
      agentMessageCount: structureResult.structureMetrics.agentMessageCount,
      systemMessageCount: structureResult.structureMetrics.systemMessageCount,
      turnCount: structureResult.structureMetrics.turnCount,
      roundTripCount: structureResult.structureMetrics.roundTripCount,
      customerTalkRatio: structureResult.structureMetrics.customerTalkRatio,
      agentTalkRatio: structureResult.structureMetrics.agentTalkRatio,
      avgCustomerCharsPerMessage:
        structureResult.structureMetrics.avgCustomerCharsPerMessage,
      avgAgentCharsPerMessage:
        structureResult.structureMetrics.avgAgentCharsPerMessage,
      maxCustomerChars: structureResult.structureMetrics.maxCustomerChars,
      maxAgentChars: structureResult.structureMetrics.maxAgentChars,
      durationMs: structureResult.ruleBasedMetricsPatch.durationMs,
    };

    // ==========================================
    // المرحلة 5: حساب الأعلام والكلمات المفتاحية - Rule-based
    // ==========================================
    const { flags, metricsPatch } = computeRuleBasedFlags({
      messages: messagesForAnalysis.map((m) => ({
        senderType: m.senderType,
        textClean: m.textClean,
        language: m.language,
        containsProfanity: undefined, // سيتم اكتشافه من textClean
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
      messages: messagesForAnalysis.map(
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

    // Extract token usage from OpenAI response
    const tokenInputCount = completion.usage?.prompt_tokens ?? undefined;
    const tokenOutputCount = completion.usage?.completion_tokens ?? undefined;

    // Return analysis with token usage information
    return {
      analysis: analysisJson,
      tokenInputCount,
      tokenOutputCount,
    };
  },
});
