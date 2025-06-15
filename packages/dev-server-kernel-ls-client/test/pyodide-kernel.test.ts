import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PyodideKernel } from '../src/pyodide-kernel.js'

// Mock Pyodide to avoid loading the actual runtime in tests
const mockPyodide = {
  runPython: vi.fn(),
  runPythonAsync: vi.fn(),
  loadPackage: vi.fn(() => Promise.resolve()),
  globals: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn()
  },
  pyimport: vi.fn(),
  toPy: vi.fn(),
  isPyProxy: vi.fn(() => false),
  version: '0.27.7',
  _api: {
    captureStdout: vi.fn(),
    captureStderr: vi.fn(),
    restoreStdout: vi.fn(),
    restoreStderr: vi.fn()
  }
}

// Mock the loadPyodide function
vi.mock('pyodide', () => ({
  loadPyodide: vi.fn(() => Promise.resolve(mockPyodide))
}))

describe('PyodideKernel', () => {
  let kernel: PyodideKernel
  const notebookId = 'test-notebook-123'

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()

    // Set up default mock behaviors
    mockPyodide.runPython.mockReturnValue(undefined)
    mockPyodide.globals.get.mockReturnValue(undefined)

    // Reset mock call order
    mockPyodide.runPython.mockClear()
    mockPyodide.runPythonAsync.mockClear()

    kernel = new PyodideKernel(notebookId)
  })

  afterEach(async () => {
    if (kernel) {
      await kernel.terminate()
    }
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await kernel.initialize()

      expect(kernel.isInitialized()).toBe(true)
      expect(mockPyodide.loadPackage).toHaveBeenCalledWith(["matplotlib", "numpy", "pandas"])
      expect(mockPyodide.runPython).toHaveBeenCalledWith(expect.stringContaining("🐍 Python runtime ready with matplotlib and rich output support"))
    })

    it('should handle initialization errors', async () => {
      const loadPyodide = await import('pyodide')
      vi.mocked(loadPyodide.loadPyodide).mockRejectedValueOnce(new Error('Failed to load'))

      await expect(kernel.initialize()).rejects.toThrow('Failed to load')
      expect(kernel.isInitialized()).toBe(false)
    })

    it('should not initialize twice', async () => {
      await kernel.initialize()
      await kernel.initialize() // Second call should be ignored

      const loadPyodide = await import('pyodide')
      expect(vi.mocked(loadPyodide.loadPyodide)).toHaveBeenCalledTimes(1)
    })
  })

  describe('Code Execution', () => {
    beforeEach(async () => {
      await kernel.initialize()
    })

    it('should execute simple print statement', async () => {
      const code = 'print("Hello, World!")'

      // Mock runPythonAsync to return undefined (print returns None)
      mockPyodide.runPythonAsync.mockResolvedValue(undefined)
      // Mock the plot outputs clearing and checking
      mockPyodide.runPython.mockReturnValueOnce(undefined) // _plot_outputs = []
      mockPyodide.runPython.mockReturnValueOnce('[]') // json.dumps(_plot_outputs)

      const outputs = await kernel.execute(code)

      expect(outputs).toHaveLength(0) // print() returns None, which produces no output
      expect(mockPyodide.runPythonAsync).toHaveBeenCalledWith(code)
    })

    it('should handle expression results', async () => {
      const code = '2 + 2'

      // Mock runPythonAsync to return a result
      mockPyodide.runPythonAsync.mockResolvedValue(4)
      // Mock the plot outputs clearing, checking, and format_for_display result
      mockPyodide.runPython.mockReturnValueOnce(undefined) // _plot_outputs = []
      mockPyodide.runPython.mockReturnValueOnce('[]') // json.dumps(_plot_outputs)
      mockPyodide.runPython.mockReturnValueOnce('{"text/plain": "4"}') // format_for_display

      const outputs = await kernel.execute(code)

      expect(outputs).toHaveLength(1)
      expect(outputs[0]).toEqual({
        type: 'execute_result',
        data: { 'text/plain': '4' },
        metadata: {},
        position: 0
      })
    })

    it('should handle Python errors', async () => {
      const code = 'undefined_variable'

      // Mock runPythonAsync to throw an error
      const error = new Error("NameError: name 'undefined_variable' is not defined")
      error.name = 'NameError'
      mockPyodide.runPythonAsync.mockRejectedValue(error)

      const outputs = await kernel.execute(code)

      expect(outputs).toHaveLength(1)
      expect(outputs[0]).toEqual({
        type: 'error',
        data: {
          ename: 'NameError',
          evalue: "NameError: name 'undefined_variable' is not defined",
          traceback: [expect.any(String)]
        },
        position: 0
      })
    })

    it('should handle string results', async () => {
      const code = '"Hello, World!"'

      mockPyodide.runPythonAsync.mockResolvedValue('Hello, World!')
      // Mock the plot outputs clearing, checking, and format_for_display result
      mockPyodide.runPython.mockReturnValueOnce(undefined) // _plot_outputs = []
      mockPyodide.runPython.mockReturnValueOnce('[]') // json.dumps(_plot_outputs)
      mockPyodide.runPython.mockReturnValueOnce('{"text/plain": "Hello, World!"}') // format_for_display

      const outputs = await kernel.execute(code)

      expect(outputs).toHaveLength(1)
      expect(outputs[0]).toEqual({
        type: 'execute_result',
        data: { 'text/plain': 'Hello, World!' },
        metadata: {},
        position: 0
      })
    })

    it('should handle None results correctly', async () => {
      const code = 'x = 42'  // Assignment returns None

      mockPyodide.runPythonAsync.mockResolvedValue(undefined)
      // Mock the plot outputs clearing and checking
      mockPyodide.runPython.mockReturnValueOnce(undefined) // _plot_outputs = []
      mockPyodide.runPython.mockReturnValueOnce('[]') // json.dumps(_plot_outputs)

      const outputs = await kernel.execute(code)

      // Should not output anything for None results
      expect(outputs).toHaveLength(0)
    })

    it('should handle empty code', async () => {
      const outputs = await kernel.execute('')
      expect(outputs).toHaveLength(0)
    })

    it('should handle whitespace-only code', async () => {
      const outputs = await kernel.execute('   \n  \t  ')
      expect(outputs).toHaveLength(0)
    })

    it('should preserve variables between executions', async () => {
      // First execution
      mockPyodide.runPythonAsync.mockResolvedValue(undefined)
      mockPyodide.runPython.mockReturnValueOnce(undefined) // _plot_outputs = []
      mockPyodide.runPython.mockReturnValueOnce('[]') // json.dumps(_plot_outputs)
      await kernel.execute('x = 42')

      // Second execution should access the variable
      mockPyodide.runPythonAsync.mockResolvedValue(42)
      mockPyodide.runPython.mockReturnValueOnce(undefined) // _plot_outputs = []
      mockPyodide.runPython.mockReturnValueOnce('[]') // json.dumps(_plot_outputs)
      mockPyodide.runPython.mockReturnValueOnce('{"text/plain": "42"}') // format_for_display
      const outputs = await kernel.execute('x')

      expect(outputs).toHaveLength(1)
      expect(outputs[0]).toEqual({
        type: 'execute_result',
        data: { 'text/plain': '42' },
        metadata: {},
        position: 0
      })
    })

    it('should handle complex data structures', async () => {
      const code = '[1, 2, 3, {"key": "value"}]'

      const complexResult = [1, 2, 3, { key: "value" }]
      mockPyodide.runPythonAsync.mockResolvedValue(complexResult)
      mockPyodide.runPython.mockReturnValueOnce(undefined) // _plot_outputs = []
      mockPyodide.runPython.mockReturnValueOnce('[]') // json.dumps(_plot_outputs)
      mockPyodide.runPython.mockReturnValueOnce(`{"text/plain": "${String(complexResult)}"}`) // format_for_display

      const outputs = await kernel.execute(code)

      expect(outputs).toHaveLength(1)
      expect(outputs[0]).toEqual({
        type: 'execute_result',
        data: { 'text/plain': String(complexResult) },
        metadata: {},
        position: 0
      })
    })

    it('should handle imports', async () => {
      const code = 'import math\nmath.pi'

      mockPyodide.runPythonAsync.mockResolvedValue(3.141592653589793)
      mockPyodide.runPython.mockReturnValueOnce(undefined) // _plot_outputs = []
      mockPyodide.runPython.mockReturnValueOnce('[]') // json.dumps(_plot_outputs)
      mockPyodide.runPython.mockReturnValueOnce('{"text/plain": "3.141592653589793"}') // format_for_display

      const outputs = await kernel.execute(code)

      expect(outputs).toHaveLength(1)
      expect(outputs[0]).toEqual({
        type: 'execute_result',
        data: { 'text/plain': '3.141592653589793' },
        metadata: {},
        position: 0
      })
    })

    it('should handle empty code', async () => {
      const outputs = await kernel.execute('')
      expect(outputs).toHaveLength(0)
      expect(mockPyodide.runPythonAsync).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await kernel.initialize()
    })

    it('should handle syntax errors', async () => {
      const code = 'if True'  // Missing colon

      const error = new Error('SyntaxError: invalid syntax')
      error.name = 'SyntaxError'
      mockPyodide.runPythonAsync.mockRejectedValue(error)

      const outputs = await kernel.execute(code)

      expect(outputs).toHaveLength(1)
      expect(outputs[0].type).toBe('error')
      expect((outputs[0].data as any).ename).toBe('SyntaxError')
    })

    it('should handle runtime errors', async () => {
      const code = '1 / 0'

      const error = new Error('ZeroDivisionError: division by zero')
      error.name = 'ZeroDivisionError'
      mockPyodide.runPythonAsync.mockRejectedValue(error)

      const outputs = await kernel.execute(code)

      expect(outputs).toHaveLength(1)
      expect(outputs[0].type).toBe('error')
      expect((outputs[0].data as any).ename).toBe('ZeroDivisionError')
    })

    it('should handle execution before initialization', async () => {
      const uninitializedKernel = new PyodideKernel('test')

      // The real implementation auto-initializes, so this should work
      mockPyodide.runPythonAsync.mockResolvedValue(undefined)
      mockPyodide.runPython.mockReturnValueOnce(undefined) // _plot_outputs = []
      mockPyodide.runPython.mockReturnValueOnce('[]') // json.dumps(_plot_outputs)
      const outputs = await uninitializedKernel.execute('print("test")')
      expect(outputs).toHaveLength(0) // print returns None
      expect(uninitializedKernel.isInitialized()).toBe(true)
    })

    it('should handle execution after termination', async () => {
      await kernel.initialize()
      await kernel.terminate()

      // The real implementation auto-initializes, so this should work
      mockPyodide.runPythonAsync.mockResolvedValue(undefined)
      mockPyodide.runPython.mockReturnValueOnce(undefined) // _plot_outputs = []
      mockPyodide.runPython.mockReturnValueOnce('[]') // json.dumps(_plot_outputs)
      const outputs = await kernel.execute('print("test")')
      expect(outputs).toHaveLength(0) // print returns None
      expect(kernel.isInitialized()).toBe(true)
    })
  })

  describe('Lifecycle Management', () => {
    it('should terminate successfully', async () => {
      await kernel.initialize()
      expect(kernel.isInitialized()).toBe(true)

      await kernel.terminate()
      expect(kernel.isInitialized()).toBe(false)
    })

    it('should handle multiple termination calls', async () => {
      await kernel.initialize()

      await kernel.terminate()
      await kernel.terminate() // Should not throw

      expect(kernel.isInitialized()).toBe(false)
    })

    it('should handle termination before initialization', async () => {
      await kernel.terminate() // Should not throw
      expect(kernel.isInitialized()).toBe(false)
    })
  })

  describe('State Management', () => {
    beforeEach(async () => {
      await kernel.initialize()
    })

    it('should maintain execution state across calls', async () => {
      // Set up a class and instance
      mockPyodide.runPythonAsync.mockResolvedValue(undefined)
      mockPyodide.runPython.mockReturnValueOnce(undefined) // _plot_outputs = []
      mockPyodide.runPython.mockReturnValueOnce('[]') // json.dumps(_plot_outputs)
      await kernel.execute(`
class Counter:
    def __init__(self):
        self.value = 0

    def increment(self):
        self.value += 1
        return self.value

counter = Counter()
`)

      // First increment
      mockPyodide.runPythonAsync.mockResolvedValue(1)
      mockPyodide.runPython.mockReturnValueOnce(undefined) // _plot_outputs = []
      mockPyodide.runPython.mockReturnValueOnce('[]') // json.dumps(_plot_outputs)
      mockPyodide.runPython.mockReturnValueOnce('{"text/plain": "1"}') // format_for_display
      let outputs = await kernel.execute('counter.increment()')
      expect(outputs[0].data).toEqual({ 'text/plain': '1' })

      // Second increment should continue from previous state
      mockPyodide.runPythonAsync.mockResolvedValue(2)
      mockPyodide.runPython.mockReturnValueOnce(undefined) // _plot_outputs = []
      mockPyodide.runPython.mockReturnValueOnce('[]') // json.dumps(_plot_outputs)
      mockPyodide.runPython.mockReturnValueOnce('{"text/plain": "2"}') // format_for_display
      outputs = await kernel.execute('counter.increment()')
      expect(outputs[0].data).toEqual({ 'text/plain': '2' })
    })

    it('should handle variable redefinition', async () => {
      mockPyodide.runPythonAsync.mockResolvedValue(undefined)
      mockPyodide.runPython.mockReturnValueOnce(undefined) // _plot_outputs = []
      mockPyodide.runPython.mockReturnValueOnce('[]') // json.dumps(_plot_outputs)
      await kernel.execute('x = "first"')

      mockPyodide.runPythonAsync.mockResolvedValue('second')
      mockPyodide.runPython.mockReturnValueOnce(undefined) // _plot_outputs = []
      mockPyodide.runPython.mockReturnValueOnce('[]') // json.dumps(_plot_outputs)
      mockPyodide.runPython.mockReturnValueOnce('{"text/plain": "second"}') // format_for_display
      const outputs = await kernel.execute('x = "second"\nx')

      expect(outputs).toHaveLength(1)
      expect(outputs[0].data).toEqual({ 'text/plain': 'second' })
    })
  })

  describe('Output Formatting', () => {
    beforeEach(async () => {
      await kernel.initialize()
    })

    it('should handle unicode output', async () => {
      const code = '"Hello 🌍"'

      mockPyodide.runPythonAsync.mockResolvedValue('Hello 🌍')
      mockPyodide.runPython.mockReturnValueOnce(undefined) // _plot_outputs = []
      mockPyodide.runPython.mockReturnValueOnce('[]') // json.dumps(_plot_outputs)
      mockPyodide.runPython.mockReturnValueOnce('{"text/plain": "Hello 🌍"}') // format_for_display

      const outputs = await kernel.execute(code)

      expect(outputs[0].data).toEqual({ 'text/plain': 'Hello 🌍' })
    })

    it('should handle long output', async () => {
      const longString = 'A'.repeat(10000)

      mockPyodide.runPythonAsync.mockResolvedValue(longString)
      mockPyodide.runPython.mockReturnValueOnce(undefined) // _plot_outputs = []
      mockPyodide.runPython.mockReturnValueOnce('[]') // json.dumps(_plot_outputs)
      mockPyodide.runPython.mockReturnValueOnce(`{"text/plain": "${longString}"}`) // format_for_display

      const outputs = await kernel.execute(`"${'A'.repeat(10000)}"`)

      expect(outputs[0].data).toEqual({ 'text/plain': longString })
    })

    it('should handle mixed output types in sequence', async () => {
      const code = `2 ** 10`

      mockPyodide.runPythonAsync.mockResolvedValue(1024)
      mockPyodide.runPython.mockReturnValueOnce(undefined) // _plot_outputs = []
      mockPyodide.runPython.mockReturnValueOnce('[]') // json.dumps(_plot_outputs)
      mockPyodide.runPython.mockReturnValueOnce('{"text/plain": "1024"}') // format_for_display

      const outputs = await kernel.execute(code)

      expect(outputs).toHaveLength(1)
      expect(outputs[0]).toEqual({
        type: 'execute_result',
        data: { 'text/plain': '1024' },
        metadata: {},
        position: 0
      })
    })
  })
})
