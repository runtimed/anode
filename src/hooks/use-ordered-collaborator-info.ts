import { ClientTypeInfo, getClientTypeInfo } from "@/services/userTypes";
import { useMemo } from "react";
import { UserInfo } from "./useUserRegistry";

type UserInfoWithClientType = UserInfo & {
  clientTypeInfo: ClientTypeInfo;
};

export const useOrderedCollaboratorInfo = (currentUsers: UserInfo[]) => {
  const orderedUsers = useMemo(() => {
    // Split users into humans and bots using getClientTypeInfo
    const { users, tuis, automations, bots } = currentUsers.reduce(
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

    // TODO: in the future, we could clean up old users from the list, so this would become less relevant
    const justOneBot = bots[0];

    const orderedUsers = [...users, ...tuis, ...automations, justOneBot];

    return orderedUsers;
  }, [currentUsers]);

  return orderedUsers;
};
