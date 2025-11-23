// lib/plans.ts

export type PlanKey = "basic" | "starter" | "pro" | "business";

export interface PlanConfig {
  key: PlanKey;
  name: string;
  externalId: string; // الرقم الذي أعطيتني إياه (1101994...)
  monthlyAnalyses: number;
  maxEmployees: number;
  maxIntegrations: number;
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  basic: {
    key: "basic",
    name: "Basic",
    externalId: "1101994",
    monthlyAnalyses: 50,
    maxEmployees: 1,
    maxIntegrations: 0, // لا يوجد n8n في Basic
  },
  starter: {
    key: "starter",
    name: "Starter",
    externalId: "1101995",
    monthlyAnalyses: 300,
    maxEmployees: 3,
    maxIntegrations: 0, // لا يوجد n8n في Starter
  },
  pro: {
    key: "pro",
    name: "Pro",
    externalId: "1101996",
    monthlyAnalyses: 600,
    maxEmployees: 10,
    maxIntegrations: 4, // WhatsApp - Instagram - Telegram - Discord
  },
  business: {
    key: "business",
    name: "Business",
    externalId: "1102000",
    monthlyAnalyses: 1500,
    maxEmployees: 30,
    maxIntegrations: 4,
  },
};

export function resolvePlanKey(plan?: string | null): PlanKey {
  if (
    plan === "basic" ||
    plan === "starter" ||
    plan === "pro" ||
    plan === "business"
  ) {
    return plan;
  }
  // لو ما كان مضبوط، نرجع basic كـ default
  return "basic";
}

export function resolvePlanKeyFromExternalId(
  externalId?: string | null
): PlanKey {
  if (!externalId) return "basic";
  const match = Object.values(PLANS).find((p) => p.externalId === externalId);
  return match?.key ?? "basic";
}
