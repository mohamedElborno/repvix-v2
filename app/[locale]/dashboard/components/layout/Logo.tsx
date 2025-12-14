"use client";
import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function Logo({ open }: { open: boolean }) {
  const t = useTranslations("header");
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/RepvixLogo.png"
        alt="Logo"
        className={`h-5 w-auto dark:invert shrink-0 transition-opacity ease-in-out duration-400 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        width={500}
        height={500}
      />
      <p className="text-xl font-medium dark:text-white">{t("brandName")}</p>
    </div>
  );
}
