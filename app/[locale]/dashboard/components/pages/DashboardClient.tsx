"use client";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  MessageSquare,
  Plus,
  Search,
  Loader2,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import UploadChatDialog from "../UploadChatDialog";
import ChatListItem, { ChatListItemData } from "../ChatListItem";
import InviteEmployeeDialog from "../InviteEmployeeDialog";
import { useTranslations } from "next-intl";
import type { DashboardClientProps } from "../../types/dashboard";
import { useUser } from "@clerk/nextjs";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery, useAction, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLocale } from "next-intl";
import { useRef, useCallback } from "react";

// Lazy load الرسوم البيانية لتحسين الأداء - تحميل فقط عند الحاجة
const ChatVolume = dynamic(() => import("../ChatVolume"), {
  loading: () => (
    <Card className="border-border/50 bg-card/50 h-[500px] w-full">
      <div className="p-4 md:p-5 h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-400 dark:text-purple-400 animate-spin mx-auto" />
        </div>
      </div>
    </Card>
  ),
  ssr: false, // تعطيل SSR للرسوم البيانية لتحسين الأداء
});

const KPICards = dynamic(() => import("../KPICards"), {
  loading: () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card
          key={i}
          className="bg-card/50 border-border/50 border p-6 animate-pulse"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-4 bg-muted rounded w-24 mb-3"></div>
              <div className="h-8 bg-muted rounded w-16 mb-2"></div>
            </div>
            <div className="w-12 h-12 bg-muted rounded-lg"></div>
          </div>
        </Card>
      ))}
    </div>
  ),
  ssr: false,
});

const SentimentDistribution = dynamic(
  () => import("../SentimentDistribution"),
  {
    loading: () => (
      <Card className="border-border/50 bg-card/50 h-[400px] w-full">
        <div className="p-4 md:p-5 h-full flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-purple-400 dark:text-purple-400 animate-spin mx-auto" />
          </div>
        </div>
      </Card>
    ),
    ssr: false,
  }
);

/* const TopIssuesChart = dynamic(() => import("../TopIssuesChart"), {
  loading: () => (
    <Card className="border-border/50 bg-card/50 h-[400px] w-full">
      <div className="p-4 md:p-5 h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-400 dark:text-purple-400 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Loading chart...</p>
        </div>
      </div>
    </Card>
  ),
  ssr: false,
}); */

export default function DashboardClient({
  initialChats,
}: DashboardClientProps) {
  const t = useTranslations("dashboard");
  const { user } = useUser();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [kpiData, setKpiData] = useState<any>(null);
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(true);
  const [useSemanticSearch, setUseSemanticSearch] = useState(false);
  const locale = useLocale();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Get organizationId from initial chats
  const organizationId = initialChats[0]?.organizationId;

  // Use paginated query for infinite scroll
  // Skip if organizationId is not available to prevent errors
  const {
    results: chats,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.chats.listForDashboard,
    organizationId ? { organizationId } : "skip",
    { initialNumItems: 8 }
  );

  // Ensure chats is always an array to prevent errors
  const safeChats = chats ?? [];

  // Fetch latest global analysis
  const globalAnalysis = useQuery(
    api.globalAnalysis.getLatestByOrg,
    organizationId ? { organizationId } : "skip"
  );

  // جلب جميع الرسائل لكل المحادثات للبحث النصي
  const chatIds = useMemo(() => safeChats.map((chat) => chat._id), [safeChats]);

  // Query will return {} on error instead of throwing (handled in convex/chats.ts)
  const allMessagesResult = useQuery(
    api.chats.getAllMessagesForMultipleChats,
    chatIds.length > 0 && !useSemanticSearch ? { chatIds } : "skip"
  );

  // Safe fallback - ensure allMessages is always an object
  const allMessages: Record<string, any[]> = allMessagesResult ?? {};

  // البحث الدلالي - يتم تفعيله فقط عند وجود نص بحث
  const semanticSearchAction = useAction(api.chats.semanticSearchAcrossChats);
  const [semanticResults, setSemanticResults] = useState<Record<
    string,
    Array<{ messageId: Id<"chatMessages">; score: number; text: string }>
  > | null>(null);
  const [isSemanticSearching, setIsSemanticSearching] = useState(false);

  // تشغيل البحث الدلالي عند تغيير نص البحث
  useEffect(() => {
    if (
      searchQuery.trim().length >= 3 &&
      useSemanticSearch &&
      chatIds.length > 0 &&
      organizationId
    ) {
      setIsSemanticSearching(true);
      semanticSearchAction({
        organizationId: organizationId,
        queryText: searchQuery,
        chatIds: chatIds,
        threshold: 0.3,
        topK: 3,
      })
        .then((results) => {
          setSemanticResults(results);
          setIsSemanticSearching(false);
        })
        .catch((error) => {
          console.error("Semantic search error:", error);
          setIsSemanticSearching(false);
          setSemanticResults(null);
        });
    } else {
      setSemanticResults(null);
      setIsSemanticSearching(false);
    }
  }, [
    searchQuery,
    useSemanticSearch,
    chatIds,
    organizationId,
    semanticSearchAction,
  ]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || status !== "CanLoadMore") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && status === "CanLoadMore") {
          loadMore(8);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [status, loadMore]);

  // Filter chats based on search query - دمج البحث النصي والدلالي
  const filteredChats = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return safeChats;

    // إذا كان البحث الدلالي مفعّل وكانت النتائج جاهزة
    if (useSemanticSearch && semanticResults) {
      // استخدام نتائج البحث الدلالي
      const semanticChatIds = new Set(Object.keys(semanticResults));
      return safeChats.filter((chat) => semanticChatIds.has(chat._id));
    }

    // البحث النصي التقليدي
    return safeChats.filter((chat) => {
      // البحث في العنوان
      const title = (chat.title ?? "").toLowerCase();
      if (title.includes(q)) return true;

      // البحث في معرف العميل
      const customerId = (chat.customerIdentifier ?? "").toLowerCase();
      if (customerId.includes(q)) return true;

      // البحث في القناة
      const channel = (chat.sourceChannel ?? "").toLowerCase();
      if (channel.includes(q)) return true;

      // البحث في الرسائل وأسماء المرسلين
      if (allMessages && allMessages[chat._id]) {
        const messages = allMessages[chat._id];
        for (const message of messages) {
          // البحث في محتوى الرسالة
          const textClean = (message.textClean ?? "").toLowerCase();
          const textRaw = (message.textRaw ?? "").toLowerCase();
          if (textClean.includes(q) || textRaw.includes(q)) return true;

          // البحث في اسم المرسل
          const senderName = (message.senderName ?? "").toLowerCase();
          if (senderName.includes(q)) return true;
        }
      }

      return false;
    });
  }, [safeChats, searchQuery, allMessages, useSemanticSearch, semanticResults]);

  // تبديل بين البحث النصي والدلالي عند تغيير نص البحث
  useEffect(() => {
    // تفعيل البحث الدلالي إذا كان النص طويلاً (3+ أحرف) أو يحتوي على كلمات متعددة
    const shouldUseSemantic = searchQuery.trim().length >= 3;
    setUseSemanticSearch(shouldUseSemantic);
  }, [searchQuery]);

  // Process global analysis data for KPIs and charts
  useEffect(() => {
    if (globalAnalysis === undefined) {
      setIsLoadingKPIs(true);
      return;
    }

    if (globalAnalysis && globalAnalysis.exists && globalAnalysis.analysis) {
      const analysis = globalAnalysis.analysis;

      // Extract key metrics from global analysis
      const kpis = {
        customerSatisfaction: analysis.customerSatisfactionScore ?? null,
        avgSentiment: getSentimentScore(analysis.overallSentiment),
        riskScore: analysis.riskScore ?? null,
        churnRiskLevel: analysis.churnRiskLevel ?? null,
        topAgent: analysis.agentLeaderboard?.[0] ?? null,
        commonTopics: analysis.commonTopics?.slice(0, 3) ?? [],
        commonIssues: analysis.commonIssues?.slice(0, 3) ?? [],
      };

      // Prepare chart data from global analysis
      // Convert overallSentiment to distribution for SentimentDistribution chart
      const sentimentToDistribution = (
        sentiment: string | undefined,
        score: number | null | undefined
      ) => {
        // Default distribution based on sentiment label
        const baseDistribution: Record<
          string,
          { positive: number; neutral: number; negative: number }
        > = {
          very_positive: { positive: 80, neutral: 15, negative: 5 },
          positive: { positive: 60, neutral: 30, negative: 10 },
          neutral: { positive: 25, neutral: 50, negative: 25 },
          negative: { positive: 10, neutral: 30, negative: 60 },
          very_negative: { positive: 5, neutral: 15, negative: 80 },
        };

        if (!sentiment) {
          return { positive: 33, neutral: 34, negative: 33 };
        }

        const base = baseDistribution[sentiment] || {
          positive: 33,
          neutral: 34,
          negative: 33,
        };

        // Adjust based on customerSatisfactionScore if available (0-100 scale)
        if (score !== null && score !== undefined && score > 0) {
          const normalizedScore = Math.min(Math.max(score / 100, 0), 1); // Clamp to 0-1
          // Scale the base distribution based on score
          // Higher score = more positive
          const positiveWeight = normalizedScore;
          const negativeWeight = 1 - normalizedScore;

          return {
            positive: Math.max(
              0,
              Math.round(base.positive * (0.5 + positiveWeight * 0.5))
            ),
            neutral: Math.max(0, Math.round(base.neutral * 0.8)),
            negative: Math.max(
              0,
              Math.round(base.negative * (0.5 + negativeWeight * 0.5))
            ),
          };
        }

        return base;
      };

      const charts = {
        sentimentDistribution: sentimentToDistribution(
          analysis.overallSentiment,
          analysis.customerSatisfactionScore
        ),
        peakHours: analysis.peakHours ?? [],
      };

      setKpiData({ kpis, charts });
      setIsLoadingKPIs(false);
    } else {
      // No analysis available
      setKpiData(null);
      setIsLoadingKPIs(false);
    }
  }, [globalAnalysis]);

  // Helper function to convert sentiment label to score
  const getSentimentScore = (sentiment: string | undefined): number | null => {
    if (!sentiment) return null;
    const sentimentMap: Record<string, number> = {
      very_negative: -0.8,
      negative: -0.4,
      neutral: 0,
      positive: 0.4,
      very_positive: 0.8,
    };
    return sentimentMap[sentiment] ?? null;
  };

  // التمرير إلى قسم المحادثات عند وجود hash في URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash === "#chats") {
        // انتظار قليلاً لضمان تحميل المحتوى
        setTimeout(() => {
          const chatsSection = document.getElementById("chats-section");
          if (chatsSection) {
            chatsSection.scrollIntoView({ behavior: "smooth", block: "start" });
            // إزالة hash من URL بعد التمرير
            window.history.replaceState(null, "", window.location.pathname);
          }
        }, 300);
      }
    }
  }, []);

  const handleDeleteChat = async (chatId: Id<"chats">) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete chat");
      }

      // The paginated query will automatically update when the chat is deleted
      // No need to manually update the list
    } catch (error) {
      console.error("Error deleting chat:", error);
      alert("Failed to delete chat");
    }
  };
  return (
    <div className="min-h-[calc(100vh-120px)]">
      {/* Header with gradient background */}
      <div className="sticky px-3 sm:px-4 md:px-6 lg:px-8 mx-auto top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border dark:border-purple-500/10 rounded-2xl mb-6">
        <div className="py-4 sm:py-5 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground via-purple-200 to-purple-300 dark:from-white dark:via-purple-200 dark:to-purple-300 bg-clip-text text-transparent">
                  {t("welcome")}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1 truncate">
                  {user?.fullName || "No name"}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsUploadDialogOpen(true)}
              className="group relative bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-primary-foreground shadow-lg shadow-purple-500/30 transition-all duration-300 shrink-0"
            >
              <div className="relative flex items-center gap-2">
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-primary-foreground/20 group-hover:bg-primary-foreground/30 transition-all duration-300 scale-0 group-hover:scale-100"></div>
                  <Plus className="w-4 h-4 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
                </div>
                <span className="font-medium">{t("uploadChat")}</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-foreground/0 via-primary-foreground/50 to-primary-foreground/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative mt-4 sm:mt-5">
            <div className="relative group">
              <Search
                className={`absolute ${locale === "ar" ? "right-4" : "left-4"} top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-purple-400 transition-colors duration-300`}
              />
              <input
                type="text"
                placeholder={
                  useSemanticSearch
                    ? t("semanticSearchPlaceholder", {
                        default: "Search semantically...",
                      })
                    : t("searchPlaceholder")
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${locale === "ar" ? "pr-12 pl-4" : "pl-12 pr-4"} py-3 sm:py-3.5 bg-muted/60 dark:bg-muted/40 border border-border hover:border-purple-500/50 focus:border-purple-500/50 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 backdrop-blur-sm`}
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/0 via-purple-500/0 to-purple-500/0 group-focus-within:from-purple-500/5 group-focus-within:via-purple-500/10 group-focus-within:to-purple-500/5 transition-all duration-300 pointer-events-none"></div>
              {useSemanticSearch && isSemanticSearching && (
                <div
                  className={`absolute ${locale === "ar" ? "left-4" : "right-4"} top-1/2 transform -translate-y-1/2`}
                >
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                </div>
              )}
              {useSemanticSearch && !isSemanticSearching && semanticResults && (
                <div
                  className={`absolute ${locale === "ar" ? "left-4" : "right-4"} top-1/2 transform -translate-y-1/2`}
                >
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                </div>
              )}
            </div>
            {searchQuery.trim().length >= 3 && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                <span>
                  {useSemanticSearch
                    ? t("usingSemanticSearch", {
                        default: "Using semantic search",
                      })
                    : t("usingTextSearch", {
                        default: "Using text search",
                      })}
                </span>
                <button
                  onClick={() => setUseSemanticSearch(!useSemanticSearch)}
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  {useSemanticSearch
                    ? t("switchToText", { default: "Switch to text" })
                    : t("switchToSemantic", { default: "Switch to semantic" })}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 sm:gap-8">
        {/* KPI Cards */}
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5 sm:mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              {t("keyMetrics") || "Key Metrics"}
            </h2>
          </div>
          {isLoadingKPIs ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-muted/50 border border-border/30 rounded-xl p-6 animate-pulse"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-24 mb-3"></div>
                      <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                    </div>
                    <div className="w-12 h-12 bg-muted rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : kpiData ? (
            <KPICards data={kpiData.kpis} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("noAnalysisYet") || "No analysis available yet"}</p>
              <p className="text-sm mt-2">
                {t("generateAnalysis") ||
                  "Generate a global analysis to see key metrics"}
              </p>
            </div>
          )}
        </div>

        {/* Additional Charts */}
        {isLoadingKPIs ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-cyan-500/10 to-blue-600/20 rounded-2xl blur-xl opacity-50 transition duration-500"></div>
                <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl border border-border dark:border-blue-500/20 h-[400px] animate-pulse">
                  <div className="p-4 md:p-5 h-full">
                    <div className="h-6 bg-muted rounded w-32 mb-4"></div>
                    <div className="h-full bg-muted rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : kpiData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-cyan-500/10 to-blue-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl border border-border dark:border-blue-500/20">
                <ChatVolume data={kpiData.charts.peakHours} />
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-pink-500/10 to-purple-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl border border-border dark:border-purple-500/20">
                <SentimentDistribution
                  data={kpiData.charts.sentimentDistribution}
                />
              </div>
            </div>
            {/*           <div className="relative group lg:col-span-2">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/20 via-green-500/10 to-emerald-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl border border-border dark:border-emerald-500/20">
                <TopIssuesChart data={kpiData.charts.topIssues} />
              </div>
            </div> */}
          </div>
        ) : null}

        {/* Chats List */}
        <div id="chats-section" className="relative group scroll-mt-24">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600/20 via-purple-500/10 to-indigo-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
          <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-border dark:border-indigo-500/20">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <MessageSquare className="w-5 h-5 text-primary-foreground" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground to-indigo-200 dark:from-white dark:to-indigo-200 bg-clip-text text-transparent">
                  {t("yourChats")}
                </h2>
              </div>
            </div>
            {filteredChats.length === 0 ? (
              <div className="relative group/empty">
                <div className="absolute -inset-1 bg-gradient-to-r from-muted/20 via-muted/10 to-muted/20 rounded-xl blur-lg opacity-50"></div>
                <div className="relative bg-muted/50 rounded-xl p-12 text-center border border-border/30">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-muted border border-border/50 flex items-center justify-center">
                    <MessageSquare className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground/90 mb-2">
                    {searchQuery ? t("noResults") : t("noChats")}
                  </h3>
                  <p className="text-muted-foreground text-sm sm:text-base mb-6 max-w-md mx-auto">
                    {searchQuery
                      ? t("tryDifferentSearch")
                      : t("uploadFirstChat")}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={() => setIsUploadDialogOpen(true)}
                      className="group/btn relative bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-primary-foreground shadow-lg shadow-purple-500/30 transition-all duration-300"
                    >
                      <div className="relative flex items-center gap-2">
                        <div className="relative w-5 h-5 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full bg-primary-foreground/20 group-hover/btn:bg-primary-foreground/30 transition-all duration-300 scale-0 group-hover/btn:scale-100"></div>
                          <Plus className="w-4 h-4 relative z-10 group-hover/btn:rotate-90 transition-transform duration-300" />
                        </div>
                        <span className="font-medium">{t("uploadChat")}</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-foreground/0 via-primary-foreground/50 to-primary-foreground/0 scale-x-0 group-hover/btn:scale-x-100 transition-transform duration-300"></div>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredChats.map((chat) => (
                    <ChatListItem
                      key={chat._id}
                      chat={chat}
                      onDelete={handleDeleteChat}
                    />
                  ))}
                </div>
                {/* Infinite scroll trigger */}
                {status === "CanLoadMore" && (
                  <div
                    ref={loadMoreRef}
                    className="flex items-center justify-center py-8"
                  >
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                )}
                {status === "LoadingMore" && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                )}
                {status === "Exhausted" && filteredChats.length > 0 && (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">
                      {t("allChatsLoaded") || "All chats loaded"}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      <UploadChatDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
      />
    </div>
  );
}
