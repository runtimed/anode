import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStorePromise, queryDb } from '@livestore/livestore';
import { makeAdapter } from '@livestore/adapter-node';
import { events, schema, tables } from '../../../shared/schema.js';

// Mock the OpenAI client
const mockOpenAIClient = {
  isReady: vi.fn(() => true),
  generateResponse: vi.fn()
};

vi.mock('../src/openai-client.js', () => ({
  openaiClient: mockOpenAIClient
}));

// Mock the PyodideKernel
const mockKernel = {
  initialize: vi.fn(),
  execute: vi.fn()
};

vi.mock('../src/pyodide-kernel.js', () => ({
  PyodideKernel: vi.fn(() => mockKernel)
}));

// Mock crypto
vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-123')
}));

// Import the functions we want to test after mocking
// Note: We can't directly test the kernel-adapter.ts module because it has side effects,
// so we'll test the tool calling logic by creating a minimal test setup

describe('Tool Calling Integration', () => {
  let store: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create in-memory store for testing
    const adapter = makeAdapter({
      storage: { type: 'in-memory' }
    });

    store = await createStorePromise({
      adapter,
      schema,
      storeId: 'test-notebook-123'
    });

    // Reset mock implementations
    mockOpenAIClient.generateResponse.mockReset();
    mockKernel.execute.mockReset();
  });

  describe('Cell Creation via AI Tools', () => {
    it('should create a code cell when AI tool is called', async () => {
      // Create initial AI cell
      const aiCellId = 'ai-cell-123';
      store.commit(events.cellCreated({
        id: aiCellId,
        cellType: 'ai',
        position: 1.0,
        createdBy: 'user-123'
      }));

      store.commit(events.cellSourceChanged({
        id: aiCellId,
        source: 'Create a hello world Python script',
        modifiedBy: 'user-123'
      }));

      // Mock OpenAI response with tool call
      const mockToolCall = {
        id: 'call_123',
        name: 'create_cell',
        arguments: {
          cellType: 'code',
          content: 'print("Hello, World!")',
          position: 'after_current'
        }
      };

      mockOpenAIClient.generateResponse.mockImplementation(async (prompt, options) => {
        // Simulate the tool call
        if (options.onToolCall) {
          await options.onToolCall(mockToolCall);
        }

        return [{
          type: 'display_data',
          data: {
            'text/markdown': '🔧 **Tool executed**: `create_cell`\n\nCreated **code** cell at position **after_current**',
            'text/plain': 'Tool executed: create_cell'
          },
          metadata: {
            'anode/tool_call': true,
            'anode/tool_name': 'create_cell',
            'anode/tool_args': mockToolCall.arguments
          }
        }];
      });

      // Simulate execution request
      const queueId = 'exec-123';
      store.commit(events.executionRequested({
        queueId,
        cellId: aiCellId,
        executionCount: 1,
        requestedBy: 'user-123',
        priority: 1
      }));

      // The actual kernel adapter would process this, but we'll simulate the key parts
      // First, let's verify the AI cell exists
      const cells = store.query(queryDb(tables.cells.select().where({ id: aiCellId })));
      expect(cells).toHaveLength(1);
      expect(cells[0].cellType).toBe('ai');

      // Simulate what the kernel adapter would do when processing the AI cell
      const aiCell = cells[0];

      // Call the mocked OpenAI client with tool handler
      const toolCallHandler = async (toolCall: any) => {
        if (toolCall.name === 'create_cell') {
          const { cellType, content, position } = toolCall.arguments;

          // Calculate new position (simplified - in real implementation this would be more sophisticated)
          const newPosition = aiCell.position + 0.1;

          // Create the new cell
          const newCellId = 'test-uuid-123'; // This would come from randomUUID()
          store.commit(events.cellCreated({
            id: newCellId,
            cellType: cellType,
            position: newPosition,
            createdBy: 'ai-assistant-test-session'
          }));

          // Set the cell source
          if (content) {
            store.commit(events.cellSourceChanged({
              id: newCellId,
              source: content,
              modifiedBy: 'ai-assistant-test-session'
            }));
          }
        }
      };

      await mockOpenAIClient.generateResponse(aiCell.source, {
        model: 'gpt-4o-mini',
        enableTools: true,
        onToolCall: toolCallHandler
      });

      // Verify the new cell was created
      const allCells = store.query(queryDb(tables.cells.select().orderBy('position', 'asc')));
      expect(allCells).toHaveLength(2);

      const newCell = allCells.find((c: any) => c.id === 'test-uuid-123');
      expect(newCell).toBeDefined();
      expect(newCell.cellType).toBe('code');
      expect(newCell.position).toBe(1.1);
      expect(newCell.createdBy).toBe('ai-assistant-test-session');
      expect(newCell.source).toBe('print("Hello, World!")');

      // Verify the tool call was made with correct arguments
      expect(mockOpenAIClient.generateResponse).toHaveBeenCalledWith(
        'Create a hello world Python script',
        expect.objectContaining({
          model: 'gpt-4o-mini',
          enableTools: true,
          onToolCall: expect.any(Function)
        })
      );
    });

    it('should create markdown cell at different positions', async () => {
      // Create initial cells to test position calculation
      store.commit(events.cellCreated({
        id: 'cell-1',
        cellType: 'code',
        position: 1.0,
        createdBy: 'user-123'
      }));

      const aiCellId = 'ai-cell-456';
      store.commit(events.cellCreated({
        id: aiCellId,
        cellType: 'ai',
        position: 2.0,
        createdBy: 'user-123'
      }));

      store.commit(events.cellCreated({
        id: 'cell-3',
        cellType: 'code',
        position: 3.0,
        createdBy: 'user-123'
      }));

      const testCases = [
        { position: 'before_current', expectedPosition: 1.9 },
        { position: 'after_current', expectedPosition: 2.1 },
        { position: 'at_end', expectedPosition: 4.0 }
      ];

      for (const testCase of testCases) {
        const mockToolCall = {
          id: `call_${testCase.position}`,
          name: 'create_cell',
          arguments: {
            cellType: 'markdown',
            content: `# ${testCase.position} cell`,
            position: testCase.position
          }
        };

        const toolCallHandler = async (toolCall: any) => {
          if (toolCall.name === 'create_cell') {
            const { cellType, content, position } = toolCall.arguments;
            const aiCell = store.query(queryDb(tables.cells.select().where({ id: aiCellId })))[0];
            const allCells = store.query(queryDb(tables.cells.select().orderBy('position', 'asc')));

            let newPosition: number;
            switch (position) {
              case 'before_current':
                newPosition = aiCell.position - 0.1;
                break;
              case 'at_end':
                const maxPosition = Math.max(...allCells.map((c: any) => c.position));
                newPosition = maxPosition + 1;
                break;
              case 'after_current':
              default:
                newPosition = aiCell.position + 0.1;
                break;
            }

            const newCellId = `new-cell-${position}`;
            store.commit(events.cellCreated({
              id: newCellId,
              cellType: cellType,
              position: newPosition,
              createdBy: 'ai-assistant-test-session'
            }));

            store.commit(events.cellSourceChanged({
              id: newCellId,
              source: content,
              modifiedBy: 'ai-assistant-test-session'
            }));
          }
        };

        await toolCallHandler(mockToolCall);

        // Verify the cell was created at the correct position
        const newCell = store.query(queryDb(tables.cells.select().where({ id: `new-cell-${testCase.position}` })))[0];
        expect(newCell.position).toBe(testCase.expectedPosition);
        expect(newCell.cellType).toBe('markdown');
        expect(newCell.source).toBe(`# ${testCase.position} cell`);
      }
    });

    it('should handle multiple tool calls in sequence', async () => {
      const aiCellId = 'ai-cell-multi';
      store.commit(events.cellCreated({
        id: aiCellId,
        cellType: 'ai',
        position: 1.0,
        createdBy: 'user-123'
      }));

      const toolCalls = [
        {
          id: 'call_1',
          name: 'create_cell',
          arguments: {
            cellType: 'markdown',
            content: '# Data Analysis',
            position: 'after_current'
          }
        },
        {
          id: 'call_2',
          name: 'create_cell',
          arguments: {
            cellType: 'code',
            content: 'import pandas as pd\nimport numpy as np',
            position: 'after_current'
          }
        },
        {
          id: 'call_3',
          name: 'create_cell',
          arguments: {
            cellType: 'code',
            content: 'df = pd.read_csv("data.csv")\ndf.head()',
            position: 'after_current'
          }
        }
      ];

      const toolCallHandler = async (toolCall: any) => {
        if (toolCall.name === 'create_cell') {
          const { cellType, content } = toolCall.arguments;
          const aiCell = store.query(queryDb(tables.cells.select().where({ id: aiCellId })))[0];
          const newPosition = aiCell.position + 0.1;

          const newCellId = `cell-${toolCall.id}`;
          store.commit(events.cellCreated({
            id: newCellId,
            cellType: cellType,
            position: newPosition,
            createdBy: 'ai-assistant-test-session'
          }));

          store.commit(events.cellSourceChanged({
            id: newCellId,
            source: content,
            modifiedBy: 'ai-assistant-test-session'
          }));
        }
      };

      // Process all tool calls
      for (const toolCall of toolCalls) {
        await toolCallHandler(toolCall);
      }

      // Verify all cells were created
      const allCells = store.query(queryDb(tables.cells.select().orderBy('position', 'asc')));
      expect(allCells).toHaveLength(4); // Original AI cell + 3 new cells

      const newCells = allCells.filter((c: any) => c.id.startsWith('cell-call_'));
      expect(newCells).toHaveLength(3);

      expect(newCells[0].cellType).toBe('markdown');
      expect(newCells[0].source).toContain('# Data Analysis');

      expect(newCells[1].cellType).toBe('code');
      expect(newCells[1].source).toContain('import pandas as pd');

      expect(newCells[2].cellType).toBe('code');
      expect(newCells[2].source).toContain('df.head()');
    });

    it('should handle tool call errors gracefully', async () => {
      const aiCellId = 'ai-cell-error';
      store.commit(events.cellCreated({
        id: aiCellId,
        cellType: 'ai',
        position: 1.0,
        createdBy: 'user-123'
      }));

      const invalidToolCall = {
        id: 'call_error',
        name: 'unknown_tool',
        arguments: {
          invalid: 'arguments'
        }
      };

      const toolCallHandler = async (toolCall: any) => {
        // Simulate the real handler which only handles known tools
        switch (toolCall.name) {
          case 'create_cell':
            // ... create cell logic
            break;
          default:
            console.warn(`⚠️ Unknown tool: ${toolCall.name}`);
            // Don't throw - just log and continue
        }
      };

      // This should not throw an error
      await expect(toolCallHandler(invalidToolCall)).resolves.toBeUndefined();

      // Verify no new cells were created
      const allCells = store.query(queryDb(tables.cells.select()));
      expect(allCells).toHaveLength(1); // Only the original AI cell
    });
  });

  describe('Position Calculation', () => {
    it('should handle position calculation edge cases', async () => {
      // Test with cells that have non-integer positions
      store.commit(events.cellCreated({
        id: 'cell-1',
        cellType: 'code',
        position: 1.0,
        createdBy: 'user-123'
      }));

      store.commit(events.cellCreated({
        id: 'cell-1.5',
        cellType: 'markdown',
        position: 1.5,
        createdBy: 'user-123'
      }));

      const aiCellId = 'ai-cell-position';
      store.commit(events.cellCreated({
        id: aiCellId,
        cellType: 'ai',
        position: 1.7,
        createdBy: 'user-123'
      }));

      const toolCallHandler = async (position: string) => {
        const aiCell = store.query(queryDb(tables.cells.select().where({ id: aiCellId })))[0];
        const allCells = store.query(queryDb(tables.cells.select().orderBy('position', 'asc')));

        let newPosition: number;
        switch (position) {
          case 'before_current':
            newPosition = aiCell.position - 0.1;
            break;
          case 'at_end':
            const maxPosition = Math.max(...allCells.map((c: any) => c.position));
            newPosition = maxPosition + 1;
            break;
          case 'after_current':
          default:
            newPosition = aiCell.position + 0.1;
            break;
        }

        return newPosition;
      };

      expect(await toolCallHandler('before_current')).toBeCloseTo(1.6, 10);
      expect(await toolCallHandler('after_current')).toBeCloseTo(1.8, 10);
      expect(await toolCallHandler('at_end')).toBeCloseTo(2.7, 10); // 1.7 + 1
    });
  });
});
