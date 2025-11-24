// convex/orgMembers.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireOrgMembership, requireUser } from "./auth";
import type { Id } from "./_generated/dataModel";

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

    const isOwnerOrAdmin =
      userMembership.role === "owner" || userMembership.role === "admin";
    const isSelf = organizationMember.clerkUserId === user.subject;

    if (!isOwnerOrAdmin && !isSelf) {
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
    role: v.optional(
      v.union(v.literal("owner"), v.literal("admin"), v.literal("member"))
    ),
  },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.memberId);
    if (!target) throw new Error("Member not found.");

    const orgId = target.organizationId;

    // هوية المستخدم الحالي
    const caller = await ctx.auth.getUserIdentity();
    if (!caller) throw new Error("Unauthorized.");

    // عضوية المستخدم الحالي داخل المنظمة
    const callerMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("clerkUserId", caller.subject))
      .filter((q) => q.eq(q.field("organizationId"), orgId))
      .first();

    if (!callerMembership) {
      throw new Error("Unauthorized: Not part of this organization.");
    }

    const callerRole = callerMembership.role;
    const isCallerAdmin = callerRole === "admin" || callerRole === "owner";
    const isCallerOwner = callerRole === "owner";
    const isSelf = caller.subject === target.clerkUserId;

    // ---------------------------------------------------------------------
    // 1) تعديل الدور (role) → يتطلب أن يكون Caller = Admin أو Owner
    // ---------------------------------------------------------------------
    if (args.role !== undefined && args.role !== target.role) {
      if (!isCallerAdmin) {
        throw new Error("Only admins or owners can change member roles.");
      }

      // منع تغيير آخر Owner في المنظمة
      if (target.role === "owner" && args.role !== "owner") {
        const owners = await ctx.db
          .query("organizationMembers")
          .withIndex("by_org", (q) => q.eq("organizationId", orgId))
          .filter((q) => q.eq(q.field("role"), "owner"))
          .collect();

        if (owners.length === 1) {
          throw new Error("Cannot change role of the last owner.");
        }
      }

      // منع ترقية النفس إلى Owner إذا لم يكن Owner أصلاً
      if (args.role === "owner" && !isCallerOwner && isSelf) {
        throw new Error("Only owners can promote themselves to owner.");
      }
    }

    // ---------------------------------------------------------------------
    // 2) تعديل الاسم أو الإيميل → مسموح فقط في حال:
    //    * المستخدم يعدّل نفسه
    //    * أو Caller = Admin/Owner
    // ---------------------------------------------------------------------
    if (!isSelf && !isCallerAdmin) {
      throw new Error("Insufficient permissions to update another member.");
    }

    const updates: {
      name?: string;
      email?: string;
      role?: "owner" | "admin" | "member";
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

export const addMemberFromInvite = mutation({
  args: {
    organizationId: v.id("organizations"),
    clerkUserId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    // هذا يُستدعى من webhook عن طريق server client
    // وبالتالي لا نستخدم requireUser/requireAdmin هنا
    // (الأمان الحقيقي يكون بالتحقق من توقيع Clerk في Route نفسه)

    // تأكد أن العضو غير مضاف مسبقاً
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

    // عضو جديد
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
