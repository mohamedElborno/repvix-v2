"use client";

import { useEffect, useState } from "react";
// import { TrendingUp } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
import { Card } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { Id } from "@/convex/_generated/dataModel";

type SkillData = {
  name: string;
  score: number;
  explanation: string;
};

type SkillsRadarProps = {
  chatId: string | Id<"chats">;
};

export default function SkillsRadar({ chatId }: SkillsRadarProps) {
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSkills = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/chats/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            forceRegenerate: false,
            onlyIfCached: false, // Allow fetching even if not cached
          }),
        });

        if (response.ok) {
          const data = await response.json();

          if (
            data.analysis?.skills &&
            Array.isArray(data.analysis.skills) &&
            data.analysis.skills.length > 0
          ) {
            // Ensure skills have the correct structure
            const validSkills = data.analysis.skills.filter(
              (skill: any) =>
                skill &&
                typeof skill === "object" &&
                typeof skill.name === "string" &&
                (typeof skill.score === "number" ||
                  typeof skill.score === "string")
            );
            setSkills(validSkills);
          } else {
            setSkills([]);
          }
        } else {
          console.error(
            "Failed to fetch skills:",
            response.status,
            response.statusText
          );
          setSkills([]);
        }
      } catch (error) {
        console.error("Error loading skills:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSkills();
  }, [chatId]);

  // Transform skills data for radar chart
  const chartData = skills.map((skill) => ({
    skill: skill.name,
    score:
      typeof skill.score === "string" ? parseFloat(skill.score) : skill.score,
  }));

  const chartConfig = {
    score: {
      label: "Score",
      color: "hsl(262.1 83.3% 57.8%)", // Purple color
    },
  } satisfies ChartConfig;

  if (isLoading) {
    return (
      <Card className="border-white/10 bg-white/5 h-[400px] w-full">
        <div className="p-4 md:p-5 h-full flex items-center justify-center">
          <div className="text-white/60">Loading skills analysis...</div>
        </div>
      </Card>
    );
  }

  if (skills.length === 0) {
    return (
      <Card className="border-white/10 bg-white/5 h-[400px] w-full">
        <div className="p-4 md:p-5 h-full flex flex-col items-center justify-center space-y-3">
          <div className="text-white/60">No skills data available</div>
          <div className="text-xs text-white/40 text-center">
            Skills analysis will appear here after running the analysis
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-white/10 bg-white/5 h-[500px] w-full">
      <div className="p-4 md:p-5 h-[500px]">
        <div className="mb-4">
          <h3 className="text-base md:text-lg font-semibold text-white/90 mb-2">
            Skills Analysis
          </h3>
          <p className="text-sm text-white/60">
            Performance scores for different skills (0-10 scale)
          </p>
        </div>

        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[350px]"
        >
          <RadarChart data={chartData}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis
              dataKey="skill"
              tick={{ fill: "#999", fontSize: 12 }}
            />
            <PolarGrid stroke="#333" strokeOpacity={0.3} />
            <Radar
              dataKey="score"
              fill="var(--color-score)"
              fillOpacity={0.3}
              stroke="var(--color-score)"
              strokeWidth={2}
            />
          </RadarChart>
        </ChartContainer>

        <div className="mt-4 space-y-3">
          {skills.map((skill, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/70 capitalize">{skill.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">
                    {skill.score}/10
                  </span>
                  <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                      style={{
                        width: `${
                          ((typeof skill.score === "string"
                            ? parseFloat(skill.score)
                            : skill.score) /
                            10) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                {skill.explanation}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
