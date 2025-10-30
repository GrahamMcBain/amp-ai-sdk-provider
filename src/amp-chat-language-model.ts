import {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3CallWarning,
  LanguageModelV3Content,
  LanguageModelV3Prompt,
  LanguageModelV3StreamPart,
  LanguageModelV3FinishReason,
} from '@ai-sdk/provider';
import {
  postJsonToApi,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  APICallError,
  TooManyRequestsError,
  InvalidResponseDataError,
} from '@ai-sdk/provider-utils';

export interface AmpChatSettings {
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
   * Custom parameters specific to Amp models
   */
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

interface AmpMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

interface AmpTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

interface AmpResponse {
  choices: Array<{
    message: AmpMessage;
    finish_reason: string;
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export class AmpChatLanguageModel implements LanguageModelV3 {
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

  private getArgs(options: LanguageModelV3CallOptions) {
    const warnings: LanguageModelV3CallWarning[] = [];

    // Convert AI SDK prompt to Amp message format
    const messages = this.convertToAmpMessages(options.prompt, warnings);

    // Convert tools to Amp format
    const tools = options.tools
      ? this.convertToAmpTools(options.tools, options.toolChoice, warnings)
      : undefined;

    const body = {
      model: this.settings.model || this.modelId,
      messages,
      temperature: options.temperature ?? this.settings.temperature,
      max_tokens: options.maxOutputTokens ?? this.settings.maxTokens,
      stop: options.stopSequences,
      tools,
      tool_choice: this.convertToolChoice(options.toolChoice),
      // Amp-specific options
      ...this.settings.ampOptions,
    };

    return { args: body, warnings };
  }

  async doGenerate(options: LanguageModelV3CallOptions) {
    const { args, warnings } = this.getArgs(options);

    try {
      const response = await postJsonToApi({
        url: `${this.config.baseURL}/v1/chat/completions`,
        headers: this.config.headers(),
        body: args,
        abortSignal: options.abortSignal,
        successfulResponseHandler: createJsonResponseHandler(),
      });

      const data = response.value as AmpResponse;
      const choice = data.choices[0];

      if (!choice) {
        throw new InvalidResponseDataError({
          data,
          message: 'No choices in response',
        });
      }

      const content = this.convertFromAmpContent(choice.message);

      return {
        content,
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        request: { body: args },
        response: { body: data },
        warnings,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async doStream(options: LanguageModelV3CallOptions) {
    const { args, warnings } = this.getArgs(options);

    try {
      const response = await postJsonToApi({
        url: `${this.config.baseURL}/v1/chat/completions`,
        headers: this.config.headers(),
        body: { ...args, stream: true },
        abortSignal: options.abortSignal,
        successfulResponseHandler: createEventSourceResponseHandler(),
      });

      let isFirstChunk = true;
      const stream = response.value
        .pipeThrough(
          new TransformStream<string, LanguageModelV3StreamPart>({
            transform: (chunk, controller) => {
              if (isFirstChunk) {
                controller.enqueue({ type: 'stream-start', warnings });
                isFirstChunk = false;
              }

              if (chunk === '[DONE]') {
                return;
              }

              try {
                const data = JSON.parse(chunk);
                const delta = data.choices?.[0]?.delta;

                if (!delta) return;

                // Handle text content
                if (delta.content) {
                  controller.enqueue({
                    type: 'text',
                    text: delta.content,
                  });
                }

                // Handle tool calls
                if (delta.tool_calls) {
                  for (const toolCall of delta.tool_calls) {
                    if (toolCall.function?.name && toolCall.function?.arguments) {
                      controller.enqueue({
                        type: 'tool-call',
                        toolCallType: 'function',
                        toolCallId: toolCall.id,
                        toolName: toolCall.function.name,
                        args: toolCall.function.arguments,
                      });
                    }
                  }
                }

                // Handle finish reason
                if (data.choices?.[0]?.finish_reason) {
                  controller.enqueue({
                    type: 'finish',
                    finishReason: this.mapFinishReason(data.choices[0].finish_reason),
                    usage: data.usage ? {
                      inputTokens: data.usage.prompt_tokens,
                      outputTokens: data.usage.completion_tokens,
                      totalTokens: data.usage.total_tokens,
                    } : undefined,
                  });
                }
              } catch (error) {
                controller.enqueue({
                  type: 'error',
                  error: new InvalidResponseDataError({
                    data: chunk,
                    message: 'Failed to parse stream chunk',
                  }),
                });
              }
            },
          }),
        );

      return { stream, warnings };
    } catch (error) {
      this.handleError(error);
    }
  }

  private convertToAmpMessages(
    prompt: LanguageModelV3Prompt,
    warnings: LanguageModelV3CallWarning[],
  ): AmpMessage[] {
    return prompt.map((message) => {
      switch (message.role) {
        case 'system':
          return { role: 'system', content: message.content };

        case 'user':
          return {
            role: 'user',
            content: message.content
              .map((part) => {
                switch (part.type) {
                  case 'text':
                    return part.text;
                  case 'file':
                    warnings.push({
                      type: 'unsupported-feature',
                      feature: 'file attachments',
                    });
                    return `[File: ${part.filename || 'unknown'}]`;
                  default:
                    return '';
                }
              })
              .join('\n'),
          };

        case 'assistant':
          const content = message.content
            .filter((part) => part.type === 'text')
            .map((part) => (part as any).text)
            .join('\n');

          const toolCalls = message.content
            .filter((part) => part.type === 'tool-call')
            .map((part) => ({
              id: (part as any).toolCallId,
              type: 'function' as const,
              function: {
                name: (part as any).toolName,
                arguments: (part as any).args,
              },
            }));

          return {
            role: 'assistant',
            content,
            ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
          };

        case 'tool':
          return {
            role: 'function',
            name: message.content[0]?.toolName || 'unknown',
            content: JSON.stringify(message.content[0]?.result || ''),
          };

        default:
          throw new Error(`Unsupported message role: ${(message as any).role}`);
      }
    });
  }

  private convertToAmpTools(
    tools: any[],
    toolChoice: any,
    warnings: LanguageModelV3CallWarning[],
  ): AmpTool[] {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  private convertToolChoice(toolChoice: any): string | undefined {
    if (!toolChoice) return undefined;
    if (toolChoice === 'auto' || toolChoice === 'none') return toolChoice;
    if (toolChoice === 'required') return 'auto';
    if (typeof toolChoice === 'object' && toolChoice.type === 'tool') {
      return toolChoice.toolName;
    }
    return undefined;
  }

  private convertFromAmpContent(message: AmpMessage): LanguageModelV3Content[] {
    const content: LanguageModelV3Content[] = [];

    if (message.content) {
      content.push({
        type: 'text',
        text: message.content,
      });
    }

    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        content.push({
          type: 'tool-call',
          toolCallType: 'function',
          toolCallId: toolCall.id,
          toolName: toolCall.function.name,
          args: toolCall.function.arguments,
        });
      }
    }

    return content;
  }

  private mapFinishReason(reason: string): LanguageModelV3FinishReason {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'function_call':
      case 'tool_calls':
        return 'tool-calls';
      case 'content_filter':
        return 'content-filter';
      default:
        return 'other';
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof Response) {
      const status = error.status;

      if (status === 429) {
        throw new TooManyRequestsError({
          cause: error,
          retryAfter: error.headers.get('retry-after'),
        });
      }

      throw new APICallError({
        statusCode: status,
        statusText: error.statusText,
        cause: error,
        isRetryable: status >= 500 && status < 600,
      });
    }

    throw error;
  }
}
