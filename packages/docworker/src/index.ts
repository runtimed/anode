import { makeDurableObject, makeWorker } from '@livestore/sync-cf/cf-worker'
import { OAuth2Client } from 'google-auth-library'

interface AuthPayload {
  authToken: string
}

interface GoogleTokenPayload {
  iss: string
  aud: string
  sub: string
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
}

async function validateGoogleToken(token: string, clientId?: string): Promise<GoogleTokenPayload | null> {
  if (!clientId) {
    return null
  }

  try {
    const client = new OAuth2Client(clientId)
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: clientId,
    })

    const payload = ticket.getPayload()
    if (!payload) {
      return null
    }

    return payload as GoogleTokenPayload
  } catch (error) {
    console.error('Google token validation failed:', error)
    return null
  }
}

async function validateAuthPayload(payload: AuthPayload, env: any): Promise<void> {
  if (!payload?.authToken) {
    throw new Error('Missing auth token')
  }

  const token = payload.authToken

  // First try Google OAuth validation if enabled
  if (env.GOOGLE_CLIENT_ID) {
    const googlePayload = await validateGoogleToken(token, env.GOOGLE_CLIENT_ID)
    if (googlePayload) {
      // Google token is valid
      console.log('Authenticated user:', googlePayload.email)
      return
    }
  }

  // Fallback to simple token validation (for local development)
  if (env.AUTH_TOKEN && token === env.AUTH_TOKEN) {
    console.log('Authenticated with fallback token')
    return
  }

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
    const worker = makeWorker({
      validatePayload: async (payload: any) => {
        await validateAuthPayload(payload, env)
      },
      enableCORS: true,
    })
    return worker.fetch(request, env, ctx)
  }
}
