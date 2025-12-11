import IntegrationsClient from "../components/pages/IntegrationsClient";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function IntegrationsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <IntegrationsClient />;
}

