// components/team/EditEmployeeDialog.tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Shield, User, Crown, Loader2 } from "lucide-react";

interface EditEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  // الدور الحالي للموظف
  currentRole: "sales" | "support" | "manager";
  // الدالة التي تستدعي الخادم وتحديث Clerk
  onSubmit: (newRole: "sales" | "support" | "manager") => Promise<void>;
  employeeName: string;
}

const ALL_ROLES = ["sales", "support", "manager"] as const;

export default function EditEmployeeDialog({
  isOpen,
  onClose,
  currentRole,
  onSubmit,
  employeeName,
}: EditEmployeeDialogProps) {
  const t = useTranslations("team");
  const [newRole, setNewRole] = useState<"sales" | "support" | "manager">(
    currentRole
  );
  const [isLoading, setIsLoading] = useState(false);

  // تحديث حالة الدور عند فتح مربع الحوار
  useEffect(() => {
    setNewRole(currentRole);
  }, [currentRole]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "sales":
        return <User className="w-4 h-4" />;
      case "support":
        return <Shield className="w-4 h-4" />;
      case "manager":
        return <Crown className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const handleSave = async () => {
    if (newRole === currentRole) {
      onClose(); // لا تغيير، أغلق مباشرة
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(newRole);
      onClose();
    } catch (error) {
      // التعامل مع الخطأ (مثل رسالة Toast)
      console.error("Failed to update role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("editRoleFor", { name: employeeName })}</DialogTitle>
          <DialogDescription>{t("editRoleDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newRole">{t("newRole")}</Label>
            <Select
              value={newRole}
              onValueChange={setNewRole as (value: string) => void}
              disabled={isLoading}
            >
              <SelectTrigger id="newRole">
                <SelectValue placeholder={t("selectNewRole")} />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(role)}
                      <span>{t(`roles.${role}`)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || newRole === currentRole}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              t("saveChanges")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
