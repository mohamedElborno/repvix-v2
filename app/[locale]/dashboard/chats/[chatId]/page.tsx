/* import { redirect } from "next/navigation";
import { createClient } from "@/lib/server/server";
import { getChatWithChunks } from "@/lib/services/chat-service";
import ChatViewClient from "@/app/[locale]/dashboard/components/pages/ChatViewClient";

import type { Id } from "@/convex/_generated/dataModel";

export default async function ChatViewPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  // chatId comes from URL as string, but we need to cast it to Id<"chats"> when using with Convex
  const chatIdTyped = chatId as Id<"chats">;
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  try {
    const { chat, chunks } = await getChatWithChunks(chatId);

    // التحقق من ملكية المحادثة
    if (chat.user_id !== user.id) {
      redirect("/dashboard");
    }

    return <ChatViewClient chat={chat} chunks={chunks} />;
  } catch (error) {
    console.error("Error loading chat:", error);
    redirect("/dashboard");
  }
}
 */

import React from "react";

export default function page() {
  return <div></div>;
}
