import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConvexServerClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

export async function GET(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json(
      { ok: false, error: "Missing OAuth parameters" },
      { status: 400 }
    );
  }

  // 🔒 SECURITY: Validate code format (should be alphanumeric)
  if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
    return NextResponse.json(
      { ok: false, error: "Invalid authorization code" },
      { status: 400 }
    );
  }

  // 🔒 SECURITY: Validate code length (typical OAuth codes are 20-100 chars)
  if (code.length < 10 || code.length > 200) {
    return NextResponse.json(
      { ok: false, error: "Invalid authorization code" },
      { status: 400 }
    );
  }

  // 🔒 SECURITY: CSRF protection - verify state matches cookie nonce
  const cookieState = req.cookies.get("zendesk_oauth_state")?.value;
  if (!cookieState || state.split("|")[0] !== cookieState) {
    return NextResponse.json(
      { ok: false, error: "Invalid OAuth state" },
      { status: 400 }
    );
  }

  // 🔒 SECURITY: Extract and validate state components
  // Expected format: nonce|subdomain|orgId
  const stateParts = state.split("|");
  if (stateParts.length !== 3) {
    return NextResponse.json(
      { ok: false, error: "Invalid OAuth state format" },
      { status: 400 }
    );
  }

  const [, subdomain, stateOrgId] = stateParts;

  if (!subdomain) {
    return NextResponse.json(
      { ok: false, error: "Missing subdomain in state" },
      { status: 400 }
    );
  }

  // 🔒 SECURITY: Validate subdomain format (same as authorize)
  if (!/^[a-zA-Z0-9-]+$/.test(subdomain)) {
    return NextResponse.json(
      { ok: false, error: "Invalid subdomain format" },
      { status: 400 }
    );
  }

  // 🔒 SECURITY: Verify orgId matches the one that initiated OAuth
  if (stateOrgId !== orgId) {
    return NextResponse.json(
      { ok: false, error: "Organization mismatch" },
      { status: 403 }
    );
  }

  const clientId = process.env.ZENDESK_CLIENT_ID;
  const clientSecret = process.env.ZENDESK_CLIENT_SECRET;
  const redirectUri = process.env.ZENDESK_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { ok: false, error: "Server configuration error" }, // 🔒 Don't expose internal details
      { status: 500 }
    );
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  // 🔒 SECURITY: Use timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  let tokenRes;
  try {
    tokenRes = await fetch(`https://${subdomain}.zendesk.com/oauth/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("[Zendesk OAuth] Token exchange request failed:", error);
    return NextResponse.json(
      { ok: false, error: "Connection timeout. Please try again." },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    // 🔒 SECURITY: Log error server-side, don't expose to user
    console.error("[Zendesk OAuth] Token exchange failed:", errorText);
    return NextResponse.json(
      {
        ok: false,
        error: "Authentication failed. Please try again.",
      },
      { status: 500 }
    );
  }

  const tokenJson = await tokenRes.json();
  const accessToken =
    tokenJson?.access_token ||
    tokenJson?.token?.access_token ||
    tokenJson?.access_token?.token;
  const refreshToken =
    tokenJson?.refresh_token ||
    tokenJson?.token?.refresh_token ||
    tokenJson?.access_token?.refresh_token;
  let expiresIn =
    tokenJson?.expires_in ||
    tokenJson?.token?.expires_in ||
    tokenJson?.access_token?.expires_in ||
    tokenJson?.refresh_token_expires_in; // fallback if API omits access token ttl
  const scope =
    tokenJson?.scope ||
    tokenJson?.token?.scope ||
    tokenJson?.access_token?.scope;

  if (!accessToken) {
    // 🔒 SECURITY: Log error server-side, don't expose token response to user
    console.error("[Zendesk OAuth] Missing access token in response");
    return NextResponse.json(
      {
        ok: false,
        error: "Authentication failed. Please try again.",
      },
      { status: 500 }
    );
  }

  // 🔒 SECURITY: Validate token format (basic check)
  if (typeof accessToken !== "string" || accessToken.length < 10) {
    console.error("[Zendesk OAuth] Invalid access token format");
    return NextResponse.json(
      { ok: false, error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }

  // Zendesk may omit expires_in; default to 3600s if absent
  if (!expiresIn) {
    expiresIn = 3600;
  }

  // 🔒 SECURITY: Validate expiresIn is reasonable (between 1 minute and 1 year)
  const MIN_EXPIRES_IN = 60; // 1 minute
  const MAX_EXPIRES_IN = 365 * 24 * 60 * 60; // 1 year
  if (expiresIn < MIN_EXPIRES_IN || expiresIn > MAX_EXPIRES_IN) {
    console.warn(
      `[Zendesk OAuth] Suspicious expires_in value: ${expiresIn}, using default`
    );
    expiresIn = 3600;
  }

  const expiresAt = Date.now() + expiresIn * 1000;

  const convex = await getConvexServerClient();
  // Resolve Convex organization ID from Clerk orgId
  const convexOrgId = await convex.query(api.orgs.getByClerkId, {
    clerkOrgId: orgId,
  });

  if (!convexOrgId) {
    return NextResponse.json(
      { ok: false, error: "Organization not found" },
      { status: 400 }
    );
  }

  // 🔒 SECURITY: Double-check subdomain format before saving
  if (!/^[a-zA-Z0-9-]+$/.test(subdomain)) {
    return NextResponse.json(
      { ok: false, error: "Invalid subdomain" },
      { status: 400 }
    );
  }

  // Save connection to database
  await convex.mutation(api.zendesk.saveConnection, {
    organizationId: convexOrgId as any,
    subdomain,
    accessToken,
    refreshToken,
    expiresAt,
    scope,
    createdBy: userId,
  });

  // 🔒 SECURITY: Clear OAuth state cookie after successful completion
  const redirectTo = new URL(
    "/dashboard/integrations?connected=zendesk",
    url.origin
  ).toString();
  const res = NextResponse.redirect(redirectTo);
  res.cookies.delete("zendesk_oauth_state");

  return res;
}
