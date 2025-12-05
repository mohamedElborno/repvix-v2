// convex/orgs.ts

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireOrgMembership } from "./auth";
import { limitsForTier } from "./billingPlan";
import { Id } from "./_generated/dataModel";

export const getByClerkId = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    return org?._id ?? null;
  },
});

/**
 * Convert Clerk role format (e.g., "org:admin") to Convex role format (e.g., "admin")
 */
function normalizeRole(clerkRole: string): "admin" | "member" {
  // Remove "org:" prefix if present
  const normalized = clerkRole.replace(/^org:/, "").toLowerCase();

  // Map to valid roles
  if (normalized === "admin") {
    return "admin";
  }
  if (normalized === "member") {
    return "member";
  }

  // Default to "member" for unknown roles
  return "member";
}
export const syncOrganization = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("organizations", {
      clerkOrgId: args.clerkOrgId,
      name: args.name,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });
  },
});

export const syncOrganizationMembers = mutation({
  args: {
    clerkOrgId: v.string(),
    members: v.array(
      v.object({
        clerkUserId: v.string(),
        name: v.string(),
        email: v.string(),
        imageUrl: v.string(),
        role: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();
    if (!org) throw new Error("Organization not found.");

    const caller = await ctx.auth.getUserIdentity();
    if (!caller) throw new Error("Unauthorized.");

    let callerMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("clerkUserId", caller.subject))
      .filter((q) => q.eq(q.field("organizationId"), org._id))
      .first();

    if (!callerMembership) {
      // Allow the caller to self-provision only if Clerk says they belong to this org
      const selfFromClerk = args.members.find(
        (m) => m.clerkUserId === caller.subject
      );
      if (!selfFromClerk) {
        throw new Error(
          "Unauthorized: caller is not a member of this organization."
        );
      }

      const role = normalizeRole(selfFromClerk.role);

      await assertMemberCapacity(
        ctx,
        org._id,
        org.planTier,
        (org as any).limits?.members,
        1
      );

      await ctx.db.insert("organizationMembers", {
        organizationId: org._id,
        clerkUserId: selfFromClerk.clerkUserId,
        name: selfFromClerk.name || undefined,
        email: selfFromClerk.email || undefined,
        imageUrl: selfFromClerk.imageUrl || undefined,
        role,
        joinedAt: Date.now(),
      });
      // Only sync the caller entry; ignore others
      args.members = [selfFromClerk];
    } else if (callerMembership.role !== "admin") {
      // Non-admins may only sync their own record; ignore others
      args.members = args.members.filter(
        (m) => m.clerkUserId === caller.subject
      );
      if (!args.members.length) {
        return true;
      }
    }

    const existingMembers = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", org._id))
      .collect();

    const existingMap = new Map(existingMembers.map((m) => [m.clerkUserId, m]));

    const memberLimit = await resolveMemberLimit(
      org.planTier,
      (org as any).limits?.members
    );
    const newMembers = args.members.filter(
      (m) => !existingMap.has(m.clerkUserId)
    );
    if (memberLimit !== undefined && memberLimit !== "unlimited") {
      if (existingMembers.length + newMembers.length > memberLimit) {
        throw new Error("Member limit reached for your current plan.");
      }
    }

    for (const member of args.members) {
      const current = existingMap.get(member.clerkUserId);
      const role = normalizeRole(member.role);

      if (!current) {
        await ctx.db.insert("organizationMembers", {
          organizationId: org._id,
          clerkUserId: member.clerkUserId,
          name: member.name || undefined,
          email: member.email || undefined,
          imageUrl: member.imageUrl || undefined,
          role,
          joinedAt: Date.now(),
        });
        continue;
      }

      const needsUpdate =
        current.role !== role ||
        current.name !== member.name ||
        current.email !== member.email ||
        current.imageUrl !== member.imageUrl;

      if (needsUpdate) {
        await ctx.db.patch(current._id, {
          role,
          name: member.name || undefined,
          email: member.email || undefined,
          imageUrl: member.imageUrl || undefined,
        });
      }
    }

    return true;
  },
});

async function assertMemberCapacity(
  ctx: any,
  organizationId: Id<"organizations">,
  planTier?: string,
  storedLimit?: number | "unlimited",
  incoming = 1
) {
  const limit = await resolveMemberLimit(planTier, storedLimit);
  if (limit === undefined || limit === "unlimited") return;

  const currentCount = await ctx.db
    .query("organizationMembers")
    .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
    .collect()
    .then((arr: any[]) => arr.length);

  if (currentCount + incoming > limit) {
    throw new Error("Member limit reached for your current plan.");
  }
}

async function resolveMemberLimit(
  planTier?: string,
  storedLimit?: number | "unlimited"
): Promise<number | "unlimited" | undefined> {
  if (storedLimit !== undefined) return storedLimit;
  const tier = (planTier as any) || "basic";
  const limits = limitsForTier(tier);
  return limits.members;
}

/**
 * Get organization members by Clerk organization ID
 * 🔒 SECURITY: Only returns members if user is part of the organization
 * Returns limited data to prevent information leakage
 */
export const getOrganizationMembers = query({
  args: {
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (!org) {
      return [];
    }

    try {
      await requireOrgMembership(ctx, org._id);
    } catch {
      return [];
    }

    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", org._id))
      .collect();

    return members.map((m) => ({
      _id: m._id,
      clerkUserId: m.clerkUserId, // 👈 مهم جداً
      name: m.name,
      role: m.role,
      imageUrl: m.imageUrl,
      joinedAt: m.joinedAt,
      _creationTime: m._creationTime,
    }));
  },
});

export const updateMemberRole = mutation({
  args: {
    organizationId: v.id("organizations"),
    clerkUserId: v.string(),
    newRole: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.organizationId);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .first();

    if (!membership) throw new Error("Member not found in this organization.");

    if (membership.role === "admin" && args.newRole !== "admin") {
      const allAdmins = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();

      if (allAdmins.length === 1) {
        throw new Error(
          "Cannot change role of the last admin. At least one admin is required."
        );
      }
    }

    await ctx.db.patch(membership._id, {
      role: args.newRole as "admin" | "member",
    });

    return true;
  },
});

export const removeMember = mutation({
  args: {
    memberId: v.id("organizationMembers"),
  },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.memberId);
    if (!target) throw new Error("Member not found.");
    const orgId = target.organizationId;

    await requireAdmin(ctx, orgId);

    if (target.role === "admin") {
      throw new Error("Cannot remove admin. Transfer admin first.");
    }

    await ctx.db.delete(target._id);

    return true;
  },
});
