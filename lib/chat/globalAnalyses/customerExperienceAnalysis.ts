import { weightByConfidence } from "./utilities";
import { wavg } from "./utilities";

export function analyzeCustomerExperience(analyses: any[]) {
  const weights = analyses.map((a) => weightByConfidence(a.outcomeConfidence));

  const sStart = analyses
    .map((a) => a.sentimentStartScore)
    .filter((x): x is number => x != null);

  const sEnd = analyses
    .map((a) => a.sentimentEndScore)
    .filter((x): x is number => x != null);

  const vol = analyses
    .map((a) => a.sentimentVolatilityScore)
    .filter((x): x is number => x != null);

  const csat = analyses
    .map((a) => a.customerSatisfactionScore)
    .filter((x): x is number => x != null);

  const avgStart = sStart.length ? wavg(sStart, weights) : 0;
  const avgEnd = sEnd.length ? wavg(sEnd, weights) : 0;
  const avgVol = vol.length ? wavg(vol, weights) : 0;
  const avgCSAT = csat.length ? wavg(csat, weights) : 0;

  const delta = avgEnd - avgStart;
  const sentimentTrend = delta >= 3 ? "تحسن" : delta <= -3 ? "تراجع" : "ثابت";

  return {
    avgSatisfaction: avgCSAT,
    avgSentimentStart: avgStart,
    avgSentimentEnd: avgEnd,
    avgVolatility: avgVol,
    sentimentTrend,
  };
}
