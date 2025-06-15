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
import { RichOutput } from './RichOutput.js'
import { Play, ChevronUp, ChevronDown, Plus, X, Bot, Code, FileText, Database, FileX } from 'lucide-react'

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
  const outputs = store.useQuery(outputsQuery) as OutputData[]

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
    // Use localSource instead of cell.source to get the current typed content
    const sourceToExecute = localSource || cell.source
    if (!sourceToExecute?.trim()) {
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

  const changeCellType = useCallback((newType: 'code' | 'markdown' | 'raw' | 'sql' | 'ai') => {
    store.commit(events.cellTypeChanged({
      id: cell.id,
      cellType: newType,
    }))
  }, [cell.id, store])

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

  const getCellTypeIcon = () => {
    return <Bot className="h-3 w-3" />
  }

  const getProviderBadge = () => {
    const colors = {
      openai: 'text-green-700 bg-green-50 border-green-200',
      anthropic: 'text-orange-700 bg-orange-50 border-orange-200',
      local: 'text-purple-700 bg-purple-50 border-purple-200'
    }
    return (
      <Badge variant="outline" className={`h-5 text-xs ${colors[provider as keyof typeof colors] || 'bg-gray-50'}`}>
        {provider.toUpperCase()} • {model}
      </Badge>
    )
  }

  const getExecutionStatus = () => {
    switch (cell.executionState) {
      case 'idle': return null
      case 'queued': return <Badge variant="secondary" className="h-5 text-xs">Queued</Badge>
      case 'running': return (
        <Badge variant="outline" className="h-5 text-xs border-purple-200 text-purple-700 bg-purple-50">
          <div className="animate-spin w-2 h-2 border border-purple-600 border-t-transparent rounded-full mr-1"></div>
          Generating
        </Badge>
      )
      case 'completed': return <Badge variant="outline" className="h-5 text-xs border-green-200 text-green-700 bg-green-50">✓</Badge>
      case 'error': return <Badge variant="outline" className="h-5 text-xs border-red-200 text-red-700 bg-red-50">Error</Badge>
      default: return null
    }
  }

  return (
    <div className={`mb-3 relative group border-l-2 transition-all duration-200 ${
      autoFocus ? 'border-purple-500/60 bg-purple-50/30' : 'border-transparent hover:border-border/50'
    }`}>
      {/* Cell Header */}
      <div className="flex items-center justify-between mb-3 py-1 px-4">
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 gap-1.5 text-xs font-medium hover:bg-muted/50 bg-purple-50 text-purple-700 border border-purple-200"
              >
                {getCellTypeIcon()}
                <span>AI</span>
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
              <DropdownMenuItem onClick={() => changeCellType('raw')} className="gap-2">
                <FileX className="h-4 w-4" />
                Raw
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {getProviderBadge()}
          {getExecutionStatus()}
        </div>

        {/* Cell Controls - visible on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveUp}
            className="h-7 w-7 p-0 hover:bg-muted/80"
            title="Move cell up"
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveDown}
            className="h-7 w-7 p-0 hover:bg-muted/80"
            title="Move cell down"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddCell}
            className="h-7 w-7 p-0 hover:bg-muted/80"
            title="Add cell below"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteCell}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Delete cell"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
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
            placeholder="Ask me anything about your notebook, data, or analysis..."
            className="min-h-[60px] resize-none border-0 p-0 focus-visible:ring-0 font-mono bg-transparent w-full placeholder:text-muted-foreground/60"
            onFocus={handleFocus}
          />
        </div>

        {/* Execution Controls */}
        <div className="border-t border-border/20 pt-3 mt-3">
          <div className="flex items-center justify-between">
            <Button
              variant={cell.executionState === 'running' || cell.executionState === 'queued' ? 'outline' : 'default'}
              size="sm"
              onClick={executeAiPrompt}
              disabled={cell.executionState === 'running' || cell.executionState === 'queued'}
              className="h-7 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              {cell.executionState === 'running' ? (
                <>
                  <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div>
                  Generating
                </>
              ) : cell.executionState === 'queued' ? (
                <>Queued</>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  Send
                </>
              )}
            </Button>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                    Change Model
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
      </div>

      {/* Output Area for AI Responses */}
      {(outputs.length > 0 || cell.executionState === 'running') && (
        <div className="mt-3 px-4">
          {cell.executionState === 'running' && outputs.length === 0 && (
            <div className="py-3 border-l-2 border-purple-200 pl-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                <span className="text-sm text-purple-700">Generating AI response...</span>
              </div>
            </div>
          )}

          {outputs
            .sort((a: OutputData, b: OutputData) => a.position - b.position)
            .map((output: OutputData, index: number) => (
              <div key={output.id} className={index > 0 ? "border-t border-border/30 mt-2 pt-2" : ""}>
                {output.outputType === 'error' ? (
                  // Keep special error handling for better UX
                  <div className="py-3 border-l-2 border-red-200 pl-3">
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

      {/* Context Information */}
      {outputs.length === 0 && cell.executionState === 'idle' && (
        <div className="mt-3 px-4 text-sm text-muted-foreground border-l-2 border-purple-200 pl-3 py-2">
          <div className="flex items-start gap-2">
            <Bot className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-purple-700 mb-1">AI Assistant</div>
              <div className="text-xs">
                I can help analyze your data, explain code, suggest improvements, and answer questions about your notebook.
                I have access to all previous cells and their outputs for context.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
