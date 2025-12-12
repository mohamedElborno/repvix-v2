"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

export default function LocaleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("locale");

  const languages = [
    { code: "ar", name: t("arabic"), flag: "🇸🇦" },
    { code: "en", name: t("english"), flag: "🇬🇧" },
    { code: "fr", name: t("french"), flag: "🇫🇷" },
    { code: "tr", name: t("turkish"), flag: "🇹🇷" },
    { code: "es", name: t("spanish"), flag: "🇪🇸" },
    { code: "hi", name: t("hindi"), flag: "🇮🇳" },
    { code: "ja", name: t("japanese"), flag: "🇯🇵" },
  ];

  const switchLocale = (newLocale: string) => {
    if (newLocale !== locale) {
      setTimeout(() => {
        const newPath = `/${newLocale}${pathname}`;
        window.location.href = newPath;
      }, 200);
    }
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* Locale Switcher Button */}
      <Button
        variant="ghost"
        size="icon"
        className="rounded-3xl cursor-pointer h-10 w-10 bg-transparent hover:bg-purple-100/50 dark:hover:bg-purple-900/20 hover:scale-110 active:scale-95 transition-all duration-300 group"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Switch language"
      >
        <Globe className="h-5 w-5 text-black dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300" />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute mt-4 w-48 rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-xl z-50",
            locale === "ar" ? "-left-2 md:-left-4" : "-right-2 md:-right-4"
          )}
        >
          <div className="p-2 space-y-1">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => switchLocale(language.code)}
                className={cn(
                  "w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left rounded-xl transition-all duration-200",
                  "hover:bg-purple-50 dark:hover:bg-purple-950/30",
                  locale === language.code
                    ? "bg-purple-100/80 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                    : "text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{language.flag}</span>
                  <span className="text-sm font-medium">{language.name}</span>
                </div>
                {locale === language.code && (
                  <Check className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
