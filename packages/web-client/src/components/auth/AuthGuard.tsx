import React from 'react'
import { useGoogleAuth } from '../../auth/useGoogleAuth.js'
import { GoogleSignIn } from './GoogleSignIn.js'
import { googleAuthManager } from '../../auth/google-auth.js'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback
}) => {
  const { isAuthenticated, isLoading, error } = useGoogleAuth()

  // If Google Auth is not enabled, always allow access (local dev mode)
  if (!googleAuthManager.isEnabled()) {
    return <>{children}</>
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
          <div className="text-lg font-semibold text-foreground mb-2">
            Checking Authentication
          </div>
          <div className="text-sm text-muted-foreground">
            Please wait...
          </div>
        </div>
      </div>
    )
  }

  // Show error state if authentication failed
  if (error && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md">
          <div className="text-lg font-semibold text-foreground mb-2">
            Authentication Error
          </div>
          <div className="text-sm text-red-600 mb-4">
            {error}
          </div>
          <GoogleSignIn className="mt-4" />
        </div>
      </div>
    )
  }

  // Show sign-in form if not authenticated
  if (!isAuthenticated) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center max-w-md">
            <div className="text-2xl font-bold text-foreground mb-2">
              Anode Notebooks
            </div>
            <div className="text-sm text-muted-foreground mb-8">
              Sign in to access your collaborative notebooks
            </div>
            <GoogleSignIn />
            <div className="mt-8 text-xs text-muted-foreground">
              <p>
                Anode is a real-time collaborative notebook system.
                <br />
                Sign in with Google to sync your work across devices.
              </p>
            </div>
          </div>
        </div>
      )
    )
  }

  // Show authenticated content
  return <>{children}</>
}
