// convex/schema.ts
// Convex schema migrated from Supabase
// Works with Clerk auth (store Clerk user ID in userId/ownerId)

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // =============================
  // Organizations
  // =============================
  // convex/schema.ts
  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
  }).index("by_clerkOrgId", ["clerkOrgId"]),

  // =============================
  // Organization Members
  // =============================
  organizationMembers: defineTable({
    organizationId: v.id("organizations"),
    clerkUserId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    // Add "org:admin" and "org:member" and "org:basic_member" to match Clerk default roles
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_user", ["clerkUserId"]),

  // =============================
  // Employee Invitations
  // =============================
  employeeInvites: defineTable({
    orgId: v.id("organizations"),
    email: v.string(),
    role: v.string(), // "manager" | "agent"
    invitedBy: v.string(), // inviter clerk id
    token: v.string(), // random UUID
    expiresAt: v.number(), // ms
    accepted: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_org", ["orgId"]),

  // =============================
  // Chats
  // =============================

  chats: defineTable({
    // The organization that owns the chat
    organizationId: v.id("organizations"),

    // The member who created the chat (a member of the organization)
    createdByMemberId: v.id("organizationMembers"),

    // Useful if you want to link it directly to a Clerk user
    createdByUserId: v.string(), // clerkUserId

    // The main employee responsible for the chat (optional)
    primaryAgentMemberId: v.optional(v.id("organizationMembers")),

    // Source type: manual or integration?
    sourceType: v.union(
      v.literal("manual"), // The user copied/uploaded the chat
      v.literal("integration") // Came from WhatsApp / Telegram / etc.
    ),

    // The channel if it was an Integration: "whatsapp" | "telegram" | "intercom" | ...
    sourceChannel: v.optional(v.string()),

    // The chat ID in the external system (if it exists)
    externalChatId: v.optional(v.string()),

    // The customer identity in the external system (optional)
    customerIdentifier: v.optional(v.string()), // رقم، إيميل، يوزرنيم...

    // Some useful metadata for later
    title: v.optional(v.string()), // A simple title for the chat
    language: v.optional(v.string()), // "en" | "ar" | ...

    // التوقيت
    startedAt: v.number(), // The first message in the chat (timestamp)
    endedAt: v.optional(v.number()), // The last message if it was closed
    createdAt: v.number(), // The time it was entered into the system (ingestion time)

    // The status of the chat if we need it for the dashboard
    status: v.union(v.literal("open"), v.literal("closed")),

    // A simple aggregation for later
    messageCount: v.optional(v.number()),
    lastMessageAt: v.optional(v.number()),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_createdBy", ["organizationId", "createdByMemberId"])
    .index("by_org_primaryAgent", ["organizationId", "primaryAgentMemberId"])
    .index("by_external", ["organizationId", "externalChatId"]),

  // =============================
  // Chat Messages
  // =============================
  chatMessages: defineTable({
    chatId: v.id("chats"),

    // من كتب هذه الرسالة؟
    senderType: v.union(
      v.literal("customer"),
      v.literal("agent"),
      v.literal("system")
    ),
    senderMemberId: v.optional(v.id("organizationMembers")), // لو agent داخل المنظمة
    senderName: v.optional(v.string()),

    // النص الخام + النص المنظّف
    textRaw: v.string(), // النص كما هو بالضبط
    textClean: v.string(), // النص بعد التنظيف/الفلترة للـ LLM

    messageType: v.string(), // "text" حالياً، ممكن تزيد لاحقًا

    // التوقيت
    externalMessageId: v.optional(v.string()),
    externalTimestamp: v.optional(v.number()), // من المصدر لو موجود
    internalTimestamp: v.number(), // اللي نعتمده داخلياً

    // ميتاداتا تتعلق بالتنظيف/السمّية
    language: v.optional(v.string()), // "ar" / "en" ...
    toxicityScore: v.optional(v.number()), // 0–1 أو 0–100
    containsBannedContent: v.optional(v.boolean()), // شيء يكسر سياسة المزود
    containsProfanity: v.optional(v.boolean()), // فيه شتائم عامة
    profanityCategory: v.optional(v.string()), // "friendly_banter" | "hostile" | ...

    rawPayload: v.optional(v.any()),
  })
    .index("by_chat", ["chatId"])
    .index("by_chat_timestamp", ["chatId", "internalTimestamp"]),

  // =============================
  // Chat Chunks
  // =============================
  chatChunks: defineTable({
    chatId: v.id("chats"),
    chunkIndex: v.number(),
    text: v.string(),
    embedding: v.optional(v.any()), // vector embedding
    createdAt: v.number(),
  })
    .index("by_chat", ["chatId"])
    .index("by_chat_index", ["chatId", "chunkIndex"]),

  // =============================
  // Chat Analyses (per chat)
  // =============================
  chatAnalyses: defineTable({
    // ربط أساسي
    chatId: v.id("chats"),
    organizationId: v.id("organizations"),
    language: v.optional(v.string()), // لو اختلفت عن chat.language
    modelVersion: v.optional(v.string()), // "gpt-5.1-mini-2025-11"
    analysisVersion: v.string(), // للتحكم في منطق التحليل
    createdAt: v.number(), // timestamp ms
    updatedAt: v.number(),

    // 1) نتيجة المحادثة (Outcome)
    outcomeStatus: v.union(
      v.literal("resolved"),
      v.literal("partially_resolved"),
      v.literal("unresolved"),
      v.literal("escalated"),
      v.literal("pending_customer"),
      v.literal("pending_internal")
    ),
    outcomeConfidence: v.optional(v.number()), // 0-100
    outcomeSummary: v.string(), // ملخص قصير جدًا لما حدث

    requiresFollowUp: v.boolean(),
    followUpOwnerType: v.union(
      v.literal("none"),
      v.literal("agent"),
      v.literal("team"),
      v.literal("system")
    ),
    followUpDeadline: v.optional(v.number()), // ms
    followUpNotes: v.optional(v.string()),

    // 2) تجربة العميل (Customer Experience & Sentiment)
    customerSatisfactionScore: v.optional(v.number()), // 0-100
    customerSatisfactionLabel: v.optional(
      v.union(
        v.literal("very_low"),
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("very_high")
      )
    ),

    sentimentStartScore: v.optional(v.number()), // 0-100
    sentimentStartLabel: v.optional(
      v.union(
        v.literal("very_negative"),
        v.literal("negative"),
        v.literal("neutral"),
        v.literal("positive"),
        v.literal("very_positive")
      )
    ),
    sentimentEndScore: v.optional(v.number()),
    sentimentEndLabel: v.optional(
      v.union(
        v.literal("very_negative"),
        v.literal("negative"),
        v.literal("neutral"),
        v.literal("positive"),
        v.literal("very_positive")
      )
    ),
    sentimentVolatilityScore: v.optional(v.number()), // 0-100

    emotionTrajectory: v.optional(
      v.array(
        v.object({
          phase: v.union(
            v.literal("start"),
            v.literal("early"),
            v.literal("mid"),
            v.literal("late"),
            v.literal("end")
          ),
          score: v.number(), // 0-100
          label: v.union(
            v.literal("very_negative"),
            v.literal("negative"),
            v.literal("neutral"),
            v.literal("positive"),
            v.literal("very_positive")
          ),
        })
      )
    ),

    // 3) هيكلة المحادثة والـ SLA
    conversationComplexity: v.optional(v.number()), // 1-5
    conversationClarityScore: v.optional(v.number()), // 0-100
    hadClearProblemStatement: v.optional(v.boolean()),
    hadClearResolutionSummary: v.optional(v.boolean()),

    // ---------------------------
    // الحقول الزمنية الأساسية
    // ---------------------------
    avgResponseDelayMs: v.optional(v.number()),
    maxResponseDelayMs: v.optional(v.number()),
    slaBreached: v.optional(v.boolean()),

    // ---------------------------
    // كائن تفصيلي للوقت (Rule-based)
    // ---------------------------
    timeMetrics: v.optional(
      v.object({
        channelType: v.string(), // "live_chat" | "messaging" | "email_like"

        firstResponseMs: v.optional(v.number()),
        avgAgentResponseMs: v.optional(v.number()),
        maxAgentResponseMs: v.optional(v.number()),

        softViolationCount: v.number(),
        hardViolationCount: v.number(),
      })
    ),

    // 4) أداء الموظف (إجمالي على مستوى المحادثة)
    agentOverallScore: v.optional(v.number()), // 0-100
    agentClarityScore: v.optional(v.number()),
    agentEmpathyScore: v.optional(v.number()),
    agentOwnershipScore: v.optional(v.number()),
    agentProactivityScore: v.optional(v.number()),
    agentProfessionalismScore: v.optional(v.number()),

    agentStrengths: v.optional(v.string()),
    agentImprovements: v.optional(v.string()),
    agentCoachingTips: v.optional(v.string()),

    // 5) النوايا والمبيعات (Intent & Sales Lens)
    primaryIntent: v.optional(
      v.union(
        v.literal("complaint"),
        v.literal("pre_sales_question"),
        v.literal("technical_issue"),
        v.literal("refund_request"),
        v.literal("cancellation"),
        v.literal("billing_issue"),
        v.literal("account_issue"),
        v.literal("feedback"),
        v.literal("other")
      )
    ),
    secondaryIntents: v.optional(v.array(v.string())), // يمكن تضييقها لاحقًا
    salesStage: v.optional(
      v.union(
        v.literal("none"),
        v.literal("awareness"),
        v.literal("consideration"),
        v.literal("decision"),
        v.literal("post_purchase")
      )
    ),
    purchaseIntentScore: v.optional(v.number()), // 0-100

    mainObjections: v.optional(
      v.array(
        v.object({
          type: v.union(
            v.literal("price"),
            v.literal("features"),
            v.literal("complexity"),
            v.literal("trust"),
            v.literal("timing"),
            v.literal("other")
          ),
          strength: v.number(), // 0-100
          note: v.optional(v.string()),
        })
      )
    ),

    // 6) الأسباب الجذرية (Root Causes)
    primaryRootCauseCategory: v.optional(
      v.union(
        v.literal("product"),
        v.literal("policy"),
        v.literal("billing"),
        v.literal("ux"),
        v.literal("onboarding"),
        v.literal("expectation_mismatch"),
        v.literal("other")
      )
    ),
    primaryRootCauseDetails: v.optional(v.string()),

    secondaryRootCauses: v.optional(
      v.array(
        v.object({
          category: v.string(),
          details: v.optional(v.string()),
          weight: v.optional(v.number()), // 0-100 لو حبيت
        })
      )
    ),

    // 7) المخاطر (Risks)
    churnRiskScore: v.optional(v.number()), // 0-100
    churnRiskLevel: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    escalationRiskScore: v.optional(v.number()), // 0-100
    reputationalRiskScore: v.optional(v.number()), // 0-100
    riskNotes: v.optional(v.string()),

    // 8) التوصيات العملية (Actions & Feedback)
    internalActions: v.optional(
      v.array(
        v.object({
          priority: v.union(
            v.literal("low"),
            v.literal("medium"),
            v.literal("high")
          ),
          area: v.string(), // "support_process" | "product" | "billing"...
          title: v.string(),
          description: v.string(),
          owner: v.optional(v.string()), // "support_team" | "product_team"...
          suggestedTimelineDays: v.optional(v.number()),
        })
      )
    ),

    customerActions: v.optional(
      v.array(
        v.object({
          title: v.string(),
          description: v.string(),
          channel: v.optional(
            v.union(
              v.literal("email"),
              v.literal("whatsapp"),
              v.literal("phone"),
              v.literal("in_app"),
              v.literal("other")
            )
          ),
        })
      )
    ),

    productFeedback: v.optional(
      v.array(
        v.object({
          severity: v.union(
            v.literal("low"),
            v.literal("medium"),
            v.literal("high"),
            v.literal("critical")
          ),
          module: v.optional(v.string()), // "billing", "dashboard", ...
          note: v.string(),
        })
      )
    ),

    // 9) الشواهد النصية (Evidence)
    keyQuotes: v.optional(
      v.array(
        v.object({
          role: v.union(
            v.literal("customer"),
            v.literal("agent"),
            v.literal("system")
          ),
          purpose: v.union(
            v.literal("frustration"),
            v.literal("satisfaction"),
            v.literal("objection"),
            v.literal("appreciation"),
            v.literal("threat"),
            v.literal("other")
          ),
          text: v.string(),
          messageId: v.optional(v.id("chatMessages")),
        })
      )
    ),

    // 10) مرحلة التحليل القاعدي (Rule-based pre-analysis)
    ruleBasedFlags: v.optional(
      v.object({
        hasInsults: v.optional(v.boolean()),
        hasProfanity: v.optional(v.boolean()),
        hasSlaViolation: v.optional(v.boolean()),
        hasRefundRequest: v.optional(v.boolean()),
        hasCancellationThreat: v.optional(v.boolean()),
        hasPriceNegotiation: v.optional(v.boolean()),
      })
    ),

    ruleBasedMetrics: v.optional(
      v.object({
        customerMessageCount: v.optional(v.number()),
        agentMessageCount: v.optional(v.number()),
        turnCount: v.optional(v.number()),
        topicsCount: v.optional(v.number()),
        durationMs: v.optional(v.number()),
      })
    ),

    // ---------------------------
    // كائن تفصيلي لبنية المحادثة (Rule-based)
    // ---------------------------
    structureMetrics: v.optional(
      v.object({
        totalMessages: v.number(),
        customerMessageCount: v.number(),
        agentMessageCount: v.number(),
        systemMessageCount: v.number(),
        turnCount: v.number(),
        roundTripCount: v.number(),

        customerTalkRatio: v.number(), // 0-1
        agentTalkRatio: v.number(), // 0-1

        avgCustomerCharsPerMessage: v.optional(v.number()),
        avgAgentCharsPerMessage: v.optional(v.number()),
        maxCustomerChars: v.optional(v.number()),
        maxAgentChars: v.optional(v.number()),

        durationMs: v.optional(v.number()),
      })
    ),

    profanityMessageCount: v.optional(v.number()),
    refundKeywordHits: v.optional(v.number()),
    cancellationThreatHits: v.optional(v.number()),
    priceNegotiationHits: v.optional(v.number()),

    // 11) مخرجات الـ AI الخام + ميتاداتا تقنية
    aiRawOutput: v.optional(v.any()),
    processingTimeMs: v.optional(v.number()),
    tokenInputCount: v.optional(v.number()),
    tokenOutputCount: v.optional(v.number()),
    isPartial: v.optional(v.boolean()),
  })
    .index("by_chat", ["chatId"])
    .index("by_org", ["organizationId"])
    .index("by_org_createdAt", ["organizationId", "createdAt"]),

  // =============================
  // Chat FAQs
  // =============================
  chatFaqs: defineTable({
    chatId: v.id("chats"),
    question: v.string(),
    answer: v.optional(v.string()),
    confidence: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_chat", ["chatId"]),

  // =============================
  // Employee Global Analysis
  // =============================
  employeeGlobalAnalysis: defineTable({
    employeeId: v.id("employees"),
    totalChats: v.number(), // default 0
    totalMessages: v.number(), // default 0
    avgSentimentScore: v.optional(v.number()),
    avgClarityScore: v.optional(v.number()),
    avgEmpathyRatio: v.optional(v.number()),
    avgAssertiveness: v.optional(v.number()),
    avgResponseTimeSec: v.optional(v.number()),
    avgResolutionEfficiency: v.optional(v.number()),
    avgCompatibilityScore: v.optional(v.number()),
    avgSatisfactionProbability: v.optional(v.number()),
    behavioralTrends: v.optional(v.any()), // JSON object
    topStrengths: v.optional(v.any()), // JSON array
    topWeaknesses: v.optional(v.any()), // JSON array
    keyRecommendations: v.optional(v.any()), // JSON array
    avgIntentAlignment: v.optional(v.number()),
    avgResponseDelaySec: v.optional(v.number()),
    temporalPatterns: v.optional(v.any()), // JSON object
    negotiationInsights: v.optional(v.any()), // JSON object
    avgRootCauseConsistency: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastUpdated: v.number(),
  }).index("by_employee", ["employeeId"]),

  // =============================
  // User Global Analysis
  // =============================
  userGlobalAnalysis: defineTable({
    userId: v.string(), // Clerk user id
    totalChats: v.number(), // default 0
    totalMessages: v.number(), // default 0
    dateRangeStart: v.optional(v.number()),
    dateRangeEnd: v.optional(v.number()),
    overallSummary: v.optional(v.string()),
    commonTopics: v.optional(v.any()), // JSON object
    overallSentiment: v.optional(v.string()),
    peakHours: v.optional(v.any()), // JSON object
    commonIssues: v.optional(v.any()), // JSON object
    customerSatisfactionScore: v.optional(v.number()),
    avgResponseTime: v.optional(v.number()), // in seconds
    resolutionRate: v.optional(v.number()),
    avgSentimentScore: v.optional(v.number()),
    avgEmpathyRatio: v.optional(v.number()),
    avgResolutionEfficiency: v.optional(v.number()),
    topTopics: v.optional(v.any()), // JSON array
    globalFaqSummary: v.optional(v.any()), // JSON array
    behavioralInsights: v.optional(v.any()), // JSON object
    performanceTrends: v.optional(v.any()), // JSON object
    teamRecommendations: v.optional(v.any()), // JSON array
    avgIntentAlignment: v.optional(v.number()),
    avgResponseDelaySec: v.optional(v.number()),
    temporalDynamics: v.optional(v.any()), // JSON object
    negotiationTrends: v.optional(v.any()), // JSON object
    rootCauseTrends: v.optional(v.any()), // JSON object
    createdAt: v.number(),
    updatedAt: v.number(),
    lastUpdated: v.number(),
  }).index("by_user", ["userId"]),

  // =============================
  // Global FAQs
  // =============================
  globalFaqs: defineTable({
    analysisId: v.optional(v.id("userGlobalAnalysis")),
    question: v.string(),
    answer: v.optional(v.string()),
    confidence: v.optional(v.number()),
    source: v.optional(v.string()),
    frequency: v.number(), // default 0
    relevanceScore: v.number(), // default 0.0
    lastSeen: v.number(),
    createdAt: v.number(),
  })
    .index("by_analysis", ["analysisId"])
    .index("by_question", ["question"]),

  // =============================
  // Organization Usage
  // =============================
  organizationUsage: defineTable({
    organizationId: v.id("organizations"),
    periodStart: v.number(), // timestamp
    periodEnd: v.number(), // timestamp
    analysesUsed: v.number(), // default 0
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_period", ["organizationId", "periodStart"]),

  // =============================
  // Usage Limits
  // =============================
  usageLimits: defineTable({
    organizationId: v.id("organizations"),
    analyses: v.number(), // default 50
    employees: v.number(), // default 1
    integrations: v.number(), // default 1
    updatedAt: v.number(),
  }).index("by_org", ["organizationId"]),

  // =============================
  // Profiles (optional - if you want to store user profiles)
  // =============================
  profiles: defineTable({
    userId: v.string(), // Clerk user id
    fullName: v.optional(v.string()),
    username: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_username", ["username"]),
});
