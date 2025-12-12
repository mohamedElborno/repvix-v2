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
                      src="/RepvixDashboardDarkMode.png"
                      alt="Repvix Dashboard"
                      width={10000}
                      height={10000}
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <Image
                      src="/RepvixDashboard.png"
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
        <div className="relative rounded-[2.5rem] border-8 border-gray-900 dark:border-black bg-gray-900 dark:bg-black shadow-2xl overflow-hidden transition-all duration-500 hover:scale-105">
          {/* Dynamic Island */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-9 bg-black dark:bg-gray-950 rounded-b-4xl z-10 flex items-center justify-center">
            <div className="flex items-center gap-3 mt-2">
              <div className="w-3 h-3 rounded-full bg-purple-600/50 animate-pulse" />
              <div className="w-14 h-1.5 bg-gray-900 dark:bg-black rounded-full" />
            </div>
          </div>

          {/* Screen Content */}
          <div className="relative bg-white dark:bg-black overflow-hidden">
            {/* Status Bar */}
            <div className="h-14 flex items-center justify-between px-8 pt-2 bg-linear-to-b from-white to-white/98 dark:from-black dark:to-black/98">
              <span className="text-xs font-semibold">9:41</span>
              <div className="flex items-center gap-1.5">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
                </svg>
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13.5-9l1.96 2.5H17V9h2.5zm-1.5 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                  <rect x="15" y="6" width="2" height="2" />
                </svg>
              </div>
            </div>

            {/* App Content */}
            <div className="relative aspect-[9/19.5] w-full">
              <Image
                src="/Repvix.png"
                alt="Repvix Mobile Dashboard"
                fill
                className="object-cover object-top transition-transform duration-500 hover:scale-110"
                priority
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-linear-to-t from-purple-500/10 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Home Indicator - Thinner like iPhone 15 */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/30 dark:bg-white/20 rounded-full" />
        </div>

        {/* Glow effect around phone */}
        <div className="absolute inset-0 bg-linear-to-tr from-purple-500/20 to-fuchsia-500/20 blur-[60px] opacity-50 -z-10 scale-110 animate-pulse" />
      </div>
    </div>
  );
}
