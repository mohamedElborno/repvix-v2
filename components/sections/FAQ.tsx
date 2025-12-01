"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

type Item = { q: string; a: string };

const QA = ({
  i,
  item,
  open,
  onToggle,
}: {
  i: number;
  item: Item;
  open: boolean;
  onToggle: () => void;
}) => {
  return (
    <div className="group relative rounded-2xl border border-border bg-card backdrop-blur-md px-4 sm:px-5 md:px-6 py-4 md:py-5 transition-all duration-300 hover:bg-muted/50 hover:border-purple-300/50 dark:hover:border-purple-500/50 shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex size-7 items-center justify-center rounded-md bg-purple-500/10 dark:bg-purple-500/15 border border-purple-300/30 dark:border-purple-300/20 text-[11px] font-bold text-purple-600 dark:text-purple-300">
            {i}
          </span>
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-foreground">
            {item.q}
          </h3>
        </div>
        <ChevronDown
          className={`size-4 sm:size-5 transition-transform duration-300 text-muted-foreground ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] mt-3" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">
            {item.a}
          </p>
        </div>
      </div>
      <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
};

export default function FAQ() {
  const t = useTranslations("home.faq");
  const items: Item[] = [
    { q: t("q1"), a: t("a1") },
    { q: t("q2"), a: t("a2") },
    { q: t("q3"), a: t("a3") },
    { q: t("q4"), a: t("a4") },
    { q: t("q5"), a: t("a5") },
    { q: t("q6"), a: t("a6") },
    { q: t("q7"), a: t("a7") },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-16 md:py-20 bg-background scroll-mt-20">
      <div className="mx-auto w-full max-w-[1440px] px-6 sm:px-8">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-fuchsia-400 to-purple-500 dark:from-purple-300 dark:via-fuchsia-200 dark:to-purple-400">
            {t("title", { default: "Frequently Asked Questions" })}
          </h2>
          <p className="mt-3 text-sm sm:text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
            {t("subtitle", {
              default: "All you need to know before getting started.",
            })}
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {items.map((item, idx) => (
            <QA
              key={idx}
              i={idx + 1}
              item={item}
              open={openIndex === idx}
              onToggle={() => setOpenIndex(openIndex === idx ? null : idx)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
