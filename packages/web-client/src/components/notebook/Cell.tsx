import React, { useState, useCallback } from 'react'
import { useStore } from '@livestore/react'
import { events, tables, OutputData, isErrorOutput } from '../../../../../shared/schema.js'
import { queryDb } from '@livestore/livestore'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

import { SqlCell } from './SqlCell.js'
import { AiCell } from './AiCell.js'
import { RichOutput } from './RichOutput.js'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Play, ChevronUp, ChevronDown, Plus, X, Code, FileText, Database, Bot } from 'lucide-react'

type CellType = typeof tables.cells.Type

interface CellProps {
  cell: CellType
  onAddCell: () => void
  onDeleteCell: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onFocusNext?: () => void
  onFocusPrevious?: () => void
  autoFocus?: boolean
  onFocus?: () => void
}

export const Cell: React.FC<CellProps> = ({
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
  // Route to specialized cell components
  if (cell.cellType === 'sql') {
    return <SqlCell
      cell={cell}
      onAddCell={onAddCell}
      onDeleteCell={onDeleteCell}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onFocusNext={onFocusNext}
      onFocusPrevious={onFocusPrevious}
      autoFocus={autoFocus}
      onFocus={onFocus}
    />
  }

  if (cell.cellType === 'ai') {
    return <AiCell
      cell={cell}
      onAddCell={onAddCell}
      onDeleteCell={onDeleteCell}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onFocusNext={onFocusNext}
      onFocusPrevious={onFocusPrevious}
      autoFocus={autoFocus}
      onFocus={onFocus}
    />
  }

  // Default cell component for code, markdown, raw
  const { store } = useStore()
  const [localSource, setLocalSource] = useState(cell.source)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Create stable query using useMemo to prevent React Hook issues
  const outputsQuery = React.useMemo(() =>
    queryDb(tables.outputs.select().where({ cellId: cell.id })),
    [cell.id]
  )
  const outputs = store.useQuery(outputsQuery) as OutputData[]

  // Auto-focus when requested
  React.useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  // Sync local source with cell source
  React.useEffect(() => {
    setLocalSource(cell.source)
  }, [cell.source])

  const updateSource = useCallback(() => {
    if (localSource !== cell.source) {
      store.commit(events.cellSourceChanged({
        id: cell.id,
        source: localSource,
        modifiedBy: 'current-user', // TODO: get from auth
      }))
    }
  }, [localSource, cell.source, cell.id, store])

  const changeCellType = useCallback((newType: 'code' | 'markdown' | 'sql' | 'ai') => {
    store.commit(events.cellTypeChanged({
      id: cell.id,
      cellType: newType,
    }))
  }, [cell.id, store])

  const executeCell = useCallback(async () => {
    // Use localSource instead of cell.source to get the current typed content
    const sourceToExecute = localSource || cell.source
    if (!sourceToExecute?.trim()) {
      console.log('No code to execute')
      return
    }

    console.log('🚀 Executing cell via execution queue:', cell.id)

    try {
      // Clear previous outputs first
      store.commit(events.cellOutputsCleared({
        cellId: cell.id,
        clearedBy: 'current-user',
      }))

      // Generate unique queue ID
      const queueId = `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const executionCount = (cell.executionCount || 0) + 1

      // Add to execution queue - kernels will pick this up
      store.commit(events.executionRequested({
        queueId,
        cellId: cell.id,
        executionCount,
        requestedBy: 'current-user',
        priority: 1,
      }))

      console.log('✅ Execution queued with ID:', queueId)

      // The kernel service will now:
      // 1. See the pending execution in the queue
      // 2. Assign itself to the execution
      // 3. Execute the code
      // 4. Emit execution events and cell outputs
      // 5. All clients will see the results in real-time!

    } catch (error) {
      console.error('❌ LiveStore execution error:', error)

      // Store error information directly
      store.commit(events.cellOutputAdded({
        id: `error-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        cellId: cell.id,
        outputType: 'error',
        data: {
          ename: 'LiveStoreError',
          evalue: error instanceof Error ? error.message : 'Failed to queue execution request',
          traceback: ['Error occurred while emitting LiveStore event'],
        },
        position: 0,
      }))
    }
  }, [cell.id, localSource, cell.executionCount, store])

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
        updateSource()
        onFocusPrevious()
        return
      }
    } else if (e.key === 'ArrowDown' && selectionStart === selectionEnd) {
      // For empty cells or cursor at end of last line
      const afterCursor = value.substring(selectionEnd)
      const isAtBottom = selectionEnd === value.length || !afterCursor.includes('\n')

      if (isAtBottom && onFocusNext) {
        e.preventDefault()
        updateSource()
        onFocusNext()
        return
      }
    }

    // Handle execution shortcuts
    if (e.key === 'Enter' && e.shiftKey) {
      // Shift+Enter: Run cell and move to next (create new cell)
      e.preventDefault()
      updateSource()
      if (cell.cellType === 'code') {
        executeCell()
      }
      onAddCell() // Move to next cell
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      // Ctrl/Cmd+Enter: Run cell but stay in current cell
      e.preventDefault()
      updateSource()
      if (cell.cellType === 'code') {
        executeCell()
      }
      // Don't call onAddCell() - stay in current cell
    }
  }, [updateSource, executeCell, cell.cellType, onAddCell, onFocusNext, onFocusPrevious])

  const handleFocus = useCallback(() => {
    if (onFocus) {
      onFocus()
    }
  }, [onFocus])

  const getCellTypeIcon = () => {
    switch (cell.cellType) {
      case 'code': return <Code className="h-3 w-3" />
      case 'markdown': return <FileText className="h-3 w-3" />
      case 'sql': return <Database className="h-3 w-3" />
      case 'ai': return <Bot className="h-3 w-3" />
      default: return <Code className="h-3 w-3" />
    }
  }

  const getExecutionStatus = () => {
    switch (cell.executionState) {
      case 'idle': return null
      case 'queued': return <Badge variant="secondary" className="h-5 text-xs">Queued</Badge>
      case 'running': return (
        <Badge variant="outline" className="h-5 text-xs border-blue-200 text-blue-700 bg-blue-50">
          <div className="animate-spin w-2 h-2 border border-blue-600 border-t-transparent rounded-full mr-1"></div>
          Running
        </Badge>
      )
      case 'completed': return <Badge variant="outline" className="h-5 text-xs border-green-200 text-green-700 bg-green-50">✓</Badge>
      case 'error': return <Badge variant="outline" className="h-5 text-xs border-red-200 text-red-700 bg-red-50">Error</Badge>
      default: return null
    }
  }

  return (
    <div className={`mb-3 relative group border-l-2 transition-all duration-200 ${
      autoFocus ? 'border-primary/60 bg-primary/5' : 'border-transparent hover:border-border/50'
    }`}>
      {/* Cell Header */}
      <div className="flex items-center justify-between mb-3 py-1 pl-6 pr-4">
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 gap-1.5 text-xs font-medium hover:bg-muted/50"
              >
                {getCellTypeIcon()}
                <span className="capitalize">{cell.cellType}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem onClick={() => changeCellType('code')} className="gap-2">
                <Code className="h-4 w-4" />
                Code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeCellType('markdown')} className="gap-2">
                <FileText className="h-4 w-4" />
                Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeCellType('sql')} className="gap-2">
                <Database className="h-4 w-4" />
                SQL Query
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeCellType('ai')} className="gap-2">
                <Bot className="h-4 w-4" />
                AI Assistant
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {getExecutionStatus()}
        </div>

        {/* Cell Controls - visible on hover */}
        <TooltipProvider>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMoveUp}
                  className="h-7 w-7 p-0 hover:bg-muted/80"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Move cell up</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMoveDown}
                  className="h-7 w-7 p-0 hover:bg-muted/80"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Move cell down</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAddCell}
                  className="h-7 w-7 p-0 hover:bg-muted/80"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add cell below</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDeleteCell}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete cell</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* Cell Content */}
      <div className={`transition-colors px-4 py-3 ${
        autoFocus
          ? 'bg-card/80'
          : 'bg-card/30 focus-within:bg-card/60'
      }`}>
        <div className="min-h-[60px]">
          <Textarea
            ref={textareaRef}
            value={localSource}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalSource(e.target.value)}
            onBlur={updateSource}
            onKeyDown={handleKeyDown}
            placeholder={
              cell.cellType === 'code'
                ? 'Enter your code here...'
                : cell.cellType === 'markdown'
                ? 'Enter markdown...'
                : 'Enter raw text...'
            }
            className="min-h-[60px] resize-none border-0 px-2 py-2 focus-visible:ring-0 font-mono bg-transparent w-full placeholder:text-muted-foreground/60"
            onFocus={handleFocus}
          />
        </div>

        {/* Execution Controls for Code Cells */}
        {cell.cellType === 'code' && (
          <div className="border-t border-border/20 pt-3 mt-3 pl-2 pr-0">
            <div className="flex items-center justify-between">
              <Button
                variant={cell.executionState === 'running' || cell.executionState === 'queued' ? 'outline' : 'default'}
                size="sm"
                onClick={executeCell}
                disabled={cell.executionState === 'running' || cell.executionState === 'queued'}
                className="h-7 gap-1.5 text-xs"
              >
                {cell.executionState === 'running' ? (
                  <>
                    <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div>
                    Running
                  </>
                ) : cell.executionState === 'queued' ? (
                  <>Queued</>
                ) : (
                  <>
                    <Play className="h-3 w-3" />
                    Run
                  </>
                )}
              </Button>


            </div>
          </div>
        )}
      </div>



      {/* Output Area for Code Cells */}
      {cell.cellType === 'code' && (outputs.length > 0 || cell.executionState === 'running') && (
        <div className="mt-3 pl-6 pr-4">
          {cell.executionState === 'running' && outputs.length === 0 && (
            <div className="py-3 border-l-2 border-blue-200 pl-1">
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-sm text-blue-700">Executing...</span>
              </div>
            </div>
          )}

          {outputs
            .sort((a: OutputData, b: OutputData) => a.position - b.position)
            .map((output: OutputData, index: number) => (
              <div key={output.id} className={index > 0 ? "border-t border-border/30 mt-2 pt-2" : ""}>
                {output.outputType === 'error' ? (
                  // Keep special error handling for better UX
                  <div className="py-3 border-l-2 border-red-200 pl-1">
                    <div className="font-mono text-sm">
                      <div className="font-semibold text-red-700 mb-1">
                        {isErrorOutput(output.data)
                          ? `${output.data.ename}: ${output.data.evalue}`
                          : 'Unknown error'}
                      </div>
                      {isErrorOutput(output.data) && output.data.traceback && (
                        <div className="mt-2 text-red-600 text-xs whitespace-pre-wrap opacity-80">
                          {Array.isArray(output.data.traceback)
                            ? output.data.traceback.join('\n')
                            : output.data.traceback}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Use RichOutput for all other output types
                  <div className="py-2">
                    <RichOutput
                      data={output.data as Record<string, unknown>}
                      metadata={output.metadata as Record<string, unknown> | undefined}
                      outputType={output.outputType}
                    />
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
