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

type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
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
  const [userInput, setUserInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const conversation = (cell.aiConversation as Message[]) || []
  const provider = cell.aiProvider || 'openai'
  const model = cell.aiModel || 'gpt-4'

  // Auto-focus when requested
  React.useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  const sendMessage = useCallback(async () => {
    if (!userInput.trim()) return

    const newMessage: Message = {
      role: 'user',
      content: userInput.trim(),
      timestamp: new Date(),
    }

    const updatedConversation = [...conversation, newMessage]

    // Update conversation with user message
    store.commit(events.aiConversationUpdated({
      cellId: cell.id,
      conversation: updatedConversation,
      updatedBy: 'current-user',
    }))

    setUserInput('')
    setIsGenerating(true)

    // TODO: Implement actual AI API call
    setTimeout(() => {
      const assistantMessage: Message = {
        role: 'assistant',
        content: `I understand you're asking: "${newMessage.content}"\n\nThis is a mock response from ${model}. In the full implementation, I would:\n\n1. Analyze the context from previous cells in this notebook\n2. Call the ${provider} API with your message\n3. Include relevant data and code context\n4. Provide helpful insights and suggestions\n\nThe AI integration will include access to:\n- Previous cell outputs and data\n- Code execution capabilities  \n- Data visualization tools\n- External knowledge retrieval`,
        timestamp: new Date(),
      }

      const finalConversation = [...updatedConversation, assistantMessage]

      store.commit(events.aiConversationUpdated({
        cellId: cell.id,
        conversation: finalConversation,
        updatedBy: 'current-user',
      }))

      setIsGenerating(false)
    }, 2000)
  }, [userInput, conversation, cell.id, store, provider, model])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    const { selectionStart, selectionEnd, value } = textarea

    // Handle arrow key navigation between cells
    if (e.key === 'ArrowUp' && selectionStart === selectionEnd) {
      // Check if cursor is at the beginning of the first line
      const beforeCursor = value.substring(0, selectionStart)
      const isAtTop = !beforeCursor.includes('\n')

      if (isAtTop && onFocusPrevious) {
        e.preventDefault()
        onFocusPrevious()
        return
      }
    } else if (e.key === 'ArrowDown' && selectionStart === selectionEnd) {
      // Check if cursor is at the end of the last line
      const afterCursor = value.substring(selectionEnd)
      const isAtBottom = !afterCursor.includes('\n')

      if (isAtBottom && onFocusNext) {
        e.preventDefault()
        onFocusNext()
        return
      }
    }

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage, onFocusNext, onFocusPrevious])

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

  const getProviderBadge = () => {
    const colors = {
      openai: 'bg-green-600',
      anthropic: 'bg-orange-600',
      local: 'bg-purple-600'
    }
    return (
      <Badge variant="default" className={colors[provider as keyof typeof colors] || 'bg-gray-600'}>
        {provider.toUpperCase()} • {model}
      </Badge>
    )
  }

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user'

    return (
      <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-primary text-primary-foreground ml-4'
            : 'bg-muted mr-4'
        }`}>
          <div className="whitespace-pre-wrap text-sm">
            {message.content}
          </div>
          <div className={`text-xs mt-2 ${
            isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}>
            {isUser ? 'You' : `${provider} ${model}`} • {formatTimestamp(message.timestamp)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`mb-2 relative group border-l-4 transition-colors pl-4 ${
      autoFocus ? 'border-purple-500/40' : 'border-transparent'
    }`}>
      {/* Cell Header */}
      <div className="flex items-center justify-between mb-2 py-1">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-purple-600 text-xs">
            AI
          </Badge>
          {getProviderBadge()}
          {isGenerating && (
            <Badge variant="destructive">Generating...</Badge>
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
      <div className={`rounded-md border transition-colors p-3 ${
        autoFocus
          ? 'bg-card border-ring/50'
          : 'bg-card/50 border-border/50 focus-within:border-ring/50 focus-within:bg-card'
      }`}>
        {/* Conversation History */}
        {conversation.length > 0 && (
          <div className="max-h-96 overflow-y-auto mb-4 space-y-2 -mx-3 px-3">
            {conversation.map((message, index) => renderMessage(message, index))}
            {isGenerating && (
              <div className="flex justify-start mb-4">
                <div className="bg-muted rounded-lg px-4 py-3 mr-4">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full"></div>
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Area */}
        <div className="space-y-3">
          <Textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your notebook, data, or analysis..."
            className="min-h-[80px] resize-none border-0 p-0 focus-visible:ring-0 bg-transparent"
            disabled={isGenerating}
            onFocus={handleFocus}
          />

          {/* AI Controls */}
          <div className="border-t border-border/50 -mx-3 px-3 pt-3 mt-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  onClick={sendMessage}
                  disabled={isGenerating || !userInput.trim()}
                  className="bg-purple-600 hover:bg-purple-700 h-7"
                >
                  {isGenerating ? 'Generating...' : 'Send'}
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

              <span className="text-xs text-muted-foreground">
                Ctrl+Enter to send • ↑↓ to navigate
              </span>
            </div>
          </div>

          {/* Context Information */}
          {conversation.length === 0 && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 -mx-3 mt-3">
              💡 <strong>AI Assistant</strong><br/>
              I can help analyze your data, explain code, suggest improvements, and answer questions about your notebook.
              I have access to all previous cells and their outputs for context.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
