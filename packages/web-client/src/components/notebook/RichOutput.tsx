import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { StreamOutputData } from '../../../../../shared/schema.js'
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
  outputType = 'display_data'
}) => {
  // Handle stream outputs specially
  if (outputType === 'stream') {
    const streamData = data as unknown as StreamOutputData
    const isStderr = streamData.name === 'stderr'

    return (
      <div className={`py-2 ${isStderr ? 'text-red-600' : 'text-gray-700'}`}>
        <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed">
          {streamData.text}
        </div>
      </div>
    )
  }

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
          <div className="prose prose-sm max-w-none prose-gray">
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
                      customStyle={{
                        margin: 0,
                        background: '#f9fafb',
                        borderRadius: '0.375rem',
                        padding: '0.5rem'
                      }}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={`${className} bg-gray-100 px-1 py-0.5 rounded text-sm`} {...props}>
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
              // Clean styles for pandas DataFrames
              '--dataframe-border': '1px solid #e5e7eb',
              '--dataframe-bg': '#fff',
              '--dataframe-header-bg': '#f9fafb',
              '--dataframe-hover-bg': '#f3f4f6'
            } as React.CSSProperties}
          />
        )

      case 'image/svg+xml':
      case 'image/svg':
        return (
          <div className="flex justify-center py-2">
            <div
              className="max-w-full"
              dangerouslySetInnerHTML={{ __html: outputData[mediaType] || '' }}
            />
          </div>
        )

      case 'application/json':
        return (
          <div className="bg-gray-50/50 rounded p-2">
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
          <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed text-gray-700">
            {String(outputData[mediaType] || '')}
          </div>
        )
    }
  }





  return (
    <div>
      {/* Content */}
      <div>
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
