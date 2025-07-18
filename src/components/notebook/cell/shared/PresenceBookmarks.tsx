import React from "react";
import "./PresenceIndicators.css";

interface PresenceBookmarksProps {
  usersOnCell: Array<{ id: string; name: string; picture?: string }>;
  getUserColor: (userId: string) => string;
}

export const PresenceBookmarks: React.FC<PresenceBookmarksProps> = ({
  usersOnCell,
  getUserColor,
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
      {usersOnCell.slice(0, 3).map((user, index) => (
        <div
          key={user.id}
          className="presence-avatar-compact flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-sm transition-all duration-300 hover:scale-110 hover:shadow-md sm:h-5 sm:w-5"
          style={{
            backgroundColor: getUserColor(user.id),
            animationDelay: `${index * 100}ms`,
            zIndex: 10 - index,
          }}
          title={user.name}
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
          ) : (
            <span className="text-xs font-semibold text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      ))}

      {/* Overflow indicator for many users */}
      {usersOnCell.length > 3 && (
        <div
          className="presence-avatar-compact-overflow flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-500 shadow-sm transition-all duration-300 hover:scale-110 hover:shadow-md sm:h-5 sm:w-5"
          style={{
            animationDelay: `${3 * 100}ms`,
            zIndex: 7,
          }}
          title={`+${usersOnCell.length - 3} more users: ${usersOnCell
            .slice(3)
            .map((u) => u.name)
            .join(", ")}`}
          role="button"
          tabIndex={0}
          aria-label={`${usersOnCell.length - 3} more users present on this cell`}
        >
          <span className="text-xs font-bold text-white">
            +{usersOnCell.length - 3}
          </span>
        </div>
      )}
    </div>
  );
};
