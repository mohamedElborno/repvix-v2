/* import { createClient } from "@/lib/server/server";
import { redirect } from "next/navigation";
import EditEmployeeClient from "./EditEmployeeClient";
import type { Id } from "@/convex/_generated/dataModel";

interface EditEmployeePageProps {
  params: Promise<{
    employeeId: string;
  }>;
}

export default async function EditEmployeePage({
  params,
}: EditEmployeePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const { employeeId } = await params;
  // employeeId comes from URL as string, but we need to cast it to Id<"employees"> when using with Convex
  const employeeIdTyped = employeeId as Id<"employees">;

  // Fetch the specific employee
  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .eq("manager_id", user.id) // Ensure the user is the manager
    .single();

  if (employeeError || !employee) {
    redirect("/dashboard/my-team");
  }

  return <EditEmployeeClient employee={employee} user={user} />;
}
 */

import React from "react";

export default function page() {
  return <div></div>;
}
