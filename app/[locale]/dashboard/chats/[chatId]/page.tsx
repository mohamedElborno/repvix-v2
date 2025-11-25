// app/[locale]/(dashboard)/dashboard/chats/[chatId]/page.tsx

import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import ChatViewClient from "../../components/pages/ChatViewClient";
import { getConvexServerClient } from "@/lib/convex";

interface PageProps {
  params: Promise<{ locale: string; chatId: string }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { chatId } = await params;
  const { userId, orgId } = await auth();
  console.log("chatId", chatId);

  if (!userId || !orgId) {
    notFound();
  }

  const convex = await getConvexServerClient();

  // استدعاء المحادثة + الرسائل
  const data = await convex.query(api.chats.getChatWithMessages, {
    chatId: chatId as Id<"chats">,
  });

  if (!data || !data.chat) {
    notFound();
  }

  return <ChatViewClient chat={data.chat} messages={data.messages} />;
}
