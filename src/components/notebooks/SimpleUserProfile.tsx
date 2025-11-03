import { Key, LogOut } from "lucide-react";
import React, { useState } from "react";
import { useAuth, type AuthUser } from "../../auth/index.js";
import { ApiKeysDialog } from "../auth/ApiKeysDialog.js";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { SimpleTooltip } from "../ui/tooltip.js";

interface SimpleUserProfileProps {
  className?: string;
}

export const SimpleUserProfile: React.FC<SimpleUserProfileProps> = ({
  className = "",
}) => {
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

  // user.picture = "https://picsum.photos/200/200";

  return (
    <div className={className}>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Avatar asChild>
            <button>
              <AvatarImage src={user.picture} />
              <AvatarFallback>{initials}</AvatarFallback>
            </button>
          </Avatar>
        </DropdownMenuTrigger>

        {/* <DropdownMenuContent align="end" className="min-w-56 max-w-96"> */}
        <DropdownMenuContent align="end" className="w-56">
          {/* User Info */}
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col space-y-1">
                <p className="text-sm leading-none font-medium">
                  {displayName}
                </p>
                {user?.email && (
                  <SimpleTooltip content={user.email}>
                    <p className="text-muted-foreground truncate text-xs leading-none">
                      {user.email}
                    </p>
                  </SimpleTooltip>
                )}
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Actions */}
          <DropdownMenuItem onClick={() => setIsApiKeysDialogOpen(true)}>
            <Key className="h-4 w-4" />
            API Keys
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleSignOut} variant="destructive">
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ApiKeysDialog
        open={isApiKeysDialogOpen}
        onOpenChange={setIsApiKeysDialogOpen}
      />
    </div>
  );
};
