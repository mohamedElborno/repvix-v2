export function trackLpEvent(
  name: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  const w = window as any;

  // Google Tag Manager (dataLayer)
  if (Array.isArray(w.dataLayer)) {
    w.dataLayer.push({ event: name, ...(params || {}) });
  }

  // Google Analytics 4 (gtag)
  if (typeof w.gtag === "function") {
    w.gtag("event", name, params || {});
  }
  // Microsoft Clarity
  if (w.clarity) {
    if (typeof w.clarity === "function") {
      w.clarity("event", name, params || {});
    } else if (Array.isArray(w.clarity.q)) {
      w.clarity.q.push(["event", name, params || {}]);
    }
  }
}
