"use client";

import { Check, ArrowRight, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

export default function PricingPage() {
  const t = useTranslations("dashboard.pricing");
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/portal")
      .then((r) => r.json())
      .then((d) => setCurrentPlan(d.plan))
      .catch(() => {});
  }, []);

  const plans = [
    {
      id: "basic",
      title: t("plans.basic.title"),
      price: "4.99",
      popular: false,
      variantId: 1095200,
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
      variantId: 1095910,
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
      variantId: 1095912,
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
      variantId: 1095909,
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
      variantId: 1111111,
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

  const checkout = async (variantId: number | null) => {
    if (!variantId) {
      alert(t("willContactYou"));
      return;
    }

    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ variantId }),
    });

    const d = await res.json();
    if (d.url) window.location.href = d.url;
  };

  return (
    <div className="w-full max-w-7xl mx-auto pt-16 pb-28 px-4">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold text-white mb-3">
          {t("title")}
        </h1>
        <p className="text-white/60 text-lg">{t("subtitle")}</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative p-8 bg-white/5 border-white/10 ${
              plan.popular ? "ring-2 ring-purple-500" : ""
            }`}
          >
            {plan.popular && (
              <span className="absolute top-4 left-4 px-3 py-1 bg-purple-600 text-white text-xs rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" /> {t("popular")}
              </span>
            )}

            <h2 className="text-2xl font-semibold text-white">{plan.title}</h2>
            <p className="text-white/60 mt-1">{plan.description}</p>

            <div className="mt-6">
              <span className="text-4xl font-bold text-white">
                {plan.price === t("customPrice")
                  ? t("customPrice")
                  : `$${plan.price}`}
              </span>
              {plan.price !== t("customPrice") && (
                <span className="text-white/50 text-sm"> {t("perMonth")}</span>
              )}
            </div>

            <ul className="mt-6 space-y-3">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center text-white/80">
                  <Check className="w-4 h-4 text-green-400 mr-2" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              onClick={() => checkout(plan.variantId)}
              disabled={currentPlan === plan.id}
              className={`w-full mt-8 ${
                plan.popular
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-purple-500/30 hover:bg-purple-500/40"
              } text-white`}
            >
              {plan.price === t("customPrice") ? (
                t("contactUs")
              ) : currentPlan === plan.id ? (
                t("currentPlan")
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
  );
}
