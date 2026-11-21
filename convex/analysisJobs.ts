import { internalQuery, internalMutation as securedMutation, internalAction as securedAction } from "./_generated/server";
import {
  mutation,
  query,
  internalAction,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

/**
 * Create or update an analysis job
 */
export const upsert = securedMutation({
  args: {
    zendeskAccountKey: v.string(),
    ticketId: v.number(),
    status: v.union(
      v.literal("idle"),
      v.literal("preparing"),
      v.literal("analyzing"),
      v.literal("generating"),
      v.literal("finalizing"),
      v.literal("done"),
      v.literal("error")
    ),
    progressMessage: v.string(),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if job already exists
    const existing = await ctx.db
      .query("analysisJobs")
      .withIndex("by_zendeskAccountKey_ticketId", (q) =>
        q
          .eq("zendeskAccountKey", args.zendeskAccountKey)
          .eq("ticketId", args.ticketId)
      )
      .first();

    if (existing) {
      // Update existing job
      await ctx.db.patch(existing._id, {
        status: args.status,
        progressMessage: args.progressMessage,
        updatedAt: now,
        result: args.result,
        error: args.error,
      });
      return existing._id;
    } else {
      // Create new job
      return await ctx.db.insert("analysisJobs", {
        zendeskAccountKey: args.zendeskAccountKey,
        ticketId: args.ticketId,
        status: args.status,
        progressMessage: args.progressMessage,
        startedAt: now,
        updatedAt: now,
        result: args.result,
        error: args.error,
      });
    }
  },
});

/**
 * Get analysis job by zendeskAccountKey and ticketId
 */
export const byTicket = internalQuery({
  args: {
    zendeskAccountKey: v.string(),
    ticketId: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("analysisJobs")
      .withIndex("by_zendeskAccountKey_ticketId", (q) =>
        q
          .eq("zendeskAccountKey", args.zendeskAccountKey)
          .eq("ticketId", args.ticketId)
      )
      .first();
  },
});

/**
 * Update job status and progress message
 */
export const updateStatus = securedMutation({
  args: {
    zendeskAccountKey: v.string(),
    ticketId: v.number(),
    status: v.union(
      v.literal("idle"),
      v.literal("preparing"),
      v.literal("analyzing"),
      v.literal("generating"),
      v.literal("finalizing"),
      v.literal("done"),
      v.literal("error")
    ),
    progressMessage: v.string(),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("analysisJobs")
      .withIndex("by_zendeskAccountKey_ticketId", (q) =>
        q
          .eq("zendeskAccountKey", args.zendeskAccountKey)
          .eq("ticketId", args.ticketId)
      )
      .first();

    if (!job) {
      throw new Error("Job not found");
    }

    await ctx.db.patch(job._id, {
      status: args.status,
      progressMessage: args.progressMessage,
      updatedAt: Date.now(),
      result: args.result,
      error: args.error,
    });

    return job._id;
  },
});

/**
 * Internal action to run the analysis asynchronously
 */
export const runAnalysis = internalAction({
  args: {
    zendeskAccountKey: v.string(),
    ticketId: v.number(),
    subject: v.string(),
    comments: v.array(
      v.object({
        author_id: v.number(),
        body: v.string(),
        created_at: v.string(),
        public: v.optional(v.boolean()),
        via: v.optional(
          v.object({
            source: v.optional(
              v.object({
                from: v.optional(
                  v.object({
                    address: v.optional(v.string()),
                  })
                ),
              })
            ),
          })
        ),
      })
    ),
    requesterId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { zendeskAccountKey, ticketId, subject, comments, requesterId } =
      args;
    const startTime = Date.now();
    const MAX_EXECUTION_TIME_MS = 5 * 60 * 1000; // 5 minutes timeout

    // Helper function to update job status
    const updateJob = async (
      status:
        | "preparing"
        | "analyzing"
        | "generating"
        | "finalizing"
        | "done"
        | "error",
      progressMessage: string,
      result?: any,
      error?: string
    ) => {
      try {
        await ctx.runMutation(internal.analysisJobs.upsert, {
          zendeskAccountKey,
          ticketId,
          status,
          progressMessage,
          result,
          error,
        });
      } catch (err) {
        console.error(
          `[Job Update Error] ${zendeskAccountKey}-${ticketId}:`,
          err
        );
      }
    };

    // Check timeout periodically
    const checkTimeout = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_EXECUTION_TIME_MS) {
        throw new Error("Analysis timeout - exceeded maximum execution time");
      }
    };

    try {
      // Update status: analyzing
      await updateJob("analyzing", "Analyzing conversation...");

      // Run analysis (this is the main AI processing step)
      checkTimeout();
      const analysisResult = await ctx.runAction(
        internal.zendeskStatelessAnalysis.zendeskSidebarAnalyze,
        {
          subject,
          comments,
          requesterId: requesterId ?? undefined,
        }
      );
      checkTimeout();

      // Extract analysis and token usage from result
      const analysis = analysisResult.analysis;
      const tokenInputCount = analysisResult.tokenInputCount;
      const tokenOutputCount = analysisResult.tokenOutputCount;

      // Get usage to calculate remaining
      const usage = await ctx.runMutation(internal.zendeskUsage.getOrInit, {
        zendeskAccountKey,
      });

      if (typeof usage === "string") {
        throw new Error("Failed to get usage");
      }

      // Increment usage (only after successful analysis)

      // Calculate remaining count
      const remaining = Math.max(0, usage.monthlyQuota - usage.usedThisMonth);

      // Mark job as done with result
      await updateJob("done", "Completed", {
        analysis,
        remaining,
        tokenInputCount,
        tokenOutputCount,
      });
    } catch (error: any) {
      await updateJob(
        "error",
        "Analysis failed",
        undefined,
        error?.message ?? "Analysis failed"
      );
      throw error;
    }
  },
});

/**
 * Clean up old completed/error jobs (older than 24 hours)
 */
export const cleanupOldJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    // Find old completed or error jobs
    // Note: We can't use q.or() with index, so we query each status separately
    const doneJobs = await ctx.db
      .query("analysisJobs")
      .withIndex("by_status", (q) => q.eq("status", "done"))
      .filter((q) => q.lt(q.field("updatedAt"), oneDayAgo))
      .collect();

    const errorJobs = await ctx.db
      .query("analysisJobs")
      .withIndex("by_status", (q) => q.eq("status", "error"))
      .filter((q) => q.lt(q.field("updatedAt"), oneDayAgo))
      .collect();

    const oldJobs = [...doneJobs, ...errorJobs];

    let deleted = 0;
    for (const job of oldJobs) {
      await ctx.db.delete(job._id);
      deleted++;
    }

    console.log(`[Cleanup] Deleted ${deleted} old analysis jobs`);
    return { deleted };
  },
});

export const reserve = internalMutation({
  args: { zendeskAccountKey: v.string(), ticketId: v.number() },
  handler: async (ctx, args) => {
    const usage = await ctx.db.query("zendeskUsage").withIndex("by_zendeskAccountKey", q => q.eq("zendeskAccountKey", args.zendeskAccountKey)).first();
    if (!usage || usage.usedThisMonth >= usage.monthlyQuota) return false;
    const job = await ctx.db.query("analysisJobs").withIndex("by_zendeskAccountKey_ticketId", q => q.eq("zendeskAccountKey", args.zendeskAccountKey).eq("ticketId", args.ticketId)).first();
    if (job && job.status !== "done" && job.status !== "error" && job.updatedAt > Date.now() - 600000) return false;
    await ctx.db.patch(usage._id, { usedThisMonth: usage.usedThisMonth + 1 });
    const fields = { ...args, status: "preparing" as const, progressMessage: "Queued", startedAt: Date.now(), updatedAt: Date.now() };
    if (job) await ctx.db.patch(job._id, { ...fields, result: undefined, error: undefined });
    else await ctx.db.insert("analysisJobs", fields);
    return true;
  },
});
