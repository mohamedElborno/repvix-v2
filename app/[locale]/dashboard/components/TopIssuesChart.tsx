"use client";

import { useTranslations } from "next-intl";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";

interface TopIssuesChartProps {
  data: Array<{ issue: string; count: number }>;
}

export default function TopIssuesChart({ data }: TopIssuesChartProps) {
  const t = useTranslations("dashboard");

  const chartData = data.slice(0, 10).map((item) => ({
    name: item.issue.length > 20 ? item.issue.substring(0, 20) + "..." : item.issue,
    count: item.count,
    fullName: item.issue,
  }));

  return (
    <Card className="border-white/10 bg-white/5 p-6">
      <h3 className="text-lg font-semibold text-white/90 mb-4">
        {t("topIssues") || "Top Issues"}
      </h3>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9ca3af" />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#9ca3af"
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
              formatter={(value: number, _name: string, props: any) => [
                value,
                props.payload.fullName,
              ]}
            />
            <Bar dataKey="count" fill="hsl(270, 70%, 60%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[300px] text-gray-400">
          {t("noData") || "No data available"}
        </div>
      )}
    </Card>
  );
}

