import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";

// 🔒 SECURITY: Minimal scopes for read-only analysis (principle of least privilege)
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

  // 🔒 SECURITY: Validate subdomain format to prevent injection attacks
  // Only allow alphanumeric characters and hyphens
  if (!/^[a-zA-Z0-9-]+$/.test(subdomain)) {
    return NextResponse.json(
      { ok: false, error: "Invalid subdomain format" },
      { status: 400 }
    );
  }

  // 🔒 SECURITY: Validate subdomain length
  if (subdomain.length < 1 || subdomain.length > 63) {
    return NextResponse.json(
      { ok: false, error: "Invalid subdomain length" },
      { status: 400 }
    );
  }

  const clientId = process.env.ZENDESK_CLIENT_ID;
  const redirectUri = process.env.ZENDESK_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { ok: false, error: "Server configuration error" }, // Don't expose internal details
      { status: 500 }
    );
  }

  const nonce = randomUUID();
  // 🔒 SECURITY: Include orgId in state to verify in callback
  // Format: nonce|subdomain|orgId
  const state = `${nonce}|${subdomain}|${orgId}`;

  const authorizeUrl = `https://${subdomain}.zendesk.com/oauth/authorizations/new?response_type=code&client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
    SCOPES
  )}&state=${encodeURIComponent(state)}`;

  const res = NextResponse.redirect(authorizeUrl);
  
  // 🔒 SECURITY: Store nonce in secure cookie for CSRF protection
  res.cookies.set("zendesk_oauth_state", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integrations/zendesk",
    maxAge: 10 * 60, // 10 minutes
  });

  return res;
}
