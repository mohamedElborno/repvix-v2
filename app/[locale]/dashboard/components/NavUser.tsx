"use client";

import {
  IconDotsVertical,
  IconLogout,
  IconUserCircle,
} from "@tabler/icons-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

export function NavUser() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  const locale = useLocale();
  const t = useTranslations("profile");
  const logoutUser = async () => {
    await signOut({ redirectUrl: `/${locale}/sign-in` });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage
                  src={user?.imageUrl}
                  alt={user?.emailAddresses[0]?.emailAddress || "User"}
                />
                <AvatarFallback className="rounded-lg">
                  {user?.fullName?.charAt(0) ||
                    user?.emailAddresses[0].emailAddress?.charAt(0) ||
                    "U"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {user?.fullName || user?.emailAddresses[0].emailAddress}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {user?.emailAddresses[0]?.emailAddress}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={user?.imageUrl}
                    alt={user?.emailAddresses[0]?.emailAddress}
                  />
                  <AvatarFallback className="rounded-lg">
                    {user?.fullName?.charAt(0) ||
                      user?.emailAddresses[0]?.emailAddress?.charAt(0) ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user?.fullName || user?.emailAddresses[0]?.emailAddress}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user?.emailAddresses[0]?.emailAddress || "No email"}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => router.push(`/${locale}/dashboard/profile`)}
              >
                <IconUserCircle />
                {t("account")}
              </DropdownMenuItem>
              {/*               <DropdownMenuItem>
                <IconCreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconNotification />
                Notifications
              </DropdownMenuItem> */}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logoutUser}>
              <IconLogout />
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
