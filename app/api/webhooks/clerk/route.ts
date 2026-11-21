import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { syncClerkOrganization } from "@/lib/syncClerkOrganization";
export async function POST(req: NextRequest) {
  let event;
  try { event = await verifyWebhook(req); } catch { return new Response("Invalid signature", { status: 400 }); }
  if (event.type === "organizationMembership.created" || event.type === "organizationMembership.updated" || event.type === "organizationMembership.deleted") {
    await syncClerkOrganization(event.data.organization.id, true);
  }
  return new Response(null, { status: 204 });
}
