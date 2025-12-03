// convex/chats.ts

import { v } from "convex/values";
import {
  mutation,
  query,
  action,
  internalAction,
  internalMutation,
} from "./_generated/server";
import { requireUser, requireOrgMembership } from "./auth";
import { generateEmbedding } from "@/lib/openai/embeddings";
import { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";

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
    const messageIds: Id<"chatMessages">[] = [];
    for (const msg of args.messages) {
      const messageId = await ctx.db.insert("chatMessages", {
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
      messageIds.push(messageId);
    }

    // 6) Schedule action to generate embeddings asynchronously
    // This is done in background to avoid blocking the mutation
    await ctx.scheduler.runAfter(
      0,
      internal.chats.generateEmbeddingsForMessages,
      {
        chatId,
        messageIds: messageIds.map((id, index) => ({
          messageId: id,
          textClean: args.messages[index].textClean,
        })),
      }
    );

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
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
      id: v.optional(v.number()), // Added by usePaginatedQuery automatically
    }),
  },
  handler: async (ctx, args) => {
    try {
      // التأكد أن المستخدم الحالي عضو في هذه المنظمة
      await requireOrgMembership(ctx, args.organizationId);
    } catch (error) {
      // If unauthorized, return empty pagination result instead of throwing
      console.warn("Unauthorized access to chats:", error);
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    // جلب آخر المحادثات حسب آخر رسالة مع pagination
    const result = await ctx.db
      .query("chats")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .paginate(args.paginationOpts);

    return result;
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

export const getFirstTwoMessages = query({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    try {
      // 1) Get the chat
      const chat = await ctx.db.get(args.chatId);
      if (!chat) {
        return null;
      }

      // 2) Verify membership - catch error and return null instead of throwing
      try {
        await requireOrgMembership(ctx, chat.organizationId);
      } catch (error) {
        // If unauthorized, return null instead of throwing
        console.warn("Unauthorized access to messages:", error);
        return null;
      }

      // 3) Get first 2 messages
      const messages = await ctx.db
        .query("chatMessages")
        .withIndex("by_chat_timestamp", (q) => q.eq("chatId", args.chatId))
        .order("asc")
        .take(2);

      return messages;
    } catch (error) {
      // Catch any other errors and return null
      console.error("Error fetching first two messages:", error);
      return null;
    }
  },
});

export const getAllMessagesForMultipleChats = query({
  args: {
    chatIds: v.array(v.id("chats")),
  },
  handler: async (ctx, args) => {
    if (args.chatIds.length === 0) {
      return {};
    }

    try {
      // Get first chat to verify membership
      const firstChat = await ctx.db.get(args.chatIds[0]);
      if (!firstChat) {
        return {};
      }

      // Verify membership - catch error and return empty object instead of throwing
      try {
        await requireOrgMembership(ctx, firstChat.organizationId);
      } catch (error) {
        // If unauthorized, return empty object instead of throwing
        console.warn("Unauthorized access to messages:", error);
        return {};
      }

      // Get all messages for each chat
      const messagesMap: Record<string, any[]> = {};

      for (const chatId of args.chatIds) {
        const messages = await ctx.db
          .query("chatMessages")
          .withIndex("by_chat_timestamp", (q) => q.eq("chatId", chatId))
          .order("asc")
          .collect();

        messagesMap[chatId] = messages;
      }

      return messagesMap;
    } catch (error) {
      // Catch any other errors and return empty object
      console.error("Error fetching messages:", error);
      return {};
    }
  },
});

// =============================
// Types for semantic search
// =============================
type MessageEmbedding = {
  messageId: Id<"chatMessages">;
  embedding: number[];
  text: string;
};

type SearchResult = {
  messageId: Id<"chatMessages">;
  text: string;
  score: number;
};

// =============================
// Helper functions for semantic search
// =============================
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Search embeddings using cosine similarity
 * @param queryEmbedding - The embedding vector for the search query
 * @param embeddings - Array of message embeddings to search through
 * @param threshold - Minimum similarity score (default: 0.5)
 * @param topK - Maximum number of results to return
 * @returns Array of search results sorted by score (descending)
 */
function searchEmbeddings(
  queryEmbedding: number[],
  embeddings: MessageEmbedding[],
  threshold: number = 0.5,
  topK: number = 10
): SearchResult[] {
  return embeddings
    .map((row) => ({
      messageId: row.messageId,
      text: row.text,
      score: cosineSimilarity(queryEmbedding, row.embedding),
    }))
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export const semanticSearch = action({
  args: {
    chatId: v.id("chats"),
    queryText: v.string(),
    topK: v.optional(v.number()),
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SearchResult[]> => {
    // Verify membership and get chat
    const chat = await ctx.runQuery(api.chats.getChatWithMessages, {
      chatId: args.chatId,
    });
    if (!chat) throw new Error("Chat not found");

    // Generate query embedding and get message embeddings
    const [queryEmbedding, embeddings]: [number[], MessageEmbedding[]] =
      await Promise.all([
        generateEmbedding(args.queryText),
        ctx.runQuery(api.chats.getMessageEmbeddingsForChat, {
          chatId: args.chatId,
        }),
      ]);

    // Search and return results
    return searchEmbeddings(
      queryEmbedding,
      embeddings,
      args.threshold ?? 0.5,
      args.topK ?? 10
    );
  },
});

export const semanticSearchAcrossChats = action({
  args: {
    organizationId: v.id("organizations"),
    queryText: v.string(),
    chatIds: v.optional(v.array(v.id("chats"))),
    threshold: v.optional(v.number()),
    topK: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const threshold = args.threshold ?? 0.5;
    const topK = args.topK ?? 5;

    // Verify membership
    await ctx.runQuery(api.chats.verifyOrgMembership, {
      organizationId: args.organizationId,
    });

    // Get chat IDs to search
    const chatIdsToSearch: Id<"chats">[] =
      args.chatIds && args.chatIds.length > 0
        ? args.chatIds
        : (
            await ctx.runQuery(api.chats.getChatsByOrg, {
              organizationId: args.organizationId,
            })
          ).map((chat: { _id: Id<"chats"> }) => chat._id);

    // Generate query embedding and get all embeddings in parallel
    const [queryEmbedding, allEmbeddings]: [
      number[],
      Record<string, MessageEmbedding[]>,
    ] = await Promise.all([
      generateEmbedding(args.queryText),
      ctx.runQuery(api.chats.getMessageEmbeddingsForChats, {
        chatIds: chatIdsToSearch,
      }),
    ]);

    // Search across all chats
    const results: Record<string, SearchResult[]> = {};
    for (const [chatId, embeddings] of Object.entries(allEmbeddings)) {
      const scored = searchEmbeddings(
        queryEmbedding,
        embeddings,
        threshold,
        topK
      );
      if (scored.length > 0) results[chatId] = scored;
    }

    return results;
  },
});

// Helper query to verify organization membership
export const verifyOrgMembership = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgMembership(ctx, args.organizationId);
    return true;
  },
});

// Helper query to get chats by organization
export const getChatsByOrg = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgMembership(ctx, args.organizationId);
    const chats = await ctx.db
      .query("chats")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    return chats;
  },
});

// Helper query to get message embeddings for a single chat
export const getMessageEmbeddingsForChat = query({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args): Promise<MessageEmbedding[]> => {
    const chat = await ctx.db.get(args.chatId);
    if (!chat) return [];

    await requireOrgMembership(ctx, chat.organizationId);

    const embeddings = await ctx.db
      .query("messageEmbeddings")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();

    return embeddings.map((row) => ({
      messageId: row.messageId,
      embedding: row.embedding,
      text: row.text,
    }));
  },
});

// Helper query to get message embeddings for multiple chats
export const getMessageEmbeddingsForChats = query({
  args: {
    chatIds: v.array(v.id("chats")),
  },
  handler: async (ctx, args): Promise<Record<string, MessageEmbedding[]>> => {
    if (args.chatIds.length === 0) return {};

    const firstChat = await ctx.db.get(args.chatIds[0]);
    if (!firstChat) return {};

    await requireOrgMembership(ctx, firstChat.organizationId);

    const embeddingsMap: Record<string, MessageEmbedding[]> = {};
    for (const chatId of args.chatIds) {
      const embeddings = await ctx.db
        .query("messageEmbeddings")
        .withIndex("by_chat", (q) => q.eq("chatId", chatId))
        .collect();

      embeddingsMap[chatId] = embeddings.map((row) => ({
        messageId: row.messageId,
        embedding: row.embedding,
        text: row.text,
      }));
    }

    return embeddingsMap;
  },
});

// Internal action to generate embeddings for messages (called asynchronously)
export const generateEmbeddingsForMessages = internalAction({
  args: {
    chatId: v.id("chats"),
    messageIds: v.array(
      v.object({
        messageId: v.id("chatMessages"),
        textClean: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Generate embeddings for all messages
    for (const { messageId, textClean } of args.messageIds) {
      try {
        // Generate embedding
        const embedding = await generateEmbedding(textClean);

        // Save embedding via internal mutation
        await ctx.runMutation(internal.chats.insertMessageEmbedding, {
          chatId: args.chatId,
          messageId,
          embedding,
          text: textClean,
        });
      } catch (error) {
        // Log error but continue with other messages
        console.error(
          `Failed to generate embedding for message ${messageId}:`,
          error
        );
      }
    }
  },
});

// Internal mutation to insert message embedding
export const insertMessageEmbedding = internalMutation({
  args: {
    chatId: v.id("chats"),
    messageId: v.id("chatMessages"),
    embedding: v.array(v.number()),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messageEmbeddings", {
      chatId: args.chatId,
      messageId: args.messageId,
      embedding: args.embedding,
      text: args.text,
    });
  },
});
