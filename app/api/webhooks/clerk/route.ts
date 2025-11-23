import { getConvexServerClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

export async function POST(req: Request) {
  const payload = await req.json();
  const convex = getConvexServerClient();

  if (payload.type === "organization.membership.created") {
    const data = payload.data;

    // 1) اجلب Convex Org ID
    const convexOrgId = await convex.query(api.orgs.getByClerkId, {
      clerkOrgId: data.organization.id,
    });

    if (!convexOrgId) {
      console.error("Organization not found in Convex");
      return new Response("Organization not found", { status: 400 });
    }

    // 2) أضف العضو
    await convex.mutation(api.orgMembers.addMemberFromInvite, {
      organizationId: convexOrgId,
      clerkUserId: data.publicUserData.userId,
      name: data.publicUserData.firstName || "",
      email: data.publicUserData.identifier,
      imageUrl: data.publicUserData.imageUrl,
      role: data.role,
    });
  }

  return new Response("ok");
}
