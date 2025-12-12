import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConvexServerClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

async function fetchTicketComments(
  subdomain: string,
  accessToken: string,
  ticketId: string
): Promise<any[]> {
  // 🔒 SECURITY: Validate inputs
  if (!subdomain || !accessToken || !ticketId) {
    throw new Error("Missing required parameters");
  }

  if (!/^[a-zA-Z0-9-]+$/.test(subdomain)) {
    throw new Error("Invalid subdomain format");
  }

  // 🔒 SECURITY: Validate ticketId is numeric
  const ticketIdNum = Number(ticketId);
  if (!Number.isFinite(ticketIdNum) || ticketIdNum <= 0) {
    throw new Error("Invalid ticket ID");
  }

  // 🔒 SECURITY: Use timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(
      `https://${subdomain}.zendesk.com/api/v2/tickets/${ticketIdNum}/comments.json`,
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
        `[Zendesk] Failed to fetch comments for ticket ${ticketId}:`,
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
  if (!Array.isArray(comments)) {
    return [];
  }

  return comments.map((c: any) => {
    // 🔒 SECURITY: Clean HTML from content to prevent XSS
    const rawContent = c?.body || "";
    const cleanedContent =
      typeof rawContent === "string"
        ? rawContent
            .replace(/<[^>]+>/g, "") // Remove HTML tags
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim()
        : "";

    return {
      role:
        c?.author_id && c?.via?.source?.from?.address === c?.author_id
          ? "customer"
          : "agent",
      content: cleanedContent,
      timestamp: c?.created_at ? new Date(c.created_at).getTime() : Date.now(),
      authorId: c?.author_id ?? null,
      public: c?.public ?? true,
    };
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { ticketId } = await context.params;

    // 🔒 SECURITY: Validate ticketId
    const ticketIdStr = String(ticketId || "").trim();
    const ticketIdNum = Number(ticketIdStr);

    if (!ticketIdStr || Number.isNaN(ticketIdNum) || ticketIdNum <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid ticket ID" },
        { status: 400 }
      );
    }

    // 🔒 SECURITY: Additional validation - prevent extremely large IDs
    if (ticketIdNum > Number.MAX_SAFE_INTEGER) {
      return NextResponse.json(
        { ok: false, error: "Invalid ticket ID" },
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

    const comments = await fetchTicketComments(
      subdomain,
      accessToken,
      ticketIdStr
    );
    const messages = convertCommentsToMessages(comments);

    // 🔒 SECURITY: Limit number of comments returned
    const MAX_COMMENTS = 500;
    const limitedMessages = messages.slice(0, MAX_COMMENTS);

    return NextResponse.json({
      ok: true,
      comments: limitedMessages,
      total: messages.length,
      limited: messages.length > MAX_COMMENTS,
    });
  } catch (error: any) {
    console.error("[Zendesk Comments] Error:", error);
    // 🔒 SECURITY: Don't expose internal error details
    return NextResponse.json(
      { ok: false, error: "Failed to fetch comments. Please try again." },
      { status: 500 }
    );
  }
}
