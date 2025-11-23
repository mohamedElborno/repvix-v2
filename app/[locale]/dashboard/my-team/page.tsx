import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import EmployeesClient from "./EmployeesClient";

export default async function EmployeesPage() {
  const { userId } = await auth();
  console.log("userId", userId);
  if (!userId) {
    redirect("/sign-in");
  }

  return <EmployeesClient key={userId} />;
}
