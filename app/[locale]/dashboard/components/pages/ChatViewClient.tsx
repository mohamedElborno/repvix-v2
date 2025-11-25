"use client";

import { useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Clock,
  User,
  Bot,
  Calendar,
  Hash,
  Globe,
  CheckCircle2,
} from "lucide-react";

// Convex types
import type { Doc } from "@/convex/_generated/dataModel";

interface ChatViewClientProps {
  chat: Doc<"chats">;
  messages: Doc<"chatMessages">[];
}

export default function ChatViewClient({
  chat,
  messages,
}: ChatViewClientProps) {
  const t = useTranslations("chat");
  const router = useRouter();
  const locale = useLocale();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on mount
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/40 backdrop-blur-xl border-b border-purple-500/20 rounded-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Back Button */}
            <button
              onClick={() => router.push("/dashboard")}
              className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-zinc-900/80 to-zinc-800/80 hover:from-zinc-800/90 hover:to-zinc-700/90 border border-zinc-700/50 hover:border-purple-500/50 text-gray-300 hover:text-white transition-all duration-300 backdrop-blur-sm"
              dir={locale === "ar" ? "rtl" : "ltr"}
            >
              {locale === "ar" ? (
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              ) : (
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              )}
              <span className="text-sm font-medium">{t("back") || "Back"}</span>
            </button>

            {/* Chat Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white via-purple-200 to-purple-300 bg-clip-text text-transparent truncate">
                    {chat.title || t("untitledChat") || "Untitled Chat"}
                  </h1>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(chat.startedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Metadata */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-700/30">
              <Hash className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs text-gray-300">
                {messages.length} {t("messages") || "messages"}
              </span>
            </div>

            {chat.language && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-700/30">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs text-gray-300 uppercase">
                  {chat.language}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-700/30">
              <CheckCircle2
                className={`w-3.5 h-3.5 ${chat.status === "open" ? "text-green-400" : "text-gray-400"}`}
              />
              <span className="text-xs text-gray-300 capitalize">
                {chat.status}
              </span>
            </div>

            {chat.sourceChannel && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-700/30">
                <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs text-gray-300 capitalize">
                  {chat.sourceChannel}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-gray-600" />
              </div>
              <p className="text-gray-400 text-lg font-medium">
                {t("noMessages") || "No messages found"}
              </p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isCustomer = message.senderType === "customer";
              const isSystem = message.senderType === "system";
              const showTimestamp =
                index === 0 ||
                message.internalTimestamp -
                  messages[index - 1].internalTimestamp >
                  300000; // 5 minutes

              return (
                <div key={message._id}>
                  {/* Timestamp Divider */}
                  {showTimestamp && (
                    <div className="flex items-center justify-center my-6">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-700/30 backdrop-blur-sm">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-xs text-gray-400 font-medium">
                          {formatDate(message.internalTimestamp)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* System Message */}
                  {isSystem ? (
                    <div className="flex justify-center my-4">
                      <div className="px-4 py-2 rounded-full bg-zinc-900/30 border border-zinc-700/20 backdrop-blur-sm">
                        <p className="text-xs text-gray-500 italic">
                          {message.textClean}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Regular Message */
                    <div
                      className={`flex ${isCustomer ? "justify-end" : "justify-start"} mb-2`}
                    >
                      <div
                        className={`group relative max-w-[75%] sm:max-w-[65%] ${
                          isCustomer ? "items-end" : "items-start"
                        }`}
                      >
                        {/* Sender Name */}
                        <div
                          className={`flex items-center gap-2 mb-1.5 ${
                            isCustomer ? "justify-end" : "justify-start"
                          }`}
                        >
                          {!isCustomer && (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                              <Bot className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                          <span
                            className={`text-xs font-medium ${
                              isCustomer ? "text-purple-300" : "text-gray-400"
                            }`}
                          >
                            {message.senderName ||
                              (isCustomer
                                ? t("customer") || "Customer"
                                : t("agent") || "Agent")}
                          </span>
                          {isCustomer && (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                              <User className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`relative group/bubble ${
                            isCustomer
                              ? "bg-gradient-to-br from-purple-600/30 to-purple-500/20 border-purple-500/30"
                              : "bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-zinc-700/50"
                          } backdrop-blur-xl border rounded-2xl px-4 py-3 shadow-lg transition-all duration-300 hover:shadow-xl ${
                            isCustomer
                              ? "hover:shadow-purple-500/20"
                              : "hover:shadow-zinc-700/30"
                          }`}
                        >
                          {/* Glass effect overlay */}
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                          {/* Message Text */}
                          <p className="relative z-10 text-sm leading-relaxed text-gray-100 break-words whitespace-pre-wrap">
                            {message.textClean}
                          </p>

                          {/* Time */}
                          <div
                            className={`flex items-center gap-1 mt-2 ${
                              isCustomer ? "justify-end" : "justify-start"
                            }`}
                          >
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span className="text-[10px] text-gray-500">
                              {formatTime(message.internalTimestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
