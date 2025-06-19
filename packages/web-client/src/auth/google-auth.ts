import Cookies from 'js-cookie'

export interface GoogleAuthConfig {
  clientId: string
  enabled: boolean
}

export interface AuthUser {
  id: string
  email: string
  name: string
  picture?: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  error: string | null
}

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: () => void
          renderButton: (parent: HTMLElement, options: any) => void
          disableAutoSelect: () => void
        }
      }
    }
  }
}

class GoogleAuthManager {
  private config: GoogleAuthConfig
  private currentUser: AuthUser | null = null
  private currentToken: string | null = null

  constructor(config: GoogleAuthConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    return new Promise((resolve, reject) => {
      // Load Google Identity Services
      if (typeof window !== 'undefined' && !window.google) {
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.onload = () => {
          this.initGoogleIdentity().then(resolve).catch(reject)
        }
        script.onerror = reject
        document.head.appendChild(script)
      } else if (window.google) {
        this.initGoogleIdentity().then(resolve).catch(reject)
      }
    })
  }

  private async initGoogleIdentity(): Promise<void> {
    window.google.accounts.id.initialize({
      client_id: this.config.clientId,
      callback: this.handleCredentialResponse.bind(this),
      auto_select: false,
      cancel_on_tap_outside: false
    })
  }

  private handleCredentialResponse(response: any): void {
    if (response.credential) {
      // Parse JWT payload to get user info
      const payload = this.parseJWT(response.credential)
      if (payload) {
        this.currentUser = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture
        }
        this.currentToken = response.credential

        // Store the token in a secure cookie
        Cookies.set('google_auth_token', response.credential, {
          secure: location.protocol === 'https:',
          sameSite: 'strict',
          expires: 1 // 1 day
        })
      }
    }
  }

  private parseJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      }).join(''))
      return JSON.parse(jsonPayload)
    } catch (error) {
      console.error('Failed to parse JWT:', error)
      return null
    }
  }

  async signIn(): Promise<AuthUser> {
    if (!this.config.enabled) {
      throw new Error('Google Auth is not enabled')
    }

    if (!window.google) {
      await this.initialize()
    }

    return new Promise((resolve, reject) => {
      // Set up callback for this specific sign-in attempt
      const originalCallback = this.handleCredentialResponse.bind(this)

      window.google.accounts.id.initialize({
        client_id: this.config.clientId,
        callback: (response: any) => {
          originalCallback(response)
          if (this.currentUser) {
            resolve(this.currentUser)
          } else {
            reject(new Error('Sign in failed'))
          }
        },
        auto_select: false
      })

      // Trigger the sign-in flow
      window.google.accounts.id.prompt()
    })
  }

  async signOut(): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    this.currentUser = null
    this.currentToken = null
    Cookies.remove('google_auth_token')

    if (window.google) {
      window.google.accounts.id.disableAutoSelect()
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    if (!this.config.enabled) {
      return null
    }

    // Check if we have a cached user
    if (this.currentUser) {
      return this.currentUser
    }

    // Check if we have a stored token
    const token = this.getToken()
    if (token) {
      const payload = this.parseJWT(token)
      if (payload && payload.exp > Date.now() / 1000) {
        this.currentUser = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture
        }
        this.currentToken = token
        return this.currentUser
      }
    }

    return null
  }

  getToken(): string | null {
    return this.currentToken || Cookies.get('google_auth_token') || null
  }

  async refreshToken(): Promise<string | null> {
    // Google Identity Services handles token refresh automatically
    // Just return the current token
    return this.getToken()
  }

  isEnabled(): boolean {
    return this.config.enabled
  }

  renderSignInButton(element: HTMLElement): void {
    if (!this.config.enabled || !window.google) {
      return
    }

    window.google.accounts.id.renderButton(element, {
      theme: 'outline',
      size: 'large',
      type: 'standard',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left'
    })
  }
}

// Get configuration from environment variables
const getAuthConfig = (): GoogleAuthConfig => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const enabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true'

  return {
    clientId: clientId || '',
    enabled: enabled && !!clientId
  }
}

// Create singleton instance
export const googleAuthManager = new GoogleAuthManager(getAuthConfig())

// Helper function to get fallback auth token for local development
export const getFallbackAuthToken = (): string => {
  return import.meta.env.VITE_AUTH_TOKEN || 'insecure-token-change-me'
}

// Get the current auth token (Google or fallback)
export const getCurrentAuthToken = (): string => {
  const googleToken = googleAuthManager.getToken()
  if (googleToken && googleAuthManager.isEnabled()) {
    return googleToken
  }
  return getFallbackAuthToken()
}
