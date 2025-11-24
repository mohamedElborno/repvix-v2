import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireOrgMembership, requireUser } from "./auth";
import { Id } from "./_generated/dataModel";

/**
 * Get current user's organization membership
 */
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    // Find the user's organization membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("clerkUserId", user.subject))
      .first();

    if (!membership) {
      return null;
    }

    // Get the organization details
    const org = await ctx.db.get(membership.organizationId);

    return {
      orgId: membership.organizationId,
      role: membership.role,
      organization: org,
    };
  },
});

/**
 * Add a member from an invitation
 */
export const addMemberFromInvite = mutation({
  args: {
    organizationId: v.id("organizations"),
    clerkUserId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Security check: Ensure the current user is an owner or admin of the organization.
    // If not, an "Insufficient permissions" error will be thrown.
    await requireAdmin(ctx, args.organizationId);

    // 2. Add the member
    await ctx.db.insert("organizationMembers", {
      organizationId: args.organizationId,
      clerkUserId: args.clerkUserId,
      name: args.name,
      email: args.email,
      imageUrl: args.imageUrl,
      role: args.role as "owner" | "admin" | "member",
      joinedAt: Date.now(),
    });
  },
});

export const getOrganizationMemberById = query({
  args: {
    memberId: v.id("organizationMembers"), // 🚨 يجب أن يكون هذا ID Convex
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. 🛡️ التحقق من الصلاحيات: تأكد أن المستخدم ينتمي إلى المنظمة المحددة
    await requireOrgMembership(ctx, args.organizationId as Id<"organizations">);

    // 2. جلب بيانات العضوية
    const organizationMember = await ctx.db.get(args.memberId);

    // 3. التحقق من وجود العضو وانتمائه للمنظمة الصحيحة
    if (
      !organizationMember ||
      organizationMember.organizationId !==
        (
          await ctx.db
            .query("organizations")
            .withIndex("by_clerkOrgId", (q) =>
              q.eq("clerkOrgId", args.organizationId)
            )
            .first()
        )?._id
    ) {
      return null; // لا يوجد عضو أو لا ينتمي للمنظمة
    }

    // 🚨 الآن، نُعيد بيانات العضو ومُعرّف Clerk الخاص به
    return {
      organizationMember,
      clerkUserId: organizationMember.clerkUserId,
    };
  },
});
