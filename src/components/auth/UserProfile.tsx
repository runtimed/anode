import React, { useState } from "react";
import { useGoogleAuth } from "../../auth/useGoogleAuth.js";
import { googleAuthManager } from "../../auth/google-auth.js";

interface UserProfileProps {
  className?: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  className = "",
}) => {
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
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">
              A
            </span>
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-sm font-medium text-gray-900">
              Anonymous
            </div>
            <div className="text-xs text-gray-500">
              Local Development
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        disabled={isLoading}
      >
        {user.picture
          ? (
            <img
              src={user.picture}
              alt={user.name}
              className="w-8 h-8 rounded-full"
            />
          )
          : (
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium text-gray-900">
            {user.name}
          </div>
          <div className="text-xs text-gray-500">
            {user.email}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${
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
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1">
              <div className="block px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </div>

              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading
                  ? (
                    <span className="flex items-center">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2" />
                      Signing out...
                    </span>
                  )
                  : (
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
