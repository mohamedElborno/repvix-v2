import { auth } from "@clerk/nextjs/server";
import { ChatListItemData } from "./components/ChatListItem";
import DashboardClient from "./components/pages/DashboardClient";
import { getConvexServerClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

export default async function ProtectedPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    // redirect to sign-in أو أي شيء حسب منطقك
    // redirect("/sign-in");
    throw new Error("Unauthorized");
  }

  const convex = await getConvexServerClient();
  let initialChats: ChatListItemData[] = [];
  let stats = null as { totalChats: number; totalChunks: number } | null; // مؤقتًا، لو عندك API للـ KPIs خليه كما هو

  if (orgId) {
    const convexOrgId = await convex.query(api.orgs.getByClerkId, {
      clerkOrgId: orgId,
    });

    if (convexOrgId) {
      initialChats = await convex.query(api.chats.listForDashboard, {
        organizationId: convexOrgId,
        limit: 50,
      });
    }
  }

  // Get user chats and stats
  return <DashboardClient key={userId} initialChats={initialChats} />;
}
