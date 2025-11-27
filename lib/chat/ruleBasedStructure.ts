// src/lib/chat/ruleBasedStructure.ts

import type { NormalizedMessage } from "../types/chat";

/**
 * النوع المستعمل في التحليل الهيكلي للمحادثة
 * يطابق chatMessages في Convex في الحد الأدنى.
 */
export interface ChatMessageDoc {
  senderType: "customer" | "agent" | "system";
  internalTimestamp: number;
  textRaw: string;
  language?: NormalizedMessage["language"] | undefined;
}

/**
 * الميتريكس التفصيلية لبنية المحادثة (للتخزين في structureMetrics)
 */
export interface StructureMetrics {
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
}

/**
 * النتيجة العامة للـ rule-based structure:
 * - رقم تعقيد المحادثة (1-5)
 * - patch لـ ruleBasedMetrics
 * - structureMetrics كامل للتخزين
 */
export interface StructureRuleBasedResult {
  conversationComplexity: number; // 1-5
  ruleBasedMetricsPatch: {
    customerMessageCount?: number;
    agentMessageCount?: number;
    turnCount?: number;
    durationMs?: number;
    // topicsCount سنتركه للـ AI لاحقاً
  };
  structureMetrics: StructureMetrics;
}

/**
 * فرز الرسائل حسب التوقيت
 */
function sortMessages(messages: ChatMessageDoc[]): ChatMessageDoc[] {
  return [...messages].sort(
    (a, b) => a.internalTimestamp - b.internalTimestamp
  );
}

/**
 * حساب turnCount:
 * كل سلسلة متتالية من نفس الطرف (customer/agent) تعتبر turn واحد.
 * رسائل system لا تدخل في العدّ.
 */
function computeTurnCount(messages: ChatMessageDoc[]): number {
  let lastSpeaker: "customer" | "agent" | null = null;
  let turnCount = 0;

  for (const msg of messages) {
    if (msg.senderType === "system") continue;

    if (lastSpeaker === null) {
      lastSpeaker = msg.senderType;
      turnCount++;
    } else if (msg.senderType !== lastSpeaker) {
      lastSpeaker = msg.senderType;
      turnCount++;
    }
  }

  return turnCount;
}

/**
 * حساب roundTripCount:
 * كل انتقال customer → agent يعدّ roundTrip واحد.
 * رسائل system لا تدخل في العدّ.
 */
function computeRoundTripCount(messages: ChatMessageDoc[]): number {
  let lastNonSystemSender: "customer" | "agent" | null = null;
  let roundTripCount = 0;

  for (const msg of messages) {
    if (msg.senderType === "system") continue;

    const current = msg.senderType;
    if (lastNonSystemSender === "customer" && current === "agent") {
      roundTripCount++;
    }

    lastNonSystemSender = current;
  }

  return roundTripCount;
}

/**
 * حساب مدة المحادثة بالـ ms
 */
function computeDurationMs(messages: ChatMessageDoc[]): number {
  if (messages.length === 0) return 0;
  const first = messages[0];
  const last = messages[messages.length - 1];
  return last.internalTimestamp - first.internalTimestamp;
}

/**
 * حساب نسب الكلام customer/agent من إجمالي الرسائل غير النظامية.
 */
function computeTalkRatios(
  customerMessageCount: number,
  agentMessageCount: number
): { customerTalkRatio: number; agentTalkRatio: number } {
  const total = customerMessageCount + agentMessageCount;
  if (total === 0) {
    return { customerTalkRatio: 0, agentTalkRatio: 0 };
  }

  return {
    customerTalkRatio: customerMessageCount / total,
    agentTalkRatio: agentMessageCount / total,
  };
}

/**
 * حساب تعقيد المحادثة (1-5) بناء على:
 * - عدد الرسائل (بدون system)
 * - عدد roundTrips
 * - مدة المحادثة بالدقائق
 */
function computeConversationComplexity(
  customerMessageCount: number,
  agentMessageCount: number,
  roundTripCount: number,
  durationMs: number
): number {
  const totalMessages = customerMessageCount + agentMessageCount;
  if (totalMessages === 0) {
    return 1; // لا يوجد شيء تقريباً
  }

  const durationMin = durationMs / 1000 / 60;

  // قواعد بسيطة لكنها منطقية
  if (totalMessages <= 4 && roundTripCount <= 2 && durationMin <= 10) {
    return 1; // بسيطة جداً: سؤال/جواب
  }

  if (totalMessages <= 10 && roundTripCount <= 5 && durationMin <= 30) {
    return 2; // بسيطة/متوسطة
  }

  if (totalMessages <= 20 && roundTripCount <= 10) {
    return 3; // تعقيد متوسط: عدة استفسارات
  }

  if (totalMessages <= 40) {
    return 4; // محادثة معقدة واضحة
  }

  return 5; // محادثة ثقيلة جداً
}

/**
 * حساب أطوال الرسائل (characters-based) للعميل والموظف.
 */
function computeLengthStats(messages: ChatMessageDoc[]): {
  avgCustomerCharsPerMessage?: number;
  avgAgentCharsPerMessage?: number;
  maxCustomerChars?: number;
  maxAgentChars?: number;
} {
  let customerCharsTotal = 0;
  let agentCharsTotal = 0;
  let customerMsgCount = 0;
  let agentMsgCount = 0;
  let maxCustomerChars = 0;
  let maxAgentChars = 0;

  for (const msg of messages) {
    const len = msg.textRaw ? msg.textRaw.length : 0;

    if (msg.senderType === "customer") {
      customerMsgCount++;
      customerCharsTotal += len;
      if (len > maxCustomerChars) maxCustomerChars = len;
    } else if (msg.senderType === "agent") {
      agentMsgCount++;
      agentCharsTotal += len;
      if (len > maxAgentChars) maxAgentChars = len;
    }
  }

  const avgCustomerCharsPerMessage =
    customerMsgCount > 0 ? customerCharsTotal / customerMsgCount : undefined;

  const avgAgentCharsPerMessage =
    agentMsgCount > 0 ? agentCharsTotal / agentMsgCount : undefined;

  return {
    avgCustomerCharsPerMessage,
    avgAgentCharsPerMessage,
    maxCustomerChars: customerMsgCount > 0 ? maxCustomerChars : undefined,
    maxAgentChars: agentMsgCount > 0 ? maxAgentChars : undefined,
  };
}

/**
 * الدالة الرئيسية: Rule-based لبنية المحادثة
 * - لا تستخدم أي AI
 * - تعتمد فقط على الرسائل كما هي
 */
export function computeStructureRuleBased(
  messages: ChatMessageDoc[]
): StructureRuleBasedResult {
  const sorted = sortMessages(messages);

  const totalMessages = sorted.length;

  const customerMessageCount = sorted.filter(
    (m) => m.senderType === "customer"
  ).length;

  const agentMessageCount = sorted.filter(
    (m) => m.senderType === "agent"
  ).length;

  const systemMessageCount = sorted.filter(
    (m) => m.senderType === "system"
  ).length;

  const durationMs = computeDurationMs(sorted);
  const turnCount = computeTurnCount(sorted);
  const roundTripCount = computeRoundTripCount(sorted);

  const { customerTalkRatio, agentTalkRatio } = computeTalkRatios(
    customerMessageCount,
    agentMessageCount
  );

  const {
    avgCustomerCharsPerMessage,
    avgAgentCharsPerMessage,
    maxCustomerChars,
    maxAgentChars,
  } = computeLengthStats(sorted);

  const conversationComplexity = computeConversationComplexity(
    customerMessageCount,
    agentMessageCount,
    roundTripCount,
    durationMs
  );

  const structureMetrics: StructureMetrics = {
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
  };

  const ruleBasedMetricsPatch = {
    customerMessageCount,
    agentMessageCount,
    turnCount,
    durationMs,
    // topicsCount: نتركه للـ AI لاحقاً
  };

  return {
    conversationComplexity,
    ruleBasedMetricsPatch,
    structureMetrics,
  };
}
