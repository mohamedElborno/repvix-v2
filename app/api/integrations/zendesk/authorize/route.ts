import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";

// Minimal scopes for read-only analysis
const SCOPES = "tickets:read users:read";

export async function GET(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const subdomain = url.searchParams.get("subdomain");

  if (!subdomain) {
    return NextResponse.json(
      { ok: false, error: "Missing Zendesk subdomain" },
      { status: 400 }
    );
  }

  const clientId = process.env.ZENDESK_CLIENT_ID;
  const redirectUri = process.env.ZENDESK_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { ok: false, error: "Missing Zendesk OAuth env vars" },
      { status: 500 }
    );
  }

  const nonce = randomUUID();
  // encode subdomain inside state so we can retrieve it in callback
  const state = `${nonce}|${subdomain}`;

  const authorizeUrl = `https://${subdomain}.zendesk.com/oauth/authorizations/new?response_type=code&client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
    SCOPES
  )}&state=${encodeURIComponent(state)}`;

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set("zendesk_oauth_state", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integrations/zendesk",
    maxAge: 10 * 60, // 10 minutes
  });

  return res;
}
