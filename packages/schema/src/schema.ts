import { Events, makeSchema, Schema, SessionIdSymbol, State } from '@livestore/livestore'

// Core tables for collaborative notebooks
// Key architectural change: NOTEBOOK_ID = STORE_ID for simplicity
export const tables: Record<string, any> = {
  // Notebook metadata (single row per store)
  notebook: State.SQLite.table({
    name: 'notebook',
    columns: {
      id: State.SQLite.text({ primaryKey: true }), // Same as storeId
      title: State.SQLite.text({ default: 'Untitled Notebook' }),
      kernelType: State.SQLite.text({ default: 'python3' }),
      ownerId: State.SQLite.text(),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      lastModified: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      isPublic: State.SQLite.boolean({ default: false }),
    },
  }),

  cells: State.SQLite.table({
    name: 'cells',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      cellType: State.SQLite.text({ schema: Schema.Literal('code', 'markdown', 'raw', 'sql', 'ai') }),
      source: State.SQLite.text({ default: '' }),
      position: State.SQLite.real(),

      // Execution state
      executionCount: State.SQLite.integer({ nullable: true }),
      executionState: State.SQLite.text({ default: 'idle', schema: Schema.Literal('idle', 'queued', 'running', 'completed', 'error') }),
      queuedAt: State.SQLite.integer({ nullable: true, schema: Schema.DateFromNumber }),
      assignedKernelSession: State.SQLite.text({ nullable: true }), // Which kernel session is handling this

      // SQL-specific fields
      sqlConnectionId: State.SQLite.text({ nullable: true }),
      sqlResultData: State.SQLite.json({ nullable: true, schema: Schema.Any }),

      // AI-specific fields
      aiProvider: State.SQLite.text({ nullable: true }), // 'openai', 'anthropic', 'local'
      aiModel: State.SQLite.text({ nullable: true }),
      aiConversation: State.SQLite.json({ nullable: true, schema: Schema.Any }), // Array of messages
      aiSettings: State.SQLite.json({ nullable: true, schema: Schema.Any }), // temperature, max_tokens, etc.

      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      createdBy: State.SQLite.text(),
      deletedAt: State.SQLite.integer({ nullable: true, schema: Schema.DateFromNumber }),
    },
  }),

  outputs: State.SQLite.table({
    name: 'outputs',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      cellId: State.SQLite.text(),
      outputType: State.SQLite.text({ schema: Schema.Literal('display_data', 'execute_result', 'stream', 'error') }),
      data: State.SQLite.json({ schema: Schema.Any }),
      position: State.SQLite.real(),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    },
  }),

  // Kernel lifecycle management
  kernelSessions: State.SQLite.table({
    name: 'kernelSessions',
    columns: {
      sessionId: State.SQLite.text({ primaryKey: true }),
      kernelId: State.SQLite.text(), // Stable kernel identifier
      kernelType: State.SQLite.text({ default: 'python3' }),
      status: State.SQLite.text({ schema: Schema.Literal('starting', 'ready', 'busy', 'restarting', 'terminated') }),
      startedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      lastHeartbeat: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      terminatedAt: State.SQLite.integer({ nullable: true, schema: Schema.DateFromNumber }),
      isActive: State.SQLite.boolean({ default: true }),

      // Capability flags
      canExecuteCode: State.SQLite.boolean({ default: false }),
      canExecuteSql: State.SQLite.boolean({ default: false }),
      canExecuteAi: State.SQLite.boolean({ default: false }),
    },
  }),

  // Execution queue - tracks work that needs to be done
  executionQueue: State.SQLite.table({
    name: 'executionQueue',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      cellId: State.SQLite.text(),
      executionCount: State.SQLite.integer(),
      requestedBy: State.SQLite.text(),
      requestedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),

      // Queue management
      status: State.SQLite.text({ default: 'pending', schema: Schema.Literal('pending', 'assigned', 'executing', 'completed', 'failed', 'cancelled') }),
      assignedKernelSession: State.SQLite.text({ nullable: true }),
      assignedAt: State.SQLite.integer({ nullable: true, schema: Schema.DateFromNumber }),
      completedAt: State.SQLite.integer({ nullable: true, schema: Schema.DateFromNumber }),

      // Priority and metadata
      priority: State.SQLite.integer({ default: 0 }), // Higher = more important
      retryCount: State.SQLite.integer({ default: 0 }),
      maxRetries: State.SQLite.integer({ default: 3 }),
    },
  }),

  // Data connections for SQL cells
  dataConnections: State.SQLite.table({
    name: 'dataConnections',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text(),
      type: State.SQLite.text({ schema: Schema.String }),
      connectionString: State.SQLite.text(), // encrypted connection details
      isDefault: State.SQLite.boolean({ default: false }),
      createdBy: State.SQLite.text(),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    },
  }),

  // UI state for each user
  uiState: State.SQLite.clientDocument({
    name: 'uiState',
    schema: Schema.Struct({
      selectedCellId: Schema.optional(Schema.String),
      editingCellId: Schema.optional(Schema.String),
      kernelStatus: Schema.optional(Schema.String),
    }),
    default: {
      id: SessionIdSymbol,
      value: {}
    },
  }),
}

// Events describe notebook and cell changes
// All events are scoped to a single notebook (storeId = notebookId)
export const events = {
  // Notebook events (single notebook per store)
  notebookInitialized: Events.synced({
    name: 'v1.NotebookInitialized',
    schema: Schema.Struct({
      id: Schema.String, // Same as storeId
      title: Schema.String,
      ownerId: Schema.String,
      createdAt: Schema.Date,
    }),
  }),

  notebookTitleChanged: Events.synced({
    name: 'v1.NotebookTitleChanged',
    schema: Schema.Struct({
      title: Schema.String,
      lastModified: Schema.Date,
    }),
  }),

  // Cell events
  cellCreated: Events.synced({
    name: 'v1.CellCreated',
    schema: Schema.Struct({
      id: Schema.String,
      cellType: Schema.Literal('code', 'markdown', 'raw', 'sql', 'ai'),
      position: Schema.Number,
      createdBy: Schema.String,
      createdAt: Schema.Date,
      notebookLastModified: Schema.Date,
    }),
  }),

  cellSourceChanged: Events.synced({
    name: 'v1.CellSourceChanged',
    schema: Schema.Struct({
      id: Schema.String,
      source: Schema.String,
      modifiedBy: Schema.String,
      notebookLastModified: Schema.Date,
    }),
  }),

  cellTypeChanged: Events.synced({
    name: 'v1.CellTypeChanged',
    schema: Schema.Struct({
      id: Schema.String,
      cellType: Schema.Literal('code', 'markdown', 'raw', 'sql', 'ai'),
      notebookLastModified: Schema.Date,
    }),
  }),

  cellDeleted: Events.synced({
    name: 'v1.CellDeleted',
    schema: Schema.Struct({
      id: Schema.String,
      deletedAt: Schema.Date,
      deletedBy: Schema.String,
      notebookLastModified: Schema.Date,
    }),
  }),

  cellMoved: Events.synced({
    name: 'v1.CellMoved',
    schema: Schema.Struct({
      id: Schema.String,
      newPosition: Schema.Number,
      notebookLastModified: Schema.Date,
    }),
  }),

  // Kernel lifecycle events
  kernelSessionStarted: Events.synced({
    name: 'v1.KernelSessionStarted',
    schema: Schema.Struct({
      sessionId: Schema.String, // Unique per kernel restart
      kernelId: Schema.String, // Stable kernel identifier
      kernelType: Schema.String,
      startedAt: Schema.Date,
      capabilities: Schema.Struct({
        canExecuteCode: Schema.Boolean,
        canExecuteSql: Schema.Boolean,
        canExecuteAi: Schema.Boolean,
      }),
    }),
  }),

  kernelSessionHeartbeat: Events.synced({
    name: 'v1.KernelSessionHeartbeat',
    schema: Schema.Struct({
      sessionId: Schema.String,
      heartbeatAt: Schema.Date,
      status: Schema.Literal('ready', 'busy'),
    }),
  }),

  kernelSessionTerminated: Events.synced({
    name: 'v1.KernelSessionTerminated',
    schema: Schema.Struct({
      sessionId: Schema.String,
      reason: Schema.Literal('shutdown', 'restart', 'error', 'timeout'),
      terminatedAt: Schema.Date,
    }),
  }),

  // Execution queue events
  executionRequested: Events.synced({
    name: 'v1.ExecutionRequested',
    schema: Schema.Struct({
      queueId: Schema.String,
      cellId: Schema.String,
      executionCount: Schema.Number,
      requestedBy: Schema.String,
      requestedAt: Schema.Date,
      priority: Schema.Number,
    }),
  }),

  executionAssigned: Events.synced({
    name: 'v1.ExecutionAssigned',
    schema: Schema.Struct({
      queueId: Schema.String,
      kernelSessionId: Schema.String,
      assignedAt: Schema.Date,
    }),
  }),

  executionStarted: Events.synced({
    name: 'v1.ExecutionStarted',
    schema: Schema.Struct({
      queueId: Schema.String,
      kernelSessionId: Schema.String,
      startedAt: Schema.Date,
    }),
  }),

  executionCompleted: Events.synced({
    name: 'v1.ExecutionCompleted',
    schema: Schema.Struct({
      queueId: Schema.String,
      status: Schema.Literal('success', 'error', 'cancelled'),
      completedAt: Schema.Date,
      error: Schema.optional(Schema.String),
    }),
  }),

  executionCancelled: Events.synced({
    name: 'v1.ExecutionCancelled',
    schema: Schema.Struct({
      queueId: Schema.String,
      cancelledBy: Schema.String,
      cancelledAt: Schema.Date,
      reason: Schema.String,
    }),
  }),

  // Output events
  cellOutputAdded: Events.synced({
    name: 'v1.CellOutputAdded',
    schema: Schema.Struct({
      id: Schema.String,
      cellId: Schema.String,
      outputType: Schema.Literal('display_data', 'execute_result', 'stream', 'error'),
      data: Schema.Any,
      position: Schema.Number,
      createdAt: Schema.Date,
    }),
  }),

  cellOutputsCleared: Events.synced({
    name: 'v1.CellOutputsCleared',
    schema: Schema.Struct({
      cellId: Schema.String,
      clearedBy: Schema.String,
    }),
  }),

  // SQL events
  sqlConnectionCreated: Events.synced({
    name: 'v1.SqlConnectionCreated',
    schema: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      type: Schema.String,
      connectionString: Schema.String,
      isDefault: Schema.Boolean,
      createdBy: Schema.String,
      createdAt: Schema.Date,
    }),
  }),

  sqlQueryExecuted: Events.synced({
    name: 'v1.SqlQueryExecuted',
    schema: Schema.Struct({
      cellId: Schema.String,
      connectionId: Schema.String,
      query: Schema.String,
      resultData: Schema.Any,
      executedBy: Schema.String,
    }),
  }),

  // AI events
  aiConversationUpdated: Events.synced({
    name: 'v1.AiConversationUpdated',
    schema: Schema.Struct({
      cellId: Schema.String,
      conversation: Schema.Array(Schema.Struct({
        role: Schema.Literal('user', 'assistant', 'system'),
        content: Schema.String,
        timestamp: Schema.Date,
      })),
      updatedBy: Schema.String,
    }),
  }),

  aiSettingsChanged: Events.synced({
    name: 'v1.AiSettingsChanged',
    schema: Schema.Struct({
      cellId: Schema.String,
      provider: Schema.String, // 'openai', 'anthropic', 'local'
      model: Schema.String,
      settings: Schema.Struct({
        temperature: Schema.optional(Schema.Number),
        maxTokens: Schema.optional(Schema.Number),
        systemPrompt: Schema.optional(Schema.String),
      }),
    }),
  }),

  // UI state
  uiStateSet: tables.uiState.set,
}

// Materializers map events to state changes
const materializers = State.SQLite.materializers(events, {
  // Notebook materializers
  'v1.NotebookInitialized': ({ id, title, ownerId, createdAt }) =>
    tables.notebook.insert({
      id,
      title,
      ownerId,
      createdAt,
      lastModified: createdAt
    }),

  'v1.NotebookTitleChanged': ({ title, lastModified }) =>
    tables.notebook.update({ title, lastModified }),

  // Cell materializers
  'v1.CellCreated': ({ id, cellType, position, createdBy, createdAt, notebookLastModified }) => [
    tables.cells.insert({
      id,
      cellType,
      position,
      createdBy,
      createdAt
    }),
    // Update notebook's last modified time
    tables.notebook.update({ lastModified: notebookLastModified }),
  ],

  'v1.CellSourceChanged': ({ id, source, notebookLastModified }) => [
    tables.cells.update({ source }).where({ id }),
    tables.notebook.update({ lastModified: notebookLastModified }),
  ],

  'v1.CellTypeChanged': ({ id, cellType, notebookLastModified }) => [
    tables.cells.update({ cellType }).where({ id }),
    tables.notebook.update({ lastModified: notebookLastModified }),
  ],

  'v1.CellDeleted': ({ id, deletedAt, notebookLastModified }) => [
    tables.cells.update({ deletedAt }).where({ id }),
    tables.notebook.update({ lastModified: notebookLastModified }),
  ],

  'v1.CellMoved': ({ id, newPosition, notebookLastModified }) => [
    tables.cells.update({ position: newPosition }).where({ id }),
    tables.notebook.update({ lastModified: notebookLastModified }),
  ],

  // Kernel lifecycle materializers
  'v1.KernelSessionStarted': ({ sessionId, kernelId, kernelType, startedAt, capabilities }) =>
    tables.kernelSessions.insert({
      sessionId,
      kernelId,
      kernelType,
      status: 'starting',
      startedAt,
      lastHeartbeat: startedAt,
      canExecuteCode: capabilities.canExecuteCode,
      canExecuteSql: capabilities.canExecuteSql,
      canExecuteAi: capabilities.canExecuteAi,
    }),

  'v1.KernelSessionHeartbeat': ({ sessionId, heartbeatAt, status }) =>
    tables.kernelSessions.update({
      lastHeartbeat: heartbeatAt,
      status: status === 'ready' ? 'ready' : 'busy',
    }).where({ sessionId }),

  'v1.KernelSessionTerminated': ({ sessionId, terminatedAt }) =>
    tables.kernelSessions.update({
      status: 'terminated',
      terminatedAt,
      isActive: false,
    }).where({ sessionId }),

  // Execution queue materializers
  'v1.ExecutionRequested': ({ queueId, cellId, executionCount, requestedBy, requestedAt, priority }) => [
    // Add to execution queue
    tables.executionQueue.insert({
      id: queueId,
      cellId,
      executionCount,
      requestedBy,
      requestedAt,
      priority,
    }),
    // Update cell state
    tables.cells.update({
      executionCount,
      executionState: 'queued',
      queuedAt: requestedAt,
    }).where({ id: cellId }),
  ],

  'v1.ExecutionAssigned': ({ queueId, kernelSessionId, assignedAt }) =>
    tables.executionQueue.update({
      status: 'assigned',
      assignedKernelSession: kernelSessionId,
      assignedAt,
    }).where({ id: queueId }),

  'v1.ExecutionStarted': ({ queueId }) =>
    tables.executionQueue.update({ status: 'executing' }).where({ id: queueId }),

  'v1.ExecutionCompleted': ({ queueId, status, completedAt }) =>
    tables.executionQueue.update({
      status: status === 'success' ? 'completed' : 'failed',
      completedAt,
    }).where({ id: queueId }),

  'v1.ExecutionCancelled': ({ queueId, cancelledAt }) =>
    tables.executionQueue.update({
      status: 'cancelled',
      completedAt: cancelledAt,
    }).where({ id: queueId }),

  // Output materializers
  'v1.CellOutputAdded': ({ id, cellId, outputType, data, position, createdAt }) =>
    tables.outputs.insert({
      id,
      cellId,
      outputType,
      data,
      position,
      createdAt
    }),

  'v1.CellOutputsCleared': ({ cellId }) =>
    tables.outputs.delete().where({ cellId }),

  // SQL materializers
  'v1.SqlConnectionCreated': ({ id, name, type, connectionString, isDefault, createdBy, createdAt }) =>
    tables.dataConnections.insert({
      id,
      name,
      type,
      connectionString,
      isDefault,
      createdBy,
      createdAt,
    }),

  'v1.SqlQueryExecuted': ({ cellId, connectionId, query, resultData }) =>
    tables.cells.update({
      source: query,
      sqlConnectionId: connectionId,
      sqlResultData: resultData,
      executionState: 'completed',
    }).where({ id: cellId }),

  // AI materializers
  'v1.AiConversationUpdated': ({ cellId, conversation }) =>
    tables.cells.update({
      aiConversation: conversation,
    }).where({ id: cellId }),

  'v1.AiSettingsChanged': ({ cellId, provider, model, settings }) =>
    tables.cells.update({
      aiProvider: provider,
      aiModel: model,
      aiSettings: settings,
    }).where({ id: cellId }),
})

const state = State.SQLite.makeState({ tables, materializers })

export const schema = makeSchema({ events, state })
