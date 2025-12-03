"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Clock,
  User,
  Bot,
  Calendar,
  Hash,
  Globe,
  CheckCircle2,
  Brain,
} from "lucide-react";

// Convex types
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface ChatViewClientProps {
  chat: Doc<"chats">;
  messages: Doc<"chatMessages">[];
  analysis: Doc<"chatAnalyses"> | null;
}

type AnalysisLanguage = "ar" | "en" | "tr" | "fr" | "es" | "hi" | "ja";

export default function ChatViewClient({
  chat,
  messages,
  analysis: initialAnalysis,
}: ChatViewClientProps) {
  const t = useTranslations("chat");
  const router = useRouter();
  const locale = useLocale();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const analyzeSingleChat = useAction(api.chatAnalysis.analyzeSingleChat);

  // التحقق من إمكانية إجراء التحليل
  // Note: feature.gate will be available after Convex regenerates API types
  const canAnalyze = useQuery(
    api.featureGate.canPerformAnalysis,
    chat.organizationId
      ? { organizationId: chat.organizationId as Id<"organizations"> }
      : "skip"
  );

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Doc<"chatAnalyses"> | null>(
    initialAnalysis
  );
  const [activeTab, setActiveTab] = useState<"messages" | "analysis">(
    initialAnalysis ? "analysis" : "messages"
  );

  // Scroll to bottom on mount
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    // Always use English locale for dates to avoid hydration mismatch
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      numberingSystem: "latn", // Force Latin numerals (0-9) instead of Arabic-Indic
    }).format(date);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    // Always use English locale for times to avoid hydration mismatch
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      numberingSystem: "latn", // Force Latin numerals (0-9) instead of Arabic-Indic
    }).format(date);
  };

  const mapLocaleToAnalysisLanguage = (
    loc: string
  ): AnalysisLanguage | undefined => {
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
      case "ja":
      case "ja-JP":
        return "ja";
      default:
        return "en";
    }
  };

  const handleAnalyzeChat = async () => {
    setAnalysisError(null);
    setAnalysisMessage(null);
    setIsAnalyzing(true);

    try {
      const analysisLanguage = mapLocaleToAnalysisLanguage(locale);

      const result = await analyzeSingleChat({
        chatId: chat._id,
        analysisLanguage,
      });

      setAnalysisMessage(`Analysis completed in ${result.processingTimeMs} ms`);

      // Refresh to get the new analysis
      window.location.reload();
    } catch (err: unknown) {
      console.error("analyzeSingleChat error:", err);
      const msg = err instanceof Error ? err.message : "Failed to analyze chat";
      setAnalysisError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  console.log("analysis", analysis);
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card/80 backdrop-blur-xl border-b border-border dark:border-purple-500/20 rounded-2xl">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <button
                onClick={() => router.push("/dashboard")}
                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/80 hover:bg-muted border border-border hover:border-purple-500/50 text-muted-foreground hover:text-foreground transition-all duration-300 backdrop-blur-sm"
                dir={locale === "ar" ? "rtl" : "ltr"}
              >
                {locale === "ar" ? (
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                ) : (
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                )}
                <span className="text-sm font-medium">
                  {t("back") || "Back"}
                </span>
              </button>

              {/* Chat Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-foreground via-purple-200 to-purple-300 dark:from-white dark:via-purple-200 dark:to-purple-300 bg-clip-text text-transparent truncate">
                      {chat.title || t("untitledChat") || "Untitled Chat"}
                    </h1>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(chat.startedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions: Analyze button + status */}
            <div className="flex flex-col items-stretch sm:items-end gap-1">
              <button
                type="button"
                onClick={handleAnalyzeChat}
                disabled={
                  isAnalyzing ||
                  !canAnalyze?.allowed ||
                  canAnalyze?.reason === "limit_exceeded"
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 disabled:from-muted disabled:to-muted text-sm font-semibold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 border border-purple-400/40 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              >
                <Brain className="w-4 h-4" />
                <span>
                  {isAnalyzing
                    ? t("analyzing") || "Analyzing..."
                    : t("analyzeChat") || "Analyze chat"}
                </span>
              </button>

              {/* عرض معلومات الحدود */}
              {canAnalyze && !isAnalyzing && (
                <div className="text-xs text-muted-foreground max-w-xs text-right">
                  {canAnalyze.reason === "limit_exceeded" ? (
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

          {/* Chat Metadata */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
              <Hash className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
              <span className="text-xs text-foreground">
                {messages.length} {t("messages") || "messages"}
              </span>
            </div>

            {chat.language && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
                <Globe className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                <span className="text-xs text-foreground uppercase">
                  {chat.language}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
              <CheckCircle2
                className={`w-3.5 h-3.5 ${
                  chat.status === "open"
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground"
                }`}
              />
              <span className="text-xs text-foreground capitalize">
                {chat.status}
              </span>
            </div>

            {chat.sourceChannel && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
                <MessageSquare className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                <span className="text-xs text-foreground capitalize">
                  {chat.sourceChannel}
                </span>
              </div>
            )}
          </div>

          {/* Tabs */}
          {analysis && (
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
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
                  <MessageSquare className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-lg font-medium">
                  {t("noMessages") || "No messages found"}
                </p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isCustomer = message.senderType === "customer";
                const isSystem = message.senderType === "system";
                const showTimestamp =
                  index === 0 ||
                  message.internalTimestamp -
                    messages[index - 1].internalTimestamp >
                    300000; // 5 minutes

                return (
                  <div key={message._id}>
                    {/* Timestamp Divider */}
                    {showTimestamp && (
                      <div className="flex items-center justify-center my-6">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border backdrop-blur-sm">
                          <Calendar className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                          <span className="text-xs text-muted-foreground font-medium">
                            {formatDate(message.internalTimestamp)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* System Message */}
                    {isSystem ? (
                      <div className="flex justify-center my-4">
                        <div className="px-4 py-2 rounded-full bg-muted/30 border border-border/50 backdrop-blur-sm">
                          <p className="text-xs text-muted-foreground italic">
                            {message.textClean}
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
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
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
                              {message.senderName ||
                                (isCustomer
                                  ? (t("customer") as string) || "Customer"
                                  : (t("agent") as string) || "Agent")}
                            </span>
                            {isCustomer && (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
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
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 dark:from-white/5 to-transparent opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                            {/* Message Text */}
                            <p className="relative z-10 text-sm leading-relaxed text-foreground break-words whitespace-pre-wrap">
                              {message.textClean}
                            </p>

                            {/* Time */}
                            <div
                              className={`flex items-center gap-1 mt-2 ${
                                isCustomer ? "justify-end" : "justify-start"
                              }`}
                            >
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">
                                {formatTime(message.internalTimestamp)}
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
        ) : analysis ? (
          /* Analysis View */
          <div className="space-y-6">
            {/* Outcome Summary */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-pink-500/10 to-purple-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
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
                        analysis.outcomeStatus === "resolved"
                          ? "bg-green-500/20 dark:bg-green-500/20 border border-green-500/30 text-green-700 dark:text-green-300"
                          : analysis.outcomeStatus === "pending_customer"
                            ? "bg-yellow-500/20 dark:bg-yellow-500/20 border border-yellow-500/30 text-yellow-700 dark:text-yellow-300"
                            : "bg-red-500/20 dark:bg-red-500/20 border border-red-500/30 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {analysis.outcomeStatus.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {t("confidence") || "Confidence"}
                    </p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {analysis.outcomeConfidence}%
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("summary") || "Summary"}
                  </p>
                  <p className="text-foreground leading-relaxed">
                    {analysis.outcomeSummary}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Experience */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-cyan-500/10 to-blue-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
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
                      {analysis.customerSatisfactionScore}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      {analysis.customerSatisfactionLabel?.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("sentimentStart") || "Start Sentiment"}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {analysis.sentimentStartScore}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      {analysis.sentimentStartLabel?.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("sentimentEnd") || "End Sentiment"}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {analysis.sentimentEndScore}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      {analysis.sentimentEndLabel?.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("volatility") || "Volatility"}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {analysis.sentimentVolatilityScore}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Performance */}
            {analysis.agentOverallScore && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-pink-500/10 to-purple-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
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
                        {analysis.agentOverallScore}%
                      </p>
                    </div>
                    {analysis.agentClarityScore && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("clarity") || "Clarity"}
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {analysis.agentClarityScore}%
                        </p>
                      </div>
                    )}
                    {analysis.agentEmpathyScore && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("empathy") || "Empathy"}
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {analysis.agentEmpathyScore}%
                        </p>
                      </div>
                    )}
                    {analysis.agentOwnershipScore && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("ownership") || "Ownership"}
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {analysis.agentOwnershipScore}%
                        </p>
                      </div>
                    )}
                    {analysis.agentProactivityScore && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("proactivity") || "Proactivity"}
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {analysis.agentProactivityScore}%
                        </p>
                      </div>
                    )}
                    {analysis.agentProfessionalismScore && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("professionalism") || "Professionalism"}
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {analysis.agentProfessionalismScore}%
                        </p>
                      </div>
                    )}
                  </div>
                  {analysis.agentStrengths && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
                        {t("strengths") || "Strengths"}
                      </h4>
                      <p className="text-foreground text-sm leading-relaxed bg-muted/50 rounded-lg p-3 border border-green-500/20">
                        {analysis.agentStrengths}
                      </p>
                    </div>
                  )}
                  {analysis.agentImprovements && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                        {t("improvements") || "Areas for Improvement"}
                      </h4>
                      <p className="text-foreground text-sm leading-relaxed bg-muted/50 rounded-lg p-3 border border-yellow-500/20">
                        {analysis.agentImprovements}
                      </p>
                    </div>
                  )}
                  {analysis.agentCoachingTips && (
                    <div>
                      <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2">
                        {t("coachingTips") || "Coaching Tips"}
                      </h4>
                      <p className="text-foreground text-sm leading-relaxed bg-muted/50 rounded-lg p-3 border border-purple-500/20">
                        {analysis.agentCoachingTips}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Risks */}
            {analysis.churnRiskScore !== undefined && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-600/20 via-orange-500/10 to-red-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
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
                        {analysis.churnRiskScore}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        {analysis.churnRiskLevel}
                      </p>
                    </div>
                    {analysis.escalationRiskScore !== undefined && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("escalationRisk") || "Escalation Risk"}
                        </p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {analysis.escalationRiskScore}%
                        </p>
                      </div>
                    )}
                    {analysis.reputationalRiskScore !== undefined && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("reputationalRisk") || "Reputation Risk"}
                        </p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {analysis.reputationalRiskScore}%
                        </p>
                      </div>
                    )}
                  </div>
                  {analysis.riskNotes && (
                    <div className="mt-4">
                      <p className="text-foreground text-sm leading-relaxed bg-muted/50 rounded-lg p-3 border border-border">
                        {analysis.riskNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Intent & Sales */}
            {analysis.primaryIntent && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-600/20 via-emerald-500/10 to-green-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
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
                        {analysis.primaryIntent.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("salesStage") || "Sales Stage"}
                      </p>
                      <p className="text-lg font-bold text-foreground capitalize">
                        {analysis.salesStage?.replace(/_/g, " ") || "N/A"}
                      </p>
                    </div>
                    {analysis.purchaseIntentScore !== undefined && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("purchaseIntent") || "Purchase Intent"}
                        </p>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                          {analysis.purchaseIntentScore}%
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Secondary Intents */}
                  {analysis.secondaryIntents &&
                    analysis.secondaryIntents.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-foreground mb-2">
                          {t("secondaryIntents") || "Secondary Intents"}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {analysis.secondaryIntents.map((intent, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/30 text-green-700 dark:text-green-300 text-sm"
                            >
                              {intent}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Main Objections */}
                  {analysis.mainObjections &&
                    analysis.mainObjections.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">
                          {t("mainObjections") || "Main Objections"}
                        </h4>
                        <div className="space-y-3">
                          {analysis.mainObjections.map((obj, idx) => (
                            <div
                              key={idx}
                              className="bg-muted/50 rounded-lg p-4 border border-border"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="px-2 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-700 dark:text-orange-300 capitalize">
                                  {obj.type}
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
            {analysis.primaryRootCauseCategory && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-600/20 via-amber-500/10 to-orange-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
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
                        {analysis.primaryRootCauseCategory.replace(/_/g, " ")}
                      </p>
                      {analysis.primaryRootCauseDetails && (
                        <p className="text-foreground text-sm leading-relaxed">
                          {analysis.primaryRootCauseDetails}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Secondary Causes */}
                  {analysis.secondaryRootCauses &&
                    analysis.secondaryRootCauses.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-3">
                          {t("secondaryCauses") || "Secondary Causes"}
                        </h4>
                        <div className="space-y-3">
                          {analysis.secondaryRootCauses.map((cause, idx) => (
                            <div
                              key={idx}
                              className="bg-muted/50 rounded-lg p-4 border border-border"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300 capitalize">
                                  {cause.category}
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
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Actions & Recommendations */}
            {((analysis.internalActions &&
              analysis.internalActions.length > 0) ||
              (analysis.customerActions &&
                analysis.customerActions.length > 0) ||
              (analysis.productFeedback &&
                analysis.productFeedback.length > 0)) && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600/20 via-purple-500/10 to-indigo-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl p-6 border border-border dark:border-indigo-500/20">
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {t("actionsRecommendations") || "Actions & Recommendations"}
                  </h2>

                  {/* Internal Actions */}
                  {analysis.internalActions &&
                    analysis.internalActions.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-3">
                          {t("internalActions") || "Internal Actions"}
                        </h4>
                        <div className="space-y-3">
                          {analysis.internalActions.map((action, idx) => (
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
                                      {action.priority}
                                    </span>
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                                      {action.area}
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
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Customer Actions */}
                  {analysis.customerActions &&
                    analysis.customerActions.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3">
                          {t("customerActions") || "Customer Actions"}
                        </h4>
                        <div className="space-y-3">
                          {analysis.customerActions.map((action, idx) => (
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
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Product Feedback */}
                  {analysis.productFeedback &&
                    analysis.productFeedback.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-3">
                          {t("productFeedback") || "Product Feedback"}
                        </h4>
                        <div className="space-y-3">
                          {analysis.productFeedback.map((feedback, idx) => (
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
                                  {feedback.severity}
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
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Conversation Structure */}
            {analysis.structureMetrics && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-teal-600/20 via-cyan-500/10 to-teal-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
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
                        {analysis.structureMetrics.totalMessages}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("turnCount") || "Turns"}
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {analysis.structureMetrics.turnCount}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("agentTalkRatio") || "Agent Talk %"}
                      </p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {(
                          analysis.structureMetrics.agentTalkRatio * 100
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
                          analysis.structureMetrics.customerTalkRatio * 100
                        ).toFixed(0)}
                        %
                      </p>
                    </div>
                    {analysis.conversationComplexity && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("complexity") || "Complexity"}
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {analysis.conversationComplexity}/5
                        </p>
                      </div>
                    )}
                    {analysis.conversationClarityScore && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("clarityScore") || "Clarity Score"}
                        </p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {analysis.conversationClarityScore}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Key Quotes */}
            {analysis.keyQuotes && analysis.keyQuotes.length > 0 && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600/20 via-blue-500/10 to-cyan-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl p-6 border border-border dark:border-cyan-500/20">
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {t("keyQuotes") || "Key Quotes"}
                  </h2>
                  <div className="space-y-3">
                    {analysis.keyQuotes.map((quote, idx) => (
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
                            {quote.purpose.replace(/_/g, " ")}
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
    </div>
  );
}
