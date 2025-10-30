import { describe, it, expect, beforeAll } from 'vitest';
import { amp, ampChat, ampCode, ampReasoning } from '../../src/index';
import type { LanguageModelV1CallOptions, LanguageModelV1Message } from '@ai-sdk/provider';

// Set a test API key for all tests
beforeAll(() => {
  process.env.AMP_API_KEY = 'test-api-key-for-compliance-tests';
});

/**
 * AI SDK v1 Compliance Tests
 * 
 * These tests ensure the provider meets the LanguageModelV1 contract
 * as defined by the Vercel AI SDK specification.
 */

const createTestOptions = (prompt: string): LanguageModelV1CallOptions => ({
  inputFormat: 'messages',
  mode: { type: 'regular' },
  prompt: [
    { role: 'user', content: prompt },
  ] as LanguageModelV1Message[],
});

describe('AI SDK v1 Compliance - Basic Contract', () => {
  const modelFactories = [
    { name: 'ampChat', factory: () => ampChat() },
    { name: 'ampCode', factory: () => ampCode() },
    { name: 'ampReasoning', factory: () => ampReasoning() },
    { name: 'amp(amp-chat)', factory: () => amp('amp-chat') },
  ];

  modelFactories.forEach(({ name, factory }) => {
    describe(name, () => {
      it('should implement LanguageModelV1 interface correctly', () => {
        const model = factory();
        expect(model).toHaveProperty('specificationVersion', 'v1');
        expect(model).toHaveProperty('provider', 'amp');
        expect(model).toHaveProperty('modelId');
        expect(model).toHaveProperty('defaultObjectGenerationMode');
        expect(model).toHaveProperty('supportsImageUrls');
        expect(model).toHaveProperty('doGenerate');
        expect(model).toHaveProperty('doStream');
        
        expect(typeof model.doGenerate).toBe('function');
        expect(typeof model.doStream).toBe('function');
        expect(typeof model.modelId).toBe('string');
        expect(typeof model.provider).toBe('string');
      });

      it('should have valid model metadata', () => {
        const model = factory();
        expect(model.specificationVersion).toBe('v1');
        expect(model.provider).toBe('amp');
        expect(model.modelId).toMatch(/^amp-(chat|code|reasoning)$/);
        expect(typeof model.supportsImageUrls).toBe('boolean');
      });
    });
  });
});

describe('AI SDK v1 Compliance - doGenerate Response Format', () => {
  it('should return correctly formatted response from doGenerate', async () => {
    const model = ampChat();
    const options = createTestOptions('Test prompt');
    
    const result = await model.doGenerate(options);
    
    // Check required fields
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('finishReason');
    expect(result).toHaveProperty('usage');
    expect(result).toHaveProperty('rawCall');
    expect(result).toHaveProperty('warnings');
    
    // Check types
    expect(typeof result.text).toBe('string');
    expect(typeof result.finishReason).toBe('string');
    expect(typeof result.usage).toBe('object');
    expect(typeof result.rawCall).toBe('object');
    expect(Array.isArray(result.warnings)).toBe(true);
    
    // Check usage format
    expect(result.usage).toHaveProperty('promptTokens');
    expect(result.usage).toHaveProperty('completionTokens');
    expect(typeof result.usage.promptTokens).toBe('number');
    expect(typeof result.usage.completionTokens).toBe('number');
    
    // Check rawCall format
    expect(result.rawCall).toHaveProperty('rawPrompt');
    expect(result.rawCall).toHaveProperty('rawSettings');
    expect(Array.isArray(result.rawCall.rawPrompt)).toBe(true);
    expect(typeof result.rawCall.rawSettings).toBe('object');
  });

  it('should return valid finishReason values', async () => {
    const model = ampCode();
    const options = createTestOptions('Generate code');
    
    const result = await model.doGenerate(options);
    
    const validFinishReasons = ['stop', 'length', 'tool-calls', 'content-filter', 'error', 'other'];
    expect(validFinishReasons).toContain(result.finishReason);
  });

  it('should have reasonable token counts', async () => {
    const model = ampCode();
    const options = createTestOptions('A longer prompt that should result in meaningful token counts for testing purposes.');
    
    const result = await model.doGenerate(options);
    
    expect(result.usage.promptTokens).toBeGreaterThan(0);
    expect(result.usage.completionTokens).toBeGreaterThan(0);
    expect(result.usage.promptTokens).toBeLessThan(1000); // Reasonable upper bound
    expect(result.usage.completionTokens).toBeLessThan(1000); // Reasonable upper bound
  });
});

describe('AI SDK v1 Compliance - doStream Response Format', () => {
  it('should return correctly formatted stream response', async () => {
    const model = ampReasoning();
    const options = createTestOptions('Stream test');
    
    const result = await model.doStream(options);
    
    // Check required fields
    expect(result).toHaveProperty('stream');
    expect(result).toHaveProperty('rawCall');
    expect(result).toHaveProperty('warnings');
    
    // Check types
    expect(result.stream).toBeInstanceOf(ReadableStream);
    expect(typeof result.rawCall).toBe('object');
    expect(Array.isArray(result.warnings)).toBe(true);
    
    // Check rawCall format
    expect(result.rawCall).toHaveProperty('rawPrompt');
    expect(result.rawCall).toHaveProperty('rawSettings');
  });

  it('should produce valid stream parts', async () => {
    const model = ampChat();
    const options = createTestOptions('Stream validation test');
    
    const result = await model.doStream(options);
    const parts = [];
    const reader = result.stream.getReader();
    
    try {
      let iterationCount = 0;
      while (iterationCount < 10) { // Prevent infinite loop
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
        iterationCount++;
      }
    } finally {
      reader.releaseLock();
    }
    
    expect(parts.length).toBeGreaterThan(0);
    
    // Check that all parts have valid types
    const validPartTypes = ['text-delta', 'finish', 'error'];
    parts.forEach(part => {
      expect(part).toHaveProperty('type');
      expect(validPartTypes).toContain(part.type);
    });
    
    // Should have at least one text-delta and one finish
    expect(parts.some(p => p.type === 'text-delta')).toBe(true);
    expect(parts.some(p => p.type === 'finish')).toBe(true);
    
    // Check finish part format
    const finishPart = parts.find(p => p.type === 'finish');
    if (finishPart) {
      expect(finishPart).toHaveProperty('finishReason');
      expect(finishPart).toHaveProperty('usage');
      expect(typeof finishPart.usage).toBe('object');
      expect(finishPart.usage).toHaveProperty('promptTokens');
      expect(finishPart.usage).toHaveProperty('completionTokens');
    }
  });
});

describe('AI SDK v1 Compliance - Error Handling', () => {
  it('should handle malformed options gracefully', async () => {
    const model = ampChat();
    
    // Test with missing required fields
    const invalidOptions = {
      inputFormat: 'messages',
      mode: { type: 'regular' },
      prompt: [], // Empty prompt
    } as LanguageModelV1CallOptions;
    
    // Should not throw, but might return an error or empty response
    await expect(model.doGenerate(invalidOptions)).resolves.toBeDefined();
  });

  it('should handle stream errors gracefully', async () => {
    const model = ampCode();
    const options = createTestOptions('Test');
    
    const result = await model.doStream(options);
    const reader = result.stream.getReader();
    
    // Should be able to read without throwing
    try {
      const { done, value } = await reader.read();
      expect(done || value).toBeDefined();
    } finally {
      reader.releaseLock();
    }
  });
});

describe('AI SDK v1 Compliance - Agent vs Chat Mode', () => {
  it('should properly differentiate agent and chat modes', async () => {
    const chatModel = ampChat();
    const agentModel = ampCode({ cwd: '/test' });
    
    const options = createTestOptions('Compare modes');
    
    const chatResult = await chatModel.doGenerate(options);
    const agentResult = await agentModel.doGenerate(options);
    
    // Both should follow the same interface
    expect(chatResult).toHaveProperty('text');
    expect(agentResult).toHaveProperty('text');
    
    // Agent should indicate its mode
    expect(agentResult.text).toContain('AGENT MODE');
    expect(agentResult.rawCall.rawSettings).toHaveProperty('cwd');
    
    // Chat should be simpler
    expect(chatResult.text).toContain('Mock response');
  });

  it('should maintain consistent interface across modes', async () => {
    const models = [ampChat(), ampCode(), ampReasoning()];
    const options = createTestOptions('Interface consistency test');
    
    const results = await Promise.all(
      models.map(model => model.doGenerate(options))
    );
    
    // All results should have the same shape
    results.forEach(result => {
      expect(result).toMatchObject({
        text: expect.any(String),
        finishReason: expect.any(String),
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
    });
  });
});
