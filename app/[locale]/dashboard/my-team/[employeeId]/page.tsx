// app/dashboard/my-team/[employeeId]/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex";
import type { Id } from "@/convex/_generated/dataModel";

import EmployeeDetailsClient from "./EmployeeDetailsClient";

interface EmployeeDetailsPageProps {
  params: {
    employeeId: string; // مُعرّف العضو في Convex (من جدول organizationMembers)
  };
}

export default async function EmployeeDetailsPage({
  params,
}: EmployeeDetailsPageProps) {
  // 1. 🔑 التحقق من مصادقة Clerk وتحديد المنظمة
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect("/login");
  }

  const { employeeId } = params;

  // 2. 🛡️ جلب العميل المعرفي (Convex Server Client)
  const convex = getConvexServerClient();

  try {
    // 3. 💾 الاستعلام عن بيانات الموظف باستخدام Convex والدالة الجديدة
    const employeeData = await convex.query(
      api.orgMembers.getOrganizationMemberById,
      {
        memberId: employeeId as Id<"organizationMembers">, // 🚨 تمرير ID Convex الصحيح
        organizationId: orgId, // تمرير orgId للتحقق من الملكية
      }
    );

    const organizationMember = employeeData?.organizationMember;
    const employeeClerkUserId = employeeData?.clerkUserId;
    console.log(employeeData);
    if (!organizationMember || !employeeClerkUserId) {
      console.log(employeeData);
      redirect("/dashboard/my-team");
    }

    // 4. 🚀 تمرير البيانات إلى المكون العميل
    return (
      <EmployeeDetailsClient
        // لاحظ أننا نستخدم الآن organizationMember مباشرة
        employee={{
          id: organizationMember._id,
          name: organizationMember.name || "",
          email: organizationMember.email || "",
          image: organizationMember.imageUrl || "",
          manager_id: organizationMember.organizationId,
          full_name: organizationMember.name || "",
          phone: "",
          imageUrl: organizationMember.imageUrl || "",
          userId: employeeClerkUserId,
          createdAt: organizationMember._creationTime,
          organizationId: organizationMember.organizationId,
          clerkUserId: employeeClerkUserId,
          joinedAt: organizationMember.joinedAt,
          role: organizationMember.role as "owner" | "admin" | "member",
          lastActive:
            organizationMember.joinedAt ?? organizationMember._creationTime,
          isActive: true,
          isOnline: false,
          isAway: false,
          isBusy: false,
          isIdle: false,
          isOffline: true,
        }}
        clerkUserId={employeeClerkUserId} // تمرير ID المستخدم في Clerk
      />
    );
  } catch (error) {
    console.error("Error fetching organization member from Convex:", error);
    redirect("/dashboard/my-team");
  }
}
