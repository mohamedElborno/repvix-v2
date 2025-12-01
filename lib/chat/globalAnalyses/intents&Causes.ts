import { weightByConfidence } from "./utilities";
import { sortCountMap } from "./utilities";

export function analyzeIntentsAndCauses(analyses: any[]) {
  const weights = analyses.map((a) => weightByConfidence(a.outcomeConfidence));

  // Intent counts
  const intentCounts: Record<string, number> = {};
  analyses.forEach((a, i) => {
    const w = weights[i];
    if (a.primaryIntent)
      intentCounts[a.primaryIntent] = (intentCounts[a.primaryIntent] ?? 0) + w;

    (a.secondaryIntents ?? []).forEach((s: string) => {
      intentCounts[s] = (intentCounts[s] ?? 0) + 0.5 * w;
    });
  });

  const topIntents = sortCountMap(intentCounts)
    .map((e) => e[0])
    .slice(0, 3);

  // Root causes
  const causeCounts: Record<string, number> = {};
  analyses.forEach((a, i) => {
    const w = weights[i];
    if (a.primaryRootCauseCategory) {
      causeCounts[a.primaryRootCauseCategory] =
        (causeCounts[a.primaryRootCauseCategory] ?? 0) + w;
    }
    (a.secondaryRootCauses ?? []).forEach((rc: any) => {
      const key = rc.category;
      const weight = rc.weight ?? 0.5;
      causeCounts[key] = (causeCounts[key] ?? 0) + weight * w;
    });
  });

  const topRootCauses = sortCountMap(causeCounts)
    .map((e) => e[0])
    .slice(0, 3);

  // Objections
  const objScore: Record<string, { sum: number; w: number }> = {};
  analyses.forEach((a, i) => {
    (a.mainObjections ?? []).forEach((o: any) => {
      const prev = objScore[o.type] ?? { sum: 0, w: 0 };
      const w = weights[i];
      prev.sum += (o.strength ?? 50) * w;
      prev.w += w;
      objScore[o.type] = prev;
    });
  });

  const dominantObjections = Object.entries(objScore)
    .map(([type, s]) => ({ type, mean: s.w ? s.sum / s.w : 0 }))
    .sort((a, b) => b.mean - a.mean)
    .slice(0, 3)
    .map((o) => o.type);

  return {
    topIntents,
    topRootCauses,
    dominantObjections,
  };
}
