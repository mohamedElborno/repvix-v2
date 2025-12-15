import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

// Route-level metadata for the conversation insights landing page,
// localized per-locale similar to the root layout metadata.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  const title = t("title");
  const description = t("description");

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title,
      description,
      images: [
        {
          url: "/conversation-insights.png",
          width: 1200,
          height: 630,
          alt: "Anonymized chat highlighting churn trigger",
        },
      ],
    },
  };
}
