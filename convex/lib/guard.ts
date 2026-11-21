// convex/lib/guard.ts
import { Id } from "../_generated/dataModel";
import { QueryCtx, MutationCtx } from "../_generated/server";

export async function assertOrgRole(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
  clerkUserId: string,
  allowed: Array<"admin" | "member">
) {
  const caller = await ctx.auth.getUserIdentity();
  if (!caller || caller.subject !== clerkUserId) throw new Error("Unauthorized");
  const member = await ctx.db
    .query("organizationMembers")
    .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
    .filter((q) => q.eq(q.field("clerkUserId"), clerkUserId))
    .first();

  if (!member || !allowed.includes(member.role)) {
    throw new Error("FORBIDDEN");
  }
  return member.role;
}
