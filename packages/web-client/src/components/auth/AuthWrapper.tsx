import React, { useState, useEffect } from 'react'
import { googleAuthManager, getCurrentAuthToken, isAuthStateValid } from '../../auth/google-auth.js'
import { GoogleSignIn } from './GoogleSignIn.js'

interface AuthWrapperProps {
  children: (authToken: string) => React.ReactNode
}

type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [validToken, setValidToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Validate authentication state on mount and when tokens change
  useEffect(() => {
    const validateAuth = async () => {
      try {
        // If Google Auth is not enabled, use fallback token
        if (!googleAuthManager.isEnabled()) {
          const fallbackToken = getCurrentAuthToken()
          setValidToken(fallbackToken)
          setAuthState('authenticated')
          return
        }

        // Check if we have a valid auth state
        const isValid = await isAuthStateValid()
        const currentToken = getCurrentAuthToken()

        if (isValid && currentToken) {
          setValidToken(currentToken)
          setAuthState('authenticated')
          setError(null)
        } else {
          // Clear any expired tokens
          try {
            await googleAuthManager.signOut()
          } catch (e) {
            console.warn('Error during sign out:', e)
          }
          setValidToken(null)
          setAuthState('unauthenticated')
          setError(null)
        }
      } catch (err) {
        console.error('Auth validation error:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
        setAuthState('error')
      }
    }

    validateAuth()

    // Set up token change listener
    const unsubscribe = googleAuthManager.addTokenChangeListener(() => {
      console.log('Token changed, revalidating auth state')
      validateAuth()
    })

    // Periodic validation every 2 minutes
    const interval = setInterval(validateAuth, 2 * 60 * 1000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  // Handle visibility change - revalidate when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && authState === 'authenticated') {
        console.log('Tab focused, revalidating auth state')
        const isValid = await isAuthStateValid()
        if (!isValid) {
          console.warn('Auth state invalid on tab focus, signing out')
          setAuthState('unauthenticated')
          setValidToken(null)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [authState])

  const handleSignInSuccess = async () => {
    console.log('Sign in successful, revalidating auth state')
    // Wait a moment for the token to be set
    setTimeout(async () => {
      const isValid = await isAuthStateValid()
      const currentToken = getCurrentAuthToken()

      if (isValid && currentToken) {
        setValidToken(currentToken)
        setAuthState('authenticated')
        setError(null)
      } else {
        setError('Sign in succeeded but token validation failed')
        setAuthState('error')
      }
    }, 500)
  }

  const handleSignInError = (error: string) => {
    console.error('Sign in error:', error)
    setError(error)
    setAuthState('error')
  }

  const handleRetry = () => {
    setError(null)
    setAuthState('loading')
    // Trigger revalidation
    setTimeout(async () => {
      const isValid = await isAuthStateValid()
      const currentToken = getCurrentAuthToken()

      if (isValid && currentToken) {
        setValidToken(currentToken)
        setAuthState('authenticated')
      } else {
        setAuthState('unauthenticated')
      }
    }, 100)
  }

  // Loading state
  if (authState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
          <div className="text-lg font-semibold text-foreground mb-2">
            Validating Authentication
          </div>
          <div className="text-sm text-muted-foreground">
            Please wait while we verify your credentials...
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (authState === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md">
          <div className="text-lg font-semibold text-foreground mb-2">
            Authentication Error
          </div>
          <div className="text-sm text-red-600 mb-4">
            {error}
          </div>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <div className="text-sm text-muted-foreground">
              Or try signing in again:
            </div>
            <GoogleSignIn
              onSuccess={handleSignInSuccess}
              onError={handleSignInError}
            />
          </div>
        </div>
      </div>
    )
  }

  // Unauthenticated state - show login page
  if (authState === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Anode Notebooks
            </h1>
            <p className="text-muted-foreground">
              Real-time collaborative notebooks for data science and exploration
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 border">
            <div className="text-lg font-semibold text-foreground mb-4">
              Sign in to continue
            </div>
            <div className="text-sm text-muted-foreground mb-6">
              Sign in with Google to access your collaborative notebooks and sync your work across devices.
            </div>

            <GoogleSignIn
              onSuccess={handleSignInSuccess}
              onError={handleSignInError}
            />

            <div className="mt-6 text-xs text-muted-foreground">
              <p>
                Your data is stored locally and synced securely.
                <br />
                By signing in, you agree to our terms of service.
              </p>
            </div>
          </div>

          <div className="mt-8 text-xs text-muted-foreground">
            <p>
              Anode is built on LiveStore for real-time collaboration.
              <br />
              Experience the future of collaborative data science.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Authenticated state - render children with valid token
  if (authState === 'authenticated' && validToken) {
    return <>{children(validToken)}</>
  }

  // Fallback
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="text-lg font-semibold text-foreground mb-2">
          Unexpected State
        </div>
        <div className="text-sm text-muted-foreground mb-4">
          Authentication state: {authState}
        </div>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
