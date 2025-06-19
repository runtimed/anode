import { makeDurableObject, makeWorker } from '@livestore/sync-cf/cf-worker'

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
      validatePayload: (payload: any) => {

        if (payload?.authToken !== env.AUTH_TOKEN) {
          throw new Error('Invalid auth token')
        }
      },
      enableCORS: true,
    })
    return worker.fetch(request, env, ctx)
  }
}
