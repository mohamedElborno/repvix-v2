/* import { redirect } from "next/navigation";
import { createClient } from "@/lib/server/server";
import GlobalAnalyticsClient from "@/app/[locale]/dashboard/components/pages/GlobalAnalyticsClient";

export default async function GlobalAnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <GlobalAnalyticsClient
      user={{
        id: user.id,
        email: user.email || "",
      }}
    />
  );
}
 */

export default function page() {
  return <div></div>;
}
