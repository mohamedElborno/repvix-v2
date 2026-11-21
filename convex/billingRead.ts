// convex/billing.read.ts
import { v } from "convex/values";
import { query } from "./_generated/server";
import { assertOrgRole } from "./lib/guard";

export const listInvoices = query({
  args: {
    organizationId: v.id("organizations"),
    clerkUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, clerkUserId, limit }) => {
    await assertOrgRole(ctx, organizationId, clerkUserId, ["admin"]);

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .take(limit ?? 50);

    return invoices;
  },
});
