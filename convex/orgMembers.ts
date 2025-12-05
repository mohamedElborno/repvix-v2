// convex/orgMembers.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOrgMembership, requireUser } from "./auth";
import { limitsForTier } from "./billingPlan";
import { Id } from "./_generated/dataModel";

/**
 * Get one member by Convex Id with strict org-boundary checks
 */
export const getOrganizationMemberById = query({
  args: {
    memberId: v.id("organizationMembers"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const organizationMember = await ctx.db.get(args.memberId);
    if (!organizationMember) {
      throw new Error("Member not found.");
    }

    const orgId = organizationMember.organizationId;

    // Current user must belong to this org
    await requireOrgMembership(ctx, orgId);

    // Find current user's membership in this org
    const userMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("clerkUserId", user.subject))
      .filter((q) => q.eq(q.field("organizationId"), orgId))
      .first();

    if (!userMembership) {
      throw new Error("Unauthorized.");
    }

    const isAdmin = userMembership.role === "admin";
    const isSelf = organizationMember.clerkUserId === user.subject;

    if (!isAdmin && !isSelf) {
      throw new Error("Unauthorized: insufficient permissions.");
    }

    return {
      organizationMember,
      clerkUserId: organizationMember.clerkUserId,
    };
  },
});

export const updateMemberInfo = mutation({
  args: {
    memberId: v.id("organizationMembers"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("member"))),
  },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.memberId);
    if (!target) throw new Error("Member not found.");

    const orgId = target.organizationId;

    const caller = await ctx.auth.getUserIdentity();
    if (!caller) throw new Error("Unauthorized.");

    const callerMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("clerkUserId", caller.subject))
      .filter((q) => q.eq(q.field("organizationId"), orgId))
      .first();

    if (!callerMembership) {
      throw new Error("Unauthorized: Not part of this organization.");
    }

    const callerRole = callerMembership.role;
    const isCallerAdmin = callerRole === "admin";
    const isSelf = caller.subject === target.clerkUserId;

    if (args.role !== undefined && args.role !== target.role) {
      if (!isCallerAdmin) {
        throw new Error("Only admins can change member roles.");
      }
    }

    if (!isSelf && !isCallerAdmin) {
      throw new Error("Insufficient permissions to update another member.");
    }

    const updates: {
      name?: string;
      email?: string;
      role?: "admin" | "member";
    } = {};

    if (args.name !== undefined) updates.name = args.name || undefined;
    if (args.email !== undefined) updates.email = args.email || undefined;
    if (args.role !== undefined) updates.role = args.role;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.memberId, updates);
    }

    return true;
  },
});

export const isMember = query({
  args: {
    organizationId: v.id("organizations"),
    clerkUserId: v.string(),
  },
  handler: async (ctx, { organizationId, clerkUserId }) => {
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
      .filter((q) => q.eq(q.field("organizationId"), organizationId))
      .first();
    return membership ? { role: membership.role, _id: membership._id } : null;
  },
});

export const getMemberLimitStatus = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    const org = await ctx.db.get(organizationId);
    if (!org) {
      return {
        allowed: false,
        limit: 0,
        remaining: 0,
        count: 0,
      };
    }

    const limit =
      org.limits?.members !== undefined
        ? org.limits.members
        : limitsForTier((org.planTier as any) || "basic").members;

    const count = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
      .collect()
      .then((arr: any[]) => arr.length);

    const remaining =
      limit === undefined || limit === "unlimited"
        ? undefined
        : Math.max(0, Number(limit) - count);

    const allowed =
      limit === undefined || limit === "unlimited" ? true : count < Number(limit);

    return { allowed, limit, remaining, count };
  },
});

export const addMemberFromInvite = mutation({
  args: {
    organizationId: v.id("organizations"),
    clerkUserId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    // Only admins of the org can add members via this endpoint
    const callerMembership = await requireOrgMembership(ctx, args.organizationId);
    if (callerMembership.role !== "admin") {
      throw new Error("Insufficient permissions");
    }

    const existing = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .first();

    if (existing) {
      // فقط نعمل تحديث لو تغير الدور أو الصورة
      const needsUpdate =
        existing.role !== args.role ||
        existing.imageUrl !== args.imageUrl ||
        existing.email !== args.email ||
        existing.name !== args.name;

      if (needsUpdate) {
        await ctx.db.patch(existing._id, {
          role: args.role,
          name: args.name || existing.name,
          email: args.email || existing.email,
          imageUrl: args.imageUrl || existing.imageUrl,
        });
      }

      return existing._id;
    }

    // عضو جديد - تحقق من حدود الخطة لعدد الأعضاء
    await assertMemberCapacity(ctx, args.organizationId, 1);

    const id = await ctx.db.insert("organizationMembers", {
      organizationId: args.organizationId,
      clerkUserId: args.clerkUserId,
      name: args.name || undefined,
      email: args.email || undefined,
      imageUrl: args.imageUrl || undefined,
      role: args.role,
      joinedAt: Date.now(),
    });

    return id;
  },
});

async function assertMemberCapacity(
  ctx: any,
  organizationId: Id<"organizations">,
  incoming: number
) {
  const org = await ctx.db.get(organizationId);
  if (!org) throw new Error("Organization not found");

  const memberLimit =
    org.limits?.members !== undefined
      ? org.limits.members
      : limitsForTier((org.planTier as any) || "basic").members;

  if (memberLimit === undefined || memberLimit === "unlimited") return;

  const currentCount = await ctx.db
    .query("organizationMembers")
    .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
    .collect()
    .then((arr: any[]) => arr.length);

  if (currentCount + incoming > memberLimit) {
    throw new Error("Member limit reached for your current plan.");
  }
}
