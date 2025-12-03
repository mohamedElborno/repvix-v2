// convex/billing.plan.ts

export type PlanTier = "basic" | "starter" | "pro" | "business"; // | "enterprise";

export type PlanLimits = {
  dailyAnalyses: number | "unlimited";
  members: number | "unlimited";
  exports: Array<"pdf" | "md" | "csv">;
  integrations: Array<"intercom" | "whatsapp" | "zendesk" | "api">;
  features: {
    fullAnalysis: boolean;
    globalInsights: boolean;
    execReporting: boolean;
    autoFaqs: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
    onPrem: boolean;
  };
  support: "email" | "priority_email" | "dedicated";
};

export function limitsForTier(tier: PlanTier): PlanLimits {
  switch (tier) {
    case "basic":
      return {
        dailyAnalyses: 3,
        members: 1,
        exports: ["pdf"],
        integrations: [], // لا تكاملات مدفوعة
        features: {
          fullAnalysis: true,
          globalInsights: true,
          execReporting: false,
          autoFaqs: false,
          apiAccess: false,
          whiteLabel: false,
          onPrem: false,
        },
        support: "email",
      };
    case "starter":
      return {
        dailyAnalyses: 10,
        members: 3,
        exports: ["pdf", "md"],
        integrations: [], // حسب وصفك لا توجد Integrations خارج Auto FAQ
        features: {
          fullAnalysis: true,
          globalInsights: true,
          execReporting: false,
          autoFaqs: true,
          apiAccess: false,
          whiteLabel: false,
          onPrem: false,
        },
        support: "priority_email",
      };
    case "pro":
      return {
        dailyAnalyses: 30,
        members: 10,
        exports: ["pdf", "md", "csv"],
        integrations: ["intercom", "whatsapp", "zendesk", "api"],
        features: {
          fullAnalysis: true,
          globalInsights: true,
          execReporting: false,
          autoFaqs: true,
          apiAccess: false,
          whiteLabel: false,
          onPrem: false,
        },
        support: "priority_email",
      };
    case "business":
      return {
        dailyAnalyses: 100,
        members: 25,
        exports: ["pdf", "md", "csv"],
        integrations: ["whatsapp", "zendesk", "intercom", "api"],
        features: {
          fullAnalysis: true,
          globalInsights: true,
          execReporting: true,
          autoFaqs: true,
          apiAccess: true,
          whiteLabel: false,
          onPrem: false,
        },
        support: "dedicated",
      };
      /* case "enterprise": */
      return {
        dailyAnalyses: "unlimited",
        members: "unlimited",
        exports: ["pdf", "md", "csv"],
        integrations: ["whatsapp", "zendesk", "intercom", "api"],
        features: {
          fullAnalysis: true,
          globalInsights: true,
          execReporting: true,
          autoFaqs: true,
          apiAccess: true,
          whiteLabel: true,
          onPrem: true,
        },
        support: "dedicated",
      };
  }
}

export const LEMON_VARIANT_TO_TIER: Record<string, PlanTier> = {
  "1128280": "basic",
  "1101995": "starter",
  "1101996": "pro",
  "1102000": "business",
  //ENTERPRISE_VARIANT_ID: "enterprise",
};

export function mapVariantToPlan(variantId?: string): {
  tier: PlanTier;
  limits: PlanLimits;
} {
  const tier =
    variantId && LEMON_VARIANT_TO_TIER[variantId]
      ? LEMON_VARIANT_TO_TIER[variantId]
      : "basic";
  return { tier, limits: limitsForTier(tier) };
}
