"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { GlassElement } from "./GlassElement/GlassElement";

export default function LocaleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("locale");

  const languages = [
    { code: "ar", name: t("arabic") },
    { code: "en", name: t("english") },
    { code: "fr", name: t("french") },
    { code: "tr", name: t("turkish") },
    { code: "es", name: t("spanish") },
    { code: "hi", name: t("hindi") },
  ];

  const switchLocale = (newLocale: string) => {
    if (newLocale !== locale) {
      setTimeout(() => {
        // pathname from next-intl usePathname() gives path without locale
        // So we need to add the new locale prefix
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
    <div className="z-50" ref={dropdownRef}>
      {/* Locale Switcher Button */}
      <GlassElement
        className="flex items-center justify-center transition-all duration-300 hover:scale-[0.96] active:scale-90"
        styles={{
          background: "rgba(99, 99, 99, 0.089)",
          boxShadow: "inset 0 0 4px 0px rgba(255, 255, 255, 0.192)",
        }}
        height={55}
        width={55}
        radius={999}
        depth={2}
      >
        <Button
          className="flex items-center justify-center bg-transparent hover:bg-transparent my-0 py-0 px-0 h-full w-full cursor-pointer active:scale-95 transition-transform duration-150 ease-out"
          onClick={() => setIsOpen(!isOpen)}
        >
          {/* Globe Icon */}
          <Globe
            size={16}
            className="shrink-0 w-4 h-4 dark:text-white text-black/80 rounded-full group-hover:text-white transition-colors duration-300 drop-shadow-[0_0_4px_rgba(168,85,247,0.3)]"
            style={{
              boxShadow: "0 0 8px 4px rgba(255, 255, 255, 0.192)",
            }}
          />

          {/* Animated gradient border */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 via-transparent to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

          {/* Glow effect */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.1)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </Button>
      </GlassElement>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute max-h-fit max-w-fit rounded-3xl backdrop-blur-sm ${
            locale === "ar" ? "left-0" : "right-0"
          } mt-3 z-50`}
          style={{
            background: "rgba(99, 99, 99, 0.089)",
            boxShadow: "inset 0 0 4px 0px rgba(255, 255, 255, 0.192)",
          }}
        >
          <div className="p-2 space-y-2">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => switchLocale(language.code)}
                className={cn(
                  "w-full flex items-center gap-3 px-2 py-1 text-left rounded-full transition-all duration-300 group",
                  "hover:bg-white/20 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/10",
                  "active:scale-95 active:bg-white/30 transition-transform duration-150 ease-out",
                  locale === language.code &&
                    "bg-white/20 shadow-lg shadow-purple-500/10"
                )}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-xs font-bold text-white">
                    {language.code.toUpperCase().charAt(0)}
                  </div>
                  <span className="text-sm font-medium dark:text-white/90 text-black/90 group-hover:text-white transition-colors duration-300 drop-shadow-[0_0_4px_rgba(168,85,247,0.2)]">
                    {language.name}
                  </span>
                </div>
                {locale === language.code && (
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
                )}
              </button>
            ))}
          </div>

          {/* Bottom gradient line */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
        </div>
      )}
    </div>
  );
}
