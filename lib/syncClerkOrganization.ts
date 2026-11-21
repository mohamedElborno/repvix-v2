import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { getConvexServerClient } from "./convex";
import { serverBridgeSecret } from "./serverBridge";
import { api } from "@/convex/_generated/api";

/** Called only after the request's Clerk identity or webhook signature is verified. */
export async function syncClerkOrganization(organizationId: string, webhook = false) {
  const clerk = await clerkClient();
  const org = await clerk.organizations.getOrganization({ organizationId });
  const convex = await getConvexServerClient(webhook);
  const serverSecret = serverBridgeSecret();
  await convex.mutation(api.orgs.syncOrganization, {
    serverSecret, clerkOrgId: org.id, name: org.name, createdBy: org.createdBy ?? "clerk",
  });
  const members = [];
  let offset = 0;
  for (;;) {
    const page = await clerk.organizations.getOrganizationMembershipList({ organizationId, limit: 100, offset });
    members.push(...page.data.map(m => ({
      clerkUserId: m.publicUserData?.userId ?? "",
      name: [m.publicUserData?.firstName, m.publicUserData?.lastName].filter(Boolean).join(" "),
      email: m.publicUserData?.identifier ?? "", imageUrl: m.publicUserData?.imageUrl ?? "", role: m.role,
    })));
    offset += page.data.length;
    if (offset >= page.totalCount) break;
    if (page.data.length === 0) throw new Error("Incomplete Clerk membership snapshot");
  }
  await convex.mutation(api.orgs.syncOrganizationMembers, { serverSecret, clerkOrgId: org.id, members });
}
