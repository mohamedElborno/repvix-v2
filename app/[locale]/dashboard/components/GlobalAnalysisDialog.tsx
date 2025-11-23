/* "use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  TrendingUp,
  Loader2,
  BarChart3,
  X,
  RefreshCw,
  Sparkles,
  Brain,
  Target,
  Heart,
  CheckCircle2,
  Lightbulb,
  MessageSquare,
  Activity,
  Clock,
  AlertTriangle,
  Users,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { GlobalAnalysis } from "@/lib/types/database";

// Extended type to include all fields from API response
type ExtendedGlobalAnalysis = GlobalAnalysis & {
  avg_sentiment_score?: number;
  avg_empathy_ratio?: number;
  avg_resolution_efficiency?: number;
  behavioral_insights?: Record<string, any>;
  performance_trends?: Array<{
    pattern: string;
    impact: string;
    evidence: string;
  }>;
  team_recommendations?: string[];
  top_topics?: string[];
  temporal_dynamics?: Array<{
    pattern: string;
    impact: string;
  }>;
  root_cause_trends?: string[];
  negotiation_trends?: Record<string, any>;
};

interface GlobalAnalysisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const SENTIMENT_COLORS = {
  positive: "#10b981",
  neutral: "#6366f1",
  negative: "#ef4444",
  mixed: "#f59e0b",
};

const CHART_COLORS = [
  "#8b5cf6",
  "#ec4899",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
];

export default function GlobalAnalysisDialog({
  isOpen,
  onClose,
}: GlobalAnalysisDialogProps) {
  const t = useTranslations("dashboard");
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ExtendedGlobalAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAnalysis = async (forceRegenerate = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const userLocale = window.location.pathname.split("/")[1] || "en";

      const response = await fetch("/api/chats/global-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: userLocale,
          forceRegenerate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate analysis");
      }

      setAnalysis(data.analysis);
    } catch (err) {
      console.error("Error generating global analysis:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadExisting = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chats/global-analysis");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load analysis");
      }

      if (data.exists) {
        setAnalysis(data.analysis);
      } else {
        await handleGenerateAnalysis(false);
      }
    } catch (err) {
      console.error("Error loading global analysis:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !analysis && !isLoading) {
      handleLoadExisting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  // تحضير بيانات المقاييس للرسم البياني
  const metricsData = analysis
    ? [
        {
          name: "Sentiment",
          value: analysis.avg_sentiment_score
            ? Math.round((analysis.avg_sentiment_score + 1) * 50)
            : 50,
          fill: "#8b5cf6",
        },
        {
          name: "Empathy",
          value: analysis.avg_empathy_ratio
            ? Math.round(analysis.avg_empathy_ratio * 100)
            : 0,
          fill: "#ec4899",
        },
        {
          name: "Resolution",
          value: analysis.avg_resolution_efficiency
            ? Math.round(analysis.avg_resolution_efficiency * 100)
            : 0,
          fill: "#10b981",
        },
      ]
    : [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-white/10 rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
     
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                {t("globalAnalysis") || "Global Analysis"}
              </h2>
              <p className="text-sm text-white/60 mt-1">
                {t("analyzeAllChats") ||
                  "Comprehensive analysis of all your conversations"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {analysis && (
              <Button
                onClick={() => handleGenerateAnalysis(true)}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                {t("regenerate") || "Regenerate"}
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>


        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && !analysis ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
              <p className="text-white/60">
                {t("analyzingChats") || "Analyzing all conversations..."}
              </p>
              <p className="text-sm text-white/40">
                {t("thisWillTakeAMoment") || "This may take a moment"}
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                <p className="text-red-400 font-medium">{error}</p>
                <Button
                  onClick={() => handleGenerateAnalysis(false)}
                  className="mt-4 bg-red-500/20 hover:bg-red-500/30 text-red-400"
                >
                  {t("tryAgain") || "Try Again"}
                </Button>
              </div>
            </div>
          ) : analysis ? (
            <div className="space-y-6">

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="p-4 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-purple-500/20 hover:border-purple-500/40 transition-all">
                  <p className="text-xs text-white/60 mb-1">
                    {t("totalChats") || "Total Chats"}
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {analysis.total_chats}
                  </p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-blue-500/20 hover:border-blue-500/40 transition-all">
                  <p className="text-xs text-white/60 mb-1">
                    {t("totalMessages") || "Total Messages"}
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {analysis.total_messages}
                  </p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-purple-500/20 hover:border-purple-500/40 transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-3 h-3 text-purple-400" />
                    <p className="text-xs text-white/60">
                      {t("sentimentScore") || "Sentiment"}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {analysis.avg_sentiment_score !== undefined &&
                    analysis.avg_sentiment_score !== null
                      ? analysis.avg_sentiment_score.toFixed(2)
                      : "N/A"}
                  </p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-pink-500/20 hover:border-pink-500/40 transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="w-3 h-3 text-pink-400" />
                    <p className="text-xs text-white/60">
                      {t("empathyRatio") || "Empathy"}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {analysis.avg_empathy_ratio !== undefined &&
                    analysis.avg_empathy_ratio !== null
                      ? `${Math.round(analysis.avg_empathy_ratio * 100)}%`
                      : "N/A"}
                  </p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-green-500/20 hover:border-green-500/40 transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    <p className="text-xs text-white/60">
                      {t("resolutionEfficiency") || "Resolution"}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {analysis.avg_resolution_efficiency !== undefined &&
                    analysis.avg_resolution_efficiency !== null
                      ? `${Math.round(analysis.avg_resolution_efficiency * 100)}%`
                      : "N/A"}
                  </p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-yellow-500/20 hover:border-yellow-500/40 transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-3 h-3 text-yellow-400" />
                    <p className="text-xs text-white/60">
                      {t("satisfaction") || "Satisfaction"}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {analysis.customer_satisfaction_score !== undefined &&
                    analysis.customer_satisfaction_score !== null
                      ? `${Math.round(analysis.customer_satisfaction_score * 100)}%`
                      : "N/A"}
                  </p>
                </Card>
              </div>
              {analysis.overall_summary && (
                <Card className="p-6 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-yellow-500/20">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-yellow-500/20 rounded-xl">
                      <Sparkles className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {t("overallSummary") || "Overall Summary"}
                      </h3>
                      <p className="text-white/80 leading-relaxed">
                        {analysis.overall_summary}
                      </p>
                    </div>
                  </div>
                </Card>
              )}


              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  
                {metricsData.length > 0 && (
                  <Card className="p-6 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-purple-500/20 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-purple-400" />
                      {t("performanceMetrics") || "Performance Metrics"}
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={metricsData} layout="vertical">
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#ffffff10"
                        />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          stroke="#ffffff60"
                          tick={{ fill: "#ffffff80", fontSize: 12 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke="#ffffff60"
                          tick={{ fill: "#ffffff80", fontSize: 12 }}
                          width={80}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "1px solid #ffffff20",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                          formatter={(value: number) => `${value}%`}
                        />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                          {metricsData.map((_entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}


                {analysis.overall_sentiment && (
                  <Card className="p-6 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-indigo-500/20">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-400" />
                      {t("overallSentiment") || "Overall Sentiment"}
                    </h3>
                    <div className="flex flex-col items-center justify-center h-[200px]">
                      <div
                        className="p-6 rounded-2xl mb-4"
                        style={{
                          backgroundColor:
                            SENTIMENT_COLORS[
                              analysis.overall_sentiment as keyof typeof SENTIMENT_COLORS
                            ] + "20" || "#6366f120",
                        }}
                      >
                        <Activity
                          className="w-12 h-12"
                          style={{
                            color:
                              SENTIMENT_COLORS[
                                analysis.overall_sentiment as keyof typeof SENTIMENT_COLORS
                              ] || "#6366f1",
                          }}
                        />
                      </div>
                      <p
                        className="text-2xl font-bold capitalize"
                        style={{
                          color:
                            SENTIMENT_COLORS[
                              analysis.overall_sentiment as keyof typeof SENTIMENT_COLORS
                            ] || "#6366f1",
                        }}
                      >
                        {analysis.overall_sentiment}
                      </p>
                    </div>
                  </Card>
                )}
              </div>

              {analysis.behavioral_insights &&
                Object.keys(analysis.behavioral_insights).length > 0 && (
                  <Card className="p-6 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-purple-500/20">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Brain className="w-6 h-6 text-purple-400" />
                      </div>
                      {t("behavioralInsights") || "Behavioral Insights"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(analysis.behavioral_insights).map(
                        ([key, value]) => {
                          const formattedKey = key
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase());

                          if (
                            key === "persona_summary" &&
                            typeof value === "string"
                          ) {
                            return (
                              <div
                                key={key}
                                className="md:col-span-2 lg:col-span-3 p-4 bg-zinc-900/50 border border-purple-500/20 rounded-xl"
                              >
                                <h4 className="text-white/90 text-sm font-semibold mb-3 flex items-center gap-2">
                                  <Users className="w-4 h-4 text-purple-400" />
                                  {formattedKey}
                                </h4>
                                <p className="text-white/70 text-sm leading-relaxed">
                                  {value}
                                </p>
                              </div>
                            );
                          }

                          if (typeof value === "number") {
                            const percentage = (value * 100).toFixed(0);
                            return (
                              <div
                                key={key}
                                className="p-4 bg-zinc-900/50 border border-purple-500/20 rounded-xl"
                              >
                                <p className="text-xs text-white/60 mb-2">
                                  {formattedKey}
                                </p>
                                <div className="flex items-end gap-2">
                                  <p className="text-2xl font-bold text-white">
                                    {percentage}%
                                  </p>
                                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden mb-1">
                                    <div
                                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={key}
                              className="p-4 bg-zinc-900/50 border border-purple-500/20 rounded-xl"
                            >
                              <p className="text-xs text-white/60 mb-1">
                                {formattedKey}
                              </p>
                              <p className="text-white font-medium capitalize">
                                {String(value)}
                              </p>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </Card>
                )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {analysis.top_topics && analysis.top_topics.length > 0 && (
                  <Card className="p-6 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-blue-500/20">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                      {t("topTopics") || "Top Topics"}
                    </h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {analysis.top_topics.map(
                        (topic: string, index: number) => (
                          <div
                            key={index}
                            className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center mt-0.5">
                                <span className="text-blue-400 text-xs font-bold">
                                  {index + 1}
                                </span>
                              </div>
                              <p className="text-white/80 text-sm leading-relaxed flex-1">
                                {topic}
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </Card>
                )}

                {analysis.common_topics &&
                  Array.isArray(analysis.common_topics) &&
                  analysis.common_topics.length > 0 && (
                    <Card className="p-6 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-purple-500/20">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-purple-400" />
                        {t("commonTopics") || "Common Topics"}
                      </h3>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {analysis.common_topics.map(
                          (topic: string, index: number) => (
                            <div
                              key={index}
                              className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center mt-0.5">
                                  <span className="text-purple-400 text-xs font-bold">
                                    {index + 1}
                                  </span>
                                </div>
                                <p className="text-white/80 text-sm leading-relaxed flex-1">
                                  {topic}
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </Card>
                  )}
              </div>

              {analysis.performance_trends &&
                Array.isArray(analysis.performance_trends) &&
                analysis.performance_trends.length > 0 && (
                  <Card className="p-6 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-green-500/20">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-green-400" />
                      </div>
                      {t("performanceTrends") || "Performance Trends"}
                    </h3>
                    <div className="space-y-4">
                      {analysis.performance_trends.map(
                        (trend, index: number) => (
                          <div
                            key={index}
                            className="p-5 bg-zinc-900/50 border border-green-500/20 rounded-xl hover:border-green-500/40 transition-all"
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                                <span className="text-green-400 font-bold">
                                  {index + 1}
                                </span>
                              </div>
                              <div className="flex-1 space-y-3">
                                <div>
                                  <h4 className="text-white/90 font-semibold mb-2 flex items-center gap-2">
                                    <Target className="w-4 h-4 text-green-400" />
                                    {t("pattern") || "Pattern"}
                                  </h4>
                                  <p className="text-white/70 text-sm leading-relaxed">
                                    {trend.pattern}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="text-white/90 font-semibold mb-2 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                                    {t("impact") || "Impact"}
                                  </h4>
                                  <p className="text-white/70 text-sm leading-relaxed">
                                    {trend.impact}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="text-white/90 font-semibold mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                    {t("evidence") || "Evidence"}
                                  </h4>
                                  <p className="text-white/70 text-sm leading-relaxed">
                                    {trend.evidence}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </Card>
                )}

              {analysis.temporal_dynamics &&
                Array.isArray(analysis.temporal_dynamics) &&
                analysis.temporal_dynamics.length > 0 && (
                  <Card className="p-6 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-cyan-500/20">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                      <div className="p-2 bg-cyan-500/20 rounded-lg">
                        <Clock className="w-6 h-6 text-cyan-400" />
                      </div>
                      {t("temporalDynamics") || "Temporal Dynamics"}
                    </h3>
                    <div className="space-y-4">
                      {analysis.temporal_dynamics.map(
                        (dynamic, index: number) => (
                          <div
                            key={index}
                            className="p-5 bg-zinc-900/50 border border-cyan-500/20 rounded-xl hover:border-cyan-500/40 transition-all"
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                                <Clock className="w-5 h-5 text-cyan-400" />
                              </div>
                              <div className="flex-1 space-y-3">
                                <div>
                                  <h4 className="text-white/90 font-semibold mb-2">
                                    {t("pattern") || "Pattern"}
                                  </h4>
                                  <p className="text-white/70 text-sm leading-relaxed">
                                    {dynamic.pattern}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="text-white/90 font-semibold mb-2">
                                    {t("impact") || "Impact"}
                                  </h4>
                                  <p className="text-white/70 text-sm leading-relaxed">
                                    {dynamic.impact}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </Card>
                )}

              {analysis.root_cause_trends &&
                Array.isArray(analysis.root_cause_trends) &&
                analysis.root_cause_trends.length > 0 && (
                  <Card className="p-6 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-red-500/20">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                      <div className="p-2 bg-red-500/20 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-red-400" />
                      </div>
                      {t("rootCauseTrends") || "Root Cause Trends"}
                    </h3>
                    <div className="space-y-3">
                      {analysis.root_cause_trends.map(
                        (trend: string, index: number) => (
                          <div
                            key={index}
                            className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                              <p className="text-white/80 text-sm leading-relaxed flex-1">
                                {trend}
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </Card>
                )}

              {analysis.team_recommendations &&
                analysis.team_recommendations.length > 0 && (
                  <Card className="p-6 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-yellow-500/20">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/20 rounded-lg">
                        <Lightbulb className="w-6 h-6 text-yellow-400" />
                      </div>
                      {t("teamRecommendations") || "Team Recommendations"}
                    </h3>
                    <div className="space-y-4">
                      {analysis.team_recommendations.map((rec, index) => (
                        <div
                          key={index}
                          className="p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl hover:border-yellow-500/40 transition-all"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                              <Target className="w-5 h-5 text-yellow-400" />
                            </div>
                            <p className="text-white/80 text-sm leading-relaxed flex-1">
                              {rec}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

              {analysis.date_range_start && analysis.date_range_end && (
                <Card className="p-4 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-white/10">
                  <div className="flex items-center justify-center gap-2 text-sm text-white/60">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {t("analysisDateRange") || "Analysis Period"}:{" "}
                      <span className="text-white/80 font-medium">
                        {new Date(
                          analysis.date_range_start
                        ).toLocaleDateString()}{" "}
                        -{" "}
                        {new Date(analysis.date_range_end).toLocaleDateString()}
                      </span>
                    </span>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <TrendingUp className="w-16 h-16 text-white/20" />
              <p className="text-white/60 text-center max-w-md">
                {t("noAnalysisYet") ||
                  "Generate a comprehensive analysis of all your conversations"}
              </p>
              <Button
                onClick={() => handleGenerateAnalysis(false)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t("generateAnalysis") || "Generate Analysis"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
 */
