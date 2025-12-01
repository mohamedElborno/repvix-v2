import { wavg } from "./utilities";
import { weightByConfidence } from "./utilities";

export const DIMENSIONS = [
  "agentClarityScore",
  "agentEmpathyScore",
  "agentOwnershipScore",
  "agentProactivityScore",
  "agentProfessionalismScore",
] as const;

const LOW_DIM = 55;
const HIGH_DIM = 75;

export function analyzeAgentPerformance(analyses: any[]) {
  const weights = analyses.map((a) => weightByConfidence(a.outcomeConfidence));

  const teamScoreAvg = wavg(
    analyses.map((a) => a.agentOverallScore ?? 0),
    weights
  );

  // Dimension means
  const dimMeans = DIMENSIONS.map((dim) => {
    const vals: number[] = [];
    const ww: number[] = [];
    analyses.forEach((a, i) => {
      const v = a[dim];
      if (typeof v === "number") {
        vals.push(v);
        ww.push(weights[i]);
      }
    });
    const mean = vals.length ? wavg(vals, ww) : 0;
    return { dim, mean };
  });

  const strengths = dimMeans
    .filter((d) => d.mean >= HIGH_DIM)
    .map((d) => d.dim);
  const weaknesses = dimMeans.filter((d) => d.mean < LOW_DIM).map((d) => d.dim);

  return {
    teamScoreAvg,
    strengthsSummary: strengths,
    weaknessesSummary: weaknesses,
    coachingAdvice: weaknesses.slice(0, 3),
  };
}
