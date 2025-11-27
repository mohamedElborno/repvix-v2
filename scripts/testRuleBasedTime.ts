// scripts/testRuleBasedTime.ts

import {
  computeTimeRuleBased,
  chooseAnalysisLanguage,
  chooseConversationLanguage,
  type ChatDoc,
  type ChatMessageDoc,
} from "@/lib/chat/ruleBasedTime";

// 1) سيناريو: محادثة واتساب manual سريعة، لا يوجد خرق SLA
async function testFastWhatsApp() {
  const chat: ChatDoc = {
    sourceType: "manual",
    sourceChannel: "whatsapp_paste",
    language: "ar",
  };

  const base = Date.now();

  const messages: ChatMessageDoc[] = [
    // العميل بدأ
    {
      senderType: "customer",
      internalTimestamp: base + 0,
      language: "ar",
    },
    // رد الموظف بعد 30 ثانية
    {
      senderType: "agent",
      internalTimestamp: base + 30_000,
      language: "ar",
    },
    // العميل رسالة ثانية
    {
      senderType: "customer",
      internalTimestamp: base + 60_000,
      language: "ar",
    },
    // رد الموظف بعد 45 ثانية
    {
      senderType: "agent",
      internalTimestamp: base + 105_000,
      language: "ar",
    },
  ];

  const customerMessageCount = messages.filter(
    (m) => m.senderType === "customer"
  ).length;

  const timeResult = computeTimeRuleBased(chat, messages, customerMessageCount);

  const analysisLang = chooseAnalysisLanguage({
    analysisLanguageFromUser: "ar",
    chatLanguage: chat.language,
    orgDefaultLanguage: "en",
  });

  const conversationLang = chooseConversationLanguage({
    chatLanguage: chat.language,
    analysisLanguage: analysisLang,
    messages,
  });

  console.log("=== testFastWhatsApp ===");
  console.log("analysisLang:", analysisLang);
  console.log("conversationLang:", conversationLang);
  console.log("timeResult:", {
    ...timeResult,
    firstResponseSec: timeResult.firstResponseMs
      ? timeResult.firstResponseMs / 1000
      : undefined,
    avgResponseSec: timeResult.avgAgentResponseMs
      ? timeResult.avgAgentResponseMs / 1000
      : undefined,
    maxResponseSec: timeResult.maxAgentResponseMs
      ? timeResult.maxAgentResponseMs / 1000
      : undefined,
  });
}

// 2) سيناريو: محادثة واتساب فيها تأخير قوي → لازم slaBreached = true
async function testSlowWhatsApp() {
  const chat: ChatDoc = {
    sourceType: "manual",
    sourceChannel: "whatsapp",
    language: "ar",
  };

  const base = Date.now();

  const messages: ChatMessageDoc[] = [
    // العميل
    {
      senderType: "customer",
      internalTimestamp: base + 0,
      language: "ar",
    },
    // رد الموظف بعد 20 دقيقة (أول رد متأخر بقوة)
    {
      senderType: "agent",
      internalTimestamp: base + 20 * 60_000,
      language: "ar",
    },
    // العميل يسأل مرة أخرى
    {
      senderType: "customer",
      internalTimestamp: base + 22 * 60_000,
      language: "ar",
    },
    // رد الموظف بعد 25 دقيقة أخرى
    {
      senderType: "agent",
      internalTimestamp: base + 47 * 60_000,
      language: "ar",
    },
  ];

  const customerMessageCount = messages.filter(
    (m) => m.senderType === "customer"
  ).length;

  const timeResult = computeTimeRuleBased(chat, messages, customerMessageCount);

  console.log("=== testSlowWhatsApp ===");
  console.log("timeResult:", {
    ...timeResult,
    firstResponseMin: timeResult.firstResponseMs
      ? timeResult.firstResponseMs / 1000 / 60
      : undefined,
    avgResponseMin: timeResult.avgAgentResponseMs
      ? timeResult.avgAgentResponseMs / 1000 / 60
      : undefined,
    maxResponseMin: timeResult.maxAgentResponseMs
      ? timeResult.maxAgentResponseMs / 1000 / 60
      : undefined,
  });
}

// 3) سيناريو: محادثة manual بدون sourceChannel (نفترض واتساب برضه)
// هنا نتأكد أن fallback يختار messaging وليس email_like
async function testManualNoChannel() {
  const chat: ChatDoc = {
    sourceType: "manual",
    sourceChannel: undefined,
    language: "en",
  };

  const base = Date.now();

  const messages: ChatMessageDoc[] = [
    {
      senderType: "customer",
      internalTimestamp: base,
      language: "en",
    },
    {
      senderType: "agent",
      internalTimestamp: base + 2 * 60_000,
      language: "en",
    },
  ];

  const customerMessageCount = 1;

  const timeResult = computeTimeRuleBased(chat, messages, customerMessageCount);

  console.log("=== testManualNoChannel ===");
  console.log("channelType:", timeResult.channelType);
  console.log("firstResponseSec:", timeResult.firstResponseMs! / 1000);
  console.log("slaBreached:", timeResult.slaBreached);
}

// تشغيل كل الاختبارات
async function main() {
  await testFastWhatsApp();
  console.log("\n");
  await testSlowWhatsApp();
  console.log("\n");
  await testManualNoChannel();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
