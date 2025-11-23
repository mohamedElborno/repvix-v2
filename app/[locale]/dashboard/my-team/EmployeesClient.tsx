"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganizationList, useOrganization } from "@clerk/nextjs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Mail,
  Calendar,
  Shield,
  User as UserIcon,
  Crown,
  Plus,
  Building2,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import InviteEmployeeDialog from "../components/InviteEmployeeDialog";

export default function EmployeesClient() {
  const t = useTranslations("team");
  const locale = useLocale();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const { createOrganization, setActive, isLoaded } = useOrganizationList();
  const router = useRouter();
  const { organization } = useOrganization();

  async function invite(email: string, role: string) {
    if (!organization) {
      toast.error("No organization found");
      return;
    }

    try {
      // Convert our custom roles to Clerk organization roles
      // Clerk uses "org:admin", "org:member", "org:owner"
      let clerkRole: "org:admin" | "org:member" | "org:owner";

      if (role === "admin" || role === "manager") {
        clerkRole = "org:admin";
      } else if (role === "owner") {
        clerkRole = "org:owner";
      } else {
        clerkRole = "org:member";
      }

      await organization.inviteMember({
        emailAddress: email,
        role: clerkRole,
      });

      toast.success(t("invitationSent") || "Invitation sent successfully!");

      // Refresh the page to sync new members
      router.refresh();
    } catch (error: any) {
      console.error("Error inviting member:", error);
      toast.error(
        error.message || t("invitationError") || "Failed to send invitation"
      );
    }
  }

  // Get organization members from Convex
  const orgMembers = useQuery(
    api.orgs.getOrganizationMembers,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !companyName.trim()) return;

    setIsCreatingOrg(true);
    try {
      // 1) إنشاء المنظمة في Clerk
      const org = await createOrganization({
        name: companyName.trim(),
      });

      // 2) جعل المنظمة نشطة
      await setActive({ organization: org.id });

      // 3) تحديث الصفحة (سيشغّل المزامنة في السيرفر)
      toast.success(
        t("organizationCreated") || "Organization created successfully!"
      );
      router.refresh();
    } catch (error: any) {
      console.error("Error creating organization:", error);
      toast.error(
        error.message ||
          t("errorCreatingOrganization") ||
          "Failed to create organization"
      );
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "sales":
        return <UserIcon className="w-4 h-4" />;
      case "support":
        return <Shield className="w-4 h-4" />;
      case "manager":
        return <Crown className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "sales":
        return "bg-green-100 text-green-800 border-green-200";
      case "support":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "manager":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-7.5rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {t("loading") || "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  // After loading, check if organization exists
  // If no organization exists, show creation form
  if (!organization) {
    return (
      <div className="relative min-h-[calc(100vh-7.5rem)]">
        {/* BLUR OVERLAY */}
        <div className="absolute inset-0 backdrop-blur-sm bg-black/40 z-40"></div>

        {/* MODAL CARD */}
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-8 shadow-xl border border-white/10 bg-white/10 backdrop-blur-xl">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {t("createYourOrganization") || "Create Your Organization"}
              </h2>
              <p className="text-gray-300">
                {t("createOrganizationDescription") ||
                  "Get started by creating your organization to manage your team"}
              </p>
            </div>

            <form onSubmit={handleCreateOrganization} className="space-y-4">
              <div>
                <Label
                  htmlFor="companyName"
                  className="text-sm font-medium text-gray-200"
                >
                  {t("companyName") || "Company Name"}
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={
                    t("enterCompanyName") || "Enter your company name"
                  }
                  className="mt-2 bg-white/20 border-white/30 text-white placeholder:text-gray-300"
                  required
                  disabled={isCreatingOrg}
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isCreatingOrg || !companyName.trim()}
              >
                {isCreatingOrg ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("creating") || "Creating..."}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("createOrganization") || "Create Organization"}
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-[calc(100vh-7.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {organization.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("subtitle")}
          </p>
        </div>
        <Button
          onClick={() => setIsInviteDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {t("inviteMember")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t("totalMembers")}</p>
              <p className="text-2xl font-bold">{orgMembers?.length || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t("supportAgents")}</p>
              <p className="text-2xl font-bold">
                {orgMembers?.filter((member: any) => member.role === "support")
                  .length || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UserIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t("salesReps")}</p>
              <p className="text-2xl font-bold">
                {orgMembers?.filter((member: any) => member.role === "sales")
                  .length || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Crown className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t("managers")}</p>
              <p className="text-2xl font-bold">
                {orgMembers?.filter((member: any) => member.role === "manager")
                  .length || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t("filterByRole")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allRoles")}</SelectItem>
              <SelectItem value="support">{t("support")}</SelectItem>
              <SelectItem value="sales">{t("sales")}</SelectItem>
              <SelectItem value="manager">{t("manager")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Employees List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {!orgMembers || orgMembers.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t("noTeamMembersYet")}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t("startBuildingTeam")}
            </p>
            <Button
              onClick={() => setIsInviteDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {t("inviteFirstMember")}
            </Button>
          </div>
        ) : (
          (orgMembers || [])
            .filter((employee: any) => {
              // Filter by search term (name or email)
              const employeeName = employee.name || "";
              const employeeEmail = employee.email || "";
              const matchesSearch =
                !searchTerm ||
                employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                employeeEmail.toLowerCase().includes(searchTerm.toLowerCase());

              // Filter by role
              const matchesRole =
                roleFilter === "all" || employee.role === roleFilter;

              return matchesSearch && matchesRole;
            })
            .map((employee: any) => (
              <Card
                key={employee._id}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage
                        src={employee.imageUrl || undefined}
                        alt={employee.name || employee.email || "Employee"}
                      />
                      <AvatarFallback>
                        {employee.name?.charAt(0).toUpperCase() ||
                          employee.email?.charAt(0).toUpperCase() ||
                          "E"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {employee.name || "Employee"}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {employee.email}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          (window.location.href = `/dashboard/my-team/${employee._id}`)
                        }
                      >
                        <UserIcon className="w-4 h-4 mr-2" />
                        {t("viewDetails")}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="w-4 h-4 mr-2" />
                        {t("sendMessage")}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Calendar className="w-4 h-4 mr-2" />
                        {t("viewSchedule")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      className={`${getRoleColor(employee.role)} flex items-center gap-1`}
                    >
                      {getRoleIcon(employee.role)}
                      {t(`roles.${employee.role}`)}
                    </Badge>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4" />
                      {t("joined")} {formatDate(employee.joinedAt)}
                    </div>
                  </div>
                </div>
              </Card>
            ))
        )}
      </div>

      {/* Invite Dialog */}
      <InviteEmployeeDialog
        isOpen={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
        onSubmit={invite}
      />
    </div>
  );
}
