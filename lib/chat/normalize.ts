// src/lib/chat/normalizeMessages.ts

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type LanguageCode =
  | "ar" // Arabic
  | "en" // English
  | "tr" // Turkish
  | "fr" // French
  | "es" // Spanish
  | "hi" // Hindi
  | "ja" // Japanese
  | "unknown";

export type SenderType = "customer" | "agent";

/**
 * The raw message shape that comes from any source (WhatsApp, Telegram, manual input...)
 * This is not directly written to the database, but goes through normalizeMessages first.
 */
export interface RawMessageInput {
  senderType: SenderType;
  senderName?: string;
  text: string;
  externalMessageId?: string;
  externalTimestamp?: number;
  metadata?: Record<string, any>;
}

/**
 * The normalized message shape that will be used when creating chat + chatMessages in Convex.
 */
export interface NormalizedMessage {
  senderType: SenderType;
  senderName?: string;

  /** The raw text as it came from the source */
  textRaw: string;

  /** The clean text ready to be sent to GPT */
  textClean: string;

  /** The expected language */
  language: LanguageCode;

  /** If the source ID is specific to the message */
  externalMessageId?: string;

  /** timestamp from the source if it exists */
  externalTimestamp?: number;

  /** timestamp internal to ensure order */
  internalTimestamp: number;

  /** Any additional fields specific to the integration */
  metadata?: Record<string, any>;
}

/**
 * Settings for controlling normalization
 */
export interface NormalizationOptions {
  /**
   * Do we use simple language detection?
   * - true (default): Try to detect language from text + defaultLanguage
   * - false: Use defaultLanguage without detection
   */
  detectLanguage?: boolean;

  /**
   * The default language when detection fails
   * Important especially for Latin languages (en / fr / es) because they are similar.
   */
  defaultLanguage?: LanguageCode;

  /**
   * Profanity dictionary for each language
   * Will be replaced with a mask (****) instead of full deletion.
   */
  profanityDictionary?: Partial<Record<LanguageCode, string[]>>;

  /**
   * Function to generate the current time (for testing or customization)
   * Default: () => Date.now()
   */
  now?: () => number;
}

/* -------------------------------------------------------------------------- */
/* PUBLIC API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Normalize a raw messages array into normalized messages for storage and analysis.
 */
export function normalizeMessages(
  rawMessages: RawMessageInput[],
  options?: NormalizationOptions
): NormalizedMessage[] {
  const baseNow = options?.now?.() ?? Date.now();

  return rawMessages.map((raw, index) =>
    normalizeSingleMessage(raw, options, index, baseNow)
  );
}

/* -------------------------------------------------------------------------- */
/* INTERNAL HELPERS                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Normalize a single raw message.
 */
function normalizeSingleMessage(
  raw: RawMessageInput,
  options?: NormalizationOptions,
  index: number = 0,
  baseNow?: number
): NormalizedMessage {
  const now = options?.now?.() ?? baseNow ?? Date.now();

  const textRaw = raw.text ?? "";
  const normalizedWhitespace = basicNormalizeWhitespace(textRaw);

  const defaultLang: LanguageCode = options?.defaultLanguage ?? "en";

  const language: LanguageCode =
    options?.detectLanguage === false
      ? defaultLang
      : detectLanguage(normalizedWhitespace || textRaw, defaultLang);

  const textClean = sanitizeTextForLLM(
    normalizedWhitespace,
    language,
    options?.profanityDictionary
  );

  const internalTimestamp =
    typeof raw.externalTimestamp === "number"
      ? raw.externalTimestamp
      : now + index;

  return {
    senderType: raw.senderType,
    senderName: raw.senderName || undefined,
    textRaw,
    textClean,
    language,
    externalMessageId: raw.externalMessageId,
    externalTimestamp:
      typeof raw.externalTimestamp === "number"
        ? raw.externalTimestamp
        : undefined,
    internalTimestamp,
    metadata: raw.metadata || undefined,
  };
}

/**
 * Clean whitespace: convert multiple spaces to one + trim.
 */
function basicNormalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Simple language detection based on Unicode and some special characters.
 * Does not depend on a heavy library.
 */
function detectLanguage(
  text: string,
  defaultLanguage: LanguageCode = "en"
): LanguageCode {
  const trimmed = text.trim();
  if (!trimmed) return defaultLanguage;

  // Arabic characters
  if (/[\u0600-\u06FF]/.test(trimmed)) return "ar";

  // Hindi characters (Devanagari)
  if (/[\u0900-\u097F]/.test(trimmed)) return "hi";

  // Turkish characters
  if (/[çğıöşüÇĞİÖŞÜ]/.test(trimmed)) return "tr";

  // Japanese characters
  if (/[\u3000-\u303F]/.test(trimmed)) return "ja";

  // No strong indicators → use the default language
  if (["ar", "en", "tr", "fr", "es", "hi", "ja"].includes(defaultLanguage)) {
    return defaultLanguage;
  }

  return "en";
}

/**
 * Sanitize text to be safe and appropriate for LLM models:
 * - Normalize whitespace
 * - Hide unacceptable words if found in the dictionary
 */
function sanitizeTextForLLM(
  text: string,
  language: LanguageCode,
  profanityDictionary?: Partial<Record<LanguageCode, string[]>>
): string {
  let result = basicNormalizeWhitespace(text);

  if (!result) return result;

  if (profanityDictionary && language !== "unknown") {
    const terms = profanityDictionary[language];
    if (terms && terms.length > 0) {
      result = cleanProfanityWithMask(result, terms);
    }
  }

  return result;
}

/**
 * Replace unacceptable words with a mask while keeping the word length
 * and keep the first and last letter if possible (to preserve some context without truncation).
 */
function cleanProfanityWithMask(text: string, badWords: string[]): string {
  let cleaned = text;

  for (const badWord of badWords) {
    if (!badWord) continue;

    // We use a simple RegExp with ignore case for Latin letters.
    // For Arabic there is no case by default, and the g for replacement.
    const pattern = new RegExp(escapeRegExp(badWord), "gi");

    cleaned = cleaned.replace(pattern, (match) => maskWord(match));
  }

  return cleaned;
}

/**
 * Mask a word:
 * - If length <= 2 → all stars
 * - Otherwise: first letter + stars + last letter
 */
function maskWord(word: string): string {
  const len = word.length;
  if (len <= 2) return "*".repeat(len);
  return word[0] + "*".repeat(len - 2) + word[len - 1];
}

/**
 * Escape text to be used safely inside RegExp.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
