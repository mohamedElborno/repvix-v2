import { analyzeOutcomes } from "./outcomesAnalysis";
import { analyzeCustomerExperience } from "./customerExperienceAnalysis";
import { analyzeTiming } from "./SLA&Timing";
import { analyzeAgentPerformance } from "./agentPerformance";
import { analyzeIntentsAndCauses } from "./intents&Causes";
import { analyzeRisks } from "./risks";
import { extractEvidenceSamples } from "./evidenceSamples";

export function buildGlobalAnalysisOutputRuleBased(
  orgId: string,
  analyses: any[]
) {
  // NOTE: analyses يجب أن تحتوي على الحقل المساعد a._chatStartedAt (من جدول chats)

  const outcomes = analyzeOutcomes(analyses);
  const exp = analyzeCustomerExperience(analyses);
  const timing = analyzeTiming(analyses);
  const agents = analyzeAgentPerformance(analyses);
  const intents = analyzeIntentsAndCauses(analyses);
  const risks = analyzeRisks(analyses);
  const evidence = extractEvidenceSamples(analyses);

  const executiveSummary =
    `تم تحليل ${outcomes.totalChats} محادثة. معدل الحل ${Math.round(outcomes.resolvedRate * 100)}%، ` +
    `رضا العملاء متوسط: ${Math.round(exp.avgSatisfaction)}. ` +
    `معدل خروقات SLA ${Math.round(timing.slaBreachRate * 100)}%. ` +
    `أبرز النوايا: ${intents.topIntents.join(", ")}. ` +
    `الأسباب الجذرية الأساسية: ${intents.topRootCauses.join(", ")}.`;

  return {
    organizationId: orgId,
    analysisVersion: "v1",
    modelVersion: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),

    executiveSummary,
    outcomes: {
      resolvedRate: outcomes.resolvedRate,
      unresolvedRate: outcomes.unresolvedRate,
      escalatedRate: outcomes.escalatedRate,
      followupRate: outcomes.followupRate,
      keyFindings: [
        outcomes.resolvedRate < 0.6 && "معدل الإغلاق يحتاج تحسين.",
        outcomes.escalatedRate > 0.1 && "تصعيدات مرتفعة.",
        exp.avgVolatility > 60 && "تقلبات عاطفية مرتفعة لدى العملاء.",
      ].filter(Boolean) as string[],
    },

    customerExperience: {
      avgSatisfaction: exp.avgSatisfaction,
      sentimentTrend: exp.sentimentTrend,
      topPositivePatterns: [], // يمكن ملؤها من rules إضافية
      topNegativePatterns: [], // نفس الشيء
    },

    timingAndSla: {
      avgFirstResponseMs: timing.avgFirstResponseMs,
      avgAgentResponseMs: timing.avgAgentResponseMs,
      slaBreachRate: timing.slaBreachRate,
      keyTimingInsights: [], // إضافية حسب القواعد
    },

    agentPerformance: {
      teamScoreAvg: agents.teamScoreAvg,
      strengthsSummary: agents.strengthsSummary,
      weaknessesSummary: agents.weaknessesSummary,
      coachingAdvice: agents.coachingAdvice,
    },

    intentsAndCauses: {
      topIntents: intents.topIntents,
      topRootCauses: intents.topRootCauses,
      dominantObjections: intents.dominantObjections,
    },

    risks: {
      avgChurnRisk: risks.avgChurnRisk,
      avgEscalationRisk: risks.avgEscalationRisk,
      riskTags: risks.riskTags,
      churnRiskSummary: risks.churnRiskSummary,
      escalationRiskSummary: risks.escalationRiskSummary,
    },

    recommendations: {
      internalActions: [], // نضيفها بقواعد rule-based لاحقاً
      productActions: [],
    },

    evidenceSamples: evidence,
  };
}
