import type { ChatListItemData } from "../components/ChatListItem";
import type { User as ClerkUser } from "@clerk/nextjs/server";

// DashboardClientProps is the props for the DashboardClient component
export interface DashboardClientProps {
  initialChats: ChatListItemData[];
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
  user: ClerkUser;
  employees: Employee[];
  pendingInvitations: EmployeeInvitation[];
  employeesError: any;
  invitationsError: any;
}
