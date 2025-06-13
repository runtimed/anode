import React, { useState, useCallback } from 'react'
import { useStore } from '@livestore/react'
import { events, tables } from '@anode/schema'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'

interface SqlCellProps {
  cell: typeof tables.cells.Type
  onAddCell: () => void
  onDeleteCell: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

export const SqlCell: React.FC<SqlCellProps> = ({
  cell,
  onAddCell,
  onDeleteCell,
  onMoveUp,
  onMoveDown
}) => {
  const { store } = useStore()
  const [isEditing, setIsEditing] = useState(false)
  const [localQuery, setLocalQuery] = useState(cell.source)

  const updateQuery = useCallback(() => {
    if (localQuery !== cell.source) {
      store.commit(events.cellSourceChanged({
        id: cell.id,
        source: localQuery,
        modifiedBy: 'current-user',
      }))
    }
    setIsEditing(false)
  }, [localQuery, cell.source, cell.id, store])

  const executeQuery = useCallback(() => {
    if (!cell.sqlConnectionId) {
      // TODO: Show connection selection modal
      console.log('No connection selected for SQL cell')
      return
    }

    // TODO: Implement actual SQL execution
    console.log('Execute SQL query:', localQuery, 'on connection:', cell.sqlConnectionId)

    // Mock execution for now
    const mockResult = {
      columns: ['id', 'name', 'value'],
      rows: [
        [1, 'Example Row 1', 42],
        [2, 'Example Row 2', 84],
      ],
      rowCount: 2,
      executionTime: '15ms'
    }

    store.commit(events.sqlQueryExecuted({
      cellId: cell.id,
      connectionId: cell.sqlConnectionId,
      query: localQuery,
      resultData: mockResult,
      executedBy: 'current-user',
    }))
  }, [cell.id, cell.sqlConnectionId, localQuery, store])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      // Shift+Enter: Run query and move to next cell
      e.preventDefault()
      updateQuery()
      executeQuery()
      onAddCell()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      // Ctrl/Cmd+Enter: Run query but stay in current cell
      e.preventDefault()
      updateQuery()
      executeQuery()
    } else if (e.key === 'Escape') {
      setLocalQuery(cell.source)
      setIsEditing(false)
    }
  }, [updateQuery, executeQuery, cell.source, onAddCell])

  const getConnectionBadge = () => {
    if (!cell.sqlConnectionId) {
      return <Badge variant="outline" className="text-orange-600">No Connection</Badge>
    }
    return <Badge variant="secondary">Connection: {cell.sqlConnectionId}</Badge>
  }

  const renderResults = () => {
    if (!cell.sqlResultData) return null

    const data = cell.sqlResultData as {
      columns: string[]
      rows: any[][]
      rowCount: number
      executionTime: string
    }

    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.rowCount} rows returned</span>
          <span>Executed in {data.executionTime}</span>
        </div>

        <div className="border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  {data.columns.map((col) => (
                    <th key={col} className="px-3 py-2 text-left font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} className="border-t">
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="mb-4 relative group">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-blue-600">
              SQL
            </Badge>
            {getConnectionBadge()}
            {cell.executionState === 'running' && (
              <Badge variant="destructive">Running...</Badge>
            )}
          </div>

          {/* Cell Controls */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              className="h-8 w-8 p-0"
            >
              ↑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              className="h-8 w-8 p-0"
            >
              ↓
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddCell}
              className="h-8 w-8 p-0"
            >
              +
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteCell}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              ×
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div
          onClick={() => setIsEditing(true)}
          className="min-h-[60px] cursor-text"
        >
          {isEditing ? (
            <Textarea
              value={localQuery}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalQuery(e.target.value)}
              onBlur={updateQuery}
              onKeyDown={handleKeyDown}
              placeholder="SELECT * FROM your_table WHERE condition = 'value';"
              className="min-h-[80px] resize-none border-0 p-2 focus-visible:ring-0 font-mono"
              autoFocus
            />
          ) : (
            <div
              className={`whitespace-pre-wrap font-mono text-sm min-h-[60px] p-2 rounded border-2 border-transparent hover:border-muted-foreground/20 transition-colors ${
                cell.source ? '' : 'text-muted-foreground italic'
              }`}
            >
              {cell.source || 'Click to enter SQL query...'}
            </div>
          )}
        </div>

        {/* SQL Controls */}
        {!isEditing && (
          <>
            <Separator className="my-3" />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={executeQuery}
                disabled={cell.executionState === 'running' || !cell.sqlConnectionId}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              >
                {cell.executionState === 'running' ? 'Running...' : 'Run Query'}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {cell.sqlConnectionId ? 'Change Connection' : 'Select Connection'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>PostgreSQL - Main DB</DropdownMenuItem>
                  <DropdownMenuItem>MySQL - Analytics</DropdownMenuItem>
                  <DropdownMenuItem>+ Add New Connection</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="text-xs text-muted-foreground">
                Shift+Enter to run and move • Ctrl+Enter to run
              </span>
            </div>
          </>
        )}

        {/* Query Results */}
        {renderResults()}
      </CardContent>
    </Card>
  )
}
