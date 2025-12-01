// convex/globalChatAnalysis.ts

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
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
      v.literal("hi")
    ),
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
    return await ctx.runAction(internal.globalChatAnalysis.analyzeGlobalChats, {
      organizationId: args.organizationId,
      analysisLanguage: args.language,
    });
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
      v.literal("hi")
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
