import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import { LiveStoreProvider } from '@livestore/react'
import { FPSMeter } from '@overengineering/fps-meter'
import type React from 'react'
import { useState } from 'react'
import { unstable_batchedUpdates as batchUpdates } from 'react-dom'

import { NotebookList } from './components/notebook/NotebookList.js'
import { NotebookViewer } from './components/notebook/NotebookViewer.js'
import LiveStoreWorker from './livestore.worker?worker'
import { schema } from '@anode/schema'
import { getStoreId, getCurrentNotebookId } from './util/store-id.js'

const NotebookApp: React.FC = () => {
  // In the simplified architecture, we always show the current notebook
  // The notebook ID comes from the URL and is the same as the store ID
  const currentNotebookId = getCurrentNotebookId()
  const [viewMode, setViewMode] = useState<'list' | 'notebook'>('list')

  const handleSelectNotebook = () => {
    // Since we're in a single-notebook store, just show the notebook view
    setViewMode('notebook')
  }

  const handleBackToList = () => {
    setViewMode('list')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <nav className="border-b bg-card px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.svg"
                alt="Anode"
                className="h-8 w-auto"
              />
              <h1
                className="text-xl font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleBackToList}
              >
                Anode
              </h1>
            </div>
            {viewMode === 'notebook' && (
              <>
                <span className="text-muted-foreground">/</span>
                <button
                  onClick={handleBackToList}
                  className="text-primary hover:opacity-80 text-sm transition-opacity"
                >
                  ← Back to Overview
                </button>
              </>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            {currentNotebookId}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      {viewMode === 'notebook' ? (
        <NotebookViewer
          notebookId={currentNotebookId}
          onBack={handleBackToList}
        />
      ) : (
        <NotebookList onSelectNotebook={handleSelectNotebook} />
      )}
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
            Loading LiveStore Notebooks
          </div>
          <div className="text-sm text-muted-foreground">
            Stage: {_.stage}
          </div>
        </div>
      </div>
    )}
    batchUpdates={batchUpdates}
    storeId={storeId}
    syncPayload={{ authToken: 'insecure-token-change-me' }}
  >
    <div style={{ top: 0, right: 0, position: 'absolute', background: '#333', zIndex: 50 }}>
      <FPSMeter height={40} />
    </div>
    <NotebookApp />
  </LiveStoreProvider>
)
