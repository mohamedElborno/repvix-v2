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
 * 🔒 SECURITY: Verifies member doesn't already exist
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
    // 1. 🔒 Security check: Ensure the current user is an owner or admin of the organization.
    await requireAdmin(ctx, args.organizationId);

    // 2. 🔒 التحقق من أن العضو غير موجود مسبقاً
    const existingMember = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .first();

    if (existingMember) {
      throw new Error("Member already exists in this organization.");
    }

    // 3. Add the member
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
    organizationId: v.string(), // Clerk org ID
  },
  handler: async (ctx, args) => {
    // 1. جلب بيانات المستخدم الحالي
    const user = await requireUser(ctx);

    // 2. تحويل Clerk org ID إلى Convex org ID
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) =>
        q.eq("clerkOrgId", args.organizationId)
      )
      .first();

    if (!org) {
      throw new Error("Organization not found.");
    }

    const convexOrgId = org._id;

    // 3. التحقق من أن المستخدم الحالي عضو في هذه المنظمة
    await requireOrgMembership(ctx, convexOrgId);

    // 4. جلب بيانات العضوية المطلوبة
    const organizationMember = await ctx.db.get(args.memberId);

    if (!organizationMember) {
      throw new Error("Member not found.");
    }

    // 5. التحقق من أن العضو ينتمي للمنظمة الصحيحة
    if (organizationMember.organizationId !== convexOrgId) {
      throw new Error("Member does not belong to this organization.");
    }

    // 6. جلب عضوية المستخدم الحالي للتحقق من الصلاحيات
    const userMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("clerkUserId", user.subject))
      .filter((q) => q.eq(q.field("organizationId"), convexOrgId))
      .first();

    if (!userMembership) {
      throw new Error("Unauthorized: Not a member of this organization.");
    }

    // 7. تطبيق سياسة الصلاحيات: من يحق له الرؤية؟
    const isOwnerOrAdmin =
      userMembership.role === "owner" || userMembership.role === "admin";
    const isSelf = organizationMember.clerkUserId === user.subject;

    if (!isOwnerOrAdmin && !isSelf) {
      // إذا لم يكن مديراً/مالكاً ولم يكن يحاول عرض صفحته
      throw new Error(
        "Unauthorized: Insufficient permissions to view this member."
      );
    }

    // 🚨 الآن، نُعيد بيانات العضو ومُعرّف Clerk الخاص به
    return {
      organizationMember,
      clerkUserId: organizationMember.clerkUserId,
    };
  },
});

/**
 * Update organization member information (name, email, role)
 * 🔒 SECURITY: organizationId is extracted from user's membership, not from client
 */
export const updateMemberInfo = mutation({
  args: {
    memberId: v.id("organizationMembers"),
    // ❌ REMOVED: organizationId - لا نثق بالعميل، نستخرجه من عضوية المستخدم
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal("owner"), v.literal("admin"), v.literal("member"))
    ),
  },
  handler: async (ctx, args) => {
    // 1. 🔒 جلب بيانات العضوية المستهدفة أولاً
    const targetMembership = await ctx.db.get(args.memberId);

    if (!targetMembership) {
      throw new Error("Member not found.");
    }

    const organizationId = targetMembership.organizationId;

    // 2. 🔒 التحقق الأمني: يجب أن يكون المستخدم الحالي مديرًا أو مالكًا
    // نستخدم organizationId من قاعدة البيانات، وليس من العميل
    const currentUserMembership = await requireAdmin(ctx, organizationId);

    // 3. 🔒 منع تغيير دور Owner الوحيد
    if (args.role !== undefined && args.role !== targetMembership.role) {
      // إذا كان العضو المستهدف هو Owner ونحاول تغيير دوره
      if (targetMembership.role === "owner" && args.role !== "owner") {
        // عدّ عدد Owners في المنظمة
        const allOwners = await ctx.db
          .query("organizationMembers")
          .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
          .filter((q) => q.eq(q.field("role"), "owner"))
          .collect();

        if (allOwners.length === 1) {
          throw new Error(
            "Cannot change role of the last owner. At least one owner is required."
          );
        }
      }

      // 🔒 منع Member من ترقية نفسه إلى Owner (يجب أن يكون Admin على الأقل)
      if (
        args.role === "owner" &&
        currentUserMembership.role !== "owner" &&
        targetMembership.clerkUserId === currentUserMembership.clerkUserId
      ) {
        throw new Error("Only owners can promote members to owner role.");
      }
    }

    // 4. تحديث البيانات
    const updates: {
      name?: string;
      email?: string;
      role?: "owner" | "admin" | "member";
    } = {};

    if (args.name !== undefined) {
      updates.name = args.name || undefined;
    }
    if (args.email !== undefined) {
      updates.email = args.email || undefined;
    }
    if (args.role !== undefined) {
      updates.role = args.role;
    }

    // 5. تطبيق التحديثات
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.memberId, updates);
    }

    return true;
  },
});
