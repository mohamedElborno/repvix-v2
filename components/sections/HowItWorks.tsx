"use client";
import { useTranslations } from "next-intl";
import { UploadCloud, Brain, FileOutput } from "lucide-react";
import Image from "next/image";

export default function HowItWorks() {
  const t = useTranslations("home.howItWorks");

  const steps = [
    {
      icon: UploadCloud,
      title: t("step1.title", { default: "Import Chats" }),
      desc: t("step1.desc", {
        default: "Upload WhatsApp/Discord/Telegram chats or CSV/TXT files.",
      }),
      badge: t("step1.badge", { default: "Input" }),
      image: "/images/intuitive-1.png",
    },
    {
      icon: Brain,
      title: t("step2.title", { default: "AI Analysis" }),
      desc: t("step2.desc", {
        default:
          "We embed, cluster and summarize conversations using advanced AI.",
      }),
      badge: t("step2.badge", { default: "AI" }),
      image: "/images/intuitive-2.png",
    },
    {
      icon: FileOutput,
      title: t("step3.title", { default: "Instant Docs" }),
      desc: t("step3.desc", {
        default: "Export polished PDFs/Markdown, FAQs and analytics reports.",
      }),
      badge: t("step3.badge", { default: "Output" }),
      image: "/images/top-rated-1.png",
    },
  ];

  return (
    <section id="howItWorks" className="relative py-16 md:py-20 bg-background scroll-mt-20">
      <div className="mx-auto w-full max-w-[1440px] px-6 sm:px-8">
        <div className="text-center mb-12 md:mb-14">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 dark:from-purple-400 dark:via-fuchsia-300 dark:to-purple-500">
            {t("title") ?? "How it works"}
          </h2>
          <p className="mt-3 text-sm sm:text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
            {t("subtitle") ??
              "From raw chats to polished docs in three simple steps."}
          </p>
        </div>

        {/* Alternating visual steps with images */}
        <div className="space-y-10 md:space-y-14">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const reverse = i % 2 === 1;
            return (
              <div
                key={i}
                className={`grid items-center gap-6 md:gap-10 grid-cols-1 md:grid-cols-2 ${
                  reverse ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                {/* Image side */}
                <div className="relative">
                  <div className="absolute -inset-2 -z-10 rounded-3xl bg-gradient-to-br from-purple-500/20 via-fuchsia-400/10 to-purple-600/10 blur-2xl" />
                  <div className="relative flex items-center justify-center h-[400px] w-full overflow-hidden rounded-2xl border border-border bg-card backdrop-blur-md shadow-sm">
                    <Image
                      src="/logo.svg"
                      alt={s.title}
                      width={500}
                      height={500}
                      className="w-auto h-full object-contain p-40"
                      priority={i === 0}
                    />
                  </div>
                </div>

                {/* Content side */}
                <div className="relative">
                  <div className="group relative rounded-2xl border border-border bg-card backdrop-blur-md p-6 md:p-7 transition-all duration-300 hover:bg-muted/50 hover:border-purple-300/50 shadow-sm">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-300/30 dark:border-purple-300/20 text-purple-600 dark:text-purple-300">
                        <Icon className="size-4" />
                      </span>
                      {/* Fancy badge */}
                      <span className="relative inline-flex items-center">
                        <span className="absolute -left-1 size-1.5 rounded-full bg-purple-500 dark:bg-purple-400/80 shadow-[0_0_8px_rgba(168,85,247,0.5)] dark:shadow-[0_0_8px_rgba(168,85,247,0.7)]" />
                        <span className="rounded-full p-[1px] bg-gradient-to-r from-purple-400/60 via-fuchsia-400/40 to-purple-600/60">
                          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] sm:text-xs font-semibold tracking-wide bg-background dark:bg-white/5 border border-border dark:border-white/10 text-foreground dark:text-white/90">
                            {s.badge}
                          </span>
                        </span>
                      </span>
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold text-foreground">
                      {i + 1}. {s.title}
                    </h3>
                    <p className="mt-2 text-sm sm:text-[15px] text-muted-foreground leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
