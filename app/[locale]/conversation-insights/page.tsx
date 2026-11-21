"use client";

import { useEffect } from "react";
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
        trackLpEvent("lp_scroll_50", {
          scrollY,
          viewportHeight,
          docHeight,
        });
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

  useEffect(() => {
    trackLpEvent("ad_view_lp");
  }, []);

  useScroll50Event();

  const redirectToSignIn = (event: string) => {
    trackLpEvent(event);
    const baseLocale = locale || "en";
    setTimeout(() => {
      window.location.href = `/${baseLocale}/sign-up`;
    }, 120);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16 py-3 flex items-center justify-between gap-3">
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2"
            onClick={() => trackLpEvent("lp_exit_to_main_site")}
          >
            <Image
              src="/Repvix.svg"
              alt={t("hero.logoAlt")}
              width={120}
              height={32}
              className="h-7 w-auto dark:invert"
              priority
            />
          </Link>
          <LocaleSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16 py-12 space-y-20">
        {/* ================= HERO ================= */}
        <section className="grid gap-10 lg:grid-cols-[1.2fr_1fr] items-center">
          <div className="space-y-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {t("hero.badge")}
            </p>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
              {t("hero.heading")}
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-xl">
              {t("hero.subheading")}
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => redirectToSignIn("lp_hero_cta_click")}
                className="cursor-pointer hover:scale-105 duration-300 inline-flex items-center justify-center rounded-2xl bg-foreground text-background px-7 py-3.5 text-base font-semibold shadow-lg hover:shadow-xl transition"
              >
                {t("hero.cta")}
              </button>

              <p className="text-xs text-muted-foreground">
                {t("hero.trialNote")} {t("hero.plansStartAtLabel")}{" "}
                <span className="text-emerald-600 font-medium">
                  {t("hero.plansStartAtPrice")}
                </span>
              </p>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-linear-to-br from-amber-400/15 via-purple-500/10 to-sky-500/10 blur-3xl" />
            <div className="rounded-2xl border border-border bg-card/90 shadow-xl p-5 space-y-3 text-sm">
              <div className="rounded-2xl bg-muted/80 px-3 py-2">
                {t("example.chat.customerLine1")}
              </div>
              <div className="rounded-2xl bg-foreground text-background px-3 py-2 ml-auto max-w-[85%]">
                {t("example.chat.agentLine1")}
              </div>
              <div className="rounded-xl bg-amber-100/90 border border-amber-300 px-3 py-2 text-xs text-amber-900">
                {t("example.chat.highlight")}
              </div>
            </div>
          </div>
        </section>

        {/* ================= PROBLEM ================= */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold">
            {t("problem.title")}
          </h2>

          <ul className="grid gap-2 sm:grid-cols-2 text-sm">
            <li className="rounded-xl border bg-muted/40 px-4 py-3">
              {t("problem.bullets.confusion")}
            </li>
            <li className="rounded-xl border bg-muted/40 px-4 py-3">
              {t("problem.bullets.empathy")}
            </li>
            <li className="rounded-xl border bg-muted/40 px-4 py-3">
              {t("problem.bullets.pricing")}
            </li>
            <li className="rounded-xl border bg-muted/40 px-4 py-3">
              {t("problem.bullets.objections")}
            </li>
          </ul>
        </section>

        {/* ================= VIDEO ================= */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t("video.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("video.subtitle")}</p>
          <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-lg">
            <img src="/demo-preview.svg" alt="Repvix demo with synthetic data" className="w-full rounded-2xl" />
          </div>
        </section>

        {/* ================= CTA ================= */}
        <section className="rounded-2xl border border-dashed bg-card/60 px-6 py-8 space-y-4">
          <h2 className="text-xl font-semibold">{t("cta.heading")}</h2>

          <button
            type="button"
            onClick={() => redirectToSignIn("lp_final_cta_click")}
            className="cursor-pointer hover:scale-105 duration-300 inline-flex items-center justify-center rounded-2xl bg-foreground text-background px-6 py-3 text-sm font-semibold shadow-md hover:shadow-lg transition"
          >
            {t("hero.cta")}
          </button>

          <p className="text-xs text-muted-foreground">{t("cta.micro")}</p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/90">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16  py-4 flex justify-between text-xs text-muted-foreground">
          <div className="flex gap-3">
            <Link href="/privacy">{t("footer.privacy")}</Link>
            <Link href="/terms">{t("footer.terms")}</Link>
          </div>
          <Link href="/">{t("footer.backToMain")}</Link>
        </div>
      </footer>
    </div>
  );
}
