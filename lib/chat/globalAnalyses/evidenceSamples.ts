export function extractEvidenceSamples(analyses: any[], limit = 6) {
  const allQuotes: { type: string; quote: string }[] = [];

  analyses.forEach((a) => {
    (a.keyQuotes ?? []).forEach((q: any) => {
      allQuotes.push({
        type: q.purpose,
        quote: q.text.slice(0, 180), // قص للمثالية
      });
    });
  });

  // اختر فقط الأفضل (بالتكرار)
  const grouped: Record<string, string[]> = {};
  allQuotes.forEach((q) => {
    grouped[q.type] = grouped[q.type] ?? [];
    grouped[q.type].push(q.quote);
  });

  const final: { type: string; quote: string }[] = [];

  for (const type of Object.keys(grouped)) {
    grouped[type].slice(0, 2).forEach((q) => {
      final.push({ type, quote: q });
    });
  }

  return final.slice(0, limit);
}
