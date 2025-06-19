import Cookies from 'js-cookie'

export interface GoogleAuthConfig {
  clientId: string
  enabled: boolean
  scopes: string[]
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

class GoogleAuthManager {
  private config: GoogleAuthConfig
  private gapi: any = null
  private auth2: any = null

  constructor(config: GoogleAuthConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    return new Promise((resolve, reject) => {
      // Load Google API
      if (typeof window !== 'undefined' && !window.gapi) {
        const script = document.createElement('script')
        script.src = 'https://apis.google.com/js/api.js'
        script.onload = () => {
          window.gapi.load('auth2', () => {
            this.initAuth2().then(resolve).catch(reject)
          })
        }
        script.onerror = reject
        document.head.appendChild(script)
      } else if (window.gapi) {
        window.gapi.load('auth2', () => {
          this.initAuth2().then(resolve).catch(reject)
        })
      }
    })
  }

  private async initAuth2(): Promise<void> {
    this.gapi = window.gapi
    this.auth2 = await this.gapi.auth2.init({
      client_id: this.config.clientId,
      scope: this.config.scopes.join(' ')
    })
  }

  async signIn(): Promise<AuthUser> {
    if (!this.config.enabled) {
      throw new Error('Google Auth is not enabled')
    }

    if (!this.auth2) {
      await this.initialize()
    }

    const authInstance = this.auth2.getAuthInstance()
    const googleUser = await authInstance.signIn()

    const profile = googleUser.getBasicProfile()
    const authResponse = googleUser.getAuthResponse()

    const user: AuthUser = {
      id: profile.getId(),
      email: profile.getEmail(),
      name: profile.getName(),
      picture: profile.getImageUrl()
    }

    // Store the token in a secure cookie
    Cookies.set('google_auth_token', authResponse.id_token, {
      secure: true,
      sameSite: 'strict',
      expires: 1 // 1 day
    })

    return user
  }

  async signOut(): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    if (this.auth2) {
      await this.auth2.getAuthInstance().signOut()
    }

    Cookies.remove('google_auth_token')
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    if (!this.config.enabled) {
      return null
    }

    if (!this.auth2) {
      await this.initialize()
    }

    const authInstance = this.auth2.getAuthInstance()
    const isSignedIn = authInstance.isSignedIn.get()

    if (isSignedIn) {
      const googleUser = authInstance.currentUser.get()
      const profile = googleUser.getBasicProfile()

      return {
        id: profile.getId(),
        email: profile.getEmail(),
        name: profile.getName(),
        picture: profile.getImageUrl()
      }
    }

    return null
  }

  getToken(): string | null {
    return Cookies.get('google_auth_token') || null
  }

  async refreshToken(): Promise<string | null> {
    if (!this.config.enabled) {
      return null
    }

    if (!this.auth2) {
      await this.initialize()
    }

    const authInstance = this.auth2.getAuthInstance()
    const googleUser = authInstance.currentUser.get()

    if (googleUser) {
      const authResponse = await googleUser.reloadAuthResponse()
      const newToken = authResponse.id_token

      Cookies.set('google_auth_token', newToken, {
        secure: true,
        sameSite: 'strict',
        expires: 1
      })

      return newToken
    }

    return null
  }

  isEnabled(): boolean {
    return this.config.enabled
  }
}

// Get configuration from environment variables
const getAuthConfig = (): GoogleAuthConfig => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const enabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true'

  return {
    clientId: clientId || '',
    enabled: enabled && !!clientId,
    scopes: ['profile', 'email']
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
