import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { requireUser } from "./auth";
import {
  chooseAnalysisLanguage,
  chooseConversationLanguage,
  computeTimeRuleBased,
  type SupportedLanguage,
  type TimeRuleBasedResult,
} from "../lib/chat/ruleBasedTime";
import {
  computeRuleBasedFlags,
  type RuleBasedMetricsPatch,
} from "../lib/chat/ruleBasedFlags";
import {
  buildChatAnalysisAiInput,
  type AiInputMessage,
  type AiStructureMetricsInput,
} from "../lib/chat/buildChatAnalysisAiInput";
import type { ChatAnalysisAiOutput } from "../lib/ai/aiTypes";
import { getOpenAiClient, CHAT_ANALYSIS_MODEL } from "../lib/openai/client";
import { Id } from "./_generated/dataModel";
import { getChatAnalysisSystemPrompt } from "@/lib/ai/chat_analysis_prompt";

export const saveConnection = mutation({
  args: {
    organizationId: v.id("organizations"),
    subdomain: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(),
    scope: v.optional(v.string()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Upsert per org
    const existing = await ctx.db
      .query("zendeskConnections")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        subdomain: args.subdomain,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        scope: args.scope,
        updatedAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("zendeskConnections", {
      organizationId: args.organizationId,
      subdomain: args.subdomain,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      scope: args.scope,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});

export const getConnectionByOrg = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("zendeskConnections")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();
  },
});

export const deleteConnectionByOrg = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("zendeskConnections")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});

// Create or get a chat document for a Zendesk ticket
export const getOrCreateZendeskChat = mutation({
  args: {
    organizationId: v.id("organizations"),
    ticketId: v.number(),
    subject: v.optional(v.string()),
    status: v.optional(v.string()),
    createdAt: v.optional(v.string()),
    createdByUserId: v.string(),
    createdByMemberId: v.id("organizationMembers"),
  },
  handler: async (ctx, args) => {
    // Check if chat already exists for this ticket
    const existingChat = await ctx.db
      .query("chats")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) =>
        q.and(
          q.eq(q.field("sourceType"), "integration"),
          q.eq(q.field("sourceChannel"), "zendesk"),
          q.eq(q.field("externalChatId"), args.ticketId.toString())
        )
      )
      .first();

    if (existingChat) {
      return existingChat._id;
    }

    // Create new chat document
    const now = Date.now();
    const chatId = await ctx.db.insert("chats", {
      organizationId: args.organizationId,
      createdByMemberId: args.createdByMemberId,
      createdByUserId: args.createdByUserId,
      sourceType: "integration",
      sourceChannel: "zendesk",
      externalChatId: args.ticketId.toString(),
      title: args.subject || `Zendesk Ticket #${args.ticketId}`,
      status:
        args.status === "solved" || args.status === "closed"
          ? "closed"
          : "open",
      startedAt: args.createdAt ? new Date(args.createdAt).getTime() : now,
      createdAt: now,
    });

    return chatId;
  },
});

export const saveZendeskAnalysis = mutation({
  args: {
    chatId: v.id("chats"),
    organizationId: v.id("organizations"),
    analysis: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("chatAnalyses", {
      chatId: args.chatId,
      organizationId: args.organizationId,

      // Required fields
      analysisVersion: "v1.0",
      updatedAt: now,

      // Outcome (required)
      outcomeStatus: args.analysis.aiOutput?.outcome?.status || "unresolved",
      outcomeConfidence: args.analysis.aiOutput?.outcome?.confidence,
      outcomeSummary: args.analysis.aiOutput?.outcome?.summary || "",

      // Customer Experience
      customerSatisfactionScore:
        args.analysis.aiOutput?.customerExperience?.satisfactionScore,
      customerSatisfactionLabel:
        args.analysis.aiOutput?.customerExperience?.satisfactionLabel,
      sentimentStartScore:
        args.analysis.aiOutput?.customerExperience?.sentimentStart?.score,
      sentimentStartLabel:
        args.analysis.aiOutput?.customerExperience?.sentimentStart?.label,
      sentimentEndScore:
        args.analysis.aiOutput?.customerExperience?.sentimentEnd?.score,
      sentimentEndLabel:
        args.analysis.aiOutput?.customerExperience?.sentimentEnd?.label,
      sentimentVolatilityScore:
        args.analysis.aiOutput?.customerExperience?.sentimentVolatility,

      // Agent Performance
      agentOverallScore: args.analysis.aiOutput?.agentPerformance?.overallScore,
      agentClarityScore: args.analysis.aiOutput?.agentPerformance?.clarityScore,
      agentEmpathyScore: args.analysis.aiOutput?.agentPerformance?.empathyScore,
      agentOwnershipScore:
        args.analysis.aiOutput?.agentPerformance?.ownershipScore,
      agentProactivityScore:
        args.analysis.aiOutput?.agentPerformance?.proactivityScore,
      agentProfessionalismScore:
        args.analysis.aiOutput?.agentPerformance?.professionalismScore,
      agentStrengths: args.analysis.aiOutput?.agentPerformance?.strengths,
      agentImprovements:
        args.analysis.aiOutput?.agentPerformance?.areasForImprovement,
      agentCoachingTips: args.analysis.aiOutput?.agentPerformance?.coachingTips,

      // Risk
      churnRiskScore: args.analysis.aiOutput?.risk?.churnRiskScore,
      churnRiskLevel: args.analysis.aiOutput?.risk?.churnRiskLevel,
      escalationRiskScore: args.analysis.aiOutput?.risk?.escalationRiskScore,
      reputationalRiskScore:
        args.analysis.aiOutput?.risk?.reputationalRiskScore,
      riskNotes: args.analysis.aiOutput?.risk?.notes,

      // Intent
      primaryIntent: args.analysis.aiOutput?.intent?.primaryIntent,
      secondaryIntents: args.analysis.aiOutput?.intent?.secondaryIntents,
      salesStage: args.analysis.aiOutput?.intent?.salesStage,
      purchaseIntentScore: args.analysis.aiOutput?.intent?.purchaseIntentScore,
      mainObjections: args.analysis.aiOutput?.intent?.mainObjections,

      // Root Causes
      primaryRootCauseCategory:
        args.analysis.aiOutput?.rootCauses?.primaryCategory,
      primaryRootCauseDetails:
        args.analysis.aiOutput?.rootCauses?.primaryDetails,
      secondaryRootCauses: args.analysis.aiOutput?.rootCauses?.secondaryCauses,

      // Actions
      internalActions: args.analysis.aiOutput?.actions?.internalActions,
      customerActions: args.analysis.aiOutput?.actions?.customerActions,
      productFeedback: args.analysis.aiOutput?.actions?.productFeedback,

      // Structure
      structureMetrics: args.analysis.ruleBased?.structureMetrics,
      conversationComplexity:
        args.analysis.aiOutput?.conversationStructure?.complexity,
      conversationClarityScore:
        args.analysis.aiOutput?.conversationStructure?.clarityScore,

      // Key Quotes
      keyQuotes: args.analysis.aiOutput?.keyQuotes,

      // Meta
      processingTimeMs: args.analysis.meta?.processingTimeMs,
      tokenInputCount: args.analysis.meta?.tokenInputCount,
      tokenOutputCount: args.analysis.meta?.tokenOutputCount,
      language: args.analysis.meta?.conversationLanguage,

      // Required follow-up fields
      requiresFollowUp: args.analysis.aiOutput?.followUp?.required || false,
      followUpOwnerType: args.analysis.aiOutput?.followUp?.ownerType || "none",
      followUpDeadline: args.analysis.aiOutput?.followUp?.deadline,
      followUpNotes: args.analysis.aiOutput?.followUp?.notes,

      createdAt: now,
    });

    return id;
  },
});

// Optional: refresh Zendesk access token when a refresh_token is stored
export const refreshAccessToken = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    | { ok: true; expiresAt: number }
    | { ok: false; error: string; details?: string }
  > => {
    const connection = await ctx.runQuery(api.zendesk.getConnectionByOrg, {
      organizationId: args.organizationId,
    });

    if (!connection?.refreshToken) {
      return { ok: false, error: "No refresh token stored" };
    }

    const clientId = process.env.ZENDESK_CLIENT_ID;
    const clientSecret = process.env.ZENDESK_CLIENT_SECRET;
    const redirectUri = process.env.ZENDESK_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return { ok: false, error: "Missing Zendesk OAuth env vars" };
    }

    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", connection.refreshToken);
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("redirect_uri", redirectUri);

    const tokenRes: Response = await fetch(
      `https://${connection.subdomain}.zendesk.com/oauth/tokens`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      }
    );

    if (!tokenRes.ok) {
      const text: string = await tokenRes.text();
      return { ok: false, error: "Refresh failed", details: text };
    }

    const json = await tokenRes.json();
    const accessToken = json?.access_token as string | undefined;
    const refreshToken =
      (json?.refresh_token as string | undefined) ?? connection.refreshToken;
    const expiresIn = (json?.expires_in as number | undefined) ?? 3600;
    const scope = json?.scope as string | undefined;

    if (!accessToken) {
      return { ok: false, error: "Missing access token in refresh response" };
    }

    const expiresAt = Date.now() + expiresIn * 1000;

    await ctx.runMutation(api.zendesk.saveConnection, {
      organizationId: args.organizationId,
      subdomain: connection.subdomain,
      accessToken,
      refreshToken,
      expiresAt,
      scope,
      createdBy: connection.createdBy,
    });

    return { ok: true, expiresAt };
  },
});

export const getZendeskChat = query({
  args: {
    organizationId: v.id("organizations"),
    ticketId: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("chats")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) =>
        q.and(
          q.eq(q.field("sourceType"), "integration"),
          q.eq(q.field("sourceChannel"), "zendesk"),
          q.eq(q.field("externalChatId"), args.ticketId.toString())
        )
      )
      .first();
  },
});

export const getLatestAnalysis = query({
  args: {
    organizationId: v.id("organizations"),
    ticketId: v.number(),
  },
  handler: async (ctx, args) => {
    // Reuse getZendeskChat to avoid code duplication
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) =>
        q.and(
          q.eq(q.field("sourceType"), "integration"),
          q.eq(q.field("sourceChannel"), "zendesk"),
          q.eq(q.field("externalChatId"), args.ticketId.toString())
        )
      )
      .first();

    if (!chat) {
      return null;
    }

    // Get the latest analysis for this chat
    return ctx.db
      .query("chatAnalyses")
      .withIndex("by_chat", (q) => q.eq("chatId", chat._id))
      .order("desc")
      .first();
  },
});

type SenderRole = "customer" | "agent" | "system";

interface ZendeskMessageForStructure {
  senderType: SenderRole;
  textClean: string;
  internalTimestamp: number;
}

function computeStructureMetrics(messages: ZendeskMessageForStructure[]): {
  structureMetrics: AiStructureMetricsInput;
  ruleBasedMetrics: {
    customerMessageCount?: number;
    agentMessageCount?: number;
    turnCount?: number;
    topicsCount?: number;
    durationMs?: number;
  };
} {
  if (messages.length === 0) {
    const empty: AiStructureMetricsInput = {
      totalMessages: 0,
      customerMessageCount: 0,
      agentMessageCount: 0,
      systemMessageCount: 0,
      turnCount: 0,
      roundTripCount: 0,
      customerTalkRatio: 0,
      agentTalkRatio: 0,
      avgCustomerCharsPerMessage: undefined,
      avgAgentCharsPerMessage: undefined,
      maxCustomerChars: 0,
      maxAgentChars: 0,
      durationMs: undefined,
    };

    return {
      structureMetrics: empty,
      ruleBasedMetrics: {
        customerMessageCount: 0,
        agentMessageCount: 0,
        turnCount: 0,
        topicsCount: undefined,
        durationMs: undefined,
      },
    };
  }

  const sorted = [...messages].sort(
    (a, b) => a.internalTimestamp - b.internalTimestamp
  );

  const totalMessages = sorted.length;

  let customerMessageCount = 0;
  let agentMessageCount = 0;
  let systemMessageCount = 0;

  let customerCharsTotal = 0;
  let agentCharsTotal = 0;
  let maxCustomerChars = 0;
  let maxAgentChars = 0;

  let turnCount = 0;
  let lastSpeaker: SenderRole | null = null;

  let roundTripCount = 0;
  let hasOpenCustomerBlock = false;

  for (const m of sorted) {
    const len = m.textClean?.length ?? 0;

    if (m.senderType === "customer") {
      customerMessageCount++;
      customerCharsTotal += len;
      if (len > maxCustomerChars) maxCustomerChars = len;

      if (lastSpeaker !== "customer") {
        turnCount++;
        lastSpeaker = "customer";
      }

      hasOpenCustomerBlock = true;
    } else if (m.senderType === "agent") {
      agentMessageCount++;
      agentCharsTotal += len;
      if (len > maxAgentChars) maxAgentChars = len;

      if (lastSpeaker !== "agent") {
        turnCount++;
        lastSpeaker = "agent";
      }

      if (hasOpenCustomerBlock) {
        roundTripCount++;
        hasOpenCustomerBlock = false;
      }
    } else {
      systemMessageCount++;
    }
  }

  const customerTalkRatio =
    totalMessages > 0 ? customerMessageCount / totalMessages : 0;
  const agentTalkRatio =
    totalMessages > 0 ? agentMessageCount / totalMessages : 0;

  const avgCustomerCharsPerMessage =
    customerMessageCount > 0
      ? customerCharsTotal / customerMessageCount
      : undefined;

  const avgAgentCharsPerMessage =
    agentMessageCount > 0 ? agentCharsTotal / agentMessageCount : undefined;

  const firstTs = sorted[0]?.internalTimestamp;
  const lastTs = sorted[sorted.length - 1]?.internalTimestamp;
  const durationMs =
    typeof firstTs === "number" &&
    typeof lastTs === "number" &&
    lastTs >= firstTs
      ? lastTs - firstTs
      : undefined;

  const structureMetrics: AiStructureMetricsInput = {
    totalMessages,
    customerMessageCount,
    agentMessageCount,
    systemMessageCount,
    turnCount,
    roundTripCount,
    customerTalkRatio,
    agentTalkRatio,
    avgCustomerCharsPerMessage,
    avgAgentCharsPerMessage,
    maxCustomerChars,
    maxAgentChars,
    durationMs,
  };

  const ruleBasedMetrics = {
    customerMessageCount,
    agentMessageCount,
    turnCount,
    topicsCount: undefined as number | undefined,
    durationMs,
  };

  return { structureMetrics, ruleBasedMetrics };
}

function cleanText(input: string | undefined | null): string {
  if (!input) return "";

  // إزالة HTML tags
  let cleaned = input.replace(/<[^>]+>/g, "");

  // إزالة HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // إزالة المسافات الزائدة وتنظيف النص
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

async function fetchZendeskJson(
  subdomain: string,
  accessToken: string,
  path: string
): Promise<any> {
  // Input validation للأمان
  if (!subdomain || !accessToken || !path) {
    throw new Error("Missing required parameters for Zendesk API request");
  }

  // التأكد من أن subdomain لا يحتوي على أحرف خطرة
  if (!/^[a-zA-Z0-9-]+$/.test(subdomain)) {
    throw new Error("Invalid subdomain format");
  }

  const res = await fetch(`https://${subdomain}.zendesk.com${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Zendesk API error (${res.status} ${res.statusText}): ${errText}`
    );
  }

  return res.json();
}

export const analyzeTicket = action({
  args: {
    organizationId: v.id("organizations"),
    ticketId: v.number(),
    analysisLanguage: v.optional(
      v.union(
        v.literal("ar"),
        v.literal("en"),
        v.literal("tr"),
        v.literal("fr"),
        v.literal("es"),
        v.literal("hi"),
        v.literal("ja")
      )
    ),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    analysisId: Id<"chatAnalyses">;
    processingTimeMs: number;
    tokenInputCount?: number;
    tokenOutputCount?: number;
  }> => {
    // ==========================================
    // المرحلة 0: التحقق من الصلاحيات والعضوية
    // ==========================================
    const user = await ctx.auth.getUserIdentity();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const membership = await ctx.runQuery(api.orgMembers.isMember, {
      organizationId: args.organizationId,
      clerkUserId: user.subject,
    });
    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    // التحقق من صحة ticketId
    if (!Number.isFinite(args.ticketId) || args.ticketId <= 0) {
      throw new Error("Invalid ticket ID");
    }

    // ==========================================
    // المرحلة 0.5: التحقق من وجود/إنشاء chat والتحقق من الليمت أولاً
    // (قبل استدعاء Zendesk API أو AI لتوفير التكاليف)
    // ==========================================
    const connection = await ctx.runQuery(api.zendesk.getConnectionByOrg, {
      organizationId: args.organizationId,
    });

    if (!connection) {
      throw new Error("Zendesk connection not found");
    }

    const accessToken = connection.accessToken;
    const subdomain = connection.subdomain;

    if (!accessToken || !subdomain) {
      throw new Error("Missing Zendesk credentials");
    }

    // جلب بيانات التذكرة الأساسية للتحقق من وجودها قبل المتابعة
    let ticketJson;
    try {
      ticketJson = await fetchZendeskJson(
        subdomain,
        accessToken,
        `/api/v2/tickets/${args.ticketId}.json`
      );
    } catch (error) {
      // إذا فشل، حاول تحديث الـ token
      if (connection.refreshToken && connection.expiresAt <= Date.now()) {
        const refreshed = await ctx.runAction(api.zendesk.refreshAccessToken, {
          organizationId: args.organizationId,
        });
        if (refreshed?.ok) {
          const latest = await ctx.runQuery(api.zendesk.getConnectionByOrg, {
            organizationId: args.organizationId,
          });
          if (latest) {
            ticketJson = await fetchZendeskJson(
              latest.subdomain,
              latest.accessToken,
              `/api/v2/tickets/${args.ticketId}.json`
            );
          }
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    const ticket = ticketJson?.ticket;
    if (!ticket) {
      throw new Error("Zendesk ticket not found");
    }

    // إنشاء أو جلب chat document أولاً
    const chatId = await ctx.runMutation(api.zendesk.getOrCreateZendeskChat, {
      organizationId: args.organizationId,
      ticketId: args.ticketId,
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.created_at,
      createdByUserId: user.subject!,
      createdByMemberId: membership._id,
    });

    // التحقق من حدود التحليل قبل استدعاء AI (توفير التكاليف!)
    const canAnalyze = await ctx.runQuery(api.featureGate.canPerformAnalysis, {
      organizationId: args.organizationId,
      chatId,
    });

    if (!canAnalyze.allowed) {
      if (canAnalyze.reason === "limit_exceeded") {
        throw new Error(
          `تم تجاوز الحد اليومي للتحليلات. الحد المسموح: ${canAnalyze.dailyLimit}، المستخدم اليوم: ${canAnalyze.usedToday}. يرجى المحاولة لاحقًا.`
        );
      } else if (canAnalyze.reason === "per_chat_daily_limit") {
        const remainingHours = (canAnalyze as any).remainingHours || 24;
        throw new Error(
          `يمكن إجراء تحليل واحد يوميًا لكل تذكرة. حاول مرة أخرى بعد ${remainingHours} ساعة.`
        );
      } else {
        throw new Error("لا يمكن إجراء التحليل في الوقت الحالي.");
      }
    }

    // الآن جلب التعليقات (التذكرة تم جلبها بالفعل أعلاه)
    const commentsJson = await fetchZendeskJson(
      subdomain,
      accessToken,
      `/api/v2/tickets/${args.ticketId}/comments.json`
    );

    const comments = Array.isArray(commentsJson?.comments)
      ? commentsJson.comments
      : [];

    if (comments.length === 0) {
      throw new Error("No comments found for this ticket");
    }

    const requesterId = ticket.requester_id as number | undefined;

    // ==========================================
    // المرحلة 1: تطبيع الرسائل (Normalization)
    // ==========================================

    // حد أقصى لعدد الرسائل لتجنب استهلاك موارد زائدة
    const MAX_MESSAGES = 500;
    const commentsToProcess = comments.slice(0, MAX_MESSAGES);

    const normalizedMessages = commentsToProcess
      .map((c: any, idx: number) => {
        const ts = c?.created_at
          ? new Date(c.created_at).getTime()
          : Date.now();
        const senderType: SenderRole =
          requesterId && c?.author_id === requesterId ? "customer" : "agent";
        const textRaw = (c?.body ?? "").toString();
        const textClean = cleanText(textRaw);

        return {
          id: `zd-${c?.id ?? idx}`,
          senderType,
          senderName: c?.author_id ? `User ${c.author_id}` : null,
          textRaw,
          textClean,
          internalTimestamp: ts,
          externalTimestamp: ts,
        };
      })
      .filter((m: any) => m.textClean && m.textClean.length > 0)
      .sort((a: any, b: any) => a.internalTimestamp - b.internalTimestamp);

    if (normalizedMessages.length === 0) {
      throw new Error("Ticket comments are empty after cleaning");
    }

    const startedAt = normalizedMessages[0].internalTimestamp;
    const endedAt =
      normalizedMessages[normalizedMessages.length - 1]?.internalTimestamp ??
      startedAt;

    // ==========================================
    // المرحلة 2: اختيار لغة التحليل ولغة المحادثة
    // ==========================================
    const analysisLanguage: SupportedLanguage = chooseAnalysisLanguage({
      analysisLanguageFromUser: args.analysisLanguage as
        | SupportedLanguage
        | undefined,
      chatLanguage: null,
      orgDefaultLanguage: undefined,
    });

    const timeMessages = normalizedMessages.map((m: any) => ({
      senderType: m.senderType,
      internalTimestamp: m.internalTimestamp,
      language: undefined,
    }));

    const conversationLanguage: SupportedLanguage = chooseConversationLanguage({
      chatLanguage: null,
      analysisLanguage,
      messages: timeMessages,
    });

    // ==========================================
    // المرحلة 3: حساب الوقت (SLA) - Rule-based
    // ==========================================
    const timeResult: TimeRuleBasedResult = computeTimeRuleBased(
      {
        sourceType: "integration",
        sourceChannel: "zendesk",
        language: undefined,
      },
      timeMessages,
      normalizedMessages.filter((m: any) => m.senderType === "customer").length
    );

    // ==========================================
    // المرحلة 4: حساب بنية المحادثة - Rule-based
    // ==========================================
    const { structureMetrics, ruleBasedMetrics } = computeStructureMetrics(
      normalizedMessages.map((m: any) => ({
        senderType: m.senderType,
        textClean: m.textClean,
        internalTimestamp: m.internalTimestamp,
      }))
    );

    // ==========================================
    // المرحلة 5: حساب الأعلام والكلمات المفتاحية - Rule-based
    // ==========================================
    const { flags, metricsPatch } = computeRuleBasedFlags({
      messages: normalizedMessages.map((m: any) => ({
        senderType: m.senderType,
        textClean: m.textClean,
        language: undefined,
        containsProfanity: undefined,
        toxicityScore: undefined,
      })),
      conversationLanguage,
      timeResult,
    });

    // ==========================================
    // المرحلة 6: بناء مدخلات الـ AI
    // ==========================================
    const aiInput = buildChatAnalysisAiInput({
      analysisLanguage,
      conversationLanguage,
      chat: {
        chatId: `zendesk-${args.ticketId}`,
        organizationId: `${args.organizationId}`,
        sourceType: "integration",
        sourceChannel: "zendesk",
        status:
          ticket.status === "closed" || ticket.status === "solved"
            ? "closed"
            : "open",
        title: (ticket.subject as string | null) ?? null,
        startedAt,
        endedAt,
        customerName: ticket.requester_id
          ? `Requester ${ticket.requester_id}`
          : null,
      },
      messages: normalizedMessages.map(
        (m: any): AiInputMessage => ({
          id: m.id,
          role: m.senderType,
          senderName: m.senderName,
          text: m.textClean,
          originalText: m.textRaw || undefined,
          timestamp: m.internalTimestamp,
        })
      ),
      channelType: timeResult.channelType,
      timeResult,
      structureMetrics,
      flags,
      keywordMetrics: metricsPatch as RuleBasedMetricsPatch,
    });

    // ==========================================
    // المرحلة 7: استدعاء AI للتحليل المتقدم
    // ==========================================
    const client = getOpenAiClient();
    const systemPrompt = getChatAnalysisSystemPrompt(analysisLanguage);
    const started = Date.now();

    const completion = await client.chat.completions.create({
      model: CHAT_ANALYSIS_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(aiInput) },
      ],
    });

    const finished = Date.now();
    const processingTimeMs = finished - started;

    const rawContent = completion.choices[0]?.message?.content ?? "{}";

    let aiOutput: ChatAnalysisAiOutput;
    try {
      aiOutput = JSON.parse(rawContent) as ChatAnalysisAiOutput;
    } catch (_err) {
      throw new Error("AI output is not valid JSON");
    }

    if (!aiOutput || !aiOutput.outcome) {
      throw new Error("AI output is missing required outcome block");
    }

    const tokenInputCount = completion.usage?.prompt_tokens ?? undefined;
    const tokenOutputCount = completion.usage?.completion_tokens ?? undefined;

    // ==========================================
    // المرحلة 8: حفظ النتائج في قاعدة البيانات
    // (chat document و الليمت تم التحقق منهما في البداية)
    // ==========================================
    const analysisId: Id<"chatAnalyses"> = await ctx.runMutation(
      api.zendesk.saveZendeskAnalysis,
      {
        chatId,
        organizationId: args.organizationId,
        analysis: {
          aiOutput,
          ruleBased: {
            timeResult,
            structureMetrics,
            ruleBasedMetrics,
            flags,
            keywordMetrics: metricsPatch,
          },
          meta: {
            processingTimeMs,
            tokenInputCount,
            tokenOutputCount,
            analysisLanguage,
            conversationLanguage,
            startedBy: user.subject,
          },
          ticketSnapshot: {
            subject: ticket.subject,
            status: ticket.status,
            requesterId: ticket.requester_id,
            assigneeId: ticket.assignee_id,
            priority: ticket.priority,
            createdAt: ticket.created_at,
            updatedAt: ticket.updated_at,
          },
        },
      }
    );

    return {
      analysisId,
      processingTimeMs,
      tokenInputCount,
      tokenOutputCount,
    };
  },
});
