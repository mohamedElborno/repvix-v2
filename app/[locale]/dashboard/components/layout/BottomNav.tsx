"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  IconBrandTabler,
  IconAnalyze,
  IconPlugConnected,
  IconDots,
  IconCurrencyDollar,
  IconCreditCard,
  IconUsers,
} from "@tabler/icons-react";

export default function BottomNav() {
  const t = useTranslations("header");
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const mainLinks = [
    {
      label: t("dashboard") || "Dashboard",
      href: "/dashboard",
      icon: IconBrandTabler,
    },
    {
      label: t("analytics") || "Analytics",
      href: "/dashboard/analytics",
      icon: IconAnalyze,
    },
    {
      label: t("integrations") || "Integrations",
      href: "/dashboard/integrations",
      icon: IconPlugConnected,
    },
  ];

  const moreLinks = [
    {
      label: t("myTeam") || "My Team",
      href: "/dashboard/my-team",
      icon: IconUsers,
    },
    {
      label: t("pricing") || "Pricing",
      href: "/dashboard/pricing",
      icon: IconCurrencyDollar,
    },
    {
      label: t("billing") || "Billing",
      href: "/dashboard/billing",
      icon: IconCreditCard,
    },
  ];

  const isActive = (href: string) => {
    // Exact match for /dashboard, starts with for others
    if (href === "/dashboard") {
      return pathname === href || pathname?.endsWith("/dashboard");
    }
    return pathname?.includes(href);
  };

  const hasActiveMoreLink = moreLinks.some((link) => isActive(link.href));

  return (
    <>
      {/* Backdrop for More menu */}
      {showMore && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More Menu */}
      {showMore && (
        <div className="md:hidden fixed bottom-18 left-0 right-0 z-50 mx-4 mb-2">
          <div className="bg-card/95 backdrop-blur-lg border border-border rounded-2xl shadow-xl overflow-hidden">
            {moreLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setShowMore(false)}
                  className={`flex items-center gap-3 px-4 py-3 transition-all duration-300 border-b border-border last:border-b-0 ${
                    active
                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                      : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border shadow-lg">
        <div className="flex items-center justify-around px-2 py-2">
          {mainLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 min-w-[70px] ${
                  active
                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-transform duration-300 ${
                    active ? "scale-110" : ""
                  }`}
                />
                <span
                  className={`text-[10px] font-medium transition-all duration-300 ${
                    active ? "font-semibold" : ""
                  }`}
                >
                  {link.label}
                </span>
                {active && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-purple-600 dark:bg-purple-400 rounded-t-full" />
                )}
              </Link>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 min-w-[70px] ${
              hasActiveMoreLink || showMore
                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <IconDots
              className={`h-5 w-5 transition-transform duration-300 ${
                showMore ? "scale-110 rotate-90" : ""
              }`}
            />
            <span
              className={`text-[10px] font-medium transition-all duration-300 ${
                hasActiveMoreLink || showMore ? "font-semibold" : ""
              }`}
            >
              {t("more") || "More"}
            </span>
            {hasActiveMoreLink && !showMore && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-purple-600 dark:bg-purple-400 rounded-t-full" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
