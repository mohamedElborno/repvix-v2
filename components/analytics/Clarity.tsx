"use client";

import Script from "next/script";

export default function Clarity() {
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

  if (!clarityId) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Clarity] NEXT_PUBLIC_CLARITY_ID is missing");
    }
    return null;
  }

  return (
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
      src={`https://www.clarity.ms/tag/${clarityId}`}
    />
  );
}
