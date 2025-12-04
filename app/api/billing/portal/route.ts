import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConvexServerClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

export async function GET() {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const convex = await getConvexServerClient();
    
    // Get Convex organization ID from Clerk org ID
    const convexOrgId = await convex.query(api.orgs.getByClerkId, {
      clerkOrgId: orgId,
    });

    if (!convexOrgId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get billing portal data
    const billingData = await convex.query(api.billing.getBillingPortalData, {
      organizationId: convexOrgId,
    });

    return NextResponse.json({
      plan: billingData.plan,
      limits: billingData.limits,
    });
  } catch (error: any) {
    console.error("Error fetching billing portal data:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const convex = await getConvexServerClient();
    
    // Get Convex organization ID from Clerk org ID
    const convexOrgId = await convex.query(api.orgs.getByClerkId, {
      clerkOrgId: orgId,
    });

    if (!convexOrgId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get billing portal data to retrieve portal URL
    const billingData = await convex.query(api.billing.getBillingPortalData, {
      organizationId: convexOrgId,
    });

    if (!billingData.portalUrl) {
      // Fallback to generic Lemon Squeezy billing portal
      return NextResponse.json({
        url: "https://repvix.lemonsqueezy.com/billing",
      });
    }

    return NextResponse.json({
      url: billingData.portalUrl,
    });
  } catch (error: any) {
    console.error("Error getting billing portal URL:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

