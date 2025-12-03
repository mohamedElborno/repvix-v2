"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Trash2, Eye, Calendar, User, Bot } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import clsx from "clsx";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

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

  // Fetch first 2 messages for preview
  const previewMessages = useQuery(api.chats.getFirstTwoMessages, {
    chatId: chat._id,
  });

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
          "relative overflow-hidden p-4 border backdrop-blur-xl rounded-2xl bg-card/80 transition-all duration-500 ease-out group cursor-pointer",
          // ألوان رسمية مرتبطة بالحالة مع دعم الثيمات
          chat.status === "open"
            ? "border-primary/20 hover:border-primary/30 group-hover:shadow-lg group-hover:shadow-primary/10"
            : "border-border/50 hover:border-border group-hover:shadow-lg",
          "hover:scale-[1.02] hover:bg-card/90",
          "before:absolute before:inset-0 before:opacity-0 hover:before:opacity-5 before:transition-opacity before:duration-500 before:bg-gradient-to-br before:from-primary/10 before:to-transparent"
        )}
        onClick={handleView}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        <div className="flex items-start gap-2.5 relative z-10">
          <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg shrink-0 backdrop-blur-sm border border-primary/20">
            <MessageSquare className="w-3.5 h-3.5 text-primary dark:text-primary-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            {/* العنوان */}
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {chat.title ||
                  t("chats.untitledChat", { default: "Untitled chat" })}
              </h3>

              {/* شارة الحالة Open / Closed */}
              <span
                className={clsx(
                  "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border shrink-0",
                  chat.status === "open"
                    ? "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-muted border-border text-muted-foreground"
                )}
              >
                {statusLabel}
              </span>
            </div>

            {/* التاريخ + المصدر */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-muted-foreground mb-2">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                {createdLabel}
              </span>

              <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />

              <span className="truncate">{sourceLabel}</span>

              {chat.language && (
                <>
                  <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                  <span className="uppercase tracking-wide">
                    {chat.language}
                  </span>
                </>
              )}

              {msgCount > 0 && (
                <>
                  <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                  <span>
                    {t("chats.messageCount", {
                      count: msgCount,
                    })}
                  </span>
                </>
              )}

              {chat.customerIdentifier && (
                <>
                  <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                  <span className="truncate max-w-[120px]">
                    {chat.customerIdentifier}
                  </span>
                </>
              )}
            </div>

            {/* عرض أول رسالتين مع fade effect */}
            {previewMessages && previewMessages.length > 0 ? (
              <div className="relative">
                <div className="space-y-1.5 mb-2 max-h-[100px] overflow-hidden">
                  {previewMessages.slice(0, 2).map((message) => (
                    <div
                      key={
                        message._id ||
                        message.externalMessageId ||
                        message.internalTimestamp
                      }
                      className={clsx(
                        "relative p-2 rounded-lg backdrop-blur-md border transition-all duration-300",
                        message.senderType === "customer"
                          ? "bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/30 ml-0"
                          : "bg-muted/50 border-border/50 mr-0"
                      )}
                    >
                      <div className="flex items-start gap-1.5">
                        <div
                          className={clsx(
                            "p-1 rounded-md shrink-0",
                            message.senderType === "customer"
                              ? "bg-primary/20 dark:bg-primary/30"
                              : "bg-muted"
                          )}
                        >
                          {message.senderType === "customer" ? (
                            <User className="w-2.5 h-2.5 text-primary dark:text-primary-foreground" />
                          ) : (
                            <Bot className="w-2.5 h-2.5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">
                              {message.senderType === "customer"
                                ? message.senderName ||
                                  t("chats.customer", { default: "Customer" })
                                : message.senderName ||
                                  t("chats.agent", { default: "Agent" })}
                            </span>
                          </div>
                          <p className="text-[11px] text-foreground/90 leading-snug line-clamp-1">
                            {message.textClean || message.textRaw}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Gradient fade overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card/80 to-transparent pointer-events-none" />
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground leading-4 line-clamp-1 italic mb-2">
                {t("chats.noPreviewShort", {
                  default: "No preview available yet.",
                })}
              </p>
            )}
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-end gap-2 relative z-10">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleView();
            }}
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs bg-muted/50 border-border hover:bg-muted text-foreground transition-all"
          >
            <Eye className="w-3 h-3 mr-1.5" />
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
            className="h-7 w-7 p-0 bg-destructive/10 border-destructive/30 hover:bg-destructive/20 text-destructive transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </Card>

      {/* Dialog تأكيد الحذف */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div className="absolute inset-0 bg-background/80 dark:bg-black/60 backdrop-blur-sm" />

          <div
            className="relative z-[201] w-full max-w-sm rounded-xl border border-border bg-card/95 backdrop-blur-xl p-5 text-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-md bg-destructive/10">
                <Trash2 className="w-4 h-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold mb-1">
                  {t("confirmDelete")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("thisActionCannotBeUndone") ||
                    "This action cannot be undone."}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-muted/50 border-border hover:bg-muted text-foreground"
                onClick={() => setConfirmOpen(false)}
                disabled={isDeleting}
              >
                {t("cancel") || "Cancel"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="bg-destructive/10 border-destructive/30 hover:bg-destructive/20 text-destructive"
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
