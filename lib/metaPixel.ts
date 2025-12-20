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
