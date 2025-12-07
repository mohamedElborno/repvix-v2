import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgMembership, requireUser } from "./auth";

export const submitFeedback = mutation({
  args: {
    organizationId: v.optional(v.id("organizations")),
    message: v.string(),
    category: v.union(
      v.literal("bug"),
      v.literal("idea"),
      v.literal("praise"),
      v.literal("other")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    let organizationId = args.organizationId;

    if (organizationId) {
      await requireOrgMembership(ctx, organizationId);
    } else {
      // إذا لم يُرسل orgId من الواجهة نحاول إيجاد أول منظمة للمستخدم
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user", (q) => q.eq("clerkUserId", user.subject))
        .first();
      organizationId = membership?.organizationId;
    }

    if (!organizationId) {
      throw new Error("Organization is required to submit feedback");
    }

    const feedbackId = await ctx.db.insert("feedbacks", {
      organizationId,
      clerkUserId: user.subject,
      email: user.email ?? undefined,
      message: args.message,
      category: args.category,
      createdAt: Date.now(),
    });

    return { id: feedbackId };
  },
});
