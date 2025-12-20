"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { track } from "@/lib/metaPixel";

export default function SignupSuccessPixel() {
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;

    const userId = user?.id;
    if (!userId) return;

    // Prevent duplicate firing per user
    const storageKey = `px_signup_tracked:${userId}`;
    const already = localStorage.getItem(storageKey);
    if (already) return;

    const eventID =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now());

    track(
      "CompleteRegistration",
      {
        // optional params
        // value: 0,
        // currency: "USD",
      },
      { eventID }
    );

    localStorage.setItem(storageKey, eventID);
  }, [isLoaded, isSignedIn, user]);

  return null;
}
