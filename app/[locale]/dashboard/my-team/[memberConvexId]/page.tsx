// app/[locale]/dashboard/my-team/[memberConvexId]/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex";
import type { Id } from "@/convex/_generated/dataModel";

import EmployeeDetailsClient from "./EmployeeDetailsClient";

type PageParams = {
  locale: string; // لأن عندك [locale] في المسار
  memberConvexId: string; // اسم البرام في المسار
};

export default async function EmployeeDetailsPage(props: {
  params: Promise<PageParams>;
}) {
  // 1) فك الـ params مرة واحدة فقط
  const [{ userId }, { memberConvexId, locale }] = await Promise.all([
    auth(),
    props.params,
  ]);

  // لو حاب تطبّع بعد ما تفك الوعد (هذا آمن)
  console.log("Server params:", { locale, memberConvexId });

  // 2) لو مافيش user → روح للّوجين
  if (!userId) {
    redirect("/login");
  }

  // 3) تحقق بسيط على شكل الـ id (اختياري لكن أنظف من regex الغلط السابق)
  const isValidConvexId = /^[a-z0-9]{32}$/.test(memberConvexId);

  if (!memberConvexId || !isValidConvexId) {
    console.error(
      "ERROR: Invalid memberConvexId",
      memberConvexId,
      isValidConvexId
    );
    // إعادة توجيه بدلاً من `return null` عشان السلوك يكون واضح
    redirect(`/${locale}/dashboard/my-team`);
  }

  const convex = await getConvexServerClient();

  try {
    const result = await convex.query(
      api.orgMembers.getOrganizationMemberById,
      {
        memberId: memberConvexId as Id<"organizationMembers">,
      }
    );

    if (!result) {
      console.error("ERROR: No result found");
      redirect(`/${locale}/dashboard/my-team`);
    }

    const { organizationMember, clerkUserId } = result;

    if (!organizationMember || !clerkUserId) {
      console.error("ERROR: No organization member found");
      redirect(`/${locale}/dashboard/my-team`);
    }

    return (
      <EmployeeDetailsClient
        clerkUserId={clerkUserId}
        employee={{
          id: organizationMember._id as string,
          name: organizationMember.name || "",
          email: organizationMember.email || "",
          imageUrl: organizationMember.imageUrl || "",
          clerkUserId,
          organizationId:
            organizationMember.organizationId as Id<"organizations">,
          role: organizationMember.role,
          joinedAt: organizationMember.joinedAt || 0,
          createdAt: organizationMember._creationTime || 0,
          lastActive:
            organizationMember.joinedAt ??
            organizationMember._creationTime ??
            0,
          isActive: true,
          isOnline: false,
        }}
      />
    );
  } catch (err) {
    console.error("ERROR fetching member from Convex:", err);
    redirect(`/${locale}/dashboard/my-team`);
  }
}
