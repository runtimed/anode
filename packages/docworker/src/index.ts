import { makeDurableObject, makeWorker } from '@livestore/sync-cf/cf-worker'

interface AuthPayload {
  authToken: string
}

interface GoogleJWTPayload {
  iss: string
  aud: string
  sub: string
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
  exp: number
  iat: number
}

// Validate Google ID token using Google's tokeninfo endpoint
async function validateGoogleToken(token: string, clientId: string): Promise<GoogleJWTPayload | null> {
  try {
    // Use Google's tokeninfo endpoint to validate the token
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`)

    if (!response.ok) {
      console.error('Token validation failed:', response.status, response.statusText)
      return null
    }

    const tokenInfo = await response.json() as GoogleJWTPayload

    // Validate the audience (client ID)
    if (tokenInfo.aud !== clientId) {
      console.error('Invalid audience:', tokenInfo.aud, 'expected:', clientId)
      return null
    }

    // Validate the issuer
    if (tokenInfo.iss !== 'https://accounts.google.com' && tokenInfo.iss !== 'accounts.google.com') {
      console.error('Invalid issuer:', tokenInfo.iss)
      return null
    }

    // Check expiration (Google's endpoint already validates this, but double-check)
    const now = Math.floor(Date.now() / 1000)
    if (tokenInfo.exp < now) {
      console.error('Token expired')
      return null
    }

    return tokenInfo
  } catch (error) {
    console.error('Google token validation failed:', error)
    return null
  }
}

async function validateAuthPayload(payload: AuthPayload & { kernel?: boolean }, env: any): Promise<void> {
  console.log('🔐 Starting auth validation:', {
    hasPayload: !!payload,
    hasAuthToken: !!payload?.authToken,
    isKernel: payload?.kernel === true,
    hasGoogleClientId: !!env.GOOGLE_CLIENT_ID,
    hasEnvAuthToken: !!env.AUTH_TOKEN
  })

  if (!payload?.authToken) {
    console.error('❌ Missing auth token in payload')
    throw new Error('Missing auth token')
  }

  const token = payload.authToken
  console.log('🎫 Token info:', {
    tokenLength: token.length,
    tokenStart: token.substring(0, 10) + '...',
    isJWT: token.startsWith('eyJ')
  })

  // For runtime agents, always allow service token authentication
  if (payload.kernel === true) {
    console.log('🤖 Validating runtime agent token')
    if (env.AUTH_TOKEN && token === env.AUTH_TOKEN) {
      console.log('✅ Authenticated runtime agent with service token')
      return
    }
    console.error('❌ Invalid service token for runtime agent')
    throw new Error('Invalid service token for runtime agent')
  }

  // For regular users, try Google OAuth first if enabled
  if (env.GOOGLE_CLIENT_ID) {
    console.log('🔍 Attempting Google OAuth validation')
    const googlePayload = await validateGoogleToken(token, env.GOOGLE_CLIENT_ID)
    if (googlePayload) {
      // Google token is valid
      console.log('✅ Authenticated user via Google OAuth:', googlePayload.email)
      return
    }
    console.log('⚠️ Google OAuth validation failed, trying fallback')
  }

  // Fallback to simple token validation (for local development)
  if (env.AUTH_TOKEN && token === env.AUTH_TOKEN) {
    console.log('✅ Authenticated with fallback token')
    return
  }

  console.error('❌ All authentication methods failed')
  throw new Error('Invalid auth token')
}

export class WebSocketServer extends makeDurableObject({
  onPush: async (message) => {
    console.log('onPush', message.batch)
  },
  onPull: async (message) => {
    console.log('onPull', message)
  },
}) {}

export default {
  fetch: async (request: Request, env: any, ctx: ExecutionContext) => {
    const url = new URL(request.url)

    console.log('🔍 Worker request received:', {
      method: request.method,
      url: request.url,
      pathname: url.pathname,
      origin: request.headers.get('origin'),
      upgrade: request.headers.get('upgrade'),
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    })

    // Handle CORS preflight for all requests
    if (request.method === 'OPTIONS') {
      console.log('✅ Handling CORS preflight request')
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    // Handle API routes (WebSocket and LiveStore sync)
    if (url.pathname.startsWith('/api/') ||
        request.headers.get('upgrade') === 'websocket') {
      console.log('🚀 Routing to LiveStore worker:', {
        isWebSocket: request.headers.get('upgrade') === 'websocket',
        pathname: url.pathname,
        searchParams: url.searchParams.toString()
      })

      const worker = makeWorker({
        validatePayload: async (payload: any) => {
          console.log('🔐 Validating payload:', {
            hasAuthToken: !!payload?.authToken,
            authTokenLength: payload?.authToken?.length || 0,
            isKernel: payload?.kernel === true
          })
          await validateAuthPayload(payload, env)
          console.log('✅ Payload validation successful')
        },
        enableCORS: true,
      })

      try {
        const response = await worker.fetch(request, env, ctx)
        console.log('📤 LiveStore worker response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        })

        // Add CORS headers to all responses
        response.headers.set('Access-Control-Allow-Origin', '*')
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers', '*')

        return response
      } catch (error) {
        console.error('❌ Error in LiveStore worker:', error)
        throw error
      }
    }

    console.log('❌ Request not handled, returning 404:', url.pathname)
    // Return 404 for non-API routes (web client now served by Pages)
    return new Response('Not Found', {
      status: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      }
    })
  }
}
