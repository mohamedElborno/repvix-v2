"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sidebar } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import LocaleSwitcher from "./LocaleSwitcher";
import ThemeSwitcher from "./ThemeSwitcher";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { MobileNavUser } from "./MobileNavUser";

interface DashboardNavbarProps {
  onToggleSidebar: () => void;
}

export function DashboardNavbar({ onToggleSidebar }: DashboardNavbarProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const tBreadcrumb = useTranslations("dashboard.breadcrumb");

  // Generate breadcrumb items based on pathname
  const getBreadcrumbItems = () => {
    const items = [];
    const pathSegments = pathname?.split("/").filter(Boolean) || [];

    // Remove locale from segments if present
    const segments = pathSegments.filter(
      (seg) => !["ar", "en", "fr", "tr", "es", "hi", "ja"].includes(seg)
    );

    // Filter out "dashboard" from segments since we always add it first
    const segmentsWithoutDashboard = segments.filter(
      (seg) => seg !== "dashboard"
    );

    // Always start with Dashboard
    items.push({
      label: tBreadcrumb("dashboard"),
      href: `/${locale}/dashboard`,
      isActive: segmentsWithoutDashboard.length === 0,
    });

    // Add other segments (excluding "dashboard")
    if (segmentsWithoutDashboard.length > 0) {
      const currentPath: string[] = [];
      segmentsWithoutDashboard.forEach((segment, index) => {
        currentPath.push(segment);
        const isLast = index === segmentsWithoutDashboard.length - 1;

        let label = segment;
        if (segment === "analytics") label = tBreadcrumb("analytics");
        else if (segment === "integrations")
          label = tBreadcrumb("integrations");
        else if (segment === "my-team") label = tBreadcrumb("myTeam");
        else if (segment === "settings") label = tBreadcrumb("settings");
        else if (segment === "profile") label = tBreadcrumb("profile");
        else if (segment === "chats") label = tBreadcrumb("chats");
        else if (segment === "edit") label = tBreadcrumb("edit");
        else if (segment === "billing") label = tBreadcrumb("billing");
        else if (segment === "pricing") label = tBreadcrumb("pricing");
        else if (segment.match(/^[a-f0-9-]+$/)) {
          // UUID or similar - could be employee ID or chat ID
          if (segmentsWithoutDashboard.includes("my-team")) {
            label = tBreadcrumb("employee");
          } else if (segmentsWithoutDashboard.includes("chats")) {
            label = tBreadcrumb("chat");
          } else {
            label = segment;
          }
        }

        items.push({
          label,
          href: `/${locale}/dashboard/${currentPath.join("/")}`,
          isActive: isLast,
        });
      });
    }

    return items;
  };

  const breadcrumbItems = getBreadcrumbItems();

  return (
    <div className="flex flex-col gap-2 top-0 z-50">
      {/* Desktop Navbar */}
      <header className="hidden md:flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) py-2">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="flex p-0"
            onClick={onToggleSidebar}
          >
            <Sidebar />
          </Button>
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbItems.map((item, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {item.isActive ? (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={item.href}>{item.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <div
            className={`flex items-center gap-2 ${locale === "ar" ? "mr-auto" : "ml-auto"}`}
          >
            <ThemeSwitcher />
            <LocaleSwitcher />
          </div>
        </div>
      </header>

      {/* Mobile Navbar */}
      <header className="md:hidden flex items-center justify-between gap-2 border-b border-border bg-card/80 backdrop-blur-sm px-4 py-2.5 z-50">
        <MobileNavUser />
        <div className="flex items-center gap-2 z-50">
          <ThemeSwitcher />
          <LocaleSwitcher />
        </div>
      </header>
    </div>
  );
}
