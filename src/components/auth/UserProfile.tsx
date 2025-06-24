import React, { useState } from "react";
import { useGoogleAuth } from "../../auth/useGoogleAuth.js";
import { googleAuthManager } from "../../auth/google-auth.js";

interface UserProfileProps {
  className?: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ className = "" }) => {
  const { user, signOut, isLoading } = useGoogleAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsDropdownOpen(false);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  // Show Anonymous if Google Auth is not enabled or no user
  if (!googleAuthManager.isEnabled() || !user) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center space-x-2 p-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
            <span className="text-sm font-medium text-gray-700">A</span>
          </div>
          <div className="hidden text-left sm:block">
            <div className="text-sm font-medium text-gray-900">Anonymous</div>
            <div className="text-xs text-gray-500">Local Development</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-2 rounded-md p-1 hover:bg-gray-100 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
        disabled={isLoading}
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
            <span className="text-sm font-medium text-gray-700">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="hidden text-left sm:block">
          <div className="text-sm font-medium text-gray-900">{user.name}</div>
          <div className="text-xs text-gray-500">{user.email}</div>
        </div>
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
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </div>

              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    Signing out...
                  </span>
                ) : (
                  "Sign out"
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
