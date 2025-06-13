import React, { useCallback } from 'react'
import { useStore } from '@livestore/react'
import { queryDb } from '@livestore/livestore'
import { tables, events } from '@anode/schema'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const currentNotebookQuery = queryDb(
  tables.notebook.select().limit(1)
)

interface NotebookListProps {
  onSelectNotebook: (notebookId: string) => void
}

export const NotebookList: React.FC<NotebookListProps> = ({ onSelectNotebook }) => {
  const { store } = useStore()
  const notebooks = store.useQuery(currentNotebookQuery) as any[]
  const currentNotebook = notebooks[0]

  const createNewNotebook = useCallback(() => {
    // Generate a unique notebook ID that will also be the store ID
    const notebookId = `notebook-${Date.now()}-${Math.random().toString(36).slice(2)}`

    // In the new architecture, we need to navigate to a new store
    // For now, we'll just show a message about how to create notebooks
    alert(`To create a new notebook, open a new browser tab/window and navigate to:

${window.location.origin}?notebook=${notebookId}

This will create a new notebook with ID: ${notebookId}

Note: In the simplified architecture, each notebook gets its own store/database.`)
  }, [])

  const initializeCurrentNotebook = useCallback(() => {
    // If we're in a store but don't have a notebook initialized, create one
    const notebookId = store.storeId || `notebook-${Date.now()}`
    const title = `Notebook ${new Date().toLocaleDateString()}`

    store.commit(events.notebookInitialized({
      id: notebookId,
      title,
      ownerId: 'current-user', // TODO: get from auth
      createdAt: new Date(),
    }))

    // Navigate to the notebook view
    onSelectNotebook(notebookId)
  }, [store, onSelectNotebook])

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Anode Notebooks</h1>
          <p className="text-muted-foreground mt-2">
            Real-time collaborative notebook system
          </p>
        </div>
        <Button onClick={createNewNotebook} size="lg">
          + New Notebook
        </Button>
      </div>

      {/* Current Notebook or Initialize */}
      {!currentNotebook ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-semibold mb-2">Initialize This Notebook</h3>
              <p className="text-muted-foreground mb-6">
                This store doesn't have a notebook yet. Initialize it to start
                creating cells and collaborating with others.
              </p>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
                <strong>Store ID:</strong> {store.storeId || 'default'}
              </div>
              <Button onClick={initializeCurrentNotebook} size="lg">
                Initialize Notebook
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onSelectNotebook(currentNotebook.id)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg line-clamp-2 leading-tight">
                {currentNotebook.title}
              </CardTitle>
              <Badge variant="secondary" className="ml-2 shrink-0">
                {currentNotebook.kernelType}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Modified</span>
                <span>{formatDate(new Date(currentNotebook.lastModified))}</span>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Created</span>
                <span>{formatDate(new Date(currentNotebook.createdAt))}</span>
              </div>

              <Separator className="my-3" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {currentNotebook.isPublic ? 'Public' : 'Private'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Store: {store.storeId}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  by {currentNotebook.ownerId}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Architecture Info */}
      <Separator className="my-8" />
      <div className="text-center text-sm text-muted-foreground space-y-2">
        <div><strong>Simplified Architecture:</strong> One notebook per store/database</div>
        <div>Store ID: {store.storeId || 'default'}</div>
        <div>To access other notebooks, use different URLs with ?notebook=&lt;notebook-id&gt;</div>
      </div>
    </div>
  )
}
