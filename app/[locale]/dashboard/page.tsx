"use client";

import DashboardClient from "./components/pages/DashboardClient";
import { useAuth } from "@clerk/nextjs";

export default function ProtectedPage() {
  const { userId } = useAuth();

  // Get user chats and stats
  return (
    <DashboardClient
      key={userId}
      initialChats={[]}
      stats={{ totalChats: 0, totalChunks: 0 }}
      user={{ id: userId || "", email: "", name: "", image: "" }}
    />
  );
}
