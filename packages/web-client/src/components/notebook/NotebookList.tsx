import React, { useCallback } from 'react'
import { useStore } from '@livestore/react'
import { queryDb } from '@livestore/livestore'
import { tables, events } from '@anode/schema'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const notebooksQuery = queryDb(
  tables.notebooks
)

interface NotebookListProps {
  onSelectNotebook: (notebookId: string) => void
}

export const NotebookList: React.FC<NotebookListProps> = ({ onSelectNotebook }) => {
  const { store } = useStore()
  const notebooks = store.useQuery(notebooksQuery) as any[]

  const createNotebook = useCallback(() => {
    const notebookId = `notebook-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const title = `Notebook ${new Date().toLocaleDateString()}`
    const now = new Date()

    store.commit(events.notebookCreated({
      id: notebookId,
      title,
      ownerId: 'current-user', // TODO: get from auth
      createdAt: now,
    }))

    // Auto-select the new notebook
    onSelectNotebook(notebookId)
  }, [onSelectNotebook, store])

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

  const sortedNotebooks = notebooks.sort((a: any, b: any) =>
    new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  )

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Notebooks</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your collaborative notebooks
          </p>
        </div>
        <Button onClick={createNotebook} size="lg">
          + New Notebook
        </Button>
      </div>

      {/* Notebooks Grid */}
      {sortedNotebooks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-semibold mb-2">No notebooks yet</h3>
              <p className="text-muted-foreground mb-6">
                Get started by creating your first collaborative notebook.
                You can write code, add markdown documentation, and share with others.
              </p>
              <Button onClick={createNotebook} size="lg">
                Create Your First Notebook
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedNotebooks.map((notebook: any) => (
            <Card
              key={notebook.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSelectNotebook(notebook.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2 leading-tight">
                    {notebook.title}
                  </CardTitle>
                  <Badge variant="secondary" className="ml-2 shrink-0">
                    {notebook.kernelType}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Modified</span>
                    <span>{formatDate(new Date(notebook.lastModified))}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Created</span>
                    <span>{formatDate(new Date(notebook.createdAt))}</span>
                  </div>

                  <Separator className="my-3" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {notebook.isPublic ? 'Public' : 'Private'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      by {notebook.ownerId}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer Stats */}
      {sortedNotebooks.length > 0 && (
        <>
          <Separator className="my-8" />
          <div className="text-center text-sm text-muted-foreground">
            {sortedNotebooks.length} notebook{sortedNotebooks.length !== 1 ? 's' : ''} total
          </div>
        </>
      )}
    </div>
  )
}
