import { CollaboratorContent } from "@/components/CollaboratorContent";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { UserInfo } from "@/hooks/useUserRegistry";
import { getClientColor, getClientTypeInfo } from "@/services/userTypes.js";
import React from "react";

interface PresenceBookmarksProps {
  usersOnCell: Array<{ id: string; name: string; picture?: string }>;
  getUserColor: (userId: string) => string;
  getUserInfo: (userId: string) => UserInfo;
}

const LIMIT = 5;

export const PresenceBookmarks: React.FC<PresenceBookmarksProps> = ({
  usersOnCell,
  getUserColor,
  getUserInfo,
}) => {
  if (usersOnCell.length === 0) {
    return null;
  }

  return (
    <div
      className="ml-1 flex items-center gap-1"
      role="group"
      aria-label="Users present on this cell"
    >
      {/* Primary users - compact avatars */}
      {usersOnCell.slice(0, LIMIT).map((user, index) => {
        const clientInfo = getClientTypeInfo(user.id);
        const IconComponent = clientInfo.icon;

        const backgroundColor = getClientColor(user.id, getUserColor);

        return (
          <HoverCard key={user.id}>
            <HoverCardTrigger asChild>
              <div
                key={user.id}
                className="flex h-6 w-6 cursor-default items-center justify-center rounded-full border-2 shadow-sm transition-all duration-300 sm:h-5 sm:w-5"
                style={{
                  backgroundColor,
                  borderColor: backgroundColor,
                  animationDelay: `${index * 100}ms`,
                  zIndex: 10 - index,
                }}
                role="button"
                tabIndex={0}
                aria-label={`${user.name} is present on this cell`}
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : IconComponent ? (
                  <IconComponent className="h-3 w-3 text-white" />
                ) : (
                  <span className="text-xs font-semibold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <CollaboratorContent
                userId={user.id}
                userInfo={getUserInfo(user.id)}
              />
            </HoverCardContent>
          </HoverCard>
        );
      })}

      {/* Overflow indicator for many users */}
      {usersOnCell.length > LIMIT && (
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-500 shadow-sm duration-300 sm:h-5 sm:w-5"
          style={{
            zIndex: 7,
          }}
          title={`+${usersOnCell.length - 3} more users: ${usersOnCell
            .slice(LIMIT)
            .map((u) => u.name)
            .join(", ")}`}
          role="button"
          tabIndex={0}
          aria-label={`${usersOnCell.length - 3} more users present on this cell`}
        >
          <span className="text-xs font-bold text-white">
            +{usersOnCell.length - LIMIT}
          </span>
        </div>
      )}
    </div>
  );
};
