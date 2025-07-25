import React, { useEffect, useState } from "react";
import { useAuth, UserInfo } from "./AuthProvider.js";
import { useUserRegistry } from "../../hooks/useUserRegistry.js";
import { AvatarWithDetails } from "../ui/AvatarWithDetails.js";
import { useStore, useQuery } from "@livestore/react";
import { events, tables } from "@runt/schema";
import { queryDb } from "@livestore/livestore";

interface UserProfileProps {
  className?: string;
}

const getDisplayName = (user: UserInfo): string => {
  let name = user.name;
  if (!name) {
    if (user.given_name) {
      name = user.given_name;
    }

    // This will be the wrong ordering for certain locales
    // Find a better way to do this in the future
    if (user.family_name) {
      if (name) {
        name += " ";
      }
      name += user.family_name;
    }
  }
  if (!name) {
    name = user.email;
  }
  return name;
};

const useSyncUserToLiveStore = () => {
  const { store } = useStore();
  const { isLocalMode, user } = useAuth();
  const { picture, sub } = user;
  const userId = isLocalMode ? "never-match" : sub;
  const displayName = getDisplayName(user);
  const existingActor = useQuery(
    queryDb(tables.actors.select().where({ id: userId }))
  );

  const needsInsertion = !isLocalMode && existingActor.length === 0;

  useEffect(() => {
    if (needsInsertion) {
      store.commit(
        events.actorProfileSet({
          id: userId,
          type: "human",
          displayName: displayName,
          avatar: picture,
        })
      );
    }
  }, [displayName, needsInsertion, picture, store, userId]);
};

export const UserProfile: React.FC<UserProfileProps> = ({ className = "" }) => {
  const { signOut, user } = useAuth();
  useSyncUserToLiveStore();
  const { getUserInitials } = useUserRegistry();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const displayName = getDisplayName(user);

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsDropdownOpen(false);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-2 rounded-md p-1 hover:bg-gray-100 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
        >
          <AvatarWithDetails
            initials={getUserInitials(user.sub)}
            title={displayName}
            image={user.picture}
            subtitle={user.email}
          />

          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {isDropdownOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsDropdownOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="ring-opacity-5 absolute right-0 z-20 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black">
            <div className="py-1">
              <div className="block border-b border-gray-100 px-4 py-2 text-sm text-gray-700">
                <div className="font-medium">{displayName}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </div>

              <button
                onClick={handleSignOut}
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
