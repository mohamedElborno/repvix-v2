"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
    <div className="relative z-50" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Globe className="h-4 w-4" />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute max-h-fit max-w-fit rounded-lg border bg-background shadow-lg ${
            locale === "ar" ? "left-0" : "right-0"
          } z-50 mt-2 min-w-[160px]`}
        >
          <div className="p-1 space-y-1">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => switchLocale(language.code)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-md text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  locale === language.code && "bg-accent text-accent-foreground"
                )}
              >
                <span className="text-xs font-medium w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                  {language.code.toUpperCase().charAt(0)}
                </span>
                <span className="flex-1">{language.name}</span>
                {locale === language.code && (
                  <span className="text-xs text-muted-foreground">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
