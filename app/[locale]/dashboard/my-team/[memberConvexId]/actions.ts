"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * Server action to remove a member from Clerk organization
 */
export async function removeMemberFromClerk(clerkUserId: string) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      throw new Error("Organization not found");
    }

    const clerk = await clerkClient();

    // Get the organization membership ID for this user
    const memberships = await clerk.organizations.getOrganizationMembershipList(
      {
        organizationId: orgId,
      }
    );

    const membership = memberships.data.find(
      (m) => m.publicUserData?.userId === clerkUserId
    );

    if (!membership) {
      // Member not found in Clerk, but that's okay - they may have been removed already
      console.warn(`Member ${clerkUserId} not found in Clerk organization`);
      return {
        success: true,
        message: "Member not found in Clerk (may already be removed)",
      };
    }

    // Remove the member using the membership ID
    await clerk.organizations.deleteOrganizationMembership({
      organizationId: orgId,
      userId: clerkUserId,
    });

    return { success: true, message: "Member removed from Clerk successfully" };
  } catch (error: any) {
    console.error("Error removing member from Clerk:", error);
    throw new Error(
      error?.message || "Failed to remove member from Clerk organization"
    );
  }
}
