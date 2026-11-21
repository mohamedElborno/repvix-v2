"use server";
import { syncClerkOrganization } from "@/lib/syncClerkOrganization";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardLayoutClient from "./components/layout/DashboardLayoutClient";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId } = await auth();

  if (!userId) redirect("/sign-in");

  if (userId && orgId) {
    await syncClerkOrganization(orgId);
  }

  return <DashboardLayoutClient key={userId}>{children}</DashboardLayoutClient>;
}
