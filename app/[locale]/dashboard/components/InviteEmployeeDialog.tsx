"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";

import { Loader2, Mail, Shield, User as UserIcon, Crown } from "lucide-react";

interface InviteEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, role: string) => Promise<void>;
}

export default function InviteEmployeeDialog({
  isOpen,
  onClose,
  onSubmit,
}: InviteEmployeeDialogProps) {
  const t = useTranslations("team");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [isLoading, setIsLoading] = useState(false);

  /* ----------------------------- Helpers ----------------------------- */

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const resetForm = () => {
    setEmail("");
    setRole("member");
  };

  const getRoleIcon = (role: string) => {
    if (role === "owner") return <Crown className="w-4 h-4" />;
    if (role === "admin") return <Shield className="w-4 h-4" />;
    return <UserIcon className="w-4 h-4" />;
  };

  /* ----------------------------- Submission ----------------------------- */

  const handleInvite = async () => {
    if (!validateEmail(email)) return;

    setIsLoading(true);
    try {
      await onSubmit(email, role);
      resetForm();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  /* ----------------------------- UI ----------------------------- */

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t("inviteMember")}</DialogTitle>
          <DialogDescription>{t("inviteMemberDescription")}</DialogDescription>
        </DialogHeader>

        {/* FORM */}
        <div className="space-y-4 py-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">{t("emailAddress")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="employee@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
            {!validateEmail(email) && email.length > 1 && (
              <p className="text-xs text-red-500">{t("invalidEmail")}</p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>{t("role")}</Label>

            <Select value={role} onValueChange={setRole} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectRole")} />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="member">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    {t("roles.member")}
                  </div>
                </SelectItem>

                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {t("roles.admin")}
                  </div>
                </SelectItem>

                <SelectItem value="owner">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    {t("roles.owner")}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t("cancel")}
          </Button>

          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!validateEmail(email) || isLoading}
            onClick={handleInvite}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("sending")}
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                {t("sendInvitation")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
