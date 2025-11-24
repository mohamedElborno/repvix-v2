// app/dashboard/my-team/[employeeId]/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex";
import type { Id } from "@/convex/_generated/dataModel";

import EmployeeDetailsClient from "./EmployeeDetailsClient";

export default async function EmployeeDetailsPage({
  params,
}: {
  params: Promise<any>;
}) {
  // 1. 🔑 التحقق من مصادقة Clerk وتحديد المنظمة
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect("/login");
  }

  const { memberConvexId } = await params;

  // 2. 🛡️ جلب العميل المعرفي (Convex Server Client)
  const convex = await getConvexServerClient();

  try {
    // 3. 💾 الاستعلام عن بيانات الموظف باستخدام Convex والدالة الجديدة
    const employeeData = await convex.query(
      api.orgMembers.getOrganizationMemberById,
      {
        memberId: memberConvexId as Id<"organizationMembers">, // 🚨 تمرير ID Convex الصحيح
        organizationId: orgId, // تمرير orgId للتحقق من الملكية
      }
    );

    const organizationMember = employeeData?.organizationMember;
    const employeeClerkUserId = employeeData?.clerkUserId;

    if (!organizationMember || !employeeClerkUserId) {
      redirect("/dashboard/my-team");
    }

    // 4. 🚀 تمرير البيانات إلى المكون العميل
    return (
      <EmployeeDetailsClient
        // لاحظ أننا نستخدم الآن organizationMember مباشرة
        employee={{
          id: (organizationMember?._id as string) || "",
          name: organizationMember?.name || "",
          email: organizationMember?.email || "",
          image: organizationMember?.imageUrl || "",
          manager_id: organizationMember?.organizationId || "",
          full_name: organizationMember?.name || "",
          phone: "",
          imageUrl: organizationMember?.imageUrl || "",
          userId: employeeClerkUserId || "",
          createdAt: organizationMember?._creationTime || 0,
          organizationId:
            (organizationMember?.organizationId as Id<"organizations">) ||
            ("" as Id<"organizations">),
          clerkUserId: employeeClerkUserId || "",
          joinedAt: organizationMember?.joinedAt || 0,
          role:
            (organizationMember?.role as "owner" | "admin" | "member") ||
            "member",
          lastActive:
            (organizationMember?.joinedAt ??
              organizationMember?._creationTime) ||
            0,
          isActive: true,
          isOnline: false,
          isAway: false,
          isBusy: false,
          isIdle: false,
          isOffline: true,
        }}
        clerkUserId={employeeClerkUserId || ""} // تمرير ID المستخدم في Clerk
      />
    );
  } catch (error) {
    // 🔒 لا نعرض تفاصيل الخطأ للمستخدم (Security best practice)
    redirect("/dashboard/my-team");
  }
}
