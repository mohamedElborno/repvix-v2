"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function DashboardMockup() {
  const locale = useLocale();
  const isRTL = locale === "ar";
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative w-full max-w-6xl">
      {/* Glow Effect Behind */}
      <div className="absolute inset-0 bg-linear-to-tr from-purple-500/10 via-fuchsia-500/10 to-purple-500/10 blur-[100px] opacity-60" />

      {/* Desktop: Classic Browser Mockup with Animation */}
      <div className="hidden lg:block relative group">
        {/* Mockup Container with Hover Animation */}
        <div className="relative rounded-3xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-700 hover:shadow-3xl hover:scale-[1.02] hover:-translate-y-2">
          {/* Browser Chrome */}
          <div className="h-10 border-b border-white/10 flex items-center gap-2 px-5 bg-white/5 dark:bg-black/10">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80 transition-all duration-300 group-hover:bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80 transition-all duration-300 group-hover:bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500/80 transition-all duration-300 group-hover:bg-green-500" />
            </div>
            <div
              className={`${isRTL ? "mr-auto" : "ml-auto"} flex items-center gap-2 px-4 py-1 rounded-md bg-white/5 dark:bg-black/20 transition-all duration-300 group-hover:bg-white/10 dark:group-hover:bg-black/30`}
            >
              <div className="w-3 h-3 rounded-full bg-purple-500/50 animate-pulse" />
              <span className="text-xs text-muted-foreground">repvix.com</span>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="bg-linear-to-br from-purple-500/5 via-transparent to-fuchsia-500/5">
            <div className="relative aspect-video w-full rounded-b-xl overflow-hidden border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur-sm">
              {mounted && (
                <>
                  {theme === "dark" ? (
                    <Image
                      src="/demo-preview.svg"
                      alt="Repvix Dashboard"
                      width={10000}
                      height={10000}
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <Image
                      src="/demo-preview.svg"
                      alt="Repvix Dashboard"
                      width={10000}
                      height={10000}
                      className="object-cover"
                      priority
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: iPhone 15 Pro Mockup Style */}
      <div className="lg:hidden relative mx-auto" style={{ maxWidth: "380px" }}>
        {/* iPhone Frame - Squared edges like iPhone 15 Pro */}
        <Image
          src={
            mounted && theme === "dark"
              ? "/demo-preview.svg"
              : "/demo-preview.svg"
          }
          alt="Repvix Dashboard"
          width={10000}
          height={10000}
          className="object-cover"
          priority
        />

        {/* Glow effect around phone */}
        <div className="absolute inset-0 bg-linear-to-tr from-purple-500/20 to-fuchsia-500/20 blur-[60px] opacity-50 -z-10 scale-110 animate-pulse" />
      </div>
    </div>
  );
}
