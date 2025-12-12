"use client";

import { useState, useMemo, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useOrganization } from "@clerk/nextjs";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { limitsForTier, type PlanTier } from "@/convex/billingPlan";
import { toast } from "sonner";
import {
  TrendingUp,
  Loader2,
  BarChart3,
  RefreshCw,
  Sparkles,
  Target,
  Heart,
  CheckCircle2,
  Lightbulb,
  MessageSquare,
  Activity,
  Users,
  Calendar,
  AlertCircle,
  Shield,
  Zap,
  HelpCircle,
  Download,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  CartesianGrid,
  LineChart,
  Line,
  LabelList,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { GlobalAnalysisReport } from "../GlobalAnalysisReport";
import { useExportMarkdown } from "../../hooks/useExportMarkdown";
import type { GlobalAnalysis } from "../../types/dashboard";
import { IconPdf } from "@tabler/icons-react";

const CHART_COLORS = [
  "#8b5cf6",
  "#ec4899",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
];

const SENTIMENT_LABELS: Record<
  string,
  Record<
    "very_negative" | "negative" | "neutral" | "positive" | "very_positive",
    string
  >
> = {
  ar: {
    very_negative: "سلبي جدًا",
    negative: "سلبي",
    neutral: "محايد",
    positive: "إيجابي",
    very_positive: "إيجابي جدًا",
  },
  en: {
    very_negative: "Very negative",
    negative: "Negative",
    neutral: "Neutral",
    positive: "Positive",
    very_positive: "Very positive",
  },
  es: {
    very_negative: "Muy negativo",
    negative: "Negativo",
    neutral: "Neutral",
    positive: "Positivo",
    very_positive: "Muy positivo",
  },
  fr: {
    very_negative: "Très négatif",
    negative: "Négatif",
    neutral: "Neutre",
    positive: "Positif",
    very_positive: "Très positif",
  },
  hi: {
    very_negative: "अत्यंत नकारात्मक",
    negative: "नकारात्मक",
    neutral: "तटस्थ",
    positive: "सकारात्मक",
    very_positive: "अत्यंत सकारात्मक",
  },
  ja: {
    very_negative: "とてもネガティブ",
    negative: "ネガティブ",
    neutral: "ニュートラル",
    positive: "ポジティブ",
    very_positive: "とてもポジティブ",
  },
  tr: {
    very_negative: "Çok negatif",
    negative: "Negatif",
    neutral: "Nötr",
    positive: "Pozitif",
    very_positive: "Çok pozitif",
  },
};

const RISK_LEVEL_LABELS: Record<
  string,
  Record<"low" | "medium" | "high", string>
> = {
  ar: { low: "منخفض", medium: "متوسط", high: "مرتفع" },
  en: { low: "Low", medium: "Medium", high: "High" },
  es: { low: "Bajo", medium: "Medio", high: "Alto" },
  fr: { low: "Faible", medium: "Moyen", high: "Élevé" },
  hi: { low: "कम", medium: "मध्यम", high: "उच्च" },
  ja: { low: "低", medium: "中", high: "高" },
  tr: { low: "Düşük", medium: "Orta", high: "Yüksek" },
};

const PRIORITY_LABELS: Record<
  string,
  Record<"low" | "medium" | "high", string>
> = {
  ar: { low: "منخفض", medium: "متوسط", high: "مرتفع" },
  en: { low: "Low", medium: "Medium", high: "High" },
  es: { low: "Baja", medium: "Media", high: "Alta" },
  fr: { low: "Faible", medium: "Moyenne", high: "Élevée" },
  hi: { low: "कम", medium: "मध्यम", high: "उच्च" },
  ja: { low: "低い", medium: "中", high: "高い" },
  tr: { low: "Düşük", medium: "Orta", high: "Yüksek" },
};

export default function GlobalAnalyticsClient() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { organization } = useOrganization();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(locale);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingFaqs, setIsGeneratingFaqs] = useState(false);
  const analysisRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Get convexOrgId from Clerk org ID
  const convexOrgId = useQuery(
    api.orgs.getByClerkId,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  ) as Id<"organizations"> | null | undefined;

  const latest = useQuery(
    api.globalAnalysis.getLatestByOrg,
    convexOrgId ? { organizationId: convexOrgId } : "skip"
  );

  const runFull = useAction(api.globalChatAnalysis.runFullGlobalAnalysis);
  const generateFaqs = useAction(api.faqs.generateFaqs);
  const faqs = useQuery(
    api.faqs.list,
    convexOrgId ? { organizationId: convexOrgId } : "skip"
  );
  const currentPlan = useQuery(
    api.billing.getCurrentPlan,
    convexOrgId ? { organizationId: convexOrgId } : "skip"
  );

  const hasAutoFaqs = useMemo(() => {
    const tier = (currentPlan?.planTier ?? "basic") as PlanTier;
    return limitsForTier(tier).features.autoFaqs;
  }, [currentPlan?.planTier]);

  const canExportMarkdown = useMemo(() => {
    const tier = (currentPlan?.planTier ?? "basic") as PlanTier;
    return limitsForTier(tier).exports.includes("md");
  }, [currentPlan?.planTier]);

  const analysis: GlobalAnalysis | null = latest?.analysis ?? null;
  // Only show loading if we have an orgId and the query is still loading
  const isLoading = organization?.id
    ? convexOrgId === undefined || latest === undefined
    : false;

  const translateSentiment = (value?: string | null) => {
    if (!value) return "N/A";
    return (
      SENTIMENT_LABELS[locale]?.[
        value as keyof (typeof SENTIMENT_LABELS)[typeof locale]
      ] ?? value
    );
  };

  const translateRiskLevel = (value?: string | null) => {
    if (!value) return "N/A";
    return (
      RISK_LEVEL_LABELS[locale]?.[
        value as keyof (typeof RISK_LEVEL_LABELS)[typeof locale]
      ] ?? value
    );
  };

  const translatePriority = (value?: string | null) => {
    if (!value) return value ?? "";
    return (
      PRIORITY_LABELS[locale]?.[
        value as keyof (typeof PRIORITY_LABELS)[typeof locale]
      ] ?? value
    );
  };

  const languages = [
    { code: "ar", name: "العربية" },
    { code: "en", name: "English" },
    { code: "fr", name: "Français" },
    { code: "tr", name: "Türkçe" },
    { code: "es", name: "Español" },
    { code: "hi", name: "हिन्दी" },
    { code: "ja", name: "日本語" },
  ];

  const handleGenerate = async (forceRegenerate = false) => {
    if (!convexOrgId) return;
    setShowLanguageModal(true);
  };

  const handleConfirmGenerate = async () => {
    if (!convexOrgId) {
      toast.error(t("noOrganization") || "No organization found");
      return;
    }
    setIsGenerating(true);
    setShowLanguageModal(false);
    try {
      toast.loading(
        t("generatingAnalysis") ||
          "Generating analysis... This may take a moment.",
        { id: "generating-analysis" }
      );
      const result = await runFull({
        organizationId: convexOrgId,
        language: selectedLanguage as
          | "ar"
          | "en"
          | "tr"
          | "fr"
          | "es"
          | "hi"
          | "ja",
      });
      if (
        result?.ok === false &&
        result.code === "RATE_LIMIT_GLOBAL_ANALYSIS"
      ) {
        const windowHours = result.windowHours ?? 24;
        const hours = result.remainingHours ?? windowHours;
        const message = `You can generate one global analysis every ${windowHours} hours. Try again in ~${hours}h.`;
        toast.error(message, { id: "generating-analysis" });
      } else {
        toast.success(
          t("analysisGenerated") || "Analysis generated successfully!",
          { id: "generating-analysis" }
        );
      }
    } catch (error) {
      console.error("Error generating analysis:", error);
      const parsed = parseError(error);
      if (parsed?.code === "RATE_LIMIT_GLOBAL_ANALYSIS") {
        const windowHours = parsed.windowHours ?? 24;
        const hours = parsed.remainingHours ?? windowHours;
        const message = `You can generate one global analysis every ${windowHours} hours. Try again in ~${hours}h.`;
        toast.error(message, { id: "generating-analysis" });
      } else {
        const errorMessage =
          error instanceof Error
            ? error.message
            : t("analysisError") || "Failed to generate analysis";
        toast.error(errorMessage, { id: "generating-analysis" });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFaqs = async () => {
    if (!convexOrgId) {
      toast.error(t("noOrganization") || "No organization found");
      return;
    }
    if (!hasAutoFaqs) {
      toast.error(
        t("faqs.planRequired") || "Upgrade your plan to generate FAQs"
      );
      return;
    }
    setIsGeneratingFaqs(true);
    toast.loading(
      t("faqs.generating") || "Generating FAQs from your analyses...",
      { id: "generating-faqs" }
    );
    try {
      const result = await generateFaqs({
        organizationId: convexOrgId,
        language: selectedLanguage as
          | "ar"
          | "en"
          | "tr"
          | "fr"
          | "es"
          | "hi"
          | "ja",
      });
      if (result?.ok === false) {
        if (result.code === "FAQ_RATE_LIMIT_STARTER") {
          const days = result.remainingDays ?? 7;
          const hours = result.remainingHours ?? days * 24;
          toast.error(
            t("faqs.rateLimitStarter", { days, hours }) ||
              `FAQs can be generated once every 7 days on Starter. Try again in ~${days} days (${hours}h).`,
            { id: "generating-faqs" }
          );
        } else if (result.code === "FAQ_RATE_LIMIT_PRO") {
          const hours = result.remainingHours ?? 24;
          toast.error(
            t("faqs.rateLimitPro", { hours }) ||
              `FAQs can be generated once per day on higher plans. Try again in ~${hours}h.`,
            { id: "generating-faqs" }
          );
        } else {
          toast.error(t("faqs.error") || "Failed to generate FAQs", {
            id: "generating-faqs",
          });
        }
      } else {
        toast.success(t("faqs.success") || "FAQs generated successfully!", {
          id: "generating-faqs",
        });
      }
    } catch (error) {
      console.error("Error generating FAQs:", error);
      const parsed = parseError(error);
      if (parsed?.code === "FAQ_RATE_LIMIT_STARTER") {
        const days = parsed.remainingDays ?? 7;
        const hours = parsed.remainingHours ?? days * 24;
        toast.error(
          t("faqs.rateLimitStarter", { days, hours }) ||
            `FAQs can be generated once every 7 days on Starter. Try again in ~${days} days (${hours}h).`,
          { id: "generating-faqs" }
        );
      } else if (parsed?.code === "FAQ_RATE_LIMIT_PRO") {
        const hours = parsed.remainingHours ?? 24;
        toast.error(
          t("faqs.rateLimitPro", { hours }) ||
            `FAQs can be generated once per day on higher plans. Try again in ~${hours}h.`,
          { id: "generating-faqs" }
        );
      } else {
        const message =
          error instanceof Error
            ? error.message
            : t("faqs.error") || "Failed to generate FAQs";
        toast.error(message, { id: "generating-faqs" });
      }
    } finally {
      setIsGeneratingFaqs(false);
    }
  };

  // Prepare peak hours data for chart - show all 24 hours
  const peakHoursData = useMemo(() => {
    const hoursData: Array<{ name: string; count: number }> = [];

    // Initialize all 24 hours with count 0
    for (let hour = 0; hour < 24; hour++) {
      const peakHour = analysis?.peakHours?.find((ph) => ph.hour === hour);
      hoursData.push({
        name: `${hour}:00`,
        count: peakHour?.count || 0,
      });
    }

    return hoursData;
  }, [analysis?.peakHours]);

  // Chart config for peak hours
  const peakHoursChartConfig = useMemo(() => {
    return {
      count: {
        label: t("count") || "Count",
        color: "hsl(142, 71%, 45%)",
      },
    } satisfies ChartConfig;
  }, [t]);

  // Get organization members to map agent IDs to names
  const organizationMembers = useQuery(
    api.orgs.getOrganizationMembers,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );

  // Create a map of member ID to name
  const memberIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    if (organizationMembers) {
      organizationMembers.forEach((member) => {
        map[member._id] = member.name || "Unknown";
      });
    }
    return map;
  }, [organizationMembers]);

  // Prepare agent leaderboard data for BarChart
  const agentLeaderboardData = useMemo(() => {
    if (!analysis?.agentLeaderboard || !organizationMembers) return [];

    return analysis.agentLeaderboard
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((agent, index) => {
        const agentName =
          agent.agentId && agent.agentId !== "unknown"
            ? memberIdToName[agent.agentId] || `Agent ${index + 1}`
            : `Agent ${index + 1}`;
        return {
          name: agentName,
          score: agent.score,
          fill: CHART_COLORS[index % CHART_COLORS.length],
        };
      });
  }, [analysis?.agentLeaderboard, memberIdToName, organizationMembers]);

  // Chart config for agent leaderboard
  const agentChartConfig = useMemo(() => {
    return {
      score: {
        label: t("score") || "Score",
        color: "hsl(270, 70%, 60%)",
      },
    } satisfies ChartConfig;
  }, [t]);

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleDownloadMarkdown = useExportMarkdown({
    analysis,
    memberIdToName,
    canExportMarkdown,
    t,
  });

  return (
    <div className="min-h-[calc(100vh-110px)]">
      {/* Header */}
      <div className="sticky top-2 md:top-0 z-10 bg-background/80 dark:bg-background/70 backdrop-blur-xl border-b border-border rounded-2xl mb-6 shadow-sm">
        <div className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-foreground via-purple-600 to-purple-500 dark:from-white dark:via-purple-200 dark:to-purple-300 bg-clip-text text-transparent">
                  {t("globalAnalysis") || "Global Analysis"}
                </h1>
                <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                  {t("analyzeAllChats") ||
                    "Comprehensive analysis of all your conversations"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {analysis && (
                <>
                  <Button
                    onClick={handleDownloadPDF}
                    className="group relative bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/30 rounded-lg sm:rounded-xl px-2 sm:px-4 md:px-6 py-2 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/40"
                  >
                    <FileText className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">
                      {t("downloadPdf") || "Download PDF"}
                    </span>
                  </Button>
                  <Button
                    onClick={handleDownloadMarkdown}
                    disabled={!canExportMarkdown}
                    className="group relative bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/30 rounded-lg sm:rounded-xl px-2 sm:px-4 md:px-6 py-2 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/40 disabled:opacity-60"
                  >
                    <IconPdf className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">
                      {t("downloadMarkdown") || "Export Markdown"}
                    </span>
                  </Button>
                  <Button
                    onClick={() => handleGenerate(true)}
                    disabled={isGenerating}
                    className="group relative bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/30 rounded-lg sm:rounded-xl px-2 sm:px-4 md:px-6 py-2 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/40"
                  >
                    <RefreshCw
                      className={`w-4 h-4 sm:mr-2 ${isGenerating ? "animate-spin" : ""} group-hover:rotate-180 transition-transform duration-500`}
                    />
                    <span className="hidden sm:inline">
                      {t("regenerate") || "Regenerate"}
                    </span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        {!organization?.id ? (
          <div className="flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center mb-6 shadow-sm">
              <AlertCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center max-w-md text-lg font-medium mb-2">
              {t("noOrganization") ||
                "No organization found. Please select an organization."}
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 md:py-32">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-6 sm:mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 dark:border-purple-500/30"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 dark:border-t-purple-400 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-purple-500 dark:text-purple-400" />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-3 sm:mb-4 text-center">
              {t("loading") || "Loading..."}
            </h3>
          </div>
        ) : !analysis ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 md:py-32">
            <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center mb-6 shadow-sm">
              <TrendingUp className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center max-w-md text-lg font-medium mb-2">
              {t("noAnalysisYet") ||
                "Generate a comprehensive analysis of all your conversations"}
            </p>
            <Button
              onClick={() => handleGenerate(false)}
              className="group relative bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/30 rounded-lg sm:rounded-xl px-6 py-3 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/40 mt-4"
            >
              <Sparkles className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
              {t("generateAnalysis") || "Generate Analysis"}
            </Button>
          </div>
        ) : (
          <div
            ref={analysisRef}
            className="space-y-4 sm:space-y-6 md:space-y-8 p-1"
          >
            {/* Executive Summary */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-600/20 via-amber-500/10 to-yellow-600/20 dark:from-yellow-600/30 dark:via-amber-500/20 dark:to-yellow-600/30 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-card backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-border shadow-sm">
                <div className="flex items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 dark:from-yellow-600 dark:to-amber-700 flex items-center justify-center shadow-lg shadow-yellow-500/30 shrink-0">
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground via-yellow-600 to-amber-600 dark:from-white dark:via-yellow-200 dark:to-amber-200 bg-clip-text text-transparent mb-2">
                      {t("executiveSummary") || "Executive Summary"}
                    </h2>
                    <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-yellow-500 to-transparent rounded-full"></div>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 sm:p-6 border border-border">
                  <p className="text-sm sm:text-base text-foreground leading-relaxed break-words">
                    {analysis.overallSummary}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-pink-500/10 to-purple-600/20 dark:from-purple-600/30 dark:via-pink-500/20 dark:to-purple-600/30 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-card backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground via-purple-600 to-purple-500 dark:from-white dark:via-purple-200 dark:to-purple-300 bg-clip-text text-transparent">
                    {t("keyMetrics") || "Key Metrics"}
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="group/card relative bg-muted/50 rounded-xl p-4 border border-border hover:border-pink-500/50 dark:hover:border-pink-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-pink-500/20 flex items-center justify-center group-hover/card:scale-110 transition-transform duration-300">
                        <Heart className="w-3.5 h-3.5 text-pink-500 dark:text-pink-400" />
                      </div>
                      <p className="text-xs text-muted-foreground uppercase">
                        {t("satisfaction") || "Satisfaction"}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {analysis.customerSatisfactionScore
                        ? `${Math.round(analysis.customerSatisfactionScore)}%`
                        : "N/A"}
                    </p>
                  </div>
                  <div className="group/card relative bg-muted/50 rounded-xl p-4 border border-border hover:border-purple-500/50 dark:hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover/card:scale-110 transition-transform duration-300">
                        <Activity className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                      </div>
                      <p className="text-xs text-muted-foreground uppercase">
                        {t("sentiment") || "Sentiment"}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-foreground capitalize">
                      {translateSentiment(analysis.overallSentiment)}
                    </p>
                  </div>
                  <div className="group/card relative bg-muted/50 rounded-xl p-4 border border-border hover:border-red-500/50 dark:hover:border-red-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center group-hover/card:scale-110 transition-transform duration-300">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                      </div>
                      <p className="text-xs text-muted-foreground uppercase">
                        {t("riskScore") || "Risk Score"}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {analysis.riskScore
                        ? `${Math.round(analysis.riskScore)}%`
                        : "N/A"}
                    </p>
                  </div>
                  <div className="group/card relative bg-muted/50 rounded-xl p-4 border border-border hover:border-orange-500/50 dark:hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center group-hover/card:scale-110 transition-transform duration-300">
                        <Shield className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                      </div>
                      <p className="text-xs text-muted-foreground uppercase">
                        {t("churnRisk") || "Churn Risk"}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-foreground capitalize">
                      {translateRiskLevel(analysis.churnRiskLevel)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Peak Hours Chart */}
              {peakHoursData && peakHoursData.length > 0 && (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-green-600/20 via-emerald-500/10 to-green-600/20 dark:from-green-600/30 dark:via-emerald-500/20 dark:to-green-600/30 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                  <div className="relative bg-card backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-border shadow-sm">
                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 flex items-center justify-center shadow-lg shadow-green-500/30 shrink-0">
                        <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground via-blue-600 to-cyan-600 dark:from-white dark:via-blue-200 dark:to-cyan-200 bg-clip-text text-transparent">
                        {t("peakHours") || "Peak Hours"}
                      </h2>
                    </div>
                    <ChartContainer
                      config={peakHoursChartConfig}
                      className="h-[250px] w-full py-4"
                    >
                      <LineChart
                        accessibilityLayer
                        data={peakHoursData}
                        margin={{
                          top: 20,
                          left: 12,
                          right: 12,
                        }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 12,
                          }}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent indicator="line" />}
                        />
                        <Line
                          dataKey="count"
                          type="natural"
                          stroke="var(--color-count)"
                          strokeWidth={2}
                          dot={{
                            fill: "var(--color-count)",
                          }}
                          activeDot={{
                            r: 6,
                          }}
                        >
                          <LabelList
                            position="top"
                            offset={12}
                            className="fill-foreground"
                            fontSize={12}
                          />
                        </Line>
                      </LineChart>
                    </ChartContainer>
                  </div>
                </div>
              )}

              {/* Agent Leaderboard Chart - LineChart */}
              {agentLeaderboardData && agentLeaderboardData.length > 0 ? (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-pink-500/10 to-purple-600/20 dark:from-purple-600/30 dark:via-pink-500/20 dark:to-purple-600/30 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                  <div className="relative bg-card backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-border shadow-sm">
                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 dark:from-purple-600 dark:to-pink-700 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground via-purple-600 to-pink-600 dark:from-white dark:via-purple-200 dark:to-pink-200 bg-clip-text text-transparent">
                        {t("agentLeaderboard") || "Agent Leaderboard"}
                      </h2>
                    </div>
                    <ChartContainer
                      config={agentChartConfig}
                      className="h-[250px] w-full"
                    >
                      <BarChart
                        accessibilityLayer
                        data={agentLeaderboardData}
                        margin={{
                          top: 20,
                        }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          tickMargin={10}
                          axisLine={false}
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 12,
                          }}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent hideLabel />}
                        />
                        <Bar
                          dataKey="score"
                          fill="var(--color-score)"
                          radius={8}
                          maxBarSize={40}
                        >
                          {agentLeaderboardData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                          <LabelList
                            position="top"
                            offset={12}
                            className="fill-foreground"
                            fontSize={12}
                            formatter={(value: number) => `${value}%`}
                          />
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </div>
                </div>
              ) : (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-pink-500/10 to-purple-600/20 dark:from-purple-600/30 dark:via-pink-500/20 dark:to-purple-600/30 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                  <div className="relative bg-card backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-border shadow-sm">
                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 dark:from-purple-600 dark:to-pink-700 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground via-purple-600 to-pink-600 dark:from-white dark:via-purple-200 dark:to-pink-200 bg-clip-text text-transparent">
                        {t("agentLeaderboard") || "Agent Leaderboard"}
                      </h2>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-6 border border-border text-center">
                      <p className="text-muted-foreground text-sm">
                        {t("noAgentData") ||
                          "No agent performance data available yet. More conversations are needed to generate statistics."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Common Topics */}
            {analysis.commonTopics && analysis.commonTopics.length > 0 && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-600/20 via-emerald-500/10 to-green-600/20 dark:from-green-600/30 dark:via-emerald-500/20 dark:to-green-600/30 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                <div className="relative bg-card backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-border shadow-sm">
                  <div className="flex items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 flex items-center justify-center shadow-lg shadow-green-500/30 shrink-0">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground via-blue-600 to-cyan-600 dark:from-white dark:via-blue-200 dark:to-cyan-200 bg-clip-text text-transparent mb-2">
                        {t("commonTopics") || "Common Topics"}
                      </h2>
                      <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-blue-500 to-transparent rounded-full"></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {analysis.commonTopics.map((topic, index) => (
                      <div
                        key={index}
                        className="group/item bg-muted/50 rounded-xl p-4 border border-border hover:border-green-500/50 dark:hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center mt-0.5 group-hover/item:scale-110 transition-transform duration-300">
                            <span className="text-green-500 dark:text-green-400 text-xs font-bold">
                              {index + 1}
                            </span>
                          </div>
                          <p className="text-foreground text-sm leading-relaxed flex-1 break-words">
                            {topic}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Common Issues */}
            {analysis.commonIssues && analysis.commonIssues.length > 0 && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-600/20 via-orange-500/10 to-red-600/20 dark:from-red-600/30 dark:via-orange-500/20 dark:to-red-600/30 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                <div className="relative bg-card backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-border shadow-sm">
                  <div className="flex items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 dark:from-red-600 dark:to-orange-700 flex items-center justify-center shadow-lg shadow-red-500/30 shrink-0">
                      <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground via-red-600 to-orange-600 dark:from-white dark:via-red-200 dark:to-orange-200 bg-clip-text text-transparent mb-2">
                        {t("commonIssues") || "Common Issues"}
                      </h2>
                      <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-red-500 to-transparent rounded-full"></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {analysis.commonIssues.map((issue, index) => (
                      <div
                        key={index}
                        className="group/item bg-muted/50 rounded-xl p-4 border border-border hover:border-red-500/50 dark:hover:border-red-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center mt-0.5 group-hover/item:scale-110 transition-transform duration-300">
                            <span className="text-red-500 dark:text-red-400 text-xs font-bold">
                              {index + 1}
                            </span>
                          </div>
                          <p className="text-foreground text-sm leading-relaxed flex-1 break-words">
                            {issue}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Agent Leaderboard Details */}
            {analysis.agentLeaderboard &&
              analysis.agentLeaderboard.length > 0 && (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-pink-500/10 to-purple-600/20 dark:from-purple-600/30 dark:via-pink-500/20 dark:to-purple-600/30 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                  <div className="relative bg-card backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-border shadow-sm">
                    <div className="flex items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 dark:from-purple-600 dark:to-pink-700 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground via-purple-600 to-pink-600 dark:from-white dark:via-purple-200 dark:to-pink-200 bg-clip-text text-transparent mb-2">
                          {t("agentLeaderboard") || "Agent Leaderboard"}
                        </h2>
                        <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-purple-500 to-transparent rounded-full"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {analysis.agentLeaderboard.map((agent, index) => (
                        <div
                          key={index}
                          className="group/item bg-muted/50 rounded-xl p-4 border border-border hover:border-purple-500/50 dark:hover:border-purple-500/50 transition-all duration-300"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mt-0.5 group-hover/item:scale-110 transition-transform duration-300">
                              <span className="text-purple-500 dark:text-purple-400 text-xs font-bold">
                                {index + 1}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-semibold text-foreground">
                                  {agent.agentId && agent.agentId !== "unknown"
                                    ? memberIdToName[agent.agentId] ||
                                      `Agent ${index + 1}`
                                    : `Agent ${index + 1}`}
                                </h4>
                                <span className="text-lg font-bold text-purple-500 dark:text-purple-400">
                                  {Math.round(agent.score)}%
                                </span>
                              </div>
                              {agent.strengthSummary && (
                                <p className="text-foreground text-xs mb-1 break-words">
                                  <span className="text-green-600 dark:text-green-400 font-semibold">
                                    {t("strengths") || "Strengths"}:{" "}
                                  </span>
                                  {agent.strengthSummary}
                                </p>
                              )}
                              {agent.improvementSummary && (
                                <p className="text-foreground text-xs break-words">
                                  <span className="text-orange-600 dark:text-orange-400 font-semibold">
                                    {t("improvements") || "Improvements"}:{" "}
                                  </span>
                                  {agent.improvementSummary}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            {/* Operational Insights */}
            {analysis.operationalInsights &&
              analysis.operationalInsights.length > 0 && (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-cyan-500/10 to-blue-600/20 dark:from-blue-600/30 dark:via-cyan-500/20 dark:to-blue-600/30 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                  <div className="relative bg-card backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-border shadow-sm">
                    <div className="flex items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 dark:from-blue-600 dark:to-cyan-700 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                        <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground via-blue-600 to-cyan-600 dark:from-white dark:via-blue-200 dark:to-cyan-200 bg-clip-text text-transparent mb-2">
                          {t("operationalInsights") || "Operational Insights"}
                        </h2>
                        <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-blue-500 to-transparent rounded-full"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {analysis.operationalInsights.map((insight, index) => (
                        <div
                          key={index}
                          className="group/item bg-muted/50 rounded-xl p-4 border border-border hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-300"
                        >
                          <div className="flex items-start gap-3">
                            <Lightbulb className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <p className="text-foreground text-sm leading-relaxed flex-1 break-words">
                              {insight}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            {/* Product Insights */}
            {analysis.productInsights &&
              analysis.productInsights.length > 0 && (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600/20 via-blue-500/10 to-indigo-600/20 dark:from-indigo-600/30 dark:via-blue-500/20 dark:to-indigo-600/30 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                  <div className="relative bg-card backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-border shadow-sm">
                    <div className="flex items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 dark:from-indigo-600 dark:to-blue-700 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                        <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground via-indigo-600 to-blue-600 dark:from-white dark:via-indigo-200 dark:to-blue-200 bg-clip-text text-transparent mb-2">
                          {t("productInsights") || "Product Insights"}
                        </h2>
                        <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-indigo-500 to-transparent rounded-full"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {analysis.productInsights.map((insight, index) => (
                        <div
                          key={index}
                          className="group/item bg-muted/50 rounded-xl p-4 border border-border hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-300"
                        >
                          <div className="flex items-start gap-3">
                            <Target className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                            <p className="text-foreground text-sm leading-relaxed flex-1 break-words">
                              {insight}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            {/* Risks */}
            {(analysis.riskScore !== undefined ||
              analysis.churnRiskLevel !== undefined) && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-600/20 via-orange-500/10 to-red-600/20 dark:from-red-600/30 dark:via-orange-500/20 dark:to-red-600/30 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                <div className="relative bg-card backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-border shadow-sm">
                  <div className="flex items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 dark:from-red-600 dark:to-orange-700 flex items-center justify-center shadow-lg shadow-red-500/30 shrink-0">
                      <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground via-red-600 to-orange-600 dark:from-white dark:via-red-200 dark:to-orange-200 bg-clip-text text-transparent mb-2">
                        {t("risks") || "Risks"}
                      </h2>
                      <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-red-500 to-transparent rounded-full"></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {analysis.riskScore !== undefined && (
                      <div className="bg-muted/50 rounded-xl p-4 border border-border">
                        <h3 className="text-sm font-semibold text-foreground mb-2">
                          {t("riskScore") || "Risk Score"}
                        </h3>
                        <p className="text-2xl font-bold text-foreground">
                          {Math.round(analysis.riskScore)}%
                        </p>
                      </div>
                    )}
                    {analysis.churnRiskLevel && (
                      <div className="bg-muted/50 rounded-xl p-4 border border-border">
                        <h3 className="text-sm font-semibold text-foreground mb-2">
                          {t("churnRisk") || "Churn Risk Level"}
                        </h3>
                        <p className="text-lg font-bold text-foreground capitalize">
                          {analysis.churnRiskLevel}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Improvement Actions */}
            {analysis.improvementActions &&
              analysis.improvementActions.length > 0 && (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-yellow-600/20 via-amber-500/10 to-yellow-600/20 dark:from-yellow-600/30 dark:via-amber-500/20 dark:to-yellow-600/30 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                  <div className="relative bg-card backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-border shadow-sm">
                    <div className="flex items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 dark:from-yellow-600 dark:to-amber-700 flex items-center justify-center shadow-lg shadow-yellow-500/30 shrink-0">
                        <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground via-yellow-600 to-amber-600 dark:from-white dark:via-yellow-200 dark:to-amber-200 bg-clip-text text-transparent mb-2">
                          {t("improvementActions") || "Improvement Actions"}
                        </h2>
                        <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-yellow-500 to-transparent rounded-full"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {analysis.improvementActions.map((action, index) => (
                        <div
                          key={index}
                          className="group/item bg-muted/50 rounded-xl p-4 border border-border hover:border-yellow-500/50 dark:hover:border-yellow-500/50 transition-all duration-300"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 flex items-center justify-center mt-0.5 group-hover/item:scale-110 transition-transform duration-300">
                              <span
                                className={`text-xs font-bold ${
                                  action.priority === "high"
                                    ? "text-red-500 dark:text-red-400"
                                    : action.priority === "medium"
                                      ? "text-yellow-500 dark:text-yellow-400"
                                      : "text-green-500 dark:text-green-400"
                                }`}
                              >
                                {index + 1}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-sm font-semibold text-foreground">
                                  {action.title}
                                </h4>
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                    action.priority === "high"
                                      ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                                      : action.priority === "medium"
                                        ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30"
                                        : "bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30"
                                  }`}
                                >
                                  {translatePriority(action.priority)}
                                </span>
                              </div>
                              <p className="text-foreground text-sm leading-relaxed break-words">
                                {action.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            {/* FAQs */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-blue-500/10 to-purple-600/20 dark:from-purple-600/30 dark:via-blue-500/20 dark:to-purple-600/30 rounded-2xl sm:rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-card backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-border shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
                      <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground via-purple-600 to-indigo-600 dark:from-white dark:via-purple-200 dark:to-indigo-200 bg-clip-text text-transparent mb-1 sm:mb-2">
                        {t("faqs.title") || "FAQs from your data"}
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {t("faqs.subtitle") ||
                          "Generate frequently asked questions based on your aggregated analyses."}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleGenerateFaqs}
                    disabled={!hasAutoFaqs || isGeneratingFaqs}
                    className="bg-purple-600 hover:bg-purple-600/90 text-white rounded-lg sm:rounded-xl px-3 sm:px-4 md:px-6 py-2 shrink-0 w-full sm:w-auto"
                  >
                    {isGeneratingFaqs ? (
                      <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 sm:mr-2" />
                    )}
                    <span className="hidden sm:inline">
                      {hasAutoFaqs
                        ? t("faqs.generate") || "Generate FAQs"
                        : t("faqs.planRequired") || "Upgrade plan for FAQs"}
                    </span>
                    <span className="sm:hidden">
                      {hasAutoFaqs
                        ? t("faqs.generate") || "Generate"
                        : t("faqs.planRequired") || "Upgrade"}
                    </span>
                  </Button>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  {faqs && faqs.length > 0 ? (
                    faqs.map((faq, index) => (
                      <div
                        key={`${faq._id}-${index}`}
                        className="bg-muted/50 rounded-xl p-3 sm:p-4 border border-border hover:border-purple-500/40 transition-all duration-300"
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center mt-0.5">
                            <span className="text-[10px] sm:text-xs font-bold text-purple-500">
                              {index + 1}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug wrap-break-word">
                              {faq.question}
                            </p>
                            {faq.answer && (
                              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed wrap-break-word">
                                {faq.answer}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-muted/40 rounded-xl p-3 sm:p-4 border border-dashed border-border text-xs sm:text-sm text-muted-foreground text-center">
                      {t("faqs.empty") ||
                        "No FAQs yet. Generate them from your analyses."}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Analysis Date */}
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  {t("analysisDate") || "Analysis Date"}:{" "}
                  <span className="text-foreground font-medium">
                    {new Date(analysis.createdAt).toLocaleDateString()}
                  </span>
                </span>
              </div>
            </div>
            {/* Printable Report Template - Hidden from view but used for PDF generation */}
            {analysis && (
              <GlobalAnalysisReport
                ref={reportRef}
                analysis={analysis}
                memberIdToName={memberIdToName}
              />
            )}
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
                onClick={handleConfirmGenerate}
                disabled={isGenerating}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                {isGenerating ? (
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

function parseError(
  error: unknown
): { code?: string; [key: string]: any } | null {
  if (error instanceof Error && typeof error.message === "string") {
    try {
      return JSON.parse(error.message);
    } catch {
      return null;
    }
  }
  return null;
}
