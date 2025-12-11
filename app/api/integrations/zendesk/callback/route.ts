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
      { ok: false, error: "Missing code or state" },
      { status: 400 }
    );
  }

  const cookieState = req.cookies.get("zendesk_oauth_state")?.value;
  if (!cookieState || !state.startsWith(cookieState)) {
    return NextResponse.json(
      { ok: false, error: "Invalid state" },
      { status: 400 }
    );
  }

  const [, subdomain] = state.split("|");
  if (!subdomain) {
    return NextResponse.json(
      { ok: false, error: "Missing subdomain in state" },
      { status: 400 }
    );
  }

  const clientId = process.env.ZENDESK_CLIENT_ID;
  const clientSecret = process.env.ZENDESK_CLIENT_SECRET;
  const redirectUri = process.env.ZENDESK_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { ok: false, error: "Missing Zendesk OAuth env vars" },
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

  const tokenRes = await fetch(
    `https://${subdomain}.zendesk.com/oauth/tokens`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to exchange code",
        details: errorText,
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
    return NextResponse.json(
      {
        ok: false,
        error: "Missing access token",
        details: tokenJson,
      },
      { status: 500 }
    );
  }

  // Zendesk may omit expires_in; default to 3600s if absent
  if (!expiresIn) {
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
      { ok: false, error: "Organization not found for this Clerk org" },
      { status: 400 }
    );
  }

  await convex.mutation(api.zendesk.saveConnection, {
    organizationId: convexOrgId as any,
    subdomain,
    accessToken,
    refreshToken,
    expiresAt,
    scope,
    createdBy: userId,
  });

  const redirectTo = new URL(
    "/dashboard/integrations?connected=zendesk",
    url.origin
  ).toString();
  const res = NextResponse.redirect(redirectTo);
  res.cookies.delete("zendesk_oauth_state");
  return res;
}
