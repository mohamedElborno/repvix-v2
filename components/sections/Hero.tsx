"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Hero() {
  const t = useTranslations("home.hero");
  const locale = useLocale();
  const [isScrolled, setIsScrolled] = useState(false);
  const isRTL = locale === "ar";

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section id="hero" className="relative overflow-hidden scroll-mt-20">
      {/* Repvix Logo - Right Side */}

      <div
        className={`absolute ${
          isRTL ? "-left-[calc(100%-1205px)]" : "right-[calc(100%-1540px)]"
        } -top-[370px] z-0 transition-opacity duration-700 ease-in-out`}
      >
        <Image
          src="/Repvix.svg"
          alt="Repvix"
          width={3000}
          height={3000}
          className={`w-auto h-[60vh] object-contain rotate-[-90deg] ${
            isRTL ? "origin-right" : "origin-right"
          } opacity-60 invert dark:invert-0`}
          priority
        />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1440px] flex-col items-center sm:items-start justify-center gap-8 px-6 sm:px-8 text-center sm:text-start">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-2 backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-purple-400 dark:bg-purple-300 animate-pulse" />
          <span className="text-xs font-medium uppercase text-muted-foreground">
            {t("badge")}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-center sm:text-start flex flex-col items-center sm:items-start justify-center sm:justify-start font-extrabold text-4xl sm:text-5xl md:text-6xl leading-tight max-w-5xl">
          <span className="text-foreground">{t("title1")}</span>
          <span className="text-foreground">{t("title2")}</span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-fuchsia-400 to-purple-500 dark:from-purple-300 dark:via-fuchsia-200 dark:to-purple-400">
            {t("title3")}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-3xl text-base sm:text-lg md:text-xl text-muted-foreground">
          {t("subtitle")}
        </p>

        {/* CTAs */}
        <div className="md:mt-8 flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <Button
            asChild
            className="rounded-full px-8 py-6 text-base font-semibold bg-purple-500 hover:bg-purple-500/85 hover:scale-105 transition-transform shadow-lg shadow-purple-500/30"
          >
            <Link href="/sign-up">{t("getStarted")}</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full px-8 py-6 text-base font-semibold border-border/50 bg-muted/50 backdrop-blur-md hover:bg-muted transition-all"
          >
            <Link href="#features">{t("learnMore")}</Link>
          </Button>
        </div>

        {/* Trust note */}
        <p className="mt-4 text-sm text-muted-foreground/80">
          {t("trustNote")}
        </p>
      </div>
    </section>
  );
}
