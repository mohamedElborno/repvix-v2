"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

export default function IntegrationsMarquee() {
  const locale = useLocale();
  const isRTL = locale === "ar";
  const t = useTranslations("home.integrationsMarquee");

  const integrations: Array<{
    name: string;
    logo: string;
    badgeKey?: "new" | "comingSoon";
  }> = [
    { name: "Zendesk", logo: "/ZendeskLight.svg", badgeKey: "new" },
    { name: "Intercom", logo: "/Intercom.svg", badgeKey: "comingSoon" },
  ];

  // Repeat the same 2 integrations so the track is always wider than the viewport (prevents blank space / "ending").
  const marqueeItems = Array.from({ length: 10 }).flatMap((_, i) =>
    integrations.map((x) => ({ ...x, _k: `${x.name}-${i}` }))
  );

  return (
    <div className="w-full py-6 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 px-4 sm:px-6">
        {/* Static Text - Left (Right for RTL) */}
        <div className={`shrink-0 ${isRTL ? "sm:order-2" : "sm:order-1"}`}>
          <span
            className={`text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wide whitespace-nowrap ${isRTL ? "sm:text-right" : ""}`}
          >
            {t("label")}
          </span>
        </div>

        {/* Scrolling Logos - Right (Left for RTL) */}
        <div
          className={`relative flex-1 overflow-hidden w-full min-w-0 ${isRTL ? "sm:order-1" : "sm:order-2"}`}
        >
          {/* Fade Effects */}
          {isRTL ? (
            <>
              <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-24 bg-linear-to-l from-background to-transparent z-10 pointer-events-none" />
              <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-24 bg-linear-to-r from-background to-transparent z-10 pointer-events-none" />
            </>
          ) : (
            <>
              <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-24 bg-linear-to-r from-background to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-24 bg-linear-to-l from-background to-transparent z-10 pointer-events-none" />
            </>
          )}

          {/* Proper infinite marquee: one moving track that contains two identical groups */}
          <div
            className={`marquee-track ${isRTL ? "animate-marquee-reverse" : "animate-marquee"}`}
            style={{ ["--marquee-duration" as any]: "130s" }}
            dir="ltr"
          >
            <div className="marquee-group" aria-hidden={false}>
              {marqueeItems.map((integration) => (
                <div key={`a-${integration._k}`} className="marquee-item">
                  <Image
                    src={integration.logo}
                    alt={integration.name}
                    width={140}
                    height={44}
                    className="invert dark:invert-0 h-8 sm:h-10 w-auto opacity-70 hover:opacity-100 transition-opacity"
                  />
                  {integration.badgeKey && (
                    <span
                      className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap ${
                        integration.badgeKey === "new"
                          ? "text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30"
                          : "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30"
                      }`}
                    >
                      {t(`badges.${integration.badgeKey}`)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="marquee-group" aria-hidden="true">
              {marqueeItems.map((integration) => (
                <div key={`b-${integration._k}`} className="marquee-item">
                  <Image
                    src={integration.logo}
                    alt={integration.name}
                    width={140}
                    height={44}
                    className="invert dark:invert-0 h-8 sm:h-10 w-auto opacity-70 hover:opacity-100 transition-opacity"
                  />
                  {integration.badgeKey && (
                    <span
                      className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap ${
                        integration.badgeKey === "new"
                          ? "text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30"
                          : "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30"
                      }`}
                    >
                      {t(`badges.${integration.badgeKey}`)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
