"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import DashboardMockup from "./DashboardMockup";

export default function Hero() {
  const t = useTranslations("home.hero");

  return (
    <section id="hero" className="relative min-h-screen overflow-hidden">
      <div className="relative mx-auto max-w-[1610px] px-6 sm:px-8 lg:px-16">
        <div className="flex flex-col items-center justify-center min-h-screen py-20 gap-16">
          {/* Text Content - Centered */}
          <div className="flex flex-col items-center text-center gap-8">
            {/* Simple Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                {t("badge")}
              </span>
            </div>

            {/* Single Powerful Title */}
            <h1 className="font-bold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.1] tracking-tight">
              <span className="bg-clip-text">{t("title")}</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-3xl max-w-4xl">{t("subtitle")}</p>

            {/* CTA Button */}
            <Button
              asChild
              className="rounded-2xl text-white px-8 py-6 text-lg font-normal bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all"
            >
              <Link href="/sign-up">{t("cta")}</Link>
            </Button>
          </div>

          {/* Dashboard Mockup */}
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
