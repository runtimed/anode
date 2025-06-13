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
import { Copy, Terminal, Circle } from 'lucide-react'
import { getCurrentNotebookId } from '../../util/store-id.js'

const cellsQuery = queryDb(
  tables.cells.select().where({ deletedAt: null })
)

const notebookQuery = queryDb(
  tables.notebook.select().limit(1)
)

const kernelSessionsQuery = queryDb(
  tables.kernelSessions.select().where({ isActive: true })
)

interface NotebookViewerProps {
  notebookId: string
  onBack: () => void
}

export const NotebookViewer: React.FC<NotebookViewerProps> = ({ onBack }) => {
  const { store } = useStore()
  const cells = store.useQuery(cellsQuery) as any[]
  const notebooks = store.useQuery(notebookQuery) as any[]
  const kernelSessions = store.useQuery(kernelSessionsQuery) as any[]
  const notebook = notebooks[0]

  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [localTitle, setLocalTitle] = React.useState(notebook?.title || '')
  const [showKernelHelper, setShowKernelHelper] = React.useState(false)

  const currentNotebookId = getCurrentNotebookId()
  const kernelCommand = `NOTEBOOK_ID=${currentNotebookId} pnpm dev:kernel`

  // Check kernel status
  const activeKernel = kernelSessions.find((session: any) => session.status === 'ready')
  const hasActiveKernel = Boolean(activeKernel)
  const kernelStatus = activeKernel?.status || (kernelSessions.length > 0 ? kernelSessions[0].status : 'disconnected')

  const copyKernelCommand = useCallback(() => {
    navigator.clipboard.writeText(kernelCommand)
    // Could add a toast notification here
  }, [kernelCommand])

  React.useEffect(() => {
    if (notebook?.title) {
      setLocalTitle(notebook.title)
    }
  }, [notebook?.title])

  const updateTitle = useCallback(() => {
    if (notebook && localTitle !== notebook.title) {
      store.commit(events.notebookTitleChanged({
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
      position: newPosition,
      cellType,
      createdBy: 'current-user',
      createdAt: new Date(),
    }))
  }, [cells, store])

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
    const currentIndex = sortedCells.findIndex((c: any) => c.id === cellId)

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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKernelHelper(!showKernelHelper)}
                className="flex items-center gap-2"
              >
                <Terminal className="h-4 w-4" />
                Kernel
                <Circle
                  className={`h-2 w-2 fill-current ${
                    hasActiveKernel ? 'text-green-500' :
                    kernelStatus === 'starting' ? 'text-yellow-500' :
                    'text-red-500'
                  }`}
                />
              </Button>
              <Badge
                variant="secondary"
                className={`${
                  hasActiveKernel ? 'bg-green-100 text-green-800 border-green-200' :
                  kernelStatus === 'starting' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                  'bg-red-100 text-red-800 border-red-200'
                }`}
              >
                {notebook.kernelType} {hasActiveKernel ? '●' : '○'}
              </Badge>
              <Badge variant="outline">{sortedCells.length} cells</Badge>
            </div>
          </div>

          {showKernelHelper && (
            <div className="mt-4 p-4 bg-slate-50 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  Kernel Status
                  <Circle
                    className={`h-3 w-3 fill-current ${
                      hasActiveKernel ? 'text-green-500' :
                      kernelStatus === 'starting' ? 'text-yellow-500' :
                      'text-red-500'
                    }`}
                  />
                  <span className={`text-xs font-normal ${
                    hasActiveKernel ? 'text-green-600' :
                    kernelStatus === 'starting' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {hasActiveKernel ? 'Connected' :
                     kernelStatus === 'starting' ? 'Starting...' :
                     'Disconnected'}
                  </span>
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKernelHelper(false)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>

              {!hasActiveKernel && (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    Run this command in your terminal to start a kernel for notebook <code className="bg-slate-200 px-1 rounded">{currentNotebookId}</code>:
                  </p>
                  <div className="flex items-center gap-2 bg-slate-900 text-slate-100 p-3 rounded font-mono text-sm">
                    <span className="flex-1">{kernelCommand}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyKernelCommand}
                      className="h-8 w-8 p-0 text-slate-300 hover:text-slate-100 hover:bg-slate-700"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Note: Each notebook requires its own kernel instance. The kernel will connect automatically once started.
                  </p>
                </>
              )}

              {hasActiveKernel && activeKernel && (
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Session ID:</span>
                    <code className="bg-slate-200 px-1 rounded text-xs">{activeKernel.sessionId}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kernel Type:</span>
                    <span>{activeKernel.kernelType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started:</span>
                    <span>{new Date(activeKernel.startedAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Heartbeat:</span>
                    <span>{new Date(activeKernel.lastHeartbeat).toLocaleTimeString()}</span>
                  </div>
                </div>
              )}
            </div>
          )}
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
