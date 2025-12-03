// convex/auth.ts

import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const user = await ctx.auth.getUserIdentity();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireOrgMembership(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<"organizations">
) {
  const user = await requireUser(ctx);

  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user", (q) => q.eq("clerkUserId", user.subject))
    .filter((q) => q.eq(q.field("organizationId"), orgId))
    .first();

  if (!membership) throw new Error("Not a member of this organization");

  return membership;
}

export async function requireAdmin(
  ctx: MutationCtx,
  orgId: Id<"organizations">
) {
  const m = await requireOrgMembership(ctx, orgId);
  if (m.role !== "admin") {
    throw new Error("Insufficient permissions");
  }
  return m;
}
