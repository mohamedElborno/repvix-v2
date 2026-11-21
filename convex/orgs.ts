import { requireServerBridge } from "./serverBridge";
// convex/orgs.ts

import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAdmin, requireOrgMembership } from "./auth";

export const getByClerkId = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (!org) return null;
    await requireOrgMembership(ctx, org._id);
    return org._id;
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
    serverSecret: v.string(),
    clerkOrgId: v.string(),
    name: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerBridge(args.serverSecret);
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
    serverSecret: v.string(),
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
    requireServerBridge(args.serverSecret);
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();
    if (!org) throw new Error("Organization not found.");

    const existingMembers = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", org._id))
      .collect();

    const incomingUsers = new Set(args.members.map(m => m.clerkUserId));
    for (const member of existingMembers) {
      if (!incomingUsers.has(member.clerkUserId)) await ctx.db.delete(member._id);
    }
    const existingMap = new Map(existingMembers.filter(m => incomingUsers.has(m.clerkUserId)).map((m) => [m.clerkUserId, m]));

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

export const getOrCreateZendeskOrg = internalMutation({
  args: {
    zendeskAccountId: v.string(),
    zendeskSubdomain: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("zendeskAccountId"), args.zendeskAccountId))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("organizations", {
      zendeskAccountId: args.zendeskAccountId,
      zendeskSubdomain: args.zendeskSubdomain,
      name: args.name,
      createdBy: "zendesk_system",
      createdAt: Date.now(),
    });
  },
});
