"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { Card } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";

type TrendPoint = { day: string; [sentiment: string]: number | string };

export default function SentimentTrends() {
  const [data, setData] = useState<TrendPoint[]>([]);
  const [days, setDays] = useState<number>(14);
  const [sentiments, setSentiments] = useState<string[]>([
    "positive",
    "neutral",
    "negative",
    "curious",
    "emotional",
    "mixed",
    "angry",
    "frustrated",
    "grateful",
    "hopeful",
    "excited",
    "disappointed",
    "surprised",
    "confused",
    "satisfied",
    "unsure",
  ]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/chats/sentiment-trends?days=${days}`);
        const json = await res.json();
        setData(json.data || []);
        if (Array.isArray(json.sentiments)) setSentiments(json.sentiments);
      } catch {
        setData([]);
      }
    };
    load();
  }, [days]);

  const chartConfig = useMemo(() => {
    // Formal, theme-friendly palette per sentiment (muted saturation)
    const sentimentColorMap: Record<string, string> = {
      positive: "hsl(152 50% 46%)", // emerald
      neutral: "hsl(215 16% 47%)", // slate
      negative: "hsl(0 65% 55%)", // red
      mixed: "hsl(268 45% 55%)", // purple
      angry: "hsl(4 70% 52%)", // strong red
      frustrated: "hsl(20 80% 52%)", // orange
      grateful: "hsl(171 50% 45%)", // teal
      hopeful: "hsl(199 70% 48%)", // sky
      excited: "hsl(262 60% 55%)", // violet
      disappointed: "hsl(28 70% 52%)", // amber
      surprised: "hsl(190 70% 45%)", // cyan
      confused: "hsl(220 14% 60%)", // grayish
      satisfied: "hsl(142 48% 45%)", // green
      unsure: "hsl(215 10% 55%)", // neutral gray
      curious: "hsl(46 80% 52%)", // yellow/gold
      emotional: "hsl(330 55% 55%)", // pink
    };

    const cfg: Record<string, { label: string; color: string }> = {};
    sentiments.forEach((s) => {
      const key = s.toLowerCase();
      cfg[s] = {
        label: key[0].toUpperCase() + key.slice(1),
        color: sentimentColorMap[key] || "hsl(var(--chart-2))",
      };
    });
    return cfg as ChartConfig;
  }, [sentiments]);

  const formatDay = (value: string) => {
    // value like YYYY-MM-DD
    const d = new Date(value);
    return d.toLocaleString(undefined, { day: "numeric", month: "short" });
  };

  // Custom tooltip component with colors
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-white/10 bg-neutral-900/95 p-3 shadow-lg backdrop-blur-sm">
          <p className="text-sm font-medium text-white/90">
            {formatDay(label)}
          </p>
          <div className="space-y-1">
            {payload
              .filter((item: { value: number }) => item.value > 0)
              .map(
                (item: { dataKey: string; color: string; value: number }) => (
                  <div
                    key={item.dataKey}
                    className="flex items-center gap-2 mt-2"
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-white/70">
                      {chartConfig[item.dataKey]?.label || item.dataKey}:
                    </span>
                    <span className="text-xs font-medium text-white">
                      {item.value}
                    </span>
                  </div>
                )
              )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-white/10 bg-white/5 h-[500px] w-full">
      <div className="p-4 md:p-5 h-[500px]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base md:text-lg font-semibold text-white/90">
            Sentiment Trends
          </h3>
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-white/5 border border-white/10 text-white text-xs rounded-md px-2 py-1"
            >
              <option value={14}>Last 14d</option>
              <option value={30}>Last 30d</option>
              <option value={90}>Last 90d</option>
            </select>
            <TrendingUp className="h-4 w-4 text-white/60" />
          </div>
        </div>
        <p className="text-sm text-white/60 mb-4">Last {days} days</p>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} strokeOpacity={0.2} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatDay}
              stroke="#999"
            />
            <ChartTooltip cursor={false} content={<CustomTooltip />} />
            {sentiments.map((s) => (
              <Line
                key={s}
                dataKey={s}
                type="monotone"
                stroke={chartConfig[s]?.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </div>
    </Card>
  );
}
