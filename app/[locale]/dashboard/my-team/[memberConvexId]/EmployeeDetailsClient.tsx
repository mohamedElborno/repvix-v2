"use client";

import React, { useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { removeMemberFromClerk } from "./actions";
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
  ArrowLeft,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<
    "owner" | "admin" | "member"
  >(employee.role);
  const [editedName, setEditedName] = useState(
    employee.name || employee.full_name || ""
  );
  const [editedEmail, setEditedEmail] = useState(employee.email || "");

  // 🚨 دوال Convex
  const updateMemberRoleInConvex = useMutation(api.orgs.updateMemberRole);
  const removeMemberFromConvex = useMutation(api.orgs.removeMember);
  const updateMemberInfoInConvex = useMutation(api.orgMembers.updateMemberInfo);

  // دوال مساعدة
  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="w-4 h-4" />;
      case "admin":
        return <Shield className="w-4 h-4" />;
      case "member":
        return <UserIcon className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "admin":
        return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400";
      case "member":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (timestamp: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* ---------------------- 🛑 منطق التعديل 🛑 ---------------------- */

  // دالة تحويل الدور من Clerk إلى Convex
  const mapClerkRoleToConvex = (
    clerkRole: "owner" | "admin" | "member"
  ): "owner" | "admin" | "member" => {
    return clerkRole; // الأدوار متطابقة
  };

  // دالة تحويل الدور من Convex إلى Clerk
  const mapConvexRoleToClerk = (
    convexRole: "owner" | "admin" | "member"
  ): "org:owner" | "org:admin" | "org:member" => {
    switch (convexRole) {
      case "owner":
        return "org:owner";
      case "admin":
        return "org:admin";
      case "member":
        return "org:member";
      default:
        return "org:member";
    }
  };

  const handleEditEmployee = async (data: {
    name?: string;
    email?: string;
    role?: "owner" | "admin" | "member";
  }) => {
    if (!organization) throw new Error("Organization not loaded.");

    setIsLoading(true);
    try {
      // 1. تحديث Convex أولاً
      const updates: {
        name?: string;
        email?: string;
        role?: "owner" | "admin" | "member";
      } = {};

      if (data.name !== undefined && data.name !== employee.name) {
        updates.name = data.name;
      }
      if (data.email !== undefined && data.email !== employee.email) {
        updates.email = data.email;
      }
      if (data.role !== undefined && data.role !== employee.role) {
        updates.role = data.role;
      }

      // تحديث Convex
      // 🔒 SECURITY: لا نرسل organizationId من الواجهة، يتم استخراجه في Backend
      if (Object.keys(updates).length > 0) {
        // تحويل employee.id إلى Id<"organizationMembers">
        const memberId = employee.id as Id<"organizationMembers">;
        await updateMemberInfoInConvex({
          memberId: memberId,
          // ❌ REMOVED: organizationId - يتم استخراجه من عضوية المستخدم في Backend
          name: updates.name,
          email: updates.email,
          role: updates.role,
        });
      }

      // 2. تحديث Clerk (فقط للدور)
      if (data.role !== undefined && data.role !== employee.role) {
        try {
          const clerkRole = mapConvexRoleToClerk(data.role);
          await organization.updateMember({
            userId: clerkUserId,
            role: clerkRole,
          });
        } catch (clerkError: any) {
          // ⚠️ إذا فشل تحديث Clerk، يجب إرجاع Convex إلى حالته السابقة
          // TODO: Implement rollback mechanism for better consistency
          // يمكن إضافة إشعار للمستخدم هنا
          throw new Error(
            "Failed to update role in Clerk. Please try again or contact support."
          );
        }
      }

      // 3. تحديث الصفحة (لإظهار التغيير)
      router.refresh();
    } catch (error) {
      console.error("Failed to update employee:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRole = async (newRole: "owner" | "admin" | "member") => {
    await handleEditEmployee({ role: newRole });
  };

  /* ---------------------- 🛑 منطق الحذف 🛑 ---------------------- */

  const handleDeleteEmployee = async () => {
    if (!organization) {
      console.error("Organization not loaded.");
      return;
    }

    if (
      !confirm(
        t("confirmDeleteEmployee") ||
          "Are you sure you want to remove this member?"
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      // 1. إزالة العضو من Convex أولاً
      await removeMemberFromConvex({
        organizationId: employee.organizationId,
        clerkUserId: clerkUserId,
      });

      // 2. إزالة العضو من المنظمة في Clerk باستخدام server action
      try {
        await removeMemberFromClerk(clerkUserId);
      } catch (clerkError: any) {
        // إذا فشل حذف من Clerk، نتابع لأن Convex تم تحديثه بالفعل
        // قد يكون المستخدم غير موجود في Clerk أو تم حذفه مسبقاً
        console.warn(
          "Failed to remove member from Clerk (may already be removed):",
          clerkError
        );
        // نتابع العملية لأن Convex تم تحديثه بالفعل
      }

      // 3. إعادة التوجيه إلى صفحة الفريق بعد الحذف
      router.push("/dashboard/my-team");
    } catch (error: any) {
      console.error("Error deleting employee:", error);

      // عرض رسالة خطأ واضحة للمستخدم
      const errorMessage =
        error?.message ||
        t("deleteError") ||
        "Failed to delete employee. Please try again.";

      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/my-team")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("back") || "Back"}
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t("employeeDetails") || "Employee Details"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t("viewEmployeeInformation") ||
                "View and manage employee information"}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setSelectedRole(employee.role);
                setEditedName(employee.name || employee.full_name || "");
                setEditedEmail(employee.email || "");
                setIsEditDialogOpen(true);
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              {t("editEmployee") || "Edit Employee"}
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
              {t("deleteEmployee") || "Delete Employee"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Employee Info Card */}
      <Card className="p-6">
        <div className="flex items-start gap-6">
          <Avatar className="w-24 h-24">
            <AvatarImage
              src={employee.imageUrl || employee.image}
              alt={employee.name || employee.full_name || "Employee"}
            />
            <AvatarFallback className="text-2xl">
              {(employee.name || employee.full_name || employee.email || "E")
                .charAt(0)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {employee.name || employee.full_name || "Employee"}
              </h2>
              <Badge
                className={`${getRoleColor(employee.role)} flex items-center gap-1`}
              >
                {getRoleIcon(employee.role)}
                {t(`roles.${employee.role}`) || employee.role}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Mail className="w-4 h-4" />
                <span>{employee.email || "N/A"}</span>
              </div>
              {employee.phone && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Phone className="w-4 h-4" />
                  <span>{employee.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>
                  {t("joined") || "Joined"}: {formatDate(employee.joinedAt)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4" />
                <span>
                  {employee.isActive
                    ? t("active") || "Active"
                    : t("inactive") || "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            {t("accountInformation") || "Account Information"}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                {t("memberId") || "Member ID"}:
              </span>
              <span className="text-gray-900 dark:text-white font-mono text-xs">
                {employee.id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                {t("clerkUserId") || "Clerk User ID"}:
              </span>
              <span className="text-gray-900 dark:text-white font-mono text-xs">
                {employee.clerkUserId.substring(0, 20)}...
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                {t("createdAt") || "Created At"}:
              </span>
              <span className="text-gray-900 dark:text-white">
                {formatDateTime(employee.createdAt)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                {t("lastActive") || "Last Active"}:
              </span>
              <span className="text-gray-900 dark:text-white">
                {formatDateTime(employee.lastActive)}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            {t("status") || "Status"}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                {t("onlineStatus") || "Online Status"}:
              </span>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    employee.isOnline
                      ? "bg-green-500"
                      : employee.isOffline
                        ? "bg-gray-500"
                        : "bg-yellow-500"
                  }`}
                />
                <span className="text-gray-900 dark:text-white">
                  {employee.isOnline
                    ? t("online") || "Online"
                    : employee.isOffline
                      ? t("offline") || "Offline"
                      : t("away") || "Away"}
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                {t("accountStatus") || "Account Status"}:
              </span>
              <Badge
                variant={employee.isActive ? "default" : "secondary"}
                className={
                  employee.isActive
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : ""
                }
              >
                {employee.isActive
                  ? t("active") || "Active"
                  : t("inactive") || "Inactive"}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => {
            setSelectedRole(employee.role);
            setEditedName(employee.name || employee.full_name || "");
            setEditedEmail(employee.email || "");
            setIsEditDialogOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isLoading}
        >
          <Edit className="w-4 h-4 mr-2" />
          {t("editEmployee") || "Edit Employee"}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/my-team")}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          {t("viewChats") || "View Chats"}
        </Button>
      </div>

      {/* 🚨 مربع حوار التعديل */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {t("editEmployeeFor", {
                name: employee.name || employee.full_name,
              }) || `Edit ${employee.name || employee.full_name}`}
            </DialogTitle>
            <DialogDescription>
              {t("editEmployeeDescription") || "Update employee information"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("name") || "Name"}</Label>
              <Input
                id="name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder={t("enterName") || "Enter name"}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                {t("emailAddress") || "Email Address"}
              </Label>
              <Input
                id="email"
                type="email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                placeholder={t("enterEmail") || "Enter email"}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t("role") || "Role"}</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) =>
                  setSelectedRole(value as "owner" | "admin" | "member")
                }
                disabled={isLoading}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder={t("selectRole") || "Select role"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      <span>{t("roles.owner") || "Owner"}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>{t("roles.admin") || "Admin"}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      <span>{t("roles.member") || "Member"}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isLoading}
            >
              {t("cancel") || "Cancel"}
            </Button>
            <Button
              onClick={async () => {
                const hasChanges =
                  editedName !== (employee.name || employee.full_name) ||
                  editedEmail !== employee.email ||
                  selectedRole !== employee.role;

                if (!hasChanges) {
                  setIsEditDialogOpen(false);
                  return;
                }

                setIsLoading(true);
                try {
                  await handleEditEmployee({
                    name: editedName,
                    email: editedEmail,
                    role: selectedRole,
                  });
                  setIsEditDialogOpen(false);
                } catch (error) {
                  console.error("Failed to update employee:", error);
                  alert(
                    t("updateError") ||
                      "Failed to update employee. Please try again."
                  );
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={
                isLoading ||
                (editedName === (employee.name || employee.full_name) &&
                  editedEmail === employee.email &&
                  selectedRole === employee.role)
              }
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("saving") || "Saving..."}
                </>
              ) : (
                t("saveChanges") || "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
