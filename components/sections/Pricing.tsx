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
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3">
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
              className={`relative p-6 sm:p-8 bg-card border backdrop-blur-md overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group ${
                plan.popular
                  ? "border-purple-600 dark:border-purple-500 shadow-md"
                  : "border-border hover:border-border/80"
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute top-4 right-4 z-10">
                  <span className="px-3 py-1 bg-purple-600 dark:bg-purple-500 text-white text-xs font-semibold rounded-md flex items-center gap-1.5">
                    <Star className="w-3 h-3 fill-current" /> {t("popular")}
                  </span>
                </div>
              )}

              <div className="relative z-10 flex flex-col h-full">
                {/* Plan title */}
                <div className="mb-6">
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
                    <span className="text-4xl sm:text-5xl font-bold text-foreground">
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
                <ul className="mb-8 space-y-3 grow">
                  {plan.features.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start text-foreground text-sm"
                    >
                      <div className="mt-0.5 mr-3 shrink-0">
                        <Check className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  onClick={() => router.push("/dashboard/pricing")}
                  className={`w-full rounded-xl transition-all duration-300 font-semibold mt-auto ${
                    plan.popular
                      ? "bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white"
                      : "bg-muted hover:bg-muted/80 text-foreground border border-border"
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
