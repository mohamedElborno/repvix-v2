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
  // Employees
  // =============================
  employees: defineTable({
    organizationId: v.id("organizations"), // Organization this employee belongs to
    managerId: v.optional(v.string()), // Clerk user id
    name: v.string(),
    email: v.optional(v.string()),
    role: v.string(), // "sales" | "support" | "manager"
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    userId: v.optional(v.string()), // Clerk user id if linked
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_manager", ["managerId"])
    .index("by_user", ["userId"])
    .index("by_email", ["email"]),

  // =============================
  // Chats
  // =============================
  chats: defineTable({
    userId: v.optional(v.string()), // Clerk user id (owner of the chat)
    organizationId: v.optional(v.id("organizations")), // Organization that owns this chat
    title: v.optional(v.string()),
    employeeId: v.optional(v.id("employees")), // Employee assigned to this chat
    externalChatId: v.optional(v.string()),
    channel: v.optional(v.string()),
    customerIdentifier: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_org", ["organizationId"])
    .index("by_employee", ["employeeId"])
    .index("by_external", ["externalChatId"]),

  // =============================
  // Chat Messages
  // =============================
  chatMessages: defineTable({
    chatId: v.id("chats"),
    senderType: v.union(v.literal("customer"), v.literal("agent")),
    senderName: v.optional(v.string()),
    messageText: v.optional(v.string()),
    messageType: v.string(), // default "text"
    externalMessageId: v.optional(v.string()),
    externalTimestamp: v.optional(v.number()),
    internalTimestamp: v.number(),
    rawPayload: v.optional(v.any()), // JSON object
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
  // Chat Analysis
  // =============================
  chatAnalysis: defineTable({
    chatId: v.id("chats"),
    organizationId: v.optional(v.id("organizations")),
    summary: v.optional(v.string()),
    recommendations: v.optional(v.any()), // JSON array
    linguisticAnalysis: v.optional(v.any()), // JSON object
    behavioralAnalysis: v.optional(v.any()), // JSON object
    outcomeAnalysis: v.optional(v.any()), // JSON object
    psychologicalProfile: v.optional(v.any()), // JSON object
    intentAnalysis: v.optional(v.any()), // JSON object
    temporalDynamics: v.optional(v.any()), // JSON object
    analystCommentary: v.optional(v.string()),
    rootCauseAnalysis: v.optional(v.any()), // JSON object
    analysisVersion: v.string(), // default "v1"
    createdAt: v.number(),
  })
    .index("by_chat", ["chatId"])
    .index("by_org", ["organizationId"]),

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
