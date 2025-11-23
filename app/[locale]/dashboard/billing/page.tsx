"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, BarChart } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

export default function BillingPage() {
  const t = useTranslations("billing");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [limits, setLimits] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        // 1) Fetch plan + limits
        const res = await fetch("/api/billing/portal");
        const data = await res.json();

        setPlan(data.plan);
        setLimits(data.limits);
      } catch (e: unknown) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const openPortal = async () => {
    const r = await fetch("/api/billing/portal", { method: "POST" });
    const d = await r.json();
    if (d.url) window.location.href = d.url;
  };

  return (
    <div className="flex-1 w-full min-h-[calc(100vh-110px)] mx-auto flex flex-col gap-8">
      <h1 className="text-3xl font-bold text-white/90">{t("title")}</h1>

      {loading ? (
        <p className="text-white/70">{t("loading")}</p>
      ) : (
        <>
          {/* Current Plan */}
          <Card className="p-6 bg-white/5 border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-semibold text-white/90">
                {t("currentPlan")}
              </h2>
            </div>

            {plan ? (
              <div className="space-y-2">
                <p className="text-white/80 text-lg">
                  {t("plan")}: <span className="text-purple-300">{plan}</span>
                </p>

                <Button
                  onClick={openPortal}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {t("manageSubscription")}
                </Button>
              </div>
            ) : (
              <p className="text-white/70">{t("noPlan")}</p>
            )}
          </Card>

          {/* Usage */}
          <Card className="p-6 bg-white/5 border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <BarChart className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-white/90">
                {t("currentUsage")}
              </h2>
            </div>

            {limits ? (
              <div className="space-y-3 text-white/80">
                <p>
                  {t("remainingAnalyses")}: {limits.remaining}
                </p>
                <p>
                  {t("allowedEmployees")}: {limits.employees}
                </p>
                <p>
                  {t("allowedIntegrations")}: {limits.integrations}
                </p>
              </div>
            ) : (
              <p className="text-white/70">{t("notAvailable")}</p>
            )}
          </Card>

          {/* Upgrade */}
          <Card className="p-6 bg-white/5 border-white/10">
            <h2 className="text-xl font-semibold text-white/90 mb-4">
              {t("upgrade")}
            </h2>

            <p className="text-white/70 mb-4">{t("upgradeDescription")}</p>

            <Button
              onClick={() => (window.location.href = `/${locale}/pricing`)}
              variant="outline"
              className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
            >
              {t("viewPlans")}
            </Button>
          </Card>
          <Card className="p-6 bg-white/5 border-white/10">
            <h2 className="text-xl font-semibold text-white/90 mb-4">
              {t("subscriptionManagement")}
            </h2>

            <div className="flex gap-3">
              <Button
                onClick={openPortal}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {t("managePayment")}
              </Button>

              <Button
                onClick={openPortal}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {t("cancelSubscription")}
              </Button>
            </div>

            <p className="text-white/60 text-sm mt-3">
              {t("portalDescription")}
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
