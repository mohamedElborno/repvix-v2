// convex/lib/guard.ts
import { Id } from "../_generated/dataModel";
import { DatabaseReader } from "../_generated/server";

export async function assertOrgRole(
  db: DatabaseReader,
  organizationId: Id<"organizations">,
  clerkUserId: string,
  allowed: Array<"admin" | "member">
) {
  const member = await db
    .query("organizationMembers")
    .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
    .filter((q) => q.eq(q.field("clerkUserId"), clerkUserId))
    .first();

  if (!member || !allowed.includes(member.role)) {
    throw new Error("FORBIDDEN");
  }
  return member.role;
}
