# Amp AI SDK Provider

A custom provider for [Vercel AI SDK](https://sdk.vercel.ai) that enables you to use Amp's AI models with the AI SDK ecosystem.

## Installation

```bash
npm install amp-ai-sdk-provider @ai-sdk/provider @ai-sdk/provider-utils
```

## Setup

1. Get your API key from [Amp Console](https://ampcode.com/settings)
2. Set your environment variable:

```bash
export AMP_API_KEY=your_api_key_here
```

## Basic Usage

```typescript
import { generateText } from 'ai';
import { amp } from 'amp-ai-sdk-provider';

const result = await generateText({
  model: amp('amp-chat'),
  messages: [
    {
      role: 'user',
      content: 'What is the capital of France?',
    },
  ],
});

console.log(result.text);
```

## Streaming

```typescript
import { streamText } from 'ai';
import { amp } from 'amp-ai-sdk-provider';

const result = await streamText({
  model: amp('amp-chat'),
  messages: [
    {
      role: 'user',
      content: 'Write a story about a robot.',
    },
  ],
});

for await (const delta of result.textStream) {
  console.log(delta);
}
```

## Tool Calling

```typescript
import { generateText } from 'ai';
import { amp } from 'amp-ai-sdk-provider';
import { z } from 'zod';

const result = await generateText({
  model: amp('amp-chat'),
  messages: [
    {
      role: 'user',
      content: 'What is the weather like in San Francisco?',
    },
  ],
  tools: {
    getWeather: {
      description: 'Get the current weather for a location',
      parameters: z.object({
        location: z.string().describe('The city and state'),
      }),
      execute: async ({ location }) => {
        // Implement weather API call
        return { temperature: 72, condition: 'sunny' };
      },
    },
  },
});
```

## Models

Available models:

- `amp-chat` - General purpose conversational AI
- `amp-code` - Specialized for code generation and analysis
- `amp-reasoning` - Enhanced reasoning and problem-solving

```typescript
import { amp, ampChat, ampCode, ampReasoning } from 'amp-ai-sdk-provider';

// These are equivalent:
const model1 = amp('amp-chat');
const model2 = ampChat();

// With custom settings:
const codeModel = ampCode({
  temperature: 0.1,
  maxTokens: 2048,
  ampOptions: {
    mode: 'code',
    context: 'typescript',
  },
});
```

## Configuration

You can configure the provider with custom settings:

```typescript
import { createAmp } from 'amp-ai-sdk-provider';

const customAmp = createAmp({
  baseURL: 'https://your-amp-instance.com',
  apiKey: 'your-api-key',
  headers: {
    'Custom-Header': 'value',
  },
});

const model = customAmp('amp-chat');
```

## Environment Variables

- `AMP_API_KEY` - Your Amp API key (required)
- `AMP_BASE_URL` - Custom Amp instance URL (optional, defaults to https://api.ampcode.com)

## Features

- ✅ Text generation
- ✅ Streaming responses  
- ✅ Tool/function calling
- ✅ Custom model parameters
- ✅ Error handling and retries
- ✅ TypeScript support
- ⏳ Image inputs (coming soon)
- ⏳ File attachments (coming soon)

## Error Handling

The provider includes comprehensive error handling:

```typescript
import { generateText } from 'ai';
import { amp } from 'amp-ai-sdk-provider';

try {
  const result = await generateText({
    model: amp('amp-chat'),
    messages: [{ role: 'user', content: 'Hello!' }],
  });
} catch (error) {
  if (error.name === 'TooManyRequestsError') {
    console.log('Rate limited, retry after:', error.retryAfter);
  } else if (error.name === 'APICallError') {
    console.log('API error:', error.statusCode, error.message);
  }
}
```

## Contributing

This provider is part of the [Amp](https://github.com/sourcegraph/amp) project. See the main repository for contribution guidelines.

## License

MIT
