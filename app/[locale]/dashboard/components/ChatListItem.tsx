"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Trash2, Eye, Calendar } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import clsx from "clsx";

/* ========================================================================== */
/* TYPES                                                                      */
/* ========================================================================== */

type ChatStatus = "open" | "closed";
type ChatSourceType = "manual" | "integration";

export interface ChatListItemData {
  _id: Id<"chats">;

  organizationId: Id<"organizations">;
  createdByMemberId: Id<"organizationMembers">;
  createdByUserId: string;

  primaryAgentMemberId?: Id<"organizationMembers"> | null;

  sourceType: ChatSourceType;
  sourceChannel?: string | null; // "whatsapp" | "telegram" | "manual" | ...
  externalChatId?: string | null;
  customerIdentifier?: string | null; // رقم / إيميل / يوزرنيم

  title?: string | null;
  language?: string | null; // "ar" | "en" | ...

  startedAt: number; // أول رسالة في المحادثة
  endedAt?: number | null;
  createdAt: number; // وقت الإدخال في النظام
  lastMessageAt?: number | null;

  status: ChatStatus; // "open" | "closed"
  messageCount?: number | null;
}

interface ChatListItemProps {
  chat: ChatListItemData;
  onDelete: (chatId: Id<"chats">) => Promise<void> | void;
}

/* ========================================================================== */
/* HELPERS                                                                    */
/* ========================================================================== */

function formatDate(ts: number | null | undefined, locale: string) {
  if (!ts) return "";
  const date = new Date(ts);
  // Always use English locale for dates to avoid hydration mismatch
  // and ensure consistent formatting with English numbers
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    numberingSystem: "latn", // Force Latin numerals (0-9) instead of Arabic-Indic
  }).format(date);
}

function getStatusLabel(
  status: ChatStatus,
  t: ReturnType<typeof useTranslations>
) {
  if (status === "open") return t("chats.statusOpen");
  return t("chats.statusClosed");
}

function getSourceLabel(
  sourceType: ChatSourceType,
  sourceChannel: string | null | undefined,
  t: ReturnType<typeof useTranslations>
) {
  if (sourceType === "manual") {
    return t("chats.sourceManual");
  }

  if (sourceChannel) {
    // يمكنك عمل ترجمة لكل قناة لاحقاً لو حاب
    return `${t("chats.sourceIntegration")} · ${sourceChannel}`;
  }

  return t("chats.sourceIntegration");
}

/* ========================================================================== */
/* COMPONENT                                                                  */
/* ========================================================================== */

export default function ChatListItem({ chat, onDelete }: ChatListItemProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const router = useRouter();

  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const statusLabel = getStatusLabel(chat.status, t);
  const sourceLabel = getSourceLabel(
    chat.sourceType,
    chat.sourceChannel ?? undefined,
    t
  );

  // Always format dates in English to avoid hydration mismatch
  const createdLabel = formatDate(chat.startedAt || chat.createdAt, "en-US");
  const msgCount = chat.messageCount ?? 0;

  const handleView = () => {
    router.push(`/dashboard/chats/${chat._id}`);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(chat._id);
    } catch (error) {
      console.error("Error deleting chat:", error);
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Card
        className={clsx(
          "relative overflow-hidden p-5 border backdrop-blur-md rounded-2xl bg-gradient-to-br transition-all duration-500 ease-out group cursor-pointer",
          // ألوان بسيطة مرتبطة بالحالة
          chat.status === "open"
            ? "from-emerald-500/10 to-teal-500/5 border-emerald-400/10 hover:bg-emerald-500/10 group-hover:shadow-emerald-500/20"
            : "from-slate-600/10 to-slate-900/5 border-slate-500/10 hover:bg-slate-600/10 group-hover:shadow-slate-500/20",
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
            {/* العنوان */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-white/90 truncate">
                {chat.title ||
                  t("chats.untitledChat", { default: "Untitled chat" })}
              </h3>

              {/* شارة الحالة Open / Closed */}
              <span
                className={clsx(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border",
                  chat.status === "open"
                    ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-200"
                    : "bg-slate-700/40 border-slate-400/30 text-slate-200"
                )}
              >
                {statusLabel}
              </span>
            </div>

            {/* التاريخ + المصدر */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/60 mb-2">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {createdLabel}
              </span>

              <span className="w-1 h-1 rounded-full bg-white/30" />

              <span className="truncate">{sourceLabel}</span>

              {chat.language && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <span className="uppercase tracking-wide">
                    {chat.language}
                  </span>
                </>
              )}

              {msgCount > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <span>
                    {t("chats.messageCount", {
                      count: msgCount,
                    })}
                  </span>
                </>
              )}

              {chat.customerIdentifier && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <span className="truncate max-w-[140px]">
                    {chat.customerIdentifier}
                  </span>
                </>
              )}
            </div>

            {/* لا يوجد preview حالياً؛ لاحقاً ممكن نضيفه من التحليل أو من أول رسالة */}
            <p className="text-sm text-white/80 leading-5 line-clamp-2">
              {t("chats.noPreviewShort", {
                default: "No preview yet. Analysis will appear here later.",
              })}
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

      {/* Dialog تأكيد الحذف */}
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
                disabled={isDeleting}
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
