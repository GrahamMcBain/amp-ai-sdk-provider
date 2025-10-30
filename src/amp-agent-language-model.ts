import {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3CallWarning,
  LanguageModelV3Content,
  LanguageModelV3Prompt,
  LanguageModelV3StreamPart,
  LanguageModelV3FinishReason,
} from '@ai-sdk/provider';
import { AmpOptions, execute } from '@sourcegraph/amp-sdk';

export interface AmpAgentSettings {
  /**
   * Override the model name
   */
  model?: string;

  /**
   * Temperature for response generation (0-2)
   */
  temperature?: number;

  /**
   * Maximum number of tokens to generate
   */
  maxTokens?: number;

  /**
   * Working directory for code execution context
   */
  cwd?: string;

  /**
   * Path to directory containing custom tools
   */
  toolbox?: string;

  /**
   * Allow the agent to use all available tools
   */
  dangerouslyAllowAll?: boolean;

  /**
   * Custom system prompt for coding tasks
   */
  systemPrompt?: string;
}

export interface AmpAgentConfig {
  provider: string;
  apiKey?: string;
  generateId: () => string;
}

const DEFAULT_CODING_PROMPTS = {
  'amp-code': `You are an expert coding assistant. You help with code analysis, generation, debugging, and refactoring. Always provide clear, working code examples and explain your reasoning.`,
  'amp-reasoning': `You are a reasoning assistant focused on problem-solving and analysis. Break down complex problems step by step and provide detailed explanations.`,
  'amp-chat': `You are a helpful AI assistant.`,
};

export class AmpAgentLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = 'V3' as const;
  readonly provider: string;
  readonly modelId: string;
  readonly supportedUrls: Record<string, RegExp[]> = {
    // Amp supports GitHub and GitLab file URLs natively
    'text/*': [
      /^https:\/\/github\.com\/.+/,
      /^https:\/\/gitlab\.com\/.+/,
      /^https:\/\/raw\.githubusercontent\.com\/.+/,
    ],
  };

  private readonly config: AmpAgentConfig;
  private readonly settings: AmpAgentSettings;

  constructor(
    modelId: string,
    settings: AmpAgentSettings,
    config: AmpAgentConfig,
  ) {
    this.provider = config.provider;
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }

  private buildAmpOptions(): AmpOptions {
    const options: AmpOptions = {};

    if (this.settings.cwd) {
      options.cwd = this.settings.cwd;
    }

    if (this.settings.toolbox) {
      options.toolbox = this.settings.toolbox;
    }

    if (this.settings.dangerouslyAllowAll) {
      options.dangerouslyAllowAll = this.settings.dangerouslyAllowAll;
    }

    return options;
  }

  private buildPrompt(aiSdkPrompt: LanguageModelV3Prompt): string {
    // Build the complete prompt from AI SDK messages
    const systemPrompt = this.settings.systemPrompt || 
      DEFAULT_CODING_PROMPTS[this.modelId as keyof typeof DEFAULT_CODING_PROMPTS] ||
      DEFAULT_CODING_PROMPTS['amp-chat'];

    const messages = aiSdkPrompt.map((message) => {
      switch (message.role) {
        case 'system':
          return `System: ${message.content}`;
        
        case 'user':
          const userContent = message.content
            .map((part) => {
              switch (part.type) {
                case 'text':
                  return part.text;
                case 'file':
                  return `[File: ${part.filename || 'unknown'}]`;
                default:
                  return '';
              }
            })
            .join('\n');
          return `User: ${userContent}`;

        case 'assistant':
          const assistantContent = message.content
            .filter((part) => part.type === 'text')
            .map((part) => (part as any).text)
            .join('\n');
          return `Assistant: ${assistantContent}`;

        case 'tool':
          return `Tool result: ${JSON.stringify(message.content[0]?.result || '')}`;

        default:
          return '';
      }
    }).filter(Boolean);

    return `${systemPrompt}\n\n${messages.join('\n\n')}`;
  }

  async doGenerate(options: LanguageModelV3CallOptions) {
    const prompt = this.buildPrompt(options.prompt);
    const warnings: LanguageModelV3CallWarning[] = [];
    
    try {
      const ampOptions = this.buildAmpOptions();
      const execution = execute(prompt, ampOptions);
      const messages: any[] = [];

      for await (const message of execution) {
        messages.push(message);
      }

      // Get the final result message
      const resultMessage = messages.find(m => m.type === 'result');
      const finalText = resultMessage?.result || 
        messages.filter(m => m.type === 'text').map(m => m.content).join('') ||
        'No response from agent';

      const content: LanguageModelV3Content[] = [
        {
          type: 'text',
          text: finalText,
        }
      ];

      return {
        content,
        finishReason: 'stop' as LanguageModelV3FinishReason,
        usage: {
          inputTokens: prompt.length, // Rough estimation
          outputTokens: finalText.length, // Rough estimation
          totalTokens: prompt.length + finalText.length,
        },
        request: { body: { prompt, options: ampOptions } },
        response: { body: { result: messages } },
        warnings,
      };
    } catch (error) {
      throw new Error(`Amp Agent Execution Failed: ${error}`);
    }
  }

  async doStream(options: LanguageModelV3CallOptions) {
    const prompt = this.buildPrompt(options.prompt);
    const warnings: LanguageModelV3CallWarning[] = [];
    
    try {
      const ampOptions = this.buildAmpOptions();
      const execution = execute(prompt, ampOptions);
      
      let isFirstChunk = true;
      
      const stream = new ReadableStream<LanguageModelV3StreamPart>({
        async start(controller) {
          try {
            if (isFirstChunk) {
              controller.enqueue({ type: 'stream-start', warnings });
              isFirstChunk = false;
            }

            for await (const message of execution) {
              switch (message.type) {
                case 'text':
                  controller.enqueue({
                    type: 'text',
                    text: message.content,
                  });
                  break;
                  
                case 'result':
                  controller.enqueue({
                    type: 'text',
                    text: message.result,
                  });
                  break;
                  
                default:
                  // Handle other message types as needed
                  break;
              }
            }

            controller.enqueue({
              type: 'finish',
              finishReason: 'stop',
              usage: {
                inputTokens: prompt.length,
                outputTokens: 0, // This would need to be tracked during streaming
                totalTokens: prompt.length,
              },
            });
            
            controller.close();
          } catch (error) {
            controller.enqueue({
              type: 'error',
              error: new Error(`Failed to stream from Amp agent: ${error}`),
            });
            controller.close();
          }
        },
      });

      return { stream, warnings };
    } catch (error) {
      throw new Error(`Amp Agent Stream Failed: ${error}`);
    }
  }
}
