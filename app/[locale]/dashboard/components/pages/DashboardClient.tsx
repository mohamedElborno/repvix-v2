"use client";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  MessageSquare,
  Plus,
  Search,
  Loader2,
  TrendingUp,
  GripVertical,
  Settings2,
  LayoutGrid,
  PanelsTopLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UploadChatDialog from "../UploadChatDialog";
import ChatListItem from "../ChatListItem";
import { useTranslations } from "next-intl";
import type { DashboardClientProps } from "../../types/dashboard";
import { useOrganization } from "@clerk/nextjs";
import type { Id } from "@/convex/_generated/dataModel";
import {
  useQuery,
  useAction,
  usePaginatedQuery,
  useMutation,
} from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLocale } from "next-intl";
import { useRef } from "react";
import { toast } from "sonner";

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
  const locale = useLocale();
  const { organization } = useOrganization();
  const t = useTranslations("dashboard");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [kpiData, setKpiData] = useState<any>(null);
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(true);
  const [useSemanticSearch, setUseSemanticSearch] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<
    "bug" | "idea" | "praise" | "other"
  >("idea");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [chatViewMode, setChatViewMode] = useState<"grid" | "whatsapp">("grid");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  type WidgetKey = "kpis" | "charts" | "chats";
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [layoutOrder, setLayoutOrder] = useState<WidgetKey[]>(["chats"]);
  const [visibleWidgets, setVisibleWidgets] = useState<
    Record<WidgetKey, boolean>
  >({
    kpis: false,
    charts: false,
    chats: true,
  });
  const [draggingKey, setDraggingKey] = useState<WidgetKey | null>(null);

  // Resolve organization ID (prefer server-provided from initial chats, fallback to Clerk org)
  const convexOrgId = useQuery(
    api.orgs.getByClerkId,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );
  const organizationId = initialChats[0]?.organizationId ?? convexOrgId;

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

  // Subscription status (null = no subscription yet, undefined = loading/skip)
  const latestSubscription = useQuery(
    api.subscriptions.getByOrg,
    organizationId ? { organizationId } : "skip"
  );
  const showTrialBanner = !!organizationId && latestSubscription === null;

  const deleteChat = useMutation(api.chats.deleteChat);
  const submitFeedback = useMutation(api.feedbacks.submitFeedback);

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

  const analyticsAvailable = !!kpiData && !isLoadingKPIs;
  const chartsAvailable =
    analyticsAvailable &&
    ((kpiData?.charts?.peakHours?.length ?? 0) > 0 ||
      !!kpiData?.charts?.sentimentDistribution);

  const availableWidgets = useMemo<WidgetKey[]>(() => {
    const widgets: WidgetKey[] = ["chats"];
    if (analyticsAvailable) {
      widgets.unshift("kpis");
    }
    if (chartsAvailable) {
      widgets.splice(widgets.indexOf("chats"), 0, "charts");
    }
    return widgets;
  }, [analyticsAvailable, chartsAvailable]);

  // Keep layout order aligned with available widgets and ensure defaults exist
  useEffect(() => {
    setLayoutOrder((prev) => {
      const filtered = prev.filter((key) => availableWidgets.includes(key));
      const missing = availableWidgets.filter((k) => !filtered.includes(k));
      return [...filtered, ...missing];
    });
    setVisibleWidgets((prev) => {
      const next = { ...prev };
      (["kpis", "charts"] as WidgetKey[]).forEach((k) => {
        if (!availableWidgets.includes(k)) next[k] = false;
      });
      return next;
    });
  }, [availableWidgets]);

  // Persist customizer choices per organization
  const prefsKey = organizationId ? `dashboard_prefs_${organizationId}` : null;
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    if (!prefsKey || prefsLoaded) return;
    try {
      const raw =
        typeof window !== "undefined" ? localStorage.getItem(prefsKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as {
          layoutOrder?: WidgetKey[];
          visibleWidgets?: Partial<Record<WidgetKey, boolean>>;
          chatViewMode?: "grid" | "whatsapp";
        };
        if (parsed.visibleWidgets) {
          setVisibleWidgets((prev) => ({
            ...prev,
            ...parsed.visibleWidgets,
          }));
        }
        if (parsed.layoutOrder) {
          setLayoutOrder((prev) => {
            const filtered = parsed.layoutOrder!.filter((k) =>
              availableWidgets.includes(k)
            );
            const missing = availableWidgets.filter(
              (k) => !filtered.includes(k)
            );
            return [...filtered, ...missing];
          });
        }
        if (
          parsed.chatViewMode === "grid" ||
          parsed.chatViewMode === "whatsapp"
        ) {
          setChatViewMode(parsed.chatViewMode);
        }
      }
    } catch (e) {
      console.warn("Failed to load dashboard preferences", e);
    } finally {
      setPrefsLoaded(true);
    }
  }, [prefsKey, prefsLoaded, availableWidgets]);

  useEffect(() => {
    if (!prefsKey || !prefsLoaded) return;
    try {
      localStorage.setItem(
        prefsKey,
        JSON.stringify({ layoutOrder, visibleWidgets, chatViewMode })
      );
    } catch (e) {
      console.warn("Failed to save dashboard preferences", e);
    }
  }, [prefsKey, prefsLoaded, layoutOrder, visibleWidgets, chatViewMode]);

  const renderedWidgets = useMemo(
    () =>
      layoutOrder.filter(
        (key) => availableWidgets.includes(key) && visibleWidgets[key]
      ),
    [availableWidgets, layoutOrder, visibleWidgets]
  );

  const toggleWidget = (key: WidgetKey, value: boolean) => {
    if (!availableWidgets.includes(key)) return;
    setVisibleWidgets((prev) => ({ ...prev, [key]: value }));
    if (value && !layoutOrder.includes(key)) {
      setLayoutOrder((prev) => [...prev, key]);
    }
  };

  const reorder = (from: WidgetKey, to: WidgetKey) => {
    setLayoutOrder((prev) => {
      const current = [...prev];
      const fromIndex = current.indexOf(from);
      const toIndex = current.indexOf(to);
      if (fromIndex === -1 || toIndex === -1) return current;
      current.splice(fromIndex, 1);
      current.splice(toIndex, 0, from);
      return current;
    });
  };

  const handleDragStart = (key: WidgetKey) => setDraggingKey(key);
  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    key: WidgetKey
  ) => {
    event.preventDefault();
    if (!draggingKey || draggingKey === key) return;
    reorder(draggingKey, key);
  };
  const handleDragEnd = () => setDraggingKey(null);

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

  const widgetLabels: Record<WidgetKey, string> = {
    kpis: t("keyMetrics") || "Key Metrics",
    charts: t("charts") || "Charts",
    chats: t("yourChats") || "Chats",
  };

  const getLastMessagePreview = (chatId: Id<"chats">) => {
    const msgs = allMessages[chatId] ?? [];
    if (!msgs.length) return { text: t("noMessagesYet") || "", ts: null };
    const last = msgs[msgs.length - 1] as any;
    const text = (last.textRaw || last.textClean || "").trim();
    const ts =
      typeof last.externalTimestamp === "number"
        ? last.externalTimestamp
        : typeof last.internalTimestamp === "number"
          ? last.internalTimestamp
          : null;
    return { text, ts };
  };

  const formatTimeShort = (ts: number | null) => {
    if (!ts) return "";
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      day: "numeric",
    }).format(new Date(ts));
  };

  const getAvatarData = (label: string) => {
    const text = (label || "").trim();
    if (!text) return { initials: "?", color: "bg-gray-400" };
    const parts = text.split(/\s+/).slice(0, 2);
    const initials =
      parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
    const palette = [
      "bg-emerald-500",
      "bg-blue-500",
      "bg-indigo-500",
      "bg-purple-500",
      "bg-amber-500",
      "bg-rose-500",
    ];
    const idx =
      text.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
      palette.length;
    return { initials, color: palette[idx] };
  };

  const renderWidget = (key: WidgetKey) => {
    switch (key) {
      case "kpis":
        return (
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
        );
      case "charts":
        return (
          <>
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
              </div>
            ) : null}
          </>
        );
      case "chats":
      default:
        return (
          <div id="chats-section" className="relative group scroll-mt-24">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600/20 via-purple-500/10 to-indigo-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-border dark:border-indigo-500/20">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <MessageSquare className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
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
                  <div
                    className={
                      chatViewMode === "whatsapp"
                        ? "grid grid-cols-1 gap-3"
                        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    }
                  >
                    {filteredChats.map((chat) => {
                      if (chatViewMode === "whatsapp") {
                        const preview = getLastMessagePreview(chat._id);
                        const customerLabel =
                          chat.customerIdentifier ||
                          chat.title ||
                          t("chats.untitledChat", { default: "Untitled chat" });
                        const { initials, color } =
                          getAvatarData(customerLabel);
                        return (
                          <Card
                            key={chat._id}
                            className="p-3 border border-border bg-card/90 hover:bg-muted/50 transition cursor-pointer"
                            onClick={() =>
                              window.location.assign(
                                `/${locale}/dashboard/chats/${chat._id}`
                              )
                            }
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage alt={customerLabel} />
                                <AvatarFallback
                                  className={`${color} text-white`}
                                >
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-semibold text-sm truncate">
                                    {customerLabel}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground shrink-0">
                                    {formatTimeShort(preview.ts)}
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                  {preview.text || t("noMessagesYet") || ""}
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      }

                      return (
                        <ChatListItem
                          key={chat._id}
                          chat={chat}
                          onDelete={handleDeleteChat}
                        />
                      );
                    })}
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
        );
    }
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
      await deleteChat({ chatId });
      toast.success(t("chatDeleted") || "Chat deleted");
      // paginated query will refresh automatically
    } catch (error: any) {
      console.error("Error deleting chat:", error);
      toast.error(
        error?.message || t("chatDeleteFailed") || "Failed to delete chat"
      );
    }
  };

  const handleSubmitFeedback = async () => {
    if (!organizationId) {
      toast.error(
        t("feedback.noOrg") ||
          "Please create or select an organization before sending feedback"
      );
      return;
    }

    if (!feedbackMessage.trim()) {
      toast.error(t("feedback.required") || "Please write your feedback first");
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      await submitFeedback({
        organizationId,
        message: feedbackMessage.trim(),
        category: feedbackCategory,
      });
      setFeedbackMessage("");
      setFeedbackCategory("idea");
      setIsFeedbackOpen(false);
      toast.success(t("feedback.success") || "Thanks! Feedback sent.");
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast.error(t("feedback.error") || "Failed to submit feedback");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };
  return (
    <div className="min-h-[calc(100vh-120px)]">
      {showTrialBanner && (
        <Card className="mb-4 border border-border bg-card p-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4">
            <div className="flex items-start gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  {t("trialBanner.title")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("trialBanner.description")}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="h-9 px-3 bg-purple-600 hover:bg-purple-500 text-white"
              onClick={() => {
                window.location.assign(`/${locale}/dashboard/pricing`);
              }}
            >
              {t("trialBanner.cta")}
            </Button>
          </div>
        </Card>
      )}
      {/* Actions + simple search */}
      <div className="mx-auto mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 flex items-center gap-2">
            <div className="relative w-full">
              <Search
                className={`absolute ${locale === "ar" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`}
              />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${locale === "ar" ? "pr-10 pl-3" : "pl-10 pr-3"} h-9 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30`}
              />
              {useSemanticSearch && isSemanticSearching && (
                <Loader2
                  className={`absolute ${locale === "ar" ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500 animate-spin`}
                />
              )}
            </div>
            <Button
              onClick={() => setIsUploadDialogOpen(true)}
              className="max-h-9 group relative bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-primary-foreground transition-all duration-300 shrink-0"
            >
              <div className="relative flex items-center md:gap-2">
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-primary-foreground/20 group-hover:bg-primary-foreground/30 transition-all duration-300 scale-0 group-hover:scale-100"></div>
                  <Plus className="w-4 h-4 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
                </div>
                <span className="hidden md:block font-medium">
                  {t("uploadChat")}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-foreground/0 via-primary-foreground/50 to-primary-foreground/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setChatViewMode((prev) =>
                  prev === "grid" ? "whatsapp" : "grid"
                )
              }
              aria-label={
                chatViewMode === "grid" ? "WhatsApp view" : "Grid view"
              }
              className="border border-border bg-card hover:bg-muted/60"
            >
              {chatViewMode === "grid" ? (
                <PanelsTopLeft className="w-4 h-4" />
              ) : (
                <LayoutGrid className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCustomizer((p) => !p)}
              aria-label={
                showCustomizer ? t("hideCustomizer") : t("showCustomizer")
              }
              className="border border-border bg-card hover:bg-muted/60"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {showCustomizer && (
        <div className="mb-4 sm:mb-6">
          <Card className="p-4">
            <div className="text-sm font-medium text-foreground">
              {t("chooseWidgets") || "Choose widgets to display"}
            </div>
            <div className="flex flex-wrap gap-3">
              {availableWidgets.map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm cursor-pointer bg-card/60"
                >
                  <input
                    type="checkbox"
                    className="accent-purple-600"
                    checked={!!visibleWidgets[key]}
                    onChange={(e) => toggleWidget(key, e.target.checked)}
                  />
                  <span>{widgetLabels[key]}</span>
                </label>
              ))}
            </div>
            {!analyticsAvailable && (
              <p className="text-xs text-muted-foreground">
                {t("analyticsHiddenNoData") ||
                  "Analytics widgets appear here only when data exists."}
              </p>
            )}
          </Card>
        </div>
      )}

      <div className="flex flex-col gap-6 sm:gap-8">
        {renderedWidgets.map((key) => (
          <div
            key={key}
            draggable
            onDragStart={() => handleDragStart(key)}
            onDragOver={(e) => handleDragOver(e, key)}
            onDragEnd={handleDragEnd}
            className={`group rounded-2xl border border-transparent transition-shadow ${
              draggingKey === key ? "ring-2 ring-purple-400/50" : ""
            }`}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 px-1">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4" />
                <span>{widgetLabels[key]}</span>
              </div>
              <span>{t("dragToReorder") || "Drag to reorder"}</span>
            </div>
            {renderWidget(key)}
          </div>
        ))}
        {renderedWidgets.length === 0 && (
          <Card className="p-6 text-sm text-muted-foreground">
            {t("noWidgetsVisible") ||
              "No widgets visible. Enable blocks from the customizer above."}
          </Card>
        )}
      </div>

      {/* Upload Dialog */}
      <UploadChatDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
      />

      {/* Floating feedback box – يظهر بعد أول تحليل */}
      {analyticsAvailable && (
        <div
          className={`fixed bottom-4 ${
            locale === "ar" ? "left-4" : "right-4"
          } z-20 flex flex-col items-end gap-2`}
        >
          {isFeedbackOpen ? (
            <Card className="w-80 shadow-xl border border-border bg-card/90 backdrop-blur-md">
              <div className="flex items-center justify-between p-3 border-b border-border/60">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="w-4 h-4" />
                  {t("feedback.title")}
                </div>
                <button
                  onClick={() => setIsFeedbackOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("feedback.category")}
                  </label>
                  <select
                    value={feedbackCategory}
                    onChange={(e) =>
                      setFeedbackCategory(
                        e.target.value as "bug" | "idea" | "praise" | "other"
                      )
                    }
                    className="w-full bg-muted/60 dark:bg-muted/40 border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  >
                    <option value="bug">{t("feedback.categories.bug")}</option>
                    <option value="idea">
                      {t("feedback.categories.idea")}
                    </option>
                    <option value="praise">
                      {t("feedback.categories.praise")}
                    </option>
                    <option value="other">
                      {t("feedback.categories.other")}
                    </option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("feedback.placeholderLabel")}
                  </label>
                  <textarea
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    rows={3}
                    placeholder={t("feedback.placeholder")}
                    className="w-full bg-muted/60 dark:bg-muted/40 border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFeedbackOpen(false)}
                  >
                    {t("close") || "Close"}
                  </Button>
                  <Button
                    onClick={handleSubmitFeedback}
                    disabled={isSubmittingFeedback}
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-primary-foreground shadow-lg shadow-purple-500/30 transition-all duration-300"
                  >
                    {isSubmittingFeedback
                      ? t("feedback.submitting")
                      : t("feedback.submit")}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Button
              size="sm"
              className="shadow-lg bg-gradient-to-r from-purple-600 to-purple-500 text-white"
              onClick={() => setIsFeedbackOpen(true)}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {t("feedback.title")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
