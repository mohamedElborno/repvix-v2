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
    <section id="features" className="relative py-20 lg:py-28 bg-muted/20 scroll-mt-20">
      <div className="mx-auto max-w-[1440px] px-6 sm:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            {t("title") || "Advanced AI-Powered Capabilities"}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {t("subtitle") ||
              "Transform raw conversations into fully analyzed insights, performance metrics, and structured knowledge."}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-3xl border border-border/50 p-8 bg-card/50 backdrop-blur-sm
                           hover:border-purple-500/50 hover:bg-card/80 transition-all duration-500
                           hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1"
              >
                {/* Icon Container */}
                <div className="relative mb-6">
                  <div
                    className="relative rounded-xl p-4 w-fit bg-gradient-to-br from-purple-500/10 via-fuchsia-500/10 to-purple-500/10
                               dark:from-purple-600/20 dark:via-fuchsia-500/20 dark:to-purple-600/20
                               border border-purple-400/20 dark:border-purple-300/30
                               group-hover:border-purple-500/50 dark:group-hover:border-purple-400/60
                               transition-all duration-500 group-hover:scale-110"
                  >
                    <Icon className="size-6 text-purple-600 dark:text-purple-400 transition-colors duration-500" />

                    {/* Glow effect on hover */}
                    <div
                      className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/0 via-fuchsia-500/0 to-purple-500/0
                                    group-hover:from-purple-500/20 group-hover:via-fuchsia-500/20 group-hover:to-purple-500/20
                                    transition-all duration-500 blur-xl -z-10"
                    ></div>
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-500">
                  {item.title}
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>

                {/* Decorative gradient line */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/0 to-transparent
                                group-hover:via-purple-500/50 transition-all duration-500"
                ></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
