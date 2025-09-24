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

export class AnacondaAIClient {
  provider: string = "anaconda";
  private authToken: string;

  constructor(config: { apiKey: string }) {
    this.authToken = config.apiKey;
  }

  async isReady(): Promise<boolean> {
    return !!(this.authToken && this.authToken.length > 0);
  }

  setNotebookTools(_notebookTools: any[]): void {
    // No-op for now
  }

  async discoverAiModels(): Promise<AiModel[]> {
    const models: AiModel[] = [
      {
        provider: "anaconda",
        name: "moonshotai/kimi-k2-instruct-0905",
        displayName: "Kimi K2 Instruct 0905",
        capabilities: ["completion", "tools", "thinking"],
      },
      {
        provider: "anaconda",
        name: "moonshotai/kimi-k2-instruct",
        displayName: "Kimi K2 Instruct",
        capabilities: ["completion", "tools", "thinking"],
      },
      {
        provider: "anaconda",
        name: "llama3-70b-8192",
        displayName: "Llama 3.1 70B",
        capabilities: ["completion", "tools", "thinking"],
      },
      {
        provider: "anaconda",
        name: "mixtral-8x7b-32768",
        displayName: "Mixtral 8x7B",
        capabilities: ["completion", "tools"],
      },
      {
        provider: "anaconda",
        name: "gemma2-9b-it",
        displayName: "Gemma 2 9B",
        capabilities: ["completion", "tools"],
      },
    ];
    return models;
  }

  async generateAgenticResponse(
    messages: any[],
    context: any,
    options: any
  ): Promise<void> {
    try {
      const response = await fetch(
        "https://anaconda.com/api/assistant/v3/groq/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.authToken}`,
            "X-Client-Version": "0.2.0",
            "X-Client-Source": "anaconda-runt-dev",
          },
          body: JSON.stringify({
            model: options.model || "moonshotai/kimi-k2-instruct-0905",
            messages: messages,
            max_tokens: 2048,
            temperature: 0.7,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();

        // Handle token expiration gracefully
        if (response.status === 403 && errorText.includes("auth token")) {
          context.display({
            "text/markdown":
              "## Authentication Expired\n\nYour authentication token has expired. Please refresh the page to continue using AI features.",
            "text/plain":
              "Authentication expired. Please refresh the page to continue using AI features.",
          });
          return;
        }

        throw new Error(`Anaconda API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (content) {
        context.display({
          "text/markdown": content,
          "text/plain": content,
        });
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message?.includes("Authentication Expired")
      ) {
        // Don't log auth expiration as an error
        return;
      }
      logger.error("Anaconda API error", error);
      throw error;
    }
  }

  getConfigMessage(): string {
    return `# Anaconda/Runt Configuration Required

Authentication not available. AI features require proper authentication setup.`;
  }
}
