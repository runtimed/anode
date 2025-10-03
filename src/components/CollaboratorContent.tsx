import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getClientTypeInfo } from "@/services/userTypes.js";

interface CollaboratorContentProps {
  userId: string;
  userInfo?: {
    name?: string;
    email?: string;
    picture?: string;
  } | null;
}

export function CollaboratorContent({
  userId,
  userInfo,
}: CollaboratorContentProps) {
  const clientInfo = getClientTypeInfo(userId);
  const IconComponent = clientInfo.icon;

  return (
    <div className="flex items-center gap-3">
      {IconComponent ? (
        <div
          className={`flex size-10 items-center justify-center rounded-full ${clientInfo.backgroundColor}`}
        >
          <IconComponent className={`size-5 ${clientInfo.textColor}`} />
        </div>
      ) : userInfo?.picture ? (
        <img
          src={userInfo.picture}
          alt={userInfo.name ?? "User"}
          className="size-10 rounded-full bg-gray-300"
        />
      ) : (
        <Avatar className="size-10">
          <AvatarFallback>
            {userInfo?.name?.charAt(0).toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex flex-col">
        <h4 className="text-sm font-semibold">
          {clientInfo.type === "user"
            ? (userInfo?.name ?? "Unknown User")
            : clientInfo.name}
        </h4>
        <p className="text-muted-foreground text-xs">
          {clientInfo.type === "user" ? "User" : clientInfo.name}
        </p>
        {userInfo?.email && (
          <p className="text-muted-foreground text-xs">{userInfo.email}</p>
        )}
      </div>
    </div>
  );
}
