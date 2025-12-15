"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { trackLpEvent } from "@/lib/lpTelemetry";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher";

function useScroll50Event() {
  useEffect(() => {
    let fired = false;
    const onScroll = () => {
      if (fired) return;
      const scrollY = window.scrollY || window.pageYOffset;
      const viewportHeight = window.innerHeight || 0;
      const docHeight =
        document.documentElement.scrollHeight || document.body.scrollHeight;

      if (docHeight === 0) return;

      const bottomPosition = scrollY + viewportHeight;
      if (bottomPosition >= docHeight * 0.5) {
        fired = true;
        trackLpEvent("lp_scroll_50");
        window.removeEventListener("scroll", onScroll);
      }
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

export default function ConversationInsightsPage() {
  const locale = useLocale();
  const t = useTranslations("lp.conversationInsights");
  const [exampleExpanded, setExampleExpanded] = useState(false);

  useEffect(() => {
    trackLpEvent("ad_view_lp");
  }, []);

  useScroll50Event();

  const handlePrimaryCtaClick = () => {
    trackLpEvent("lp_hero_cta_click");
    // Simple flow start: redirect to sign-in (can be refined later)
    const baseLocale = locale || "en";
    window.location.href = `/${baseLocale}/sign-in`;
  };

  const handleSecondaryCtaClick = () => {
    trackLpEvent("lp_secondary_cta_click");
    const baseLocale = locale || "en";
    window.location.href = `/${baseLocale}/sign-in`;
  };

  const handleLogoClick = () => {
    trackLpEvent("lp_exit_to_main_site");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Minimal header: logo + inline language switcher */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-16 py-3 flex items-center justify-between gap-3">
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2"
            onClick={handleLogoClick}
          >
            <Image
              src="/RepvixLogo.png"
              alt="Repvix logo"
              width={120}
              height={32}
              className="h-7 w-auto dark:invert"
              priority
            />
          </Link>
          <LocaleSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-16 py-10 sm:py-12 lg:py-16 space-y-16 sm:space-y-18 lg:space-y-24">
        {/* Hero */}
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
          <div className="space-y-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {t("hero.badge")}
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              {t("hero.heading")}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
              {t("hero.subheading")}
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handlePrimaryCtaClick}
                className="inline-flex items-center justify-center rounded-2xl bg-foreground text-background px-6 sm:px-7 py-3.5 text-sm sm:text-base font-semibold shadow-lg shadow-foreground/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              >
                {t("hero.cta")}
              </button>
              <p className="text-xs sm:text-[13px] text-muted-foreground">
                {t("hero.trust")}
              </p>
            </div>
          </div>

          {/* Hero visual - chat-style card with highlighted churn moment */}
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-linear-to-br from-amber-400/15 via-purple-500/10 to-sky-500/10 blur-3xl" />
            <div className="relative rounded-2xl border border-border bg-card/90 shadow-xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-2 w-16 rounded-full bg-muted" />
                <div className="flex gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400/80" />
                </div>
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                <div className="max-w-[85%] rounded-2xl bg-muted/80 px-3 py-2 text-foreground/90">
                  <p>{t("hero.chat.customerLine1")}</p>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl bg-foreground text-white dark:text-black px-3 py-2 text-foreground/95 ${locale === "ar" ? "mr-auto" : "ml-auto"}`}
                >
                  <p>{t("hero.chat.agentLine1")}</p>
                </div>
                <div className="max-w-[85%] rounded-2xl bg-muted/80 px-3 py-2 text-foreground/90">
                  <p>{t("hero.chat.customerLine2")}</p>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl bg-foreground text-white dark:text-black px-3 py-2 text-foreground/95 ${locale === "ar" ? "mr-auto" : "ml-auto"}`}
                >
                  <p>{t("hero.chat.agentLine2")}</p>
                </div>
                <div className="max-w-[90%] rounded-2xl bg-amber-100/90 dark:bg-amber-900/30 border border-amber-300/60 dark:border-amber-400/40 px-3 py-2 shadow-[0_0_0_1px_rgba(245,158,11,0.35)]">
                  <p className="text-[11px] sm:text-xs leading-snug text-amber-900 dark:text-amber-100">
                    {t("hero.chat.highlight")}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">
                  {t("hero.chat.privacyNote")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Problem block */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t("problem.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
            {t("problem.copy")}
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {["confusion", "empathy", "pricing", "objections"].map((key) => (
              <li
                key={key}
                className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5 text-sm"
              >
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>{t(`problem.bullets.${key}`)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Example block */}
        <section className="space-y-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {t("example.title")}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              {t("example.note")}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 items-start">
            {/* Left: chat example */}
            <div className="rounded-2xl border border-border bg-card/90 shadow-lg p-4 space-y-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {t("example.shortLabel")}
              </p>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="max-w-[85%] rounded-2xl bg-muted/80 px-3 py-2">
                  <p>{t("example.chat.customerLine1")}</p>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl bg-foreground text-background px-3 py-2 ${locale === "ar" ? "mr-auto" : "ml-auto"}`}
                >
                  <p>{t("example.chat.agentLine1")}</p>
                </div>
                <div className="max-w-[85%] rounded-2xl bg-muted/70 px-3 py-2 text-muted-foreground">
                  <p>{t("example.chat.highlight")}</p>
                </div>
              </div>
            </div>

            {/* Right: Insight card */}
            <div className="rounded-2xl border border-border bg-card/95 shadow-lg p-4 sm:p-5 space-y-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {t("insight.title")}
              </p>
              <div className="space-y-3 text-sm">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("insight.triggerLabel")}
                  </p>
                  <p className="font-semibold">{t("insight.trigger")}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("insight.confidenceLabel")}
                  </p>
                  <p className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {t("insight.confidence")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("insight.fixLabel")}
                  </p>
                  <p className="text-sm leading-relaxed">{t("insight.fix")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why it matters */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t("why.title")}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {["point1", "point2", "point3"].map((key) => (
              <li
                key={key}
                className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-sm leading-relaxed"
              >
                {t(`why.points.${key}`)}
              </li>
            ))}
          </ul>
        </section>

        {/* CTA section */}
        <section className="space-y-4 border border-dashed border-border/70 rounded-2xl bg-card/60 px-4 sm:px-6 lg:px-10 py-6 sm:py-7">
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
            {t("cta.heading")}
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleSecondaryCtaClick}
              className="inline-flex items-center justify-center rounded-2xl bg-foreground text-background px-5 sm:px-6 py-3 text-sm font-semibold shadow-md shadow-foreground/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              {t("hero.cta")}
            </button>
            <p className="text-xs sm:text-[13px] text-muted-foreground">
              {t("cta.micro")}
            </p>
          </div>
        </section>
      </main>

      {/* Mini footer */}
      <footer className="border-t border-border/60 bg-background/90">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-16 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <span className="h-3 w-px bg-border/60" />
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <span className="h-3 w-px bg-border/60" />
            <Link href="/contact" className="hover:text-foreground">
              Contact
            </Link>
          </div>
          <Link href="/" className="hover:text-foreground">
            {t("footer.backToMain")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
