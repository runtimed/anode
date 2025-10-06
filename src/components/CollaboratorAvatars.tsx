import { useAuthenticatedUser } from "@/auth/index.js";
import { CollaboratorContent } from "@/components/CollaboratorContent.js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { useOrderedCollaboratorInfo } from "@/hooks/use-ordered-collaborator-info";
import { useUserRegistry } from "@/hooks/useUserRegistry.js";
import { getClientColor } from "@/services/userTypes.js";
import { Button } from "./ui/button";

export function CollaboratorAvatars() {
  const userId = useAuthenticatedUser();
  const { presentUsers, getUserInfo, getUserColor } = useUserRegistry();

  const otherUsers = presentUsers.filter((user) => user.id !== userId);
  const otherUsersOrdered = useOrderedCollaboratorInfo(otherUsers);

  const isSmall = useBreakpoint("sm");
  const LIMIT = isSmall ? 3 : 5;

  return (
    <div className="flex items-center gap-1 sm:gap-1">
      <div className="relative flex -space-x-1 sm:-space-x-2">
        {otherUsersOrdered.slice(0, LIMIT).map((user, index) => {
          const userInfo = getUserInfo(user.id);
          const IconComponent = user.clientTypeInfo.icon;

          return (
            <HoverCard key={user.id}>
              <HoverCardTrigger asChild>
                <div
                  className={`relative shrink-0 cursor-pointer overflow-hidden rounded-full border-2 ${
                    index >= 3 ? "hidden sm:block" : ""
                  }`}
                  style={{
                    borderColor: getClientColor(user.id, getUserColor),
                    zIndex: LIMIT - index,
                  }}
                >
                  {IconComponent ? (
                    <div
                      className={`flex size-6 items-center justify-center rounded-full sm:size-8 ${user.clientTypeInfo.backgroundColor}`}
                    >
                      <IconComponent
                        className={`size-3 sm:size-4 ${user.clientTypeInfo.textColor}`}
                      />
                    </div>
                  ) : userInfo?.picture ? (
                    <img
                      src={userInfo.picture}
                      alt={userInfo.name ?? "User"}
                      className="size-6 rounded-full bg-gray-300 sm:size-8"
                    />
                  ) : (
                    <Avatar className="size-6 sm:size-8">
                      <AvatarFallback className="text-xs">
                        {userInfo?.name?.charAt(0).toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <CollaboratorContent userId={user.id} userInfo={userInfo} />
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </div>
      {otherUsersOrdered.length > LIMIT && (
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button
              size="xs"
              variant="ghost"
              className="flex items-center gap-1"
            >
              <span className="text-muted-foreground text-xs">
                +{otherUsersOrdered.length - LIMIT}
              </span>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80 space-y-4">
            {otherUsersOrdered.slice(LIMIT).map((user) => {
              const userInfo = getUserInfo(user.id);
              return (
                <CollaboratorContent
                  key={user.id}
                  userId={user.id}
                  userInfo={userInfo}
                />
              );
            })}
          </HoverCardContent>
        </HoverCard>
      )}
    </div>
  );
}
