import { useAuthenticatedUser } from "@/auth/index.js";
import { CollaboratorContent } from "@/components/CollaboratorContent.js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useOrderedCollaboratorInfo } from "@/hooks/use-ordered-collaborator-info";
import { useUserRegistry } from "@/hooks/useUserRegistry.js";
import { cn } from "@/lib/utils";
import { getClientColor } from "@/services/userTypes.js";

export function CollaboratorAvatars() {
  const userId = useAuthenticatedUser();
  const { presentUsers, getUserInfo, getUserColor } = useUserRegistry();

  const otherUsers = presentUsers.filter((user) => user.id !== userId);
  const otherUsersOrdered = useOrderedCollaboratorInfo(otherUsers);

  const LIMIT = 3;

  return (
    <div className="relative flex items-center">
      {otherUsersOrdered.slice(0, LIMIT).map((user, index) => {
        const userInfo = getUserInfo(user.id);
        const IconComponent = user.clientTypeInfo.icon;

        // userInfo.picture = "https://picsum.photos/200/200";

        return (
          <HoverCard key={user.id}>
            <HoverCardTrigger asChild>
              <div
                className={cn(
                  "relative shrink-0 cursor-default overflow-hidden rounded-full border-2",
                  index > 0 ? "-ml-2" : ""
                )}
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
                ) : (
                  <Avatar className="size-6 sm:size-8">
                    <AvatarImage src={userInfo.picture} />
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
      {otherUsersOrdered.length > LIMIT && (
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="-ml-2 rounded-full border border-2">
              <Avatar className="size-6 cursor-default sm:size-8">
                <AvatarFallback className="bg-white text-xs text-black/60">
                  +{otherUsersOrdered.length - LIMIT}
                </AvatarFallback>
              </Avatar>
            </div>
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
