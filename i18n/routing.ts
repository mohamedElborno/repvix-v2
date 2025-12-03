import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ar", "tr", "fr", "es", "hi", "ja"],
  defaultLocale: "en",
  localeDetection: false, // تعطيل الاكتشاف التلقائي للغة
});
