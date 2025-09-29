import { RuntOpenAIClient } from "./openai-client.ts";
import type { OpenAIConfig } from "./openai-client.ts";
import type { AiModel } from "@runtimed/agent-core";
import { logger } from "@runtimed/agent-core";

export class GroqClient extends RuntOpenAIClient {
  override provider: string = "groq";
  override defaultConfig: OpenAIConfig = {
    baseURL: "https://api.groq.com/openai/v1",
  };

  override getConfigMessage(): string {
    const configMessage = `# Groq Configuration Required

Groq API key not found. Please set \`GROQ_API_KEY\` environment variable.`;
    return configMessage;
  }

  override discoverAiModels(): Promise<AiModel[]> {
    if (!this.isReady()) {
      logger.warn(
        `${this.provider} client not ready, returning empty models list`
      );
      return Promise.resolve([]);
    }
    const groqModels: AiModel[] = [
      {
        provider: "groq",
        name: "moonshotai/kimi-k2-instruct-0905",
        displayName: "Kimi K2 Instruct 0905",
        capabilities: ["completion", "tools", "thinking"],
      },
      {
        provider: "groq",
        name: "moonshotai/kimi-k2-instruct",
        displayName: "Kimi K2 Instruct",
        capabilities: ["completion", "tools", "thinking"],
      },
      {
        provider: "groq",
        name: "llama3-8b-8192",
        displayName: "Llama 3.1 8B",
        capabilities: ["completion", "tools", "thinking"],
      },
      {
        provider: "groq",
        name: "llama3-70b-8192",
        displayName: "Llama 3.1 70B",
        capabilities: ["completion", "tools", "thinking"],
      },
      {
        provider: "groq",
        name: "mixtral-8x7b-32768",
        displayName: "Mixtral 8x7B",
        capabilities: ["completion", "tools"],
      },
      {
        provider: "groq",
        name: "gemma2-9b-it",
        displayName: "Gemma 2 9B",
        capabilities: ["completion", "tools"],
      },
    ];
    return Promise.resolve(groqModels);
  }
}

export class AnacondaAIClient extends GroqClient {
  override provider: string = "anaconda";
  override defaultConfig: OpenAIConfig = {
    baseURL: "https://anaconda.com/api/assistant/v3/groq",
    defaultHeaders: {
      "X-Client-Version": "0.2.0",
      "X-Client-Source": "anaconda-runt-dev",
    },
  };

  constructor(config: OpenAIConfig & { apiKey: string }) {
    // Define defaults inline to avoid accessing 'this' before super
    const defaultConfig = {
      baseURL: "https://anaconda.com/api/assistant/v3/groq",
      defaultHeaders: {
        "X-Client-Version": "0.2.0",
        "X-Client-Source": "anaconda-runt-dev",
      },
    };

    // Merge provided config with defaults
    const mergedConfig: OpenAIConfig = {
      ...defaultConfig,
      ...config,
      defaultHeaders: {
        ...defaultConfig.defaultHeaders,
        ...config.defaultHeaders,
      },
    };
    super(mergedConfig);
  }

  override async discoverAiModels(): Promise<AiModel[]> {
    const models = await super.discoverAiModels();

    for (const model of models) {
      model.provider = "anaconda";
    }

    return models;
  }

  override async isReady(): Promise<boolean> {
    // Don't call configure() again since we're already configured in constructor
    // This prevents losing the API key that was passed during initialization
    // Access the private client property directly to avoid reconfigure
    return (this as any).client !== null;
  }

  override getConfigMessage(): string {
    const configMessage = `# Anaconda AI Configuration Required

Anaconda API key not found. For browser development, please set \`VITE_ANACONDA_API_KEY\` in your .env file.

## Setup Instructions

1. Add to your .env file:
   \`\`\`
   VITE_ANACONDA_API_KEY=your-anaconda-api-key-here
   \`\`\`

2. Restart your development server

3. Or configure manually in console:
   \`\`\`javascript
   window.__RUNT_AI__.configure('anaconda', { apiKey: 'your-key' })
   \`\`\``;
    return configMessage;
  }
}
