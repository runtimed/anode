import React, { useState, useCallback } from 'react'
import { useStore } from '@livestore/react'
import { events, tables } from '@anode/schema'
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
import { RichOutput } from './RichOutput.js'

interface AiCellProps {
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

export const AiCell: React.FC<AiCellProps> = ({
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
  const [localSource, setLocalSource] = useState(cell.source)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Create stable query using useMemo to prevent React Hook issues
  const outputsQuery = React.useMemo(() =>
    queryDb(tables.outputs.select().where({ cellId: cell.id })),
    [cell.id]
  )
  const outputs = store.useQuery(outputsQuery) as any[]

  const provider = cell.aiProvider || 'openai'
  const model = cell.aiModel || 'gpt-4'

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
        modifiedBy: 'current-user',
      }))
    }
  }, [localSource, cell.source, cell.id, store])

  const executeAiPrompt = useCallback(async () => {
    if (!cell.source?.trim()) {
      console.log('No prompt to execute')
      return
    }

    console.log('🤖 Executing AI prompt via execution queue:', cell.id)

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

      console.log('✅ AI execution queued with ID:', queueId)

      // The kernel service will now:
      // 1. See the pending execution in the queue
      // 2. Recognize it's an AI cell and handle accordingly
      // 3. Make the AI API call (OpenAI, Anthropic, etc.)
      // 4. Emit execution events and cell outputs
      // 5. All clients will see the results in real-time!

    } catch (error) {
      console.error('❌ LiveStore AI execution error:', error)

      // Store error information directly
      store.commit(events.cellOutputAdded({
        id: `error-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        cellId: cell.id,
        outputType: 'error',
        data: {
          ename: 'AIExecutionError',
          evalue: error instanceof Error ? error.message : 'Failed to queue AI execution request',
          traceback: ['Error occurred while emitting LiveStore event'],
        },
        position: 0,
      }))
    }
  }, [cell.id, cell.source, cell.executionCount, store])

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
      executeAiPrompt()
      onAddCell() // Move to next cell
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      // Ctrl/Cmd+Enter: Run cell but stay in current cell
      e.preventDefault()
      updateSource()
      executeAiPrompt()
      // Don't call onAddCell() - stay in current cell
    }
  }, [updateSource, executeAiPrompt, onAddCell, onFocusNext, onFocusPrevious])

  const handleFocus = useCallback(() => {
    if (onFocus) {
      onFocus()
    }
  }, [onFocus])

  const changeProvider = useCallback((newProvider: string, newModel: string) => {
    store.commit(events.aiSettingsChanged({
      cellId: cell.id,
      provider: newProvider,
      model: newModel,
      settings: {
        temperature: 0.7,
        maxTokens: 1000,
      },
    }))
  }, [cell.id, store])

  const getBadgeVariant = () => {
    return 'default' as const
  }

  const getProviderBadge = () => {
    const colors = {
      openai: 'bg-green-600',
      anthropic: 'bg-orange-600',
      local: 'bg-purple-600'
    }
    return (
      <Badge variant="secondary" className={colors[provider as keyof typeof colors] || 'bg-gray-600'}>
        {provider.toUpperCase()} • {model}
      </Badge>
    )
  }

  const getExecutionStatus = () => {
    switch (cell.executionState) {
      case 'idle': return null
      case 'queued': return <Badge variant="secondary">Queued</Badge>
      case 'running': return <Badge variant="destructive">Generating...</Badge>
      case 'completed': return <Badge variant="default">✓</Badge>
      case 'error': return <Badge variant="destructive">Error</Badge>
      default: return null
    }
  }

  return (
    <div className={`mb-2 relative group border-l-4 transition-colors pl-4 ${
      autoFocus ? 'border-purple-500/40' : 'border-transparent'
    }`}>
      {/* Cell Header */}
      <div className="flex items-center justify-between mb-2 py-1">
        <div className="flex items-center gap-2">
          <Badge
            variant={getBadgeVariant()}
            className="cursor-pointer hover:opacity-80 text-xs bg-purple-600 text-white"
          >
            AI
          </Badge>
          {getProviderBadge()}
          {getExecutionStatus()}
        </div>

        {/* Cell Controls - visible on hover */}
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
        <div className="min-h-[60px]">
          <Textarea
            ref={textareaRef}
            value={localSource}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalSource(e.target.value)}
            onBlur={updateSource}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your notebook, data, or analysis..."
            className="min-h-[60px] resize-none border-0 p-3 focus-visible:ring-0 font-mono bg-transparent w-full"
            onFocus={handleFocus}
          />
        </div>

        {/* Execution Controls */}
        <div className="border-t border-border/50 p-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={executeAiPrompt}
              disabled={cell.executionState === 'running' || cell.executionState === 'queued'}
              className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 h-7"
            >
              {cell.executionState === 'running'
                ? 'Generating...'
                : cell.executionState === 'queued'
                ? 'Queued...'
                : 'Send'}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7">
                  Change Model
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => changeProvider('openai', 'gpt-4')}>
                  OpenAI GPT-4
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeProvider('openai', 'gpt-3.5-turbo')}>
                  OpenAI GPT-3.5 Turbo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeProvider('anthropic', 'claude-3-sonnet')}>
                  Anthropic Claude 3 Sonnet
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeProvider('anthropic', 'claude-3-haiku')}>
                  Anthropic Claude 3 Haiku
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeProvider('local', 'llama-2')}>
                  Local Llama 2
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Output Area for AI Responses */}
      {(outputs.length > 0 || cell.executionState === 'running') && (
        <div className="mt-2">
          <div className="bg-card/30 rounded-md border border-border/50 overflow-hidden">
            {cell.executionState === 'running' && outputs.length === 0 && (
              <div className="p-3 bg-purple-50/50 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                  <span className="text-sm text-purple-700">Generating AI response...</span>
                </div>
              </div>
            )}

            {outputs
              .sort((a: any, b: any) => a.position - b.position)
              .map((output: any, index: number) => (
                <div key={output.id} className={index > 0 ? "border-t border-border/50" : ""}>
                  {output.outputType === 'error' ? (
                    // Keep special error handling for better UX
                    <div className="p-3 bg-red-50/50">
                      <div className="text-xs text-red-600 mb-1 font-medium">Error:</div>
                      <div className="font-mono text-sm">
                        <div className="font-semibold text-red-700">
                          {(output.data as any).ename}: {(output.data as any).evalue}
                        </div>
                        {(output.data as any).traceback && (
                          <div className="mt-2 text-red-600 text-xs whitespace-pre-wrap">
                            {Array.isArray((output.data as any).traceback)
                              ? (output.data as any).traceback.join('\n')
                              : (output.data as any).traceback}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Use RichOutput for all other output types, with AI-specific styling
                    <div className="bg-purple-50/50">
                      <RichOutput
                        data={output.data}
                        metadata={output.metadata}
                        outputType={output.outputType}
                      />
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Context Information */}
      {outputs.length === 0 && cell.executionState === 'idle' && (
        <div className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
          💡 <strong>AI Assistant</strong><br/>
          I can help analyze your data, explain code, suggest improvements, and answer questions about your notebook.
          I have access to all previous cells and their outputs for context.
        </div>
      )}
    </div>
  )
}
