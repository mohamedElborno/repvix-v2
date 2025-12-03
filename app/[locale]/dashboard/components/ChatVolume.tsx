"use client";

import { useMemo } from "react";
import { Clock } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";
import { Card } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useTranslations } from "next-intl";

type PeakHour = { hour: number; count: number };

interface ChatVolumeProps {
  data?: PeakHour[];
}

export default function ChatVolume({ data = [] }: ChatVolumeProps) {
  const t = useTranslations("dashboard");

  // Convert peakHours to chart data format - show all 24 hours
  const chartData = useMemo(() => {
    // Create array for all 24 hours, initialize with 0
    const hoursData: Array<{ hour: number; count: number; hourLabel: string }> =
      [];

    for (let hour = 0; hour < 24; hour++) {
      const peakHour = data?.find((ph) => ph.hour === hour);
      hoursData.push({
        hour,
        count: peakHour?.count || 0,
        hourLabel: `${hour}:00`,
      });
    }

    // Always return all 24 hours, sorted by hour
    return hoursData;
  }, [data]);

  const chartConfig = useMemo(() => {
    return {
      count: { label: t("total") || "Total", color: "hsl(270, 70%, 60%)" },
    } as ChartConfig;
  }, [t]);

  const formatHour = (hour: number) => {
    return `${hour}:00`;
  };

  return (
    <Card className="border-border bg-card h-[500px] w-full">
      <div className="p-4 md:p-5 h-full">
        <div className="mb-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-foreground">
              {t("peakHours") || "Peak Hours"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("peakHoursDescription") || "Most active hours of the day"}
            </p>
          </div>
        </div>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <BarChart accessibilityLayer data={chartData} margin={{ top: 20 }}>
            <CartesianGrid
              vertical={false}
              strokeOpacity={0.2}
              className="stroke-muted"
            />
            <XAxis
              dataKey="hour"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={formatHour}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" fill="hsl(270, 70%, 60%)" radius={8}>
              <LabelList
                position="top"
                offset={8}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </Card>
  );
}
