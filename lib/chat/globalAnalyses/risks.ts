import { weightByConfidence } from "./utilities";
import { wavg } from "./utilities";

const HIGH_RISK = 80;

export function analyzeRisks(analyses: any[]) {
  const weights = analyses.map((a) => weightByConfidence(a.outcomeConfidence));

  const churn = analyses
    .map((a) => a.churnRiskScore)
    .filter((x): x is number => x != null);

  const escal = analyses
    .map((a) => a.escalationRiskScore)
    .filter((x): x is number => x != null);

  const avgChurn = churn.length ? wavg(churn, weights) : 0;
  const avgEscalation = escal.length ? wavg(escal, weights) : 0;

  const riskTags: string[] = [];
  if (avgChurn >= HIGH_RISK) riskTags.push("churn_high");
  if (avgEscalation >= HIGH_RISK) riskTags.push("escalation_high");

  // refund / cancellation threats
  const refundRate = wavg(
    analyses.map((a) => ((a.refundKeywordHits ?? 0) > 0 ? 1 : 0)),
    weights
  );
  const cancelThreatRate = wavg(
    analyses.map((a) => ((a.cancellationThreatHits ?? 0) > 0 ? 1 : 0)),
    weights
  );

  if (refundRate >= 0.15) riskTags.push("refund_pressure");
  if (cancelThreatRate >= 0.1) riskTags.push("cancellation_threats");

  return {
    avgChurnRisk: avgChurn,
    avgEscalationRisk: avgEscalation,
    riskTags,
    churnRiskSummary:
      avgChurn >= HIGH_RISK
        ? "مخاطر فقدان العملاء مرتفعة."
        : "مستوى المخاطر طبيعي.",
    escalationRiskSummary:
      avgEscalation >= HIGH_RISK
        ? "مخاطر التصعيد مرتفعة."
        : "مستوى التصعيد طبيعي.",
  };
}
