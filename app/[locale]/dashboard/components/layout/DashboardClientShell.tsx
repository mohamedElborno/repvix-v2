"use client";

import { SignedIn } from "@clerk/nextjs";
import DashboardLayoutClient from "./DashboardLayoutClient";
import ConvexClientProvider from "@/components/providers/ConvexClientProvider";

export default function DashboardClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  // نشغّل مزوّد Convex فقط بعد تأكدنا أن المستخدم SignedIn
  return (
    <SignedIn>
      <ConvexClientProvider>
        <DashboardLayoutClient>{children}</DashboardLayoutClient>
      </ConvexClientProvider>
    </SignedIn>
  );
}
