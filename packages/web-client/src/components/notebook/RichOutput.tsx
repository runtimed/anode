import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import './RichOutput.css'

interface RichOutputProps {
  data: Record<string, unknown>
  metadata?: Record<string, unknown>
  outputType?: 'display_data' | 'execute_result' | 'stream' | 'error'
}

interface OutputData {
  'text/plain'?: string
  'text/markdown'?: string
  'text/html'?: string
  'image/svg+xml'?: string
  'image/svg'?: string
  'application/json'?: unknown
  [key: string]: unknown
}

export const RichOutput: React.FC<RichOutputProps> = ({
  data,
  metadata,
  outputType = 'display_data'
}) => {
  const outputData = data as OutputData

  // Determine the best media type to render, in order of preference
  const getPreferredMediaType = (): string | null => {
    const preferenceOrder = [
      'text/markdown',
      'text/html',
      'image/svg+xml',
      'image/svg',
      'application/json',
      'text/plain'
    ]

    for (const mediaType of preferenceOrder) {
      if (outputData[mediaType] !== undefined && outputData[mediaType] !== null) {
        return mediaType
      }
    }

    return null
  }

  const mediaType = getPreferredMediaType()

  if (!mediaType) {
    return (
      <div className="p-3 bg-gray-50/50 text-sm text-gray-500 italic">
        No displayable content
      </div>
    )
  }

  const renderContent = () => {
    switch (mediaType) {
      case 'text/markdown':
        return (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const language = match ? match[1] : ''
                  const inline = !className

                  return !inline && language ? (
                    <SyntaxHighlighter
                      style={oneLight}
                      language={language}
                      PreTag="div"
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {String(outputData[mediaType] || '')}
            </ReactMarkdown>
          </div>
        )

      case 'text/html':
        return (
          <div
            className="max-w-none dataframe-container"
            dangerouslySetInnerHTML={{ __html: outputData[mediaType] || '' }}
            style={{
              // Add styles for pandas DataFrames
              '--dataframe-border': '1px solid #dee2e6',
              '--dataframe-bg': '#fff',
              '--dataframe-header-bg': '#f8f9fa',
              '--dataframe-hover-bg': '#f5f5f5'
            } as React.CSSProperties}
          />
        )

      case 'image/svg+xml':
      case 'image/svg':
        return (
          <div className="flex justify-center p-4">
            <div
              className="max-w-full"
              dangerouslySetInnerHTML={{ __html: outputData[mediaType] || '' }}
            />
          </div>
        )

      case 'application/json':
        return (
          <div className="bg-gray-50 rounded-md p-3">
            <SyntaxHighlighter
              language="json"
              style={oneLight}
              customStyle={{
                margin: 0,
                background: 'transparent',
                fontSize: '0.875rem'
              }}
            >
              {JSON.stringify(outputData[mediaType], null, 2)}
            </SyntaxHighlighter>
          </div>
        )

      case 'text/plain':
      default:
        return (
          <div className="font-mono text-sm whitespace-pre-wrap">
            {String(outputData[mediaType] || '')}
          </div>
        )
    }
  }

  const getOutputTypeLabel = () => {
    switch (outputType) {
      case 'execute_result':
        return 'Result'
      case 'display_data':
        return 'Output'
      case 'stream':
        return 'Stream'
      case 'error':
        return 'Error'
      default:
        return 'Output'
    }
  }

  const getOutputTypeColor = () => {
    switch (outputType) {
      case 'execute_result':
        return 'text-green-600'
      case 'display_data':
        return 'text-blue-600'
      case 'stream':
        return 'text-gray-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getOutputTypeBg = () => {
    switch (outputType) {
      case 'execute_result':
        return 'bg-green-50/50'
      case 'display_data':
        return 'bg-blue-50/50'
      case 'stream':
        return 'bg-gray-50/50'
      case 'error':
        return 'bg-red-50/50'
      default:
        return 'bg-gray-50/50'
    }
  }

  return (
    <div className={`${getOutputTypeBg()}`}>
      {/* Output Type Header */}
      <div className="px-3 py-1 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className={`text-xs font-medium ${getOutputTypeColor()}`}>
            {getOutputTypeLabel()}
            {mediaType && mediaType !== 'text/plain' && (
              <span className="text-gray-500 ml-2">({mediaType})</span>
            )}
          </div>
          {metadata && Object.keys(metadata).length > 0 && (
            <div className="text-xs text-gray-400">
              {Object.entries(metadata).map(([key, value]) => (
                <span key={key} className="ml-2">
                  {key}: {String(value)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {renderContent()}
      </div>
    </div>
  )
}

// Helper function to create rich output data
export const createRichOutput = (content: string, mediaType: string = 'text/plain') => {
  return {
    [mediaType]: content
  }
}

// Helper function to create markdown output
export const createMarkdownOutput = (markdown: string) => {
  return createRichOutput(markdown, 'text/markdown')
}

// Helper function to create SVG output
export const createSvgOutput = (svg: string) => {
  return createRichOutput(svg, 'image/svg+xml')
}
