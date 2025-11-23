/* import { redirect } from "next/navigation";
import { getConvexServerClient } from "@/lib/convex";
import SettingsClient from "@/app/[locale]/dashboard/components/pages/SettingsClient";
import { requireUser } from "@/convex/auth";

export default async function SettingsPage() {
  const convex = getConvexServerClient();

  const user = await requireUser(convex);

  return <SettingsClient user={user} />;
}
 */
import React from "react";

export default function page() {
  return <div></div>;
}
