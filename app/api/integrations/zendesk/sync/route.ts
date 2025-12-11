import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConvexServerClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

async function fetchTickets(subdomain: string, accessToken: string) {
  const res = await fetch(
    `https://${subdomain}.zendesk.com/api/v2/tickets.json`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.tickets ?? [];
}

async function fetchTicketComments(
  subdomain: string,
  accessToken: string,
  ticketId: number
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
    const { orgId } = await auth();
    if (!orgId) {
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

    const tickets = await fetchTickets(subdomain, accessToken);

    for (const t of tickets) {
      const comments = await fetchTicketComments(subdomain, accessToken, t.id);
      const messages = convertCommentsToMessages(comments);
      const processedMessages = preprocessForAnalysis(messages);

      // TODO: replace with actual AI pipeline
      const analysis = {
        ticketId: t.id,
        messageCount: processedMessages.length,
      };

      await convex.mutation(api.zendesk.analyzeZendeskTicket, {
        organizationId: convexOrg,
        ticketId: t.id,
        analysis,
      });
    }

    return NextResponse.json({ ok: true, tickets: tickets.length });
  } catch (error: any) {
    console.error("Zendesk sync error", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Sync failed" },
      { status: 500 }
    );
  }
}
