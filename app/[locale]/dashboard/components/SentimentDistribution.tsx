"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Label, Pie, PieChart } from "recharts";
import { Card } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

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

  const chartData = [
    {
      sentiment: "positive",
      value: data.positive,
      fill: "var(--color-positive)",
    },
    {
      sentiment: "neutral",
      value: data.neutral,
      fill: "var(--color-neutral)",
    },
    {
      sentiment: "negative",
      value: data.negative,
      fill: "var(--color-negative)",
    },
  ].filter((item) => item.value > 0);

  const chartConfig = {
    value: {
      label: "Value",
    },
    positive: {
      label: t("positive") || "Positive",
      color: "hsl(160, 100%, 40%)", // (emerald/teal)
    },
    neutral: {
      label: t("neutral") || "Neutral",
      color: "hsl(215, 16%, 47%)", // gray
    },
    negative: {
      label: t("negative") || "Negative",
      color: "hsl(0, 84%, 60%)", // red
    },
  } satisfies ChartConfig;

  const total = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [chartData]);

  return (
    <Card className="border-white/10 bg-white/5 flex flex-col h-[500px]">
      <div className="p-4 md:p-5 pb-0">
        <div className="mb-2">
          <h3 className="text-base md:text-lg font-semibold text-white/90">
            {t("sentimentDistribution") || "Sentiment Distribution"}
          </h3>
        </div>
      </div>
      <div className="flex-1 pb-0 px-4 md:px-5">
        {total > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[300px]"
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
                innerRadius={60}
                strokeWidth={5}
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
                            className="fill-white text-3xl font-bold"
                          >
                            {total.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-white/60 text-sm"
                          >
                            {t("total") || "Total"}
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
          <div className="flex items-center justify-center h-[300px] text-white/60">
            {t("noData") || "No data available"}
          </div>
        )}
      </div>
      {total > 0 && (
        <div className="p-4 md:p-5 pt-0 flex flex-col gap-2 text-sm">
          <div className="flex flex-wrap gap-4 justify-center">
            {chartData.map((item) => {
              const percentage = ((item.value / total) * 100).toFixed(1);
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

              return (
                <div
                  key={item.sentiment}
                  className="flex items-center gap-2 leading-none"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: color,
                    }}
                  />
                  <span className="text-white/90 font-medium">
                    {label}: {percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
