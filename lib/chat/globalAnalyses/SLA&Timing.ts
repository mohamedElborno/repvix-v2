import { weightByConfidence } from "./utilities";
import { wavg } from "./utilities";
import { WEIGHT_DEFAULT } from "./utilities";

export function analyzeTiming(analyses: any[]) {
  const weights = analyses.map(
    (a) => weightByConfidence(a.outcomeConfidence) || WEIGHT_DEFAULT
  );

  const fr = analyses
    .map((a) => a.timeMetrics?.firstResponseMs)
    .filter((x): x is number => x != null);

  const ar = analyses
    .map((a) => a.timeMetrics?.avgAgentResponseMs)
    .filter((x): x is number => x != null);

  const breach = analyses.map((a) => (a.slaBreached === true ? 1 : 0));

  const avgFirst = fr.length ? wavg(fr, weights) : 0;
  const avgAgent = ar.length ? wavg(ar, weights) : 0;
  const slaRate = wavg(breach, weights);

  // Peak breach hours
  const hourBreach: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourBreach[h] = 0;

  analyses.forEach((a, i) => {
    if (!a.slaBreached) return;
    if (!a._chatStartedAt) return;
    const hour = new Date(a._chatStartedAt).getHours();
    hourBreach[hour] += weights[i];
  });

  const peakBreachHours = Object.entries(hourBreach)
    .map(([h, v]) => ({ h: Number(h), v }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
    .map((e) => e.h);

  // Workload (morning / evening)
  const hourLoad: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourLoad[h] = 0;

  analyses.forEach((a, i) => {
    if (!a._chatStartedAt) return;
    const hour = new Date(a._chatStartedAt).getHours();
    hourLoad[hour] += weights[i];
  });

  const morning = [8, 9, 10, 11, 12, 13].reduce((s, h) => s + hourLoad[h], 0);
  const evening = [16, 17, 18, 19, 20, 21].reduce((s, h) => s + hourLoad[h], 0);

  const workloadPattern =
    morning > evening * 1.2
      ? "morning_peak"
      : evening > morning * 1.2
        ? "evening_peak"
        : "balanced";

  return {
    avgFirstResponseMs: avgFirst,
    avgAgentResponseMs: avgAgent,
    slaBreachRate: slaRate,
    peakBreachHours,
    workloadPattern,
  };
}
