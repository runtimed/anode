import { useAuthenticatedUser } from "@/auth/index.js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUserRegistry } from "@/hooks/useUserRegistry.js";
import { getClientColor, getClientTypeInfo } from "@/services/userTypes.js";

export function CollaboratorAvatars() {
  const userId = useAuthenticatedUser();
  const { presentUsers, getUserInfo, getUserColor } = useUserRegistry();

  const otherUsers = presentUsers.filter((user) => user.id !== userId);
  const LIMIT = 5;
  return (
    <div className="group/users flex items-center gap-2">
      <div className="flex -space-x-2 group-hover/users:space-x-1">
        {otherUsers.slice(0, LIMIT).map((user) => {
          const userInfo = getUserInfo(user.id);
          const clientInfo = getClientTypeInfo(user.id);
          const IconComponent = clientInfo.icon;

          return (
            <div
              key={user.id}
              className="shrink-0 overflow-hidden rounded-full border-2 transition-[margin]"
              style={{
                borderColor: getClientColor(user.id, getUserColor),
              }}
              title={
                clientInfo.type === "user"
                  ? (userInfo?.name ?? "Unknown User")
                  : clientInfo.name
              }
            >
              {IconComponent ? (
                <div
                  className={`flex size-8 items-center justify-center rounded-full ${clientInfo.backgroundColor}`}
                >
                  <IconComponent className={`size-4 ${clientInfo.textColor}`} />
                </div>
              ) : userInfo?.picture ? (
                <img
                  src={userInfo.picture}
                  alt={userInfo.name ?? "User"}
                  className="size-8 rounded-full bg-gray-300"
                />
              ) : (
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">
                    {userInfo?.name?.charAt(0).toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
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
