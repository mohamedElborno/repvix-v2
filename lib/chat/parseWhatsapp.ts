// src/lib/chat/parseWhatsapp.ts

import { RawMessageInput } from "./normalize";
import { findBestNameMatch } from "@/lib/helper/normalizeNameForMatch";

/** Who is the sender? */
export type SenderType = "customer" | "agent";

/** Options for the parser */
export interface WhatsappParserOptions {
  /** Employee names as they appear in WhatsApp to distinguish agent from customer */
  agentNames: string[]; // Example: ["MOHAMED🔻ELBORNO"]

  /** Optional: known customer names */
  customerNames?: string[];

  /** If the detection fails, we use this default type (default: "customer") */
  defaultSenderType?: SenderType;

  /**
   * If true: when we cannot match agent/customer by name,
   * and the sender name looks like a phone number, we mark it as "customer".
   * Default: true
   */
  phoneIsCustomerIfUnknown?: boolean;
}

/**
 * Convert a full WhatsApp conversation text (paste from export or copy) to RawMessageInput[]
 * This is the basic parser.
 */
export function parseWhatsappToRawMessages(
  input: string,
  options: WhatsappParserOptions
): RawMessageInput[] {
  const lines = input.split(/\r?\n/);

  const blocks: MessageBlock[] = [];
  let current: MessageBlock | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd(); // لا نحذف بداية السطر حتى لا نكسر الفورمات

    if (!line) {
      // سطر فارغ → نلحقه بالرسالة الحالية إن وجدت
      if (current) {
        current.textLines.push("");
      }
      continue;
    }

    const parsedHeader = parseLineHeader(line);

    if (parsedHeader) {
      // بداية رسالة جديدة
      if (current && current.textLines.length > 0) {
        blocks.push(current);
      }

      current = {
        dateTimeRaw: parsedHeader.dateTimeRaw,
        senderName: parsedHeader.senderName,
        firstLineText: parsedHeader.firstText,
        textLines: [parsedHeader.firstText],
      };
    } else {
      // سطر تابع للرسالة السابقة (multi-line)
      if (current) {
        current.textLines.push(line);
      } else {
        // في حال كان أول سطر لا يطابق أي فورمات معروف → نعتبره رسالة unknown
        current = {
          dateTimeRaw: "",
          senderName: "Unknown",
          firstLineText: line,
          textLines: [line],
        };
      }
    }
  }

  // إضافة آخر بلوك
  if (current && current.textLines.length > 0) {
    blocks.push(current);
  }

  // fallback roles for ambiguous cases
  const fallbackRoles = buildFallbackRoles(blocks, options);

  // تحويل الـ blocks إلى RawMessageInput[]
  const messages: RawMessageInput[] = [];

  blocks.forEach((block, idx) => {
    const raw = convertBlockToRaw(block, options, idx, fallbackRoles);
    if (raw) messages.push(raw);
  });

  return messages;
}

/* -------------------------------------------------------------------------- */
/*                               INTERNAL TYPES                               */
/* -------------------------------------------------------------------------- */

interface MessageBlock {
  dateTimeRaw: string;
  senderName: string;
  firstLineText: string;
  textLines: string[];
}

/**
 * The result of parsing a single line as a message start:
 * - The raw date/time
 * - The sender name
 * - The first line of the text
 */
interface ParsedHeader {
  dateTimeRaw: string;
  senderName: string;
  firstText: string;
}

/* -------------------------------------------------------------------------- */
/*                        HEADER / LINE PARSING HELPERS                       */
/* -------------------------------------------------------------------------- */

/**
 * Tries to parse the line as a message start:
 * Supports two main formats:
 * 1) [20/03/24 01:58 AM] Name: text
 * 2) 20/03/24, 01:58 - Name: text
 * Returns null if the line is not a new message start.
 */
function parseLineHeader(line: string): ParsedHeader | null {
  // 1) Bracket formats: [date time] Name: text
  const bracketMatch = line.match(/^\[(.+?)\]\s(.+?):\s?(.*)$/);
  if (bracketMatch) {
    const [, dateTimeRaw, senderName, firstText] = bracketMatch;
    return {
      dateTimeRaw: dateTimeRaw.trim(),
      senderName: senderName.trim(),
      firstText: firstText ?? "",
    };
  }

  // 2) Formats without brackets: 20/03/24, 01:58 - Name: text
  const dashMatch = line.match(/^(.+?),\s+(.+?)\s+[-–]\s(.+?):\s?(.*)$/);
  if (dashMatch) {
    const [, datePart, timePart, senderName, firstText] = dashMatch;
    const dateTimeRaw = `${datePart.trim()} ${timePart.trim()}`;
    return {
      dateTimeRaw,
      senderName: senderName.trim(),
      firstText: firstText ?? "",
    };
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*                             BLOCK → RAW MESSAGE                            */
/* -------------------------------------------------------------------------- */

function convertBlockToRaw(
  block: MessageBlock,
  options: WhatsappParserOptions,
  index: number,
  fallbackRoles: Record<string, SenderType>
): RawMessageInput | null {
  const fullText = block.textLines.join("\n").trim();

  if (!fullText) return null;

  // Determine the sender type (agent / customer)
  const senderType = determineSenderType(
    block.senderName,
    options.agentNames,
    index === 0 ? "customer" : "agent", // fallback: أول رسالة عميل، والباقي عامل في حال الغموض
    options.customerNames,
    options.phoneIsCustomerIfUnknown ?? true,
    fallbackRoles
  );

  // Try to convert the date/time to a timestamp
  const externalTimestamp = parseWhatsappTimestamp(block.dateTimeRaw);

  return {
    senderType,
    senderName: block.senderName,
    text: fullText,
    externalTimestamp: externalTimestamp ?? undefined,
    metadata: {
      dateTimeRaw: block.dateTimeRaw,
      source: "whatsapp_paste",
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                         SENDER TYPE / NAME DETECTION                       */
/* -------------------------------------------------------------------------- */

function determineSenderType(
  senderName: string,
  agentNames: string[],
  defaultSenderType: SenderType,
  customerNames?: string[],
  phoneIsCustomerIfUnknown: boolean = true,
  fallbackRoles: Record<string, SenderType> = {}
): SenderType {
  const normalizedSender = normalizeName(senderName);
  const normalizedAgents = agentNames.map(normalizeName);
  const normalizedCustomers = (customerNames || []).map(normalizeName);

  // 0) إن كان لدينا تعيين احتياطي سابق لهذا المرسل
  if (fallbackRoles[normalizedSender]) {
    return fallbackRoles[normalizedSender];
  }

  // 1) لو الاسم ضمن قائمة الـ agent (مطابقة مباشرة)
  if (normalizedAgents.includes(normalizedSender)) {
    return "agent";
  }

  // 1.5) محاولة مطابقة fuzzy للـ agent إذا لم تكن هناك مطابقة مباشرة
  if (agentNames.length > 0) {
    const bestAgentMatch = findBestNameMatch(senderName, agentNames);
    if (bestAgentMatch) {
      return "agent";
    }
  }

  // 2) لو الاسم ضمن قائمة الـ customerNames (لو تم تمريرها)
  if (customerNames && customerNames.length > 0) {
    if (normalizedCustomers.includes(normalizedSender)) {
      return "customer";
    }

    // محاولة مطابقة fuzzy للـ customer أيضاً
    const bestCustomerMatch = findBestNameMatch(senderName, customerNames);
    if (bestCustomerMatch) {
      return "customer";
    }
  }

  // 2.5) محاولة مطابقة أرقام الهاتف بشكل فضفاض (بدون كود دولة أو زيادات طفيفة)
  if (customerNames && customerNames.length > 0) {
    if (loosePhoneMatches(senderName, customerNames)) {
      return "customer";
    }
    if (loosePhoneMatches(senderName, agentNames)) {
      return "agent";
    }
  }

  // 3) لو لا يوجد أي داتا تحدد، والاسم يبدو رقم هاتف
  if (phoneIsCustomerIfUnknown && looksLikePhoneNumber(senderName)) {
    return "customer";
  }

  // 4) الافتراضي (غالبًا customer)
  return defaultSenderType;
}

/**
 * نبني تعيينات احتياطية للأدوار في حال غياب أسماء معروفة:
 * - لو وُجد رقم هاتف واحد فقط بين الأسماء → نعتبره العميل، وأول اسم آخر يصبح موظفًا.
 * - لو لا يوجد أرقام مميزة، وأول شخص بدأ المحادثة = عميل، وأول طرف مختلف بعده = موظف.
 * - لا نتدخل في الحالات التي حُسمت عبر قوائم العملاء/الموظفين.
 */
function buildFallbackRoles(
  blocks: MessageBlock[],
  options: WhatsappParserOptions
): Record<string, SenderType> {
  const roles: Record<string, SenderType> = {};
  if (!blocks.length) return roles;

  const normalizedAgents = options.agentNames.map(normalizeName);
  const normalizedCustomers = (options.customerNames || []).map(normalizeName);

  type SenderInfo = {
    original: string;
    normalized: string;
    isPhone: boolean;
    order: number;
  };

  const seen: Record<string, SenderInfo> = {};

  blocks.forEach((b, idx) => {
    const norm = normalizeName(b.senderName);
    if (!norm) return;
    if (!seen[norm]) {
      seen[norm] = {
        original: b.senderName,
        normalized: norm,
        isPhone: looksLikePhoneNumber(b.senderName),
        order: idx,
      };
    }
  });

  const senders = Object.values(seen);

  // استبعد أي اسم معروف مسبقًا في قوائم agent/customer
  const ambiguousSenders = senders.filter(
    (s) =>
      !normalizedAgents.includes(s.normalized) &&
      !normalizedCustomers.includes(s.normalized)
  );

  if (!ambiguousSenders.length) return roles;

  const phoneSenders = ambiguousSenders.filter((s) => s.isPhone);

  if (phoneSenders.length === 1) {
    const phoneSender = phoneSenders[0];
    roles[phoneSender.normalized] = "customer";

    const other = ambiguousSenders.find(
      (s) => s.normalized !== phoneSender.normalized
    );
    if (other) {
      roles[other.normalized] = "agent";
    }
    return roles;
  }

  // لو لم نجد هاتفًا واضحًا، نطبّق قاعدة "أول من بدأ = عميل، أول آخر = موظف"
  const sortedByOrder = [...ambiguousSenders].sort((a, b) => a.order - b.order);
  if (sortedByOrder.length) {
    roles[sortedByOrder[0].normalized] = "customer";
    const second = sortedByOrder.find((s) => s.normalized !== sortedByOrder[0].normalized);
    if (second) {
      roles[second.normalized] = "agent";
    }
  }

  return roles;
}

/**
 * تطابق فضفاض لأرقام الهواتف:
 * - نحذف كل ما عدا الأرقام
 * - نتجاهل 00 أو + في البداية
 * - نطابق آخر 8-10 أرقام لتجاوز اختلاف كود الدولة أو الصفر الأول
 */
function loosePhoneMatches(name: string, candidates: string[]): boolean {
  const normTarget = normalizeDigits(name);
  if (!normTarget) return false;

  const targetShort = trimCountryPrefix(normTarget);

  for (const c of candidates) {
    const normCandidate = normalizeDigits(c);
    if (!normCandidate) continue;
    const candidateShort = trimCountryPrefix(normCandidate);

    // تطابق كامل
    if (normCandidate === normTarget) return true;
    // تطابق آخر 8-10 أرقام
    if (endsWithSameDigits(targetShort, candidateShort, 8)) return true;
    if (endsWithSameDigits(targetShort, candidateShort, 10)) return true;
  }
  return false;
}

function normalizeDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 6 ? digits : "";
}

function trimCountryPrefix(digits: string): string {
  return digits.replace(/^0+/, "").replace(/^00/, "");
}

function endsWithSameDigits(a: string, b: string, len: number): boolean {
  if (a.length < len || b.length < len) return false;
  return a.slice(-len) === b.slice(-len);
}

/**
 * Normalize name:
 * - Remove emojis and non-letter/number symbols (replace with spaces)
 * - Trim + lowercase
 */
function normalizeName(name: string): string {
  return (
    name
      .normalize("NFKD")
      // نحتفظ فقط بالحروف والأرقام ونحوّل الباقي لمسافات
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .toLowerCase()
  );
}

/**
 * Very simple heuristic to detect phone-like names:
 * - Remove spaces / dashes / parentheses
 * - Extract digits
 * - If it has 7+ digits and يبدأ برقم أو "+" → نعتبره رقم هاتف
 */
function looksLikePhoneNumber(name: string): boolean {
  const stripped = name.replace(/[\s\-()+]/g, "");
  const digits = stripped.replace(/\D/g, "");

  if (digits.length < 7) return false;

  // يبدأ برقم أو + ثم أرقام
  return /^[+\d][\d]{6,}$/.test(stripped);
}

/* -------------------------------------------------------------------------- */
/*                      DATETIME PARSING (AR / EN SUPPORT)                    */
/* -------------------------------------------------------------------------- */

/**
 * Tries to convert dateTimeRaw (may contain Arabic numbers + AM/PM) to a timestamp.
 * If it fails, returns undefined.
 */
function parseWhatsappTimestamp(dateTimeRaw: string): number | undefined {
  if (!dateTimeRaw) return undefined;

  // 1) Convert Arabic numbers to Latin digits
  let s = convertArabicIndicDigitsToLatin(dateTimeRaw);

  // 2) Remove any weird characters (like RTL marks)
  s = s.replace(/[\u200e\u200f]/g, "").trim();

  // 3) Convert AM/PM to AM/PM approximately
  const isAM = /\bص\b|\bصباحًا?\b|\bصباحا?\b/gi.test(s);
  const isPM = /\bم\b|\bمساءً?\b|\bمساءا?\b/gi.test(s);
  s = s
    .replace(/\bص\b|\bصباحًا?\b|\bصباحا?\b/gi, "AM")
    .replace(/\bم\b|\bمساءً?\b|\bمساءا?\b/gi, "PM");

  // 4) Try to parse "dd/mm/yy hh:mm AM/PM" format manually
  // Pattern: "19/04/47 04:52 AM" or "19/04/47, 04:52 AM"
  const manualParseMatch = s.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*,?\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i
  );
  if (manualParseMatch) {
    const day = parseInt(manualParseMatch[1], 10);
    const month = parseInt(manualParseMatch[2], 10) - 1; // JavaScript months are 0-indexed
    let year = parseInt(manualParseMatch[3], 10);
    let hour = parseInt(manualParseMatch[4], 10);
    const minute = parseInt(manualParseMatch[5], 10);
    const ampm =
      manualParseMatch[6]?.toUpperCase() || (isAM ? "AM" : isPM ? "PM" : "");

    // Handle 2-digit years: if < 50, assume 20xx, else 19xx
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }

    // Handle AM/PM
    if (ampm === "PM" && hour < 12) {
      hour += 12;
    } else if (ampm === "AM" && hour === 12) {
      hour = 0;
    }

    // Create date object
    const date = new Date(year, month, day, hour, minute);
    if (!Number.isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  // 5) Fallback: try standard Date.parse() with various formats
  const candidates: string[] = [];

  candidates.push(s);

  // Sometimes the format is "dd/mm/yy hh:mm AM"
  // Try to replace Arabic commas if found
  candidates.push(s.replace(/،/g, ",").replace(/-/g, " ").replace(/\s+/g, " "));

  for (const c of candidates) {
    const ts = Date.parse(c);
    if (!Number.isNaN(ts)) return ts;
  }

  // If everything fails, return undefined
  return undefined;
}

/**
 * Convert Arabic/Hindi numbers to Latin digits
 * ٠١٢٣٤٥٦٧٨٩ → 0123456789
 */
function convertArabicIndicDigitsToLatin(input: string): string {
  const map: Record<string, string> = {
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
  };
  return input.replace(/[٠-٩]/g, (d) => map[d] ?? d);
}
