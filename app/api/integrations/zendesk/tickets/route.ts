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

export async function GET(req: NextRequest) {
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

    const simplified = tickets.map((t: any) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      updated_at: t.updated_at,
      created_at: t.created_at,
      requester_id: t.requester_id,
      assignee_id: t.assignee_id,
      priority: t.priority,
    }));

    return NextResponse.json({ ok: true, tickets: simplified });
  } catch (error: any) {
    console.error("Zendesk tickets error", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}
