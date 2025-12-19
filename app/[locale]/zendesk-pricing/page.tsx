"use client";

import { SiteHeader } from "@/components/layout/site-header";
import Footer from "@/components/layout/Footer";
import { IconCheck } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

export default function ZendeskPricingPage() {
  const t = useTranslations("legal.zendeskPricing");

  return (
    <div className="antialiased bg-background min-h-screen flex flex-col">
      <div className="relative z-10 flex-1 flex flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-4xl px-4 py-10 space-y-8 mt-14">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("description")}
            </p>
          </div>

          {/* Pricing Card */}
          <div className="relative rounded-3xl p-[1.5px] bg-gradient-to-br from-purple-400/20 via-fuchsia-400/10 to-purple-600/20 dark:from-purple-400/30 dark:via-fuchsia-400/20 dark:to-purple-600/30">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card backdrop-blur-md shadow-sm">
              <div className="px-8 py-10">
                <div className="text-center space-y-6">
                  {/* Price */}
                  <div>
                    <div className="text-5xl font-bold tracking-tight">
                      {t("price")}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      {t("perMonth")}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-4 pt-6">
                    <div className="flex items-start gap-3">
                      <IconCheck
                        className="size-5 text-primary mt-0.5 flex-shrink-0"
                        stroke={2}
                      />
                      <div className="text-start">
                        <p className="text-sm font-medium">{t("feature1")}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <IconCheck
                        className="size-5 text-primary mt-0.5 flex-shrink-0"
                        stroke={2}
                      />
                      <div className="text-start">
                        <p className="text-sm font-medium">
                          {t("feature2Title")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("feature2Desc")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <IconCheck
                        className="size-5 text-primary mt-0.5 flex-shrink-0"
                        stroke={2}
                      />
                      <div className="text-start">
                        <p className="text-sm font-medium">
                          {t("feature3Title")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("feature3Desc")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <IconCheck
                        className="size-5 text-primary mt-0.5 flex-shrink-0"
                        stroke={2}
                      />
                      <div className="text-start">
                        <p className="text-sm font-medium">
                          {t("feature4Title")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("feature4Desc")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <IconCheck
                        className="size-5 text-primary mt-0.5 flex-shrink-0"
                        stroke={2}
                      />
                      <div className="text-start">
                        <p className="text-sm font-medium">{t("feature5")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground text-center">
              {t("note")}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
