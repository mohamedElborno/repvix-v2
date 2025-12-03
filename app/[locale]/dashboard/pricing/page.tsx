"use client";

import { Check, ArrowRight, Star, X, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

export default function PricingPage() {
  const t = useTranslations("dashboard.pricing");
  const { organization } = useOrganization();
  const { user } = useUser();
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  // Get Convex organization ID from Clerk org ID
  const convexOrgId = useQuery(
    api.orgs.getByClerkId,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );

  useEffect(() => {
    fetch("/api/billing/current")
      .then((r) => r.json())
      .then((d) => setCurrentPlan(d.plan))
      .catch(() => {});
  }, []);

  const plans = [
    {
      id: "basic",
      title: "Basic",
      price: "4.99",
      popular: false,
      variantId: "1101994",
      description: t("plans.basic.description"),
      features: {
        f1: t("plans.basic.features.f1"),
        f2: t("plans.basic.features.f2"),
        f3: t("plans.basic.features.f3"),
        f4: t("plans.basic.features.f4"),
        f5: t("plans.basic.features.f5"),
        f6: null,
      },
      isActive: true,
    },
    {
      id: "starter",
      title: "Starter",
      price: "9.99",
      popular: true,
      variantId: "1101995",
      description: t("plans.starter.description"),
      features: {
        f1: t("plans.starter.features.f1"),
        f2: t("plans.starter.features.f2"),
        f3: t("plans.starter.features.f3"),
        f4: t("plans.starter.features.f4"),
        f5: t("plans.starter.features.f6"),
        f6: t("plans.starter.features.f5"),
      },
      isActive: true,
    },
    {
      id: "pro",
      title: "Pro",
      price: "24.99",
      popular: false,
      variantId: "1101996",
      description: t("plans.pro.description"),
      features: {
        f1: t("plans.pro.features.f1"),
        f2: t("plans.pro.features.f2"),
        f3: t("plans.pro.features.f3"),
        f4: t("plans.pro.features.f4"),
        f5: t("plans.pro.features.f5"),
        f6: t("plans.pro.features.f6"),
      },
      isActive: false,
    },
    {
      id: "business",
      title: "Business",
      price: "49.99",
      popular: false,
      variantId: "1102000",
      description: t("plans.business.description"),
      features: {
        f1: t("plans.business.features.f1"),
        f2: t("plans.business.features.f2"),
        f3: t("plans.business.features.f3"),
        f4: t("plans.business.features.f4"),
        f5: t("plans.business.features.f5"),
        f6: t("plans.business.features.f6"),
      },
      isActive: false,
    },
    /*     {
      id: "enterprise",
      title: t("plans.enterprise.title"),
      price: t("customPrice"),
      popular: false,
      variantId: 1111111,
      description: t("plans.enterprise.description"),
      features: {
        f1: t("plans.enterprise.features.f1"),
        f2: t("plans.enterprise.features.f2"),
        f3: t("plans.enterprise.features.f3"),
        f4: t("plans.enterprise.features.f4"),
        f5: t("plans.enterprise.features.f5"),
        f6: t("plans.enterprise.features.f6"),
      },
    }, */
  ];

  // Get all unique feature keys across all plans
  const featureKeys = ["f1", "f2", "f3", "f4", "f5", "f6"] as const;

  const checkout = async (variantId: string | null) => {
    if (!variantId) {
      toast.error(t("willContactYou"));
      return;
    }

    if (!convexOrgId || !user?.id) {
      toast.error(t("willContactYou"));
      return;
    }

    const res = await fetch("/api/billing/create-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        variantId,
        storeId: process.env.LEMON_STORE_ID,
        organizationId: convexOrgId,
        clerkUserId: user.id,
      }),
    });
    console.log("res", res);
    const d = await res.json();
    if (d.ok && d.url) {
      window.location.href = d.url;
    } else {
      alert(d.error || "حدث خطأ أثناء إنشاء جلسة الدفع");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-3">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-lg">{t("subtitle")}</p>
      </div>

      <Card className="overflow-hidden border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-start p-4 font-semibold text-foreground min-w-[200px]">
                  {t("feature") || "Feature"}
                </th>
                {plans.map((plan) => (
                  <th
                    key={plan.id}
                    className={`text-center p-4 font-semibold text-foreground relative ${
                      plan.popular ? "bg-purple-500/10" : ""
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" /> {t("popular")}
                      </span>
                    )}
                    <div className="mt-6">
                      <div className="text-lg font-bold">{plan.title}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {plan.description}
                      </div>
                      <div className="mt-4">
                        <span className="text-3xl font-bold text-foreground">
                          {plan.price === t("customPrice")
                            ? t("customPrice")
                            : `$${plan.price}`}
                        </span>
                        {plan.price !== t("customPrice") && (
                          <span className="text-muted-foreground text-sm">
                            {" "}
                            {t("perMonth")}
                          </span>
                        )}
                      </div>
                      <Button
                        onClick={() => checkout(String(plan.variantId))}
                        disabled={currentPlan === plan.id}
                        size="sm"
                        className={`w-full mt-4 ${
                          plan.popular
                            ? "bg-purple-600 hover:bg-purple-700"
                            : "bg-primary hover:bg-primary/90"
                        } ${plan.isActive ? "" : "opacity-50 cursor-not-allowed"}`}
                      >
                        {plan.price === t("customPrice") ? (
                          t("contactUs")
                        ) : currentPlan === plan.id ? (
                          t("currentPlan")
                        ) : (
                          <>
                            {t("subscribeNow")}{" "}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureKeys.map((key) => {
                // Check if any plan has this feature
                const hasAnyFeature = plans.some((p) => p.features[key]);
                if (!hasAnyFeature) return null;

                // Get the feature label (general title)
                const featureLabel = t(`featureLabels.${key}`) || key;

                return (
                  <tr
                    key={key}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4 text-foreground font-medium align-top">
                      {featureLabel}
                    </td>
                    {plans.map((plan) => (
                      <td
                        key={plan.id}
                        className={`text-center p-4 align-top  ${
                          plan.popular ? "bg-purple-500/5" : ""
                        } ${plan.isActive ? "" : "opacity-50 cursor-not-allowed"}`}
                      >
                        {plan.features[key] ? (
                          <div className="flex flex-col items-center gap-1">
                            <Check className="w-5 h-5 text-green-500" />
                            <span className="text-xs text-muted-foreground max-w-[150px] wrap-break-word">
                              {plan.features[key]}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full w-full">
                            <X className="w-5 h-5 text-red-500 text-center" />
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 flex items-start gap-3 p-4 bg-muted/50 border border-border rounded-lg">
        <Info className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">{t("betaNote")}</p>
      </div>
    </div>
  );
}
