import { internalQuery, internalMutation as securedMutation, internalAction as securedAction } from "./_generated/server";
// convex/zendeskAudit.ts
// Audit logging and security monitoring for Zendesk subscriptions

import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

export type AuditSeverity = "info" | "warning" | "error" | "critical";
export type AuditEventType =
  | "subscription_created"
  | "subscription_updated"
  | "subscription_cancelled"
  | "hijacking_attempt"
  | "invalid_subdomain"
  | "invalid_variant"
  | "rate_limit_exceeded"
  | "webhook_processed"
  | "plan_upgraded"
  | "plan_downgraded";

/**
 * Log an audit event
 */
export const logEvent = internalMutation({
  args: {
    zendeskAccountKey: v.optional(v.string()),
    lemonSubscriptionId: v.optional(v.string()),
    eventType: v.string(),
    action: v.string(),
    details: v.optional(v.string()),
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("error"),
      v.literal("critical")
    ),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("zendeskAuditLogs", {
      zendeskAccountKey: args.zendeskAccountKey,
      lemonSubscriptionId: args.lemonSubscriptionId,
      eventType: args.eventType,
      action: args.action,
      details: args.details,
      severity: args.severity,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get audit logs for a Zendesk account
 */
export const getAuditLogs = internalQuery({
  args: {
    zendeskAccountKey: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { zendeskAccountKey, limit = 50 }) => {
    const logs = await ctx.db
      .query("zendeskAuditLogs")
      .withIndex("by_zendeskAccountKey", (q) =>
        q.eq("zendeskAccountKey", zendeskAccountKey)
      )
      .order("desc")
      .take(limit);

    return logs.map((log) => ({
      _id: log._id,
      eventType: log.eventType,
      action: log.action,
      details: log.details ? JSON.parse(log.details) : null,
      severity: log.severity,
      createdAt: log.createdAt,
    }));
  },
});

/**
 * Get critical security events (hijacking attempts, etc.)
 */
export const getCriticalEvents = internalQuery({
  args: {
    since: v.optional(v.number()), // timestamp in ms
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { since, limit = 100 }) => {
    const sinceTime = since ?? Date.now() - 24 * 60 * 60 * 1000; // last 24 hours

    const logs = await ctx.db
      .query("zendeskAuditLogs")
      .withIndex("by_severity", (q) => q.eq("severity", "critical"))
      .filter((q) => q.gte(q.field("createdAt"), sinceTime))
      .order("desc")
      .take(limit);

    return logs.map((log) => ({
      _id: log._id,
      zendeskAccountKey: log.zendeskAccountKey,
      lemonSubscriptionId: log.lemonSubscriptionId,
      eventType: log.eventType,
      action: log.action,
      details: log.details ? JSON.parse(log.details) : null,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt,
    }));
  },
});

