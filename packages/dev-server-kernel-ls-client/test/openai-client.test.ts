import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIClient } from '../src/openai-client.js';

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
          'anode/ai_model': 'gpt-4',
          'anode/ai_usage': {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        }
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant in a Jupyter-like notebook environment. Provide clear, concise responses and include code examples when appropriate.'
          },
          {
            role: 'user',
            content: 'Test prompt'
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        stream: false
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
        stream: false
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
          'anode/ai_model': 'gpt-4',
          'anode/ai_streaming': true
        }
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant in a Jupyter-like notebook environment. Provide clear, concise responses and include code examples when appropriate.'
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
});
