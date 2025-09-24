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
    // Extract JWT token for Authorization header
    const jwtToken = config.apiKey;

    // Define defaults inline to avoid accessing 'this' before super
    const defaultConfig = {
      baseURL: "https://anaconda.com/api/assistant/v3/groq",
      defaultHeaders: {
        "X-Client-Version": "0.2.0",
        "X-Client-Source": "anaconda-runt-dev",
        // Use JWT token as Bearer token for Anaconda API
        Authorization: `Bearer ${jwtToken}`,
      },
    };

    // Merge provided config with defaults, but use placeholder API key
    const mergedConfig: OpenAIConfig = {
      ...defaultConfig,
      ...config,
      // Use placeholder API key since parent OpenAI client expects one
      apiKey: "anaconda-jwt-placeholder",
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

  override getConfigMessage(): string {
    const configMessage = `# Anaconda/Runt Configuration Required

Authentication not available. AI features require proper authentication setup.`;
    return configMessage;
  }
}
