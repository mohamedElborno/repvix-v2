import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConvexServerClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { organizationId, variantId } = await req.json();
    if (typeof organizationId !== "string" || typeof variantId !== "string") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const convex = await getConvexServerClient();
    const result = await convex.action(api.billing.createCheckout, { organizationId: organizationId as Id<"organizations">, clerkUserId: userId, variantId });
    return NextResponse.json(result, { status: result.ok ? 200 : 403 });
  } catch { return NextResponse.json({ error: "Checkout request failed" }, { status: 400 }); }
}
