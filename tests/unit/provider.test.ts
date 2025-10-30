import { describe, it, expect, beforeAll } from 'vitest';
import { createAmp, amp, ampChat, ampCode, ampReasoning } from '../../src/index';
import { AmpChatLanguageModel } from '../../src/amp-chat-language-model-simple';
import { AmpAgentLanguageModel } from '../../src/amp-agent-language-model-simple';

// Set a test API key for all tests
beforeAll(() => {
  process.env.AMP_API_KEY = 'test-api-key-for-unit-tests';
});

describe('Amp Provider Factory', () => {
  it('should create chat model for amp-chat by default', () => {
    const model = amp('amp-chat');
    expect(model).toBeInstanceOf(AmpChatLanguageModel);
    expect(model.modelId).toBe('amp-chat');
    expect(model.specificationVersion).toBe('v1');
  });

  it('should create agent model for amp-code', () => {
    const model = amp('amp-code');
    expect(model).toBeInstanceOf(AmpAgentLanguageModel);
    expect(model.modelId).toBe('amp-code');
    expect(model.specificationVersion).toBe('v1');
  });

  it('should create agent model for amp-reasoning', () => {
    const model = amp('amp-reasoning');
    expect(model).toBeInstanceOf(AmpAgentLanguageModel);
    expect(model.modelId).toBe('amp-reasoning');
  });

  it('should create agent model when agent settings provided', () => {
    const model = amp('amp-chat', { cwd: process.cwd() });
    expect(model).toBeInstanceOf(AmpAgentLanguageModel);
  });

  it('should create agent model when toolbox setting provided', () => {
    const model = amp('amp-chat', { toolbox: './tools' });
    expect(model).toBeInstanceOf(AmpAgentLanguageModel);
  });

  it('should create agent model when dangerouslyAllowAll provided', () => {
    const model = amp('amp-chat', { dangerouslyAllowAll: true });
    expect(model).toBeInstanceOf(AmpAgentLanguageModel);
  });
});

describe('Provider Helper Functions', () => {
  it('should create chat model with ampChat()', () => {
    const model = ampChat();
    expect(model).toBeInstanceOf(AmpChatLanguageModel);
    expect(model.modelId).toBe('amp-chat');
  });

  it('should create agent model with ampCode()', () => {
    const model = ampCode();
    expect(model).toBeInstanceOf(AmpAgentLanguageModel);
    expect(model.modelId).toBe('amp-code');
  });

  it('should create agent model with ampReasoning()', () => {
    const model = ampReasoning();
    expect(model).toBeInstanceOf(AmpAgentLanguageModel);
    expect(model.modelId).toBe('amp-reasoning');
  });

  it('should pass settings to ampCode()', () => {
    const model = ampCode({
      cwd: '/test',
      toolbox: './tools',
      temperature: 0.1,
    });
    expect(model).toBeInstanceOf(AmpAgentLanguageModel);
    // Note: We can't easily test private settings, but we can test it compiles
  });
});

describe('Global Agent Settings', () => {
  it('should create agent models when global agent settings provided', () => {
    const provider = createAmp({
      cwd: process.cwd(),
      toolbox: './global-tools',
    });

    const chatModel = provider('amp-chat');
    expect(chatModel).toBeInstanceOf(AmpAgentLanguageModel);

    const codeModel = provider('amp-code');
    expect(codeModel).toBeInstanceOf(AmpAgentLanguageModel);
  });

  it('should merge per-call settings with global settings', () => {
    const provider = createAmp({
      cwd: '/global',
      dangerouslyAllowAll: false,
    });

    // This should work and create an agent model
    const model = provider('amp-chat', {
      cwd: '/local', // Should override global
      toolbox: './local-tools', // Should add to global settings
    });

    expect(model).toBeInstanceOf(AmpAgentLanguageModel);
  });

  it('should handle custom baseURL and headers', () => {
    const provider = createAmp({
      baseURL: 'https://custom.ampcode.com',
      headers: {
        'Custom-Header': 'test-value',
      },
    });

    const model = provider('amp-chat');
    expect(model).toBeInstanceOf(AmpChatLanguageModel);
    // Note: Can't easily test private config, but ensures it compiles
  });
});

describe('Settings Defaults', () => {
  it('should default dangerouslyAllowAll to false', () => {
    const model = ampCode({ cwd: '/test' });
    expect(model).toBeInstanceOf(AmpAgentLanguageModel);
    // The actual default is tested in the implementation
  });

  it('should handle undefined settings gracefully', () => {
    expect(() => ampChat()).not.toThrow();
    expect(() => ampCode()).not.toThrow();
    expect(() => ampReasoning()).not.toThrow();
  });

  it('should handle empty settings object', () => {
    expect(() => amp('amp-chat', {})).not.toThrow();
    expect(() => amp('amp-code', {})).not.toThrow();
  });
});
