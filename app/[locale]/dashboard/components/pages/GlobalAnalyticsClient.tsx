"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  TrendingUp,
  Loader2,
  BarChart3,
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
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

// Extended type to include all fields from API response
type ExtendedGlobalAnalysis = {
  total_chats?: number;
  customer_satisfaction_score?: number;
  overall_summary?: string;
  overall_sentiment?: string;
  peak_hours?: Array<{
    hour: number;
    count: number;
  }>;
  common_topics?: string[];
  date_range_start?: number;
  date_range_end?: number;
  common_issues?: string[];
  avg_response_time?: number;
  resolution_rate?: number;
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
    evidence?: string;
  }>;
  root_cause_trends?: string[];
  negotiation_trends?: Record<string, any>;
  global_faq_summary?: Array<{
    question: string;
    answer: string;
  }>;
};

interface GlobalAnalyticsClientProps {
  user: {
    id: string;
    email: string;
  };
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

// FAQ Item Component with smooth animation
function FAQItem({
  faq,
  index,
}: {
  faq: { question: string; answer: string };
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="group/item bg-zinc-900/50 rounded-xl border border-zinc-700/30 hover:border-indigo-500/50 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 sm:p-5 flex items-start justify-between gap-4 text-left hover:bg-zinc-800/50 transition-colors duration-200"
      >
        <div className="flex items-start gap-3 sm:gap-4 flex-1">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center mt-0.5 group-hover/item:scale-110 transition-transform duration-300">
            <span className="text-indigo-400 text-sm font-bold">
              {index + 1}
            </span>
          </div>
          <div className="flex-1">
            <h4 className="text-white font-semibold text-sm leading-relaxed break-words">
              {faq.question}
            </h4>
          </div>
        </div>
        <div className="flex-shrink-0 transition-transform duration-300">
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-indigo-400 rotate-180" />
          ) : (
            <ChevronDown className="w-5 h-5 text-indigo-400" />
          )}
        </div>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pl-14 sm:pl-16 border-t border-zinc-700/30">
          <p className="text-gray-300 text-sm leading-relaxed mt-4 break-words">
            {faq.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function GlobalAnalyticsClient({
  user: _user,
}: GlobalAnalyticsClientProps) {
  const t = useTranslations("dashboard");
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ExtendedGlobalAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  const languages = [
    { code: "ar", name: "العربية" },
    { code: "en", name: "English" },
    { code: "fr", name: "Français" },
    { code: "tr", name: "Türkçe" },
    { code: "es", name: "Español" },
    { code: "hi", name: "हिन्दी" },
  ];

  const handleGenerateAnalysis = async (
    language: string,
    forceRegenerate = false
  ) => {
    setIsLoading(true);
    setError(null);
    setShowLanguageModal(false);

    try {
      const response = await fetch("/api/chats/global-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: language,
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

  const handleGenerateClick = (forceRegenerate = false) => {
    // Check if analysis exists
    if (analysis && !forceRegenerate) {
      // If analysis exists and not forcing regenerate, just show it
      return;
    }
    // Show language selection modal
    const userLocale = window.location.pathname.split("/")[1] || "en";
    setSelectedLanguage(userLocale);
    setShowLanguageModal(true);
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
        // Show language modal instead of auto-generating
        const userLocale = window.location.pathname.split("/")[1] || "en";
        setSelectedLanguage(userLocale);
        setShowLanguageModal(true);
      }
    } catch (err) {
      console.error("Error loading global analysis:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!analysis && !isLoading) {
      handleLoadExisting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="min-h-[calc(100vh-110px)]">
      {/* Header with gradient background */}
      <div className="sticky px-3 sm:px-4 md:px-6 lg:px-8 mx-auto top-0 z-10 bg-zinc-950/70 backdrop-blur-xl border-b border-purple-500/10 rounded-2xl mb-6">
        <div className="py-3 sm:py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-purple-300 bg-clip-text text-transparent">
                  {t("globalAnalysis") || "Global Analysis"}
                </h1>
                <p className="text-gray-400 mt-1 text-xs sm:text-sm">
                  {t("analyzeAllChats") ||
                    "Comprehensive analysis of all your conversations"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {analysis && (
                <Button
                  onClick={() => handleGenerateClick(true)}
                  disabled={isLoading}
                  className="group relative bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/30 rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/40"
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""} group-hover:rotate-180 transition-transform duration-500`}
                  />
                  {t("regenerate") || "Regenerate"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        {isLoading && !analysis ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 md:py-32">
            {/* Loading Spinner */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-6 sm:mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4 text-center">
              {t("analyzingChats") || "Analyzing all conversations..."}
            </h3>
            <p className="text-sm sm:text-base text-gray-400 text-center max-w-md px-4">
              {t("thisWillTakeAMoment") || "This may take a moment"}
            </p>
            <div className="flex items-center gap-2 mt-4">
              <div
                className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: "0s" }}
              ></div>
              <div
                className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 md:py-32">
            <div className="relative group bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-8 border border-red-500/20 text-center max-w-md">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-600/20 via-red-500/10 to-red-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-400 font-medium text-lg mb-4">{error}</p>
                <Button
                  onClick={() => handleGenerateClick(false)}
                  className="bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 text-red-400 border border-red-500/30 hover:border-red-500/50 transition-all duration-300"
                >
                  {t("tryAgain") || "Try Again"}
                </Button>
              </div>
            </div>
          </div>
        ) : analysis ? (
          <div className="space-y-4 sm:space-y-6 md:space-y-8">
            {/* Stats Overview with Gradient Glow */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-pink-500/10 to-purple-600/20 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-purple-500/20">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-purple-300 bg-clip-text text-transparent">
                    {t("keyMetrics") || "Key Metrics"}
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                  <div className="group/card relative bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/30 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                    <p className="text-xs text-gray-400 mb-2 uppercase">
                      {t("totalChats") || "Total Chats"}
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {analysis.total_chats}
                    </p>
                  </div>
                  <div className="group/card relative bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/30 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover/card:scale-110 transition-transform duration-300">
                        <Heart className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <p className="text-xs text-gray-400 uppercase">
                        {t("sentimentScore") || "Sentiment"}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {analysis.avg_sentiment_score !== undefined &&
                      analysis.avg_sentiment_score !== null
                        ? analysis.avg_sentiment_score.toFixed(2)
                        : "N/A"}
                    </p>
                  </div>
                  <div className="group/card relative bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/30 hover:border-pink-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-pink-500/20 flex items-center justify-center group-hover/card:scale-110 transition-transform duration-300">
                        <Brain className="w-3.5 h-3.5 text-pink-400" />
                      </div>
                      <p className="text-xs text-gray-400 uppercase">
                        {t("empathyRatio") || "Empathy"}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {analysis.avg_empathy_ratio !== undefined &&
                      analysis.avg_empathy_ratio !== null
                        ? `${Math.round(analysis.avg_empathy_ratio * 100)}%`
                        : "N/A"}
                    </p>
                  </div>
                  <div className="group/card relative bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/30 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center group-hover/card:scale-110 transition-transform duration-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      </div>
                      <p className="text-xs text-gray-400 uppercase">
                        {t("resolutionEfficiency") || "Resolution"}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {analysis.avg_resolution_efficiency !== undefined &&
                      analysis.avg_resolution_efficiency !== null
                        ? `${Math.round(analysis.avg_resolution_efficiency * 100)}%`
                        : "N/A"}
                    </p>
                  </div>
                  <div className="group/card relative bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/30 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-yellow-500/20 flex items-center justify-center group-hover/card:scale-110 transition-transform duration-300">
                        <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
                      </div>
                      <p className="text-xs text-gray-400 uppercase">
                        {t("satisfaction") || "Satisfaction"}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {analysis.customer_satisfaction_score !== undefined &&
                      analysis.customer_satisfaction_score !== null
                        ? `${Math.round(analysis.customer_satisfaction_score * 100)}%`
                        : analysis.avg_sentiment_score !== undefined &&
                            analysis.avg_sentiment_score !== null
                          ? `${Math.round(((analysis.avg_sentiment_score + 1) / 2) * 100)}%`
                          : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Summary */}
            {analysis.overall_summary && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-600/20 via-amber-500/10 to-yellow-600/20 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-yellow-500/20">
                  <div className="flex items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30 shrink-0">
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-yellow-200 to-amber-200 bg-clip-text text-transparent mb-2">
                        {t("overallSummary") || "Overall Summary"}
                      </h2>
                      <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-yellow-500 to-transparent rounded-full"></div>
                    </div>
                  </div>
                  <div className="bg-zinc-900/50 rounded-xl p-4 sm:p-6 border border-zinc-700/30">
                    <p className="text-sm sm:text-base text-gray-300 leading-relaxed break-words">
                      {analysis.overall_summary}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Metrics Chart & Overall Sentiment */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Performance Metrics Chart */}
              {metricsData.length > 0 && (
                <div className="relative group lg:col-span-2">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-pink-500/10 to-purple-600/20 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                  <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-purple-500/20">
                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
                        <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                        {t("performanceMetrics") || "Performance Metrics"}
                      </h2>
                    </div>
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
                  </div>
                </div>
              )}

              {/* Overall Sentiment */}
              {analysis.overall_sentiment && (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600/20 via-blue-500/10 to-indigo-600/20 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                  <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-indigo-500/20 h-full">
                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                        <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-indigo-200 to-blue-200 bg-clip-text text-transparent">
                        {t("overallSentiment") || "Overall Sentiment"}
                      </h2>
                    </div>
                    <div className="flex flex-col items-center justify-center h-[200px]">
                      <div
                        className="p-6 sm:p-8 rounded-xl mb-4 transition-transform duration-300 hover:scale-110"
                        style={{
                          backgroundColor:
                            SENTIMENT_COLORS[
                              analysis.overall_sentiment as keyof typeof SENTIMENT_COLORS
                            ] + "20" || "#6366f120",
                        }}
                      >
                        <Activity
                          className="w-12 h-12 sm:w-16 sm:h-16"
                          style={{
                            color:
                              SENTIMENT_COLORS[
                                analysis.overall_sentiment as keyof typeof SENTIMENT_COLORS
                              ] || "#6366f1",
                          }}
                        />
                      </div>
                      <p
                        className="text-2xl sm:text-3xl font-bold capitalize"
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
                  </div>
                </div>
              )}
            </div>

            {/* Behavioral Insights */}
            {analysis.behavioral_insights &&
              Object.keys(analysis.behavioral_insights).length > 0 && (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-pink-500/10 to-purple-600/20 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                  <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-purple-500/20">
                    <div className="flex items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
                        <Brain className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-2">
                          {t("behavioralInsights") || "Behavioral Insights"}
                        </h2>
                        <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-purple-500 to-transparent rounded-full"></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                                className="md:col-span-2 lg:col-span-3 bg-zinc-900/50 rounded-xl p-4 sm:p-6 border border-zinc-700/30 hover:border-purple-500/50 transition-all duration-300"
                              >
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                    <Users className="w-4 h-4 text-purple-400" />
                                  </div>
                                  <h4 className="text-sm font-semibold text-gray-300">
                                    {formattedKey}
                                  </h4>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed break-words">
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
                                className="group/card bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/30 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
                              >
                                <p className="text-xs text-gray-400 mb-2 uppercase">
                                  {formattedKey}
                                </p>
                                <div className="flex items-end gap-2">
                                  <p className="text-2xl font-bold text-white">
                                    {percentage}%
                                  </p>
                                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden mb-1">
                                    <div
                                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
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
                              className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/30 hover:border-purple-500/50 transition-all duration-300"
                            >
                              <p className="text-xs text-gray-400 mb-1 uppercase">
                                {formattedKey}
                              </p>
                              <p className="text-white font-medium capitalize break-words">
                                {String(value)}
                              </p>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* Top Topics & Common Topics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Top Topics */}
              {analysis.top_topics && analysis.top_topics.length > 0 && (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-cyan-500/10 to-blue-600/20 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                  <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-blue-500/20">
                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-blue-200 to-cyan-200 bg-clip-text text-transparent">
                        {t("topTopics") || "Top Topics"}
                      </h2>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {analysis.top_topics.map(
                        (topic: string, index: number) => (
                          <div
                            key={index}
                            className="group/item bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/30 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center mt-0.5 group-hover/item:scale-110 transition-transform duration-300">
                                <span className="text-blue-400 text-xs font-bold">
                                  {index + 1}
                                </span>
                              </div>
                              <p className="text-gray-300 text-sm leading-relaxed flex-1 break-words">
                                {topic}
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Common Topics */}
              {analysis.common_topics &&
                Array.isArray(analysis.common_topics) &&
                analysis.common_topics.length > 0 && (
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-pink-500/10 to-purple-600/20 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                    <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-purple-500/20">
                      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
                          <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                          {t("commonTopics") || "Common Topics"}
                        </h2>
                      </div>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {analysis.common_topics.map(
                          (topic: string, index: number) => (
                            <div
                              key={index}
                              className="group/item bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/30 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mt-0.5 group-hover/item:scale-110 transition-transform duration-300">
                                  <span className="text-purple-400 text-xs font-bold">
                                    {index + 1}
                                  </span>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed flex-1 break-words">
                                  {topic}
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}
            </div>

            {/* Performance Trends */}
            {analysis.performance_trends &&
              Array.isArray(analysis.performance_trends) &&
              analysis.performance_trends.length > 0 && (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-green-600/20 via-emerald-500/10 to-green-600/20 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                  <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-green-500/20">
                    <div className="flex items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30 shrink-0">
                        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-green-200 to-emerald-200 bg-clip-text text-transparent mb-2">
                          {t("performanceTrends") || "Performance Trends"}
                        </h2>
                        <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-green-500 to-transparent rounded-full"></div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {analysis.performance_trends.map(
                        (trend, index: number) => (
                          <div
                            key={index}
                            className="group/item bg-zinc-900/50 rounded-xl p-4 sm:p-6 border border-zinc-700/30 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10"
                          >
                            <div className="flex items-start gap-3 sm:gap-4">
                              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center group-hover/item:scale-110 transition-transform duration-300">
                                <span className="text-green-400 font-bold text-sm sm:text-base">
                                  {index + 1}
                                </span>
                              </div>
                              <div className="flex-1 space-y-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Target className="w-4 h-4 text-green-400" />
                                    <h4 className="text-sm font-semibold text-gray-300">
                                      {t("pattern") || "Pattern"}
                                    </h4>
                                  </div>
                                  <p className="text-gray-300 text-sm leading-relaxed break-words">
                                    {trend.pattern}
                                  </p>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                                    <h4 className="text-sm font-semibold text-gray-300">
                                      {t("impact") || "Impact"}
                                    </h4>
                                  </div>
                                  <p className="text-gray-300 text-sm leading-relaxed break-words">
                                    {trend.impact}
                                  </p>
                                </div>
                                {trend.evidence && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                      <h4 className="text-sm font-semibold text-gray-300">
                                        {t("evidence") || "Evidence"}
                                      </h4>
                                    </div>
                                    <p className="text-gray-300 text-sm leading-relaxed break-words">
                                      {trend.evidence}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* Temporal Dynamics */}
            {analysis.temporal_dynamics &&
              Array.isArray(analysis.temporal_dynamics) &&
              analysis.temporal_dynamics.length > 0 && (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600/20 via-blue-500/10 to-cyan-600/20 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                  <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-cyan-500/20">
                    <div className="flex items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 shrink-0">
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-cyan-200 to-blue-200 bg-clip-text text-transparent mb-2">
                          {t("temporalDynamics") || "Temporal Dynamics"}
                        </h2>
                        <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-cyan-500 to-transparent rounded-full"></div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {analysis.temporal_dynamics.map(
                        (dynamic, index: number) => (
                          <div
                            key={index}
                            className="group/item bg-zinc-900/50 rounded-xl p-4 sm:p-6 border border-zinc-700/30 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
                          >
                            <div className="flex items-start gap-3 sm:gap-4">
                              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center group-hover/item:scale-110 transition-transform duration-300">
                                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                              </div>
                              <div className="flex-1 space-y-4">
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-300 mb-2">
                                    {t("pattern") || "Pattern"}
                                  </h4>
                                  <p className="text-gray-300 text-sm leading-relaxed break-words">
                                    {dynamic.pattern}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-300 mb-2">
                                    {t("impact") || "Impact"}
                                  </h4>
                                  <p className="text-gray-300 text-sm leading-relaxed break-words">
                                    {dynamic.impact}
                                  </p>
                                </div>
                                {dynamic.evidence &&
                                  typeof dynamic.evidence === "string" && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-300 mb-2">
                                        {t("evidence") || "Evidence"}
                                      </h4>
                                      <p className="text-gray-300 text-sm leading-relaxed break-words">
                                        {dynamic.evidence}
                                      </p>
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* Root Cause Trends */}
            {analysis.root_cause_trends &&
              Array.isArray(analysis.root_cause_trends) &&
              analysis.root_cause_trends.length > 0 && (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-red-600/20 via-orange-500/10 to-red-600/20 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                  <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-red-500/20">
                    <div className="flex items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/30 shrink-0">
                        <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-red-200 to-orange-200 bg-clip-text text-transparent mb-2">
                          {t("rootCauseTrends") || "Root Cause Trends"}
                        </h2>
                        <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-red-500 to-transparent rounded-full"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {analysis.root_cause_trends.map(
                        (trend: string, index: number) => (
                          <div
                            key={index}
                            className="group/item bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/30 hover:border-red-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10"
                          >
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-300" />
                              <p className="text-gray-300 text-sm leading-relaxed flex-1 break-words">
                                {trend}
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* Team Recommendations */}
            {analysis.team_recommendations &&
              analysis.team_recommendations.length > 0 && (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-yellow-600/20 via-amber-500/10 to-yellow-600/20 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                  <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-yellow-500/20">
                    <div className="flex items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30 shrink-0">
                        <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-yellow-200 to-amber-200 bg-clip-text text-transparent mb-2">
                          {t("teamRecommendations") || "Team Recommendations"}
                        </h2>
                        <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-yellow-500 to-transparent rounded-full"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {analysis.team_recommendations.map((rec, index) => (
                        <div
                          key={index}
                          className="group/item bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/30 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 flex items-center justify-center mt-0.5 group-hover/item:scale-110 transition-transform duration-300">
                              <Target className="w-4 h-4 text-yellow-400" />
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed flex-1 break-words">
                              {rec}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            {/* Global FAQs */}
            {analysis.global_faq_summary &&
              Array.isArray(analysis.global_faq_summary) &&
              analysis.global_faq_summary.length > 0 && (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600/20 via-blue-500/10 to-indigo-600/20 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                  <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-indigo-500/20">
                    <div className="flex items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                        <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-indigo-200 to-blue-200 bg-clip-text text-transparent mb-2">
                          {t("frequentlyAskedQuestions") ||
                            "Frequently Asked Questions"}
                        </h2>
                        <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-indigo-500 to-transparent rounded-full"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {analysis.global_faq_summary.map((faq, index) => (
                        <FAQItem key={index} faq={faq} index={index} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

            {/* Date Range */}
            {analysis.date_range_start && analysis.date_range_end && (
              <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {t("analysisDateRange") || "Analysis Period"}:{" "}
                    <span className="text-white font-medium">
                      {new Date(analysis.date_range_start).toLocaleDateString()}{" "}
                      - {new Date(analysis.date_range_end).toLocaleDateString()}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 md:py-32">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 flex items-center justify-center mb-6">
              <TrendingUp className="w-10 h-10 text-gray-600" />
            </div>
            <p className="text-gray-400 text-center max-w-md text-lg font-medium mb-2">
              {t("noAnalysisYet") ||
                "Generate a comprehensive analysis of all your conversations"}
            </p>
            <Button
              onClick={() => handleGenerateClick(false)}
              className="group relative bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/30 rounded-lg sm:rounded-xl px-6 py-3 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/40 mt-4"
            >
              <Sparkles className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
              {t("generateAnalysis") || "Generate Analysis"}
            </Button>
          </div>
        )}
      </div>

      {/* Language Selection Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white/90 mb-4">
              {t("selectAnalysisLanguage") || "Select Analysis Language"}
            </h3>
            <p className="text-white/60 text-sm mb-6">
              {t("selectAnalysisLanguageHint") ||
                "Choose the language for the AI analysis output"}
            </p>

            <div className="space-y-3 mb-6">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={`w-full p-3 rounded-lg border transition-all ${
                    selectedLanguage === lang.code
                      ? "bg-purple-500/20 border-purple-500 text-white"
                      : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                onClick={() => setShowLanguageModal(false)}
                variant="outline"
                className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
              >
                {t("cancel") || "Cancel"}
              </Button>
              <Button
                onClick={() => {
                  // Determine if this is a regenerate or new analysis
                  const forceRegenerate = analysis !== null;
                  handleGenerateAnalysis(selectedLanguage, forceRegenerate);
                }}
                disabled={isLoading}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {t("startAnalysis") || "Start Analysis"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
