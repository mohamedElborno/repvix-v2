"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Smile, Meh, Frown } from "lucide-react";
import { Label, Pie, PieChart } from "recharts";
import { Card } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useLocale } from "next-intl";

interface SentimentDistributionProps {
  data: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export default function SentimentDistribution({
  data,
}: SentimentDistributionProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  // Colors that match the site theme (purple, pink, blue, orange palette)
  const colors = {
    positive: "hsl(142, 71%, 45%)", // Emerald green - matches positive sentiment
    neutral: "hsl(217, 91%, 60%)", // Blue - matches neutral sentiment
    negative: "hsl(0, 72%, 51%)", // Red - matches negative sentiment
  };

  // Colors with transparency for glass effect
  const colorsWithOpacity = {
    positive: "hsla(142, 71%, 45%, 0.8)", // 80% opacity
    neutral: "hsla(217, 91%, 60%, 0.8)", // 80% opacity
    negative: "hsla(0, 72%, 51%, 0.8)", // 80% opacity
  };

  // Tailwind color classes for theme consistency
  const colorClasses = {
    positive: "text-emerald-600 dark:text-emerald-400",
    neutral: "text-blue-600 dark:text-blue-400",
    negative: "text-red-600 dark:text-red-400",
  };

  const bgColorClasses = {
    positive: "bg-emerald-500/10",
    neutral: "bg-blue-500/10",
    negative: "bg-red-500/10",
  };

  const borderColorClasses = {
    positive: "border-emerald-500/20",
    neutral: "border-blue-500/20",
    negative: "border-red-500/20",
  };

  const chartData = [
    {
      sentiment: "positive",
      value: data.positive,
      fill: colorsWithOpacity.positive,
      icon: Smile,
    },
    {
      sentiment: "neutral",
      value: data.neutral,
      fill: colorsWithOpacity.neutral,
      icon: Meh,
    },
    {
      sentiment: "negative",
      value: data.negative,
      fill: colorsWithOpacity.negative,
      icon: Frown,
    },
  ].filter((item) => item.value > 0);

  const chartConfig = {
    value: {
      label: "Value",
    },
    positive: {
      label: t("positive") || "Positive",
      color: colors.positive,
    },
    neutral: {
      label: t("neutral") || "Neutral",
      color: colors.neutral,
    },
    negative: {
      label: t("negative") || "Negative",
      color: colors.negative,
    },
  } satisfies ChartConfig;

  const total = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [chartData]);

  // Calculate percentages for each segment
  const percentages = React.useMemo(() => {
    if (total === 0) return {};
    const result: Record<string, number> = {};
    chartData.forEach((item) => {
      result[item.sentiment] = parseFloat(
        ((item.value / total) * 100).toFixed(1)
      );
    });
    return result;
  }, [chartData, total]);

  // Get the largest segment percentage
  const largestPercentage = React.useMemo(() => {
    if (total === 0) return 0;
    const values = Object.values(percentages);
    return values.length > 0 ? Math.max(...values) : 0;
  }, [percentages]);

  return (
    <Card className="border-border bg-card flex flex-row h-[500px]">
      <div className="flex-1 flex flex-col p-4 md:p-5">
        <div className="flex items-center gap-3 mb-5 sm:mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 flex items-center justify-center">
            <Smile className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-base md:text-lg font-bold text-foreground">
            {t("sentimentDistribution") || "Sentiment Distribution"}
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          {total > 0 ? (
            <ChartContainer
              config={chartConfig}
              className="w-full h-full max-h-[300px] max-w-[300px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="sentiment"
                  innerRadius={80}
                  cornerRadius={9999}
                  outerRadius={120}
                  strokeWidth={2}
                  strokeOpacity={0.5}
                  paddingAngle={2}
                  style={{
                    filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))",
                  }}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-4xl font-bold"
                            >
                              {largestPercentage.toLocaleString()}%
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {t("noData") || "No data available"}
            </div>
          )}
        </div>
      </div>
      {total > 0 && (
        <div
          className={`w-[200px] md:w-[240px] p-4 md:p-5 border-l border-border flex flex-col justify-center gap-3 ${locale === "ar" ? "border-r" : "border-l"}`}
        >
          {chartData.map((item) => {
            const percentage = percentages[item.sentiment] || 0;
            const configItem =
              chartConfig[item.sentiment as keyof typeof chartConfig];
            const color =
              configItem && "color" in configItem
                ? configItem.color
                : "#8884d8";
            const label =
              configItem && "label" in configItem
                ? configItem.label
                : item.sentiment;
            const Icon = item.icon;
            const colorClass =
              colorClasses[item.sentiment as keyof typeof colorClasses];
            const bgColorClass =
              bgColorClasses[item.sentiment as keyof typeof bgColorClasses];
            const borderColorClass =
              borderColorClasses[
                item.sentiment as keyof typeof borderColorClasses
              ];

            return (
              <div
                key={item.sentiment}
                className={`flex items-center gap-3 p-3 rounded-lg border ${borderColorClass} ${bgColorClass} hover:opacity-80 transition-opacity`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bgColorClass}`}
                  style={{
                    backgroundColor: `${color}20`,
                  }}
                >
                  <Icon className={`w-5 h-5 ${colorClass}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xl font-bold ${colorClass}`}>
                    {percentage.toLocaleString()}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
