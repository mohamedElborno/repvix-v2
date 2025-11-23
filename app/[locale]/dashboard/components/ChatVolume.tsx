"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";
import { Card } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type VolumePoint = { day: string; total: number };

export default function ChatVolume() {
  const [data, setData] = useState<VolumePoint[]>([]);
  const [days, setDays] = useState<number>(14);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/chats/volume-trends?days=${days}`);
        const json = await res.json();
        if (isMounted) {
          setData(json.data || []);
        }
      } catch {
        if (isMounted) {
          setData([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [days]);

  const chartConfig = useMemo(() => {
    return {
      total: { label: "Total", color: "hsl(270, 70%, 60%)" }, // بنفسجي
    } as ChartConfig;
  }, []);

  const formatDay = (value: string) => {
    const d = new Date(value);
    return d.toLocaleString(undefined, { day: "numeric", month: "short" });
  };

  return (
    <Card className="border-white/10 bg-white/5 h-[500px] w-full">
      <div className="p-4 md:p-5 h-full">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-semibold text-white/90">
                Chats Volume
              </h3>
              <p className="text-xs text-white/50">Last {days} days</p>
            </div>
          </div>

          {/* Time Period Selector */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1">
            {[
              { value: 14, label: "14d" },
              { value: 30, label: "30d" },
              { value: 90, label: "90d" },
            ].map((period) => (
              <button
                key={period.value}
                onClick={() => setDays(period.value)}
                className={`
                  relative px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200
                  ${
                    days === period.value
                      ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30"
                      : "text-white/60 hover:text-white/90 hover:bg-white/5"
                  }
                `}
              >
                {period.label}
                {days === period.value && (
                  <div className="absolute inset-0 rounded-md bg-purple-500/20 blur-sm -z-10"></div>
                )}
              </button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <div className="h-[350px] w-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-white/60 text-sm">Loading chart data...</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[350px] w-full flex items-center justify-center">
            <p className="text-white/60 text-sm">No data available</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <BarChart accessibilityLayer data={data} margin={{ top: 20 }}>
              <CartesianGrid vertical={false} strokeOpacity={0.2} />
              <XAxis
                dataKey="day"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={formatDay}
                stroke="#999"
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="total" fill="hsl(270, 70%, 60%)" radius={8}>
                <LabelList
                  position="top"
                  offset={8}
                  className="fill-foreground"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </Card>
  );
}
