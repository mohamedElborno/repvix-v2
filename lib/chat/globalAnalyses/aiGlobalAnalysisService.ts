import { getOpenAiClient } from "@/lib/openai/client";
import { getGlobalAnalysisSystemPrompt } from "@/lib/ai/prompts/globalAnalysisPrompt";
import type { AiSupportedLanguage } from "@/lib/ai/aiTypes";

const MODEL = process.env.GLOBAL_ANALYSIS_MODEL || "gpt-5-mini-2025-08-07";

export async function runGlobalAnalysisAI(
  ruleBasedResult: any,
  language: AiSupportedLanguage
) {
  const client = getOpenAiClient();

  const systemPrompt = getGlobalAnalysisSystemPrompt(language);

  const userPrompt = `
هذه هي نتائج التحليل القاعدي (Rule-Based) لجميع محادثات المؤسسة.
استخدم هذه البيانات فقط، ولا تضف أي حسابات جديدة:

${JSON.stringify(ruleBasedResult, null, 2)}

أنتج المخرجات بالنمط التالي بالضبط:

{
  "executiveSummary": "",
  "customerExperience": {
    "topPositivePatterns": [],
    "topNegativePatterns": []
  },
  "timingAndSla": {
    "keyTimingInsights": []
  },
  "agentPerformance": {
    "coachingAdvice": []
  },
  "outcomesSummary": [],
  "recommendations": {
    "internalActions": [],
    "productActions": []
  },
  "risks": {
    "churnRiskSummary": "",
    "escalationRiskSummary": ""
  }
}
`;

  const response = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return JSON.parse(response.choices[0].message?.content || "{}");
}
