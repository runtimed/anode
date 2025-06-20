import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import { LiveStoreProvider } from '@livestore/react'
import { FPSMeter } from '@overengineering/fps-meter'

import React, { useState, useEffect } from 'react'
import { unstable_batchedUpdates as batchUpdates } from 'react-dom'

import { NotebookViewer } from './components/notebook/NotebookViewer.js'
import { AuthGuard } from './components/auth/AuthGuard.js'
import { UserProfile } from './components/auth/UserProfile.js'
import LiveStoreWorker from './livestore.worker?worker'
import { schema, events, tables } from '../../../shared/schema.js'
import { getStoreId, getCurrentNotebookId } from './util/store-id.js'
import { useStore } from '@livestore/react'
import { queryDb } from '@livestore/livestore'
import { getCurrentAuthToken } from './auth/google-auth.js'

const NotebookApp: React.FC = () => {
  // In the simplified architecture, we always show the current notebook
  // The notebook ID comes from the URL and is the same as the store ID
  const currentNotebookId = getCurrentNotebookId()
  const { store } = useStore()
  const [isInitializing, setIsInitializing] = useState(false)

  // Check if notebook exists
  const notebooks = store.useQuery(queryDb(tables.notebook.select().limit(1))) as any[]
  const currentNotebook = notebooks[0]

  // Auto-initialize notebook if it doesn't exist
  useEffect(() => {
    if (!currentNotebook && !isInitializing) {
      setIsInitializing(true)
      const notebookId = store.storeId || `notebook-${Date.now()}`
      const title = `Notebook ${new Date().toLocaleDateString()}`

      store.commit(events.notebookInitialized({
        id: notebookId,
        title,
        ownerId: 'current-user', // TODO: get from auth context
      }))

      setIsInitializing(false)
    }
  }, [currentNotebook, isInitializing, store])



  // Show loading while initializing
  if (!currentNotebook && isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="text-lg font-semibold text-foreground mb-2">
            Initializing Notebook...
          </div>
          <div className="text-sm text-muted-foreground">
            Setting up your workspace...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with user profile */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex justify-between items-center px-4 py-2">
          <h1 className="text-lg font-semibold text-gray-900">
            Anode Collaborative Notebooks
          </h1>
          <UserProfile />
        </div>
      </div>

      {/* Main Content */}
      <NotebookViewer
        notebookId={currentNotebookId}
      />
    </div>
  )
}

const storeId = getStoreId()

// Check for reset parameter to handle schema evolution issues
const resetPersistence = new URLSearchParams(window.location.search).get('reset') !== null

// Clean up URL if reset was requested
if (resetPersistence) {
  const searchParams = new URLSearchParams(window.location.search)
  searchParams.delete('reset')
  window.history.replaceState(null, '', `${window.location.pathname}?${searchParams.toString()}`)
}

const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
  resetPersistence,
})

export const App: React.FC = () => (
  <LiveStoreProvider
    schema={schema}
    adapter={adapter}
    renderLoading={(_) => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="text-lg font-semibold text-foreground mb-2">
            Loading Anode
          </div>
          <div className="text-sm text-muted-foreground">
            Stage: {_.stage}
          </div>
        </div>
      </div>
    )}
    batchUpdates={batchUpdates}
    storeId={storeId}
    syncPayload={{ authToken: getCurrentAuthToken() }}
  >
    <div style={{ bottom: 0, right: 0, position: 'fixed', background: '#333', zIndex: 50 }}>
      <FPSMeter height={40} />
    </div>
    <AuthGuard>
      <NotebookApp />
    </AuthGuard>
  </LiveStoreProvider>
)
