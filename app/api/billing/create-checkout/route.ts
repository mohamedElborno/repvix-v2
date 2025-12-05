// app/api/billing/create-checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getConvexServerClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { mapVariantToPlan } from "@/convex/billingPlan";

// Helper function to check if it's an upgrade
function isUpgrade(
  currentTier: "basic" | "starter" | "pro" | "business" | null,
  newTier: "basic" | "starter" | "pro" | "business" | null
) {
  if (!currentTier && newTier) return true;
  if (!currentTier || !newTier) return false;

  const order = ["basic", "starter", "pro", "business"] as const;
  const idx = (x: "basic" | "starter" | "pro" | "business") => order.indexOf(x);

  return idx(newTier) > idx(currentTier);
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId, clerkUserId, variantId, userEmail } =
      await req.json();

    if (!organizationId || !clerkUserId || !variantId) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const apiKey = process.env.LEMON_SECRET_KEY;
    const storeId = process.env.LEMON_STORE_ID;

    if (!apiKey || !storeId) {
      return NextResponse.json(
        { ok: false, error: "Missing Lemon Squeezy API credentials" },
        { status: 500 }
      );
    }

    // التحقق من الاشتراك الحالي
    const convex = await getConvexServerClient();
    const currentPlan = await convex.query(api.billing.getCurrentPlan, {
      organizationId: organizationId as any,
    });

    const desiredTier = mapVariantToPlan(variantId).tier;
    const currentTier = currentPlan?.planTier ?? null;

    // إذا كان لديه اشتراك نشط
    if (currentPlan?.activeSubscriptionId && currentTier) {
      // إذا كان يحاول الاشتراك في نفس الخطة
      if (currentTier === desiredTier) {
        return NextResponse.json(
          {
            ok: false,
            error: "You already have an active subscription for this plan",
            hint: "You are already subscribed to this plan. To manage your subscription, please visit the billing page.",
          },
          { status: 400 }
        );
      }

      // إذا كان يحاول التخفيض (downgrade)
      if (!isUpgrade(currentTier, desiredTier)) {
        return NextResponse.json(
          {
            ok: false,
            error: "Cannot downgrade through checkout",
            hint: "To downgrade your plan, please cancel your current subscription first or contact support.",
          },
          { status: 400 }
        );
      }

      // إذا كان يحاول الترقية (upgrade) - يجب توجيهه إلى portal URL
      const subscription = await convex.query(api.subscriptions.getById, {
        subscriptionId: currentPlan.activeSubscriptionId,
      });

      if (!subscription?.lemonSubscriptionId) {
        return NextResponse.json(
          {
            ok: false,
            error: "Active subscription record not found",
          },
          { status: 500 }
        );
      }

      // جلب portal URL من Lemon Squeezy
      const subRes = await fetch(
        `https://api.lemonsqueezy.com/v1/subscriptions/${subscription.lemonSubscriptionId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/vnd.api+json",
          },
        }
      );

      if (!subRes.ok) {
        const errText = await subRes.text();
        return NextResponse.json(
          {
            ok: false,
            error: "Failed to fetch subscription from Lemon",
            details: errText,
          },
          { status: 500 }
        );
      }

      const subJson = await subRes.json();
      const urls = subJson?.data?.attributes?.urls ?? {};
      const portalUrl =
        urls.customer_portal_update_subscription || urls.customer_portal;

      if (!portalUrl) {
        return NextResponse.json(
          {
            ok: false,
            error: "Customer portal URL not available",
            hint: "Please contact support to upgrade your plan.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        upgrade: true,
        url: portalUrl,
      });
    }

    // (A) تأكد أن الـ store صحيح ومتاح بالمفتاح الحالي
    {
      const checkStore = await fetch(
        `https://api.lemonsqueezy.com/v1/stores/${storeId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/vnd.api+json",
          },
        }
      );
      if (!checkStore.ok) {
        const msg = await checkStore.text();
        return NextResponse.json(
          {
            ok: false,
            error: "Store not accessible with this key",
            details: msg,
          },
          { status: 500 }
        );
      }
    }

    // (B) تأكد أن الـ variant موجود وتابع لنفس البيئة والـ store
    {
      const checkVariant = await fetch(
        `https://api.lemonsqueezy.com/v1/variants/${variantId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/vnd.api+json",
          },
        }
      );

      if (!checkVariant.ok) {
        const msg = await checkVariant.text();
        return NextResponse.json(
          {
            ok: false,
            error: "Variant not found or not accessible",
            details: msg,
            variantId,
            hint: "Make sure the variant ID exists in your Lemon Squeezy store and matches the environment (test/production)",
          },
          { status: 404 }
        );
      }

      // تحقق أن الـ variant مرتبط بنفس الـ store
      const variantData = await checkVariant.json();
      const variantStoreId =
        variantData?.data?.relationships?.product?.data?.id;

      // ملاحظة: قد نحتاج للتحقق من product ثم store، لكن هذا يعتمد على بنية Lemon API
      // للآن نكتفي بالتحقق من وجود الـ variant
    }

    // جلب email العميل و lemonCustomerId من Convex
    const billingCustomer = await convex.query(api.billing.getBillingCustomer, {
      organizationId: organizationId as any,
    });

    const customerEmail =
      userEmail ?? billingCustomer?.email ?? "customer@repvix.com";

    // Create Checkout
    const checkoutPayload = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: customerEmail,
            custom: { organizationId, clerkUserId },
          },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId.toString() } },
          variant: { data: { type: "variants", id: variantId.toString() } },
        },
      },
    };

    // إضافة customer relationship إذا كان موجوداً
    if (billingCustomer?.lemonCustomerId) {
      (checkoutPayload.data.relationships as any)["customer"] = {
        data: {
          type: "customers",
          id: billingCustomer.lemonCustomerId,
        },
      };
    }

    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify(checkoutPayload),
    });

    if (!res.ok) {
      const err = await res.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(err);
      } catch {
        errorDetails = err;
      }

      return NextResponse.json(
        {
          ok: false,
          error: "Lemon API Error",
          details: errorDetails,
          variantId,
          storeId,
          hint:
            errorDetails?.errors?.[0]?.detail ||
            "Check if variant exists and is linked to the correct store",
        },
        { status: res.status || 500 }
      );
    }

    const json = await res.json();
    const checkoutUrl = json?.data?.attributes?.url;
    if (!checkoutUrl) {
      return NextResponse.json(
        { ok: false, error: "Missing checkout URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, url: checkoutUrl });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
