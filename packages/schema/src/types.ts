import { Schema } from '@livestore/livestore'

// Cell types
export type CellType = 'code' | 'markdown' | 'raw' | 'sql' | 'ai'

// Execution states
export type ExecutionState = 'idle' | 'queued' | 'running' | 'completed' | 'error'

// Kernel session statuses
export type KernelStatus = 'starting' | 'ready' | 'busy' | 'restarting' | 'terminated'

// Queue statuses
export type QueueStatus = 'pending' | 'assigned' | 'executing' | 'completed' | 'failed' | 'cancelled'

// Output types
export type OutputType = 'display_data' | 'execute_result' | 'stream' | 'error'

// AI providers
export type AiProvider = 'openai' | 'anthropic' | 'local'

// Termination reasons
export type TerminationReason = 'shutdown' | 'restart' | 'error' | 'timeout'

// Core data structures based on table schemas

export interface NotebookData {
  id: string
  title: string
  kernelType: string
  ownerId: string
  isPublic: boolean
}

export interface CellData {
  id: string
  cellType: CellType
  source: string
  position: number
  executionCount?: number
  executionState: ExecutionState
  assignedKernelSession?: string
  // SQL-specific fields
  sqlConnectionId?: string
  sqlResultData?: SqlResultData | null
  // AI-specific fields
  aiProvider?: string
  aiModel?: string
  aiSettings?: AiSettings | null
  createdBy: string
}

export interface OutputData {
  id: string
  cellId: string
  outputType: OutputType
  data: unknown
  metadata?: Record<string, unknown> | null
  position: number
}

export interface KernelSessionData {
  sessionId: string
  kernelId: string
  kernelType: string
  status: KernelStatus
  isActive: boolean
  canExecuteCode: boolean
  canExecuteSql: boolean
  canExecuteAi: boolean
}

export interface ExecutionQueueData {
  id: string
  cellId: string
  executionCount: number
  requestedBy: string
  status: QueueStatus
  assignedKernelSession?: string
  priority: number
  retryCount: number
  maxRetries: number
}

export interface DataConnectionData {
  id: string
  name: string
  type: string
  connectionString: string
  isDefault: boolean
  createdBy: string
}

export interface UiStateData {
  selectedCellId?: string
  editingCellId?: string
  kernelStatus?: string
}

// SQL-specific types
export interface SqlResultData {
  columns: string[]
  rows: unknown[][]
  rowCount: number
  executionTime: string
}

// AI-specific types
export interface AiSettings {
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

export interface KernelCapabilities {
  canExecuteCode: boolean
  canExecuteSql: boolean
  canExecuteAi: boolean
}

// Output data types for different output formats
export interface RichOutputData {
  'text/plain'?: string
  'text/markdown'?: string
  'text/html'?: string
  'image/svg+xml'?: string
  'image/svg'?: string
  'application/json'?: unknown
  [key: string]: unknown
}

// Error output structure
export interface ErrorOutputData {
  ename: string
  evalue: string
  traceback?: string[]
}

// Stream output structure
export interface StreamOutputData {
  name: 'stdout' | 'stderr'
  text: string
}

// Generic output structure that can hold any output type
export interface GenericOutputData {
  type: OutputType
  data: RichOutputData | ErrorOutputData | StreamOutputData | unknown
  metadata?: Record<string, unknown>
  position: number
}

// Event payload types (derived from schema)
export interface NotebookInitializedPayload {
  id: string
  title: string
  ownerId: string
}

export interface CellCreatedPayload {
  id: string
  cellType: CellType
  position: number
  createdBy: string
}

export interface CellSourceChangedPayload {
  id: string
  source: string
  modifiedBy: string
}

export interface ExecutionRequestedPayload {
  queueId: string
  cellId: string
  executionCount: number
  requestedBy: string
  priority: number
}

export interface KernelSessionStartedPayload {
  sessionId: string
  kernelId: string
  kernelType: string
  capabilities: KernelCapabilities
}

export interface CellOutputAddedPayload {
  id: string
  cellId: string
  outputType: OutputType
  data: unknown
  metadata?: Record<string, unknown>
  position: number
}

// Utility types for queries and filtering
export const Filter = Schema.Literal('all', 'active', 'completed')
export type Filter = typeof Filter.Type

// Type guards for output data
export function isErrorOutput(data: unknown): data is ErrorOutputData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'ename' in data &&
    'evalue' in data &&
    typeof (data as ErrorOutputData).ename === 'string' &&
    typeof (data as ErrorOutputData).evalue === 'string'
  )
}

export function isStreamOutput(data: unknown): data is StreamOutputData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'name' in data &&
    'text' in data &&
    ['stdout', 'stderr'].includes((data as StreamOutputData).name) &&
    typeof (data as StreamOutputData).text === 'string'
  )
}

export function isRichOutput(data: unknown): data is RichOutputData {
  return typeof data === 'object' && data !== null && !isErrorOutput(data) && !isStreamOutput(data)
}

// Helper type for sorted cells
export type SortedCell = CellData & { sortIndex: number }
