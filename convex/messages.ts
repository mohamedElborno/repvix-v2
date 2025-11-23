import { query } from "./_generated/server";

export const getForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }
    return await ctx.db
      .query("organizationMembers")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.userId))
      .collect();
  },
});
