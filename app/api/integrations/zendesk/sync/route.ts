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
  const timeoutId = setTimeout(() => controller.abort(), 10000);

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
      console.error("[Zendesk Sync] Failed to fetch tickets:", errorText);
      throw new Error("Failed to fetch tickets");
    }

    const json = await res.json();
    return Array.isArray(json?.tickets) ? json.tickets : [];
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchTicketComments(
  subdomain: string,
  accessToken: string,
  ticketId: number
): Promise<any[]> {
  // 🔒 SECURITY: Validate ticketId
  if (!Number.isFinite(ticketId) || ticketId <= 0) {
    throw new Error("Invalid ticket ID");
  }

  // 🔒 SECURITY: Use timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(
      `https://${subdomain}.zendesk.com/api/v2/tickets/${ticketId}/comments.json`,
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
      console.error(
        `[Zendesk Sync] Failed to fetch comments for ticket ${ticketId}:`,
        errorText
      );
      throw new Error("Failed to fetch comments");
    }

    const json = await res.json();
    return Array.isArray(json?.comments) ? json.comments : [];
  } finally {
    clearTimeout(timeoutId);
  }
}

function convertCommentsToMessages(comments: any[]) {
  return comments.map((c) => ({
    role:
      c?.author_id && c?.via?.source?.from?.address === c?.author_id
        ? "customer"
        : "agent",
    content: c?.body || "",
    timestamp: c?.created_at ? new Date(c.created_at).getTime() : Date.now(),
    authorId: c?.author_id,
  }));
}

// Hook to run your rule-based preprocessing before AI.
// Replace the body with your existing rule-based pipeline as needed.
function preprocessForAnalysis(
  messages: ReturnType<typeof convertCommentsToMessages>
) {
  // TODO: plug in your rule-based logic (flags/structure/time/normalization) here.
  // For now, we just pass through without storing messages.
  return messages;
}

export async function POST(req: NextRequest) {
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
        { ok: false, error: "Not a member of this organization" },
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

    // 🔒 SECURITY: Limit number of tickets to process to prevent DoS
    const MAX_TICKETS_PER_SYNC = 50;
    const ticketsToProcess = tickets.slice(0, MAX_TICKETS_PER_SYNC);

    // Note: This sync endpoint is deprecated/unused
    // Use the analyzeTicket action directly for on-demand analysis
    console.warn(
      `[Zendesk Sync] Deprecated endpoint used. Found ${tickets.length} tickets, processing ${ticketsToProcess.length}`
    );

    return NextResponse.json({
      ok: true,
      tickets: ticketsToProcess.length,
      total: tickets.length,
      message:
        "Sync endpoint is deprecated. Use analyze button on individual tickets instead.",
    });
  } catch (error: any) {
    console.error("[Zendesk Sync] Error:", error);
    // 🔒 SECURITY: Don't expose internal error details to user
    return NextResponse.json(
      { ok: false, error: "Sync failed. Please try again later." },
      { status: 500 }
    );
  }
}
