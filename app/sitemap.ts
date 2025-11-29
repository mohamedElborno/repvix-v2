import { MetadataRoute } from "next";

const baseUrl =
  process.env.VERCEL_ENV === "production"
    ? "https://repvix.com"
    : "http://localhost:3000";

const locales = ["en", "ar", "fr", "tr", "es", "hi"];

export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date().toISOString();

  return locales.map((locale) => ({
    url: `${baseUrl}/${locale}`,
    lastModified: currentDate,
    changeFrequency: "weekly",
    priority: locale === "en" || locale === "ar" ? 1.0 : 0.9,
    alternates: {
      languages: Object.fromEntries(
        locales.map((lang) => [lang, `${baseUrl}/${lang}`])
      ),
    },
  }));
}
