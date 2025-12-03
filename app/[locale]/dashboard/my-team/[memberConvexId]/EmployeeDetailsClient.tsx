"use client";

import { useState } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

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
  MessageSquare,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";

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

import { removeMemberFromClerk } from "./actions";

/* ----------------------------- TYPES ----------------------------- */
interface Employee {
  id: string; // Convex Member ID
  name: string;
  email: string;
  imageUrl: string;
  clerkUserId: string;
  organizationId: Id<"organizations">;
  role: "admin" | "member";
  joinedAt: number;
  createdAt: number;
  lastActive: number;
  phone?: string;
  isActive: boolean;
  isOnline: boolean;
}

interface EmployeeDetailsClientProps {
  employee: Employee;
  clerkUserId: string;
}

/* ------------------------ MAIN COMPONENT ------------------------ */
export default function EmployeeDetailsClient({
  employee,
  clerkUserId,
}: EmployeeDetailsClientProps) {
  console.log("EMPLOYEE:", employee);
  const t = useTranslations("team");
  const locale = useLocale();
  const router = useRouter();
  const { organization, membership } = useOrganization();
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [editedName, setEditedName] = useState(employee.name);
  const [editedEmail, setEditedEmail] = useState(employee.email);
  const [selectedRole, setSelectedRole] = useState<"admin" | "member">(
    employee.role
  );

  const myRole = membership?.role
    ? (membership?.role.replace("org:", "") as "admin" | "member")
    : undefined;

  const isSelf = userId === clerkUserId;

  // تقدر تعدّل الدور فقط لو كنت owner أو admin وعلى عضو آخر غير نفسك
  const canEditRole = myRole === "admin" && !isSelf;

  // تقدر تحذف فقط لو كنت owner أو admin وعلى عضو آخر
  const canDelete = myRole === "admin" && !isSelf;
  /* ------------------------- Convex Mutations ------------------------- */
  const updateMemberInfo = useMutation(api.orgMembers.updateMemberInfo);
  const removeMember = useMutation(api.orgs.removeMember);

  /* ------------------------- UI HELPERS ------------------------- */

  // Always use English locale for dates to avoid hydration mismatch
  const formatDate = (timestamp: number) =>
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      numberingSystem: "latn", // Force Latin numerals (0-9) instead of Arabic-Indic
    }).format(new Date(timestamp));

  const formatDateTime = (timestamp: number) =>
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      numberingSystem: "latn", // Force Latin numerals (0-9) instead of Arabic-Indic
    }).format(new Date(timestamp));

  const getRoleIcon = () => {
    if (employee.role === "admin") return <Shield className="w-4 h-4" />;
    return <UserIcon className="w-4 h-4" />;
  };

  const getRoleColor = () => {
    switch (employee.role) {
      case "admin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
    }
  };

  /* ------------------------- EDIT EMPLOYEE ------------------------- */

  const handleEdit = async () => {
    if (!organization) return;

    const hasChanges =
      editedName !== employee.name ||
      editedEmail !== employee.email ||
      (canEditRole && selectedRole !== employee.role);

    if (!hasChanges) {
      setIsEditDialogOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      await updateMemberInfo({
        memberId: employee.id as Id<"organizationMembers">,
        name: editedName,
        email: editedEmail,
        role: canEditRole ? selectedRole : undefined, // 👈 فقط لو مسموح
      });

      // Sync with Clerk for role updates
      if (canEditRole && selectedRole !== employee.role) {
        const clerkRole = selectedRole === "admin" ? "org:admin" : "org:member";

        await organization.updateMember({
          userId: clerkUserId,
          role: clerkRole,
        });
      }

      router.refresh();
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error(error);
      alert(t("updateError") || "Failed to update employee.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------- DELETE EMPLOYEE ------------------------- */

  const handleDelete = async () => {
    if (!confirm(t("confirmDeleteEmployee"))) return;
    if (!organization) return;

    setIsLoading(true);
    try {
      await removeMember({
        memberId: employee.id as Id<"organizationMembers">,
      });

      try {
        await removeMemberFromClerk(clerkUserId);
      } catch (_) {}

      router.push(`/${locale}/dashboard/my-team`);
    } catch (error) {
      console.error(error);
      alert(t("deleteError"));
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------------ RENDER ------------------------------ */

  return (
    <div className="space-y-6 min-h-[calc(100vh-120px)]">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${locale}/dashboard/my-team`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("back")}
        </Button>
      </div>

      {/* EMPLOYEE CARD */}
      <Card className="p-6">
        <div className="flex items-start gap-6">
          <Avatar className="w-24 h-24">
            <AvatarImage src={employee.imageUrl} />
            <AvatarFallback>
              {employee.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold">{employee.name}</h2>
              <Badge className={`${getRoleColor()} flex items-center gap-1`}>
                {getRoleIcon()}
                {t(`roles.${employee.role}`)}
              </Badge>
            </div>

            <div className="space-y-2 text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>{employee.email}</span>
              </div>

              {employee.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{employee.phone}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {t("joined")}: {formatDate(employee.joinedAt)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>{employee.isActive ? t("active") : t("inactive")}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ACTIONS */}
      <div className="flex gap-3">
        <Button
          onClick={() => setIsEditDialogOpen(true)}
          className="bg-blue-600 text-white"
        >
          <Edit className="w-4 h-4 mr-2" />
          {t("editEmployee")}
        </Button>

        <Button
          variant="outline"
          onClick={() => router.push(`/${locale}/dashboard/my-team`)}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          {t("viewChats")}
        </Button>
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("editEmployeeFor", { name: employee.name })}
            </DialogTitle>
            <DialogDescription>
              {t("editEmployeeDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input
                id="name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("emailAddress")}</Label>
              <Input
                id="email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
              />
            </div>
            {canEditRole && (
              <div className="space-y-2">
                <Label>{t("role")}</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) =>
                    setSelectedRole(value as "admin" | "member")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectRole")} />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        {t("roles.admin")}
                      </div>
                    </SelectItem>

                    <SelectItem value="member">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4" />
                        {t("roles.member")}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between">
            {canDelete && (
              <Button
                className="text-red-600"
                onClick={handleDelete}
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t("deleteEmployee")}
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isLoading}
              >
                {t("cancel")}
              </Button>

              <Button
                className="bg-blue-600 text-white"
                onClick={handleEdit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("saving")}
                  </>
                ) : (
                  t("saveChanges")
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
