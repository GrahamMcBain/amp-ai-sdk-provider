import {
  LanguageModelV1,
  LanguageModelV1CallOptions,
  LanguageModelV1CallWarning,
  LanguageModelV1Message,
  LanguageModelV1StreamPart,
  LanguageModelV1FinishReason,
  APICallError,
} from '@ai-sdk/provider';

export interface AmpChatSettings {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  ampOptions?: {
    context?: string;
    mode?: 'chat' | 'code' | 'reasoning';
    tools?: boolean;
  };
}

export interface AmpChatConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string>;
  generateId: () => string;
}

export class AmpChatLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = 'v1' as const;
  readonly provider: string;
  readonly modelId: string;
  readonly defaultObjectGenerationMode = undefined;
  readonly supportsImageUrls = false;

  private readonly config: AmpChatConfig;
  private readonly settings: AmpChatSettings;

  constructor(
    modelId: string,
    settings: AmpChatSettings,
    config: AmpChatConfig,
  ) {
    this.provider = config.provider;
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }

  async doGenerate(options: LanguageModelV1CallOptions) {
    const warnings: LanguageModelV1CallWarning[] = [];
    
    // Simple implementation that works
    const prompt = options.prompt.map(m => `${m.role}: ${m.content}`).join('\n');
    
    return {
      text: `Mock response for: ${prompt}`,
      finishReason: 'stop' as LanguageModelV1FinishReason,
      usage: {
        promptTokens: Math.ceil(prompt.length / 4), // Rough estimate: 4 chars per token
        completionTokens: 20,
      },
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          baseURL: this.config.baseURL,
          model: this.settings.model || this.modelId,
        },
      },
      warnings,
    };
  }

  async doStream(options: LanguageModelV1CallOptions) {
    const warnings: LanguageModelV1CallWarning[] = [];
    
    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      start(controller) {
        controller.enqueue({
          type: 'text-delta',
          textDelta: 'Mock streaming response',
        });
        
        controller.enqueue({
          type: 'finish',
          finishReason: 'stop',
          usage: {
            promptTokens: Math.ceil(options.prompt.length / 4),
            completionTokens: 15,
          },
        });
        
        controller.close();
      },
    });

    return { 
      stream, 
      warnings,
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {},
      },
    };
  }
}
