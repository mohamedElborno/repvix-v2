"use client";

import { useTranslations } from "next-intl";
import {
  Brain,
  FileText,
  BarChart3,
  Languages,
  LineChart,
  Users,
  MessageSquareQuote,
} from "lucide-react";

export default function Features() {
  const t = useTranslations("home.features");

  const items = [
    {
      icon: Brain,
      title: t("item1.title") || "Full Conversation Intelligence",
      desc:
        t("item1.desc") ||
        "Executive summaries, sentiment evolution, friction detection, and full communication profiling.",
    },
    {
      icon: LineChart,
      title: t("item2.title") || "Behavioral & Linguistic Analysis",
      desc:
        t("item2.desc") ||
        "Clarity, empathy, assertiveness, engagement level, tone mapping, and linguistic patterns.",
    },
    {
      icon: BarChart3,
      title: t("item3.title") || "Outcome & Negotiation Insights",
      desc:
        t("item3.desc") ||
        "Resolution likelihood, negotiation strength, price tension points, and risk indicators.",
    },
    {
      icon: Users,
      title: t("item4.title") || "Employee Performance Analytics",
      desc:
        t("item4.desc") ||
        "Track response time, sentiment averages, strengths, weaknesses, and behavioral trends over time.",
    },
    {
      icon: MessageSquareQuote,
      title: t("item5.title") || "Auto-Generated FAQs & KB",
      desc:
        t("item5.desc") ||
        "Extract recurring questions and generate accurate answers with confidence scoring.",
    },
    {
      icon: FileText,
      title: t("item6.title") || "Export-Ready Executive Reports",
      desc:
        t("item6.desc") ||
        "Download polished PDF reports, Markdown summaries, and structured insights instantly.",
    },
    {
      icon: Languages,
      title: t("item7.title") || "Multi-Language Intelligence",
      desc:
        t("item7.desc") ||
        "Arabic, English, Turkish, Spanish, French, and Hindi — with precise cross-language analysis.",
    },
  ];

  return (
    <section id="features" className="relative py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
            {t("title") || "Advanced AI-Powered Capabilities"}
          </h2>
          <p className="mt-3 text-base md:text-lg text-white/70 max-w-3xl mx-auto">
            {t("subtitle") ||
              "Transform raw conversations into fully analyzed insights, performance metrics, and structured knowledge."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group rounded-2xl border border-white/10 p-6 bg-white/[0.05] backdrop-blur-md
                           hover:border-white/20 hover:bg-white/[0.08] transition-all duration-300
                           shadow-[0_0_20px_rgba(0,0,0,0.2)]"
              >
                <div
                  className="rounded-xl p-3 w-fit mb-4 bg-gradient-to-br from-purple-600/20 to-fuchsia-500/20
                             border border-purple-300/30 text-purple-200 shadow-[0_0_18px_rgba(168,85,247,0.35)]"
                >
                  <Icon className="size-5" />
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
