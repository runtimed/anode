import { makeWorker } from '@livestore/adapter-web/worker'
import { makeCfSync } from '@livestore/sync-cf'

import { schema } from '@runt/schema'

makeWorker({
  schema,
  sync: {
    backend: makeCfSync({ url: import.meta.env.VITE_LIVESTORE_SYNC_URL }),
    initialSyncOptions: { _tag: 'Blocking', timeout: 5000 },
    onSyncError: 'ignore',
  },
})
