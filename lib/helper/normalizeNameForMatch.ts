// نفس فكرة normalizeName في parseWhatsapp.ts لكن مستقلة هنا
export function normalizeNameForMatch(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // حذف
        dp[i][j - 1] + 1, // إضافة
        dp[i - 1][j - 1] + cost // استبدال
      );
    }
  }

  return dp[m][n];
}

// Returns the best name or null if there is nothing acceptable
export function findBestNameMatch(
  input: string,
  candidates: string[]
): string | null {
  const normInput = normalizeNameForMatch(input);
  if (!normInput) return null;

  let bestName: string | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const normCandidate = normalizeNameForMatch(candidate);
    if (!normCandidate) continue;

    let score = 0;

    // Full match after normalization
    if (normCandidate === normInput) {
      score = 1;
    } else if (
      normCandidate.includes(normInput) ||
      normInput.includes(normCandidate)
    ) {
      // Contains/is contained (e.g. "mohamed elborno" vs "mohamed")
      score = 0.9;
    } else {
      // Levenshtein similarity
      const dist = levenshtein(normInput, normCandidate);
      const maxLen = Math.max(normInput.length, normCandidate.length);
      const sim = maxLen > 0 ? 1 - dist / maxLen : 0;
      score = sim;
    }

    if (score > bestScore) {
      bestScore = score;
      bestName = candidate;
    }
  }

  // Acceptance threshold (0.6 for example) — can be adjusted later based on experimentation
  if (bestScore < 0.6) {
    return null;
  }

  return bestName;
}
