// convex/billing.checkout.ts
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { assertOrgRole } from "./lib/guard";

export const createCheckoutSession = mutation({
  args: {
    organizationId: v.id("organizations"),
    clerkUserId: v.string(),
    variantId: v.string(),
  },
  handler: async (ctx, { organizationId, clerkUserId, variantId }) => {
    await assertOrgRole(ctx, organizationId, clerkUserId, ["admin"]);

    // يمكنك هنا فقط إرجاع token/nonce وتستدعي Route Next.js للسيرفر-سايد call إلى Lemon
    // أو تقوم بالـ fetch من هنا إذا أردت (Edge fetch OK).
    return { ok: true };
  },
});
