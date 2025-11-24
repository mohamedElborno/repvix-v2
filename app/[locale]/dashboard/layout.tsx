"use server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardLayoutClient from "./components/layout/DashboardLayoutClient";
import { getConvexServerClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId } = await auth();

  if (!userId) redirect("/sign-in");

  if (userId && orgId) {
    const clerk = await clerkClient();
    const convex = await getConvexServerClient();

    // 1) جلب بيانات المنظمة
    const org = await clerk.organizations.getOrganization({
      organizationId: orgId,
    });

    // 2) *** إنشاء أو مزامنة المنظمة ***
    const convexOrgId = await convex.mutation(api.orgs.syncOrganization, {
      clerkOrgId: org.id,
      name: org.name,
      createdBy: userId,
    });

    // 3) جلب الأعضاء من Clerk
    const memberships = await clerk.organizations.getOrganizationMembershipList(
      {
        organizationId: orgId,
      }
    );

    // 4) مزامنة الأعضاء
    await convex.mutation(api.orgs.syncOrganizationMembers, {
      clerkOrgId: org.id,
      members: memberships.data.map((m) => ({
        clerkUserId: m.publicUserData?.userId || "",
        name:
          m.publicUserData?.firstName && m.publicUserData?.lastName
            ? `${m.publicUserData.firstName} ${m.publicUserData.lastName}`
            : m.publicUserData?.identifier || "",
        email: m.publicUserData?.identifier || "",
        role: m.role,
        imageUrl: m.publicUserData?.imageUrl || "",
      })),
    });
  }

  return <DashboardLayoutClient key={userId}>{children}</DashboardLayoutClient>;
}
