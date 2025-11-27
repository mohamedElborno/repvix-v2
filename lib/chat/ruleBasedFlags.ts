// src/lib/chat/ruleBasedFlags.ts

import { FLAG_KEYWORDS } from "./lexicons/flagKeywords";
import type { NormalizedMessage } from "../types/chat";
import type { SupportedLanguage, TimeRuleBasedResult } from "./ruleBasedTime";

/**
 * النوع المستعمل هنا يطابق chatMessages في Convex في الحد الأدنى.
 */
export interface ChatMessageDoc {
  senderType: "customer" | "agent" | "system";
  textClean: string;
  language?: NormalizedMessage["language"] | undefined;
  containsProfanity?: boolean;
  toxicityScore?: number;
}

/**
 * شكل الفلاقز كما في السكيما (chatAnalyses.ruleBasedFlags)
 */
export interface RuleBasedFlagsResult {
  hasInsults?: boolean;
  hasProfanity?: boolean;
  hasSlaViolation?: boolean;
  hasRefundRequest?: boolean;
  hasCancellationThreat?: boolean;
  hasPriceNegotiation?: boolean;
}

/**
 * جزء من ruleBasedMetrics المرتبط بهذه الفلاقز
 */
export interface RuleBasedMetricsPatch {
  profanityMessageCount?: number;
  refundKeywordHits?: number;
  cancellationThreatHits?: number;
  priceNegotiationHits?: number;
}

/* -------------------------------------- */
/*        عتبات السمّية / الـ profanity   */
/* -------------------------------------- */

const PROFANITY_TOXICITY_THRESHOLD = 0.4;
const INSULT_TOXICITY_THRESHOLD = 0.7;

/* -------------------------------------- */
/*       أنواع الكلمات المفتاحية          */
/* -------------------------------------- */

type FlagKeywordType = "refund" | "cancellation" | "priceNegotiation";

/* -------------------------------------- */
/*                Helpers                 */
/* -------------------------------------- */

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFKC").trim();
}

/**
 * تجميع كل الكلمات لجميع اللغات لنوع واحد (refund / cancellation / priceNegotiation)
 */
function getAllKeywordsForType(type: FlagKeywordType): string[] {
  const entry = (FLAG_KEYWORDS as any)[type];
  if (!entry) return [];

  const all: string[] = [];

  for (const value of Object.values(entry)) {
    if (!Array.isArray(value)) continue;

    for (const kw of value) {
      if (typeof kw === "string" && kw.trim()) {
        all.push(kw);
      }
    }
  }

  // إزالة التكرار + توحيد الـ lowercase
  const unique = Array.from(new Set(all.map((k) => k.toLowerCase())));
  return unique;
}

/**
 * فحص النص ضد جميع الكلمات في جميع اللغات لنوع واحد
 */
function checkKeywordsAnyLanguage(text: string, type: FlagKeywordType): number {
  const normalized = normalizeText(text);
  const allKeywords = getAllKeywordsForType(type);

  let hits = 0;

  for (const kw of allKeywords) {
    if (!kw) continue;
    if (normalized.includes(kw)) {
      hits++;
    }
  }

  return hits;
}

/* -------------------------------------- */
/*          الدالة الرئيسية للفلاقز       */
/* -------------------------------------- */

export function computeRuleBasedFlags(options: {
  messages: ChatMessageDoc[];
  conversationLanguage: SupportedLanguage; // نحتفظ به للانسجام مع بقية النظام حتى لو لم نستخدمه هنا الآن
  timeResult?: TimeRuleBasedResult;
}): {
  flags: RuleBasedFlagsResult;
  metricsPatch: RuleBasedMetricsPatch;
} {
  const {
    messages,
    conversationLanguage: _conversationLanguage,
    timeResult,
  } = options;

  let hasProfanity = false;
  let hasInsults = false;

  let profanityMessageCount = 0;
  let refundKeywordHits = 0;
  let cancellationThreatHits = 0;
  let priceNegotiationHits = 0;

  for (const msg of messages) {
    const text = msg.textClean ?? "";
    if (!text) continue;

    const toxicity = msg.toxicityScore ?? 0;

    // 1) Profanity / Insults
    const isProfane =
      msg.containsProfanity === true ||
      toxicity >= PROFANITY_TOXICITY_THRESHOLD;

    if (isProfane) {
      hasProfanity = true;
      profanityMessageCount++;
    }

    // insults = مستوى أعلى من السمّية، نركز غالباً على رسائل العميل
    if (
      msg.senderType === "customer" &&
      toxicity >= INSULT_TOXICITY_THRESHOLD
    ) {
      hasInsults = true;
    }

    // 2) كلمات مفتاحية للنوايا الحرجة (refund / cancellation / price)
    // نستخدم جميع اللغات بغضّ النظر عن language في الرسالة
    refundKeywordHits += checkKeywordsAnyLanguage(text, "refund");
    cancellationThreatHits += checkKeywordsAnyLanguage(text, "cancellation");
    priceNegotiationHits += checkKeywordsAnyLanguage(text, "priceNegotiation");
  }

  const hasRefundRequest = refundKeywordHits > 0;
  const hasCancellationThreat = cancellationThreatHits > 0;
  const hasPriceNegotiation = priceNegotiationHits > 0;

  const hasSlaViolation = timeResult?.slaBreached ?? false;

  const flags: RuleBasedFlagsResult = {
    hasInsults,
    hasProfanity,
    hasSlaViolation,
    hasRefundRequest,
    hasCancellationThreat,
    hasPriceNegotiation,
  };

  const metricsPatch: RuleBasedMetricsPatch = {
    profanityMessageCount:
      profanityMessageCount > 0 ? profanityMessageCount : undefined,
    refundKeywordHits: refundKeywordHits > 0 ? refundKeywordHits : undefined,
    cancellationThreatHits:
      cancellationThreatHits > 0 ? cancellationThreatHits : undefined,
    priceNegotiationHits:
      priceNegotiationHits > 0 ? priceNegotiationHits : undefined,
  };

  return { flags, metricsPatch };
}
