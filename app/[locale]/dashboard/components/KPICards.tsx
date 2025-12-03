"use client";

import { useTranslations } from "next-intl";
import {
  Heart,
  TrendingUp,
  AlertTriangle,
  Shield,
  Award,
  MessageSquare,
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface KPIData {
  customerSatisfaction: number | null;
  avgSentiment: number | null;
  riskScore: number | null;
  churnRiskLevel: "low" | "medium" | "high" | null;
  topAgent: {
    agentId: string;
    score: number;
    strengthSummary: string;
  } | null;
  commonTopics: string[];
  commonIssues: string[];
}

interface KPICardsProps {
  data: KPIData;
}

export default function KPICards({ data }: KPICardsProps) {
  const t = useTranslations("dashboard");

  const formatResponseTime = (seconds: number | null): string => {
    if (seconds === null || seconds === undefined) return "N/A";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  const getSentimentLabel = (score: number | null): string => {
    if (score === null) return "N/A";
    if (score > 0.1) return t("positive") || "Positive";
    if (score < -0.1) return t("negative") || "Negative";
    return t("neutral") || "Neutral";
  };

  const getChurnRiskLabel = (level: string | null): string => {
    if (!level) return "N/A";
    const labels: Record<string, string> = {
      low: t("churnRisk") + " - " + (t("low") || "Low"),
      medium: t("churnRisk") + " - " + (t("medium") || "Medium"),
      high: t("churnRisk") + " - " + (t("high") || "High"),
    };
    return labels[level] || "N/A";
  };

  // Build cards array with only the most important metrics
  const cards = [
    {
      title: t("customerSatisfaction") || "Customer Satisfaction",
      value:
        data.customerSatisfaction !== null &&
        data.customerSatisfaction !== undefined
          ? `${data.customerSatisfaction.toFixed(1)}%`
          : "N/A",
      icon: Heart,
    },
    {
      title: t("sentiment") || "Overall Sentiment",
      value:
        data.avgSentiment !== null
          ? getSentimentLabel(data.avgSentiment)
          : "N/A",
      subtitle:
        data.avgSentiment !== null ? data.avgSentiment.toFixed(2) : undefined,
      icon: TrendingUp,
    },
    {
      title: t("riskScore") || "Risk Score",
      value:
        data.riskScore !== null && data.riskScore !== undefined
          ? `${data.riskScore.toFixed(1)}%`
          : "N/A",
      icon: AlertTriangle,
    },
    {
      title: t("churnRisk") || "Churn Risk",
      value: getChurnRiskLabel(data.churnRiskLevel),
      icon: Shield,
    },
    ...(data.topAgent
      ? [
          {
            title: t("agentLeaderboard") || "Top Agent",
            value: `${data.topAgent.score.toFixed(0)}%`,
            subtitle:
              data.topAgent.strengthSummary?.slice(0, 50) + "..." || undefined,
            icon: Award,
          },
        ]
      : []),
    ...(data.commonTopics.length > 0
      ? [
          {
            title: t("commonTopics") || "Common Topics",
            value: data.commonTopics.slice(0, 2).join(", ") || "N/A",
            subtitle:
              data.commonTopics.length > 2
                ? `+${data.commonTopics.length - 2} more`
                : undefined,
            icon: MessageSquare,
          },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={index}
            className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-5 shadow-sm shadow-purple-500/10 hover:shadow-lg hover:shadow-purple-500/20 hover:border-purple-500/30 hover:bg-card transition-all duration-300 group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-foreground mb-1">
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.subtitle}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0">
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 flex items-center justify-center group-hover:from-purple-500/30 group-hover:to-purple-600/20 transition-all duration-300">
                  <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
