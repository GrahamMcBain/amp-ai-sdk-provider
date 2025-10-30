import { generateText, streamText } from 'ai';
import { amp, ampChat, ampCode } from 'amp-ai-sdk-provider';

async function basicExample() {
  console.log('=== Basic Text Generation ===');
  
  const result = await generateText({
    model: amp('amp-chat'),
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant specialized in explaining complex topics simply.',
      },
      {
        role: 'user',
        content: 'Explain quantum computing in simple terms.',
      },
    ],
  });

  console.log('Generated text:', result.text);
  console.log('Usage:', result.usage);
}

async function streamingExample() {
  console.log('\n=== Streaming Text Generation ===');
  
  const result = await streamText({
    model: ampChat({
      temperature: 0.7,
      maxTokens: 500,
    }),
    messages: [
      {
        role: 'user',
        content: 'Write a short story about a time-traveling programmer.',
      },
    ],
  });

  let fullText = '';
  for await (const delta of result.textStream) {
    process.stdout.write(delta);
    fullText += delta;
  }
  
  console.log('\n\nFull generated text length:', fullText.length);
}

async function codeGenerationExample() {
  console.log('\n=== Code Generation (Agent Model) ===');
  
  const result = await generateText({
    model: ampCode({
      temperature: 0.1,
      cwd: process.cwd(),
      systemPrompt: 'You are an expert TypeScript developer. Provide clean, well-documented code.',
    }),
    messages: [
      {
        role: 'user',
        content: 'Create a TypeScript function that validates an email address using regex. Include proper error handling and JSDoc comments.',
      },
    ],
  });

  console.log('Generated code (using Amp agent):');
  console.log(result.text);
}

async function toolCallingExample() {
  console.log('\n=== Tool Calling ===');
  
  const result = await generateText({
    model: amp('amp-chat'),
    messages: [
      {
        role: 'user',
        content: 'What is the current temperature in Tokyo and New York?',
      },
    ],
    tools: {
      getWeather: {
        description: 'Get the current weather for a city',
        parameters: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: 'The city name',
            },
            country: {
              type: 'string',
              description: 'The country code (optional)',
            },
          },
          required: ['city'],
        },
        execute: async ({ city, country }) => {
          // Simulate API call
          console.log(`Fetching weather for ${city}${country ? `, ${country}` : ''}...`);
          return {
            temperature: Math.floor(Math.random() * 30) + 10,
            condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
            humidity: Math.floor(Math.random() * 50) + 30,
          };
        },
      },
    },
  });

  console.log('Final response:', result.text);
  console.log('Tool calls made:', result.toolCalls?.length || 0);
}

async function customConfigurationExample() {
  console.log('\n=== Custom Configuration ===');
  
  const customModel = amp('amp-reasoning', {
    temperature: 0.3,
    maxTokens: 1000,
    ampOptions: {
      mode: 'reasoning',
      tools: true,
    },
  });

  const result = await generateText({
    model: customModel,
    messages: [
      {
        role: 'user',
        content: 'Solve this logic puzzle: Three friends have different colored cars (red, blue, green). Alice doesn\'t drive red. Bob drives blue. What color car does Charlie drive?',
      },
    ],
  });

  console.log('Reasoning response:', result.text);
}

async function main() {
  try {
    await basicExample();
    await streamingExample();
    await codeGenerationExample();
    await toolCallingExample();
    await customConfigurationExample();
  } catch (error) {
    console.error('Error running examples:', error);
    
    if (error.name === 'APICallError') {
      console.error('API Error Details:');
      console.error('- Status Code:', error.statusCode);
      console.error('- Message:', error.message);
      console.error('- Is Retryable:', error.isRetryable);
    }
  }
}

// Run examples if called directly
if (require.main === module) {
  main();
}

export {
  basicExample,
  streamingExample,
  codeGenerationExample,
  toolCallingExample,
  customConfigurationExample,
};
