import {
  generateId,
  loadApiKey,
  withoutTrailingSlash,
} from '@ai-sdk/provider-utils';
import { ProviderV1 } from '@ai-sdk/provider';
import { AmpChatLanguageModel, AmpChatSettings } from './amp-chat-language-model-simple';
import { AmpAgentLanguageModel, AmpAgentSettings } from './amp-agent-language-model-simple';

export interface AmpProvider extends ProviderV1 {
  (modelId: string, settings?: AmpChatSettings | AmpAgentSettings): AmpChatLanguageModel | AmpAgentLanguageModel;
  languageModel(
    modelId: string,
    settings?: AmpChatSettings | AmpAgentSettings,
  ): AmpChatLanguageModel | AmpAgentLanguageModel;
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

  // Coding agent-specific settings
  /**
   * Working directory for code execution context
   * Allows the agent to understand project structure and file locations
   */
  cwd?: string;

  /**
   * Path to directory containing custom tools for the agent
   * Tools should be executable files that the agent can invoke
   */
  toolbox?: string;

  /**
   * Allow the agent to use all available tools without restrictions
   * WARNING: This can be dangerous as it gives the agent broad access
   * @default false
   */
  dangerouslyAllowAll?: boolean;

  /**
   * Custom system prompt for coding tasks
   * If not provided, will use appropriate defaults based on model
   */
  systemPrompt?: string;
}

export function createAmp(options: AmpProviderSettings = {}): AmpProvider {
  const shouldUseAgent = (
    modelId: string, 
    settings: AmpChatSettings | AmpAgentSettings = {}
  ): boolean => {
    // Use agent model if:
    // 1. It's a coding model (amp-code, amp-reasoning)
    // 2. Agent-specific settings are provided (cwd, toolbox, dangerouslyAllowAll)
    // 3. Global agent settings are provided in options
    const isAgentModel = modelId === 'amp-code' || modelId === 'amp-reasoning';
    const hasAgentSettings = 'cwd' in settings || 'toolbox' in settings || 'dangerouslyAllowAll' in settings;
    const hasGlobalAgentSettings = !!(options.cwd || options.toolbox || options.dangerouslyAllowAll);
    
    return isAgentModel || hasAgentSettings || hasGlobalAgentSettings;
  };

  const createModel = (
    modelId: string,
    settings: AmpChatSettings | AmpAgentSettings = {},
  ) => {
    if (shouldUseAgent(modelId, settings)) {
      // Merge global agent settings with per-call settings
      const agentSettings: AmpAgentSettings = {
        ...settings,
        cwd: (settings as AmpAgentSettings).cwd || options.cwd,
        toolbox: (settings as AmpAgentSettings).toolbox || options.toolbox,
        dangerouslyAllowAll: (settings as AmpAgentSettings).dangerouslyAllowAll ?? options.dangerouslyAllowAll ?? false,
        systemPrompt: (settings as AmpAgentSettings).systemPrompt || options.systemPrompt,
      };

      return new AmpAgentLanguageModel(modelId, agentSettings, {
        provider: 'amp',
        baseURL: withoutTrailingSlash(options.baseURL) ?? 'https://api.ampcode.com',
        apiKey: loadApiKey({
          apiKey: options.apiKey,
          environmentVariableName: 'AMP_API_KEY',
          description: 'Amp Provider',
        }),
        generateId: options.generateId ?? generateId,
      });
    } else {
      // Use traditional chat model for simple text generation
      return new AmpChatLanguageModel(modelId, settings as AmpChatSettings, {
        provider: 'amp',
        baseURL: withoutTrailingSlash(options.baseURL) ?? 'https://api.ampcode.com',
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
    }
  };

  const provider = function (modelId: string, settings?: AmpChatSettings | AmpAgentSettings) {
    if (new.target) {
      throw new Error(
        'The model factory function cannot be called with the new keyword.',
      );
    }

    return createModel(modelId, settings);
  };

  provider.languageModel = createModel;

  return provider as AmpProvider;
}

// Export default provider instance
export const amp = createAmp();

// Export model-specific shortcuts
export const ampChat = (settings?: AmpChatSettings) => 
  amp.languageModel('amp-chat', settings);

export const ampCode = (settings?: AmpAgentSettings) => 
  amp.languageModel('amp-code', settings);

export const ampReasoning = (settings?: AmpAgentSettings) => 
  amp.languageModel('amp-reasoning', settings);

export type { AmpChatSettings } from './amp-chat-language-model-simple';
export type { AmpAgentSettings } from './amp-agent-language-model-simple';
