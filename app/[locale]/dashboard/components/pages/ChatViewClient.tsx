/* "use client";

import { useState, useEffect } from "react";
import type { Chat, ChatChunk } from "@/lib/types/database";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Search as SearchIcon,
  BarChart3,
  Loader2,
  MessageSquare,
  TrendingUp,
  Users,
  Zap,
  Brain,
  Target,
  Heart,
  Award,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  DollarSign,
  AlertTriangle,
  Lightbulb,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatViewClientProps {
  chat: Chat;
  chunks: ChatChunk[];
}

export default function ChatViewClient({ chat, chunks }: ChatViewClientProps) {
  const t = useTranslations("chat");
  const router = useRouter();
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<"chunks" | "search" | "analysis">(
    "analysis"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: number; text: string; similarity: number }>
  >([]);
  const [analysis, setAnalysis] = useState<{
    summary: string;
    communication_metrics?: any;
    behavioral_signals?: any;
    sales_alignment?: any;
    intent_analysis?: any;
    psychological_profile?: any;
    temporal_dynamics?: any;
    root_cause_analysis?: any;
    recommendations?:
      | Record<string, string[]>
      | Array<{ category: string; text: string } | string>;
    analyst_commentary?: string;
    // Legacy fields for backward compatibility
    linguistic_analysis?: any;
    behavioral_analysis?: any;
    outcome_analysis?: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(locale);

  // Helper function to return values as-is without translation
  const translateValue = (value: string | undefined | null): string => {
    if (!value) return "N/A";
    return value.trim();
  };

  const languages = [
    { code: "ar", name: "العربية" },
    { code: "en", name: "English" },
    { code: "fr", name: "Français" },
    { code: "tr", name: "Türkçe" },
    { code: "es", name: "Español" },
    { code: "hi", name: "हिन्दी" },
  ];

  // Load cached analysis on component mount
  useEffect(() => {
    const loadCachedAnalysis = async () => {
      setIsLoading(true);
      try {
        const userLocale = window.location.pathname.split("/")[1] || "en";
        const response = await fetch("/api/chats/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: chat.id,
            language: userLocale,
            onlyIfCached: true,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.analysis && data.cached) {
            setAnalysis(data.analysis);
          }
        }
      } catch (error) {
        console.error("Error loading cached analysis:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCachedAnalysis();
  }, [chat.id]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/chats/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          chatId: chat.id,
        }),
      });

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeClick = async () => {
    // Check if cached analysis exists
    try {
      const userLocale = window.location.pathname.split("/")[1] || "en";
      const response = await fetch("/api/chats/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: chat.id,
          language: userLocale,
          onlyIfCached: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.analysis && data.cached) {
          // Analysis exists, show it and don't show modal
          setAnalysis(data.analysis);
          return;
        }
      }
    } catch (error) {
      console.error("Error checking cached analysis:", error);
    }

    // No analysis exists - show language modal
    setShowLanguageModal(true);
  };

  const handleAnalyze = async (language: string) => {
    setShowLanguageModal(false);
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/chats/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: chat.id,
          language: language,
          forceRegenerate: !!analysis,
        }),
      });

      const data = await response.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
      }
    } catch (error) {
      console.error("Error analyzing:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="min-h-[calc(100vh-110px)]">

      <div className="sticky px-3 sm:px-4 md:px-6 lg:px-8 mx-auto top-0 z-10 bg-zinc-950/70 backdrop-blur-xl border-b border-purple-500/10 rounded-2xl">
        <div className="py-3 sm:py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                onClick={() => router.push("/dashboard")}
                className="group relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-gray-800/60 to-gray-800/40 hover:from-gray-700/80 hover:to-gray-700/60 border border-gray-700/50 hover:border-purple-500/50 text-gray-300 hover:text-white transition-all duration-300 shrink-0 backdrop-blur-sm shadow-sm hover:shadow-md"
                dir={locale === "ar" ? "rtl" : "ltr"}
              >
                <div className="relative flex items-center gap-2">
                  {locale === "ar" ? (
                    <>
                      <div className="relative w-5 h-5 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-purple-500/20 group-hover:bg-purple-500/30 transition-all duration-300 scale-0 group-hover:scale-100"></div>
                        <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-0.5 transition-transform duration-300" />
                      </div>
                      <span className="hidden sm:inline text-sm font-medium">
                        {t("back")}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="relative w-5 h-5 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-purple-500/20 group-hover:bg-purple-500/30 transition-all duration-300 scale-0 group-hover:scale-100"></div>
                        <ArrowLeft className="w-4 h-4 relative z-10 group-hover:-translate-x-0.5 transition-transform duration-300" />
                      </div>
                      <span className="hidden sm:inline text-sm font-medium">
                        {t("back")}
                      </span>
                    </>
                  )}
                </div>
           
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500/0 via-purple-500/50 to-purple-500/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
              </button>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-purple-300 bg-clip-text text-transparent truncate">
                    {chat.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                    <span className="text-xs sm:text-sm text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className="hidden sm:inline">
                        {formatDate(chat.created_at)}
                      </span>
                      <span className="sm:hidden">
                        {new Date(chat.created_at).toLocaleDateString()}
                      </span>
                    </span>
                    <span className="hidden sm:block w-1 h-1 bg-gray-600 rounded-full"></span>
                    <span className="text-xs sm:text-sm text-purple-400 font-medium">
                      {chunks.length} {t("chunks")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-3 sm:mt-4">
            <div className="relative bg-gray-800/30 rounded-lg sm:rounded-xl p-0.5 sm:p-1 border border-gray-700/30">
              <div
                className="grid grid-cols-3 gap-0.5 sm:gap-1"
                dir={locale === "ar" ? "ltr" : "rtl"}
              >
                <div
                  className={`absolute top-0.5 sm:top-1 bottom-0.5 sm:bottom-1 rounded-md sm:rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 shadow-lg shadow-purple-500/30 transition-all duration-300 ease-out ${
                    activeTab === "chunks"
                      ? "left-0.5 sm:left-1 w-[calc(33.333%-0.167rem)] sm:w-[calc(33.333%-0.333rem)]"
                      : activeTab === "search"
                        ? "left-[calc(33.333%+0.083rem)] sm:left-[calc(33.333%+0.167rem)] w-[calc(33.333%-0.167rem)] sm:w-[calc(33.333%-0.333rem)]"
                        : "left-[calc(66.666%+0.083rem)] sm:left-[calc(66.666%+0.167rem)] w-[calc(33.333%-0.167rem)] sm:w-[calc(33.333%-0.333rem)]"
                  }`}
                />

                <button
                  onClick={() => setActiveTab("chunks")}
                  className={`relative flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${
                    activeTab === "chunks"
                      ? "text-white"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="whitespace-nowrap truncate">
                    {t("chunks")}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("search");
                    if (searchResults.length === 0 && searchQuery) {
                      handleSearch();
                    }
                  }}
                  className={`relative flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${
                    activeTab === "search"
                      ? "text-white"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  <SearchIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="whitespace-nowrap truncate">
                    {t("search")}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("analysis");
                    // If no analysis exists, show language modal
                    if (!analysis && !isLoading) {
                      handleAnalyzeClick();
                    }
                  }}
                  className={`relative flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${
                    activeTab === "analysis"
                      ? "text-white"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="whitespace-nowrap truncate">
                    {t("analysis")}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-4 sm:py-6 md:py-8">
        {activeTab === "chunks" && (
          <div className="space-y-3 sm:space-y-4">
            {chunks.map((chunk) => (
              <div
                key={chunk.id}
                className="group relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                    <span className="text-xs sm:text-sm font-bold text-purple-400">
                      {chunk.chunk_index}
                    </span>
                  </div>
                  <p className="flex-1 text-sm sm:text-base text-gray-300 leading-relaxed break-words">
                    {chunk.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "search" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  placeholder={t("searchPlaceholder")}
                  className="pl-10 sm:pl-12 h-10 sm:h-12 bg-gray-800/50 border-gray-700/50 focus:border-purple-500/50 text-white rounded-lg sm:rounded-xl text-sm sm:text-base"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="h-10 sm:h-12 px-4 sm:px-8 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white rounded-lg sm:rounded-xl shadow-lg shadow-purple-500/30 text-sm sm:text-base"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                ) : (
                  <span className="font-medium">{t("searchButton")}</span>
                )}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <p className="flex-1 text-sm sm:text-base text-gray-300 leading-relaxed break-words">
                        {result.text}
                      </p>
                      <div className="flex-shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg self-start sm:self-auto">
                        <span className="text-xs sm:text-sm font-bold text-green-400">
                          {(result.similarity * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "analysis" && (
          <div className="space-y-4 sm:space-y-6 md:space-y-8">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24 md:py-32">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-6 sm:mb-8">
                  <div className="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" />
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4 text-center">
                  {t("analyzing")}
                </h3>

                <p className="text-sm sm:text-base text-gray-400 text-center max-w-md px-4 mb-4">
                  {t("analyzingNote")}
                </p>

                <div className="flex items-center gap-2 mt-2">
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
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24 md:py-32">
                <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400 animate-spin mb-4" />
                <p className="text-sm text-gray-400">
                  {t("loading") || "Loading..."}
                </p>
              </div>
            ) : analysis ? (
              <>
                <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-purple-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white">
                      {t("executiveSummary") || "Executive Summary"}
                    </h2>
                  </div>
                  <div className="bg-zinc-900/50 rounded-lg p-5 border border-zinc-700/30">
                    <p className="text-sm text-gray-200 leading-relaxed break-words">
                      {analysis.summary}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                  <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      <h3 className="text-xs font-semibold text-gray-400 uppercase">
                        {t("clarity") || "Clarity"}
                      </h3>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {analysis.communication_metrics?.clarity_score !==
                        undefined &&
                      analysis.communication_metrics?.clarity_score !== null
                        ? `${(analysis.communication_metrics.clarity_score * 100).toFixed(0)}%`
                        : analysis.linguistic_analysis?.clarity_score !==
                            undefined
                          ? `${(analysis.linguistic_analysis.clarity_score * 100).toFixed(0)}%`
                          : "N/A"}
                    </p>
                  </div>

                  <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-purple-400" />
                      <h3 className="text-xs font-semibold text-gray-400 uppercase">
                        {t("engagement") || "Engagement"}
                      </h3>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {analysis.behavioral_signals?.engagement_level !==
                        undefined &&
                      analysis.behavioral_signals?.engagement_level !== null
                        ? `${(analysis.behavioral_signals.engagement_level * 100).toFixed(0)}%`
                        : analysis.behavioral_analysis?.engagement_level !==
                            undefined
                          ? `${(analysis.behavioral_analysis.engagement_level * 100).toFixed(0)}%`
                          : "N/A"}
                    </p>
                  </div>

                  <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <h3 className="text-xs font-semibold text-gray-400 uppercase">
                        {t("dealProbability") || "Deal Probability"}
                      </h3>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {analysis.sales_alignment?.deal_probability !==
                        undefined &&
                      analysis.sales_alignment?.deal_probability !== null
                        ? `${(analysis.sales_alignment.deal_probability * 100).toFixed(0)}%`
                        : analysis.outcome_analysis
                              ?.satisfaction_probability !== undefined &&
                            analysis.outcome_analysis
                              ?.satisfaction_probability !== null
                          ? `${(analysis.outcome_analysis.satisfaction_probability * 100).toFixed(0)}%`
                          : "N/A"}
                    </p>
                  </div>

                  <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 text-pink-400" />
                      <h3 className="text-xs font-semibold text-gray-400 uppercase">
                        {t("compatibility") || "Compatibility"}
                      </h3>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {analysis.psychological_profile?.compatibility_score !==
                        undefined &&
                      analysis.psychological_profile?.compatibility_score !==
                        null
                        ? `${(analysis.psychological_profile.compatibility_score * 100).toFixed(0)}%`
                        : "N/A"}
                    </p>
                  </div>

                  <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-orange-400" />
                      <h3 className="text-xs font-semibold text-gray-400 uppercase">
                        {t("momentum") || "Momentum"}
                      </h3>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {analysis.temporal_dynamics?.momentum_score !==
                        undefined &&
                      analysis.temporal_dynamics?.momentum_score !== null
                        ? `${(analysis.temporal_dynamics.momentum_score * 100).toFixed(0)}%`
                        : analysis.behavioral_analysis?.engagement_level !==
                              undefined &&
                            analysis.behavioral_analysis?.engagement_level !==
                              null
                          ? `${(analysis.behavioral_analysis.engagement_level * 100).toFixed(0)}%`
                          : "N/A"}
                    </p>
                  </div>
                </div>

                {analysis.communication_metrics && (
                  <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-blue-400" />
                      </div>
                      <h2 className="text-xl font-semibold text-white">
                        {t("communicationMetrics") || "Communication Metrics"}
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-2 border-b border-zinc-700/30">
                          <span className="text-sm text-gray-400">
                            {t("formality") || "Formality"}
                          </span>
                          <span className="text-white font-medium">
                            {translateValue(
                              analysis.communication_metrics.formality
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-zinc-700/30">
                          <span className="text-sm text-gray-400">
                            {t("rapportBuilding") || "Rapport Building"}
                          </span>
                          <span className="text-white font-medium">
                            {analysis.communication_metrics.rapport_building !==
                            undefined
                              ? `${(analysis.communication_metrics.rapport_building * 100).toFixed(0)}%`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-gray-400">
                            {t("objectionHandling") || "Objection Handling"}
                          </span>
                          <span className="text-white font-medium">
                            {analysis.communication_metrics
                              .objection_handling_quality !== undefined
                              ? `${(analysis.communication_metrics.objection_handling_quality * 100).toFixed(0)}%`
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {analysis.communication_metrics.persuasion_markers &&
                          Array.isArray(
                            analysis.communication_metrics.persuasion_markers
                          ) &&
                          analysis.communication_metrics.persuasion_markers
                            .length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-300 mb-3">
                                {t("persuasionMarkers") || "Persuasion Markers"}
                              </h4>
                              <ul className="space-y-2">
                                {analysis.communication_metrics.persuasion_markers.map(
                                  (marker: string, idx: number) => (
                                    <li
                                      key={idx}
                                      className="text-sm text-gray-300 flex items-start gap-2"
                                    >
                                      <span className="text-green-400 mt-1">
                                        •
                                      </span>
                                      <span>{marker}</span>
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                        {analysis.communication_metrics.hesitation_signals &&
                          Array.isArray(
                            analysis.communication_metrics.hesitation_signals
                          ) &&
                          analysis.communication_metrics.hesitation_signals
                            .length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-300 mb-3">
                                {t("hesitationSignals") || "Hesitation Signals"}
                              </h4>
                              <ul className="space-y-2">
                                {analysis.communication_metrics.hesitation_signals.map(
                                  (signal: string, idx: number) => (
                                    <li
                                      key={idx}
                                      className="text-sm text-gray-300 flex items-start gap-2"
                                    >
                                      <span className="text-orange-400 mt-1">
                                        •
                                      </span>
                                      <span>{signal}</span>
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}

                {analysis.behavioral_signals && (
                  <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Target className="w-5 h-5 text-purple-400" />
                      </div>
                      <h2 className="text-xl font-semibold text-white">
                        {t("behavioralSignals") || "Behavioral Signals"}
                      </h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {[
                        {
                          label: t("assertiveness") || "Assertiveness",
                          value: analysis.behavioral_signals.assertiveness,
                          icon: Award,
                          color: "green",
                        },
                        {
                          label:
                            t("emotionalRegulation") || "Emotional Regulation",
                          value:
                            analysis.behavioral_signals.emotional_regulation,
                          icon: Heart,
                          color: "blue",
                        },
                        {
                          label: t("consistency") || "Consistency",
                          value:
                            analysis.behavioral_signals.consistency_of_tone,
                          icon: CheckCircle2,
                          color: "purple",
                        },
                        {
                          label: t("cooperation") || "Cooperation",
                          value: analysis.behavioral_signals.cooperation_index,
                          icon: Users,
                          color: "orange",
                        },
                        {
                          label: t("engagement") || "Engagement",
                          value: analysis.behavioral_signals.engagement_level,
                          icon: Zap,
                          color: "cyan",
                        },
                      ].map((metric, idx) => {
                        const Icon = metric.icon;
                        return (
                          <div
                            key={idx}
                            className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/30"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Icon
                                className={`w-4 h-4 text-${metric.color}-400`}
                              />
                              <h4 className="text-xs font-semibold text-gray-400">
                                {metric.label}
                              </h4>
                            </div>
                            <p className="text-xl font-bold text-white">
                              {metric.value !== undefined &&
                              metric.value !== null
                                ? `${(metric.value * 100).toFixed(0)}%`
                                : "N/A"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    {analysis.behavioral_signals.trust_indicators &&
                      Array.isArray(
                        analysis.behavioral_signals.trust_indicators
                      ) &&
                      analysis.behavioral_signals.trust_indicators.length >
                        0 && (
                        <div className="mt-6 pt-6 border-t border-zinc-700/30">
                          <h4 className="text-sm font-semibold text-gray-300 mb-3">
                            {t("trustIndicators") || "Trust Indicators"}
                          </h4>
                          <ul className="space-y-2">
                            {analysis.behavioral_signals.trust_indicators.map(
                              (indicator: string, idx: number) => (
                                <li
                                  key={idx}
                                  className="text-sm text-gray-300 flex items-start gap-2"
                                >
                                  <span className="text-green-400 mt-1">•</span>
                                  <span>{indicator}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                )}

                {analysis.sales_alignment && (
                  <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-400" />
                      </div>
                      <h2 className="text-xl font-semibold text-white">
                        {t("salesAlignment") || "Sales Alignment"}
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/30">
                        <p className="text-xs text-gray-400 mb-1">
                          {t("customerStage") || "Customer Stage"}
                        </p>
                        <p className="text-base font-semibold text-white capitalize">
                          {translateValue(
                            analysis.sales_alignment.customer_stage_in_funnel
                          )}
                        </p>
                      </div>
                      <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/30">
                        <p className="text-xs text-gray-400 mb-1">
                          {t("priceSensitivity") || "Price Sensitivity"}
                        </p>
                        <p className="text-base font-semibold text-white">
                          {analysis.sales_alignment.price_sensitivity !==
                          undefined
                            ? `${(analysis.sales_alignment.price_sensitivity * 100).toFixed(0)}%`
                            : "N/A"}
                        </p>
                      </div>
                      <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/30">
                        <p className="text-xs text-gray-400 mb-1">
                          {t("decisionMaker") || "Decision Maker"}
                        </p>
                        <p className="text-base font-semibold text-white">
                          {analysis.sales_alignment.decision_maker_present
                            ? t("yes") || "Yes"
                            : t("no") || "No"}
                        </p>
                      </div>
                      <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/30">
                        <p className="text-xs text-gray-400 mb-1">
                          {t("opportunityType") || "Opportunity Type"}
                        </p>
                        <p className="text-base font-semibold text-white capitalize">
                          {translateValue(
                            analysis.sales_alignment.opportunity_type?.replace(
                              "-",
                              " "
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {analysis.intent_analysis && (
                  <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-indigo-400" />
                      </div>
                      <h2 className="text-xl font-semibold text-white">
                        {t("intentAnalysis") || "Intent Analysis"}
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {analysis.intent_analysis.customer_intent &&
                        Array.isArray(
                          analysis.intent_analysis.customer_intent
                        ) &&
                        analysis.intent_analysis.customer_intent.length > 0 && (
                          <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/30">
                            <div className="flex items-center gap-2 mb-3">
                              <Users className="w-4 h-4 text-blue-400" />
                              <h4 className="text-sm font-semibold text-gray-300">
                                {t("customerIntent") || "Customer Intent"}
                              </h4>
                            </div>
                            <ul className="space-y-2">
                              {analysis.intent_analysis.customer_intent.map(
                                (intent: string, idx: number) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-gray-300 flex items-start gap-2"
                                  >
                                    <span className="text-blue-400 mt-1">
                                      •
                                    </span>
                                    <span>{intent}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      {analysis.intent_analysis.agent_intent &&
                        Array.isArray(analysis.intent_analysis.agent_intent) &&
                        analysis.intent_analysis.agent_intent.length > 0 && (
                          <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/30">
                            <div className="flex items-center gap-2 mb-3">
                              <Award className="w-4 h-4 text-green-400" />
                              <h4 className="text-sm font-semibold text-gray-300">
                                {t("agentIntent") || "Agent Intent"}
                              </h4>
                            </div>
                            <ul className="space-y-2">
                              {analysis.intent_analysis.agent_intent.map(
                                (intent: string, idx: number) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-gray-300 flex items-start gap-2"
                                  >
                                    <span className="text-green-400 mt-1">
                                      •
                                    </span>
                                    <span>{intent}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      {analysis.intent_analysis.intent_alignment && (
                        <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/30 md:col-span-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-300">
                              {t("intentAlignment") || "Intent Alignment"}
                            </span>
                            <span className="text-sm font-medium text-white capitalize">
                              {translateValue(
                                analysis.intent_analysis.intent_alignment
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                      {[
                        {
                          key: "situation_intents",
                          label: t("situationIntents") || "Situation Intents",
                          icon: MessageSquare,
                          color: "blue",
                        },
                        {
                          key: "problem_intents",
                          label: t("problemIntents") || "Problem Intents",
                          icon: AlertTriangle,
                          color: "orange",
                        },
                        {
                          key: "implication_intents",
                          label:
                            t("implicationIntents") || "Implication Intents",
                          icon: AlertCircle,
                          color: "red",
                        },
                        {
                          key: "need_payoff_intents",
                          label:
                            t("needPayoffIntents") || "Need Payoff Intents",
                          icon: CheckCircle2,
                          color: "green",
                        },
                      ].map((section) => {
                        const Icon = section.icon;
                        const intents =
                          analysis.intent_analysis[
                            section.key as keyof typeof analysis.intent_analysis
                          ];
                        if (!Array.isArray(intents) || intents.length === 0)
                          return null;
                        return (
                          <div
                            key={section.key}
                            className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/30"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <Icon
                                className={`w-4 h-4 text-${section.color}-400`}
                              />
                              <h4 className="text-sm font-semibold text-gray-300">
                                {section.label}
                              </h4>
                            </div>
                            <ul className="space-y-2">
                              {intents.map((intent: string, idx: number) => (
                                <li
                                  key={idx}
                                  className="text-sm text-gray-300 flex items-start gap-2"
                                >
                                  <span
                                    className={`text-${section.color}-400 mt-1`}
                                  >
                                    •
                                  </span>
                                  <span>{intent}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {analysis.linguistic_analysis &&
                  !analysis.communication_metrics && (
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-cyan-500/10 to-blue-600/20 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                      <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-blue-500/20">
                        <div className="flex items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-2">
                              {t("linguisticAnalysis")}
                            </h2>
                            <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-blue-500 to-transparent rounded-full"></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                          <div className="space-y-3 sm:space-y-4">
                            {analysis.linguistic_analysis.sentiment && (
                              <div className="bg-zinc-900/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-zinc-700/30">
                                <h4 className="text-base sm:text-lg font-bold text-blue-400 mb-3 sm:mb-4 flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                  {t("sentiment") || "Sentiment"}
                                </h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-400 text-sm">
                                      {t("label") || "Label"}
                                    </span>
                                    <span className="text-white font-medium">
                                      {analysis.linguistic_analysis.sentiment
                                        .label || "N/A"}
                                    </span>
                                  </div>
                                  {analysis.linguistic_analysis.sentiment
                                    .score !== undefined && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-400 text-sm">
                                        {t("score") || "Score"}
                                      </span>
                                      <span className="text-white font-medium">
                                        {analysis.linguistic_analysis.sentiment.score.toFixed(
                                          2
                                        )}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            <div className="bg-zinc-900/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-zinc-700/30">
                              <h4 className="text-base sm:text-lg font-bold text-blue-400 mb-3 sm:mb-4 flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                {t("communicationStyle")}
                              </h4>
                              <div className="space-y-3">
                                {analysis.linguistic_analysis.tone
                                  ?.dominant && (
                                  <div className="flex justify-between items-center py-2 border-b border-gray-700/30">
                                    <span className="text-gray-400 text-sm">
                                      {t("tone") || "Tone"} (
                                      {t("dominant") || "Dominant"})
                                    </span>
                                    <span className="text-white font-medium">
                                      {translateValue(
                                        analysis.linguistic_analysis.tone
                                          .dominant
                                      )}
                                    </span>
                                  </div>
                                )}
                                {analysis.linguistic_analysis.tone
                                  ?.secondary && (
                                  <div className="flex justify-between items-center py-2 border-b border-gray-700/30">
                                    <span className="text-gray-400 text-sm">
                                      {t("tone") || "Tone"} (
                                      {t("secondary") || "Secondary"})
                                    </span>
                                    <span className="text-white font-medium">
                                      {translateValue(
                                        analysis.linguistic_analysis.tone
                                          .secondary
                                      )}
                                    </span>
                                  </div>
                                )}
                                {analysis.linguistic_analysis
                                  .formality_level && (
                                  <div className="flex justify-between items-center py-2 border-b border-gray-700/30">
                                    <span className="text-gray-400 text-sm">
                                      {t("formality") || "Formality"}
                                    </span>
                                    <span className="text-white font-medium">
                                      {translateValue(
                                        analysis.linguistic_analysis
                                          .formality_level
                                      )}
                                    </span>
                                  </div>
                                )}
                                {analysis.linguistic_analysis.complexity && (
                                  <div className="flex justify-between items-center py-2">
                                    <span className="text-gray-400 text-sm">
                                      {t("complexity") || "Complexity"}
                                    </span>
                                    <span className="text-white font-medium">
                                      {translateValue(
                                        analysis.linguistic_analysis.complexity
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="bg-zinc-900/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-zinc-700/30">
                              <h4 className="text-base sm:text-lg font-bold text-green-400 mb-3 sm:mb-4 flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                {t("qualityScore")}
                              </h4>
                              <div className="space-y-3 sm:space-y-4">
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-400 text-xs sm:text-sm">
                                      {t("clarity")}
                                    </span>
                                    <span className="text-green-400 font-bold">
                                      {(
                                        (analysis.linguistic_analysis
                                          .clarity_score || 0) * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                                      style={{
                                        width: `${(analysis.linguistic_analysis.clarity_score || 0) * 100}%`,
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {analysis.linguistic_analysis.emotion_vector && (
                            <div className="bg-zinc-900/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-zinc-700/30">
                              <h4 className="text-base sm:text-lg font-bold text-purple-400 mb-3 sm:mb-4 flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                                {t("emotionBreakdown")}
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                                {Object.entries(
                                  analysis.linguistic_analysis.emotion_vector
                                ).map(([emotion, score]) => (
                                  <div
                                    key={emotion}
                                    className="text-center p-2 sm:p-3 md:p-4 bg-zinc-900/50 rounded-lg sm:rounded-xl border border-zinc-700/20"
                                  >
                                    <div className="text-xl sm:text-2xl md:text-3xl mb-1 sm:mb-2">
                                      {emotion === "joy"
                                        ? "😊"
                                        : emotion === "fear"
                                          ? "😨"
                                          : emotion === "anger"
                                            ? "😠"
                                            : emotion === "trust"
                                              ? "🤝"
                                              : emotion === "sadness"
                                                ? "😢"
                                                : "😲"}
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-gray-400 capitalize mb-0.5 sm:mb-1 break-words">
                                      {translateValue(emotion)}
                                    </p>
                                    <p className="text-sm sm:text-base md:text-lg font-bold text-purple-400">
                                      {((score as number) * 100).toFixed(0)}%
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {analysis.linguistic_analysis.language_patterns &&
                        Array.isArray(
                          analysis.linguistic_analysis.language_patterns
                        ) &&
                        analysis.linguistic_analysis.language_patterns.length >
                          0 && (
                          <div className="mt-4 sm:mt-6">
                            <h4 className="text-base sm:text-lg font-bold text-cyan-400 mb-3 sm:mb-4 flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                              {t("languagePatterns") || "Language Patterns"}
                            </h4>
                            <ul className="space-y-2 sm:space-y-3">
                              {analysis.linguistic_analysis.language_patterns.map(
                                (pattern: string, index: number) => (
                                  <li
                                    key={index}
                                    className="text-xs sm:text-sm text-gray-300 flex items-start gap-2 bg-zinc-900/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-zinc-700/30"
                                  >
                                    <span className="text-cyan-400 mt-1">
                                      •
                                    </span>
                                    <span className="leading-relaxed">
                                      {pattern}
                                    </span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                    </div>
                  )}

                {analysis.behavioral_analysis && (
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-pink-500/10 to-purple-600/20 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                    <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-purple-500/20">
                      <div className="flex items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
                          <Target className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-2">
                            {t("behavioralAnalysis")}
                          </h2>
                          <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-purple-500 to-transparent rounded-full"></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
                        {[
                          {
                            label: t("empathy"),
                            value: analysis.behavioral_analysis.empathy_ratio,
                            color: "blue",
                            icon: Heart,
                          },
                          {
                            label: t("assertiveness"),
                            value: analysis.behavioral_analysis.assertiveness,
                            color: "green",
                            icon: Award,
                          },
                          {
                            label: t("engagement"),
                            value:
                              analysis.behavioral_analysis.engagement_level,
                            color: "purple",
                            icon: Zap,
                          },
                          {
                            label: t("cooperation"),
                            value:
                              analysis.behavioral_analysis.cooperation_index,
                            color: "orange",
                            icon: Users,
                          },
                        ].map((metric, idx) => {
                          const percentage = (
                            (metric.value || 0) * 100
                          ).toFixed(0);
                          const Icon = metric.icon;
                          const size = 20;
                          const radius = 16;
                          const circumference = 2 * Math.PI * radius;
                          return (
                            <div
                              key={idx}
                              className="flex flex-col items-center"
                            >
                              <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mb-2 sm:mb-3">
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle
                                    cx={size}
                                    cy={size}
                                    r={radius}
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                    className="text-gray-700/50"
                                  />
                                  <circle
                                    cx={size}
                                    cy={size}
                                    r={radius}
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={
                                      circumference * (1 - (metric.value || 0))
                                    }
                                    className={`text-${metric.color}-500 transition-all duration-1000`}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <Icon
                                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-${metric.color}-400 mb-0.5 sm:mb-1`}
                                  />
                                  <span
                                    className={`text-xs sm:text-sm font-bold text-${metric.color}-400`}
                                  >
                                    {percentage}%
                                  </span>
                                </div>
                              </div>
                              <p className="text-[10px] sm:text-xs text-gray-400 font-medium text-center break-words px-1">
                                {metric.label}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-zinc-900/50 rounded-xl p-3 sm:p-4 md:p-5 border border-zinc-700/30">
                          <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <span className="text-gray-400 text-xs sm:text-sm font-medium">
                              {t("resolutionEfficiency")}
                            </span>
                            <span className="text-red-400 font-bold text-lg">
                              {(
                                (analysis.behavioral_analysis
                                  .resolution_efficiency || 0) * 100
                              ).toFixed(0)}
                              %
                            </span>
                          </div>
                          <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full transition-all duration-500"
                              style={{
                                width: `${(analysis.behavioral_analysis.resolution_efficiency || 0) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>

                        <div className="bg-gray-900/50 rounded-xl p-3 sm:p-4 md:p-5 border border-gray-700/30">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-xs sm:text-sm font-medium">
                              {t("avgResponseTime")}
                            </span>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
                              <span className="text-cyan-400 font-bold text-sm sm:text-base md:text-lg">
                                {analysis.behavioral_analysis
                                  .response_latency_avg_sec
                                  ? `${Math.round(analysis.behavioral_analysis.response_latency_avg_sec / 3600)}h`
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {analysis.behavioral_analysis.observations && (
                        <div className="mt-4 sm:mt-6">
                          <h4 className="text-base sm:text-lg font-bold text-yellow-400 mb-3 sm:mb-4 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                            {t("keyObservations")}
                          </h4>
                          <div className="space-y-2 sm:space-y-3">
                            {analysis.behavioral_analysis.observations.map(
                              (observation: string, index: number) => (
                                <div
                                  key={index}
                                  className="bg-gray-900/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border-l-4 border-yellow-500/50 hover:border-yellow-500 transition-all duration-300"
                                >
                                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed break-words">
                                    {observation}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {analysis.psychological_profile && (
                  <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-indigo-400" />
                      </div>
                      <h2 className="text-xl font-semibold text-white">
                        {t("psychologicalProfile") || "Psychological Profile"}
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/30">
                        <p className="text-xs text-gray-400 mb-2">
                          {t("customerDiscType") || "Customer DISC Type"}
                        </p>
                        <p className="text-2xl font-bold text-blue-400">
                          {translateValue(
                            analysis.psychological_profile.customer_disc_type ||
                              analysis.psychological_profile.customer_persona
                                ?.type
                          )}
                        </p>
                      </div>
                      <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/30">
                        <p className="text-xs text-gray-400 mb-2">
                          {t("agentDiscType") || "Agent DISC Type"}
                        </p>
                        <p className="text-2xl font-bold text-green-400">
                          {translateValue(
                            analysis.psychological_profile.agent_disc_type ||
                              analysis.psychological_profile.agent_profile
                                ?.overall_alignment ||
                              analysis.psychological_profile.agent_profile
                                ?.communication_style
                          )}
                        </p>
                      </div>
                      <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/30">
                        <p className="text-xs text-gray-400 mb-2">
                          {t("compatibility") || "Compatibility"}
                        </p>
                        <p className="text-2xl font-bold text-purple-400">
                          {analysis.psychological_profile
                            .compatibility_score !== undefined &&
                          analysis.psychological_profile.compatibility_score !==
                            null
                            ? `${(analysis.psychological_profile.compatibility_score * 100).toFixed(0)}%`
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                    {analysis.psychological_profile.customer_persona && (
                      <div className="mt-6 pt-6 border-t border-zinc-700/30">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-4">
                              {t("customerProfile") || "Customer Profile"}
                            </h4>
                            <div className="space-y-3">
                              {analysis.psychological_profile.customer_persona
                                .type && (
                                <div className="flex justify-between items-center py-2 border-b border-zinc-700/30">
                                  <span className="text-sm text-gray-400">
                                    {t("personalityType") || "Personality Type"}
                                  </span>
                                  <span className="text-white font-medium">
                                    {translateValue(
                                      analysis.psychological_profile
                                        .customer_persona.type
                                    )}
                                  </span>
                                </div>
                              )}
                              {analysis.psychological_profile.customer_persona
                                .communication_style && (
                                <div className="flex justify-between items-center py-2 border-b border-zinc-700/30">
                                  <span className="text-sm text-gray-400">
                                    {t("communicationStyle") ||
                                      "Communication Style"}
                                  </span>
                                  <span className="text-white font-medium">
                                    {translateValue(
                                      analysis.psychological_profile
                                        .customer_persona.communication_style
                                    )}
                                  </span>
                                </div>
                              )}
                              {analysis.psychological_profile.customer_persona
                                .dominance !== undefined && (
                                <div className="flex justify-between items-center py-2 border-b border-zinc-700/30">
                                  <span className="text-sm text-gray-400">
                                    {t("dominance") || "Dominance"}
                                  </span>
                                  <span className="text-white font-medium">
                                    {(
                                      analysis.psychological_profile
                                        .customer_persona.dominance * 100
                                    ).toFixed(0)}
                                    %
                                  </span>
                                </div>
                              )}
                              {analysis.psychological_profile.customer_persona
                                .patience_level !== undefined && (
                                <div className="flex justify-between items-center py-2 border-b border-zinc-700/30">
                                  <span className="text-sm text-gray-400">
                                    {t("patienceLevel") || "Patience Level"}
                                  </span>
                                  <span className="text-white font-medium">
                                    {(
                                      analysis.psychological_profile
                                        .customer_persona.patience_level * 100
                                    ).toFixed(0)}
                                    %
                                  </span>
                                </div>
                              )}
                              {analysis.psychological_profile.customer_persona
                                .emotional_stability !== undefined && (
                                <div className="flex justify-between items-center py-2">
                                  <span className="text-sm text-gray-400">
                                    {t("emotionalStability") ||
                                      "Emotional Stability"}
                                  </span>
                                  <span className="text-white font-medium">
                                    {(
                                      analysis.psychological_profile
                                        .customer_persona.emotional_stability *
                                      100
                                    ).toFixed(0)}
                                    %
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-4">
                              {t("agentProfile") || "Agent Profile"}
                            </h4>
                            <div className="space-y-3">
                              {analysis.psychological_profile.agent_profile
                                ?.communication_style && (
                                <div className="flex justify-between items-center py-2 border-b border-zinc-700/30">
                                  <span className="text-sm text-gray-400">
                                    {t("communicationStyle") ||
                                      "Communication Style"}
                                  </span>
                                  <span className="text-white font-medium">
                                    {translateValue(
                                      analysis.psychological_profile
                                        .agent_profile.communication_style
                                    )}
                                  </span>
                                </div>
                              )}
                              {analysis.psychological_profile.agent_profile
                                ?.overall_alignment && (
                                <div className="flex justify-between items-center py-2 border-b border-zinc-700/30">
                                  <span className="text-sm text-gray-400">
                                    {t("overallAlignment") ||
                                      "Overall Alignment"}
                                  </span>
                                  <span className="text-white font-medium capitalize">
                                    {translateValue(
                                      analysis.psychological_profile
                                        .agent_profile.overall_alignment
                                    )}
                                  </span>
                                </div>
                              )}
                              {analysis.psychological_profile.agent_profile
                                ?.adaptability !== undefined && (
                                <div className="flex justify-between items-center py-2 border-b border-zinc-700/30">
                                  <span className="text-sm text-gray-400">
                                    {t("adaptability") || "Adaptability"}
                                  </span>
                                  <span className="text-white font-medium">
                                    {(
                                      analysis.psychological_profile
                                        .agent_profile.adaptability * 100
                                    ).toFixed(0)}
                                    %
                                  </span>
                                </div>
                              )}
                              {analysis.psychological_profile.agent_profile
                                ?.confidence_level !== undefined && (
                                <div className="flex justify-between items-center py-2 border-b border-zinc-700/30">
                                  <span className="text-sm text-gray-400">
                                    {t("confidenceLevel") || "Confidence Level"}
                                  </span>
                                  <span className="text-white font-medium">
                                    {(
                                      analysis.psychological_profile
                                        .agent_profile.confidence_level * 100
                                    ).toFixed(0)}
                                    %
                                  </span>
                                </div>
                              )}
                              {analysis.psychological_profile.agent_profile
                                ?.stress_level_estimate !== undefined && (
                                <div className="flex justify-between items-center py-2">
                                  <span className="text-sm text-gray-400">
                                    {t("stressLevel") || "Stress Level"}
                                  </span>
                                  <span className="text-white font-medium">
                                    {(
                                      analysis.psychological_profile
                                        .agent_profile.stress_level_estimate *
                                      100
                                    ).toFixed(0)}
                                    %
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {analysis.temporal_dynamics && (
                  <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-cyan-400" />
                      </div>
                      <h2 className="text-xl font-semibold text-white">
                        {t("temporalDynamics") || "Temporal Dynamics"}
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/30">
                        <p className="text-xs text-gray-400 mb-2">
                          {t("avgDelay") || "Average Delay"}
                        </p>
                        <p className="text-lg font-semibold text-white">
                          {analysis.temporal_dynamics.average_response_delay ||
                            analysis.temporal_dynamics.avg_delay ||
                            "N/A"}
                        </p>
                      </div>
                      {analysis.temporal_dynamics.momentum_score !==
                        undefined && (
                        <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/30">
                          <p className="text-xs text-gray-400 mb-2">
                            {t("momentumScore") || "Momentum Score"}
                          </p>
                          <p className="text-lg font-semibold text-white">
                            {`${(analysis.temporal_dynamics.momentum_score * 100).toFixed(0)}%`}
                          </p>
                        </div>
                      )}
                    </div>
                    {analysis.temporal_dynamics.notable_gaps &&
                      Array.isArray(analysis.temporal_dynamics.notable_gaps) &&
                      analysis.temporal_dynamics.notable_gaps.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-zinc-700/30">
                          <h4 className="text-sm font-semibold text-gray-300 mb-4">
                            {t("notableGaps") || "Notable Gaps"}
                          </h4>
                          <div className="space-y-3">
                            {analysis.temporal_dynamics.notable_gaps.map(
                              (
                                gap: {
                                  phase?: string;
                                  delay?: string;
                                  impact?: string;
                                },
                                idx: number
                              ) => (
                                <div
                                  key={idx}
                                  className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/30"
                                >
                                  {gap.phase && (
                                    <p className="text-sm font-semibold text-gray-200 mb-2">
                                      {gap.phase}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-gray-400">
                                    {gap.delay && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {gap.delay}
                                      </span>
                                    )}
                                  </div>
                                  {gap.impact && (
                                    <p className="text-sm text-gray-300 mt-2">
                                      {gap.impact}
                                    </p>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    {analysis.temporal_dynamics.pattern_analysis && (
                      <div className="mt-6 pt-6 border-t border-zinc-700/30">
                        <h4 className="text-sm font-semibold text-gray-300 mb-3">
                          {t("patternAnalysis") || "Pattern Analysis"}
                        </h4>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          {analysis.temporal_dynamics.pattern_analysis}
                        </p>
                      </div>
                    )}
                    {analysis.temporal_dynamics.friction_points &&
                      Array.isArray(
                        analysis.temporal_dynamics.friction_points
                      ) &&
                      analysis.temporal_dynamics.friction_points.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-zinc-700/30">
                          <h4 className="text-sm font-semibold text-gray-300 mb-4">
                            {t("frictionPoints") || "Friction Points"}
                          </h4>
                          <ul className="space-y-2">
                            {analysis.temporal_dynamics.friction_points.map(
                              (point: string, idx: number) => (
                                <li
                                  key={idx}
                                  className="text-sm text-gray-300 flex items-start gap-2"
                                >
                                  <span className="text-orange-400 mt-1">
                                    •
                                  </span>
                                  <span>{point}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    {analysis.temporal_dynamics.lost_momentum_segments &&
                      Array.isArray(
                        analysis.temporal_dynamics.lost_momentum_segments
                      ) &&
                      analysis.temporal_dynamics.lost_momentum_segments.length >
                        0 && (
                        <div className="mt-6 pt-6 border-t border-zinc-700/30">
                          <h4 className="text-sm font-semibold text-gray-300 mb-4">
                            {t("lostMomentumSegments") ||
                              "Lost Momentum Segments"}
                          </h4>
                          <ul className="space-y-2">
                            {analysis.temporal_dynamics.lost_momentum_segments.map(
                              (segment: string, idx: number) => (
                                <li
                                  key={idx}
                                  className="text-sm text-gray-300 flex items-start gap-2"
                                >
                                  <span className="text-red-400 mt-1">•</span>
                                  <span>{segment}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                )}

                {analysis.root_cause_analysis && (
                  <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      </div>
                      <h2 className="text-xl font-semibold text-white">
                        {t("rootCauseAnalysis") || "Root Cause Analysis"}
                      </h2>
                    </div>
                    <div className="space-y-6">
                      {analysis.root_cause_analysis.primary_causes &&
                        Array.isArray(
                          analysis.root_cause_analysis.primary_causes
                        ) &&
                        analysis.root_cause_analysis.primary_causes.length >
                          0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-3">
                              {t("primaryCauses") || "Primary Causes"}
                            </h4>
                            <ul className="space-y-2">
                              {analysis.root_cause_analysis.primary_causes.map(
                                (cause: string, idx: number) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-gray-300 flex items-start gap-2 bg-zinc-900/50 rounded-lg p-3 border border-red-500/30"
                                  >
                                    <span className="text-red-400 mt-1">•</span>
                                    <span>{cause}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      {analysis.root_cause_analysis.secondary_causes &&
                        Array.isArray(
                          analysis.root_cause_analysis.secondary_causes
                        ) &&
                        analysis.root_cause_analysis.secondary_causes.length >
                          0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-3">
                              {t("secondaryCauses") || "Secondary Causes"}
                            </h4>
                            <ul className="space-y-2">
                              {analysis.root_cause_analysis.secondary_causes.map(
                                (cause: string, idx: number) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-gray-300 flex items-start gap-2 bg-zinc-900/50 rounded-lg p-3 border border-orange-500/30"
                                  >
                                    <span className="text-orange-400 mt-1">
                                      •
                                    </span>
                                    <span>{cause}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      {analysis.root_cause_analysis.preventive_actions &&
                        Array.isArray(
                          analysis.root_cause_analysis.preventive_actions
                        ) &&
                        analysis.root_cause_analysis.preventive_actions.length >
                          0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-3">
                              {t("preventiveActions") || "Preventive Actions"}
                            </h4>
                            <ul className="space-y-2">
                              {analysis.root_cause_analysis.preventive_actions.map(
                                (action: string, idx: number) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-gray-300 flex items-start gap-2 bg-zinc-900/50 rounded-lg p-3 border border-green-500/30"
                                  >
                                    <span className="text-green-400 mt-1">
                                      •
                                    </span>
                                    <span>{action}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      {analysis.root_cause_analysis.interests &&
                        Array.isArray(analysis.root_cause_analysis.interests) &&
                        analysis.root_cause_analysis.interests.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-3">
                              {t("interests") || "Interests"}
                            </h4>
                            <ul className="space-y-2">
                              {analysis.root_cause_analysis.interests.map(
                                (interest: string, idx: number) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-gray-300 flex items-start gap-2 bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/30"
                                  >
                                    <span className="text-blue-400 mt-1">
                                      •
                                    </span>
                                    <span>{interest}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      {analysis.root_cause_analysis.communication_barriers &&
                        Array.isArray(
                          analysis.root_cause_analysis.communication_barriers
                        ) &&
                        analysis.root_cause_analysis.communication_barriers
                          .length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-3">
                              {t("communicationBarriers") ||
                                "Communication Barriers"}
                            </h4>
                            <ul className="space-y-2">
                              {analysis.root_cause_analysis.communication_barriers.map(
                                (barrier: string, idx: number) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-gray-300 flex items-start gap-2 bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/30"
                                  >
                                    <span className="text-orange-400 mt-1">
                                      •
                                    </span>
                                    <span>{barrier}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      {analysis.root_cause_analysis.primary_blockers &&
                        Array.isArray(
                          analysis.root_cause_analysis.primary_blockers
                        ) &&
                        analysis.root_cause_analysis.primary_blockers.length >
                          0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-3">
                              {t("primaryBlockers") || "Primary Blockers"}
                            </h4>
                            <ul className="space-y-2">
                              {analysis.root_cause_analysis.primary_blockers.map(
                                (blocker: string, idx: number) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-gray-300 flex items-start gap-2 bg-zinc-900/50 rounded-lg p-3 border border-red-500/30"
                                  >
                                    <span className="text-red-400 mt-1">•</span>
                                    <span>{blocker}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      {analysis.root_cause_analysis.leverage_points &&
                        Array.isArray(
                          analysis.root_cause_analysis.leverage_points
                        ) &&
                        analysis.root_cause_analysis.leverage_points.length >
                          0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-3">
                              {t("leveragePoints") || "Leverage Points"}
                            </h4>
                            <ul className="space-y-2">
                              {analysis.root_cause_analysis.leverage_points.map(
                                (point: string, idx: number) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-gray-300 flex items-start gap-2 bg-zinc-900/50 rounded-lg p-3 border border-green-500/30"
                                  >
                                    <span className="text-green-400 mt-1">
                                      •
                                    </span>
                                    <span>{point}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {analysis.outcome_analysis && (
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/20 via-green-500/10 to-emerald-600/20 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                    <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-emerald-500/20">
                      <div className="flex items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent mb-2">
                            {t("outcomeAnalysis")}
                          </h2>
                          <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-emerald-500 to-transparent rounded-full"></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-3 sm:space-y-4">
                          <div className="bg-zinc-900/50 rounded-xl p-3 sm:p-4 md:p-5 border border-zinc-700/30">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 text-xs sm:text-sm font-medium">
                                {t("resolutionStatus")}
                              </span>
                              <div
                                className={`px-4 py-2 rounded-lg ${
                                  analysis.outcome_analysis.resolved
                                    ? "bg-green-500/20 border border-green-500/30"
                                    : "bg-red-500/20 border border-red-500/30"
                                }`}
                              >
                                <span
                                  className={`font-bold ${
                                    analysis.outcome_analysis.resolved
                                      ? "text-green-400"
                                      : "text-red-400"
                                  }`}
                                >
                                  {analysis.outcome_analysis.resolved
                                    ? `✓ ${t("resolved")}`
                                    : `✗ ${t("pending")}`}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-zinc-900/50 rounded-xl p-3 sm:p-4 md:p-5 border border-zinc-700/30">
                            <div className="flex items-center justify-between mb-2 sm:mb-3">
                              <span className="text-gray-400 text-xs sm:text-sm font-medium">
                                {t("satisfactionProbability")}
                              </span>
                              <span className="text-emerald-400 font-bold text-base sm:text-lg md:text-xl">
                                {(
                                  (analysis.outcome_analysis
                                    .satisfaction_probability || 0) * 100
                                ).toFixed(1)}
                                %
                              </span>
                            </div>
                            <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-500"
                                style={{
                                  width: `${(analysis.outcome_analysis.satisfaction_probability || 0) * 100}%`,
                                }}
                              ></div>
                            </div>
                          </div>

                          <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-700/30">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 font-medium">
                                {t("followUpRequired")}
                              </span>
                              <span
                                className={`font-bold ${
                                  analysis.outcome_analysis.follow_up_needed
                                    ? "text-yellow-400"
                                    : "text-green-400"
                                }`}
                              >
                                {analysis.outcome_analysis.follow_up_needed
                                  ? t("yes")
                                  : t("no")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-700/30">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 font-medium">
                                {t("impactArea")}
                              </span>
                              <span className="text-white font-bold">
                                {analysis.outcome_analysis.impact_area || "N/A"}
                              </span>
                            </div>
                          </div>

                          <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-700/30">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 font-medium">
                                {t("sentimentShift")}
                              </span>
                              <span className="text-white font-bold">
                                {analysis.outcome_analysis.sentiment_shift ||
                                  "N/A"}
                              </span>
                            </div>
                          </div>

                          {analysis.outcome_analysis.business_impact && (
                            <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-700/30">
                              <h5 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                {t("businessImpact")}
                              </h5>
                              <p className="text-gray-300 text-sm leading-relaxed">
                                {analysis.outcome_analysis.business_impact}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {analysis.recommendations &&
                  (Array.isArray(analysis.recommendations)
                    ? analysis.recommendations.length > 0
                    : Object.keys(analysis.recommendations).length > 0) && (
                    <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                          <Lightbulb className="w-5 h-5 text-yellow-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">
                          {t("recommendations") || "Recommendations"}
                        </h2>
                      </div>
                      {Array.isArray(analysis.recommendations) ? (
                        <div className="space-y-3">
                          {analysis.recommendations.map(
                            (rec: any, index: number) => (
                              <div
                                key={index}
                                className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/30"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-6 h-6 rounded bg-yellow-500/20 flex items-center justify-center">
                                    <span className="text-yellow-400 font-bold text-xs">
                                      {index + 1}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-300 leading-relaxed flex-1">
                                    {typeof rec === "string"
                                      ? rec
                                      : rec.text || rec}
                                  </p>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {Object.entries(analysis.recommendations).map(
                            ([category, items]: [string, any]) => (
                              <div key={category}>
                                <h4 className="text-sm font-semibold text-gray-300 mb-3 capitalize">
                                  {category.replace(/_/g, " ")}
                                </h4>
                                <ul className="space-y-2">
                                  {Array.isArray(items) &&
                                    items.map((item: string, idx: number) => (
                                      <li
                                        key={idx}
                                        className="text-sm text-gray-300 flex items-start gap-2 bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/30"
                                      >
                                        <span className="text-yellow-400 mt-1">
                                          •
                                        </span>
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                </ul>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}

                {analysis.analyst_commentary && (
                  <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                      </div>
                      <h2 className="text-xl font-semibold text-white">
                        {t("analystCommentary") || "Analyst Commentary"}
                      </h2>
                    </div>
                    <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/30">
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {analysis.analyst_commentary}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : !isLoading ? (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 flex items-center justify-center mb-6">
                  <BarChart3 className="w-10 h-10 text-gray-600" />
                </div>
                <p className="text-gray-400 text-lg font-medium">
                  {t("noAnalysis")}
                </p>
                <p className="text-gray-500 text-sm mt-2 mb-6">
                  {t("clickToAnalyze")}
                </p>
                <Button
                  onClick={handleAnalyzeClick}
                  disabled={isAnalyzing || isLoading}
                  className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/30"
                >
                  {isAnalyzing || isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  {t("analyze") || "Analyze Chat"}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

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
                onClick={() => handleAnalyze(selectedLanguage)}
                disabled={isAnalyzing}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                {isAnalyzing ? (
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
 */
