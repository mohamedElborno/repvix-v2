/* "use client";

import { useEffect, useState } from "react";
import type { Chat } from "@/lib/types/database";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { MessageSquare, Trash2, Eye, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import clsx from "clsx";

interface ChatListItemProps {
  chat: Chat;
  onDelete: (chatId: string | Id<"chats">) => void;
}

// 🎭 خريطة المشاعر الدقيقة (ألوان ناعمة لا تكسر الثيم)
const sentimentStyles: Record<
  string,
  { bg: string; border: string; glow: string; hover: string }
> = {
  positive: {
    bg: "from-emerald-500/10 to-teal-500/5",
    border: "border-emerald-400/10",
    glow: "group-hover:shadow-emerald-500/20",
    hover: "hover:bg-emerald-500/10",
  },
  neutral: {
    bg: "from-slate-500/10 to-indigo-500/5",
    border: "border-slate-400/10",
    glow: "group-hover:shadow-indigo-500/20",
    hover: "hover:bg-indigo-500/10",
  },
  negative: {
    bg: "from-rose-500/10 to-red-500/5",
    border: "border-rose-400/10",
    glow: "group-hover:shadow-rose-500/20",
    hover: "hover:bg-rose-500/10",
  },
  curious: {
    bg: "from-amber-500/10 to-orange-500/5",
    border: "border-amber-400/10",
    glow: "group-hover:shadow-amber-500/20",
    hover: "hover:bg-amber-500/10",
  },
  emotional: {
    bg: "from-pink-500/10 to-rose-500/5",
    border: "border-pink-400/10",
    glow: "group-hover:shadow-pink-500/20",
    hover: "hover:bg-pink-500/10",
  },
};

export default function ChatListItem({ chat, onDelete }: ChatListItemProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [preview, setPreview] = useState<string>("");
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // تحديد المشاعر بناءً على خاصية chat.sentiment أو افتراض neutral
  const sentiment =
    (chat as Chat)?.sentiment && sentimentStyles[(chat as Chat).sentiment]
      ? (chat as Chat).sentiment
      : "neutral";

  const mood = sentimentStyles[sentiment];

  // استخراج chat.summary إلى متغير منفصل لتجنب complex expression في dependency array
  const chatSummary = chat?.summary;

  useEffect(() => {
    let isActive = true;
    const fetchPreview = async () => {
      try {
        // استخدام summary مباشرة من chat object إذا كان موجوداً (تم جلبه مسبقاً)
        if (chatSummary) {
          const truncated =
            chatSummary.length > 180
              ? chatSummary.slice(0, 177) + "..."
              : chatSummary;
          if (isActive) {
            setPreview(truncated);
            setIsLoadingPreview(false);
          }
          return;
        }

        // إذا لم يكن summary موجوداً، جلب أول chunk فقط (بدون تحليل كامل)
        const res = await fetch(`/api/chats/${chat.id}`);
        if (!res.ok) throw new Error("Failed to load preview");
        const data = await res.json();
        const firstChunk: string | undefined = data?.chunks?.[0]?.text;
        const text = firstChunk || "";
        const truncated = text.length > 180 ? text.slice(0, 177) + "..." : text;
        if (isActive) setPreview(truncated);
      } catch {
        if (isActive) setPreview("");
      } finally {
        if (isActive) setIsLoadingPreview(false);
      }
    };
    fetchPreview();
    return () => {
      isActive = false;
    };
  }, [chat.id, chatSummary]);

  const handleDelete = async (): Promise<void> => {
    setIsDeleting(true);
    try {
      await onDelete(chat.id);
    } catch (error) {
      console.error("Error deleting chat:", error);
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  };

  const handleView = () => {
    router.push(`/dashboard/chats/${chat.id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <>
      <Card
        className={clsx(
          "relative overflow-hidden p-5 border backdrop-blur-md rounded-2xl bg-gradient-to-br transition-all duration-500 ease-out group cursor-pointer",
          mood.bg,
          mood.border,
          mood.hover,
          mood.glow,
          "hover:scale-[1.015] hover:border-white/10",
          "before:absolute before:inset-0 before:opacity-0 hover:before:opacity-10 before:transition-opacity before:duration-500 before:bg-gradient-to-br before:from-white/10 before:to-transparent"
        )}
        onClick={handleView}
      >
      
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-5 transition-opacity duration-700" />

        <div className="flex items-start gap-3 relative z-10">
          <div className="p-2.5 bg-white/10 rounded-xl shrink-0 backdrop-blur-sm">
            <MessageSquare className="w-4 h-4 text-white/80" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white/90 mb-1 truncate">
              {chat.title}
            </h3>

            <p className="text-xs text-white/60 mb-2 truncate flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(chat.created_at)}
            </p>

            <p className="text-sm text-white/85 leading-5">
              {isLoadingPreview ? (
                <span className="inline-block h-4 w-2/3 bg-white/10 rounded animate-pulse" />
              ) : preview ? (
                preview
              ) : (
                t("noPreview")
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 relative z-10">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleView();
            }}
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/10 hover:bg-white/20 text-white transition-all"
          >
            <Eye className="w-4 h-4 mr-2" />
            {t("view")}
          </Button>

          <Button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmOpen(true);
            }}
            disabled={isDeleting}
            variant="outline"
            size="sm"
            className="bg-red-500/15 border-red-500/30 hover:bg-red-500/25 text-red-400 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative z-[201] w-full max-w-sm rounded-xl border border-white/10 bg-neutral-900/90 p-5 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-md bg-red-500/15">
                <Trash2 className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold mb-1">
                  {t("confirmDelete")}
                </h3>
                <p className="text-xs text-white/70">
                  {t("thisActionCannotBeUndone") ||
                    "This action cannot be undone."}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/10 hover:bg-white/20 text-white"
                onClick={() => setConfirmOpen(false)}
              >
                {t("cancel") || "Cancel"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-red-500/20 border-red-500/30 hover:bg-red-500/30 text-red-200"
                disabled={isDeleting}
                onClick={async () => {
                  if (isDeleting) return;
                  await handleDelete();
                }}
              >
                {t("delete") || "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
 */
import React from "react";
export default function page() {
  return <div></div>;
}
