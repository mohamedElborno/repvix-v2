// src/lib/metaPixel.ts
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

export const pageview = () => {
  if (!META_PIXEL_ID) return;
  if (typeof window === "undefined") return;
  if (!window.fbq) return;
  window.fbq("track", "PageView");
};

export const track = (
  event: string,
  params?: Record<string, any>,
  options?: Record<string, any>
) => {
  if (!META_PIXEL_ID) return;
  if (typeof window === "undefined") return;
  if (!window.fbq) return;

  // fbq('track', eventName, params, options)
  window.fbq("track", event, params ?? {}, options ?? {});
};

export const trackCustom = (
  event: string,
  params?: Record<string, any>,
  options?: Record<string, any>
) => {
  if (!META_PIXEL_ID) return;
  if (typeof window === "undefined") return;
  if (!window.fbq) return;

  // fbq('trackCustom', eventName, params, options)
  window.fbq("trackCustom", event, params ?? {}, options ?? {});
};

function waitForFbq(timeoutMs = 3000) {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.fbq) return Promise.resolve(true);

  return new Promise<boolean>((resolve) => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (window.fbq) {
        clearInterval(timer);
        resolve(true);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        resolve(false);
      }
    }, 50);
  });
}

export async function trackSafe(
  event: string,
  params?: Record<string, any>,
  options?: Record<string, any>
) {
  if (typeof window === "undefined") return;

  const ok = await waitForFbq(3000);
  if (!ok) return;

  window.fbq!("track", event, params ?? {}, options ?? {});
}
