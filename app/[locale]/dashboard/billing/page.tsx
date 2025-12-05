"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  BarChart,
  TrendingUp,
  Settings,
  Loader2,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { toast } from "sonner";

export default function BillingPage() {
  const t = useTranslations("billing");
  const { organization } = useOrganization();
  const locale = useLocale();
  const router = useRouter();

  const convexOrgId = useQuery(
    api.orgs.getByClerkId,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );

  const portalData = useQuery(
    api.billing.getBillingPortalData,
    convexOrgId ? { organizationId: convexOrgId } : "skip"
  );

  const sub = useQuery(
    api.subscriptions.getByOrg,
    convexOrgId ? { organizationId: convexOrgId } : "skip"
  );

  const cancelSubscription = useAction(api.billing.cancelSubscription);
  const [isCancelling, setIsCancelling] = useState(false);

  const manageBilling = () => {
    if (!sub?.customerPortal) return;
    window.location.href = sub.customerPortal;
  };

  const goToPricing = () => {
    router.push(`/${locale}/dashboard/pricing`);
  };

  const handleCancelSubscription = async () => {
    if (!convexOrgId) {
      toast.error("Error: Organization not found");
      return;
    }

    // تأكيد من المستخدم
    if (
      !confirm(
        "Are you sure you want to cancel your subscription? Your subscription will remain active until the end of the current billing period."
      )
    ) {
      return;
    }

    setIsCancelling(true);
    try {
      const result = await cancelSubscription({
        organizationId: convexOrgId,
      });

      if (!result.ok) {
        toast.error(result.error || "Failed to cancel subscription");
        return;
      }

      toast.success(
        result.message ||
          "Subscription cancelled successfully. It will remain active until the end of the current billing period."
      );

      // إعادة تحميل الصفحة بعد ثانية
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error("Cancel subscription error:", err);
      toast.error(err.message || "Failed to cancel subscription");
    } finally {
      setIsCancelling(false);
    }
  };

  // Loading state
  const loading = portalData === undefined;

  return (
    <div className="w-full max-w-6xl mx-auto py-8 min-h-[calc(100vh-120px)]">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">{t("loading")}</span>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Current Plan */}
          <Card className="p-6 border-border bg-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                {t("currentPlan")}
              </h2>
            </div>

            {portalData.plan ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t("plan")}
                  </p>
                  <p className="text-2xl font-bold capitalize">
                    {portalData.plan}
                  </p>
                </div>
                <Button
                  onClick={manageBilling}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {t("manageSubscription")}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground">{t("noPlan")}</p>
                <Button onClick={goToPricing} className="w-full">
                  {t("viewPlans")}
                </Button>
              </div>
            )}
          </Card>

          {/* Usage */}
          <Card className="p-6 border-border bg-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <BarChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold">{t("currentUsage")}</h2>
            </div>

            {portalData.limits ? (
              <div className="space-y-4">
                {portalData.limits.remaining !== undefined && (
                  <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">
                      {t("remainingAnalyses")}
                    </span>
                    <span className="text-lg font-semibold">
                      {portalData.limits.remaining}
                    </span>
                  </div>
                )}

                {portalData.limits.employees !== undefined && (
                  <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">
                      {t("allowedEmployees")}
                    </span>
                    <span className="text-lg font-semibold">
                      {portalData.limits.employees}
                    </span>
                  </div>
                )}

                {portalData.limits.integrations !== undefined && (
                  <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">
                      {t("allowedIntegrations")}
                    </span>
                    <span className="text-lg font-semibold">
                      {portalData.limits.integrations}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">{t("notAvailable")}</p>
            )}
          </Card>

          {/* Upgrade */}
          <Card className="p-6 border-border bg-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold">{t("upgrade")}</h2>
            </div>

            <p className="text-muted-foreground mb-4">
              {t("upgradeDescription")}
            </p>

            <Button
              onClick={goToPricing}
              variant="outline"
              className="w-full border-purple-500/50 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
            >
              {t("viewPlans")}
            </Button>
          </Card>

          {/* Subscription Management */}
          <Card className="p-6 border-border bg-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Settings className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-xl font-semibold">
                {t("subscriptionManagement")}
              </h2>
            </div>

            <div className="space-y-3">
              <Button
                onClick={manageBilling}
                variant="outline"
                className="w-full border-border hover:bg-muted"
              >
                {t("managePayment")}
              </Button>

              <Button
                onClick={handleCancelSubscription}
                variant="outline"
                disabled={isCancelling || !sub || sub.status === "cancelled"}
                className="w-full border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : sub?.status === "cancelled" ? (
                  "Subscription Cancelled"
                ) : (
                  t("cancelSubscription")
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              {t("portalDescription")}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
