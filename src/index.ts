import {
  generateId,
  loadApiKey,
  withoutTrailingSlash,
} from '@ai-sdk/provider-utils';
import { ProviderV3 } from '@ai-sdk/provider';
import { AmpChatLanguageModel, AmpChatSettings } from './amp-chat-language-model';

export interface AmpProvider extends ProviderV3 {
  (modelId: string, settings?: AmpChatSettings): AmpChatLanguageModel;
  languageModel(
    modelId: string,
    settings?: AmpChatSettings,
  ): AmpChatLanguageModel;
}

export interface AmpProviderSettings {
  /**
   * Base URL for Amp API calls
   * @default "https://api.ampcode.com"
   */
  baseURL?: string;

  /**
   * API key for authentication
   * Can be set via AMP_API_KEY environment variable
   */
  apiKey?: string;

  /**
   * Custom headers for requests
   */
  headers?: Record<string, string>;

  /**
   * Generate unique IDs for requests
   */
  generateId?: () => string;
}

export function createAmp(options: AmpProviderSettings = {}): AmpProvider {
  const createChatModel = (
    modelId: string,
    settings: AmpChatSettings = {},
  ) =>
    new AmpChatLanguageModel(modelId, settings, {
      provider: 'amp',
      baseURL:
        withoutTrailingSlash(options.baseURL) ?? 'https://api.ampcode.com',
      headers: () => ({
        'X-Amp-Api-Key': loadApiKey({
          apiKey: options.apiKey,
          environmentVariableName: 'AMP_API_KEY',
          description: 'Amp Provider',
        }),
        ...options.headers,
      }),
      generateId: options.generateId ?? generateId,
    });

  const provider = function (modelId: string, settings?: AmpChatSettings) {
    if (new.target) {
      throw new Error(
        'The model factory function cannot be called with the new keyword.',
      );
    }

    return createChatModel(modelId, settings);
  };

  provider.languageModel = createChatModel;

  return provider as AmpProvider;
}

// Export default provider instance
export const amp = createAmp();

// Export model-specific shortcuts
export const ampChat = (settings?: AmpChatSettings) => 
  amp.languageModel('amp-chat', settings);

export const ampCode = (settings?: AmpChatSettings) => 
  amp.languageModel('amp-code', settings);

export const ampReasoning = (settings?: AmpChatSettings) => 
  amp.languageModel('amp-reasoning', settings);

export type { AmpChatSettings } from './amp-chat-language-model';
