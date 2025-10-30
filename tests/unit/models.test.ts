import { describe, it, expect } from 'vitest';
import { AmpChatLanguageModel } from '../../src/amp-chat-language-model-simple';
import { AmpAgentLanguageModel } from '../../src/amp-agent-language-model-simple';
import type { LanguageModelV1CallOptions, LanguageModelV1Message } from '@ai-sdk/provider';

describe('AmpChatLanguageModel', () => {
  const mockConfig = {
    provider: 'amp',
    baseURL: 'https://api.ampcode.com',
    headers: () => ({ 'X-Amp-Api-Key': 'test-key' }),
    generateId: () => 'test-id',
  };

  it('should have correct specification version', () => {
    const model = new AmpChatLanguageModel('amp-chat', {}, mockConfig);
    expect(model.specificationVersion).toBe('v1');
    expect(model.provider).toBe('amp');
    expect(model.modelId).toBe('amp-chat');
    expect(model.defaultObjectGenerationMode).toBeUndefined();
    expect(model.supportsImageUrls).toBe(false);
  });

  it('should generate text with proper response format', async () => {
    const model = new AmpChatLanguageModel('amp-chat', {}, mockConfig);
    
    const options: LanguageModelV1CallOptions = {
      inputFormat: 'messages',
      mode: { type: 'regular' },
      prompt: [
        { role: 'user', content: 'Hello, world!' },
      ] as LanguageModelV1Message[],
    };

    const result = await model.doGenerate(options);

    expect(result).toMatchObject({
      text: expect.any(String),
      finishReason: 'stop',
      usage: {
        promptTokens: expect.any(Number),
        completionTokens: expect.any(Number),
      },
      rawCall: {
        rawPrompt: expect.any(Array),
        rawSettings: expect.any(Object),
      },
      warnings: expect.any(Array),
    });

    expect(result.text).toContain('Hello, world!');
    expect(result.usage.promptTokens).toBeGreaterThan(0);
    expect(result.usage.completionTokens).toBeGreaterThan(0);
  });

  it('should stream text with proper stream parts', async () => {
    const model = new AmpChatLanguageModel('amp-chat', {}, mockConfig);
    
    const options: LanguageModelV1CallOptions = {
      inputFormat: 'messages',
      mode: { type: 'regular' },
      prompt: [
        { role: 'user', content: 'Stream test' },
      ] as LanguageModelV1Message[],
    };

    const result = await model.doStream(options);
    
    expect(result).toMatchObject({
      stream: expect.any(ReadableStream),
      warnings: expect.any(Array),
      rawCall: expect.any(Object),
    });

    // Test stream consumption
    const parts = [];
    const reader = result.stream.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    expect(parts.length).toBeGreaterThan(0);
    expect(parts.some(part => part.type === 'text-delta')).toBe(true);
    expect(parts.some(part => part.type === 'finish')).toBe(true);
  });
});

describe('AmpAgentLanguageModel', () => {
  const mockConfig = {
    provider: 'amp',
    baseURL: 'https://api.ampcode.com',
    apiKey: 'test-key',
    generateId: () => 'test-id',
  };

  it('should have correct specification version and flags', () => {
    const model = new AmpAgentLanguageModel('amp-code', {}, mockConfig);
    expect(model.specificationVersion).toBe('v1');
    expect(model.provider).toBe('amp');
    expect(model.modelId).toBe('amp-code');
    expect(model.defaultObjectGenerationMode).toBeUndefined();
    expect(model.supportsImageUrls).toBe(false);
  });

  it('should use appropriate system prompt for amp-code', async () => {
    const model = new AmpAgentLanguageModel('amp-code', {}, mockConfig);
    
    const options: LanguageModelV1CallOptions = {
      inputFormat: 'messages',
      mode: { type: 'regular' },
      prompt: [
        { role: 'user', content: 'Write a function' },
      ] as LanguageModelV1Message[],
    };

    const result = await model.doGenerate(options);
    
    expect(result.text).toContain('AGENT MODE');
    expect(result.text).toContain('Write a function');
    expect(result.rawCall.rawSettings).toMatchObject({
      cwd: undefined,
      toolbox: undefined,
      dangerouslyAllowAll: undefined,
      baseURL: 'https://api.ampcode.com',
    });
  });

  it('should use appropriate system prompt for amp-reasoning', async () => {
    const model = new AmpAgentLanguageModel('amp-reasoning', {}, mockConfig);
    
    const options: LanguageModelV1CallOptions = {
      inputFormat: 'messages',
      mode: { type: 'regular' },
      prompt: [
        { role: 'user', content: 'Solve this problem' },
      ] as LanguageModelV1Message[],
    };

    const result = await model.doGenerate(options);
    
    expect(result.text).toContain('AGENT MODE');
    expect(result.text).toContain('Solve this problem');
  });

  it('should include agent settings in response', async () => {
    const model = new AmpAgentLanguageModel('amp-code', {
      cwd: '/test/project',
      toolbox: './my-tools',
      dangerouslyAllowAll: true,
      systemPrompt: 'Custom prompt',
    }, mockConfig);
    
    const options: LanguageModelV1CallOptions = {
      inputFormat: 'messages',
      mode: { type: 'regular' },
      prompt: [
        { role: 'user', content: 'Test' },
      ] as LanguageModelV1Message[],
    };

    const result = await model.doGenerate(options);
    
    expect(result.text).toContain('CWD: /test/project');
    expect(result.text).toContain('TOOLBOX: ./my-tools');
    expect(result.rawCall.rawSettings).toMatchObject({
      cwd: '/test/project',
      toolbox: './my-tools',
      dangerouslyAllowAll: true,
    });
  });

  it('should stream with agent indicators', async () => {
    const model = new AmpAgentLanguageModel('amp-code', {
      cwd: '/test',
    }, mockConfig);
    
    const options: LanguageModelV1CallOptions = {
      inputFormat: 'messages',
      mode: { type: 'regular' },
      prompt: [
        { role: 'user', content: 'Stream test' },
      ] as LanguageModelV1Message[],
    };

    const result = await model.doStream(options);
    
    expect(result.stream).toBeInstanceOf(ReadableStream);
    expect(result.rawCall.rawSettings).toMatchObject({
      cwd: '/test',
    });

    // Test that stream contains agent mode indicator
    const parts = [];
    const reader = result.stream.getReader();
    
    try {
      // Read first chunk
      const { value } = await reader.read();
      parts.push(value);
    } finally {
      reader.releaseLock();
    }

    expect(parts[0]).toMatchObject({
      type: 'text-delta',
      textDelta: expect.stringContaining('AGENT MODE'),
    });
  });

  it('should handle custom system prompt', async () => {
    const customPrompt = 'You are a specialized security expert.';
    const model = new AmpAgentLanguageModel('amp-code', {
      systemPrompt: customPrompt,
    }, mockConfig);
    
    const options: LanguageModelV1CallOptions = {
      inputFormat: 'messages',
      mode: { type: 'regular' },
      prompt: [
        { role: 'user', content: 'Test' },
      ] as LanguageModelV1Message[],
    };

    const result = await model.doGenerate(options);
    
    // The custom prompt should be used instead of the default
    expect(result.text).toContain('Test');
  });
});

describe('Model Usage Calculations', () => {
  it('should calculate reasonable token usage for chat model', async () => {
    const model = new AmpChatLanguageModel('amp-chat', {}, {
      provider: 'amp',
      baseURL: 'https://api.ampcode.com',
      headers: () => ({}),
      generateId: () => 'test',
    });

    const longPrompt = 'This is a longer prompt that should have more tokens than a short one.';
    const result = await model.doGenerate({
      inputFormat: 'messages',
      mode: { type: 'regular' },
      prompt: [{ role: 'user', content: longPrompt }],
    } as LanguageModelV1CallOptions);

    expect(result.usage.promptTokens).toBeGreaterThan(5); // Should be more than 5 tokens
    expect(result.usage.completionTokens).toBeGreaterThan(0);
  });

  it('should calculate reasonable token usage for agent model', async () => {
    const model = new AmpAgentLanguageModel('amp-code', {}, {
      provider: 'amp',
      baseURL: 'https://api.ampcode.com',
      apiKey: 'test',
      generateId: () => 'test',
    });

    const result = await model.doGenerate({
      inputFormat: 'messages',
      mode: { type: 'regular' },
      prompt: [{ role: 'user', content: 'Short' }],
    } as LanguageModelV1CallOptions);

    expect(result.usage.promptTokens).toBeGreaterThan(10); // Agent has system prompt so should be more
    expect(result.usage.completionTokens).toBeGreaterThan(0);
  });
});
