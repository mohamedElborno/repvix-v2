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
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useLocale } from "next-intl";

export function SiteHeader() {
  const t = useTranslations("header");
  const pathname = usePathname();
  const locale = useLocale();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useUser();

  // Check if we are on a protected route
  const isProtectedRoute = pathname?.includes("/protected");

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const publicLinks = [
    { href: `/${locale}/#hero`, label: t("hero"), icon: Home },
    { href: `/${locale}/#features`, label: t("features"), icon: Sparkles },
    { href: `/${locale}/#howItWorks`, label: t("howItWorks"), icon: Briefcase },
    { href: `/${locale}/#pricing`, label: t("pricing"), icon: Tag },
    { href: `/${locale}/#faq`, label: t("faq"), icon: HelpCircle },
  ];

  const protectedLinks = [
    {
      href: `/${locale}/dashboard`,
      label: t("dashboard") || "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: `/${locale}/dashboard/analytics`,
      label: t("analytics") || "Analytics",
      icon: BarChart3,
    },
    {
      href: `/${locale}/dashboard/settings`,
      label: t("settings") || "Settings",
      icon: Settings,
    },
  ];

  const links = isProtectedRoute ? protectedLinks : publicLinks;

  // Check if current locale is RTL (Arabic)
  const isRTL = locale === "ar";

  return (
    <>
      <div className="sticky max-w-[95vw] 2xl:max-w-[1600px] mx-auto flex items-center justify-center top-4 z-50 gap-2">
        {/* Desktop: GlassElement, Mobile: Simple backdrop blur */}
        <div className="hidden xl:block w-full max-w-[95vw]">
          <GlassElement
            className="mx-auto rounded-3xl flex items-center justify-between w-full transition-all duration-500"
            styles={{
              background: isScrolled
                ? "rgba(99, 99, 99, 0.089)"
                : "transparent",
              boxShadow: isScrolled
                ? "0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 0 4px 0px rgba(255, 255, 255, 0.192)"
                : "inset 0 0 0px 0px rgba(255, 255, 255, 0.192)",
            }}
            height={60}
            width={1472}
            radius={25}
            depth={2}
          >
            {/* Logo - Left side */}
            <div className="flex items-center pointer-events-auto p-4 relative">
              <Image
                src={`/RepvixLogo.png`}
                alt={t("logoAlt") || "Repvix logo"}
                width={500}
                height={500}
                className="h-7 w-auto dark:invert shrink-0 hover:scale-105 transition-all duration-300 cursor-pointer hover:rotate-6"
              />
              {/* Beta Badge */}
              <span
                className={`absolute top-2 ${isRTL ? "-left-5" : "-right-5"} bg-linear-to-r from-purple-600 to-purple-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-lg border border-purple-400/30`}
              >
                {t("beta")}
              </span>
            </div>

            {/* Navigation - Center */}
            <ul className="absolute right-1/2 transform translate-x-1/2 hidden xl:flex items-center gap-4 md:gap-6 lg:gap-12 pointer-events-auto">
              {links.map((link) => (
                <li key={link.href} className="cursor-pointer">
                  <Link
                    href={link.href}
                    className="flex items-center text-foreground gap-1 md:gap-2 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-300 hover:scale-105 group"
                  >
                    <span className="text-xs md:text-[16px] font-semibold">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {/* Buttons - Right side */}
            <div className="flex items-center gap-2 pointer-events-auto p-1 xl:p-4">
              {user ? (
                <Link href={`/${locale}/dashboard`}>
                  <Button className="hidden cursor-pointer xl:flex items-center gap-2 rounded-2xl bg-linear-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold px-6 py-2.5 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300">
                    {t("dashboard")}
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href={`/${locale}/sign-up`}>
                    <Button
                      variant="ghost"
                      className="hidden xl:block rounded-2xl hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:text-purple-600 dark:hover:text-purple-400 hover:scale-105 transition-all duration-300 font-medium px-5 py-2"
                    >
                      {t("signUp")}
                    </Button>
                  </Link>
                  <Link href={`/${locale}/sign-in`}>
                    <Button className="hidden xl:block rounded-2xl bg-linear-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold px-6 py-2.5 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300">
                      {t("signIn")}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </GlassElement>
        </div>

        {/* Mobile version with simple backdrop blur */}
        <div
          className={`xl:hidden w-full max-w-[95vw] rounded-3xl backdrop-blur-xl bg-background/80 flex items-center justify-between h-[60px] transition-all duration-500 ${
            isScrolled ? "border border-border/50 shadow-2xl" : ""
          }`}
        >
          {/* Logo - Left side */}
          <div className="flex items-center pointer-events-auto p-4 relative">
            <Image
              src={`/RepvixLogo.png`}
              alt={t("logoAlt") || "Repvix logo"}
              width={500}
              height={500}
              className="h-8 w-auto dark:invert shrink-0 hover:scale-105 transition-all duration-300 cursor-pointer hover:rotate-6"
            />
            {/* Beta Badge */}
            <span
              className={`absolute -top-1 ${isRTL ? "-left-1" : "-right-1"} bg-linear-to-r from-purple-600 to-purple-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-lg border border-purple-400/30`}
            >
              {t("beta")}
            </span>
          </div>

          {/* Mobile Menu Button */}
          <Button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex flex-col space-y-[3px] rounded-pill bg-transparent hover:bg-transparent items-center justify-center gap-1 h-9 w-9 m-2 rounded-2xl hover:scale-[1.04] transition-all duration-300 cursor-pointer p-2"
          >
            <span
              className={`w-6 h-[1.5px] bg-foreground transition-all duration-400 rounded-pill ${
                isMobileMenuOpen ? "rotate-45 translate-y-[4px] w-5" : ""
              }`}
            ></span>
            <span
              className={`w-6 h-[1.5px] bg-foreground transition-all duration-400 rounded-pill ${
                isMobileMenuOpen ? "-rotate-45 -translate-y-[4px] w-5" : ""
              }`}
            ></span>
          </Button>
        </div>

        {/* Desktop: Theme & Language Switcher */}
        <div className="hidden xl:block">
          <GlassElement
            height={60}
            width={120}
            radius={25}
            depth={2}
            styles={{
              background: isScrolled
                ? "rgba(99, 99, 99, 0.089)"
                : "transparent",
              boxShadow: isScrolled
                ? "0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 0 4px 0px rgba(255, 255, 255, 0.192)"
                : "inset 0 0 0px 0px rgba(255, 255, 255, 0.192)",
            }}
            className="rounded-3xl flex items-center justify-center gap-2 transition-all duration-500"
          >
            <ThemeToggle />
            <LocaleSwitcher />
          </GlassElement>
        </div>

        {/* Mobile: Theme & Language Switcher */}
        <div
          className={`xl:hidden rounded-3xl backdrop-blur-xl bg-background/80 flex items-center justify-center h-[60px] px-2 gap-2 transition-all duration-500 ${
            isScrolled ? "border border-border/50 shadow-2xl" : ""
          }`}
        >
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="fixed left-0 right-0 top-16 mt-4 xl:hidden max-w-[95vw] max-h-fit z-50 mx-auto rounded-3xl backdrop-blur-xl bg-background/95 border border-border/50 shadow-xl">
            <div className="p-2 space-y-2">
              {links.map((link, index) => {
                return (
                  <button
                    key={index}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center gap-3 text-left rounded-3xl transition-all duration-300 group hover:bg-white/20 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/10 active:scale-95 active:bg-white/30 ease-out"
                  >
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl dark:text-white text-black"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <link.icon className="w-4 h-4 shadow-lg" />
                      <span
                        className="text-sm font-medium dark:text-white text-black"
                        style={{
                          textShadow: "0 0 12px rgba(255, 255, 255, 255)",
                        }}
                      >
                        {link.label}
                      </span>
                    </Link>
                  </button>
                );
              })}

              {user ? (
                <Link href={`/${locale}/dashboard`} className="w-full">
                  <Button className="w-full rounded-2xl bg-linear-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    {t("dashboard")}
                  </Button>
                </Link>
              ) : (
                <div className="flex flex-col w-full items-center gap-2">
                  <Link href={`/${locale}/sign-up`} className="w-full">
                    <Button
                      variant="outline"
                      className="w-full rounded-2xl border-purple-500/30 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:text-purple-600 dark:hover:text-purple-400 font-medium py-3"
                    >
                      {t("signUp")}
                    </Button>
                  </Link>
                  <Link href={`/${locale}/sign-in`} className="w-full">
                    <Button className="w-full rounded-2xl bg-linear-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 shadow-lg shadow-purple-500/30">
                      {t("signIn")}
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Bottom gradient line */}
            <div className="h-px bg-linear-to-r from-transparent via-white/30 to-transparent"></div>
          </div>
        )}
      </div>

      {/* Separator Line - Full Width - Only Before Scroll */}
      <div
        className={`fixed left-0 right-0 z-40 transition-opacity duration-100 ${
          isScrolled ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{ top: "calc(1rem + 60px + 0.5rem)" }}
      >
        <div className="h-px bg-linear-to-r from-transparent via-border to-transparent" />
      </div>
    </>
  );
}
