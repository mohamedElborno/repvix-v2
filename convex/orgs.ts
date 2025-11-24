// convex/orgs.ts

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./auth";

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

export const updateMemberRole = mutation({
  args: {
    organizationId: v.id("organizations"),
    clerkUserId: v.string(), // مُعرِّف الموظف الذي سيتم تعديل بياناته
    newRole: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("member")
    ),
  },
  handler: async (ctx, args) => {
    // 1. التحقق الأمني: يجب أن يكون المستخدم الحالي مديرًا أو مالكًا.
    await requireAdmin(ctx, args.organizationId);

    // 2. البحث عن العضوية في Convex
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .first();

    if (!membership) throw new Error("العضو غير موجود في هذه المنظمة.");

    // 3. تطبيق التعديل على Convex
    await ctx.db.patch(membership._id, { role: args.newRole });

    // 4. ملاحظة مهمة: تحديث Clerk (يجب أن يتم هذا في الـ Frontend أو Webhook)
    // لا يمكن لدوال Convex تعديل Clerk مباشرة.
    return true;
  },
});

export const removeMember = mutation({
  args: {
    organizationId: v.id("organizations"),
    clerkUserId: v.string(), // مُعرِّف الموظف المراد حذفه
  },
  handler: async (ctx, args) => {
    // 1. التحقق الأمني: يجب أن يكون المستخدم الحالي مديرًا أو مالكًا.
    await requireAdmin(ctx, args.organizationId);

    // 2. البحث عن العضوية في Convex
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .first();

    if (!membership) throw new Error("العضو غير موجود في هذه المنظمة.");

    // 3. حذف العضوية من Convex
    await ctx.db.delete(membership._id);

    // 4. حذف بيانات الموظف المرتبطة (اختياري، حسب احتياجك)
    const employee = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", args.clerkUserId))
      .first();
    if (employee) await ctx.db.delete(employee._id);

    // 5. ملاحظة مهمة: يجب استدعاء Clerk API للحذف
    // يجب أن يتم هذا في الـ Frontend.
    return true;
  },
});
