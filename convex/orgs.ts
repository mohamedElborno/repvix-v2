// convex/orgs.ts

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireOrgMembership } from "./auth";

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
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();
    if (!org) throw new Error("Organization not found.");

    // ✅ هوية المستخدم الحالي من JWT الخاص بـ Clerk
    const caller = await ctx.auth.getUserIdentity();
    if (!caller) throw new Error("Unauthorized.");

    // نحاول إيجاد عضويته في Convex
    let callerMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("clerkUserId", caller.subject))
      .filter((q) => q.eq(q.field("organizationId"), org._id))
      .first();

    // ✅ إذا لم نجد عضوية في Convex لكن المستخدم فعلاً عضو في المنظمة في Clerk
    if (!callerMembership) {
      const fromClerk = args.members.find(
        (m) => m.clerkUserId === caller.subject
      );

      if (!fromClerk) {
        // المستخدم ليس عضوًا فعليًا في المنظمة في Clerk → Unauthorized حقيقية
        throw new Error("Not a member of this organization.");
      }

      // ✨ أنشئ عضوية جديدة في Convex بناءً على بيانات Clerk
      const role = normalizeRole(fromClerk.role); // تستخدم الدالة اللي فوق الملف

      await ctx.db.insert("organizationMembers", {
        organizationId: org._id,
        clerkUserId: fromClerk.clerkUserId,
        name: fromClerk.name || undefined,
        email: fromClerk.email || undefined,
        imageUrl: fromClerk.imageUrl || undefined,
        role,
        joinedAt: Date.now(),
      });

      // لا حاجة لإسناد النتيجة لـ callerMembership
      // يكفينا أننا تأكدنا أنه الآن عضو في المنظمة
    }

    // 👇 باقي الكود كما هو

    const existingMembers = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", org._id))
      .collect();

    const existingMap = new Map(existingMembers.map((m) => [m.clerkUserId, m]));

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
    clerkUserId: v.string(), // مُعرِّف الموظف الذي سيتم تعديل بياناته
    newRole: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("member")
    ),
  },
  handler: async (ctx, args) => {
    // 1. 🔒 التحقق الأمني: يجب أن يكون المستخدم الحالي مديرًا أو مالكًا.
    await requireAdmin(ctx, args.organizationId);

    // 2. البحث عن العضوية في Convex
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .first();

    if (!membership) throw new Error("العضو غير موجود في هذه المنظمة.");

    // 3. 🔒 منع تغيير دور Owner الوحيد
    if (membership.role === "owner" && args.newRole !== "owner") {
      const allOwners = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
        .filter((q) => q.eq(q.field("role"), "owner"))
        .collect();

      if (allOwners.length === 1) {
        throw new Error(
          "Cannot change role of the last owner. At least one owner is required."
        );
      }
    }

    // 4. تطبيق التعديل على Convex
    await ctx.db.patch(membership._id, { role: args.newRole });

    // 5. ملاحظة مهمة: تحديث Clerk (يجب أن يتم هذا في الـ Frontend أو Webhook)
    // لا يمكن لدوال Convex تعديل Clerk مباشرة.
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

    if (target.role === "owner") {
      throw new Error("Cannot remove owner. Transfer ownership first.");
    }

    await ctx.db.delete(target._id);

    return true;
  },
});
