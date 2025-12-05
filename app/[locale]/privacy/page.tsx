"use client";

import { SiteHeader } from "@/components/layout/site-header";
import Footer from "@/components/layout/Footer";
import { useTranslations } from "next-intl";

export default function PrivacyPage() {
  const t = useTranslations("legal.privacy");

  return (
    <div className="antialiased bg-background min-h-screen flex flex-col">
      <div className="relative z-10 flex-1 flex flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-4xl px-4 py-10 space-y-6 mt-14">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("intro")}</p>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t("dataWeCollectTitle")}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {t("dataWeCollect")}
            </p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t("howWeUseDataTitle")}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {t("howWeUseData")}
            </p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t("dataRetentionTitle")}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {t("dataRetention")}
            </p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t("yourRightsTitle")}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {t("yourRights")}
            </p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t("contactTitle")}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {t("contact")}
            </p>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
