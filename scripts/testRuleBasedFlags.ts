// scripts/testRuleBasedFlags.ts

import {
  computeRuleBasedFlags,
  type ChatMessageDoc,
} from "../lib/chat/ruleBasedFlags";
import type { TimeRuleBasedResult } from "../lib/chat/ruleBasedTime";

function logSection(title: string) {
  console.log("=".repeat(40));
  console.log(title);
  console.log("=".repeat(40));
}

// ------------------------------
// عيّنات رسائل للاختبار
// ------------------------------

function buildMessagesForRefundMixed(): ChatMessageDoc[] {
  return [
    {
      senderType: "customer",
      textClean: "ابغى refund لو ما ضبط يرجعوا فلوسي",
      language: "ar",
      containsProfanity: false,
      toxicityScore: 0.1,
    },
    {
      senderType: "agent",
      textClean: "نفهم طلبك، يمكننا مراجعة طلب الاسترداد خلال 24 ساعة.",
      language: "ar",
      containsProfanity: false,
      toxicityScore: 0.0,
    },
    {
      senderType: "customer",
      textClean: "i want my money back, this is too expensive",
      language: "en",
      containsProfanity: false,
      toxicityScore: 0.2,
    },
  ];
}

function buildMessagesForCancellation(): ChatMessageDoc[] {
  return [
    {
      senderType: "customer",
      textClean: "ابغى ألغي الاشتراك وأوقف السحب الشهري نهائياً",
      language: "ar",
      containsProfanity: false,
      toxicityScore: 0.2,
    },
    {
      senderType: "agent",
      textClean:
        "نقدر نساعدك في إلغاء التجديد التلقائي وربما تقديم خصم بدلاً من الإلغاء.",
      language: "ar",
      containsProfanity: false,
      toxicityScore: 0.1,
    },
    {
      senderType: "customer",
      textClean:
        "please cancel my subscription, I don't want auto renewal anymore",
      language: "en",
      containsProfanity: false,
      toxicityScore: 0.2,
    },
  ];
}

function buildMessagesForPriceNegotiation(): ChatMessageDoc[] {
  return [
    {
      senderType: "customer",
      textClean: "السعر غالي جداً، ما في خصم أو عرض خاص؟",
      language: "ar",
      containsProfanity: false,
      toxicityScore: 0.1,
    },
    {
      senderType: "customer",
      textClean: "can i get a discount, the price is too high for me",
      language: "en",
      containsProfanity: false,
      toxicityScore: 0.1,
    },
    {
      senderType: "agent",
      textClean: "نقدر نقدم لك خصم بسيط لو التزمت بخطة سنوية.",
      language: "ar",
      containsProfanity: false,
      toxicityScore: 0.0,
    },
  ];
}

function buildMessagesForProfanityAndInsults(): ChatMessageDoc[] {
  return [
    {
      senderType: "customer",
      textClean: "الخدمة سيئة جداً وكلامكم فاضي، هذا نصب",
      language: "ar",
      containsProfanity: true, // من لفلتر profanity
      toxicityScore: 0.8, // عالي → insult
    },
    {
      senderType: "agent",
      textClean: "نعتذر عن التجربة السيئة، دعنا نحل المشكلة بهدوء.",
      language: "ar",
      containsProfanity: false,
      toxicityScore: 0.1,
    },
  ];
}

// ------------------------------
// اختبارات مع SLA
// ------------------------------

const timeOk: TimeRuleBasedResult = {
  channelType: "messaging",
  firstResponseMs: 30_000,
  avgAgentResponseMs: 40_000,
  maxAgentResponseMs: 45_000,
  softViolationCount: 0,
  hardViolationCount: 0,
  slaBreached: false,
};

const timeBreached: TimeRuleBasedResult = {
  channelType: "messaging",
  firstResponseMs: 1_200_000,
  avgAgentResponseMs: 1_350_000,
  maxAgentResponseMs: 1_500_000,
  softViolationCount: 3,
  hardViolationCount: 1,
  slaBreached: true,
};

// ------------------------------
// دوال الاختبار
// ------------------------------

function testRefundMixed() {
  logSection("testRefundMixed (mixed languages refund signals)");

  const messages = buildMessagesForRefundMixed();
  const { flags, metricsPatch } = computeRuleBasedFlags({
    messages,
    conversationLanguage: "ar", // فقط للانسجام، لا يؤثر في الـ keywords الآن
    timeResult: timeOk,
  });

  console.log("flags:", flags);
  console.log("metricsPatch:", metricsPatch);
  console.log();
}

function testCancellation() {
  logSection("testCancellation (cancellation / auto-renew)");

  const messages = buildMessagesForCancellation();
  const { flags, metricsPatch } = computeRuleBasedFlags({
    messages,
    conversationLanguage: "ar",
    timeResult: timeBreached,
  });

  console.log("flags:", flags);
  console.log("metricsPatch:", metricsPatch);
  console.log();
}

function testPriceNegotiation() {
  logSection("testPriceNegotiation (price too high / discount)");

  const messages = buildMessagesForPriceNegotiation();
  const { flags, metricsPatch } = computeRuleBasedFlags({
    messages,
    conversationLanguage: "ar",
    timeResult: timeOk,
  });

  console.log("flags:", flags);
  console.log("metricsPatch:", metricsPatch);
  console.log();
}

function testProfanityAndInsults() {
  logSection("testProfanityAndInsults (toxicity & insults)");

  const messages = buildMessagesForProfanityAndInsults();
  const { flags, metricsPatch } = computeRuleBasedFlags({
    messages,
    conversationLanguage: "ar",
    timeResult: timeOk,
  });

  console.log("flags:", flags);
  console.log("metricsPatch:", metricsPatch);
  console.log();
}

// ------------------------------
// Main
// ------------------------------

async function main() {
  testRefundMixed();
  testCancellation();
  testPriceNegotiation();
  testProfanityAndInsults();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
