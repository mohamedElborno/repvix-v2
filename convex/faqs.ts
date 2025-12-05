// convex/faqs.ts
import {
  action,
  internalMutation,
  query,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { limitsForTier, type PlanTier } from "./billingPlan";
import { getOpenAiClient, CHAT_ANALYSIS_MODEL } from "../lib/openai/client";

const SUPPORTED_LANGUAGE = v.union(
  v.literal("ar"),
  v.literal("en"),
  v.literal("tr"),
  v.literal("fr"),
  v.literal("es"),
  v.literal("hi"),
  v.literal("ja")
);

export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("clerkUserId"), user.subject))
      .first();
    if (!membership) throw new Error("Not a member of this organization");

    const faqs = await ctx.db
      .query("globalFaqs")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();

    return faqs;
  },
});

// Lightweight metadata query for actions (cannot access db directly)
export const listMeta = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("globalFaqs")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();
  },
});

export const replaceFaqs = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    faqs: v.array(
      v.object({
        question: v.string(),
        answer: v.optional(v.string()),
        confidence: v.optional(v.number()),
        source: v.optional(v.string()),
        frequency: v.optional(v.number()),
        relevanceScore: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { organizationId, faqs }) => {
    const existing = await ctx.db
      .query("globalFaqs")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();

    for (const item of existing) {
      await ctx.db.delete(item._id);
    }

    const now = Date.now();
    for (const faq of faqs) {
      await ctx.db.insert("globalFaqs", {
        organizationId,
        analysisId: undefined,
        question: faq.question,
        answer: faq.answer,
        confidence: faq.confidence,
        source: faq.source,
        frequency: faq.frequency ?? 0,
        relevanceScore: faq.relevanceScore ?? 0,
        lastSeen: now,
        createdAt: now,
      });
    }

    return faqs.length;
  },
});

export const generateFaqs = action({
  args: {
    organizationId: v.id("organizations"),
    language: SUPPORTED_LANGUAGE,
  },
  handler: async (ctx, { organizationId, language }) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const role = await ctx.runQuery(api.billing.getViewerRole, {
      organizationId,
      clerkUserId: user.subject,
    });
    if (!role) throw new Error("Not a member of this organization");
    if (role !== "admin") throw new Error("Insufficient permissions");

    const currentPlan = await ctx.runQuery(api.billing.getCurrentPlan, {
      organizationId,
    });
    const tier = (currentPlan?.planTier ?? "basic") as PlanTier;
    const { features } = limitsForTier(tier);

    if (!features.autoFaqs) {
      throw new Error("FAQ generation is not included in your plan");
    }

    // Rate limit by plan: starter => once per 7 days, others => once per 1 day
    const now = Date.now();
    const windowMs =
      tier === "starter" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const existingFaqs = await ctx.runQuery(internal.faqs.listMeta, {
      organizationId,
    });

    const lastGeneratedAt =
      existingFaqs.reduce<number | undefined>((acc: number | undefined, f) => {
        if (f.lastSeen && (acc === undefined || f.lastSeen > acc))
          return f.lastSeen;
        return acc;
      }, undefined) ?? undefined;

    if (lastGeneratedAt && now - lastGeneratedAt < windowMs) {
      const remainingMs = windowMs - (now - lastGeneratedAt);
      const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
      const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
      if (tier === "starter") {
        return {
          ok: false,
          code: "FAQ_RATE_LIMIT_STARTER",
          remainingDays,
          remainingHours,
        };
      } else {
        return {
          ok: false,
          code: "FAQ_RATE_LIMIT_PRO",
          remainingHours,
        };
      }
    }

    const { meta, stats } = await ctx.runQuery(
      api.globalAnalysis.prepareGlobalAnalysisStats,
      { organizationId }
    );

    if (meta.totalChats === 0) {
      throw new Error("No chat analyses available for this organization.");
    }

    const client = getOpenAiClient();
    const systemPrompt =
      'You generate concise FAQs from aggregated chat insights. Respond ONLY with valid JSON matching the schema: {"faqs":[{"question":"","answer":"","confidence":0.9,"frequency":1,"relevanceScore":0.9}]}';

    const userPrompt = `
Language: ${language}
Organization stats (aggregated, do not invent data):
${JSON.stringify(stats, null, 2)}

Instructions:
- Produce up to 8 FAQs that directly reflect recurring user questions or pain points.
- Keep questions short, answers concise and actionable.
- Avoid placeholders; omit answer if unknown.
- Preserve language tone for ${language}.
- Include optional fields confidence (0-1), frequency (integer), relevanceScore (0-1).
`;

    const completion = await client.chat.completions.create({
      model: CHAT_ANALYSIS_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { faqs?: Array<any> };
    try {
      parsed = JSON.parse(rawContent);
    } catch (err) {
      console.error("Invalid FAQ JSON:", rawContent);
      throw new Error("AI output is not valid JSON");
    }

    const faqs = Array.isArray(parsed.faqs) ? parsed.faqs : [];

    if (faqs.length === 0) {
      throw new Error("No FAQs generated from the provided data");
    }

    // Normalize entries
    const sanitizedFaqs = faqs.slice(0, 8).map((f) => ({
      question: String(f.question ?? "").trim(),
      answer:
        f.answer && String(f.answer).trim().length > 0
          ? String(f.answer).trim()
          : undefined,
      confidence:
        typeof f.confidence === "number"
          ? Math.max(0, Math.min(1, f.confidence))
          : undefined,
      source: f.source ? String(f.source) : undefined,
      frequency:
        typeof f.frequency === "number" && f.frequency > 0
          ? Math.floor(f.frequency)
          : 1,
      relevanceScore:
        typeof f.relevanceScore === "number"
          ? Math.max(0, Math.min(1, f.relevanceScore))
          : undefined,
    }));

    await ctx.runMutation(internal.faqs.replaceFaqs, {
      organizationId,
      faqs: sanitizedFaqs,
    });

    return { ok: true, count: sanitizedFaqs.length };
  },
});
