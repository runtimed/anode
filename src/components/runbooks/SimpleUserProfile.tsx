import React, { useState } from "react";
import { LogOut, Settings } from "lucide-react";
import { useAuth } from "../auth/AuthProvider.js";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar } from "../ui/Avatar.js";

interface SimpleUserProfileProps {
  className?: string;
}

export const SimpleUserProfile: React.FC<SimpleUserProfileProps> = ({
  className = "",
}) => {
  const { signOut, user } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const getDisplayName = (user: any) => {
    if (!user) return "Unknown User";

    const { givenName, familyName, email } = user;

    if (givenName && familyName) {
      return `${givenName} ${familyName}`;
    }

    if (givenName) return givenName;
    if (familyName) return familyName;

    // Fall back to email if no name parts
    if (email) {
      const localPart = email.split("@")[0];
      return localPart;
    }

    return "Unknown User";
  };

  const getUserInitials = (user: any) => {
    if (!user) return "?";

    const { givenName, familyName, email } = user;

    if (givenName && familyName) {
      return `${givenName[0]}${familyName[0]}`.toUpperCase();
    }

    if (givenName) return givenName[0].toUpperCase();
    if (familyName) return familyName[0].toUpperCase();

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

  const displayName = getDisplayName(user);
  const initials = getUserInitials(user);

  return (
    <div className={className}>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
            <Avatar initials={initials} size="md" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {/* User Info */}
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-2">
              <Avatar initials={initials} size="md" />
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
            <span className="text-muted-foreground ml-auto text-xs">Soon</span>
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
    </div>
  );
};
