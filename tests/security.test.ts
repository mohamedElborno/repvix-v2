/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { verifyZendeskRequest } from "../convex/zendeskRequestAuth";
import { requireServerBridge } from "../convex/serverBridge";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
afterEach(() => vi.unstubAllEnvs());

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const a = await ctx.db.insert("organizations", { name: "A", clerkOrgId: "org_a", createdBy: "admin", createdAt: 1 });
    const b = await ctx.db.insert("organizations", { name: "B", clerkOrgId: "org_b", createdBy: "other", createdAt: 1 });
    const member = await ctx.db.insert("organizationMembers", { organizationId: a, clerkUserId: "member", role: "member", joinedAt: 1 });
    await ctx.db.insert("organizationMembers", { organizationId: a, clerkUserId: "admin", role: "admin", joinedAt: 1 });
    const other = await ctx.db.insert("organizationMembers", { organizationId: b, clerkUserId: "other", role: "admin", joinedAt: 1 });
    const chatA = await ctx.db.insert("chats", { organizationId: a, createdByMemberId: member, createdByUserId: "member", sourceType: "manual", status: "open", startedAt: 1, createdAt: 1 });
    const chatB = await ctx.db.insert("chats", { organizationId: b, createdByMemberId: other, createdByUserId: "other", sourceType: "manual", status: "open", startedAt: 1, createdAt: 1 });
    await ctx.db.insert("zendeskConnections", { organizationId: a, subdomain: "example", accessToken: "test-token-not-a-real-secret", refreshToken: "test-refresh-not-a-real-secret", expiresAt: 1, createdBy: "admin", createdAt: 1, updatedAt: 1 });
    return { a, b, member, chatA, chatB };
  });
  return { t, ...ids, memberClient: t.withIdentity({ subject: "member" }), adminClient: t.withIdentity({ subject: "admin" }) };
}

describe("organization isolation", () => {
  it("denies anonymous reads and cross-organization analysis reads", async () => {
    const { t, a, chatB, memberClient } = await fixture();
    await expect(t.query(api.zendesk.getConnectionByOrg, { organizationId: a })).rejects.toThrow();
    await expect(t.query(api.chatAnalysisData.getAnalysesForOrg, { organizationId: a })).rejects.toThrow();
    await expect(memberClient.query(api.chatAnalysisData.getChatWithMessagesForAnalysis, { chatId: chatB })).rejects.toThrow();
  });
  it("allows own messages but rejects mixed-tenant batches and embeddings", async () => {
    const { memberClient, chatA, chatB } = await fixture();
    expect(await memberClient.query(api.chats.getAllMessagesForMultipleChats, { chatIds: [chatA] })).toHaveProperty(chatA);
    // This query deliberately returns an empty object on unauthorized access.
    expect(await memberClient.query(api.chats.getAllMessagesForMultipleChats, { chatIds: [chatA, chatB] })).toEqual({});
    await expect(memberClient.query(api.chats.getMessageEmbeddingsForChats, { chatIds: [chatA, chatB] })).rejects.toThrow();
  });
  it("returns only safe connection metadata, even to an admin", async () => {
    const { a, adminClient, memberClient } = await fixture();
    for (const client of [adminClient, memberClient]) {
      const row = await client.query(api.zendesk.getConnectionByOrg, { organizationId: a });
      expect(row?.subdomain).toBe("example");
      expect(row).not.toHaveProperty("accessToken");
      expect(row).not.toHaveProperty("refreshToken");
    }
    await expect(memberClient.mutation(api.zendesk.deleteConnectionByOrg, { organizationId: a })).rejects.toThrow();
  });
  it("rejects forged admin identity for invoices and forged membership synchronization", async () => {
    const { a, t, memberClient } = await fixture();
    await expect(memberClient.query(api.billingRead.listInvoices, { organizationId: a, clerkUserId: "admin" })).rejects.toThrow();
    await expect(t.query(api.billingRead.listInvoices, { organizationId: a, clerkUserId: "admin" })).rejects.toThrow();
    await expect(memberClient.mutation(api.orgs.syncOrganizationMembers, { serverSecret: "invalid", clerkOrgId: "org_a", members: [{ clerkUserId: "member", name: "", email: "", imageUrl: "", role: "org:admin" }] })).rejects.toThrow();
  });
  it("requires both a server credential and membership to retrieve credentials", async () => {
    vi.stubEnv("CONVEX_SERVER_BRIDGE_SECRET", "s".repeat(48));
    const { a, t, adminClient } = await fixture();
    await expect(adminClient.query(api.zendesk.getServerConnection, { organizationId: a, serverSecret: "wrong" })).rejects.toThrow();
    await expect(t.query(api.zendesk.getServerConnection, { organizationId: a, serverSecret: "s".repeat(48) })).rejects.toThrow();
    expect(await adminClient.query(api.zendesk.getServerConnection, { organizationId: a, serverSecret: "s".repeat(48) })).toHaveProperty("accessToken");
  });
  it("applies authoritative role downgrades and membership revocations", async () => {
    vi.stubEnv("CONVEX_SERVER_BRIDGE_SECRET", "s".repeat(48));
    const { a, t, adminClient, memberClient } = await fixture();
    await t.mutation(api.orgs.syncOrganizationMembers, {
      serverSecret: "s".repeat(48), clerkOrgId: "org_a",
      members: [{ clerkUserId: "admin", name: "Synthetic", email: "demo@example.com", imageUrl: "", role: "org:member" }],
    });
    await expect(adminClient.mutation(api.zendesk.deleteConnectionByOrg, { organizationId: a })).rejects.toThrow();
    await expect(memberClient.query(api.zendesk.getConnectionByOrg, { organizationId: a })).rejects.toThrow();
  });
  it("reserves the last quota unit only once for concurrent requests", async () => {
    const { t } = await fixture();
    await t.run(async ctx => { await ctx.db.insert("zendeskUsage", { zendeskAccountKey: "example", plan: "trial", monthlyQuota: 1, usedThisMonth: 0, periodStart: 1 }); });
    const results = await Promise.all([1, 2].map(ticketId => t.mutation(internal.analysisJobs.reserve, { zendeskAccountKey: "example", ticketId })));
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});

describe("server authentication", () => {
  it("fails closed with absent configuration", () => {
    vi.stubEnv("CONVEX_SERVER_BRIDGE_SECRET", "");
    expect(() => requireServerBridge("")).toThrow();
  });
  it("checks token signature, account, scope and expiry", async () => {
    const secret = "t".repeat(48);
    vi.stubEnv("ZENDESK_APP_SIGNING_SECRET", secret);
    const now = Math.floor(Date.now() / 1000);
    const token = (extra = {}) => {
      const data = Buffer.from(JSON.stringify({ subdomain: "example", aud: "repvix-zendesk", iat: now, exp: now + 120, paths: ["/zendesk/job-status"], ...extra })).toString("base64url");
      return data + "." + createHmac("sha256", secret).update(data).digest("hex");
    };
    const request = (value: string, url = "https://example.test/zendesk/job-status") => new Request(url, { headers: { authorization: "Bearer " + value } });
    expect(await verifyZendeskRequest(request(token()), "example")).toBe(true);
    expect(await verifyZendeskRequest(request(token()), "other")).toBe(false);
    expect(await verifyZendeskRequest(request(token(), "https://example.test/zendesk/billing-portal"), "example")).toBe(false);
    expect(await verifyZendeskRequest(request(token({ exp: now - 1 })), "example")).toBe(false);
    expect(await verifyZendeskRequest(request(token() + "0"), "example")).toBe(false);
    expect(await verifyZendeskRequest(new Request("https://example.test/zendesk/job-status"), "example")).toBe(false);
  });
  it("all public Zendesk HTTP routes reject unsigned requests", async () => {
    const t = convexTest(schema, modules);
    for (const route of ["remaining", "job-status", "billing-portal", "analyze"]) {
      const response = await t.fetch("/zendesk/" + route, { method: "POST", body: JSON.stringify({ subdomain: "example", ticketId: 1, subject: "Example", comments: [] }) });
      expect(response.status).toBe(401);
    }
  });
});
