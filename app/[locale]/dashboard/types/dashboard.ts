import type { ChatListItemData } from "../components/ChatListItem";
import type { User as ClerkUser } from "@clerk/nextjs/server";
import type { Id } from "@/convex/_generated/dataModel";

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

export type GlobalAnalysis = {
  _id: Id<"globalAnalyses">;
  organizationId: Id<"organizations">;
  analysisLanguage: string;
  analysisVersion: string;
  modelVersion?: string;
  createdAt: number;
  updatedAt: number;
  overallSummary: string;
  overallSentiment:
    | "very_negative"
    | "negative"
    | "neutral"
    | "positive"
    | "very_positive";
  customerSatisfactionScore?: number;
  peakHours?: Array<{ hour: number; count: number }>;
  commonTopics?: string[];
  commonIssues?: string[];
  riskScore?: number;
  churnRiskLevel?: "low" | "medium" | "high";
  agentLeaderboard?: Array<{
    agentId: string;
    score: number;
    strengthSummary: string;
    improvementSummary: string;
  }>;
  operationalInsights?: string[];
  productInsights?: string[];
  improvementActions?: Array<{
    priority: "low" | "medium" | "high";
    title: string;
    description: string;
  }>;
  aiRawOutput?: any;
  tokenInputCount?: number;
  tokenOutputCount?: number;
};
