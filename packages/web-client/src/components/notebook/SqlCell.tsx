import React, { useState, useCallback } from 'react'
import { useStore } from '@livestore/react'
import { events, tables, SqlResultData } from '../../../../../shared/schema.js'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface SqlCellProps {
  cell: typeof tables.cells.Type
  onAddCell: () => void
  onDeleteCell: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onFocusNext?: () => void
  onFocusPrevious?: () => void
  autoFocus?: boolean
  onFocus?: () => void
}

export const SqlCell: React.FC<SqlCellProps> = ({
  cell,
  onAddCell,
  onDeleteCell,
  onMoveUp,
  onMoveDown,
  onFocusNext,
  onFocusPrevious,
  autoFocus = false,
  onFocus
}) => {
  const { store } = useStore()
  const [localQuery, setLocalQuery] = useState(cell.source)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Auto-focus when requested
  React.useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  // Sync local source with cell source
  React.useEffect(() => {
    setLocalQuery(cell.source)
  }, [cell.source])

  const updateQuery = useCallback(() => {
    if (localQuery !== cell.source) {
      store.commit(events.cellSourceChanged({
        id: cell.id,
        source: localQuery,
        modifiedBy: 'current-user',
      }))
    }
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    const { selectionStart, selectionEnd, value } = textarea

    // Handle arrow key navigation between cells
    if (e.key === 'ArrowUp' && selectionStart === selectionEnd) {
      // For empty cells or cursor at beginning of first line
      const beforeCursor = value.substring(0, selectionStart)
      const isAtTop = selectionStart === 0 || !beforeCursor.includes('\n')

      if (isAtTop && onFocusPrevious) {
        e.preventDefault()
        updateQuery()
        onFocusPrevious()
        return
      }
    } else if (e.key === 'ArrowDown' && selectionStart === selectionEnd) {
      // For empty cells or cursor at end of last line
      const afterCursor = value.substring(selectionEnd)
      const isAtBottom = selectionEnd === value.length || !afterCursor.includes('\n')

      if (isAtBottom && onFocusNext) {
        e.preventDefault()
        updateQuery()
        onFocusNext()
        return
      }
    }

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
    }
  }, [updateQuery, executeQuery, onAddCell, onFocusNext, onFocusPrevious])

  const handleFocus = useCallback(() => {
    if (onFocus) {
      onFocus()
    }
  }, [onFocus])

  const getConnectionBadge = () => {
    if (!cell.sqlConnectionId) {
      return <Badge variant="outline" className="text-orange-600">No Connection</Badge>
    }
    return <Badge variant="secondary">Connection: {cell.sqlConnectionId}</Badge>
  }

  const renderResults = () => {
    if (!cell.sqlResultData) return null

    const data = cell.sqlResultData as SqlResultData

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
                        {String(cell ?? '')}
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
    <div className={`mb-2 relative group border-l-4 transition-colors pl-4 ${
      autoFocus ? 'border-blue-500/40' : 'border-transparent'
    }`}>
      {/* Cell Header */}
      <div className="flex items-center justify-between mb-2 py-1">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-blue-600 text-xs">
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
            className="h-6 w-6 p-0 text-xs"
          >
            ↑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveDown}
            className="h-6 w-6 p-0 text-xs"
          >
            ↓
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddCell}
            className="h-6 w-6 p-0 text-xs"
          >
            +
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteCell}
            className="h-6 w-6 p-0 text-xs text-destructive hover:text-destructive"
          >
            ×
          </Button>
        </div>
      </div>

      {/* Cell Content */}
      <div className={`rounded-md border transition-colors ${
        autoFocus
          ? 'bg-card border-ring/50'
          : 'bg-card/50 border-border/50 focus-within:border-ring/50 focus-within:bg-card'
      }`}>
        <div className="min-h-[80px]">
          <Textarea
            ref={textareaRef}
            value={localQuery}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalQuery(e.target.value)}
            onBlur={updateQuery}
            onKeyDown={handleKeyDown}
            placeholder="SELECT * FROM your_table WHERE condition = 'value';"
            className="min-h-[80px] resize-none border-0 p-3 focus-visible:ring-0 font-mono bg-transparent w-full"
            onFocus={handleFocus}
          />
        </div>

        {/* SQL Controls */}
        <div className="border-t border-border/50 p-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={executeQuery}
              disabled={cell.executionState === 'running' || !cell.sqlConnectionId}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 h-7"
            >
              {cell.executionState === 'running' ? 'Running...' : 'Run Query'}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7">
                  {cell.sqlConnectionId ? 'Change Connection' : 'Select Connection'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>PostgreSQL - Main DB</DropdownMenuItem>
                <DropdownMenuItem>MySQL - Analytics</DropdownMenuItem>
                <DropdownMenuItem>+ Add New Connection</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>


          </div>
        </div>
      </div>

        {/* Query Results */}
        {renderResults()}
    </div>
  )
}
