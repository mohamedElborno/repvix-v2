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
 * Metadata sent to GPT
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

  /** user-provided customer name (absolute priority for GPT) */
  customerName: string | null;
}

export interface AiInputMessage {
  id: string;
  role: "customer" | "agent" | "system";
  senderName: string | null;
  text: string;
  originalText?: string | undefined;
  timestamp: number;
}

export interface AiStructureMetricsInput {
  totalMessages: number;
  customerMessageCount: number;
  agentMessageCount: number;
  systemMessageCount: number;
  turnCount: number;
  roundTripCount: number;

  customerTalkRatio: number;
  agentTalkRatio: number;

  avgCustomerCharsPerMessage?: number;
  avgAgentCharsPerMessage?: number;
  maxCustomerChars?: number;
  maxAgentChars?: number;

  durationMs?: number;
}

export interface BuildChatAnalysisAiInputParams {
  analysisLanguage: SupportedLanguage;
  conversationLanguage: SupportedLanguage;

  chat: AiChatInputMetadata;
  messages: AiInputMessage[];

  channelType: ChannelType;

  timeResult: TimeRuleBasedResult;
  structureMetrics: AiStructureMetricsInput;

  flags: RuleBasedFlagsResult;
  keywordMetrics: RuleBasedMetricsPatch;
}

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

  // ----------------------------------------------------------------------
  // 1) Normalize & enforce user-provided customerName
  // ----------------------------------------------------------------------

  let finalCustomerName: string | null = null;

  if (chat.customerName && typeof chat.customerName === "string") {
    const trimmed = chat.customerName.trim();
    if (trimmed.length > 0) {
      finalCustomerName = trimmed;
    }
  }

  const customerNameSource = finalCustomerName ? "user_provided" : "none";

  // ----------------------------------------------------------------------
  // 2) Ensure chronological order
  // ----------------------------------------------------------------------

  const sortedMessages = [...messages].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  const aiMessages = sortedMessages.map((m, index) => ({
    id: m.id,
    role: m.role,
    senderName: m.senderName,
    text: m.text,
    originalText: m.originalText ?? undefined,
    timestamp: m.timestamp,
    index,
  }));

  // ----------------------------------------------------------------------
  // 3) Build metadata block
  // ----------------------------------------------------------------------

  const chatMetadata = {
    chatId: chat.chatId,
    organizationId: chat.organizationId,
    sourceType: chat.sourceType,
    sourceChannel: chat.sourceChannel,
    channelType,

    status: chat.status,
    title: chat.title,

    conversationLanguage,
    analysisLanguage,

    startedAt: chat.startedAt,
    endedAt: chat.endedAt,

    /** highest-priority field passed to GPT */
    customerName: finalCustomerName,
    customerNameSource, // NEW
  };

  // ----------------------------------------------------------------------
  // 4) Rule-based time metrics
  // ----------------------------------------------------------------------

  const timeMetrics = {
    channelType,
    firstResponseMs: timeResult.firstResponseMs,
    avgAgentResponseMs: timeResult.avgAgentResponseMs,
    maxAgentResponseMs: timeResult.maxAgentResponseMs,
    softViolationCount: timeResult.softViolationCount,
    hardViolationCount: timeResult.hardViolationCount,
    slaBreached: timeResult.slaBreached,
  };

  // ----------------------------------------------------------------------
  // 5) Rule-based metrics package
  // ----------------------------------------------------------------------

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

  // ----------------------------------------------------------------------
  // 6) Final AI Input JSON
  // ----------------------------------------------------------------------

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
