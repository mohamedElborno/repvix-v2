"use client";

import React, { useState, useEffect, useCallback } from "react";
// 🚨 افتراض: استخدام useOrganization من Clerk لتحديث العضوية
import { useOrganization } from "@clerk/nextjs";
import { useTranslations, useLocale } from "next-intl";
// ... (باقي الاستيرادات)
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react"; // 🚨 استيراد Convex Hook
import { api } from "@/convex/_generated/api"; // 🚨 استيراد دوال Convex
import EditEmployeeDialog from "../../components/EditEmployeeClient"; // 🚨 استيراد مربع حوار التعديل
import {
  Loader2,
  Mail,
  Phone,
  Calendar,
  Shield,
  User as UserIcon,
  Crown,
  Edit,
  Trash2,
  MoreVertical,
  BarChart3,
  TrendingUp,
  MessageSquare,
  Star,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

// ... (تحديد الواجهات Employee و EmployeeGlobalAnalysis)

interface Employee {
  id: string;
  name: string;
  email: string;
  image: string;
  manager_id: string;
  full_name: string;
  phone: string;
  imageUrl: string;
  userId: string;
  createdAt: number;
  organizationId: Id<"organizations">;
  clerkUserId: string;
  joinedAt: number;
  role: "owner" | "admin" | "member";
  lastActive: number;
  isActive: boolean;
  isOnline: boolean;
  isAway: boolean;
  isBusy: boolean;
  isIdle: boolean;
  isOffline: boolean;
}

interface EmployeeDetailsClientProps {
  employee: Employee;
  // 🚨 إضافة clerkUserId للتعامل مع Clerk API بشكل مباشر
  clerkUserId: string;
}

export default function EmployeeDetailsClient({
  employee,
  clerkUserId,
}: EmployeeDetailsClientProps) {
  const t = useTranslations("team");
  const locale = useLocale();
  const router = useRouter();
  const { organization } = useOrganization(); // 🚨 استيراد useOrganization
  const [isLoading, setIsLoading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); // 🚨 حالة مربع حوار التعديل

  // 🚨 دوال Convex
  const updateMemberRoleInConvex = useMutation(api.orgs.updateMemberRole);
  const removeMemberFromConvex = useMutation(api.orgs.removeMember);

  // ... (باقي حالات التحليل والتاريخ)

  // ... (دالة fetchGlobalAnalysis و useEffects)

  // ... (دوال getRoleIcon, getRoleColor, getSentimentColor, getSentimentIcon)

  /* ---------------------- 🛑 منطق التعديل 🛑 ---------------------- */

  // دالة تحويل الدور إلى دور Clerk المقابل (مهمة للتعديل)
  const mapCustomRoleToClerk = (
    customRole: "sales" | "support" | "manager"
  ) => {
    switch (customRole) {
      case "sales":
      case "support":
        return "member"; // افتراض أن كليهما يمثل دور عضو عادي في Clerk
      case "manager":
        return "admin";
      default:
        return "member";
    }
  };

  const handleEditRole = async (newRole: "sales" | "support" | "manager") => {
    if (!organization) throw new Error("Organization not loaded.");

    setIsLoading(true);
    try {
      // 1. تحديث Clerk: تحديث دور العضو في Clerk
      const clerkRole = mapCustomRoleToClerk(newRole);

      await organization.updateMember({
        userId: clerkUserId, // مُعرِّف المستخدم في Clerk
        role: clerkRole,
      });

      // 2. تحديث Convex: تحديث الدور المخصص في Convex
      await updateMemberRoleInConvex({
        organizationId: employee.organizationId, // يجب أن يكون هذا هو مُعرِّف المنظمة في Convex
        clerkUserId: clerkUserId,
        newRole: mapCustomRoleToClerk(newRole),
      });

      // 3. تحديث الصفحة (لإظهار التغيير)
      router.refresh();
    } catch (error) {
      console.error("Failed to update employee role:", error);
      throw error; // إعادة رمي الخطأ ليتم التعامل معه في مربع الحوار
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------------------- 🛑 منطق الحذف 🛑 ---------------------- */

  const handleDeleteEmployee = async () => {
    if (!organization) {
      console.error("Organization not loaded.");
      return;
    }

    // ⚠️ يتم هنا إزالة العضو من Clerk. يجب أن يقوم Webhook بحذف السجل من Convex.
    if (!confirm(t("confirmDeleteEmployee"))) {
      return;
    }

    setIsLoading(true);
    try {
      // 1. إزالة العضو من المنظمة في Clerk
      await organization.removeMember(clerkUserId);

      // إذا نجح Clerk، يفترض أن يتم تفعيل Webhook الذي يقوم بحذف السجل من Convex تلقائياً.
      // لذلك، لا نحتاج لاستدعاء removeMemberFromConvex هنا بشكل صريح.

      // 2. إعادة التوجيه إلى صفحة الفريق بعد الحذف
      router.push("/dashboard/my-team");
    } catch (error) {
      console.error("Error deleting employee:", error);
      // التعامل مع الخطأ (مثل إظهار رسالة فشل)
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {/* ... (بقية الهيدر) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              {t("editRole")} {/* تغيير النص إلى تعديل الدور */}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDeleteEmployee}
              className="text-red-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {t("deleteEmployee")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ... (Employee Info Card) */}

      {/* Actions */}
      <div className="flex gap-3">
        {/* تغيير وظيفة زر التعديل لفتح مربع حوار */}
        <Button
          onClick={() => setIsEditDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isLoading}
        >
          <Edit className="w-4 h-4 mr-2" />
          {t("editRole")}
        </Button>
        {/* ... (View Chats Button) */}
      </div>

      {/* ... (Global Analysis Section) */}

      {/* 🚨 مربع حوار التعديل */}
      <EditEmployeeDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        currentRole={employee.role as "sales" | "support" | "manager"}
        onSubmit={handleEditRole}
        employeeName={employee.full_name || employee.name || employee.email}
      />
    </div>
  );
}
