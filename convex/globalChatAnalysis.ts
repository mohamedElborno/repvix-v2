// convex/globalChatAnalysis.ts

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { requireUser } from "./auth";
import { getOpenAiClient, CHAT_ANALYSIS_MODEL } from "../lib/openai/client";
import { getGlobalAnalysisSystemPrompt } from "@/lib/ai/prompts/globalAnalysisPrompt";
import { Id } from "./_generated/dataModel";

export const runFullGlobalAnalysis = action({
  args: {
    organizationId: v.id("organizations"),
    language: v.union(
      v.literal("ar"),
      v.literal("en"),
      v.literal("tr"),
      v.literal("fr"),
      v.literal("es"),
      v.literal("hi"),
      v.literal("ja")
    ),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    ok: boolean;
    code?: string;
    remainingHours?: number;
    analysisId?: Id<"globalAnalyses">;
    processingTimeMs?: number;
    tokenInputCount?: number | undefined;
    tokenOutputCount?: number | undefined;
  }> => {
    const user = await requireUser(ctx as any);

    const membership = await ctx.runQuery(api.orgMembers.isMember, {
      organizationId: args.organizationId,
      clerkUserId: user.subject,
    });
    if (!membership) {
      return {
        ok: false,
        code: "NOT_ORG_MEMBER",
      };
    }

    // Rate limit: one global analysis per org every 3 days (72h window)
    const latest = await ctx.runQuery(api.globalAnalysis.getLatestByOrg, {
      organizationId: args.organizationId,
    });
    const lastCreatedAt = latest?.analysis?.createdAt;
    if (lastCreatedAt) {
      const now = Date.now();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      if (now - lastCreatedAt < threeDaysMs) {
        const remainingMs = threeDaysMs - (now - lastCreatedAt);
        const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
        return {
          ok: false,
          code: "RATE_LIMIT_GLOBAL_ANALYSIS",
          remainingHours,
        };
      }
    }

    const res = await ctx.runAction(
      internal.globalChatAnalysis.analyzeGlobalChats,
      {
        organizationId: args.organizationId,
        analysisLanguage: args.language,
      }
    );
    return { ok: true, ...res };
  },
});

export const analyzeGlobalChats = internalAction({
  args: {
    organizationId: v.id("organizations"),
    analysisLanguage: v.union(
      v.literal("ar"),
      v.literal("en"),
      v.literal("tr"),
      v.literal("fr"),
      v.literal("es"),
      v.literal("hi"),
      v.literal("ja")
    ),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    analysisId: Id<"globalAnalyses">;
    processingTimeMs: number;
    tokenInputCount: number | undefined;
    tokenOutputCount: number | undefined;
  }> => {
    const { organizationId, analysisLanguage, from, to } = args;

    // 1) جلب الإحصاءات rule-based فقط
    const { meta, stats } = await ctx.runQuery(
      api.globalAnalysis.prepareGlobalAnalysisStats,
      { organizationId, from, to }
    );

    if (meta.totalChats === 0) {
      throw new Error("No chat analyses available for this organization.");
    }

    // 2) بناء input لإرساله لـ GPT
    const aiInput = {
      version: "global_chat_analysis_v1",
      organizationId,
      analysisLanguage,
      timeRange: { from, to },
      stats,
    };

    // 3) تشغيل GPT-5 Mini
    const client = getOpenAiClient();
    const systemPrompt = getGlobalAnalysisSystemPrompt(analysisLanguage);

    const startedAt = Date.now();

    const completion = await client.chat.completions.create({
      model: CHAT_ANALYSIS_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(aiInput) },
      ],
    });

    const finishedAt = Date.now();
    const processingTimeMs = finishedAt - startedAt;

    const rawContent = completion.choices[0]?.message?.content ?? "{}";

    let aiOutput;
    try {
      aiOutput = JSON.parse(rawContent);
    } catch (err) {
      console.error("Invalid global AI JSON:", rawContent);
      throw new Error("AI global output is not valid JSON");
    }

    const tokenInputCount = completion.usage?.prompt_tokens ?? undefined;
    const tokenOutputCount = completion.usage?.completion_tokens ?? undefined;

    // 4) تخزين النتيجة
    const analysisId = await ctx.runMutation(
      internal.globalAnalysis.storeGlobalAnalysis,
      {
        organizationId,
        analysisLanguage,
        aiOutput,
        processingTimeMs,
        tokenInputCount,
        tokenOutputCount,
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
