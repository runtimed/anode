import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Effect, Schema as S } from 'effect'
import { createStorePromise, queryDb } from '@livestore/livestore'
import { makeAdapter } from '@livestore/adapter-node'
import { events, tables, schema } from '../src/schema.js'

describe('Anode Schema', () => {
  describe('Event Schema Validation', () => {
    it('should validate notebookInitialized event', () => {
      const validEvent = {
        id: 'notebook-123',
        title: 'Test Notebook',
        ownerId: 'user-456'
      }

      const result = S.decodeUnknownSync(events.notebookInitialized.schema)(validEvent)
      expect(result).toEqual(validEvent)
    })

    it('should validate cellCreated event', () => {
      const validEvent = {
        id: 'cell-123',
        cellType: 'code' as const,
        position: 0,
        createdBy: 'user-456'
      }

      const result = S.decodeUnknownSync(events.cellCreated.schema)(validEvent)
      expect(result).toEqual(validEvent)
    })

    it('should validate kernelSessionStarted event', () => {
      const validEvent = {
        sessionId: 'session-123',
        kernelId: 'kernel-456',
        kernelType: 'python3',
        capabilities: {
          canExecuteCode: true,
          canExecuteSql: false,
          canExecuteAi: false
        }
      }

      const result = S.decodeUnknownSync(events.kernelSessionStarted.schema)(validEvent)
      expect(result).toEqual(validEvent)
    })

    it('should validate executionRequested event', () => {
      const validEvent = {
        queueId: 'queue-123',
        cellId: 'cell-456',
        executionCount: 1,
        requestedBy: 'user-789',
        priority: 1
      }

      const result = S.decodeUnknownSync(events.executionRequested.schema)(validEvent)
      expect(result).toEqual(validEvent)
    })

    it('should validate cellOutputAdded event', () => {
      const validEvent = {
        id: 'output-123',
        cellId: 'cell-456',
        outputType: 'stream' as const,
        data: { name: 'stdout', text: 'Hello, World!' },
        position: 0
      }

      const result = S.decodeUnknownSync(events.cellOutputAdded.schema)(validEvent)
      expect(result).toEqual(validEvent)
    })

    it('should reject invalid cell types', () => {
      const invalidEvent = {
        id: 'cell-123',
        cellType: 'invalid-type',
        position: 0,
        createdBy: 'user-456'
      }

      expect(() => {
        S.decodeUnknownSync(events.cellCreated.schema)(invalidEvent)
      }).toThrow()
    })

    it('should reject invalid execution status', () => {
      const invalidEvent = {
        queueId: 'queue-123',
        status: 'invalid-status'
      }

      expect(() => {
        S.decodeUnknownSync(events.executionCompleted.schema)(invalidEvent)
      }).toThrow()
    })
  })

  describe('Table Schema Validation', () => {
    it('should have all required tables defined', () => {
      expect(tables.notebook).toBeDefined()
      expect(tables.cells).toBeDefined()
      expect(tables.kernelSessions).toBeDefined()
      expect(tables.executionQueue).toBeDefined()
      expect(tables.outputs).toBeDefined()
      expect(tables.dataConnections).toBeDefined()
      expect(tables.uiState).toBeDefined()
    })

    it('should have tables with query methods', () => {
      // Test that tables have the expected LiveStore table interface
      expect(typeof tables.notebook.select).toBe('function')
      expect(typeof tables.cells.select).toBe('function')
      expect(typeof tables.kernelSessions.select).toBe('function')
      expect(typeof tables.executionQueue.select).toBe('function')
    })

    it('should have tables with insert methods', () => {
      expect(typeof tables.notebook.insert).toBe('function')
      expect(typeof tables.cells.insert).toBe('function')
      expect(typeof tables.kernelSessions.insert).toBe('function')
      expect(typeof tables.executionQueue.insert).toBe('function')
    })

    it('should have tables with update and delete methods', () => {
      expect(typeof tables.notebook.update).toBe('function')
      expect(typeof tables.cells.update).toBe('function')
      expect(typeof tables.kernelSessions.update).toBe('function')
      expect(typeof tables.executionQueue.update).toBe('function')

      expect(typeof tables.notebook.delete).toBe('function')
      expect(typeof tables.cells.delete).toBe('function')
      expect(typeof tables.kernelSessions.delete).toBe('function')
      expect(typeof tables.executionQueue.delete).toBe('function')
    })
  })

  describe('Schema Integration', () => {
    let store: any

    beforeEach(async () => {
      const adapter = makeAdapter({
        storage: { type: 'in-memory' }
      })

      store = await createStorePromise({
        adapter,
        schema,
        storeId: `test-${Date.now()}`
      })
    })

    afterEach(async () => {
      await store.shutdown()
    })

    it('should create and query notebook', async () => {
      const notebookId = 'test-notebook-123'

      // Create notebook
      store.commit(events.notebookInitialized({
        id: notebookId,
        title: 'Test Notebook',
        ownerId: 'user-123'
      }))

      // Query notebook
      const notebooks = store.query(tables.notebook.select())
      expect(notebooks).toHaveLength(1)
      expect(notebooks[0].id).toBe(notebookId)
      expect(notebooks[0].title).toBe('Test Notebook')
      expect(notebooks[0].ownerId).toBe('user-123')
    })

    it('should create and query cells', async () => {
      const cellId = 'test-cell-123'

      // Create cell
      store.commit(events.cellCreated({
        id: cellId,
        cellType: 'code',
        position: 0,
        createdBy: 'user-123',
      }))

      // Update cell source
      store.commit(events.cellSourceChanged({
        id: cellId,
        source: 'print("Hello, World!")',
        modifiedBy: 'user-123'
      }))

      // Query cells
      const cells = store.query(tables.cells.select())
      expect(cells).toHaveLength(1)
      expect(cells[0].id).toBe(cellId)
      expect(cells[0].cellType).toBe('code')
      expect(cells[0].source).toBe('print("Hello, World!")')
      expect(cells[0].position).toBe(0)
    })

    it('should manage kernel sessions', async () => {
      const sessionId = 'test-session-123'
      const kernelId = 'test-kernel-456'

      // Start kernel session
      store.commit(events.kernelSessionStarted({
        sessionId: sessionId,
        kernelId: kernelId,
        kernelType: 'python3',
        capabilities: {
          canExecuteCode: true,
          canExecuteSql: false,
          canExecuteAi: false
        }
      }))

      // Send heartbeat
      store.commit(events.kernelSessionHeartbeat({
        sessionId,
        status: 'ready'
      }))

      // Query kernel sessions
      const sessions = store.query(tables.kernelSessions.select())
      expect(sessions).toHaveLength(1)
      expect(sessions[0].sessionId).toBe(sessionId)
      expect(sessions[0].kernelId).toBe(kernelId)
      expect(sessions[0].status).toBe('ready')
      expect(sessions[0].isActive).toBe(true)
      expect(sessions[0].canExecuteCode).toBe(true)
    })

    it('should handle execution queue flow', async () => {
      const cellId = 'test-cell-123'
      const queueId = 'test-queue-456'
      const sessionId = 'test-session-789'

      // Create cell first
      store.commit(events.cellCreated({
        id: cellId,
        cellType: 'code',
        position: 0,
        createdBy: 'user-123',
      }))

      // Request execution
      store.commit(events.executionRequested({
        queueId: queueId,
        cellId,
        executionCount: 1,
        requestedBy: 'user-123',
        priority: 0
      }))

      // Assign to kernel
      store.commit(events.executionAssigned({
        queueId,
        kernelSessionId: sessionId
      }))

      // Start execution
      store.commit(events.executionStarted({
        queueId,
        kernelSessionId: sessionId
      }))

      // Complete execution
      store.commit(events.executionCompleted({
        queueId,
        status: 'success'
      }))

      // Query execution queue
      const queueEntries = store.query(tables.executionQueue.select())
      expect(queueEntries).toHaveLength(1)
      expect(queueEntries[0].id).toBe(queueId)
      expect(queueEntries[0].cellId).toBe(cellId)
      expect(queueEntries[0].status).toBe('completed')
      expect(queueEntries[0].assignedKernelSession).toBe(sessionId)

      // Query updated cell
      const cells = store.query(tables.cells.select())
      expect(cells).toHaveLength(1)
      expect(cells[0].executionState).toBe('completed') // Updated by executionCompleted
      expect(cells[0].executionCount).toBe(1)
    })

    it('should handle cell outputs', async () => {
      const cellId = 'test-cell-123'
      const outputId = 'test-output-456'

      // Create cell first
      store.commit(events.cellCreated({
        id: cellId,
        cellType: 'code',
        position: 0,
        createdBy: 'user-123',
      }))

      // Add output
      store.commit(events.cellOutputAdded({
        id: outputId,
        cellId,
        outputType: 'stream',
        data: { name: 'stdout', text: 'Hello, World!\n' },
        position: 0
      }))

      // Query outputs
      const outputs = store.query(tables.outputs.select())
      expect(outputs).toHaveLength(1)
      expect(outputs[0].id).toBe(outputId)
      expect(outputs[0].cellId).toBe(cellId)
      expect(outputs[0].outputType).toBe('stream')
      expect(outputs[0].data).toEqual({ name: 'stdout', text: 'Hello, World!\n' })

      // Clear outputs
      store.commit(events.cellOutputsCleared({
        cellId,
        clearedBy: 'kernel-123'
      }))

      // Query outputs after clearing
      const outputsAfterClear = store.query(tables.outputs.select())
      expect(outputsAfterClear).toHaveLength(0)
    })

    it('should handle cell deletion with hard delete', async () => {
      const cellId = 'test-cell-123'

      // Create cell
      store.commit(events.cellCreated({
        id: cellId,
        cellType: 'code',
        position: 0,
        createdBy: 'user-123',
      }))

      // Delete cell
      store.commit(events.cellDeleted({
        id: cellId,
      }))

      // Query all cells (hard delete removes the cell entirely)
      const allCells = store.query(tables.cells.select())
      expect(allCells).toHaveLength(0)

      // Query only non-deleted cells (same as all cells since hard delete is used)
      const activeCells = store.query(
        tables.cells.select()
      )
      expect(activeCells).toHaveLength(0)
    })

    it('should support reactive queries', async () => {
      const cellId = 'test-cell-123'

      // Create reactive query
      const activeCells$ = queryDb(
        tables.cells.select(),
        { label: 'activeCells' }
      )

      let queryResults: any[] = []
      const subscription = store.subscribe(activeCells$, {
        onUpdate: (cells: any[]) => {
          queryResults = cells
        }
      })

      // Initially no cells
      expect(queryResults).toHaveLength(0)

      // Create cell
      store.commit(events.cellCreated({
        id: cellId,
        cellType: 'code',
        position: 0,
        createdBy: 'user-123',
      }))

      // Should have one active cell
      expect(queryResults).toHaveLength(1)
      expect(queryResults[0].id).toBe(cellId)

      // Delete cell
      store.commit(events.cellDeleted({
        id: cellId
      }))

      // Should have no active cells
      expect(queryResults).toHaveLength(0)

      subscription()
    })
  })

  describe('Event Name Versioning', () => {
    it('should have proper v1 prefixes for all events', () => {
      const eventNames = Object.values(events).map(event => event.name)

      // Filter out client document events which don't follow the v1 pattern
      const syncedEvents = eventNames.filter(name => name !== 'uiStateSet')

      syncedEvents.forEach(name => {
        expect(name).toMatch(/^v1\./)
      })
    })

    it('should have consistent naming convention', () => {
      const eventNames = Object.values(events)
        .filter(event => event.name !== 'uiStateSet')
        .map(event => event.name)

      eventNames.forEach(name => {
        // Should be PascalCase after v1.
        const withoutPrefix = name.replace(/^v1\./, '')
        expect(withoutPrefix).toMatch(/^[A-Z][a-zA-Z]*$/)
      })
    })
  })

  describe('Build-time Schema Validation', () => {
    it('should not have redundant fields', () => {
      // These events should be clean without timestamp complications
      const eventsWithCleanSchema = [
        'v1.CellCreated',
        'v1.CellSourceChanged',
        'v1.CellTypeChanged',
        'v1.CellDeleted',
        'v1.CellMoved',
      ]

      for (const eventName of eventsWithCleanSchema) {
        const event = Object.values(events).find(e => e.name === eventName)
        expect(event).toBeDefined()

        // Create event payload with minimal required fields
        const testPayload: Record<string, unknown> = {
          id: 'test-id',
          // Add minimal required fields based on event type
          ...(eventName === 'v1.CellCreated' && {
            cellType: 'code',
            position: 0,
            createdBy: 'test-user',
          }),
          ...(eventName === 'v1.CellSourceChanged' && {
            source: 'test source',
            modifiedBy: 'test-user',
          }),
          ...(eventName === 'v1.CellTypeChanged' && {
            cellType: 'markdown',
          }),
          ...(eventName === 'v1.CellDeleted' && {
          }),
          ...(eventName === 'v1.CellMoved' && {
            newPosition: 1,
          }),
        }

        // Events should validate successfully
        const result = S.decodeUnknownSync(event!.schema)(testPayload)
        expect(result).toBeDefined()
      }
    })

    it('should have required fields for event types', () => {
      // Test that events have expected required fields
      const cellCreatedEvent = Object.values(events).find(e => e.name === 'v1.CellCreated')
      expect(cellCreatedEvent).toBeDefined()

      const validCellCreated = {
        id: 'cell-123',
        cellType: 'code' as const,
        position: 0,
        createdBy: 'user-123'
      }

      expect(() => {
        S.decodeUnknownSync(cellCreatedEvent!.schema)(validCellCreated)
      }).not.toThrow()
    })

    it('should validate event naming conventions', () => {
      const allEventNames = Object.values(events).map(e => e.name)

      // All synced events should use v1 prefix
      const syncedEvents = allEventNames.filter(name => name !== 'uiStateSet')
      syncedEvents.forEach(name => {
        expect(name).toMatch(/^v1\./)
      })

      // Event names should be PascalCase after prefix
      syncedEvents.forEach(name => {
        const withoutPrefix = name.replace(/^v1\./, '')
        expect(withoutPrefix).toMatch(/^[A-Z][a-zA-Z]*$/)
      })
    })

    it('should not have missing required events', () => {
      const requiredEvents = [
        'v1.NotebookInitialized',
        'v1.NotebookTitleChanged',
        'v1.CellCreated',
        'v1.CellSourceChanged',
        'v1.CellTypeChanged',
        'v1.CellDeleted',
        'v1.CellMoved',
        'v1.KernelSessionStarted',
        'v1.ExecutionRequested',
        'v1.ExecutionAssigned',
        'v1.ExecutionStarted',
        'v1.ExecutionCompleted',
      ]

      const existingEventNames = Object.values(events).map(e => e.name)

      for (const requiredEvent of requiredEvents) {
        expect(existingEventNames).toContain(requiredEvent)
      }
    })
  })
})
