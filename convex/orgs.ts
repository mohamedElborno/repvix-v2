// convex/orgs.ts

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
function normalizeRole(clerkRole: string): "owner" | "admin" | "member" {
  // Remove "org:" prefix if present
  const normalized = clerkRole.replace(/^org:/, "").toLowerCase();

  // Map to valid roles
  if (normalized === "owner" || normalized === "org:owner") {
    return "owner";
  }
  if (normalized === "admin" || normalized === "org:admin") {
    return "admin";
  }
  // Default to "member"
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
    // First, find the Convex organization ID from the Clerk organization ID
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (!org) {
      throw new Error(
        `Organization with clerkOrgId ${args.clerkOrgId} not found`
      );
    }

    const organizationId = org._id;

    // Now query existing members using the Convex organization ID
    const existingMembers = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();

    const existingMap = new Map(existingMembers.map((m) => [m.clerkUserId, m]));

    for (const member of args.members) {
      const existing = existingMap.get(member.clerkUserId);
      const normalizedRole = normalizeRole(member.role);

      if (!existing) {
        await ctx.db.insert("organizationMembers", {
          organizationId: organizationId,
          clerkUserId: member.clerkUserId,
          name: member.name || undefined,
          email: member.email || undefined,
          imageUrl: member.imageUrl || undefined,
          role: normalizedRole,
          joinedAt: Date.now(),
        });
        continue;
      }

      // Update role and user info if changed
      const needsUpdate =
        existing.role !== normalizedRole ||
        existing.name !== member.name ||
        existing.email !== member.email ||
        existing.imageUrl !== member.imageUrl;

      if (needsUpdate) {
        await ctx.db.patch(existing._id, {
          role: normalizedRole,
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
 */
export const getOrganizationMembers = query({
  args: {
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    // First, find the Convex organization ID from the Clerk organization ID
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (!org) {
      return [];
    }

    // Get all members of this organization
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", org._id))
      .collect();

    return members;
  },
});
