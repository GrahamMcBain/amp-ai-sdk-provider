import {
  LanguageModelV1,
  LanguageModelV1CallOptions,
  LanguageModelV1CallWarning,
  LanguageModelV1Message,
  LanguageModelV1StreamPart,
  LanguageModelV1FinishReason,
} from '@ai-sdk/provider';

export interface AmpAgentSettings {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  cwd?: string;
  toolbox?: string;
  dangerouslyAllowAll?: boolean;
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

export class AmpAgentLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = 'v1' as const;
  readonly provider: string;
  readonly modelId: string;
  readonly defaultObjectGenerationMode = undefined;
  readonly supportsImageUrls = false;

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

  async doGenerate(options: LanguageModelV1CallOptions) {
    const warnings: LanguageModelV1CallWarning[] = [];
    
    const systemPrompt = this.settings.systemPrompt || 
      DEFAULT_CODING_PROMPTS[this.modelId as keyof typeof DEFAULT_CODING_PROMPTS] ||
      DEFAULT_CODING_PROMPTS['amp-chat'];

    const prompt = `${systemPrompt}\n\n${options.prompt.map(m => `${m.role}: ${m.content}`).join('\n')}`;
    
    // This is where we'd integrate with Amp SDK
    // For now, return a mock response indicating it's using agent capabilities
    const response = `[AGENT MODE - CWD: ${this.settings.cwd || 'not set'}, TOOLBOX: ${this.settings.toolbox || 'not set'}]\n\nMock agent response for: ${prompt}`;
    
    return {
      text: response,
      finishReason: 'stop' as LanguageModelV1FinishReason,
      usage: {
        promptTokens: prompt.length,
        completionTokens: response.length,
      },
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          cwd: this.settings.cwd,
          toolbox: this.settings.toolbox,
          dangerouslyAllowAll: this.settings.dangerouslyAllowAll,
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
          textDelta: '[AGENT MODE] Mock streaming agent response...',
        });
        
        setTimeout(() => {
          controller.enqueue({
            type: 'text-delta',
            textDelta: '\n\nAgent capabilities enabled!',
          });
          
          controller.enqueue({
            type: 'finish',
            finishReason: 'stop',
            usage: {
              promptTokens: 20,
              completionTokens: 30,
            },
          });
          
          controller.close();
        }, 100);
      },
    });

    return { 
      stream, 
      warnings,
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          cwd: this.settings.cwd,
          toolbox: this.settings.toolbox,
        },
      },
    };
  }
}
