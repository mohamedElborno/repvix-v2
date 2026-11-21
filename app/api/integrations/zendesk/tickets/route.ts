import { serverBridgeSecret } from "@/lib/serverBridge";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConvexServerClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

async function fetchTickets(
  subdomain: string,
  accessToken: string
): Promise<any[]> {
  // 🔒 SECURITY: Validate inputs
  if (!subdomain || !accessToken) {
    throw new Error("Missing required parameters");
  }

  if (!/^[a-zA-Z0-9-]+$/.test(subdomain)) {
    throw new Error("Invalid subdomain format");
  }

  // 🔒 SECURITY: Use timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds

  try {
    const res = await fetch(
      `https://${subdomain}.zendesk.com/api/v2/tickets.json`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Zendesk] Failed to fetch tickets:", errorText);
      throw new Error("Failed to fetch tickets");
    }

    const json = await res.json();
    return Array.isArray(json?.tickets) ? json.tickets : [];
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const convex = await getConvexServerClient();
    const convexOrg = await convex.query(api.orgs.getByClerkId, {
      clerkOrgId: orgId,
    });

    if (!convexOrg) {
      return NextResponse.json(
        { ok: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    // 🔒 SECURITY: Verify user is member of organization
    const membership = await convex.query(api.orgMembers.isMember, {
      organizationId: convexOrg,
      clerkUserId: userId,
    });

    if (!membership) {
      return NextResponse.json(
        { ok: false, error: "Access denied" },
        { status: 403 }
      );
    }

    const connection = await convex.query(api.zendesk.getServerConnection, {
      serverSecret: serverBridgeSecret(),
      organizationId: convexOrg,
    });

    if (!connection) {
      return NextResponse.json(
        { ok: false, error: "Zendesk connection not found" },
        { status: 404 }
      );
    }

    const { subdomain, accessToken } = connection as any;
    if (!subdomain || !accessToken) {
      return NextResponse.json(
        { ok: false, error: "Invalid connection configuration" },
        { status: 400 }
      );
    }

    // 🔒 SECURITY: Validate subdomain format
    if (!/^[a-zA-Z0-9-]+$/.test(subdomain)) {
      return NextResponse.json(
        { ok: false, error: "Invalid subdomain format" },
        { status: 400 }
      );
    }

    const tickets = await fetchTickets(subdomain, accessToken);

    // 🔒 SECURITY: Sanitize output - only return necessary fields
    const simplified = tickets.map((t: any) => ({
      id: t.id,
      subject: t.subject ?? null,
      status: t.status ?? null,
      updated_at: t.updated_at ?? null,
      created_at: t.created_at ?? null,
      requester_id: t.requester_id ?? null,
      assignee_id: t.assignee_id ?? null,
      priority: t.priority ?? null,
    }));

    // 🔒 SECURITY: Limit response size
    const MAX_TICKETS = 100;
    const limitedTickets = simplified.slice(0, MAX_TICKETS);

    return NextResponse.json({
      ok: true,
      tickets: limitedTickets,
      total: tickets.length,
      limited: tickets.length > MAX_TICKETS,
    });
  } catch (error: any) {
    console.error("[Zendesk Tickets] Error:", error);
    // 🔒 SECURITY: Don't expose internal error details
    return NextResponse.json(
      { ok: false, error: "Failed to fetch tickets. Please try again." },
      { status: 500 }
    );
  }
}
