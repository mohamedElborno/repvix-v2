"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  MessageSquare,
  Clock,
  User,
  Bot,
  Calendar,
  Hash,
  Globe,
  CheckCircle2,
  Brain,
  Loader2,
  Sparkles,
} from "lucide-react";

import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type Comment = {
  id: string;
  role: "customer" | "agent" | "system";
  content: string;
  timestamp: number;
  authorId?: number;
  public?: boolean;
};

interface Props {
  ticket: {
    id: number;
    subject?: string;
    status?: string;
    priority?: string;
    requester_id?: number;
    assignee_id?: number;
    created_at?: string;
    updated_at?: string;
  };
  comments: Comment[];
  analysis: Doc<"chatAnalyses"> | null;
  organizationId: Id<"organizations">;
  chatId: Id<"chats"> | null;
}

type AnalysisLanguage = "ar" | "en" | "tr" | "fr" | "es" | "hi" | "ja";

// Fixed-option labels mapping → translation keys
const FIXED_LABEL_KEYS = {
  status: {
    open: "statusOpen",
    closed: "statusClosed",
  },
} as const;

function mapLocaleToAnalysisLanguage(
  loc: string
): AnalysisLanguage | undefined {
  switch (loc) {
    case "ar":
    case "ar-SA":
    case "ar-EG":
      return "ar";
    case "tr":
    case "tr-TR":
      return "tr";
    case "fr":
    case "fr-FR":
      return "fr";
    case "es":
    case "es-ES":
    case "es-MX":
      return "es";
    case "hi":
    case "hi-IN":
      return "hi";
    case "en":
    case "en-US":
    case "en-GB":
      return "en";
    case "ja":
    case "ja-JP":
      return "ja";
    default:
      return "en";
  }
}

export default function ZendeskTicketViewClient({
  ticket,
  comments,
  analysis: initialAnalysis,
  organizationId,
  chatId,
}: Props) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const analyzeTicket = useAction(api.zendesk.analyzeTicket);

  const canAnalyze = useQuery(
    api.featureGate.canPerformAnalysis,
    organizationId
      ? {
          organizationId,
          chatId: chatId ?? undefined,
        }
      : "skip"
  );

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Extract analysis data - data is now stored directly in chatAnalyses table
  const derivedAnalysis = useMemo(() => {
    if (!initialAnalysis) return null;

    return {
      // Outcome
      outcomeStatus: initialAnalysis.outcomeStatus,
      outcomeConfidence: initialAnalysis.outcomeConfidence,
      outcomeSummary: initialAnalysis.outcomeSummary,

      // Customer Experience
      customerSatisfactionScore: initialAnalysis.customerSatisfactionScore,
      customerSatisfactionLabel: initialAnalysis.customerSatisfactionLabel,
      sentimentStartScore: initialAnalysis.sentimentStartScore,
      sentimentStartLabel: initialAnalysis.sentimentStartLabel,
      sentimentEndScore: initialAnalysis.sentimentEndScore,
      sentimentEndLabel: initialAnalysis.sentimentEndLabel,
      sentimentVolatilityScore: initialAnalysis.sentimentVolatilityScore,

      // Agent Performance
      agentOverallScore: initialAnalysis.agentOverallScore,
      agentClarityScore: initialAnalysis.agentClarityScore,
      agentEmpathyScore: initialAnalysis.agentEmpathyScore,
      agentOwnershipScore: initialAnalysis.agentOwnershipScore,
      agentProactivityScore: initialAnalysis.agentProactivityScore,
      agentProfessionalismScore: initialAnalysis.agentProfessionalismScore,
      agentStrengths: initialAnalysis.agentStrengths,
      agentImprovements: initialAnalysis.agentImprovements,
      agentCoachingTips: initialAnalysis.agentCoachingTips,

      // Risk
      churnRiskScore: initialAnalysis.churnRiskScore,
      churnRiskLevel: initialAnalysis.churnRiskLevel,
      escalationRiskScore: initialAnalysis.escalationRiskScore,
      reputationalRiskScore: initialAnalysis.reputationalRiskScore,
      riskNotes: initialAnalysis.riskNotes,

      // Intent
      primaryIntent: initialAnalysis.primaryIntent,
      secondaryIntents: initialAnalysis.secondaryIntents,
      salesStage: initialAnalysis.salesStage,
      purchaseIntentScore: initialAnalysis.purchaseIntentScore,
      mainObjections: initialAnalysis.mainObjections,

      // Root Causes
      primaryRootCauseCategory: initialAnalysis.primaryRootCauseCategory,
      primaryRootCauseDetails: initialAnalysis.primaryRootCauseDetails,
      secondaryRootCauses: initialAnalysis.secondaryRootCauses,

      // Actions
      internalActions: initialAnalysis.internalActions,
      customerActions: initialAnalysis.customerActions,
      productFeedback: initialAnalysis.productFeedback,

      // Structure
      structureMetrics: initialAnalysis.structureMetrics,
      conversationComplexity: initialAnalysis.conversationComplexity,
      conversationClarityScore: initialAnalysis.conversationClarityScore,

      // Key Quotes
      keyQuotes: initialAnalysis.keyQuotes,
    };
  }, [initialAnalysis]);

  const [activeTab, setActiveTab] = useState<"messages" | "analysis">(
    derivedAnalysis ? "analysis" : "messages"
  );
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<AnalysisLanguage>(
    mapLocaleToAnalysisLanguage(locale) || "en"
  );

  const translateLabel = (group: string, value?: string | null) => {
    if (!value) return "N/A";
    const key = `analysisLabels.${group}.${value}`;
    try {
      const translated = t(key as any);
      if (translated === key) return value.replace(/_/g, " ");
      return translated;
    } catch {
      return value.replace(/_/g, " ");
    }
  };

  const translateFixed = (
    group: keyof typeof FIXED_LABEL_KEYS,
    value?: string | null
  ) => {
    if (!value) return value ?? "";
    const key =
      FIXED_LABEL_KEYS[group]?.[
        value as keyof (typeof FIXED_LABEL_KEYS)[typeof group]
      ];
    if (!key) return value;
    try {
      const translated = t(key as any);
      return translated === key ? value : translated;
    } catch {
      return value;
    }
  };

  // Scroll to bottom on mount
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const formatDate = (input?: string | number) => {
    if (!input) return "";
    const date = new Date(input);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      numberingSystem: "latn",
    }).format(date);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      numberingSystem: "latn",
    }).format(date);
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

  const openLanguageModal = () => {
    setSelectedLanguage(mapLocaleToAnalysisLanguage(locale) || "en");
    setShowLanguageModal(true);
  };

  const handleConfirmAnalyze = async () => {
    setAnalysisError(null);
    setAnalysisMessage(null);
    setIsAnalyzing(true);
    setShowLanguageModal(false);

    try {
      const analysisLanguage = selectedLanguage;

      await analyzeTicket({
        organizationId,
        ticketId: ticket.id,
        analysisLanguage,
      });

      setAnalysisMessage("Analysis completed");

      // Refresh to get the new analysis
      window.location.reload();
    } catch (err: unknown) {
      console.error("analyzeTicket error:", err);
      const msg =
        err instanceof Error ? err.message : "Failed to analyze ticket";
      setAnalysisError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const statusLabel =
    ticket.status === "solved" || ticket.status === "closed"
      ? "closed"
      : "open";

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card/80 backdrop-blur-xl border-b border-border dark:border-purple-500/20 rounded-2xl">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* Ticket Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
                      {ticket.subject || `Ticket #${ticket.id}`}
                    </h1>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(ticket.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions: Analyze button + status */}
            <div className="flex flex-col items-stretch sm:items-end gap-1">
              <button
                type="button"
                onClick={openLanguageModal}
                disabled={isAnalyzing || canAnalyze?.allowed === false}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 disabled:bg-muted text-sm font-semibold disabled:text-foreground shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 border border-purple-400/40 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              >
                <Brain className="w-4 h-4" />
                <span>
                  {isAnalyzing
                    ? t("analyzing") || "Analyzing..."
                    : t("analyzeChat") || "Analyze ticket"}
                </span>
              </button>

              {/* عرض معلومات الحدود */}
              {canAnalyze && !isAnalyzing && (
                <div className="text-xs text-muted-foreground max-w-xs mx-auto text-center">
                  {canAnalyze.reason === "per_chat_daily_limit" ? (
                    <span className="text-destructive">
                      {t("dailyLimitExceeded") ||
                        `يمكن إجراء تحليل واحد يوميًا لكل تذكرة. حاول بعد ${
                          (canAnalyze as any).remainingHours ?? 24
                        } ساعة.`}
                    </span>
                  ) : canAnalyze.reason === "limit_exceeded" ? (
                    <span className="text-destructive">
                      {t("dailyLimitExceeded") ||
                        `تم تجاوز الحد اليومي (${canAnalyze.usedToday}/${canAnalyze.dailyLimit})`}
                    </span>
                  ) : canAnalyze.reason === "unlimited" ? (
                    <span className="text-green-600 dark:text-emerald-400">
                      {t("unlimitedAnalyses") || "تحليلات غير محدودة"}
                    </span>
                  ) : canAnalyze.remaining !== "unlimited" &&
                    typeof canAnalyze.remaining === "number" ? (
                    <span>
                      {t("remainingAnalyses")}: {canAnalyze.remaining}/
                      {canAnalyze.dailyLimit}
                    </span>
                  ) : null}
                </div>
              )}

              {analysisError && (
                <span className="text-xs text-destructive max-w-xs text-right">
                  {analysisError}
                </span>
              )}

              {analysisMessage && !analysisError && (
                <span className="text-xs text-green-600 dark:text-emerald-400 max-w-xs text-right">
                  {analysisMessage}
                </span>
              )}
            </div>
          </div>

          {/* Ticket Metadata */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
              <Hash className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
              <span className="text-xs text-foreground">
                {comments.length} {t("messages") || "messages"}
              </span>
            </div>

            {ticket.priority && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
                <Globe className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                <span className="text-xs text-foreground uppercase">
                  {ticket.priority}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
              <CheckCircle2
                className={`w-3.5 h-3.5 ${
                  statusLabel === "open"
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground"
                }`}
              />
              <span className="text-xs text-foreground capitalize">
                {translateFixed("status", statusLabel)}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
              <MessageSquare className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
              <span className="text-xs text-foreground capitalize">
                Zendesk
              </span>
            </div>
          </div>

          {/* Tabs */}
          {derivedAnalysis && (
            <div className="mt-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("messages")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "messages"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>{t("messages") || "Messages"}</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("analysis")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "analysis"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    <span>{t("analysis") || "Analysis"}</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Container */}
      <div className="mx-auto py-8">
        {activeTab === "messages" ? (
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
                  <MessageSquare className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-lg font-medium">
                  {t("noMessages") || "No messages found"}
                </p>
              </div>
            ) : (
              comments.map((message, index) => {
                const isCustomer = message.role === "customer";
                const isSystem = message.role === "system";
                const showTimestamp =
                  index === 0 ||
                  message.timestamp - comments[index - 1].timestamp > 300000; // 5 minutes

                return (
                  <div key={message.id}>
                    {/* Timestamp Divider */}
                    {showTimestamp && (
                      <div className="flex items-center justify-center my-6">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border backdrop-blur-sm">
                          <Calendar className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                          <span className="text-xs text-muted-foreground font-medium">
                            {formatDate(message.timestamp)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* System Message */}
                    {isSystem ? (
                      <div className="flex justify-center my-4">
                        <div className="px-4 py-2 rounded-full bg-muted/30 border border-border/50 backdrop-blur-sm">
                          <p className="text-xs text-muted-foreground italic">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Regular Message */
                      <div
                        className={`flex ${
                          isCustomer ? "justify-end" : "justify-start"
                        } mb-2`}
                      >
                        <div
                          className={`group relative max-w-[75%] sm:max-w-[65%] ${
                            isCustomer ? "items-end" : "items-start"
                          }`}
                        >
                          {/* Sender Name */}
                          <div
                            className={`flex items-center gap-2 mb-1.5 ${
                              isCustomer ? "justify-end" : "justify-start"
                            }`}
                          >
                            {!isCustomer && (
                              <div className="w-6 h-6 rounded-full bg-linear-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                                <Bot className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                            <span
                              className={`text-xs font-medium ${
                                isCustomer
                                  ? "text-purple-600 dark:text-purple-300"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {isCustomer
                                ? (t("customer") as string) || "Customer"
                                : (t("agent") as string) || "Agent"}
                            </span>
                            {isCustomer && (
                              <div className="w-6 h-6 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Message Bubble */}
                          <div
                            className={`relative group/bubble ${
                              isCustomer
                                ? "bg-purple-100 dark:bg-purple-600/30 border-purple-300 dark:border-purple-500/30"
                                : "bg-muted border-border"
                            } backdrop-blur-xl border rounded-2xl px-4 py-3 shadow-lg transition-all duration-300 hover:shadow-xl ${
                              isCustomer
                                ? "hover:shadow-purple-500/20"
                                : "hover:shadow-muted-foreground/10"
                            }`}
                          >
                            {/* Glass effect overlay */}
                            <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-white/5 dark:from-white/5 to-transparent opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                            {/* Message Text */}
                            <p className="relative z-10 text-sm leading-relaxed text-foreground wrap-break-word whitespace-pre-wrap">
                              {message.content}
                            </p>

                            {/* Time */}
                            <div
                              className={`flex items-center gap-1 mt-2 ${
                                isCustomer ? "justify-end" : "justify-start"
                              }`}
                            >
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">
                                {formatTime(message.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        ) : derivedAnalysis ? (
          /* Analysis View */
          <div className="space-y-6">
            {/* Outcome Summary */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-linear-to-r from-purple-600/20 via-pink-500/10 to-purple-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl p-6 border border-border dark:border-purple-500/20">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  {t("analysisOutcome") || "Outcome Summary"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {t("status") || "Status"}
                    </p>
                    <div
                      className={`inline-flex items-center px-4 py-2 rounded-lg ${
                        derivedAnalysis.outcomeStatus === "resolved"
                          ? "bg-green-500/20 dark:bg-green-500/20 border border-green-500/30 text-green-700 dark:text-green-300"
                          : derivedAnalysis.outcomeStatus === "pending_customer"
                            ? "bg-yellow-500/20 dark:bg-yellow-500/20 border border-yellow-500/30 text-yellow-700 dark:text-yellow-300"
                            : "bg-red-500/20 dark:bg-red-500/20 border border-red-500/30 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {translateLabel(
                        "outcomeStatus",
                        derivedAnalysis.outcomeStatus
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {t("confidence") || "Confidence"}
                    </p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {derivedAnalysis.outcomeConfidence}%
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("summary") || "Summary"}
                  </p>
                  <p className="text-foreground leading-relaxed">
                    {derivedAnalysis.outcomeSummary}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Experience */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-linear-to-r from-blue-600/20 via-cyan-500/10 to-blue-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl p-6 border border-border dark:border-blue-500/20">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  {t("customerExperience") || "Customer Experience"}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("satisfaction") || "Satisfaction"}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {derivedAnalysis.customerSatisfactionScore}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      {translateLabel(
                        "satisfaction",
                        derivedAnalysis.customerSatisfactionLabel
                      )}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("sentimentStart") || "Start Sentiment"}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {derivedAnalysis.sentimentStartScore}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      {translateLabel(
                        "sentiment",
                        derivedAnalysis.sentimentStartLabel
                      )}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("sentimentEnd") || "End Sentiment"}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {derivedAnalysis.sentimentEndScore}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      {translateLabel(
                        "sentiment",
                        derivedAnalysis.sentimentEndLabel
                      )}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("volatility") || "Volatility"}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {derivedAnalysis.sentimentVolatilityScore}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Performance */}
            {derivedAnalysis.agentOverallScore && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-linear-to-r from-purple-600/20 via-pink-500/10 to-purple-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl p-6 border border-border dark:border-purple-500/20">
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {t("agentPerformance") || "Agent Performance"}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-muted/50 rounded-lg p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("overall") || "Overall"}
                      </p>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {derivedAnalysis.agentOverallScore}%
                      </p>
                    </div>
                    {derivedAnalysis.agentClarityScore && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("clarity") || "Clarity"}
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {derivedAnalysis.agentClarityScore}%
                        </p>
                      </div>
                    )}
                    {derivedAnalysis.agentEmpathyScore && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("empathy") || "Empathy"}
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {derivedAnalysis.agentEmpathyScore}%
                        </p>
                      </div>
                    )}
                    {derivedAnalysis.agentOwnershipScore && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("ownership") || "Ownership"}
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {derivedAnalysis.agentOwnershipScore}%
                        </p>
                      </div>
                    )}
                    {derivedAnalysis.agentProactivityScore && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("proactivity") || "Proactivity"}
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {derivedAnalysis.agentProactivityScore}%
                        </p>
                      </div>
                    )}
                    {derivedAnalysis.agentProfessionalismScore && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("professionalism") || "Professionalism"}
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {derivedAnalysis.agentProfessionalismScore}%
                        </p>
                      </div>
                    )}
                  </div>
                  {derivedAnalysis.agentStrengths && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
                        {t("strengths") || "Strengths"}
                      </h4>
                      <p className="text-foreground text-sm leading-relaxed bg-muted/50 rounded-lg p-3 border border-green-500/20">
                        {derivedAnalysis.agentStrengths}
                      </p>
                    </div>
                  )}
                  {derivedAnalysis.agentImprovements && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                        {t("improvements") || "Areas for Improvement"}
                      </h4>
                      <p className="text-foreground text-sm leading-relaxed bg-muted/50 rounded-lg p-3 border border-yellow-500/20">
                        {derivedAnalysis.agentImprovements}
                      </p>
                    </div>
                  )}
                  {derivedAnalysis.agentCoachingTips && (
                    <div>
                      <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2">
                        {t("coachingTips") || "Coaching Tips"}
                      </h4>
                      <p className="text-foreground text-sm leading-relaxed bg-muted/50 rounded-lg p-3 border border-purple-500/20">
                        {derivedAnalysis.agentCoachingTips}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Risks */}
            {derivedAnalysis.churnRiskScore !== undefined && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-linear-to-r from-red-600/20 via-orange-500/10 to-red-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl p-6 border border-border dark:border-red-500/20">
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {t("risks") || "Risks"}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("churnRisk") || "Churn Risk"}
                      </p>
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                        {derivedAnalysis.churnRiskScore}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        {translateLabel(
                          "riskLevel",
                          derivedAnalysis.churnRiskLevel
                        )}
                      </p>
                    </div>
                    {derivedAnalysis.escalationRiskScore !== undefined && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("escalationRisk") || "Escalation Risk"}
                        </p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {derivedAnalysis.escalationRiskScore}%
                        </p>
                      </div>
                    )}
                    {derivedAnalysis.reputationalRiskScore !== undefined && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("reputationalRisk") || "Reputation Risk"}
                        </p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {derivedAnalysis.reputationalRiskScore}%
                        </p>
                      </div>
                    )}
                  </div>
                  {derivedAnalysis.riskNotes && (
                    <div className="mt-4">
                      <p className="text-foreground text-sm leading-relaxed bg-muted/50 rounded-lg p-3 border border-border">
                        {derivedAnalysis.riskNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Intent & Sales */}
            {derivedAnalysis.primaryIntent && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-linear-to-r from-green-600/20 via-emerald-500/10 to-green-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl p-6 border border-border dark:border-green-500/20">
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {t("intentSales") || "Intent & Sales"}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-muted/50 rounded-lg p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("primaryIntent") || "Primary Intent"}
                      </p>
                      <p className="text-lg font-bold text-foreground capitalize">
                        {translateLabel(
                          "primaryIntent",
                          derivedAnalysis.primaryIntent
                        )}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("salesStage") || "Sales Stage"}
                      </p>
                      <p className="text-lg font-bold text-foreground capitalize">
                        {derivedAnalysis.salesStage
                          ? translateLabel(
                              "salesStage",
                              derivedAnalysis.salesStage
                            )
                          : "N/A"}
                      </p>
                    </div>
                    {derivedAnalysis.purchaseIntentScore !== undefined && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("purchaseIntent") || "Purchase Intent"}
                        </p>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                          {derivedAnalysis.purchaseIntentScore}%
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Secondary Intents */}
                  {derivedAnalysis.secondaryIntents &&
                    derivedAnalysis.secondaryIntents.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-foreground mb-2">
                          {t("secondaryIntents") || "Secondary Intents"}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {derivedAnalysis.secondaryIntents.map(
                            (intent, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/30 text-green-700 dark:text-green-300 text-sm"
                              >
                                {translateLabel("primaryIntent", intent)}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Main Objections */}
                  {derivedAnalysis.mainObjections &&
                    derivedAnalysis.mainObjections.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">
                          {t("mainObjections") || "Main Objections"}
                        </h4>
                        <div className="space-y-3">
                          {derivedAnalysis.mainObjections.map((obj, idx) => (
                            <div
                              key={idx}
                              className="bg-muted/50 rounded-lg p-4 border border-border"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="px-2 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-700 dark:text-orange-300 capitalize">
                                  {translateLabel("objection", obj.type)}
                                </span>
                                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                  {obj.strength}%
                                </span>
                              </div>
                              {obj.note && (
                                <p className="text-foreground text-sm">
                                  {obj.note}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Root Causes */}
            {derivedAnalysis.primaryRootCauseCategory && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-linear-to-r from-orange-600/20 via-amber-500/10 to-orange-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl p-6 border border-border dark:border-orange-500/20">
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {t("rootCauses") || "Root Causes"}
                  </h2>
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-2">
                      {t("primaryCause") || "Primary Cause"}
                    </h4>
                    <div className="bg-muted/50 rounded-lg p-4 border border-orange-500/30">
                      <p className="text-lg font-bold text-orange-700 dark:text-orange-300 mb-2 capitalize">
                        {translateLabel(
                          "rootCause",
                          derivedAnalysis.primaryRootCauseCategory
                        )}
                      </p>
                      {derivedAnalysis.primaryRootCauseDetails && (
                        <p className="text-foreground text-sm leading-relaxed">
                          {derivedAnalysis.primaryRootCauseDetails}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Secondary Causes */}
                  {derivedAnalysis.secondaryRootCauses &&
                    derivedAnalysis.secondaryRootCauses.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-3">
                          {t("secondaryCauses") || "Secondary Causes"}
                        </h4>
                        <div className="space-y-3">
                          {derivedAnalysis.secondaryRootCauses.map(
                            (cause, idx) => (
                              <div
                                key={idx}
                                className="bg-muted/50 rounded-lg p-4 border border-border"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300 capitalize">
                                    {translateLabel(
                                      "rootCause",
                                      cause.category
                                    )}
                                  </span>
                                  {cause.weight && (
                                    <span className="text-xs text-muted-foreground">
                                      {t("weight") || "Weight"}: {cause.weight}%
                                    </span>
                                  )}
                                </div>
                                {cause.details && (
                                  <p className="text-foreground text-sm">
                                    {cause.details}
                                  </p>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Actions & Recommendations */}
            {((derivedAnalysis.internalActions &&
              derivedAnalysis.internalActions.length > 0) ||
              (derivedAnalysis.customerActions &&
                derivedAnalysis.customerActions.length > 0) ||
              (derivedAnalysis.productFeedback &&
                derivedAnalysis.productFeedback.length > 0)) && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-linear-to-r from-indigo-600/20 via-purple-500/10 to-indigo-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl p-6 border border-border dark:border-indigo-500/20">
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {t("actionsRecommendations") || "Actions & Recommendations"}
                  </h2>

                  {/* Internal Actions */}
                  {derivedAnalysis.internalActions &&
                    derivedAnalysis.internalActions.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-3">
                          {t("internalActions") || "Internal Actions"}
                        </h4>
                        <div className="space-y-3">
                          {derivedAnalysis.internalActions.map(
                            (action, idx) => (
                              <div
                                key={idx}
                                className="bg-muted/50 rounded-lg p-4 border border-border"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span
                                        className={`px-2 py-1 rounded text-xs font-medium ${
                                          action.priority === "high"
                                            ? "bg-red-500/20 text-red-700 dark:text-red-300"
                                            : action.priority === "medium"
                                              ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"
                                              : "bg-green-500/20 text-green-700 dark:text-green-300"
                                        }`}
                                      >
                                        {translateLabel(
                                          "priority",
                                          action.priority
                                        )}
                                      </span>
                                      <span className="px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                                        {translateLabel(
                                          "actionArea",
                                          action.area
                                        )}
                                      </span>
                                    </div>
                                    <h5 className="text-foreground font-semibold mb-1">
                                      {action.title}
                                    </h5>
                                    <p className="text-foreground/80 text-sm">
                                      {action.description}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  {action.owner && (
                                    <span>
                                      {t("owner") || "Owner"}: {action.owner}
                                    </span>
                                  )}
                                  {action.suggestedTimelineDays && (
                                    <span>
                                      {t("timeline") || "Timeline"}:{" "}
                                      {action.suggestedTimelineDays}{" "}
                                      {t("days") || "days"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Customer Actions */}
                  {derivedAnalysis.customerActions &&
                    derivedAnalysis.customerActions.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3">
                          {t("customerActions") || "Customer Actions"}
                        </h4>
                        <div className="space-y-3">
                          {derivedAnalysis.customerActions.map(
                            (action, idx) => (
                              <div
                                key={idx}
                                className="bg-muted/50 rounded-lg p-4 border border-border"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  {action.channel && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-700 dark:text-blue-300">
                                      {action.channel}
                                    </span>
                                  )}
                                </div>
                                <h5 className="text-foreground font-semibold mb-1">
                                  {action.title}
                                </h5>
                                <p className="text-foreground/80 text-sm">
                                  {action.description}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Product Feedback */}
                  {derivedAnalysis.productFeedback &&
                    derivedAnalysis.productFeedback.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-3">
                          {t("productFeedback") || "Product Feedback"}
                        </h4>
                        <div className="space-y-3">
                          {derivedAnalysis.productFeedback.map(
                            (feedback, idx) => (
                              <div
                                key={idx}
                                className="bg-muted/50 rounded-lg p-4 border border-border"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      feedback.severity === "critical"
                                        ? "bg-red-500/20 text-red-700 dark:text-red-300"
                                        : feedback.severity === "high"
                                          ? "bg-orange-500/20 text-orange-700 dark:text-orange-300"
                                          : feedback.severity === "medium"
                                            ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"
                                            : "bg-green-500/20 text-green-700 dark:text-green-300"
                                    }`}
                                  >
                                    {translateLabel(
                                      "severity",
                                      feedback.severity
                                    )}
                                  </span>
                                  {feedback.module && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                                      {feedback.module}
                                    </span>
                                  )}
                                </div>
                                <p className="text-foreground/80 text-sm">
                                  {feedback.note}
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

            {/* Conversation Structure */}
            {derivedAnalysis.structureMetrics && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-linear-to-r from-teal-600/20 via-cyan-500/10 to-teal-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl p-6 border border-border dark:border-teal-500/20">
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {t("conversationStructure") || "Conversation Structure"}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("totalMessages") || "Total Messages"}
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {derivedAnalysis.structureMetrics.totalMessages}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("turnCount") || "Turns"}
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {derivedAnalysis.structureMetrics.turnCount}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("agentTalkRatio") || "Agent Talk %"}
                      </p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {(
                          derivedAnalysis.structureMetrics.agentTalkRatio * 100
                        ).toFixed(0)}
                        %
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("customerTalkRatio") || "Customer Talk %"}
                      </p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {(
                          derivedAnalysis.structureMetrics.customerTalkRatio *
                          100
                        ).toFixed(0)}
                        %
                      </p>
                    </div>
                    {derivedAnalysis.conversationComplexity && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("complexity") || "Complexity"}
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {derivedAnalysis.conversationComplexity}/5
                        </p>
                      </div>
                    )}
                    {derivedAnalysis.conversationClarityScore && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("clarityScore") || "Clarity Score"}
                        </p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {derivedAnalysis.conversationClarityScore}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Key Quotes */}
            {derivedAnalysis.keyQuotes &&
              derivedAnalysis.keyQuotes.length > 0 && (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-linear-to-r from-cyan-600/20 via-blue-500/10 to-cyan-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                  <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl p-6 border border-border dark:border-cyan-500/20">
                    <h2 className="text-2xl font-bold text-foreground mb-4">
                      {t("keyQuotes") || "Key Quotes"}
                    </h2>
                    <div className="space-y-3">
                      {derivedAnalysis.keyQuotes.map((quote, idx) => (
                        <div
                          key={idx}
                          className="bg-muted/50 rounded-lg p-4 border border-border"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                quote.role === "customer"
                                  ? "bg-blue-500/20 text-blue-700 dark:text-blue-300"
                                  : "bg-purple-500/20 text-purple-700 dark:text-purple-300"
                              }`}
                            >
                              {quote.role}
                            </span>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground capitalize">
                              {translateLabel("evidencePurpose", quote.purpose)}
                            </span>
                          </div>
                          <p className="text-foreground text-sm italic">
                            &ldquo;{quote.text}&rdquo;
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
          </div>
        ) : null}
      </div>

      {/* Language Selection Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              {t("selectAnalysisLanguage") || "Select Analysis Language"}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {t("selectAnalysisLanguageHint") ||
                "Choose the language for the AI analysis output"}
            </p>

            <div className="space-y-3 mb-6">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() =>
                    setSelectedLanguage(lang.code as AnalysisLanguage)
                  }
                  className={`w-full p-3 rounded-lg border transition-all ${
                    selectedLanguage === lang.code
                      ? "bg-purple-500/10 border-purple-500 text-foreground"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowLanguageModal(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted"
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                onClick={handleConfirmAnalyze}
                disabled={isAnalyzing}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm disabled:opacity-60"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2 inline" />
                )}
                {t("startAnalysis") || "Start Analysis"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
