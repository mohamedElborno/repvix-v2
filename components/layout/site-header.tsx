"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  Briefcase,
  Tag,
  HelpCircle,
  Home,
  Sparkles,
  Settings,
  LayoutDashboard,
  BarChart3,
} from "lucide-react";
import { GlassElement } from "./GlassElement/GlassElement";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export function SiteHeader() {
  const t = useTranslations("header");
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useUser();
  console.log("user", user);

  // Check if we are on a protected route
  const isProtectedRoute = pathname?.includes("/protected");

  const publicLinks = [
    { href: "#hero", label: t("hero"), icon: Home },
    { href: "#features", label: t("features"), icon: Sparkles },
    { href: "#howItWorks", label: t("howItWorks"), icon: Briefcase },
    { href: "#pricing", label: t("pricing"), icon: Tag },
    { href: "#faq", label: t("faq"), icon: HelpCircle },
  ];

  const protectedLinks = [
    {
      href: "/dashboard",
      label: t("dashboard") || "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/protected/analytics",
      label: t("analytics") || "Analytics",
      icon: BarChart3,
    },
    {
      href: "/protected/settings",
      label: t("settings") || "Settings",
      icon: Settings,
    },
  ];

  const links = isProtectedRoute ? protectedLinks : publicLinks;

  return (
    <div className="sticky max-w-[90vw] 2xl:max-w-[1400px] mx-auto flex items-center justify-center top-2 sm:top-4 z-50 gap-2">
      <GlassElement
        className="mx-auto rounded-full flex items-center justify-between w-full max-w-[90vw] shadow-2xl"
        styles={{
          background: "rgba(99, 99, 99, 0.089)",
          boxShadow: "inset 0 0 4px 0px rgba(255, 255, 255, 0.192)",
        }}
        height={55}
        width={1400}
        radius={999}
        depth={2}
      >
        {/* Logo - Left side */}
        <div className="flex items-center pointer-events-auto p-4">
          <Image
            src={`/logo.png`}
            alt={t("logoAlt") || "Repvix logo"}
            width={500}
            height={500}
            className="h-8 w-auto dark:invert shrink-0 hover:scale-105 transition-all duration-300 cursor-pointer hover:rotate-6"
          />
        </div>

        {/* Navigation - Center */}
        <ul className="absolute left-1/2 transform -translate-x-1/2 hidden xl:flex items-center gap-4 md:gap-6 lg:gap-8 pointer-events-auto">
          {links.map((link) => (
            <li key={link.href} className="cursor-pointer">
              <Link
                href={link.href}
                className="flex items-center text-white gap-1 md:gap-2 hover:text-purple-500 transition-all duration-300 hover:scale-105 group"
              >
                <link.icon className="size-3 md:size-4 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300" />
                <span
                  className="text-xs md:text-sm tracking-[0.1em] font-semibold"
                  style={{
                    // text-shadow syntax: offset-x offset-y blur color (no spread)
                    textShadow: "0 0 16px rgba(255, 255, 255)",
                  }}
                >
                  {link.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {/* Buttons - Right side */}
        <div className="flex items-center gap-2 pointer-events-auto p-1 xl:p-2">
          {user ? (
            <Link href="/dashboard">
              <Button className="hidden xl:block rounded-full hover:scale-[1.04] transition-all duration-300 cursor-pointer text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">
                {t("dashboard")}
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-up">
                <Button className="hidden xl:block rounded-full hover:scale-[1.04] transition-all duration-300 cursor-pointer text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">
                  {t("signUp")}
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button className="hidden xl:block rounded-full bg-purple-600 hover:bg-purple-600/80 hover:scale-[1.04] transition-all duration-300 cursor-pointer text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">
                  {t("signIn")}
                </Button>
              </Link>
            </>
          )}

          {/* Mobile Menu Button */}
          <Button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex flex-col space-y-[3px] rounded-pill bg-transparent hover:bg-transparent items-center justify-center gap-1 h-9 w-9 m-2 xl:hidden rounded-full hover:scale-[1.04] transition-all duration-300 cursor-pointer p-2"
          >
            <span
              className={`w-6 h-[1px] bg-white transition-all duration-400 rounded-pill ${
                isMobileMenuOpen ? "rotate-45 translate-y-[4px] w-5" : ""
              }`}
              style={{
                boxShadow: "0 0 8px 4px rgba(255, 255, 255, 0.192)",
              }}
            ></span>
            <span
              className={`w-6 h-[1px] bg-white transition-all duration-400 rounded-pill ${
                isMobileMenuOpen ? "-rotate-45 -translate-y-[4px] w-5" : ""
              }`}
              style={{
                boxShadow: "0 0 8px 4px rgba(255, 255, 255, 0.192)",
              }}
            ></span>
          </Button>
        </div>
      </GlassElement>
      <LocaleSwitcher />
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed left-0 right-0 top-16 mt-4 shadow-2xl xl:hidden max-w-[90vw] max-h-fit z-50 mx-auto rounded-3xl backdrop-blur-sm"
          style={{
            background: "rgba(99, 99, 99, 0.089)",
            boxShadow: "inset 0 0 4px 0px rgba(255, 255, 255, 0.192)",
          }}
        >
          <div className="flex flex-col space-y-2 p-4">
            {links.map((link, index) => (
              <Button
                key={index}
                className="max-w-full justify-start rounded-full bg-transparent hover:bg-transparent"
              >
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <link.icon className="w-4 h-4 shadow-lg" />
                  <span
                    className="text-sm font-medium"
                    style={{
                      textShadow: "0 0 12px rgba(255, 255, 255, 255)",
                    }}
                  >
                    {link.label}
                  </span>
                </Link>
              </Button>
            ))}
            {user ? (
              <Button className="rounded-full cursor-pointer text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">
                <Link href="/dashboard">{t("dashboard")}</Link>
              </Button>
            ) : (
              <>
                <Button className="rounded-full cursor-pointer text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">
                  <Link href="/sign-up">{t("signUp")}</Link>
                </Button>
                <Button className="rounded-full bg-purple-600 cursor-pointer text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">
                  <Link href="/sign-in">{t("signIn")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
