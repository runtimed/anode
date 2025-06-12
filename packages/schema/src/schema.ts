import { Events, makeSchema, Schema, SessionIdSymbol, State } from '@livestore/livestore'

// Core tables for collaborative notebooks
export const tables: Record<string, any> = {
  notebooks: State.SQLite.table({
    name: 'notebooks',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
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
      notebookId: State.SQLite.text(),
      cellType: State.SQLite.text(), // 'code', 'markdown', 'raw', 'sql', 'ai'
      source: State.SQLite.text({ default: '' }),
      position: State.SQLite.real(),
      executionCount: State.SQLite.integer({ nullable: true }),
      executionState: State.SQLite.text({ default: 'idle' }), // 'idle', 'pending', 'running', 'completed', 'error'

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
      outputType: State.SQLite.text(), // 'display_data', 'execute_result', 'stream', 'error'
      data: State.SQLite.json({ schema: Schema.Any }),
      position: State.SQLite.real(),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    },
  }),

  // Data connections for SQL cells
  dataConnections: State.SQLite.table({
    name: 'dataConnections',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      notebookId: State.SQLite.text(),
      name: State.SQLite.text(),
      type: State.SQLite.text(), // 'postgres', 'mysql', 'sqlite', 'clickhouse', 'bigquery', etc.
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
      currentNotebookId: Schema.optional(Schema.String),
      editingCellId: Schema.optional(Schema.String),
    }),
    default: {
      id: SessionIdSymbol,
      value: {}
    },
  }),
}

// Events describe notebook and cell changes
export const events = {
  // Notebook events
  notebookCreated: Events.synced({
    name: 'v1.NotebookCreated',
    schema: Schema.Struct({
      id: Schema.String,
      title: Schema.String,
      ownerId: Schema.String,
      createdAt: Schema.Date,
    }),
  }),

  notebookTitleChanged: Events.synced({
    name: 'v1.NotebookTitleChanged',
    schema: Schema.Struct({
      id: Schema.String,
      title: Schema.String,
      lastModified: Schema.Date,
    }),
  }),

  // Cell events
  cellCreated: Events.synced({
    name: 'v1.CellCreated',
    schema: Schema.Struct({
      id: Schema.String,
      notebookId: Schema.String,
      cellType: Schema.Literal('code', 'markdown', 'raw', 'sql', 'ai'),
      position: Schema.Number,
      createdBy: Schema.String,
      createdAt: Schema.Date,
    }),
  }),

  cellSourceChanged: Events.synced({
    name: 'v1.CellSourceChanged',
    schema: Schema.Struct({
      id: Schema.String,
      source: Schema.String,
      modifiedBy: Schema.String,
    }),
  }),

  cellTypeChanged: Events.synced({
    name: 'v1.CellTypeChanged',
    schema: Schema.Struct({
      id: Schema.String,
      cellType: Schema.Literal('code', 'markdown', 'raw', 'sql', 'ai'),
    }),
  }),

  cellDeleted: Events.synced({
    name: 'v1.CellDeleted',
    schema: Schema.Struct({
      id: Schema.String,
      deletedAt: Schema.Date,
      deletedBy: Schema.String,
    }),
  }),

  cellMoved: Events.synced({
    name: 'v1.CellMoved',
    schema: Schema.Struct({
      id: Schema.String,
      newPosition: Schema.Number,
    }),
  }),

  // Execution events (for kernel integration)
  cellExecutionRequested: Events.synced({
    name: 'v1.CellExecutionRequested',
    schema: Schema.Struct({
      cellId: Schema.String,
      notebookId: Schema.String,
      requestedBy: Schema.String,
      executionCount: Schema.Number,
    }),
  }),

  cellExecutionStarted: Events.synced({
    name: 'v1.CellExecutionStarted',
    schema: Schema.Struct({
      cellId: Schema.String,
      executionCount: Schema.Number,
      startedAt: Schema.Date,
    }),
  }),

  cellExecutionCompleted: Events.synced({
    name: 'v1.CellExecutionCompleted',
    schema: Schema.Struct({
      cellId: Schema.String,
      executionCount: Schema.Number,
      completedAt: Schema.Date,
      status: Schema.Literal('success', 'error'),
    }),
  }),

  // SQL events
  sqlConnectionCreated: Events.synced({
    name: 'v1.SqlConnectionCreated',
    schema: Schema.Struct({
      id: Schema.String,
      notebookId: Schema.String,
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

  // Output events (from kernel responses)
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

  // UI state
  uiStateSet: tables.uiState.set,
}

// Materializers map events to state changes
const materializers = State.SQLite.materializers(events, {
  // Notebook materializers
  'v1.NotebookCreated': ({ id, title, ownerId, createdAt }) =>
    tables.notebooks.insert({
      id,
      title,
      ownerId,
      createdAt,
      lastModified: createdAt
    }),

  'v1.NotebookTitleChanged': ({ id, title, lastModified }) => [
    tables.notebooks.update({ title, lastModified }).where({ id }),
  ],

  // Cell materializers
  'v1.CellCreated': ({ id, notebookId, cellType, position, createdBy, createdAt }) => [
    tables.cells.insert({
      id,
      notebookId,
      cellType,
      position,
      createdBy,
      createdAt
    }),
    // Update notebook's last modified time
    tables.notebooks.update({ lastModified: createdAt }).where({ id: notebookId }),
  ],

  'v1.CellSourceChanged': ({ id, source, modifiedBy }) =>
    tables.cells.update({ source }).where({ id }),

  'v1.CellTypeChanged': ({ id, cellType }) =>
    tables.cells.update({ cellType }).where({ id }),

  'v1.CellDeleted': ({ id, deletedAt, deletedBy }) =>
    tables.cells.update({ deletedAt }).where({ id }),

  'v1.CellMoved': ({ id, newPosition }) =>
    tables.cells.update({ position: newPosition }).where({ id }),

  // Execution materializers
  'v1.CellExecutionRequested': ({ cellId, executionCount }) =>
    tables.cells.update({
      executionState: 'pending',
      executionCount
    }).where({ id: cellId }),

  'v1.CellExecutionStarted': ({ cellId }) =>
    tables.cells.update({ executionState: 'running' }).where({ id: cellId }),

  'v1.CellExecutionCompleted': ({ cellId, status }) =>
    tables.cells.update({
      executionState: status === 'success' ? 'completed' : 'error'
    }).where({ id: cellId }),

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
  'v1.SqlConnectionCreated': ({ id, notebookId, name, type, connectionString, isDefault, createdBy, createdAt }) =>
    tables.dataConnections.insert({
      id,
      notebookId,
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
