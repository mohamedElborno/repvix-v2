import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConvexServerClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

async function fetchTicketComments(
  subdomain: string,
  accessToken: string,
  ticketId: string
) {
  const res = await fetch(
    `https://${subdomain}.zendesk.com/api/v2/tickets/${ticketId}/comments.json`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.comments ?? [];
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
    public: c?.public ?? true,
  }));
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { ticketId } = await context.params;
    const ticketIdStr = String(ticketId || "").trim();
    const ticketIdNum = Number(ticketIdStr);
    if (!ticketIdStr || Number.isNaN(ticketIdNum)) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid ticketId" },
        { status: 400 }
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

    const connection = await convex.query(api.zendesk.getConnectionByOrg, {
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
        { ok: false, error: "Missing subdomain or access token" },
        { status: 400 }
      );
    }

    const comments = await fetchTicketComments(
      subdomain,
      accessToken,
      ticketIdStr
    );
    const messages = convertCommentsToMessages(comments);

    return NextResponse.json({ ok: true, comments: messages });
  } catch (error: any) {
    console.error("Zendesk ticket comments error", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to fetch comments" },
      { status: 500 }
    );
  }
}
