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
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function MobileNavUser() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  const locale = useLocale();
  const t = useTranslations("profile");

  const logoutUser = async () => {
    await signOut({ redirectUrl: `/${locale}/sign-in` });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full p-0"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user?.imageUrl}
              alt={user?.emailAddresses[0]?.emailAddress || "User"}
            />
            <AvatarFallback className="bg-purple-500/10 text-purple-600 dark:text-purple-400">
              {user?.fullName?.charAt(0) ||
                user?.emailAddresses[0].emailAddress?.charAt(0) ||
                "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 rounded-xl"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-3 px-2 py-2 text-left">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={user?.imageUrl}
                alt={user?.emailAddresses[0]?.emailAddress}
              />
              <AvatarFallback className="bg-purple-500/10 text-purple-600 dark:text-purple-400">
                {user?.fullName?.charAt(0) ||
                  user?.emailAddresses[0]?.emailAddress?.charAt(0) ||
                  "U"}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
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
            className="cursor-pointer"
          >
            <IconUserCircle className="mr-2 h-4 w-4" />
            {t("account")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logoutUser} className="cursor-pointer">
          <IconLogout className="mr-2 h-4 w-4" />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
