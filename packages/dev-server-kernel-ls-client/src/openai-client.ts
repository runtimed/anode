import OpenAI from 'openai';

interface OpenAIConfig {
  apiKey?: string;
  baseURL?: string;
  organization?: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class OpenAIClient {
  private client: OpenAI | null = null;
  private isConfigured = false;

  constructor(config?: OpenAIConfig) {
    this.configure(config);
  }

  configure(config?: OpenAIConfig) {
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ OpenAI API key not found. Set OPENAI_API_KEY environment variable or pass apiKey in config.');
      this.isConfigured = false;
      return;
    }

    try {
      this.client = new OpenAI({
        apiKey,
        baseURL: config?.baseURL,
        organization: config?.organization,
      });
      this.isConfigured = true;
      console.log('✅ OpenAI client configured successfully');
    } catch (error) {
      console.error('❌ Failed to configure OpenAI client:', error);
      this.isConfigured = false;
    }
  }

  isReady(): boolean {
    return this.isConfigured && this.client !== null;
  }

  async generateResponse(
    prompt: string,
    options: {
      model?: string;
      provider?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<any[]> {
    if (!this.isReady()) {
      return this.createErrorOutput('OpenAI client not configured. Please set OPENAI_API_KEY environment variable.');
    }

    const {
      model = 'gpt-4',
      maxTokens = 2000,
      temperature = 0.7,
      systemPrompt = 'You are a helpful AI assistant in a Jupyter-like notebook environment. Provide clear, concise responses and include code examples when appropriate.'
    } = options;

    try {
      console.log(`🤖 Calling OpenAI API with model: ${model}`);

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ];

      const response = await this.client!.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: false, // For now, we'll use non-streaming
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        return this.createErrorOutput('No response received from OpenAI API');
      }

      console.log(`✅ Received OpenAI response (${content.length} characters)`);

      // Return the response as markdown output
      return [{
        type: 'display_data',
        data: {
          'text/markdown': content,
          'text/plain': content
        },
        metadata: {
          'anode/ai_response': true,
          'anode/ai_provider': 'openai',
          'anode/ai_model': model,
          'anode/ai_usage': {
            prompt_tokens: response.usage?.prompt_tokens || 0,
            completion_tokens: response.usage?.completion_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0
          }
        }
      }];

    } catch (error: any) {
      console.error('❌ OpenAI API error:', error);

      let errorMessage = 'Unknown error occurred';
      if (error.status === 401) {
        errorMessage = 'Invalid API key. Please check your OPENAI_API_KEY environment variable.';
      } else if (error.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (error.status === 500) {
        errorMessage = 'OpenAI server error. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return this.createErrorOutput(`OpenAI API Error: ${errorMessage}`);
    }
  }

  async generateStreamingResponse(
    prompt: string,
    options: {
      model?: string;
      provider?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
      onChunk?: (chunk: string) => void;
    } = {}
  ): Promise<any[]> {
    if (!this.isReady()) {
      return this.createErrorOutput('OpenAI client not configured. Please set OPENAI_API_KEY environment variable.');
    }

    const {
      model = 'gpt-4',
      maxTokens = 2000,
      temperature = 0.7,
      systemPrompt = 'You are a helpful AI assistant in a Jupyter-like notebook environment. Provide clear, concise responses and include code examples when appropriate.',
      onChunk
    } = options;

    try {
      console.log(`🤖 Starting streaming call to OpenAI API with model: ${model}`);

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ];

      const stream = await this.client!.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: true,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullContent += content;
          if (onChunk) {
            onChunk(content);
          }
        }
      }

      console.log(`✅ Completed streaming OpenAI response (${fullContent.length} characters)`);

      // Return the complete response as markdown output
      return [{
        type: 'display_data',
        data: {
          'text/markdown': fullContent,
          'text/plain': fullContent
        },
        metadata: {
          'anode/ai_response': true,
          'anode/ai_provider': 'openai',
          'anode/ai_model': model,
          'anode/ai_streaming': true
        }
      }];

    } catch (error: any) {
      console.error('❌ OpenAI streaming API error:', error);

      let errorMessage = 'Unknown error occurred';
      if (error.status === 401) {
        errorMessage = 'Invalid API key. Please check your OPENAI_API_KEY environment variable.';
      } else if (error.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (error.status === 500) {
        errorMessage = 'OpenAI server error. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return this.createErrorOutput(`OpenAI Streaming API Error: ${errorMessage}`);
    }
  }

  private createErrorOutput(message: string): any[] {
    return [{
      type: 'error',
      ename: 'OpenAIError',
      evalue: message,
      traceback: [message]
    }];
  }
}

// Export singleton instance
export const openaiClient = new OpenAIClient();

// Export class for testing
export { OpenAIClient };
