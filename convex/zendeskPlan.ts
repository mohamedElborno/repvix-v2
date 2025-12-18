// convex/zendeskPlan.ts
// Zendesk-specific billing plans (separate from main platform plans)

export type ZendeskPlanTier = "trial" | "pro";

export type ZendeskPlanLimits = {
  monthlyQuota: number; // Number of analyses per month
};

/**
 * Get plan limits for a Zendesk plan tier
 */
export function limitsForZendeskTier(tier: ZendeskPlanTier): ZendeskPlanLimits {
  switch (tier) {
    case "trial":
      return {
        monthlyQuota: 10,
      };
    case "pro":
      return {
        monthlyQuota: 200, // Updated from 150 to 200
      };
    default:
      return {
        monthlyQuota: 10, // Default to trial
      };
  }
}

/**
 * Mapping from Lemon Squeezy variant IDs to Zendesk plan tiers
 * These are separate variant IDs specifically for Zendesk plans
 *
 * IMPORTANT: Replace these with your actual Zendesk variant IDs from Lemon Squeezy
 *
 * كيفية الحصول على Variant ID:
 * 1. اذهب إلى Lemon Squeezy Dashboard
 * 2. Products > اختر المنتج الخاص بـ Zendesk
 * 3. Variants > انسخ الـ Variant ID
 * 4. الصقه هنا بالشكل التالي:
 *
 * مثال:
 * export const ZENDESK_LEMON_VARIANT_TO_TIER: Record<string, ZendeskPlanTier> = {
 *   "1234567": "paid",  // ← ضع Variant ID هنا
 * };
 */
export const ZENDESK_LEMON_VARIANT_TO_TIER: Record<string, ZendeskPlanTier> = {
  // ⬇️ ضع Variant ID الخاص بك هنا ⬇️
  "1159109": "pro",
};

/**
 * Map a Lemon Squeezy variant ID to a Zendesk plan tier
 */
export function mapZendeskVariantToPlan(variantId?: string): {
  tier: ZendeskPlanTier;
  limits: ZendeskPlanLimits;
} {
  const tier =
    variantId && ZENDESK_LEMON_VARIANT_TO_TIER[variantId]
      ? ZENDESK_LEMON_VARIANT_TO_TIER[variantId]
      : "trial";
  return { tier, limits: limitsForZendeskTier(tier) };
}

/**
 * Check if a variant ID is a Zendesk plan variant
 */
export function isZendeskVariant(variantId?: string): boolean {
  if (!variantId) return false;
  return variantId in ZENDESK_LEMON_VARIANT_TO_TIER;
}
