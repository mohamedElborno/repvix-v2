/* import type { Chat } from "@/convex/_generated/dataModel";
import type { User } from "@clerk/nextjs/server"; */

// DashboardClientProps is the props for the DashboardClient component
interface Chat {
  id: string;
  title: string;
  createdAt: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  image: string;
}

export interface DashboardClientProps {
  initialChats: Chat[];
  stats: {
    totalChats: number;
    totalChunks: number;
  };
  user: User;
}

// DashboardLayoutClientProps is the props for the DashboardLayoutClient component
export interface DashboardLayoutClientProps {
  children: React.ReactNode;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string;
}

interface EmployeeInvitation {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
}

// TeamClientProps is the props for the TeamClient component
export interface TeamClientProps {
  user: User;
  employees: Employee[];
  pendingInvitations: EmployeeInvitation[];
  employeesError: any;
  invitationsError: any;
}
