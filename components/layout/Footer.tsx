"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { IconBrandInstagram, IconBrandX, IconMail } from "@tabler/icons-react";

export default function Footer() {
  const t = useTranslations("home.footer");
  const year = new Date().getFullYear();
  const locale = useLocale();
  const nav = {
    product: [
      { href: "#features", label: t("features") || "Features" },
      { href: "#howItWorks", label: t("howItWorks") || "How it works" },
      { href: "#pricing", label: t("pricing") || "Pricing" },
      { href: "#faq", label: t("faq") || "FAQ" },
      {
        href: `/${locale}/conversation-insights`,
        label: t("conversationInsights") || "Conversation Insights",
      },
      {
        href: `/${locale}/zendesk-pricing`,
        label: t("zendeskPricing") || "Zendesk Pricing",
      },
    ],
    company: [
      { href: `/${locale}/terms`, label: t("terms") || "Terms" },
      { href: `/${locale}/privacy`, label: t("privacy") || "Privacy" },
      {
        href: "mailto:contact@example.com",
        label: t("contact") || "Contact",
      },
    ],
  };

  return (
    <footer className="relative mt-14 sm:mt-20 mb-5">
      <div className="mx-auto w-full max-w-[1600px] px-6 sm:px-8">
        {/* Outer gradient ring */}
        <div className="rounded-3xl p-[1.5px] bg-linear-to-br from-purple-400/20 via-fuchsia-400/10 to-purple-600/20 dark:from-purple-400/30 dark:via-fuchsia-400/20 dark:to-purple-600/30">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card backdrop-blur-md shadow-sm">
            {/* soft glow */}
            <div className="pointer-events-none absolute -top-10 inset-x-0 h-16 bg-linear-to-b from-purple-500/5 dark:from-white/10 to-transparent" />

            <div className="px-5 sm:px-6 py-8 sm:py-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Brand */}
                <div className="md:col-span-2">
                  <Image
                    src="/Repvix.svg"
                    alt="Repvix"
                    width={2000}
                    height={2000}
                    className="absolute left-1 top-4 w-auto h-20 object-contain origin-right invert dark:invert-0"
                  />
                  <p className="mt-12 text-sm text-muted-foreground max-w-md ">
                    {t("description")}
                  </p>

                  {/* Socials */}
                  <div className="mt-4 flex items-center gap-2.5">
                    <Link
                      href="https://x.com/repvix?t=VmOqKWakdzZ6jyWOCAcKyg&s=09"
                      target="_blank"
                      className="rounded-lg p-1 border border-border bg-muted/50 hover:bg-muted dark:hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <IconBrandX stroke={1.5} className="size-5" />
                    </Link>
                    <Link
                      href="https://www.instagram.com/repvix.ai?igsh=d2JvODI1a2pxdnR6"
                      target="_blank"
                      className="rounded-lg p-1 border border-border bg-muted/50 hover:bg-muted dark:hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <IconBrandInstagram stroke={1.5} className="size-5" />
                    </Link>
                    <Link
                      href="mailto:contact@example.com"
                      target="_blank"
                      className="rounded-lg p-1 border border-border bg-muted/50 hover:bg-muted dark:hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <IconMail stroke={1.5} className="size-5" />
                    </Link>
                  </div>
                </div>

                {/* Product */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground tracking-wide">
                    {t("productLabel")}
                  </h4>
                  <ul className="mt-3 space-y-2.5 text-sm">
                    {nav.product.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Company */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground tracking-wide">
                    {t("companyLabel")}
                  </h4>
                  <ul className="mt-3 space-y-2.5 text-sm">
                    {nav.company.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Divider */}
              <div className="mt-8 h-px w-full bg-linear-to-r from-transparent via-border to-transparent" />

              {/* Bottom bar */}
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t("copyright", { year })}
                </p>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {t("tagline")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
