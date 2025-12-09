"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export default function SSOCallbackPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const t = useTranslations("ssoCallback");

  useEffect(() => {
    if (!isSignedIn) return;

    // Extract locale from the URL: /ar/sso-callback → "ar"
    const locale = pathname.split("/")[1] || "en";

    // Redirect to the localized setup page
    router.replace(`/${locale}/dashboard/setup`);
  }, [isSignedIn, pathname, router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 text-center shadow-[0_0_40px_rgba(0,0,0,0.4)]">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-purple-500/60 border-t-transparent animate-spin" />
        <p className="text-lg font-semibold text-white">
          {t("processingTitle")}
        </p>
        <p className="mt-2 text-sm text-white/70">{t("processingSubtitle")}</p>
      </div>
    </div>
  );
}
