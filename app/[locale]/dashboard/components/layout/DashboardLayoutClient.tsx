"use client";

import { useEffect, useState } from "react";
import {
  IconAnalyze,
  IconBrandTabler,
  IconCreditCard,
  IconCurrencyDollar,
  IconPlugConnected,
  IconUsers,
} from "@tabler/icons-react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { DashboardNavbar } from "./DashboardNavbar";
import Logo from "./Logo";
import type { DashboardLayoutClientProps } from "../../types/dashboard";
import { NavUser } from "../NavUser";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import BottomNav from "./BottomNav";

export default function DashboardLayoutClient({
  children,
}: DashboardLayoutClientProps) {
  const t = useTranslations("header");

  const links = [
    {
      label: t("dashboard") || "Dashboard",
      href: "/dashboard",
      icon: (
        <IconBrandTabler className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: t("analytics") || "Analytics",
      href: "/dashboard/analytics",
      icon: (
        <IconAnalyze className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: t("integrations") || "Integrations",
      href: "/dashboard/integrations",
      icon: (
        <IconPlugConnected className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: t("myTeam") || "My Team",
      href: "/dashboard/my-team",
      icon: (
        <IconUsers className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: t("pricing") || "Pricing",
      href: "/dashboard/pricing",
      icon: (
        <IconCurrencyDollar className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: t("billing") || "Billing",
      href: "/dashboard/billing",
      icon: (
        <IconCreditCard className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    /*     {
      label: t("settings") || "Settings",
      href: "/dashboard/settings",
      icon: (
        <IconSettings className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    }, */
  ];
  const [open, setOpen] = useState(false);

  // Open sidebar by default on medium+ screens, keep closed on small screens
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDesktop = window.innerWidth >= 768;
    setOpen(isDesktop);
  }, []);

  return (
    <div className="mx-auto h-screen flex w-full flex-1 flex-col overflow-hidden md:flex-row">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar open={open} setOpen={setOpen}>
          <SidebarBody className="justify-between gap-10">
            <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
              <Link href={`/`}>
                <Logo open={open} />
              </Link>
              <div className="mt-8 flex flex-col gap-2">
                {links.map((link, idx) => (
                  <SidebarLink key={idx} link={link} />
                ))}
              </div>
            </div>
            <div>
              <NavUser />
            </div>
          </SidebarBody>
        </Sidebar>
      </div>

      {/* Main Content */}
      <div className="flex flex-col w-full h-full overflow-hidden overflow-y-auto p-0 pb-16 md:p-2 md:pb-2">
        <div className="dark:bg-muted/20 bg-neutral-100/50 md:rounded-2xl h-auto">
          <DashboardNavbar onToggleSidebar={() => setOpen(!open)} />
          <div className="gap-4 p-4 md:gap-6 md:p-6">{children}</div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
