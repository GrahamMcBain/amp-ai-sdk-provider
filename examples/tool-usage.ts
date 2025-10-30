import { generateText } from '@ai-sdk/core';
import { ampCode } from '../src';

// Example showing how to use Amp's agent with custom tools
async function toolUsageExample() {
  console.log('🔧 Tool usage example:');
  
  // Create a simple toolbox directory for demonstration
  // In practice, you'd have actual tool scripts in this directory
  const toolboxPath = './examples/sample-toolbox';

  const result = await generateText({
    model: ampCode({
      cwd: process.cwd(),
      toolbox: toolboxPath,
      dangerouslyAllowAll: true,
      systemPrompt: `You are a coding assistant with access to custom tools. 
                     Use the available tools to help with code analysis and generation.
                     Always explain what tools you're using and why.`,
    }),
    prompt: `Please analyze the package.json file in this project and:
             1. List all dependencies
             2. Check for any outdated packages
             3. Suggest any missing dev dependencies for a TypeScript project
             4. Format the results in a readable way`,
  });

  console.log('Tool-assisted analysis:', result.text);
}

// Example showing context-aware coding
async function contextAwareCoding() {
  console.log('\n📂 Context-aware coding example:');
  
  const result = await generateText({
    model: ampCode({
      cwd: process.cwd(),
      systemPrompt: `You are a TypeScript expert working on this specific project. 
                     Understand the project structure and provide context-aware suggestions.`,
    }),
    prompt: `Based on the current project structure, help me:
             1. Add proper error handling to the language model classes
             2. Suggest unit tests that should be written
             3. Recommend any TypeScript configuration improvements`,
  });

  console.log('Context-aware suggestions:', result.text);
}

// Example showing how different models behave differently
async function modelComparisonExample() {
  console.log('\n🔍 Model comparison example:');
  
  const prompt = 'Optimize this JavaScript function for better performance: function sum(arr) { let total = 0; for(let i = 0; i < arr.length; i++) { total += arr[i]; } return total; }';

  // Using amp-code (focuses on code optimization)
  const codeResult = await generateText({
    model: ampCode({
      systemPrompt: 'Focus on code optimization and best practices.',
    }),
    prompt,
  });
  console.log('amp-code response:', codeResult.text);

  // Using amp-reasoning (focuses on analysis and explanation)
  const reasoningResult = await generateText({
    model: ampCode({
      model: 'amp-reasoning',
      systemPrompt: 'Provide detailed analysis and reasoning.',
    }),
    prompt,
  });
  console.log('\namp-reasoning response:', reasoningResult.text);
}

async function main() {
  try {
    await toolUsageExample();
    await contextAwareCoding();
    await modelComparisonExample();
  } catch (error) {
    console.error('Error in tool usage examples:', error);
  }
}

if (require.main === module) {
  main();
}
