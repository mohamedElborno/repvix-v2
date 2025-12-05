"use server";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { getConvexServerClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

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

export async function leaveOrganizationAction(orgId: string) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  // Remove the user from the organization in Clerk
  const clerk = await clerkClient();
  await clerk.organizations.deleteOrganizationMembership({
    organizationId: orgId,
    userId: user.id,
  });

  return { success: true, message: "User left organization successfully" };
}

/**
 * Server action to create organization in Clerk and sync it to Convex
 */
export async function createOrganizationAction(name: string) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const clerk = await clerkClient();
    const convex = await getConvexServerClient();

    // 1) Create organization in Clerk
    const org = await clerk.organizations.createOrganization({
      name,
      createdBy: user.id,
    });

    // 2) Sync organization to Convex
    await convex.mutation(api.orgs.syncOrganization, {
      clerkOrgId: org.id,
      name: org.name,
      createdBy: user.id,
    });

    // 3) Get organization members from Clerk
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId: org.id,
    });

    // 4) Sync members to Convex
    await convex.mutation(api.orgs.syncOrganizationMembers, {
      clerkOrgId: org.id,
      members: memberships.data.map((m) => ({
        clerkUserId: m.publicUserData?.userId || "",
        name:
          m.publicUserData?.firstName && m.publicUserData?.lastName
            ? `${m.publicUserData.firstName} ${m.publicUserData.lastName}`
            : m.publicUserData?.identifier || "",
        email: m.publicUserData?.identifier || "",
        role: m.role,
        imageUrl: m.publicUserData?.imageUrl || "",
      })),
    });

    return {
      success: true,
      organizationId: org.id,
      message: "Organization created and synced successfully",
    };
  } catch (error: any) {
    console.error("Error creating organization:", error);
    throw new Error(
      error?.message || "Failed to create organization"
    );
  }
}
