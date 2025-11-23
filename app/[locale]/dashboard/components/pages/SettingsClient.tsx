"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  User,
  Mail,
  Calendar,
  Shield,
  Trash2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface SettingsClientProps {
  user: {
    id: string;
    email: string;
    created_at: string;
  };
}

export default function SettingsClient({ user }: SettingsClientProps) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [formattedDate, setFormattedDate] = useState<string>("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    // Format date only on client side to avoid hydration mismatch
    setFormattedDate(
      new Date(user.created_at).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, [user.created_at, locale]);

  const handleDeleteAccount = async () => {
    if (!confirm(t("confirmDelete"))) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // يمكنك إضافة API endpoint لحذف الحساب
      setMessage({
        type: "error",
        text: t("deleteNotImplemented"),
      });
    } catch {
      setMessage({
        type: "error",
        text: t("errorOccurred"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white/90">{t("title")}</h1>
        <p className="text-white/60 mt-1">{t("subtitle")}</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/20"
              : "bg-red-500/10 border border-red-500/20"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
          <p
            className={
              message.type === "success" ? "text-green-400" : "text-red-400"
            }
          >
            {message.text}
          </p>
        </div>
      )}

      {/* Account Information */}
      <Card className="p-6 bg-white/5 border-white/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <User className="w-5 h-5 text-purple-400" />
          </div>
          <h2 className="text-xl font-semibold text-white/90">
            {t("accountInfo")}
          </h2>
        </div>

        <div className="space-y-4">
          {/* User ID */}
          <div>
            <Label className="text-white/70 text-sm">{t("userId")}</Label>
            <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/10">
              <p className="text-white/90 font-mono text-sm">{user.id}</p>
            </div>
          </div>

          {/* Email */}
          <div>
            <Label className="text-white/70 text-sm flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {t("email")}
            </Label>
            <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/10">
              <p className="text-white/90">{user.email}</p>
            </div>
          </div>

          {/* Account Created */}
          <div>
            <Label className="text-white/70 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {t("accountCreated")}
            </Label>
            <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/10">
              <p className="text-white/90">
                {formattedDate || (
                  <span className="opacity-50">Loading...</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Security */}
      <Card className="p-6 bg-white/5 border-white/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-white/90">
            {t("security")}
          </h2>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-400 text-sm">💡 {t("passwordInfo")}</p>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 bg-red-500/5 border-red-500/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white/90">
            {t("dangerZone")}
          </h2>
        </div>

        <div className="space-y-4">
          <p className="text-white/60 text-sm">{t("dangerZoneWarning")}</p>

          <Button
            onClick={handleDeleteAccount}
            disabled={isLoading}
            variant="outline"
            className="border-red-500/50 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t("deleteAccount")}
          </Button>
        </div>
      </Card>

      {/* Coming Soon Features */}
      <Card className="p-6 bg-white/5 border-white/10">
        <h2 className="text-xl font-semibold text-white/90 mb-4">
          🚀 {t("comingSoon")}
        </h2>
        <ul className="space-y-2 text-white/60 text-sm">
          <li>• {t("feature1")}</li>
          <li>• {t("feature2")}</li>
          <li>• {t("feature3")}</li>
          <li>• {t("feature4")}</li>
          <li>• {t("feature5")}</li>
        </ul>
      </Card>
    </div>
  );
}
