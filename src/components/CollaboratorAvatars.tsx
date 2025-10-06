import { useAuthenticatedUser } from "@/auth/index.js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { CollaboratorContent } from "@/components/CollaboratorContent.js";
import { useUserRegistry } from "@/hooks/useUserRegistry.js";
import { getClientColor, getClientTypeInfo } from "@/services/userTypes.js";

export function CollaboratorAvatars() {
  const userId = useAuthenticatedUser();
  const { presentUsers, getUserInfo, getUserColor } = useUserRegistry();

  const otherUsers = presentUsers.filter((user) => user.id !== userId);
  const isSmall = useBreakpoint("sm");
  const LIMIT = isSmall ? 3 : 5;

  return (
    <div className="group/users flex items-center gap-1 sm:gap-2">
      <div className="flex -space-x-1 group-hover/users:space-x-0.5 sm:-space-x-2 sm:group-hover/users:space-x-1">
        {otherUsers.slice(0, LIMIT).map((user, index) => {
          const userInfo = getUserInfo(user.id);
          const clientInfo = getClientTypeInfo(user.id);
          const IconComponent = clientInfo.icon;

          return (
            <HoverCard key={user.id}>
              <HoverCardTrigger asChild>
                <div
                  className={`relative shrink-0 cursor-pointer overflow-hidden rounded-full border-2 transition-[margin] ${
                    index >= 3 ? "hidden sm:block" : ""
                  }`}
                  style={{
                    borderColor: getClientColor(user.id, getUserColor),
                  }}
                >
                  {IconComponent ? (
                    <div
                      className={`flex size-6 items-center justify-center rounded-full sm:size-8 ${clientInfo.backgroundColor}`}
                    >
                      <IconComponent
                        className={`size-3 sm:size-4 ${clientInfo.textColor}`}
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
      {otherUsers.length > LIMIT && (
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground text-xs">
            +{otherUsers.length - LIMIT}
          </span>
        </div>
      )}
    </div>
  );
}
