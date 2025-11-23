"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  BarChart3,
  Sparkles,
  RefreshCw,
  Loader2,
  ArrowRight,
} from "lucide-react";

export default function DashboardSidebar() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [latestAnalysis, setLatestAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLatestAnalysis();
  }, []);

  const loadLatestAnalysis = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/chats/global-analysis");
      const data = await response.json();

      if (data.exists) {
        setLatestAnalysis(data.analysis);
      }
    } catch (error) {
      console.error("Error loading analysis:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const SENTIMENT_COLORS = {
    positive: "#10b981",
    neutral: "#6366f1",
    negative: "#ef4444",
    mixed: "#f59e0b",
  };

  return (
    <div className="w-80 flex-shrink-0 space-y-4">
      {/* Quick Analysis Card */}
      <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <BarChart3 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white/90">
              {t("latestAnalysis") || "Latest Analysis"}
            </h3>
            <p className="text-xs text-white/60">
              {t("quickOverview") || "Quick overview"}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-sm text-white/60">
              {t("loading") || "Loading..."}
            </p>
          </div>
        ) : latestAnalysis ? (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-white/60">{t("chats") || "Chats"}</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {latestAnalysis.total_chats}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-white/60">
                  {t("messages") || "Messages"}
                </p>
                <p className="text-2xl font-bold text-white mt-1">
                  {latestAnalysis.total_messages}
                </p>
              </div>
            </div>

            {/* Sentiment */}
            {latestAnalysis.overall_sentiment && (
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-white/60 mb-2">
                  {t("sentiment") || "Sentiment"}
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        SENTIMENT_COLORS[
                          latestAnalysis.overall_sentiment as keyof typeof SENTIMENT_COLORS
                        ] || SENTIMENT_COLORS.neutral,
                    }}
                  />
                  <span
                    className="text-sm font-medium capitalize"
                    style={{
                      color:
                        SENTIMENT_COLORS[
                          latestAnalysis.overall_sentiment as keyof typeof SENTIMENT_COLORS
                        ] || SENTIMENT_COLORS.neutral,
                    }}
                  >
                    {latestAnalysis.overall_sentiment}
                  </span>
                </div>
              </div>
            )}

            {/* Top Topics Preview */}
            {latestAnalysis.common_topics &&
              Array.isArray(latestAnalysis.common_topics) &&
              latestAnalysis.common_topics.length > 0 && (
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-white/60 mb-2">
                    {t("topTopics") || "Top Topics"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {latestAnalysis.common_topics
                      .slice(0, 4)
                      .map((topic: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-xs text-purple-300"
                        >
                          {topic}
                        </span>
                      ))}
                    {latestAnalysis.common_topics.length > 4 && (
                      <span className="px-2 py-1 text-xs text-white/60">
                        +{latestAnalysis.common_topics.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )}

            {/* Summary Preview */}
            {latestAnalysis.overall_summary && (
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-white/60 mb-2">
                  {t("summary") || "Summary"}
                </p>
                <p className="text-xs text-white/70 line-clamp-3">
                  {latestAnalysis.overall_summary}
                </p>
              </div>
            )}

            {/* View Full Button */}
            <Button
              onClick={() => router.push("/protected/analytics")}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {t("viewFullAnalysis") || "View Full Analysis"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            {/* Last Updated */}
            {latestAnalysis.updated_at && (
              <p className="text-xs text-white/40 text-center">
                {t("lastUpdated") || "Last updated"}:{" "}
                {new Date(latestAnalysis.updated_at).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <TrendingUp className="w-12 h-12 text-white/20" />
            <p className="text-sm text-white/60 text-center">
              {t("noAnalysisYet") || "No analysis yet"}
            </p>
            <Button
              onClick={() => router.push("/protected/analytics")}
              size="sm"
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              <Sparkles className="w-3 h-3 mr-2" />
              {t("createFirst") || "Create First"}
            </Button>
          </div>
        )}
      </Card>

      {/* Refresh Button */}
      {latestAnalysis && (
        <Button
          onClick={loadLatestAnalysis}
          variant="outline"
          className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
          size="sm"
        >
          <RefreshCw className="w-3 h-3 mr-2" />
          {t("refresh") || "Refresh"}
        </Button>
      )}
    </div>
  );
}
