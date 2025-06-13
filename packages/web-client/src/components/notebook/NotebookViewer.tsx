import React, { useCallback } from 'react'
import { useStore } from '@livestore/react'
import { queryDb } from '@livestore/livestore'
import { tables, events } from '@anode/schema'
import { Cell } from './Cell.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const cellsQuery = (notebookId: string) => queryDb(
  tables.cells
    .where({ notebookId, deletedAt: null })
)

const notebookQuery = (notebookId: string) => queryDb(
  tables.notebooks.where({ id: notebookId }).limit(1)
)

interface NotebookViewerProps {
  notebookId: string
  onBack: () => void
}

export const NotebookViewer: React.FC<NotebookViewerProps> = ({ notebookId, onBack }) => {
  const { store } = useStore()
  const cells = store.useQuery(cellsQuery(notebookId)) as any[]
  const notebooks = store.useQuery(notebookQuery(notebookId)) as any[]
  const notebook = notebooks[0]

  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [localTitle, setLocalTitle] = React.useState(notebook?.title || '')

  React.useEffect(() => {
    if (notebook?.title) {
      setLocalTitle(notebook.title)
    }
  }, [notebook?.title])

  const updateTitle = useCallback(() => {
    if (notebook && localTitle !== notebook.title) {
      store.commit(events.notebookTitleChanged({
        id: notebook.id,
        title: localTitle,
        lastModified: new Date(),
      }))
    }
    setIsEditingTitle(false)
  }, [notebook, localTitle, store])

  const addCell = useCallback((afterCellId?: string, cellType: 'code' | 'markdown' | 'raw' | 'sql' | 'ai' = 'code') => {
    const cellId = `cell-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const newPosition = afterCellId
      ? Math.max(...cells.map((c: any) => c.position)) + 1
      : cells.length

    store.commit(events.cellCreated({
      id: cellId,
      notebookId,
      position: newPosition,
      cellType,
      createdBy: 'current-user',
      createdAt: new Date(),
    }))
  }, [notebookId, cells, store])

  const deleteCell = useCallback((cellId: string) => {
    store.commit(events.cellDeleted({
      id: cellId,
      deletedAt: new Date(),
      deletedBy: 'current-user',
    }))
  }, [store])

  const moveCell = useCallback((cellId: string, direction: 'up' | 'down') => {
    const currentCell = cells.find((c: any) => c.id === cellId)
    if (!currentCell) return

    const sortedCells = cells.sort((a: any, b: any) => a.position - b.position)
    const currentIndex = sortedCells.findIndex(c => c.id === cellId)

    if (direction === 'up' && currentIndex > 0) {
      const targetCell = sortedCells[currentIndex - 1]
      if (targetCell) {
        // Swap positions
        store.commit(events.cellMoved({
          id: cellId,
          newPosition: targetCell.position,
        }))
        store.commit(events.cellMoved({
          id: targetCell.id,
          newPosition: currentCell.position,
        }))
      }
    } else if (direction === 'down' && currentIndex < sortedCells.length - 1) {
      const targetCell = sortedCells[currentIndex + 1]
      if (targetCell) {
        // Swap positions
        store.commit(events.cellMoved({
          id: cellId,
          newPosition: targetCell.position,
        }))
        store.commit(events.cellMoved({
          id: targetCell.id,
          newPosition: currentCell.position,
        }))
      }
    }
  }, [cells, store])

  if (!notebook) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading notebook...</div>
      </div>
    )
  }

  const sortedCells = cells.sort((a: any, b: any) => a.position - b.position)

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <Button variant="outline" onClick={onBack}>
                ← Back
              </Button>

              {isEditingTitle ? (
                <Input
                  value={localTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalTitle(e.target.value)}
                  onBlur={updateTitle}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') updateTitle()
                    if (e.key === 'Escape') {
                      setLocalTitle(notebook.title)
                      setIsEditingTitle(false)
                    }
                  }}
                  className="text-2xl font-bold border-none bg-transparent p-0 focus-visible:ring-0"
                  autoFocus
                />
              ) : (
                <CardTitle
                  className="text-2xl cursor-pointer hover:text-muted-foreground transition-colors"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {notebook.title}
                </CardTitle>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">{notebook.kernelType}</Badge>
              <Badge variant="outline">{sortedCells.length} cells</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Cells */}
      <div className="space-y-1">
        {sortedCells.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground mb-6">
                This notebook is empty. Choose a cell type to get started.
              </div>
              <div className="flex justify-center gap-2 flex-wrap">
                <Button onClick={() => addCell()}>
                  + Code Cell
                </Button>
                <Button variant="outline" onClick={() => addCell(undefined, 'markdown')}>
                  📝 Markdown
                </Button>
                <Button variant="outline" onClick={() => addCell(undefined, 'sql')}>
                  🗄️ SQL Query
                </Button>
                <Button variant="outline" onClick={() => addCell(undefined, 'ai')}>
                  🤖 AI Assistant
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          sortedCells.map((cell: any) => (
            <Cell
              key={cell.id}
              cell={cell}
              onAddCell={() => addCell(cell.id)}
              onDeleteCell={() => deleteCell(cell.id)}
              onMoveUp={() => moveCell(cell.id, 'up')}
              onMoveDown={() => moveCell(cell.id, 'down')}
            />
          ))
        )}
      </div>

      {/* Add Cell Buttons */}
      {sortedCells.length > 0 && (
        <div className="mt-6 text-center space-y-3">
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => addCell()}>
              + Code Cell
            </Button>
            <Button variant="outline" onClick={() => addCell(undefined, 'markdown')}>
              📝 Markdown
            </Button>
            <Button variant="outline" onClick={() => addCell(undefined, 'sql')}>
              🗄️ SQL Query
            </Button>
            <Button variant="outline" onClick={() => addCell(undefined, 'ai')}>
              🤖 AI Assistant
            </Button>
          </div>
        </div>
      )}

      {/* Notebook Info */}
      <Separator className="my-8" />
      <div className="text-xs text-muted-foreground text-center">
        <div>Created: {new Date(notebook.createdAt).toLocaleString()}</div>
        <div>Modified: {new Date(notebook.lastModified).toLocaleString()}</div>
        <div>Owner: {notebook.ownerId}</div>
      </div>
    </div>
  )
}
