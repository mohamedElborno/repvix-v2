// convex/webhookRateLimit.ts
// Rate limiting for webhook endpoints

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute (for webhooks)

/**
 * Check and update rate limit for a webhook identifier
 * Returns true if request should be allowed, false if rate limited
 */
export const checkRateLimit = internalMutation({
  args: {
    identifier: v.string(), // IP address or webhook ID or "analyze:subdomain"
    maxRequests: v.optional(v.number()), // Optional custom limit
  },
  handler: async (ctx, { identifier, maxRequests }) => {
    const now = Date.now();
    const windowStart =
      Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;

    // Determine limit based on custom limit or default
    const limit = maxRequests ?? MAX_REQUESTS_PER_WINDOW;

    // Find existing rate limit record
    const existing = await ctx.db
      .query("webhookRateLimits")
      .withIndex("by_identifier", (q) => q.eq("identifier", identifier))
      .first();

    if (existing) {
      // Check if we're in a new time window
      if (existing.windowStart < windowStart) {
        // Reset counter for new window
        await ctx.db.patch(existing._id, {
          count: 1,
          windowStart,
          lastRequestAt: now,
        });
        return true;
      }

      // Check if limit exceeded
      if (existing.count >= limit) {
        await ctx.db.patch(existing._id, {
          lastRequestAt: now,
        });
        return false;
      }

      // Increment counter
      await ctx.db.patch(existing._id, {
        count: existing.count + 1,
        lastRequestAt: now,
      });
      return true;
    }

    // Create new rate limit record
    await ctx.db.insert("webhookRateLimits", {
      identifier,
      count: 1,
      windowStart,
      lastRequestAt: now,
    });
    return true;
  },
});

/**
 * Clean up old rate limit records (older than 1 hour)
 */
export const cleanupOldRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    const oldRecords = await ctx.db
      .query("webhookRateLimits")
      .withIndex("by_windowStart", (q) => q.lt("windowStart", oneHourAgo))
      .collect();

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    return { deleted: oldRecords.length };
  },
});
