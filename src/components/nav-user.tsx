import { ChevronsUpDown, LogOut } from "lucide-react";

import { useAuth, type AuthUser } from "@/auth/index.js";
import { ApiKeysDialog } from "@/components/auth/ApiKeysDialog.js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Key, Settings } from "lucide-react";
import { useState } from "react";

export function NavUser() {
  const { isMobile } = useSidebar();

  const { signOut, user } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isApiKeysDialogOpen, setIsApiKeysDialogOpen] = useState(false);

  const getDisplayName = (user: AuthUser): string => {
    if (!user) return "Unknown User";

    const { given_name, family_name, email } = user;

    if (given_name && family_name) {
      return `${given_name} ${family_name}`;
    }

    if (given_name) return given_name;
    if (family_name) return family_name;

    // Fall back to email if no name parts
    if (email) {
      const localPart = email.split("@")[0];
      return localPart;
    }

    return "Unknown User";
  };

  const getUserInitials = (user: AuthUser) => {
    if (!user) return "?";

    const { given_name, family_name, email } = user;

    if (given_name && family_name) {
      return `${given_name[0]}${family_name[0]}`.toUpperCase();
    }

    if (given_name) return given_name[0].toUpperCase();
    if (family_name) return family_name[0].toUpperCase();

    // Fall back to email if no name parts
    if (email) {
      return email[0].toUpperCase();
    }

    return "?";
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  if (!user) {
    return null;
  }

  const displayName = getDisplayName(user);
  const initials = getUserInitials(user);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  {/* <AvatarImage src={user.avatar} alt={user.name} /> */}
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              {/* User Info */}
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm leading-none font-medium">
                      {displayName}
                    </p>
                    {user?.email && (
                      <p className="text-muted-foreground text-xs leading-none">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <DropdownMenuSeparator />

              {/* Actions */}
              <DropdownMenuItem disabled className="cursor-not-allowed">
                <Settings className="mr-2 h-4 w-4" />
                Settings
                <span className="text-muted-foreground ml-auto text-xs">
                  Soon
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsApiKeysDialogOpen(true)}>
                <Key className="h-4 w-4" />
                API Keys
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <ApiKeysDialog
        open={isApiKeysDialogOpen}
        onOpenChange={setIsApiKeysDialogOpen}
      />
    </>
  );
}
