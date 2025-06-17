import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIClient } from '../src/openai-client.js';

// System prompts for testing
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful AI assistant in a Jupyter-like notebook environment. You have access to tools that let you create new cells in the notebook.\n\nWhen users ask you to:\n- Create code examples\n- Add new content to the notebook\n- Show implementations\n- Create cells with specific content\n\nYou MUST use the create_cell function to actually create the cells. Do not just describe what the code would look like - create it using the tools available to you.\n\nIMPORTANT: Always prefer using tools over just providing text descriptions when the user wants content added to their notebook.\n\nFor positioning: Use "after_current" by default so new cells appear right after the AI cell. Only use "at_end" if specifically requested.';

const STREAMING_SYSTEM_PROMPT = 'You are a helpful AI assistant in a Jupyter-like notebook environment. You have access to tools that let you create new cells in the notebook.\n\nWhen users ask you to:\n- Create code examples\n- Add new content to the notebook\n- Show implementations\n- Create cells with specific content\n\nYou MUST use the create_cell function to actually create the cells. Do not just describe what the code would look like - create it using the tools available to you.\n\nIMPORTANT: Always prefer using tools over just providing text descriptions when the user wants content added to their notebook.';

const SIMPLE_SYSTEM_PROMPT = 'You are a helpful AI assistant in a Jupyter-like notebook environment. Provide clear, concise responses and include code examples when appropriate.';

// Mock OpenAI module
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    }))
  };
});

describe('OpenAI Client', () => {
  let client: OpenAIClient;
  let mockOpenAI: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset environment
    delete process.env.OPENAI_API_KEY;

    // Get the mocked OpenAI constructor
    const OpenAI = (await import('openai')).default;
    mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    };
    (OpenAI as any).mockImplementation(() => mockOpenAI);

    client = new OpenAIClient();
  });

  describe('Configuration', () => {
    it('should not be ready without API key', () => {
      expect(client.isReady()).toBe(false);
    });

    it('should be ready with API key in config', () => {
      client.configure({ apiKey: 'test-key' });
      expect(client.isReady()).toBe(true);
    });

    it('should be ready with API key in environment', () => {
      process.env.OPENAI_API_KEY = 'env-test-key';
      client.configure();
      expect(client.isReady()).toBe(true);
    });
  });

  describe('Response Generation', () => {
    beforeEach(() => {
      client.configure({ apiKey: 'test-key' });
    });

    it('should generate response successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'This is a test response from OpenAI'
            }
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await client.generateResponse('Test prompt');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'display_data',
        data: {
          'text/markdown': 'This is a test response from OpenAI',
          'text/plain': 'This is a test response from OpenAI'
        },
        metadata: {
          'anode/ai_response': true,
          'anode/ai_provider': 'openai',
          'anode/ai_model': 'gpt-4o-mini',
          'anode/ai_usage': {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        }
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: DEFAULT_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: 'Test prompt'
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        stream: false,
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_cell',
              description: 'Create a new cell in the notebook at a specified position. Use this when you want to add new code, markdown, or other content to help the user.',
              parameters: {
                type: 'object',
                properties: {
                  cellType: {
                    type: 'string',
                    enum: ['code', 'markdown', 'ai', 'sql'],
                    description: 'The type of cell to create'
                  },
                  content: {
                    type: 'string',
                    description: 'The content/source code for the cell'
                  },
                  position: {
                    type: 'string',
                    enum: ['after_current', 'before_current', 'at_end'],
                    description: 'Where to place the new cell. Use "after_current" (default) to place right after the AI cell, "before_current" to place before it, or "at_end" only when specifically requested',
                    default: 'after_current'
                  }
                },
                required: ['cellType', 'content']
              }
            }
          }
        ],
        tool_choice: 'auto'
      });
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('API Error');
      (apiError as any).status = 401;
      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      const result = await client.generateResponse('Test prompt');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'error',
        ename: 'OpenAIError',
        evalue: 'OpenAI API Error: Invalid API key. Please check your OPENAI_API_KEY environment variable.',
        traceback: ['OpenAI API Error: Invalid API key. Please check your OPENAI_API_KEY environment variable.']
      });
    });

    it('should return error when not configured', async () => {
      const unconfiguredClient = new OpenAIClient();

      const result = await unconfiguredClient.generateResponse('Test prompt');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'error',
        ename: 'OpenAIError',
        evalue: 'OpenAI client not configured. Please set OPENAI_API_KEY environment variable.',
        traceback: ['OpenAI client not configured. Please set OPENAI_API_KEY environment variable.']
      });
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null
            }
          }
        ]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await client.generateResponse('Test prompt');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'error',
        ename: 'OpenAIError',
        evalue: 'No response received from OpenAI API',
        traceback: ['No response received from OpenAI API']
      });
    });

    it('should use custom model and options', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Custom model response'
            }
          }
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 10,
          total_tokens: 15
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await client.generateResponse('Test prompt', {
        model: 'gpt-3.5-turbo',
        maxTokens: 1000,
        temperature: 0.5,
        systemPrompt: 'Custom system prompt'
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Custom system prompt'
          },
          {
            role: 'user',
            content: 'Test prompt'
          }
        ],
        max_tokens: 1000,
        temperature: 0.5,
        stream: false,
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_cell',
              description: 'Create a new cell in the notebook at a specified position. Use this when you want to add new code, markdown, or other content to help the user.',
              parameters: {
                type: 'object',
                properties: {
                  cellType: {
                    type: 'string',
                    enum: ['code', 'markdown', 'ai', 'sql'],
                    description: 'The type of cell to create'
                  },
                  content: {
                    type: 'string',
                    description: 'The content/source code for the cell'
                  },
                  position: {
                    type: 'string',
                    enum: ['after_current', 'before_current', 'at_end'],
                    description: 'Where to place the new cell. Use "after_current" (default) to place right after the AI cell, "before_current" to place before it, or "at_end" only when specifically requested',
                    default: 'after_current'
                  }
                },
                required: ['cellType', 'content']
              }
            }
          }
        ],
        tool_choice: 'auto'
      });
    });
  });

  describe('Streaming Response Generation', () => {
    beforeEach(() => {
      client.configure({ apiKey: 'test-key' });
    });

    it('should generate streaming response successfully', async () => {
      const mockStream = [
        {
          choices: [
            {
              delta: {
                content: 'Hello '
              }
            }
          ]
        },
        {
          choices: [
            {
              delta: {
                content: 'world!'
              }
            }
          ]
        }
      ];

      // Mock async iterator
      const asyncIterator = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockStream) {
            yield chunk;
          }
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(asyncIterator);

      const chunks: string[] = [];
      const result = await client.generateStreamingResponse('Test prompt', {
        onChunk: (chunk) => chunks.push(chunk)
      });

      expect(chunks).toEqual(['Hello ', 'world!']);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'display_data',
        data: {
          'text/markdown': 'Hello world!',
          'text/plain': 'Hello world!'
        },
        metadata: {
          'anode/ai_response': true,
          'anode/ai_provider': 'openai',
          'anode/ai_model': 'gpt-4o-mini',
          'anode/ai_streaming': true
        }
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: STREAMING_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: 'Test prompt'
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        stream: true
      });
    });

    it('should handle streaming errors gracefully', async () => {
      const apiError = new Error('Streaming API Error');
      (apiError as any).status = 429;
      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      const result = await client.generateStreamingResponse('Test prompt');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'error',
        ename: 'OpenAIError',
        evalue: 'OpenAI Streaming API Error: Rate limit exceeded. Please try again later.',
        traceback: ['OpenAI Streaming API Error: Rate limit exceeded. Please try again later.']
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      client.configure({ apiKey: 'test-key' });
    });

    it('should handle different HTTP error codes', async () => {
      const testCases = [
        { status: 401, expectedMessage: 'Invalid API key. Please check your OPENAI_API_KEY environment variable.' },
        { status: 429, expectedMessage: 'Rate limit exceeded. Please try again later.' },
        { status: 500, expectedMessage: 'OpenAI server error. Please try again later.' },
        { status: 999, message: 'Custom error message', expectedMessage: 'Custom error message' }
      ];

      for (const testCase of testCases) {
        const apiError = new Error(testCase.message || 'API Error');
        (apiError as any).status = testCase.status;
        mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

        const result = await client.generateResponse('Test prompt');

        expect(result[0].evalue).toBe(`OpenAI API Error: ${testCase.expectedMessage}`);
      }
    });
  });

  describe('Tool Calling', () => {
    beforeEach(() => {
      client.configure({ apiKey: 'test-key' });
    });

    it('should handle tool calls with create_cell', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'I\'ll create a new code cell for you.',
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'create_cell',
                    arguments: JSON.stringify({
                      cellType: 'code',
                      content: 'print("Hello from AI!")',
                      position: 'after_current'
                    })
                  }
                }
              ]
            }
          }
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 25,
          total_tokens: 40
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const toolCalls: any[] = [];
      const onToolCall = vi.fn(async (toolCall) => {
        toolCalls.push(toolCall);
      });

      const result = await client.generateResponse('Create a hello world cell', {
        enableTools: true,
        onToolCall
      });

      expect(onToolCall).toHaveBeenCalledTimes(1);
      expect(onToolCall).toHaveBeenCalledWith({
        id: 'call_123',
        name: 'create_cell',
        arguments: {
          cellType: 'code',
          content: 'print("Hello from AI!")',
          position: 'after_current'
        }
      });

      expect(result).toHaveLength(2);

      // First output: tool confirmation
      expect(result[0].type).toBe('display_data');
      expect(result[0].data['application/vnd.anode.aitool+json']).toBeDefined();
      expect(result[0].data['application/vnd.anode.aitool+json'].tool_name).toBe('create_cell');
      expect(result[0].data['application/vnd.anode.aitool+json'].status).toBe('success');
      expect(result[0].data['text/markdown']).toContain('Tool executed');
      expect(result[0].data['text/markdown']).toContain('create_cell');
      expect(result[0].metadata['anode/tool_call']).toBe(true);

      // Second output: AI response
      expect(result[1].type).toBe('display_data');
      expect(result[1].data['text/markdown']).toBe('I\'ll create a new code cell for you.');
      expect(result[1].metadata['anode/ai_with_tools']).toBe(true);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: DEFAULT_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: 'Create a hello world cell'
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        stream: false,
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_cell',
              description: 'Create a new cell in the notebook at a specified position. Use this when you want to add new code, markdown, or other content to help the user.',
              parameters: {
                type: 'object',
                properties: {
                  cellType: {
                    type: 'string',
                    enum: ['code', 'markdown', 'ai', 'sql'],
                    description: 'The type of cell to create'
                  },
                  content: {
                    type: 'string',
                    description: 'The content/source code for the cell'
                  },
                  position: {
                    type: 'string',
                    enum: ['after_current', 'before_current', 'at_end'],
                    description: 'Where to place the new cell. Use "after_current" (default) to place right after the AI cell, "before_current" to place before it, or "at_end" only when specifically requested',
                    default: 'after_current'
                  }
                },
                required: ['cellType', 'content']
              }
            }
          }
        ],
        tool_choice: 'auto'
      });
    });

    it('should handle tool call errors gracefully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_456',
                  type: 'function',
                  function: {
                    name: 'create_cell',
                    arguments: 'invalid json'
                  }
                }
              ]
            }
          }
        ]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const onToolCall = vi.fn(async () => {
        throw new Error('Tool execution failed');
      });

      const result = await client.generateResponse('Create a cell', {
        enableTools: true,
        onToolCall
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('display_data');
      expect(result[0].data['application/vnd.anode.aitool+json']).toBeDefined();
      expect(result[0].data['application/vnd.anode.aitool+json'].status).toBe('error');
      expect(result[0].data['text/markdown']).toContain('Tool failed');
      expect(result[0].metadata['anode/tool_error']).toBe(true);
    });

    it('should work without tools when disabled', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Regular response without tools'
            }
          }
        ]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await client.generateResponse('Test prompt', {
        enableTools: false
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('display_data');
      expect(result[0].data['text/markdown']).toBe('Regular response without tools');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: DEFAULT_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: 'Test prompt'
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        stream: false,
        tools: undefined,
        tool_choice: undefined
      });
    });

    it('should handle multiple tool calls', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'I\'ll create two cells for you.',
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'create_cell',
                    arguments: JSON.stringify({
                      cellType: 'markdown',
                      content: '# Header',
                      position: 'after_current'
                    })
                  }
                },
                {
                  id: 'call_2',
                  type: 'function',
                  function: {
                    name: 'create_cell',
                    arguments: JSON.stringify({
                      cellType: 'code',
                      content: 'print("test")',
                      position: 'after_current'
                    })
                  }
                }
              ]
            }
          }
        ]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const onToolCall = vi.fn();
      const result = await client.generateResponse('Create cells', {
        enableTools: true,
        onToolCall
      });

      expect(onToolCall).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(3); // 2 tool confirmations + 1 text response
    });
  });
});
