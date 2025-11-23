"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  MessageSquare,
  Plus,
  Search,
  Loader2,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import UploadChatDialog from "../UploadChatDialog";
import ChatListItem from "../ChatListItem";
import InviteEmployeeDialog from "../InviteEmployeeDialog";
import { useTranslations } from "next-intl";
import type { DashboardClientProps } from "../../types/dashboard";
import { useUser } from "@clerk/nextjs";
import type { Id } from "@/convex/_generated/dataModel";

// Lazy load الرسوم البيانية لتحسين الأداء - تحميل فقط عند الحاجة
const ChatVolume = dynamic(() => import("../ChatVolume"), {
  loading: () => (
    <Card className="border-white/10 bg-white/5 h-[500px] w-full">
      <div className="p-4 md:p-5 h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
        </div>
      </div>
    </Card>
  ),
  ssr: false, // تعطيل SSR للرسوم البيانية لتحسين الأداء
});

const KPICards = dynamic(() => import("../KPICards"), {
  loading: () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card
          key={i}
          className="bg-white/5 border-white/10 border p-6 animate-pulse"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-4 bg-white/10 rounded w-24 mb-3"></div>
              <div className="h-8 bg-white/10 rounded w-16 mb-2"></div>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-lg"></div>
          </div>
        </Card>
      ))}
    </div>
  ),
  ssr: false,
});

const SentimentDistribution = dynamic(
  () => import("../SentimentDistribution"),
  {
    loading: () => (
      <Card className="border-white/10 bg-white/5 h-[400px] w-full">
        <div className="p-4 md:p-5 h-full flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
          </div>
        </div>
      </Card>
    ),
    ssr: false,
  }
);

/* const TopIssuesChart = dynamic(() => import("../TopIssuesChart"), {
  loading: () => (
    <Card className="border-white/10 bg-white/5 h-[400px] w-full">
      <div className="p-4 md:p-5 h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
          <p className="text-white/60 text-sm">Loading chart...</p>
        </div>
      </div>
    </Card>
  ),
  ssr: false,
}); */

export default function DashboardClient({
  initialChats,
  stats: _stats,
}: DashboardClientProps) {
  const t = useTranslations("dashboard");
  const { user } = useUser();
  const [chats, setChats] = useState<any[]>(initialChats);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [kpiData, setKpiData] = useState<any>(null);
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(true);

  // تحديث البيانات عند تغيير المستخدم
  useEffect(() => {
    setChats(initialChats);
  }, [initialChats]);

  // الاستماع لتغييرات auth state
  useEffect(() => {
    if (user) {
      setChats(initialChats);
    }
  }, [user]);

  // Filter chats based on search query
  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch KPIs - مرة واحدة فقط عند تحميل الصفحة
  useEffect(() => {
    let isMounted = true;

    const fetchKPIs = async () => {
      try {
        setIsLoadingKPIs(true);
        const response = await fetch("/api/dashboard/kpis");
        if (response.ok && isMounted) {
          const data = await response.json();
          setKpiData(data);
        }
      } catch (error) {
        console.error("Error fetching KPIs:", error);
      } finally {
        if (isMounted) {
          setIsLoadingKPIs(false);
        }
      }
    };

    fetchKPIs();

    return () => {
      isMounted = false;
    };
  }, []); // فارغ - يعمل مرة واحدة فقط

  const handleDeleteChat = async (chatId: string | Id<"chats">) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete chat");
      }

      setChats(chats.filter((chat) => chat.id !== chatId));
    } catch (error) {
      console.error("Error deleting chat:", error);
      alert("Failed to delete chat");
    }
  };
  return (
    <div className="min-h-[calc(100vh-110px)]">
      {/* Header with gradient background */}
      <div className="sticky px-3 sm:px-4 md:px-6 lg:px-8 mx-auto top-0 z-10 bg-zinc-950/70 backdrop-blur-xl border-b border-purple-500/10 rounded-2xl mb-6">
        <div className="py-4 sm:py-5 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-purple-300 bg-clip-text text-transparent">
                  {t("welcome")}
                </h1>
                <p className="text-sm sm:text-base text-gray-400 mt-1 truncate">
                  {user?.emailAddresses[0]?.emailAddress || "No email"}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsUploadDialogOpen(true)}
              className="group relative bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/30 transition-all duration-300 shrink-0"
            >
              <div className="relative flex items-center gap-2">
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-white/20 group-hover:bg-white/30 transition-all duration-300 scale-0 group-hover:scale-100"></div>
                  <Plus className="w-4 h-4 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
                </div>
                <span className="font-medium">{t("uploadChat")}</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-white/0 via-white/50 to-white/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative mt-4 sm:mt-5">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-purple-400 transition-colors duration-300" />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-gradient-to-r from-gray-800/60 to-gray-800/40 border border-gray-700/50 hover:border-purple-500/50 focus:border-purple-500/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 backdrop-blur-sm"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/0 via-purple-500/0 to-purple-500/0 group-focus-within:from-purple-500/5 group-focus-within:via-purple-500/10 group-focus-within:to-purple-500/5 transition-all duration-300 pointer-events-none"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 sm:gap-8">
        {/* KPI Cards */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-pink-500/10 to-purple-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
          <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                {t("keyMetrics") || "Key Metrics"}
              </h2>
            </div>
            {isLoadingKPIs ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-zinc-900/50 border border-zinc-700/30 rounded-xl p-6 animate-pulse"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="h-4 bg-white/10 rounded w-24 mb-3"></div>
                        <div className="h-8 bg-white/10 rounded w-16 mb-2"></div>
                      </div>
                      <div className="w-12 h-12 bg-white/10 rounded-lg"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : kpiData ? (
              <KPICards data={kpiData.kpis} />
            ) : null}
          </div>
        </div>

        {/* Additional Charts */}
        {isLoadingKPIs ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-cyan-500/10 to-blue-600/20 rounded-2xl blur-xl opacity-50 transition duration-500"></div>
                <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl border border-blue-500/20 h-[400px] animate-pulse">
                  <div className="p-4 md:p-5 h-full">
                    <div className="h-6 bg-white/10 rounded w-32 mb-4"></div>
                    <div className="h-full bg-white/10 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : kpiData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-cyan-500/10 to-blue-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl border border-blue-500/20">
                <ChatVolume />
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-pink-500/10 to-purple-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl border border-purple-500/20">
                <SentimentDistribution
                  data={kpiData.charts.sentimentDistribution}
                />
              </div>
            </div>
            {/*           <div className="relative group lg:col-span-2">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/20 via-green-500/10 to-emerald-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl border border-emerald-500/20">
                <TopIssuesChart data={kpiData.charts.topIssues} />
              </div>
            </div> */}
          </div>
        ) : null}

        {/* Chats List */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600/20 via-purple-500/10 to-indigo-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
          <div className="relative bg-gradient-to-br from-zinc-800/70 to-zinc-950/70 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-indigo-500/20">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                  {t("yourChats")}
                </h2>
              </div>
            </div>
            {filteredChats.length === 0 ? (
              <div className="relative group/empty">
                <div className="absolute -inset-1 bg-gradient-to-r from-gray-800/20 via-gray-700/10 to-gray-800/20 rounded-xl blur-lg opacity-50"></div>
                <div className="relative bg-gradient-to-br from-zinc-900/50 to-zinc-950/50 rounded-xl p-12 text-center border border-gray-700/30">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 flex items-center justify-center">
                    <MessageSquare className="w-10 h-10 text-gray-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white/90 mb-2">
                    {searchQuery ? t("noResults") : t("noChats")}
                  </h3>
                  <p className="text-gray-400 text-sm sm:text-base mb-6 max-w-md mx-auto">
                    {searchQuery
                      ? t("tryDifferentSearch")
                      : t("uploadFirstChat")}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={() => setIsUploadDialogOpen(true)}
                      className="group/btn relative bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/30 transition-all duration-300"
                    >
                      <div className="relative flex items-center gap-2">
                        <div className="relative w-5 h-5 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full bg-white/20 group-hover/btn:bg-white/30 transition-all duration-300 scale-0 group-hover/btn:scale-100"></div>
                          <Plus className="w-4 h-4 relative z-10 group-hover/btn:rotate-90 transition-transform duration-300" />
                        </div>
                        <span className="font-medium">{t("uploadChat")}</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-white/0 via-white/50 to-white/0 scale-x-0 group-hover/btn:scale-x-100 transition-transform duration-300"></div>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/*                 {filteredChats.map((chat) => (
                  <ChatListItem
                    key={chat.id}
                    chat={chat}
                    onDelete={handleDeleteChat}
                  />
                ))} */}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      <UploadChatDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
      />

      {/* Invite Employee Dialog */}
      {/*       <InviteEmployeeDialog
        isOpen={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
        onInviteSent={() => {
          // يمكن إضافة إشعار أو تحديث هنا
        }}
      /> */}
    </div>
  );
}
