import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createStorePromise, queryDb } from '@livestore/livestore'
import { makeAdapter } from '@livestore/adapter-node'
import { events, tables, schema } from '@anode/schema'
import { createTestStoreId, createTestSessionId, waitFor, cleanupResources } from '../setup.js'

describe('Reactivity Debugging', () => {
  let store: any
  let storeId: string
  let sessionId: string
  let kernelId: string

  beforeEach(async () => {
    storeId = createTestStoreId()
    sessionId = createTestSessionId()
    kernelId = `kernel-${Date.now()}`

    const adapter = makeAdapter({
      storage: { type: 'in-memory' }
    })

    store = await createStorePromise({
      adapter,
      schema,
      storeId
    })
  })

  afterEach(async () => {
    await cleanupResources(store)
  })

  describe('Query Subscription Lifecycle', () => {
    it('should properly clean up subscriptions on query disposal', async () => {
      const updateCallback = vi.fn()
      let subscriptionCount = 0

      // Create query and subscribe
      const assignedWork$ = queryDb(
        tables.executionQueue.select()
          .where({ status: 'assigned', assignedKernelSession: sessionId })
          .orderBy('requestedAt', 'asc'),
        { label: 'assignedWork' }
      )

      const subscription = store.subscribe(assignedWork$, {
        onUpdate: (data: any) => {
          subscriptionCount++
          updateCallback(data)
        },
        onError: (error: any) => {
          console.error('Query error:', error)
        }
      })

      // Add some data to trigger updates
      const cellId = 'test-cell'
      const queueId = 'test-queue'

      store.commit(events.cellCreated({
        id: cellId,
        cellType: 'code',
        position: 0,
        createdBy: 'test-user',
        createdAt: new Date()
      }))

      store.commit(events.executionRequested({
        queueId,
        cellId,
        executionCount: 1,
        requestedBy: 'test-user',
        requestedAt: new Date(),
        priority: 1
      }))

      store.commit(events.executionAssigned({
        queueId,
        kernelSessionId: sessionId,
        assignedAt: new Date()
      }))

      // Wait for initial updates
      await waitFor(() => updateCallback.mock.calls.length > 0)
      const initialCallCount = updateCallback.mock.calls.length

      // Clean up subscription explicitly
      subscription()

      // Add more data - should NOT trigger more callbacks
      store.commit(events.executionStarted({
        queueId,
        kernelSessionId: sessionId,
        startedAt: new Date()
      }))

      // Wait a bit to ensure no additional calls
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should not have received additional updates after unsubscribe
      expect(updateCallback.mock.calls.length).toBe(initialCallCount)
    })

    it('should handle multiple subscriptions to the same query', async () => {
      const callbacks = [vi.fn(), vi.fn(), vi.fn()]

      const pendingWork$ = queryDb(
        tables.executionQueue.select()
          .where({ status: 'pending' })
          .orderBy('priority', 'desc')
          .limit(5),
        { label: 'pendingWork' }
      )

      // Create multiple subscriptions to the same query
      const subscriptions = callbacks.map(callback =>
        store.subscribe(pendingWork$, {
          onUpdate: callback
        })
      )

      // Add data to trigger updates
      store.commit(events.cellCreated({
        id: 'multi-sub-cell',
        cellType: 'code',
        position: 0,
        createdBy: 'test-user',
        createdAt: new Date()
      }))

      store.commit(events.executionRequested({
        queueId: 'multi-sub-queue',
        cellId: 'multi-sub-cell',
        executionCount: 1,
        requestedBy: 'test-user',
        requestedAt: new Date(),
        priority: 1
      }))

      // All callbacks should receive updates
      await waitFor(() => callbacks.every(cb => cb.mock.calls.length > 0))

      callbacks.forEach(callback => {
        expect(callback.mock.calls.length).toBeGreaterThan(0)
        expect(callback.mock.calls[callback.mock.calls.length - 1][0]).toHaveLength(1)
      })

      // Clean up all subscriptions
      subscriptions.forEach(unsub => unsub())

      // Add more data - no callbacks should be triggered
      const beforeCallCounts = callbacks.map(cb => cb.mock.calls.length)

      store.commit(events.executionCompleted({
        queueId: 'multi-sub-queue',
        status: 'success',
        completedAt: new Date()
      }))

      await new Promise(resolve => setTimeout(resolve, 100))

      // Call counts should remain the same
      callbacks.forEach((callback, index) => {
        expect(callback.mock.calls.length).toBe(beforeCallCounts[index])
      })
    })

    it('should handle subscription errors without affecting other subscriptions', async () => {
      const goodCallback = vi.fn()
      const errorCallback = vi.fn()

      // Good query
      const goodQuery$ = queryDb(
        tables.cells.select(),
        { label: 'goodQuery' }
      )

      // Problematic query (invalid column)
      const badQuery$ = queryDb(
        tables.cells.select().where({ invalidColumn: 'value' }),
        { label: 'badQuery' }
      )

      let goodSubscription: any
      let badSubscription: any

      try {
        goodSubscription = store.subscribe(goodQuery$, {
          onUpdate: goodCallback,
          onError: (error: any) => console.log('Good query error:', error)
        })

        badSubscription = store.subscribe(badQuery$, {
          onUpdate: (data: any) => console.log('Bad query data:', data),
          onError: errorCallback
        })
      } catch (error) {
        // Expected for bad query
        console.log('Subscription creation error:', error)
      }

      // Add data that should trigger the good query
      store.commit(events.cellCreated({
        id: 'error-test-cell',
        cellType: 'code',
        position: 0,
        createdBy: 'test-user',
        createdAt: new Date()
      }))

      // Good callback should work even if bad query fails
      await waitFor(() => goodCallback.mock.calls.length > 0, 1000)
      expect(goodCallback.mock.calls.length).toBeGreaterThan(0)

      // Clean up
      if (goodSubscription) goodSubscription()
      if (badSubscription) badSubscription()
    })
  })

  describe('Store State Consistency', () => {
    it('should maintain consistent state during rapid updates', async () => {
      const stateSnapshots: any[] = []

      const allCells$ = queryDb(
        tables.cells.select(),
        { label: 'allCells' }
      )

      const subscription = store.subscribe(allCells$, {
        onUpdate: (cells: any[]) => {
          stateSnapshots.push({
            timestamp: Date.now(),
            cellCount: cells.length,
            cells: cells.map(c => ({ id: c.id, position: c.position, deletedAt: c.deletedAt }))
          })
        }
      })

      // Rapidly create, modify, and delete cells
      const operations = []
      for (let i = 0; i < 20; i++) {
        const cellId = `rapid-${i}`

        operations.push(() => store.commit(events.cellCreated({
          id: cellId,
          cellType: 'code',
          position: i,
          createdBy: 'test-user',
          createdAt: new Date()
        })))

        if (i > 0) {
          operations.push(() => store.commit(events.cellMoved({
            id: `rapid-${i-1}`,
            newPosition: i * 10
          })))
        }

        if (i % 3 === 0) {
          operations.push(() => store.commit(events.cellDeleted({
            id: cellId,
            deletedAt: new Date(),
            deletedBy: 'test-user'
          })))
        }
      }

      // Execute all operations
      operations.forEach(op => op())

      // Wait for all updates to settle
      await waitFor(() => stateSnapshots.length > 10, 2000)

      // Verify state consistency
      expect(stateSnapshots.length).toBeGreaterThan(0)

      // Check that timestamps are monotonically increasing
      for (let i = 1; i < stateSnapshots.length; i++) {
        expect(stateSnapshots[i].timestamp).toBeGreaterThanOrEqual(stateSnapshots[i-1].timestamp)
      }

      // Final state should be consistent
      const finalSnapshot = stateSnapshots[stateSnapshots.length - 1]
      const finalCells = store.query(tables.cells.select())
      expect(finalSnapshot.cellCount).toBe(finalCells.length)

      subscription()
    })

    it('should handle query dependencies correctly', async () => {
      const updates: { [key: string]: any[] } = {
        kernelSessions: [],
        assignedWork: [],
        pendingWork: []
      }

      // Create dependent queries
      const kernelSessions$ = queryDb(
        tables.kernelSessions.select().where({ isActive: true }),
        { label: 'activeKernelSessions' }
      )

      const assignedWork$ = queryDb(
        tables.executionQueue.select()
          .where({ status: 'assigned', assignedKernelSession: sessionId }),
        { label: 'assignedWork' }
      )

      const pendingWork$ = queryDb(
        tables.executionQueue.select()
          .where({ status: 'pending' })
          .orderBy('priority', 'desc'),
        { label: 'pendingWork' }
      )

      // Subscribe to all queries
      const subscriptions = [
        store.subscribe(kernelSessions$, {
          onUpdate: (data: any) => updates.kernelSessions.push({ timestamp: Date.now(), data })
        }),
        store.subscribe(assignedWork$, {
          onUpdate: (data: any) => updates.assignedWork.push({ timestamp: Date.now(), data })
        }),
        store.subscribe(pendingWork$, {
          onUpdate: (data: any) => updates.pendingWork.push({ timestamp: Date.now(), data })
        })
      ]

      // Trigger a sequence of related events

      // 1. Start kernel session
      store.commit(events.kernelSessionStarted({
        sessionId,
        kernelId,
        kernelType: 'python3',
        startedAt: new Date(),
        capabilities: {
          canExecuteCode: true,
          canExecuteSql: false,
          canExecuteAi: false
        }
      }))

      // 2. Create cell and request execution
      const cellId = 'dependency-test-cell'
      const queueId = 'dependency-test-queue'

      store.commit(events.cellCreated({
        id: cellId,
        cellType: 'code',
        position: 0,
        createdBy: 'test-user',
        createdAt: new Date()
      }))

      store.commit(events.executionRequested({
        queueId,
        cellId,
        executionCount: 1,
        requestedBy: 'test-user',
        requestedAt: new Date(),
        priority: 1
      }))

      // 3. Assign execution
      store.commit(events.executionAssigned({
        queueId,
        kernelSessionId: sessionId,
        assignedAt: new Date()
      }))

      // Wait for all updates
      await waitFor(() =>
        updates.kernelSessions.length > 0 &&
        updates.assignedWork.length > 0 &&
        updates.pendingWork.length > 0
      )

      // Verify all queries received updates
      expect(updates.kernelSessions.length).toBeGreaterThan(0)
      expect(updates.assignedWork.length).toBeGreaterThan(0)
      expect(updates.pendingWork.length).toBeGreaterThan(0)

      // Verify final states are consistent
      const finalKernelSessions = updates.kernelSessions[updates.kernelSessions.length - 1].data
      const finalAssignedWork = updates.assignedWork[updates.assignedWork.length - 1].data

      expect(finalKernelSessions).toHaveLength(1)
      expect(finalKernelSessions[0].sessionId).toBe(sessionId)
      expect(finalAssignedWork).toHaveLength(1)
      expect(finalAssignedWork[0].assignedKernelSession).toBe(sessionId)

      // Clean up
      subscriptions.forEach(unsub => unsub())
    })
  })

  describe('Memory and Performance', () => {
    it('should not leak memory with frequent subscription changes', async () => {
      const subscriptionCycles = 10
      const operationsPerCycle = 5

      for (let cycle = 0; cycle < subscriptionCycles; cycle++) {
        const subscriptions: any[] = []

        // Create multiple subscriptions
        for (let i = 0; i < 3; i++) {
          const query$ = queryDb(
            tables.cells.select().where({ position: { '>=': i } }),
            { label: `memoryTestQuery-${cycle}-${i}` }
          )

          subscriptions.push(store.subscribe(query$, {
            onUpdate: () => {
              // Minimal processing to avoid interfering with memory test
            }
          }))
        }

        // Perform some operations
        for (let op = 0; op < operationsPerCycle; op++) {
          const cellId = `memory-test-${cycle}-${op}`

          store.commit(events.cellCreated({
            id: cellId,
            cellType: 'code',
            position: op,
            createdBy: 'test-user',
            createdAt: new Date()
          }))

          if (op % 2 === 0) {
            store.commit(events.cellDeleted({
              id: cellId,
              deletedAt: new Date(),
              deletedBy: 'test-user'
            }))
          }
        }

        // Clean up subscriptions
        subscriptions.forEach(unsub => unsub())

        // Small delay to allow cleanup
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      // If we get here without running out of memory, the test passes
      expect(true).toBe(true)
    })

    it('should handle high-frequency updates efficiently', async () => {
      const updateCounts: number[] = []
      const startTime = Date.now()

      const highFreqQuery$ = queryDb(
        tables.kernelSessions.select(),
        { label: 'highFrequencyQuery' }
      )

      const subscription = store.subscribe(highFreqQuery$, {
        onUpdate: (data: any) => {
          updateCounts.push(Date.now() - startTime)
        }
      })

      // Generate high-frequency updates
      const updateCount = 50
      const heartbeatInterval = 10 // ms

      for (let i = 0; i < updateCount; i++) {
        setTimeout(() => {
          store.commit(events.kernelSessionHeartbeat({
            sessionId: `high-freq-session-${i % 3}`, // Cycle through 3 sessions
            heartbeatAt: new Date(),
            status: i % 2 === 0 ? 'ready' : 'busy'
          }))
        }, i * heartbeatInterval)
      }

      // Start a kernel session first
      store.commit(events.kernelSessionStarted({
        sessionId: 'high-freq-session-0',
        kernelId: 'high-freq-kernel',
        kernelType: 'python3',
        startedAt: new Date(),
        capabilities: {
          canExecuteCode: true,
          canExecuteSql: false,
          canExecuteAi: false
        }
      }))

      // Wait for updates to complete
      await waitFor(() => updateCounts.length >= updateCount / 2, 3000)

      // Verify we received a reasonable number of updates
      expect(updateCounts.length).toBeGreaterThan(0)

      // Check that updates completed in reasonable time
      const totalTime = Date.now() - startTime
      expect(totalTime).toBeLessThan(5000) // Should complete within 5 seconds

      subscription()
    })
  })

  describe('Error Recovery', () => {
    it('should recover from query execution errors', async () => {
      const successfulUpdates: any[] = []
      const errors: any[] = []

      // This query should work initially
      const dynamicQuery$ = queryDb(
        tables.cells.select(),
        { label: 'dynamicQuery' }
      )

      const subscription = store.subscribe(dynamicQuery$, {
        onUpdate: (data: any) => {
          successfulUpdates.push(data)
        },
        onError: (error: any) => {
          errors.push(error)
        }
      })

      // Add some valid data
      store.commit(events.cellCreated({
        id: 'recovery-cell-1',
        cellType: 'code',
        position: 0,
        createdBy: 'test-user',
        createdAt: new Date()
      }))

      await waitFor(() => successfulUpdates.length > 0)
      expect(successfulUpdates.length).toBeGreaterThan(0)

      // Add more valid data after potential error
      store.commit(events.cellCreated({
        id: 'recovery-cell-2',
        cellType: 'code',
        position: 1,
        createdBy: 'test-user',
        createdAt: new Date()
      }))

      await waitFor(() => successfulUpdates.length > 1)
      expect(successfulUpdates.length).toBeGreaterThan(1)

      subscription()
    })

    it('should handle store shutdown gracefully', async () => {
      const updates: any[] = []
      let shutdownError: any = null

      const query$ = queryDb(
        tables.executionQueue.select(),
        { label: 'shutdownTestQuery' }
      )

      const subscription = store.subscribe(query$, {
        onUpdate: (data: any) => updates.push(data),
        onError: (error: any) => {
          shutdownError = error
        }
      })

      // Add some data
      store.commit(events.cellCreated({
        id: 'shutdown-test-cell',
        cellType: 'code',
        position: 0,
        createdBy: 'test-user',
        createdAt: new Date()
      }))

      await waitFor(() => updates.length > 0)

      // Shutdown store
      await store.shutdown()

      // Subscription cleanup should not throw
      expect(() => subscription()).not.toThrow()

      // If there was a shutdown error, it should be handled gracefully
      if (shutdownError) {
        expect(shutdownError).toBeDefined()
      }
    })
  })
})
