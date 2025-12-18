// app/api/billing/create-checkout/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const {
      organizationId,
      clerkUserId,
      variantId,
      userEmail,
      zendeskSubdomain,
    } = await req.json();

    if (!organizationId || !clerkUserId || !variantId) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate Zendesk subdomain if provided
    if (zendeskSubdomain) {
      if (!/^[a-zA-Z0-9-]+$/.test(zendeskSubdomain)) {
        return NextResponse.json(
          {
            ok: false,
            error: "Invalid Zendesk subdomain format",
          },
          { status: 400 }
        );
      }
    }

    const apiKey = process.env.LEMON_SECRET_KEY;
    const storeId = process.env.LEMON_STORE_ID;

    if (!apiKey || !storeId) {
      return NextResponse.json(
        { ok: false, error: "Missing Lemon Squeezy API credentials" },
        { status: 500 }
      );
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

    // Create Checkout
    const customData: any = { organizationId, clerkUserId };
    if (zendeskSubdomain) {
      customData.zendesk_subdomain = zendeskSubdomain;
    }

    const checkoutPayload = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: userEmail,
            custom: customData,
          },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId.toString() } },
          variant: { data: { type: "variants", id: variantId.toString() } },
        },
      },
    };

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
