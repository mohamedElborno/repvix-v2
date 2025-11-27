// convex/chats.ts

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, requireOrgMembership } from "./auth";

export const createChatWithMessages = mutation({
  args: {
    organizationId: v.id("organizations"),

    // user the currently logged in (to check compatibility with the JWT)
    createdByUserId: v.string(), // clerk user id

    // Source type: manual (to copy WhatsApp for example) or integration
    sourceType: v.union(v.literal("manual"), v.literal("integration")),

    // The channel only if it was an Integration: "whatsapp" | "telegram" | "intercom" | ...
    sourceChannel: v.optional(v.string()),

    title: v.optional(v.string()),
    customerIdentifier: v.optional(v.string()),

    // If you want to assign a different agent than the one who created the chat (optional)
    primaryAgentMemberId: v.optional(v.id("organizationMembers")),

    messages: v.array(
      v.object({
        senderType: v.union(
          v.literal("customer"),
          v.literal("agent"),
          v.literal("system")
        ),
        senderName: v.optional(v.string()),

        textRaw: v.string(),
        textClean: v.string(),

        language: v.optional(v.string()), // "ar" | "en" | ...

        externalMessageId: v.optional(v.string()),
        externalTimestamp: v.optional(v.number()),

        internalTimestamp: v.number(),

        metadata: v.optional(v.any()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // 1) The user identity from Clerk
    const user = await requireUser(ctx);

    if (user.subject !== args.createdByUserId) {
      throw new Error(
        "Invalid createdByUserId for current authenticated user."
      );
    }

    if (args.messages.length === 0) {
      throw new Error("Chat must contain at least one message.");
    }

    // 2) Verify that the user is a member of the organization + get their membership
    const membership = await requireOrgMembership(ctx, args.organizationId);
    const createdByMemberId = membership._id;

    const now = Date.now();

    // 3) Calculate the start/end/messageCount/language for the chat
    const sortedByTime = [...args.messages].sort(
      (a, b) => a.internalTimestamp - b.internalTimestamp
    );

    const startedAt = sortedByTime[0].internalTimestamp;
    const endedAt = sortedByTime[sortedByTime.length - 1].internalTimestamp;

    const messageCount = args.messages.length;
    const lastMessageAt = endedAt;

    const chatLanguage =
      sortedByTime.find((m) => !!m.language)?.language ?? undefined;

    // 4) Create the chat in chats
    const chatId = await ctx.db.insert("chats", {
      organizationId: args.organizationId,

      createdByMemberId,
      createdByUserId: user.subject,

      primaryAgentMemberId: args.primaryAgentMemberId ?? createdByMemberId,

      sourceType: args.sourceType,
      sourceChannel: args.sourceChannel,
      externalChatId: undefined, // Can be filled later if it was an actual integration
      customerIdentifier: args.customerIdentifier,

      title: args.title,
      language: chatLanguage,

      startedAt,
      endedAt,
      createdAt: now,

      // For chats imported from WhatsApp for example, it's usually "closed"
      status: args.sourceType === "integration" ? "open" : "closed",

      messageCount,
      lastMessageAt,
    });

    // 5) Save each message in chatMessages
    for (const msg of args.messages) {
      await ctx.db.insert("chatMessages", {
        chatId,
        senderType: msg.senderType,
        // Initially: link all agent messages to the same member who created the chat
        senderMemberId:
          msg.senderType === "agent" ? createdByMemberId : undefined,
        senderName: msg.senderName,

        textRaw: msg.textRaw,
        textClean: msg.textClean,
        messageType: "text",

        externalMessageId: msg.externalMessageId,
        externalTimestamp: msg.externalTimestamp,
        internalTimestamp: msg.internalTimestamp,

        language: msg.language,

        // Currently we don't calculate toxicity/profanity → it's undefined
        // toxicityScore: undefined,
        // containsBannedContent: undefined,
        // containsProfanity: undefined,
        // profanityCategory: undefined,

        rawPayload: msg.metadata ?? undefined,
      });
    }

    return { chatId };
  },
});

export const getChatWithMessages = query({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    // 1) Get the chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      return null;
    }

    // 2) Verify membership
    await requireOrgMembership(ctx, chat.organizationId);

    // 3) Get messages
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_chat_timestamp", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();

    // 4) Return
    return {
      chat,
      messages,
    };
  },
});

export const listForDashboard = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // التأكد أن المستخدم الحالي عضو في هذه المنظمة
    await requireOrgMembership(ctx, args.organizationId);

    const limit = args.limit ?? 50;

    // جلب آخر المحادثات حسب آخر رسالة
    const chats = await ctx.db
      .query("chats")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(limit);

    return chats;
  },
});

export const getLatestAnalysis = query({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    // 1) Get the chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      return null;
    }

    // 2) Verify user is member of the organization
    await requireOrgMembership(ctx, chat.organizationId);

    // 3) Get the latest analysis for this chat
    const analyses = await ctx.db
      .query("chatAnalyses")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("desc")
      .take(1);

    return analyses.length > 0 ? analyses[0] : null;
  },
});
