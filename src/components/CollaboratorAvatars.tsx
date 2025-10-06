import { useAuthenticatedUser } from "@/auth/index.js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { CollaboratorContent } from "@/components/CollaboratorContent.js";
import { UserInfo, useUserRegistry } from "@/hooks/useUserRegistry.js";
import {
  ClientTypeInfo,
  getClientColor,
  getClientTypeInfo,
} from "@/services/userTypes.js";
import { Button } from "./ui/button";
import { useMemo } from "react";

type UserInfoWithClientType = UserInfo & {
  clientTypeInfo: ClientTypeInfo;
};

export function CollaboratorAvatars() {
  const userId = useAuthenticatedUser();
  const { presentUsers, getUserInfo, getUserColor } = useUserRegistry();

  const allUsers = useMemo(() => {
    const otherUsers = presentUsers.filter((user) => user.id !== userId);

    // Split users into humans and bots using getClientTypeInfo
    const { users, tuis, automations, bots } = otherUsers.reduce(
      (acc, user) => {
        const clientInfo = getClientTypeInfo(user.id);
        switch (clientInfo.type) {
          case "user":
            acc.users.push({ ...user, clientTypeInfo: clientInfo });
            break;
          case "tui":
            acc.tuis.push({ ...user, clientTypeInfo: clientInfo });
            break;
          case "automation":
            acc.automations.push({ ...user, clientTypeInfo: clientInfo });
            break;
          case "runtime":
            acc.bots.push({ ...user, clientTypeInfo: clientInfo });
            break;
        }
        return acc;
      },
      {
        users: [] as UserInfoWithClientType[],
        tuis: [] as UserInfoWithClientType[],
        automations: [] as UserInfoWithClientType[],
        bots: [] as UserInfoWithClientType[],
      }
    );

    const justOneBot = bots[0];

    const allUsers = [...users, ...tuis, ...automations, justOneBot];

    return allUsers;
  }, [presentUsers, userId]);

  const isSmall = useBreakpoint("sm");
  const LIMIT = isSmall ? 3 : 5;

  return (
    <div className="flex items-center gap-1 sm:gap-1">
      <div className="flex -space-x-1 sm:-space-x-2">
        {allUsers.slice(0, LIMIT).map((user, index) => {
          const userInfo = getUserInfo(user.id);
          const IconComponent = user.clientTypeInfo.icon;

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
      {allUsers.length > LIMIT && (
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button
              size="xs"
              variant="ghost"
              className="flex items-center gap-1"
            >
              <span className="text-muted-foreground text-xs">
                +{allUsers.length - LIMIT}
              </span>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80 space-y-4">
            {allUsers.slice(LIMIT).map((user) => {
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
