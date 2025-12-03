"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import { useAuth, useOrganization, useOrganizationList } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  Users,
  UserPlus,
  Search,
  Calendar,
  Shield,
  User as UserIcon,
  Crown,
  MoreVertical,
  Loader2,
  LogOut,
} from "lucide-react";

import InviteEmployeeDialog from "../components/InviteEmployeeDialog";
import { leaveOrganizationAction } from "./[memberConvexId]/actions";

export default function EmployeesClient() {
  const t = useTranslations("team");
  const locale = useLocale();
  const router = useRouter();
  const { userId } = useAuth();

  // ----------- HOOKS ALWAYS ON TOP ----------- //
  const { organization, isLoaded, membership } = useOrganization();
  const { userMemberships, setActive, createOrganization } =
    useOrganizationList();

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showInvite, setShowInvite] = useState(false);

  const myRole = useMemo<"admin" | "member" | undefined>(
    () =>
      membership?.role
        ? (membership?.role.replace("org:", "") as "admin" | "member")
        : undefined,
    [membership?.role]
  );

  // ----------- AUTO ACTIVATE ----------- //
  useEffect(() => {
    if (
      isLoaded &&
      !organization &&
      userMemberships.data?.length &&
      userMemberships.data.length === 1 &&
      setActive
    ) {
      if (!userMemberships.data?.[0]?.organization) return;
      setActive({ organization: userMemberships.data?.[0]?.organization?.id });
    }
  }, [isLoaded, organization, userMemberships, setActive]);

  console.log(userMemberships);
  // ----------- LOAD MEMBERS ----------- //
  const members = useQuery(
    api.orgs.getOrganizationMembers,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    return members
      .filter((m: any) => {
        const matchSearch =
          !search || m.name?.toLowerCase().includes(search.toLowerCase());
        const matchRole = filterRole === "all" || m.role === filterRole;
        return matchSearch && matchRole;
      })
      .sort((a: any, b: any) => b._creationTime - a._creationTime);
  }, [members, search, filterRole]);

  // ----------- LEAVE ORG ----------- //
  async function handleLeaveOrganization() {
    try {
      if (!organization) return;
      await leaveOrganizationAction(organization.id);
      toast.success("You have left the organization.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // ----------- UI STATE RENDERING ----------- //
  const ui = (() => {
    // 1) Clerk not loaded
    if (!isLoaded) {
      return (
        <div className="flex justify-center items-center min-h-[calc(100vh-120px)]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      );
    }

    // 2) block multi-org
    if (userMemberships.data?.length && userMemberships.data.length > 1) {
      return (
        <div className="p-8 text-center min-h-[calc(100vh-120px)]">
          <h2 className="text-xl font-bold text-red-500 mb-2">
            Multiple Organizations Detected
          </h2>
          <p className="text-gray-500">
            Please leave all other organizations first.
          </p>
        </div>
      );
    }

    // 3) user has no orgs → create org UI
    if (userMemberships.data?.length && userMemberships.data.length === 0) {
      return (
        <CreateOrganizationUI
          createOrganization={createOrganization}
          t={t}
          router={router}
        />
      );
    }

    // 4) Clerk switching → organization null temporarily
    if (!organization) {
      return (
        <div className="flex justify-center items-center min-h-[calc(100vh-120px)]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      );
    }
    console.log("userMemberships", userMemberships);
    // 4) normal dashboard
    return (
      <div className="space-y-6 min-h-[calc(100vh-120px)]">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{organization.name}</h1>
            <p className="text-gray-500">{t("subtitle")}</p>
          </div>

          <div className="flex gap-2">
            {myRole === "member" && (
              <Button variant="destructive" onClick={handleLeaveOrganization}>
                <LogOut className="w-4 h-4 mr-2" />
                {t("leaveOrganization")}
              </Button>
            )}
            {myRole === "admin" && (
              <Button
                className="bg-blue-600 text-white"
                onClick={() => setShowInvite(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {t("inviteMember")}
              </Button>
            )}
          </div>
        </div>

        {/* FILTER BAR */}
        <Card className="p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={t("searchPlaceholder")}
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue
                placeholder={t("filterByRole") || "Filter by role"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{t("allRoles")}</span>
                </div>
              </SelectItem>
              <SelectItem value="admin">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span>{t("roles.admin")}</span>
                </div>
              </SelectItem>
              <SelectItem value="member">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-blue-600" />
                  <span>{t("roles.member")}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </Card>

        {/* MEMBERS GRID */}
        <MembersGrid
          members={filteredMembers}
          t={t}
          locale={locale}
          myRole={myRole}
          currentUserId={userId}
        />

        {/* INVITE DIALOG */}
        {myRole === "admin" && (
          <InviteEmployeeDialog
            isOpen={showInvite}
            onClose={() => setShowInvite(false)}
            onSubmit={async (email: string, role: string) => {
              const clerkRole = role === "  admin" ? "org:admin" : "org:member";

              await organization.inviteMember({
                emailAddress: email,
                role: clerkRole,
              });

              toast.success(t("invitationSent"));
              router.refresh();
            }}
          />
        )}
      </div>
    );
  })();

  return <div className="space-y-6">{ui}</div>;
}

/* ------------------------------------------------------------------------- */
/* MEMBERS GRID */
/* ------------------------------------------------------------------------- */
function MembersGrid({ members, t, locale, myRole, currentUserId }: any) {
  const router = useRouter();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400";
      case "member":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  // Always use English locale for dates to avoid hydration mismatch
  const formatDate = (timestamp: number) => {
    if (!timestamp) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      numberingSystem: "latn", // Force Latin numerals (0-9) instead of Arabic-Indic
    }).format(new Date(timestamp));
  };

  if (!members || members.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {t("noTeamMembersYet")}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t("startBuildingTeam")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {members.map((member: any) => {
        const canClick =
          myRole === "admin" ||
          (currentUserId && member.clerkUserId === currentUserId);

        return (
          <Card
            key={member._id}
            className={`p-6 hover:shadow-lg transition-shadow ${
              canClick ? "cursor-pointer" : "cursor-not-allowed opacity-50"
            }`}
            onClick={() => {
              if (!canClick) return;
              router.push(`/${locale}/dashboard/my-team/${member._id}`);
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage
                    src={member.imageUrl || undefined}
                    alt={member.name || "Member"}
                  />
                  <AvatarFallback>
                    {member.name?.charAt(0).toUpperCase() || "M"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {member.name || "Member"}
                  </h3>
                </div>
              </div>

              {canClick && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(
                          `/${locale}/dashboard/my-team/${member._id}`
                        );
                      }}
                    >
                      <UserIcon className="w-4 h-4 mr-2" />
                      {t("viewDetails")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge
                  className={`${getRoleColor(
                    member.role
                  )} flex items-center gap-1`}
                >
                  {getRoleIcon(member.role)}
                  {t(`roles.${member.role}`)}
                </Badge>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t("joined")} {formatDate(member.joinedAt)}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* CREATE ORG UI */
/* ------------------------------------------------------------------------- */
function CreateOrganizationUI({ createOrganization, t, router }: any) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    try {
      setLoading(true);

      await createOrganization({ name });
      toast.success(t("organizationCreated"));
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex justify-center items-center h-[60vh]">
      <Card className="p-6 max-w-md w-full space-y-4">
        <h2 className="text-xl font-bold">{t("createYourOrganization")}</h2>
        <Input
          placeholder={t("companyName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Button
          className="w-full bg-blue-600 text-white"
          disabled={loading || !name.trim()}
          onClick={handleCreate}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t("createOrganization")
          )}
        </Button>
      </Card>
    </div>
  );
}
