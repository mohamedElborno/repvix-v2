import { auth } from "@clerk/nextjs/server";
import { ChatListItemData } from "./components/ChatListItem";
import DashboardClient from "./components/pages/DashboardClient";
import { getConvexServerClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // No active organization yet -> send user to setup flow
  if (!orgId) {
    redirect("/dashboard/setup");
  }

  const convex = await getConvexServerClient();
  let initialChats: ChatListItemData[] = [];
  let stats = null as { totalChats: number; totalChunks: number } | null; // مؤقتًا، لو عندك API للـ KPIs خليه كما هو

  if (orgId) {
    const convexOrgId = await convex.query(api.orgs.getByClerkId, {
      clerkOrgId: orgId,
    });

    if (convexOrgId) {
      // Load only first 8 chats initially, rest will be loaded via infinite scroll
      const result = await convex.query(api.chats.listForDashboard, {
        organizationId: convexOrgId,
        paginationOpts: {
          numItems: 8,
          cursor: null,
        },
      });
      // Handle paginated result
      initialChats = result?.page || [];
    }
  }

  // Get user chats and stats
  return <DashboardClient key={userId} initialChats={initialChats} />;
}
