import GlobalAnalyticsClient from "@/app/[locale]/dashboard/components/pages/GlobalAnalyticsClient";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function GlobalAnalyticsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  return <GlobalAnalyticsClient />;
}
