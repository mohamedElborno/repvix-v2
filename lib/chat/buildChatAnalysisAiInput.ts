// src/lib/chat/buildChatAnalysisAiInput.ts

import type { ChatAnalysisAiInput } from "../ai/aiTypes";
import type {
  SupportedLanguage,
  ChannelType,
  TimeRuleBasedResult,
} from "./ruleBasedTime";
import type {
  RuleBasedFlagsResult,
  RuleBasedMetricsPatch,
} from "./ruleBasedFlags";

/**
 * تمهيد: شكل البيانات الخاصة بالـ chat التي نحتاجها للـ AI فقط
 * (نستقبل IDs كسلاسل نصية حتى لا نعتمد على نوع Convex Id داخلياً)
 */
export interface AiChatInputMetadata {
  chatId: string;
  organizationId: string;

  sourceType: "manual" | "integration";
  sourceChannel: string | null;
  status: "open" | "closed";
  title: string | null;

  startedAt: number;
  endedAt: number | null;
}

/**
 * شكل الرسالة كما سنمررها للدالة من Convex
 * (نستقبل textClean + textRaw + التوقيت + اسم المرسل)
 */
export interface AiInputMessage {
  id: string;
  role: "customer" | "agent" | "system";
  senderName: string | null;
  text: string; // textClean
  originalText?: string | undefined; // textRaw (اختياري)
  timestamp: number; // internalTimestamp
}

/**
 * structureMetrics كما نحتاجه للـ AI (متطابق تقريباً مع structureMetrics في السكيما)
 */
export interface AiStructureMetricsInput {
  totalMessages: number;
  customerMessageCount: number;
  agentMessageCount: number;
  systemMessageCount: number;
  turnCount: number;
  roundTripCount: number;

  customerTalkRatio: number; // 0-1
  agentTalkRatio: number; // 0-1

  avgCustomerCharsPerMessage?: number;
  avgAgentCharsPerMessage?: number;
  maxCustomerChars?: number;
  maxAgentChars?: number;

  // ممكن نستغلها من ruleBasedMetrics.durationMs
  durationMs?: number;
}

/**
 * باراميترات بناء ChatAnalysisAiInput
 */
export interface BuildChatAnalysisAiInputParams {
  analysisLanguage: SupportedLanguage;
  conversationLanguage: SupportedLanguage;

  chat: AiChatInputMetadata;
  messages: AiInputMessage[];

  channelType: ChannelType; // عادة من timeResult.channelType

  timeResult: TimeRuleBasedResult;
  structureMetrics: AiStructureMetricsInput;

  flags: RuleBasedFlagsResult;
  keywordMetrics: RuleBasedMetricsPatch;
}

/**
 * الدالة الرئيسية:
 * تحوّل:
 *  - chat + messages + rule-based
 * إلى
 *  - ChatAnalysisAiInput جاهز للإرسال للـ GPT كـ JSON واحد.
 */
export function buildChatAnalysisAiInput(
  params: BuildChatAnalysisAiInputParams
): ChatAnalysisAiInput {
  const {
    analysisLanguage,
    conversationLanguage,
    chat,
    messages,
    channelType,
    timeResult,
    structureMetrics,
    flags,
    keywordMetrics,
  } = params;

  // تأكيد الترتيب الزمني للرسائل (للامان)
  const sortedMessages = [...messages].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  // تحويل الرسائل إلى الشكل المتوقع من ChatAnalysisAiInput
  const aiMessages = sortedMessages.map((m, index) => ({
    id: m.id,
    role: m.role,
    senderName: m.senderName,
    text: m.text,
    originalText: m.originalText ?? undefined,
    timestamp: m.timestamp,
    index,
  }));

  // chatMetadata كما في aiTypes.ts
  const chatMetadata = {
    chatId: chat.chatId,
    organizationId: chat.organizationId,
    sourceType: chat.sourceType,
    sourceChannel: chat.sourceChannel,
    channelType, // من timeResult.channelType

    status: chat.status,
    title: chat.title,

    conversationLanguage,
    analysisLanguage,

    startedAt: chat.startedAt,
    endedAt: chat.endedAt,
  };

  // timeMetrics مأخوذ مباشرة من TimeRuleBasedResult
  const timeMetrics = {
    channelType,
    firstResponseMs: timeResult.firstResponseMs,
    avgAgentResponseMs: timeResult.avgAgentResponseMs,
    maxAgentResponseMs: timeResult.maxAgentResponseMs,
    softViolationCount: timeResult.softViolationCount,
    hardViolationCount: timeResult.hardViolationCount,
    slaBreached: timeResult.slaBreached,
  };

  // ruleBasedAnalysis كامل
  const ruleBasedAnalysis = {
    timeMetrics,
    structureMetrics,
    flags,
    keywordMetrics: {
      profanityMessageCount: keywordMetrics.profanityMessageCount,
      refundKeywordHits: keywordMetrics.refundKeywordHits,
      cancellationThreatHits: keywordMetrics.cancellationThreatHits,
      priceNegotiationHits: keywordMetrics.priceNegotiationHits,
    },
  };

  const aiInput: ChatAnalysisAiInput = {
    version: "chat_analysis_v1",
    analysisLanguage,
    conversationLanguage,
    chatMetadata,
    ruleBasedAnalysis,
    conversation: {
      messages: aiMessages,
    },
  };

  return aiInput;
}
