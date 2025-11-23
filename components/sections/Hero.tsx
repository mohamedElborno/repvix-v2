"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function Hero() {
  const t = useTranslations("home.hero");

  const title1 = t("title1") || "Transform Conversations";
  const title2 = t("title2") || "Into Comprehensive";
  const title3 = t("title3") || "Professional Analyses";
  const subtitle =
    t("subtitle") ||
    "Accurately extract data and insights from WhatsApp, Discord, and Telegram conversations using advanced AI.";

  return (
    <section id="hero" className="relative overflow-hidden">
      <div className="relative z-10 mx-auto flex min-h-[100vh] max-w-6xl flex-col lg:flex-row items-center justify-between gap-10 px-6 sm:px-8 py-12 lg:py-20">
        {/* Left side: text */}
        <div className="w-full lg:w-[55%]">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md mb-5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] sm:text-xs font-medium tracking-[0.14em] uppercase text-white/70">
              {t("badge") || "AI chat analysis • Conversation intelligence"}
            </span>
          </div>

          {/* Title */}
          <h1 className="font-extrabold text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[1.05] space-y-1">
            <span className="block bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
              {title1}
            </span>
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-300 to-purple-500">
              {title2}
            </span>
            <span className="block bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
              {title3}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-xl text-sm sm:text-base md:text-lg text-white/80 leading-relaxed">
            {subtitle}
          </p>

          {/* Bullets */}
          <div className="mt-6 grid gap-2 text-sm sm:text-[15px] text-white/75">
            <div className="flex items-start gap-2">
              <span className="mt-[4px] text-xs">✔</span>
              <p>
                {t("bullet1") ||
                  "Automatic executive summaries, sentiment & behavioral analysis."}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-[4px] text-xs">✔</span>
              <p>
                {t("bullet2") ||
                  "Turn messy chat logs into clean, structured insights in minutes."}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-[4px] text-xs">✔</span>
              <p>
                {t("bullet3") ||
                  "Export ready-to-share reports for teams, managers, and clients."}
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <Button
              asChild
              className="rounded-full px-8 py-5 text-sm sm:text-base font-semibold 
                         bg-purple-600 hover:bg-purple-600/85 hover:scale-[1.03] 
                         transition-transform shadow-lg shadow-purple-600/40"
            >
              <Link href="/sign-up">{t("getStarted") || "Get Started"}</Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="rounded-full px-8 py-5 text-sm sm:text-base font-semibold 
                         text-white border-white/20 bg-white/5 backdrop-blur-md 
                         hover:bg-white/10 transition-all"
            >
              <Link href="#features">{t("learnMore") || "Learn More"}</Link>
            </Button>
          </div>

          {/* Small trust row */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs sm:text-[13px] text-white/60">
            <span>{t("trustRow1") || "⚡ No training required"}</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>
              {t("trustRow2") || "Paste chats • Get analysis • Export"}
            </span>
          </div>
        </div>

        {/* Right side: visual card */}
        <div className="w-full lg:w-[40%]">
          <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 sm:p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)]">
            {/* Top row: sources */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium tracking-[0.18em] uppercase text-white/60">
                {t("cardChatSources") || "Chat Sources"}
              </span>
              <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/40">
                {t("cardLivePreview") || "Live Preview"}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
              <span className="rounded-full bg-white/8 border border-white/15 px-3 py-1 text-[11px] text-white/80">
                WhatsApp 📱
              </span>
              <span className="rounded-full bg-white/8 border border-white/15 px-3 py-1 text-[11px] text-white/80">
                Discord 💬
              </span>
              <span className="rounded-full bg-white/8 border border-white/15 px-3 py-1 text-[11px] text-white/80">
                Telegram ✈️
              </span>
              <span className="rounded-full bg-white/5 border border-purple-400/40 px-3 py-1 text-[11px] text-purple-100">
                CSV / TXT
              </span>
            </div>

            {/* Middle: flow */}
            <div className="space-y-3 mb-5">
              <div className="flex items-center justify-between rounded-2xl bg-black/30 border border-white/10 px-3 py-3">
                <div className="text-xs">
                  <p className="text-white/80 font-medium">
                    {t("cardRawConversation") || "Raw Conversation"}
                  </p>
                  <p className="text-white/55 mt-1 line-clamp-1">
                    {t("cardExampleText") ||
                      '"We need a quote for a new feature, what\'s your best price and timeline?"'}
                  </p>
                </div>
                <span className="text-[11px] rounded-full bg-white/10 px-2 py-1 text-white/70">
                  {t("cardInput") || "Input"}
                </span>
              </div>

              <div className="flex items-center justify-center text-[11px] text-white/50">
                <span className="mx-2 h-px w-10 bg-white/20" />
                {t("cardAiAnalysis") || "AI Analysis"}
                <span className="mx-2 h-px w-10 bg-white/20" />
              </div>

              <div className="rounded-2xl bg-purple-600/20 border border-purple-300/40 px-3 py-3 text-xs">
                <p className="text-white font-medium mb-1">
                  {t("cardExecutiveSummary") || "Executive Summary"}
                </p>
                <p className="text-white/75 line-clamp-2">
                  {t("cardExampleSummary") ||
                    "Negotiation focused on price and delivery time. Client shows resistance at initial anchor but remains open after concession. Outcome pending."}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-white/80">
                  <div className="rounded-xl bg-black/20 px-2 py-1.5">
                    <p className="text-white/60">
                      {t("cardSentiment") || "Sentiment"}
                    </p>
                    <p className="font-semibold">Neutral ↗</p>
                  </div>
                  <div className="rounded-xl bg-black/20 px-2 py-1.5">
                    <p className="text-white/60">
                      {t("cardResolution") || "Resolution"}
                    </p>
                    <p className="font-semibold">Pending</p>
                  </div>
                  <div className="rounded-xl bg-black/20 px-2 py-1.5">
                    <p className="text-white/60">{t("cardMatch") || "Match"}</p>
                    <p className="font-semibold">70%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: export */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 mt-1">
              <span className="text-[11px] text-white/60">
                {t("cardExportAs") || "Export as:"}
              </span>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/8 border border-white/15 px-3 py-1 text-[11px] text-white/80">
                  {t("cardPdfReport") || "PDF Report"}
                </span>
                <span className="rounded-full bg-white/8 border border-white/15 px-3 py-1 text-[11px] text-white/80">
                  {t("cardFaqs") || "FAQs"}
                </span>
                <span className="rounded-full bg-white/8 border border-white/15 px-3 py-1 text-[11px] text-white/80">
                  {t("cardMarkdown") || "Markdown"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
