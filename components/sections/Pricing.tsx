"use client";

import { useTranslations } from "next-intl";
import { Button } from "../ui/button";
import { Check, ArrowRight, Star } from "lucide-react";
import { Card } from "../ui/card";
import { useRouter } from "next/navigation";

export default function Pricing() {
  const t = useTranslations("dashboard.pricing");
  const router = useRouter();
  const plans = [
    {
      id: "basic",
      title: "Basic",
      price: "4.99",
      popular: false,
      description: t("plans.basic.description"),
      features: [
        t("plans.basic.features.f1"),
        t("plans.basic.features.f2"),
        t("plans.basic.features.f3"),
        t("plans.basic.features.f4"),
        t("plans.basic.features.f5"),
      ],
    },
    {
      id: "starter",
      title: "Starter",
      price: "9.99",
      popular: true,
      description: t("plans.starter.description"),
      features: [
        t("plans.starter.features.f1"),
        t("plans.starter.features.f2"),
        t("plans.starter.features.f3"),
        t("plans.starter.features.f4"),
        t("plans.starter.features.f5"),
        t("plans.starter.features.f6"),
      ],
    },
    {
      id: "pro",
      title: "Pro",
      price: "24.99",
      popular: false,
      description: t("plans.pro.description"),
      features: [
        t("plans.pro.features.f1"),
        t("plans.pro.features.f2"),
        t("plans.pro.features.f3"),
        t("plans.pro.features.f4"),
        t("plans.pro.features.f5"),
        t("plans.pro.features.f6"),
      ],
    },
    {
      id: "business",
      title: "Business",
      price: "49.99",
      popular: false,
      description: t("plans.business.description"),
      features: [
        t("plans.business.features.f1"),
        t("plans.business.features.f2"),
        t("plans.business.features.f3"),
        t("plans.business.features.f4"),
        t("plans.business.features.f5"),
        t("plans.business.features.f6"),
      ],
    },
    /*     {
      id: "enterprise",
      title: t("plans.enterprise.title"),
      price: t("customPrice"),
      popular: false,
      description: t("plans.enterprise.description"),
      features: [
        t("plans.enterprise.features.f1"),
        t("plans.enterprise.features.f2"),
        t("plans.enterprise.features.f3"),
        t("plans.enterprise.features.f4"),
        t("plans.enterprise.features.f5"),
        t("plans.enterprise.features.f6"),
      ],
    }, */
  ];

  return (
    <section
      id="pricing"
      className="relative py-16 md:py-20 bg-background scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-[1440px] px-6 sm:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-fuchsia-400 to-purple-500 dark:from-purple-300 dark:via-fuchsia-200 dark:to-purple-400 mb-3">
            {t("title")}
          </h2>
          <p className="mt-3 text-sm sm:text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative p-6 sm:p-8 bg-card border-border backdrop-blur-md shadow-sm overflow-hidden rounded-2xl ${
                plan.popular
                  ? "ring-2 ring-purple-400 dark:ring-purple-500 md:scale-105 md:-translate-y-2"
                  : ""
              } transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-purple-500/10 dark:hover:shadow-purple-500/20 group`}
            >
              {/* Gradient background for popular plan */}
              {plan.popular && (
                <div className="absolute z-10 inset-0 bg-gradient-to-br from-purple-500/5 via-fuchsia-500/5 to-purple-500/5 dark:from-purple-500/10 dark:via-fuchsia-500/10 dark:to-purple-500/10 pointer-events-none" />
              )}

              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute top-1 right-1/6 translate-x-1/2 z-10">
                  <span className="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-fuchsia-500 dark:from-purple-600 dark:to-fuchsia-600 text-white text-xs font-semibold rounded-full flex items-center gap-1.5 shadow-lg shadow-purple-500/30">
                    <Star className="w-3.5 h-3.5 fill-current" /> {t("popular")}
                  </span>
                </div>
              )}

              <div className="relative z-10">
                {/* Plan title */}
                <div className="mb-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                    {plan.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6 pb-6 border-b border-border">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-fuchsia-500 dark:from-purple-400 dark:to-fuchsia-400">
                      {plan.price === t("customPrice")
                        ? t("customPrice")
                        : `$${plan.price}`}
                    </span>
                    {plan.price !== t("customPrice") && (
                      <span className="text-muted-foreground text-sm font-medium">
                        {t("perMonth")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="mb-8 space-y-3.5 min-h-[200px]">
                  {plan.features.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start text-foreground text-sm group/item"
                    >
                      <div className="mt-0.5 mr-3 flex-shrink-0">
                        <div className="w-5 h-5 rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center group-hover/item:bg-green-500/20 dark:group-hover/item:bg-green-500/30 transition-colors">
                          <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                      <span className="leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  onClick={() => router.push("/dashboard/pricing")}
                  className={`w-full rounded-lg transition-all duration-300 font-semibold ${
                    plan.popular
                      ? "bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 dark:from-purple-600 dark:to-fuchsia-600 dark:hover:from-purple-700 dark:hover:to-fuchsia-700 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 hover:scale-[1.02]"
                      : "bg-purple-500/10 hover:bg-purple-500/20 dark:bg-purple-500/20 dark:hover:bg-purple-500/30 text-purple-600 dark:text-purple-400 border border-purple-500/20 dark:border-purple-500/30 hover:border-purple-500/40 dark:hover:border-purple-500/50 hover:scale-[1.02]"
                  }`}
                >
                  {plan.price === t("customPrice") ? (
                    t("contactUs")
                  ) : (
                    <>
                      {t("subscribeNow")}{" "}
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
