"use client";

import Link from "next/link";
import { Github, Twitter, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("home.footer");
  const year = new Date().getFullYear();

  const nav = {
    product: [
      { href: "#features", label: t("features") || "Features" },
      { href: "#howItWorks", label: t("howItWorks") || "How it works" },
      { href: "#pricing", label: t("pricing") || "Pricing" },
      { href: "#faq", label: t("faq") || "FAQ" },
    ],
    company: [
      { href: "/terms", label: t("terms") || "Terms" },
      { href: "/privacy", label: t("privacy") || "Privacy" },
      { href: "mailto:contact@example.com", label: t("contact") || "Contact" },
    ],
  };

  return (
    <footer className="relative mt-14 sm:mt-20 mb-5">
      <div className="mx-auto w-full max-w-6xl xl:max-w-[1400px] px-6 sm:px-8">
        {/* Outer gradient ring */}
        <div className="rounded-3xl p-[1.5px] bg-gradient-to-br from-purple-400/20 via-fuchsia-400/10 to-purple-600/20">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md">
            {/* soft glow */}
            <div className="pointer-events-none absolute -top-10 inset-x-0 h-16 bg-gradient-to-b from-white/10 to-transparent" />

            <div className="px-5 sm:px-6 py-8 sm:py-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Brand */}
                <div className="md:col-span-2">
                  <div className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-white to-purple-300">
                    {t("brandName") || "Repvix"}
                  </div>
                  <p className="mt-2 text-sm text-white/75 max-w-md">
                    {t("description") ||
                      "Turn support chats into polished docs, FAQs and insights in seconds."}
                  </p>

                  {/* Socials */}
                  <div className="mt-4 flex items-center gap-2.5">
                    <Link
                      href="https://twitter.com"
                      className="rounded-lg p-2 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <Twitter className="size-4" />
                    </Link>
                    <Link
                      href="https://github.com"
                      className="rounded-lg p-2 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <Github className="size-4" />
                    </Link>
                    <Link
                      href="mailto:contact@example.com"
                      className="rounded-lg p-2 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <Mail className="size-4" />
                    </Link>
                  </div>
                </div>

                {/* Product */}
                <div>
                  <h4 className="text-sm font-semibold text-white/90 tracking-wide">
                    {t("productLabel") || "Product"}
                  </h4>
                  <ul className="mt-3 space-y-2.5 text-sm">
                    {nav.product.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className="text-white/80 hover:text-white transition-colors"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Company */}
                <div>
                  <h4 className="text-sm font-semibold text-white/90 tracking-wide">
                    {t("companyLabel") || "Company"}
                  </h4>
                  <ul className="mt-3 space-y-2.5 text-sm">
                    {nav.company.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className="text-white/80 hover:text-white transition-colors"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Divider */}
              <div className="mt-8 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              {/* Bottom bar */}
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs sm:text-sm text-white/70">
                  {t("copyright", { year }) ||
                    `© ${year} Repvix. All rights reserved.`}
                </p>
                <div className="text-xs sm:text-sm text-white/70">
                  {t("tagline") || "Built with love and a bit of AI ✨"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
