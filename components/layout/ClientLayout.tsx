"use client";

import Clarity from "@/components/analytics/Clarity";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Clarity />
    </>
  );
}
