// src/lib/chat/ruleBasedTime.ts

import type { NormalizedMessage } from "../types/chat";

// نوع الرسالة كما تُخزَّن في Convex (بس نستخدم الحد الأدنى هنا)
export interface ChatMessageDoc {
  senderType: "customer" | "agent" | "system";
  internalTimestamp: number;
  language?: NormalizedMessage["language"] | undefined;
  // ممكن تضيف أي حقول أخرى عندك هنا لو احتجتها
}

// نوع chat كما هو في Convex (نستخدم الحقول اللازمة فقط)
export interface ChatDoc {
  sourceType: "manual" | "integration";
  sourceChannel?: string | null;
  language?: NormalizedMessage["language"] | undefined;
}

// Supported languages
export type SupportedLanguage = "ar" | "en" | "tr" | "fr" | "es" | "hi" | "ja";

// Channel type
export type ChannelType = "live_chat" | "messaging" | "email_like";

// إعدادات SLA الافتراضية لكل نوع قناة
const SLA_DEFAULTS = {
  live_chat: {
    targetFirstReplyMs: 60_000, // 1 دقيقة
    targetSubsequentReplyMs: 120_000, // 2 دقيقة
  },
  messaging: {
    targetFirstReplyMs: 300_000, // 5 دقائق
    targetSubsequentReplyMs: 600_000, // 10 دقائق
  },
  email_like: {
    targetFirstReplyMs: 3_600_000, // 1 ساعة
    targetSubsequentReplyMs: 43_200_000, // 12 ساعة
  },
} as const;

// -----------------------------
// 1) لغة التحليل والمحادثة
// -----------------------------

/**
 * تحديد لغة التحليل النهائية:
 * - أولوية: اختيار المستخدم > chat.language > لغة المنظمة > "en"
 */
export function chooseAnalysisLanguage(options: {
  analysisLanguageFromUser?: SupportedLanguage;
  chatLanguage?: string | null;
  orgDefaultLanguage?: SupportedLanguage;
}): SupportedLanguage {
  const { analysisLanguageFromUser, chatLanguage, orgDefaultLanguage } =
    options;

  if (analysisLanguageFromUser) return analysisLanguageFromUser;

  const chatLang = normalizeToSupportedLanguage(chatLanguage);
  if (chatLang) return chatLang;

  if (orgDefaultLanguage) return orgDefaultLanguage;

  return "en";
}

/**
 * تحديد لغة المحادثة الفعلية:
 * - نثق في chat.language إن كانت ضمن اللغات الست.
 * - لو لا، نستخدم لغات رسائل العميل فقط:
 *   - إذا ظهر AR → "ar"
 *   - إذا ظهر HI → "hi"
 *   - إذا ظهرت TR بشكل كافٍ (≥ 3 رسائل) → "tr"
 *   - غير ذلك → نرجع إلى لغة التحليل.
 */
export function chooseConversationLanguage(options: {
  chatLanguage?: string | null;
  analysisLanguage: SupportedLanguage;
  messages: ChatMessageDoc[];
}): SupportedLanguage {
  const { chatLanguage, analysisLanguage, messages } = options;

  const chatLang = normalizeToSupportedLanguage(chatLanguage);
  if (chatLang) return chatLang;

  // نعتمد فقط على رسائل العميل
  const customerMessages = messages.filter(
    (m) => m.senderType === "customer" && !!m.language
  );

  const counts: Record<string, number> = {};
  for (const msg of customerMessages) {
    const lang = msg.language as SupportedLanguage | undefined;
    if (!lang) continue;
    counts[lang] = (counts[lang] ?? 0) + 1;
  }

  if ((counts["ar"] ?? 0) > 0) return "ar";
  if ((counts["hi"] ?? 0) > 0) return "hi";
  if ((counts["tr"] ?? 0) >= 3) return "tr";
  if ((counts["ja"] ?? 0) > 0) return "ja";

  // في باقي الحالات (en/fr/es) لا نعتمد كشف اللغة ونعود للـ analysisLanguage
  return analysisLanguage;
}

/**
 * تحويل أي string إلى لغة مدعومة إن أمكن.
 */
function normalizeToSupportedLanguage(
  lang?: string | null
): SupportedLanguage | undefined {
  if (!lang) return undefined;
  const lower = lang.toLowerCase();
  const supported: SupportedLanguage[] = [
    "ar",
    "en",
    "tr",
    "fr",
    "es",
    "hi",
    "ja",
  ];
  return supported.includes(lower as SupportedLanguage)
    ? (lower as SupportedLanguage)
    : undefined;
}

// -----------------------------
// 2) استنتاج نوع القناة
// -----------------------------

export function inferChannelType(chat: ChatDoc): ChannelType {
  const s = (chat.sourceChannel || "").toLowerCase();

  // 1) أولاً: لو القناة معرّفة، نستخدمها بغض النظر عن manual/integration
  if (
    ["intercom", "zendesk", "crisp", "tidio", "drift", "livechat"].some((x) =>
      s.includes(x)
    )
  ) {
    return "live_chat";
  }

  if (
    ["whatsapp", "whatsapp_paste", "telegram", "instagram", "messenger"].some(
      (x) => s.includes(x)
    )
  ) {
    return "messaging";
  }

  if (["email", "gmail", "outlook"].some((x) => s.includes(x))) {
    return "email_like";
  }

  // 2) ثانياً: fallback حسب نوع المصدر لو لم توجد قناة واضحة
  if (chat.sourceType === "manual") {
    // بما أن الغالب manual = واتساب، نجعل الافتراضي messaging
    return "messaging";
  }

  // integration بدون قناة معروفة → نختار messaging كمنتصف الطريق
  return "messaging";
}

// -----------------------------
// 3) الحساب الزمني للردود
// -----------------------------

export interface AgentResponseStats {
  firstResponseMs?: number;
  agentDelays: number[];
  softViolationCount: number;
  hardViolationCount: number;
}

export interface AgentResponseSummary {
  firstResponseMs?: number;
  avgAgentResponseMs?: number;
  maxAgentResponseMs?: number;
  softViolationCount: number;
  hardViolationCount: number;
}

/**
 * فرز الرسائل حسب التوقيت.
 */
function sortMessages(messages: ChatMessageDoc[]): ChatMessageDoc[] {
  return [...messages].sort(
    (a, b) => a.internalTimestamp - b.internalTimestamp
  );
}

/**
 * استخراج جميع أزمنة رد الـ agent بعد رسائل العميل،
 * مع عدّ الانتهاكات المتوسطة والشديدة بناءً على نوع القناة.
 */
export function extractAgentResponseStats(
  messages: ChatMessageDoc[],
  channelType: ChannelType
): AgentResponseStats {
  const sorted = sortMessages(messages);
  const { targetFirstReplyMs, targetSubsequentReplyMs } =
    SLA_DEFAULTS[channelType];

  // soft = الهدف نفسه
  const softFirstThreshold = targetFirstReplyMs;
  const softSubsequentThreshold = targetSubsequentReplyMs;

  // hard = ضعف الهدف
  const hardFirstThreshold = 2 * targetFirstReplyMs;
  const hardSubsequentThreshold = 2 * targetSubsequentReplyMs;

  let lastCustomerTs: number | null = null;
  let firstResponseMs: number | undefined;
  const agentDelays: number[] = [];
  let softViolationCount = 0;
  let hardViolationCount = 0;

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  for (const msg of sorted) {
    if (msg.senderType === "customer") {
      lastCustomerTs = msg.internalTimestamp;
      continue;
    }

    if (msg.senderType === "agent" && lastCustomerTs !== null) {
      const delay = msg.internalTimestamp - lastCustomerTs;

      // استبعاد الفترات غير المنطقية (أكثر من يوم مثلاً)
      if (delay > 0 && delay < ONE_DAY_MS) {
        agentDelays.push(delay);

        if (firstResponseMs === undefined) {
          // أول رد في المحادثة
          firstResponseMs = delay;

          if (delay > softFirstThreshold) softViolationCount++;
          if (delay >= hardFirstThreshold) hardViolationCount++;
        } else {
          // ردود لاحقة
          if (delay > softSubsequentThreshold) softViolationCount++;
          if (delay >= hardSubsequentThreshold) hardViolationCount++;
        }
      }

      // هذه الرسالة تعتبر ردًا على آخر رسالة عميل
      lastCustomerTs = null;
    }
  }

  return {
    firstResponseMs,
    agentDelays,
    softViolationCount,
    hardViolationCount,
  };
}

/**
 * تبسيط الإحصاءات لاستخدامها في التخزين أو في ruleBasedMetrics.
 */
export function summarizeResponseStats(
  stats: AgentResponseStats
): AgentResponseSummary {
  const {
    firstResponseMs,
    agentDelays,
    softViolationCount,
    hardViolationCount,
  } = stats;

  const avgAgentResponseMs =
    agentDelays.length > 0
      ? agentDelays.reduce((a, b) => a + b, 0) / agentDelays.length
      : undefined;

  const maxAgentResponseMs =
    agentDelays.length > 0 ? Math.max(...agentDelays) : undefined;

  return {
    firstResponseMs,
    avgAgentResponseMs,
    maxAgentResponseMs,
    softViolationCount,
    hardViolationCount,
  };
}

/**
 * حساب هل تم خرق الـ SLA بناء على:
 * - أول رد
 * - أسوأ رد
 * - عدد الانتهاكات (soft/hard)
 * - وجود رسائل عميل بدون أي رد
 */
export function computeSlaBreachedFromStats(options: {
  channelType: ChannelType;
  summary: AgentResponseSummary;
  customerMessageCount: number;
}): boolean {
  const { channelType, summary, customerMessageCount } = options;
  const {
    firstResponseMs,
    maxAgentResponseMs,
    softViolationCount,
    hardViolationCount,
  } = summary;

  const { targetFirstReplyMs, targetSubsequentReplyMs } =
    SLA_DEFAULTS[channelType];

  const softFirstThreshold = targetFirstReplyMs; // الهدف نفسه
  const softSubsequentThreshold = targetSubsequentReplyMs;

  const hardFirstThreshold = 2 * targetFirstReplyMs; // ضعف الهدف
  const hardSubsequentThreshold = 2 * targetSubsequentReplyMs;

  // العميل كتب ولم يرد عليه أحد إطلاقًا
  if (customerMessageCount > 0 && firstResponseMs === undefined) {
    return true;
  }

  let breached = false;

  if (firstResponseMs !== undefined && firstResponseMs >= hardFirstThreshold) {
    breached = true;
  }

  if (
    maxAgentResponseMs !== undefined &&
    maxAgentResponseMs >= hardSubsequentThreshold
  ) {
    breached = true;
  }

  const manySoftViolations = softViolationCount >= 3;
  const hasHardViolations = hardViolationCount > 0;

  return breached || manySoftViolations || hasHardViolations;
}

// -----------------------------
// 4) دالة مريحة تجمع كل شيء
// -----------------------------

export interface TimeRuleBasedResult {
  channelType: ChannelType;
  firstResponseMs?: number;
  avgAgentResponseMs?: number;
  maxAgentResponseMs?: number;
  softViolationCount: number;
  hardViolationCount: number;
  slaBreached: boolean;
}

/**
 * دالة جاهزة تُستدعى أثناء التحليل:
 * - تأخذ chat + messages
 * - تعيد جميع النتائج الزمنية التي تحتاجها
 * لتخزينها في chatAnalyses + ruleBasedMetrics.
 */
export function computeTimeRuleBased(
  chat: ChatDoc,
  messages: ChatMessageDoc[],
  customerMessageCount: number
): TimeRuleBasedResult {
  const channelType = inferChannelType(chat);
  const stats = extractAgentResponseStats(messages, channelType);
  const summary = summarizeResponseStats(stats);

  const slaBreached = computeSlaBreachedFromStats({
    channelType,
    summary,
    customerMessageCount,
  });

  return {
    channelType,
    firstResponseMs: summary.firstResponseMs,
    avgAgentResponseMs: summary.avgAgentResponseMs,
    maxAgentResponseMs: summary.maxAgentResponseMs,
    softViolationCount: summary.softViolationCount,
    hardViolationCount: summary.hardViolationCount,
    slaBreached,
  };
}
