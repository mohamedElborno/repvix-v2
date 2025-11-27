// src/lib/chat/aiTypes.ts

export type AiSupportedLanguage = "ar" | "en" | "tr" | "fr" | "es" | "hi";

export interface AiInputMessage {
  id: string | null; // chatMessages._id لو متوفر، وإلا null
  role: "customer" | "agent" | "system";
  senderName?: string | null;
  text: string; // textClean
  originalText?: string; // textRaw لو حبيت
  timestamp: number; // internalTimestamp (ms)
  index: number; // ترتيب الرسالة داخل المحادثة
}

export interface AiInputChatMetadata {
  chatId: string;
  organizationId: string;

  sourceType: "manual" | "integration";
  sourceChannel: string | null; // "whatsapp" | "intercom" | ...

  channelType: "live_chat" | "messaging" | "email_like";

  status: "open" | "closed";
  title: string | null;

  conversationLanguage: AiSupportedLanguage; // اللغة الفعلية للمحادثة
  analysisLanguage: AiSupportedLanguage; // لغة مخرجات التحليل المطلوبة

  startedAt: number; // chat.startedAt
  endedAt: number | null; // chat.endedAt
}

export interface AiInputRuleBasedTimeMetrics {
  channelType: "live_chat" | "messaging" | "email_like";
  firstResponseMs?: number;
  avgAgentResponseMs?: number;
  maxAgentResponseMs?: number;
  softViolationCount: number;
  hardViolationCount: number;
  slaBreached: boolean;
}

export interface AiInputRuleBasedStructureMetrics {
  totalMessages: number;
  customerMessageCount: number;
  agentMessageCount: number;
  systemMessageCount: number;

  turnCount: number;
  roundTripCount: number;

  customerTalkRatio: number; // 0–1
  agentTalkRatio: number; // 0–1

  avgCustomerCharsPerMessage?: number;
  avgAgentCharsPerMessage?: number;
  maxCustomerChars?: number;
  maxAgentChars?: number;

  durationMs?: number; // لو حاب تحسبها من startedAt / endedAt
}

export interface AiInputRuleBasedFlags {
  hasInsults?: boolean;
  hasProfanity?: boolean;
  hasSlaViolation?: boolean;
  hasRefundRequest?: boolean;
  hasCancellationThreat?: boolean;
  hasPriceNegotiation?: boolean;
}

export interface AiInputRuleBasedKeywordMetrics {
  profanityMessageCount?: number;
  refundKeywordHits?: number;
  cancellationThreatHits?: number;
  priceNegotiationHits?: number;
}

export interface ChatAnalysisAiInput {
  version: "chat_analysis_v1";
  analysisLanguage: AiSupportedLanguage; // تكرار صريح لتسهيل البرومبت
  conversationLanguage: AiSupportedLanguage;

  chatMetadata: AiInputChatMetadata;

  ruleBasedAnalysis: {
    timeMetrics: AiInputRuleBasedTimeMetrics;
    structureMetrics: AiInputRuleBasedStructureMetrics;
    flags: AiInputRuleBasedFlags;
    keywordMetrics: AiInputRuleBasedKeywordMetrics;
  };

  conversation: {
    messages: AiInputMessage[];
  };
}

/**
 * Sentiment labels
 */
export type SentimentLabel =
  | "very_negative"
  | "negative"
  | "neutral"
  | "positive"
  | "very_positive";

/**
 * Satisfaction labels
 */
export type SatisfactionLabel =
  | "very_low"
  | "low"
  | "medium"
  | "high"
  | "very_high";

/**
 * Outcome status
 */
export type OutcomeStatus =
  | "resolved"
  | "partially_resolved"
  | "unresolved"
  | "escalated"
  | "pending_customer"
  | "pending_internal";

/**
 * Follow up owner type
 */
export type FollowUpOwnerType = "none" | "agent" | "team" | "system";

/**
 * Primary intent
 */
export type PrimaryIntent =
  | "complaint"
  | "pre_sales_question"
  | "technical_issue"
  | "refund_request"
  | "cancellation"
  | "billing_issue"
  | "account_issue"
  | "feedback"
  | "other";

/**
 * Sales stage
 */
export type SalesStage =
  | "none"
  | "awareness"
  | "consideration"
  | "decision"
  | "post_purchase";

/**
 * Objection type
 */
export type ObjectionType =
  | "price"
  | "features"
  | "complexity"
  | "trust"
  | "timing"
  | "other";

/**
 * Root cause category
 */
export type RootCauseCategory =
  | "product"
  | "policy"
  | "billing"
  | "ux"
  | "onboarding"
  | "expectation_mismatch"
  | "other";

/**
 * Churn risk level
 */
export type ChurnRiskLevel = "low" | "medium" | "high";

/**
 * Evidence purpose
 */
export type EvidencePurpose =
  | "frustration"
  | "satisfaction"
  | "objection"
  | "appreciation"
  | "threat"
  | "other";

/**
 * Outcome
 */
export interface AiOutputOutcome {
  outcomeStatus: OutcomeStatus;
  outcomeConfidence?: number; // 0-100
  outcomeSummary: string;

  requiresFollowUp: boolean;
  followUpOwnerType: FollowUpOwnerType;
  followUpDeadline?: number | null; // timestamp ms أو null لو غير محدد
  followUpNotes?: string | null;
}

/**
 * Experience
 */
export interface AiOutputExperience {
  customerSatisfactionScore?: number; // 0-100
  customerSatisfactionLabel?: SatisfactionLabel;

  sentimentStartScore?: number; // 0-100
  sentimentStartLabel?: SentimentLabel;
  sentimentEndScore?: number;
  sentimentEndLabel?: SentimentLabel;
  sentimentVolatilityScore?: number; // 0-100

  emotionTrajectory?: {
    phase: "start" | "early" | "mid" | "late" | "end";
    score: number; // 0-100
    label: SentimentLabel;
  }[];
}

/**
 * Structure
 */
export interface AiOutputStructure {
  conversationComplexity?: number; // 1-5
  conversationClarityScore?: number; // 0-100
  hadClearProblemStatement?: boolean;
  hadClearResolutionSummary?: boolean;
}

/**
 * Agent performance
 */
export interface AiOutputAgentPerformance {
  agentOverallScore?: number; // 0-100
  agentClarityScore?: number;
  agentEmpathyScore?: number;
  agentOwnershipScore?: number;
  agentProactivityScore?: number;
  agentProfessionalismScore?: number;

  agentStrengths?: string;
  agentImprovements?: string;
  agentCoachingTips?: string;
}

export interface AiOutputIntentAndSales {
  primaryIntent?: PrimaryIntent;
  secondaryIntents?: string[];
  salesStage?: SalesStage;
  purchaseIntentScore?: number; // 0-100

  mainObjections?: {
    type: ObjectionType;
    strength: number; // 0-100
    note?: string;
  }[];
}

export interface AiOutputRootCauses {
  primaryRootCauseCategory?: RootCauseCategory;
  primaryRootCauseDetails?: string;

  secondaryRootCauses?: {
    category: string;
    details?: string;
    weight?: number; // 0-100
  }[];
}

export interface AiOutputRisks {
  churnRiskScore?: number; // 0-100
  churnRiskLevel?: ChurnRiskLevel;
  escalationRiskScore?: number; // 0-100
  reputationalRiskScore?: number; // 0-100
  riskNotes?: string;
}

export interface AiOutputActions {
  internalActions?: {
    priority: "low" | "medium" | "high";
    area: string; // "support_process" | "product" | "billing" | ...
    title: string;
    description: string;
    owner?: string; // "support_team" | "product_team" | ...
    suggestedTimelineDays?: number;
  }[];

  customerActions?: {
    title: string;
    description: string;
    channel?: "email" | "whatsapp" | "phone" | "in_app" | "other";
  }[];

  productFeedback?: {
    severity: "low" | "medium" | "high" | "critical";
    module?: string; // "billing", "dashboard", ...
    note: string;
  }[];
}

export interface AiOutputEvidence {
  keyQuotes?: {
    role: "customer" | "agent" | "system";
    purpose: EvidencePurpose;
    text: string;
    messageIndex?: number; // index في conversation.messages لتسهيل الربط
  }[];
}

export interface ChatAnalysisAiOutput {
  analysisVersion: string; // "v1" مثلاً

  outcome: AiOutputOutcome;
  experience: AiOutputExperience;
  structure: AiOutputStructure;
  agentPerformance: AiOutputAgentPerformance;
  intentAndSales: AiOutputIntentAndSales;
  rootCauses: AiOutputRootCauses;
  risks: AiOutputRisks;
  actions: AiOutputActions;
  evidence: AiOutputEvidence;

  // اختياري: ميتاداتا داخلية من الـ AI لو حبيت
  meta?: {
    notes?: string;
  };
}
