import { generateText, streamText } from '@ai-sdk/core';
import { ampCode, ampReasoning, createAmp } from '../src';

// Basic coding assistance
async function basicCodingExample() {
  console.log('🤖 Basic coding assistance:');
  
  const result = await generateText({
    model: ampCode(),
    prompt: 'Write a TypeScript function that validates email addresses using regex',
  });

  console.log('Result:', result.text);
}

// Coding with custom working directory and toolbox
async function advancedCodingExample() {
  console.log('\n🛠️ Advanced coding with custom tools:');
  
  const result = await generateText({
    model: ampCode({
      cwd: process.cwd(),
      toolbox: './my-tools', // Directory containing custom tools
      dangerouslyAllowAll: true, // Allow all tools (use with caution)
    }),
    prompt: 'Analyze the TypeScript files in this project and suggest improvements',
  });

  console.log('Result:', result.text);
}

// Using global agent settings
async function globalSettingsExample() {
  console.log('\n⚙️ Using global agent settings:');
  
  const ampWithSettings = createAmp({
    cwd: process.cwd(),
    toolbox: './tools',
    systemPrompt: 'You are a senior TypeScript developer focused on code quality and best practices.',
  });

  const result = await generateText({
    model: ampWithSettings('amp-code'),
    prompt: 'Review this codebase for potential security vulnerabilities',
  });

  console.log('Result:', result.text);
}

// Streaming with reasoning model for complex problems
async function reasoningExample() {
  console.log('\n🧠 Complex problem solving with reasoning:');
  
  const stream = streamText({
    model: ampReasoning({
      cwd: process.cwd(),
    }),
    prompt: `I have a performance issue in my React app. Users are reporting slow loading times. 
             Help me debug this step by step. The app uses TypeScript, Next.js, and has about 50 components.`,
  });

  console.log('Streaming response:');
  for await (const part of stream.textStream) {
    process.stdout.write(part);
  }
  console.log('\n');
}

// Mixed usage - chat vs agent models
async function mixedUsageExample() {
  console.log('\n🔄 Mixed usage example:');
  
  // This will use the traditional chat model (no agent features)
  const chatResult = await generateText({
    model: createAmp()('amp-chat'),
    prompt: 'What is the capital of France?',
  });
  console.log('Chat result:', chatResult.text);

  // This will automatically use the agent model due to amp-code model ID
  const codeResult = await generateText({
    model: createAmp()('amp-code'),
    prompt: 'Write a simple HTTP server in Node.js',
  });
  console.log('Code result:', codeResult.text);
}

// Run all examples
async function main() {
  try {
    await basicCodingExample();
    await advancedCodingExample();
    await globalSettingsExample();
    await reasoningExample();
    await mixedUsageExample();
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  main();
}
