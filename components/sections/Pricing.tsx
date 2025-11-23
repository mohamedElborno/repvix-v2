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
      title: t("plans.basic.title"),
      price: "4.99",
      popular: false,
      description: t("plans.basic.description"),
      features: [
        t("plans.basic.features.f1"),
        t("plans.basic.features.f2"),
        t("plans.basic.features.f3"),
        t("plans.basic.features.f4"),
        t("plans.basic.features.f5"),
        t("plans.basic.features.f6"),
      ],
    },
    {
      id: "starter",
      title: t("plans.starter.title"),
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
        t("plans.starter.features.f7"),
      ],
    },
    {
      id: "pro",
      title: t("plans.pro.title"),
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
        t("plans.pro.features.f7"),
      ],
    },
    {
      id: "business",
      title: t("plans.business.title"),
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
    {
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
    },
  ];

  return (
    <section id="pricing" className="relative py-16 md:py-20">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80 mb-3">
            {t("title")}
          </h2>
          <p className="mt-3 text-sm sm:text-base md:text-lg text-white/75 max-w-3xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative p-6 sm:p-8 bg-white/5 border-white/10 backdrop-blur-md ${
                plan.popular ? "ring-2 ring-purple-500" : ""
              } transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(168,85,247,0.25)]`}
            >
              {plan.popular && (
                <span className="absolute top-4 left-4 px-3 py-1 bg-purple-600 text-white text-xs rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" /> {t("popular")}
                </span>
              )}

              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-1">
                {plan.title}
              </h3>
              <p className="text-white/60 text-sm mb-6">{plan.description}</p>

              <div className="mb-6">
                <span className="text-3xl sm:text-4xl font-extrabold text-white">
                  {plan.price === t("customPrice")
                    ? t("customPrice")
                    : `$${plan.price}`}
                </span>
                {plan.price !== t("customPrice") && (
                  <span className="text-white/50 text-sm">
                    {" "}
                    {t("perMonth")}
                  </span>
                )}
              </div>

              <ul className="mb-6 space-y-3">
                {plan.features.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center text-white/80 text-sm"
                  >
                    <Check className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => router.push("/dashboard/pricing")}
                className={`w-full rounded-full transition-all duration-300 hover:scale-[1.02] ${
                  plan.popular
                    ? "bg-purple-600 hover:bg-purple-600/85"
                    : "bg-purple-500/30 hover:bg-purple-500/40"
                } text-white`}
              >
                {plan.price === t("customPrice") ? (
                  t("contactUs")
                ) : (
                  <>
                    {t("subscribeNow")} <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
