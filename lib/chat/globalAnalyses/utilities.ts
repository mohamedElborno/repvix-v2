// ---------------------------
// UTILITIES
// ---------------------------
export const WEIGHT_DEFAULT = 1.0;

export function weightByConfidence(conf?: number): number {
  if (conf == null) return WEIGHT_DEFAULT;
  const c = Math.max(0, Math.min(100, conf));
  return Math.max(0.25, c / 100);
}

export function wavg(values: number[], weights: number[]): number {
  if (values.length === 0) return 0;
  let num = 0,
    den = 0;
  for (let i = 0; i < values.length; i++) {
    const w = weights[i] ?? 1;
    num += values[i] * w;
    den += w;
  }
  return den === 0 ? 0 : num / den;
}

export function topN<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

export function countMap<T extends string>(
  items: T[],
  weight: (idx: number) => number
): Record<string, number> {
  const map: Record<string, number> = {};
  items.forEach((item, i) => {
    map[item] = (map[item] ?? 0) + weight(i);
  });
  return map;
}

export function sortCountMap(map: Record<string, number>): [string, number][] {
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}
