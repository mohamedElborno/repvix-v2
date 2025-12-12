"use server";

import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getConvexServerClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import ZendeskTicketViewClient from "../../components/pages/ZendeskTicketViewClient";

interface PageProps {
  params: Promise<{ locale: string; ticketId: string }>;
}

async function fetchZendeskResource<T>(
  subdomain: string,
  accessToken: string,
  path: string
): Promise<T> {
  const res = await fetch(`https://${subdomain}.zendesk.com${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Zendesk request failed (${res.status} ${res.statusText}): ${text}`
    );
  }

  return res.json();
}

type ZendeskTicket = {
  id: number;
  subject?: string;
  status?: string;
  priority?: string;
  requester_id?: number;
  assignee_id?: number;
  created_at?: string;
  updated_at?: string;
};

type ZendeskComment = {
  id?: number;
  author_id?: number;
  body?: string;
  public?: boolean;
  created_at?: string;
};

function normalizeComments(
  comments: ZendeskComment[],
  requesterId?: number
): Array<{
  id: string;
  role: "customer" | "agent" | "system";
  content: string;
  timestamp: number;
  authorId?: number;
  public?: boolean;
}> {
  return comments
    .map((c, idx) => {
      const ts = c.created_at ? new Date(c.created_at).getTime() : Date.now();
      const role: "customer" | "agent" | "system" =
        requesterId && c.author_id === requesterId ? "customer" : "agent";
      const content = (c.body ?? "").replace(/<[^>]+>/g, "").trim();

      return {
        id: `zd-${c.id ?? idx}`,
        role,
        content,
        timestamp: ts,
        authorId: c.author_id,
        public: c.public,
      };
    })
    .filter((c) => c.content.length > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export default async function ZendeskTicketPage({ params }: PageProps) {
  const { ticketId } = await params;
  const ticketIdNum = Number(ticketId);

  if (Number.isNaN(ticketIdNum)) {
    notFound();
  }

  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    notFound();
  }

  const convex = await getConvexServerClient();

  const convexOrgId = await convex.query(api.orgs.getByClerkId, {
    clerkOrgId: orgId,
  });

  if (!convexOrgId) {
    notFound();
  }

  const connection = await convex.query(api.zendesk.getConnectionByOrg, {
    organizationId: convexOrgId,
  });

  if (!connection) {
    notFound();
  }

  const { subdomain, accessToken } = connection as any;

  if (!subdomain || !accessToken) {
    notFound();
  }

  let ticket: ZendeskTicket | null = null;
  let comments: ZendeskComment[] = [];

  try {
    const [ticketJson, commentsJson] = await Promise.all([
      fetchZendeskResource<{ ticket: ZendeskTicket }>(
        subdomain,
        accessToken,
        `/api/v2/tickets/${ticketIdNum}.json`
      ),
      fetchZendeskResource<{ comments: ZendeskComment[] }>(
        subdomain,
        accessToken,
        `/api/v2/tickets/${ticketIdNum}/comments.json`
      ),
    ]);

    ticket = ticketJson?.ticket ?? null;
    comments = commentsJson?.comments ?? [];
  } catch (error) {
    console.error("Failed to fetch Zendesk ticket", error);
    notFound();
  }

  if (!ticket) {
    notFound();
  }

  // Get the chat document for this Zendesk ticket (if it exists)
  const zendeskChat = await convex.query(api.zendesk.getZendeskChat, {
    organizationId: convexOrgId,
    ticketId: ticketIdNum,
  });

  const analysis = await convex.query(api.zendesk.getLatestAnalysis, {
    organizationId: convexOrgId,
    ticketId: ticketIdNum,
  });

  return (
    <ZendeskTicketViewClient
      ticket={ticket}
      comments={normalizeComments(comments, ticket?.requester_id)}
      analysis={analysis ?? null}
      organizationId={convexOrgId}
      chatId={zendeskChat?._id ?? null}
    />
  );
}
