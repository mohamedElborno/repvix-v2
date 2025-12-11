import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

export const saveConnection = mutation({
  args: {
    organizationId: v.id("organizations"),
    subdomain: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(),
    scope: v.optional(v.string()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Upsert per org
    const existing = await ctx.db
      .query("zendeskConnections")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        subdomain: args.subdomain,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        scope: args.scope,
        updatedAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("zendeskConnections", {
      organizationId: args.organizationId,
      subdomain: args.subdomain,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      scope: args.scope,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});

export const getConnectionByOrg = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("zendeskConnections")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();
  },
});

export const deleteConnectionByOrg = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("zendeskConnections")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});

export const analyzeZendeskTicket = mutation({
  args: {
    organizationId: v.id("organizations"),
    ticketId: v.number(),
    analysis: v.any(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("zendeskAnalyses", {
      organizationId: args.organizationId,
      ticketId: args.ticketId,
      analysis: args.analysis,
      createdAt: Date.now(),
    });
    return id;
  },
});

// Optional: refresh Zendesk access token when a refresh_token is stored
export const refreshAccessToken = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    | { ok: true; expiresAt: number }
    | { ok: false; error: string; details?: string }
  > => {
    const connection = await ctx.runQuery(api.zendesk.getConnectionByOrg, {
      organizationId: args.organizationId,
    });

    if (!connection?.refreshToken) {
      return { ok: false, error: "No refresh token stored" };
    }

    const clientId = process.env.ZENDESK_CLIENT_ID;
    const clientSecret = process.env.ZENDESK_CLIENT_SECRET;
    const redirectUri = process.env.ZENDESK_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return { ok: false, error: "Missing Zendesk OAuth env vars" };
    }

    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", connection.refreshToken);
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("redirect_uri", redirectUri);

    const tokenRes: Response = await fetch(
      `https://${connection.subdomain}.zendesk.com/oauth/tokens`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      }
    );

    if (!tokenRes.ok) {
      const text: string = await tokenRes.text();
      return { ok: false, error: "Refresh failed", details: text };
    }

    const json = await tokenRes.json();
    const accessToken = json?.access_token as string | undefined;
    const refreshToken =
      (json?.refresh_token as string | undefined) ?? connection.refreshToken;
    const expiresIn = (json?.expires_in as number | undefined) ?? 3600;
    const scope = json?.scope as string | undefined;

    if (!accessToken) {
      return { ok: false, error: "Missing access token in refresh response" };
    }

    const expiresAt = Date.now() + expiresIn * 1000;

    await ctx.runMutation(api.zendesk.saveConnection, {
      organizationId: args.organizationId,
      subdomain: connection.subdomain,
      accessToken,
      refreshToken,
      expiresAt,
      scope,
      createdBy: connection.createdBy,
    });

    return { ok: true, expiresAt };
  },
});
