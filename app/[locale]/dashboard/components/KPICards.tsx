"use client";

import { useTranslations } from "next-intl";
import {
  Heart,
  TrendingUp,
  Clock,
  CheckCircle2,
  Target,
  MessageSquare,
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface KPIData {
  customerSatisfaction: number | null;
  avgSentiment: number | null;
  avgResponseTime: number | null;
  resolutionEfficiency: number | null;
  satisfactionProbability: number | null;
  toneDominance: string | null;
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

  const cards = [
    {
      title: t("customerSatisfaction") || "Customer Satisfaction",
      value:
        data.customerSatisfaction !== null &&
        data.customerSatisfaction !== undefined
          ? `${data.customerSatisfaction.toFixed(1)}%`
          : "N/A",
      icon: Heart,
      color: "text-pink-400",
      bgColor: "bg-pink-500/10",
      borderColor: "border-pink-500/20",
    },
    {
      title: t("avgSentiment") || "Average Sentiment",
      value:
        data.avgSentiment !== null
          ? getSentimentLabel(data.avgSentiment)
          : "N/A",
      subtitle:
        data.avgSentiment !== null ? data.avgSentiment.toFixed(2) : undefined,
      icon: TrendingUp,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      title: t("avgResponseTime") || "Average Response Time",
      value: formatResponseTime(data.avgResponseTime),
      icon: Clock,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
    },
    {
      title: t("resolutionEfficiency") || "Resolution Efficiency",
      value:
        data.resolutionEfficiency !== null &&
        data.resolutionEfficiency !== undefined
          ? `${(data.resolutionEfficiency * 100).toFixed(1)}%`
          : "N/A",
      icon: CheckCircle2,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
    },
    {
      title: t("satisfactionProbability") || "Satisfaction Probability",
      value:
        data.satisfactionProbability !== null &&
        data.satisfactionProbability !== undefined
          ? `${data.satisfactionProbability.toFixed(1)}%`
          : "N/A",
      icon: Target,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
    },
    {
      title: t("toneDominance") || "Team Tone",
      value: data.toneDominance || "N/A",
      icon: MessageSquare,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={index}
            className={`${card.bgColor} ${card.borderColor} border p-6 hover:shadow-lg transition-all duration-300`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-2">{card.title}</p>
                <p className="text-2xl font-bold text-white mb-1">
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="text-xs text-gray-500">
                    Score: {card.subtitle}
                  </p>
                )}
              </div>
              <div className={`${card.color} ${card.bgColor} p-3 rounded-lg`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
