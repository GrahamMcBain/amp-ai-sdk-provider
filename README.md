# Amp AI SDK Provider

A **coding agent provider** for [Vercel AI SDK](https://sdk.vercel.ai) that exposes Amp's full coding assistant capabilities, not just text generation. Similar to how "Claude Code" differs from regular Claude, this provider gives you access to Amp's specialized coding tools, project context awareness, and agent-powered development workflows.

## 🚀 Why Use This Provider?

**Unlike generic LLM providers, Amp is a coding agent with:**

- 🛠️ **Custom tool execution** with your own toolbox
- 📁 **Project context awareness** with working directory support  
- 🧠 **Multi-step reasoning** for complex coding tasks
- 🔧 **Built-in development tools** for analysis, debugging, and refactoring
- 💻 **Code-first design** optimized for software engineering workflows

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

## Quick Start

### 🤖 Basic Coding Assistant

```typescript
import { generateText } from 'ai';
import { ampCode } from 'amp-ai-sdk-provider';

const result = await generateText({
  model: ampCode(),
  messages: [{
    role: 'user',
    content: 'Write a TypeScript function to validate email addresses'
  }],
});

console.log(result.text); // Returns clean, documented TypeScript code
```

### 🔧 Advanced Coding Agent with Tools

```typescript
import { generateText } from 'ai';
import { ampCode } from 'amp-ai-sdk-provider';

const result = await generateText({
  model: ampCode({
    cwd: process.cwd(),                    // Project context
    toolbox: './my-dev-tools',             // Custom tools directory
    dangerouslyAllowAll: true,             // Enable all tools
    systemPrompt: 'You are a senior TypeScript expert focused on clean architecture.',
  }),
  messages: [{
    role: 'user', 
    content: 'Analyze this codebase and suggest architectural improvements'
  }],
});

// Agent will use your tools and project context to provide detailed analysis
```

### 🧠 Complex Problem Solving

```typescript
import { streamText } from 'ai';
import { ampReasoning } from 'amp-ai-sdk-provider';

const stream = streamText({
  model: ampReasoning({
    cwd: process.cwd(),
  }),
  messages: [{
    role: 'user',
    content: `My React app is slow. Users report 3-4 second load times. 
             Help me debug this step by step.`
  }],
});

// Agent provides methodical debugging approach with real project analysis
for await (const part of stream.textStream) {
  process.stdout.write(part);
}
```

## Model Variants

The provider automatically chooses between **agent mode** and **chat mode** based on your usage:

| Model | When Agent Mode Activates | Best For |
|-------|---------------------------|----------|
| `ampCode()` | Always | Code generation, analysis, debugging |
| `ampReasoning()` | Always | Complex problem solving, architecture |
| `ampChat()` | When agent settings provided | General conversation |

### Agent vs Chat Mode

```typescript
import { amp, ampCode, ampChat } from 'amp-ai-sdk-provider';

// 🤖 AGENT MODE - Full coding capabilities
ampCode({
  cwd: process.cwd(),
  toolbox: './tools'
})

// 💬 CHAT MODE - Simple text generation  
ampChat()

// ⚡ AUTO-DETECTION - Becomes agent if you provide agent settings
amp('amp-chat', {
  cwd: process.cwd() // This triggers agent mode
})
```

## Agent Configuration

### Global Settings (Apply to All Models)

```typescript
import { createAmp } from 'amp-ai-sdk-provider';

const agent = createAmp({
  // Standard settings
  apiKey: 'your-api-key',
  baseURL: 'https://api.ampcode.com',
  
  // 🤖 Agent-specific settings
  cwd: process.cwd(),                    // Working directory
  toolbox: './dev-tools',                // Custom tools path
  dangerouslyAllowAll: true,             // Tool permissions
  systemPrompt: 'You are a senior developer focused on code quality.',
});

// All models now have agent capabilities
const codeModel = agent('amp-code');
const reasoningModel = agent('amp-reasoning');
```

### Per-Model Settings

```typescript
import { ampCode } from 'amp-ai-sdk-provider';

const model = ampCode({
  // AI settings
  temperature: 0.1,
  maxTokens: 4000,
  
  // 🤖 Agent settings
  cwd: '/path/to/my/project',
  toolbox: './my-custom-tools',
  dangerouslyAllowAll: false,            // Safer: requires explicit tool permissions
  systemPrompt: 'Focus on security and performance.',
});
```

## Advanced Examples

### Context-Aware Code Review

```typescript
import { generateText } from 'ai';
import { ampCode } from 'amp-ai-sdk-provider';

const review = await generateText({
  model: ampCode({
    cwd: './my-project',
    systemPrompt: 'You are conducting a thorough code review. Check for security, performance, and maintainability issues.',
  }),
  messages: [{
    role: 'user',
    content: 'Review the authentication system in this project'
  }],
});

// Agent analyzes actual project files and provides contextual feedback
```

### Multi-Step Debugging

```typescript
import { streamText } from 'ai';
import { ampReasoning } from 'amp-ai-sdk-provider';

const debug = streamText({
  model: ampReasoning({
    cwd: process.cwd(),
    toolbox: './debug-tools',
  }),
  messages: [{
    role: 'user',
    content: `My tests are failing intermittently. Only happens in CI, not locally.
             Repository: Node.js app with Jest tests.`
  }],
});

// Agent provides systematic debugging approach:
// 1. Analyzes test files
// 2. Checks CI configuration  
// 3. Identifies likely race conditions
// 4. Suggests specific fixes
```

### Custom Tool Integration

```typescript
// Create custom tools in ./my-tools/analyze-bundle.js
// The agent can discover and use these automatically

import { generateText } from 'ai';
import { ampCode } from 'amp-ai-sdk-provider';

const result = await generateText({
  model: ampCode({
    cwd: process.cwd(),
    toolbox: './my-tools',
    dangerouslyAllowAll: true,
  }),
  messages: [{
    role: 'user',
    content: 'Analyze my webpack bundle and suggest optimizations'
  }],
});

// Agent uses your custom bundle analysis tools plus built-in capabilities
```

## Tool Management

### Built-in Tools
Amp agents come with development tools for:
- File system operations
- Code analysis and formatting  
- Git operations
- Package management
- Process execution

### Custom Tools
Create executable scripts in your toolbox directory:

```bash
my-tools/
├── analyze-deps.js     # Custom dependency analyzer
├── format-sql.py      # SQL formatter  
└── check-security.sh  # Security scanner
```

The agent automatically discovers and can invoke these tools based on context.

### Security Settings

```typescript
// 🔒 SAFE: Explicit tool permissions (recommended)
ampCode({
  toolbox: './tools',
  dangerouslyAllowAll: false,
})

// ⚠️ PERMISSIVE: Allow all tools (use with caution)
ampCode({
  toolbox: './tools', 
  dangerouslyAllowAll: true,
})
```

## Comparison: Agent vs Traditional LLM

| Traditional LLM Provider | Amp Coding Agent Provider |
|-------------------------|---------------------------|
| Text in → Text out | Context + Tools → Intelligent Actions |
| Generic responses | Project-aware solutions |
| No tool access | Custom tool execution |
| Stateless | Working directory context |
| Simple chat | Multi-step reasoning |

## Environment Variables

- `AMP_API_KEY` - Your Amp API key (required)
- `AMP_BASE_URL` - Custom Amp instance URL (optional)

## TypeScript Support

Full TypeScript support with intelligent type inference:

```typescript
import type { AmpAgentSettings, AmpChatSettings } from 'amp-ai-sdk-provider';

// Type-safe agent configuration
const agentConfig: AmpAgentSettings = {
  cwd: process.cwd(),
  toolbox: './tools',
  dangerouslyAllowAll: false,
  systemPrompt: 'TypeScript expert focused on type safety',
};
```

## Migration from Generic Providers

### Before (Generic LLM)
```typescript
import { openai } from '@ai-sdk/openai';

const model = openai('gpt-4');
// Limited to text generation
```

### After (Coding Agent)
```typescript
import { ampCode } from 'amp-ai-sdk-provider';

const model = ampCode({
  cwd: process.cwd(),
  toolbox: './dev-tools',
});
// Full coding agent capabilities
```

## Streaming & Tool Execution

```typescript
import { streamText } from 'ai';
import { ampCode } from 'amp-ai-sdk-provider';

const stream = streamText({
  model: ampCode({
    cwd: process.cwd(),
    toolbox: './tools',
  }),
  messages: [{
    role: 'user',
    content: 'Refactor this component to use React hooks'
  }],
});

// Stream shows tool execution progress and results
for await (const part of stream.textStream) {
  console.log(part);
}
```

## Contributing

This provider is part of the [Amp](https://ampcode.com) project. See the main repository for contribution guidelines.

## License

MIT

---

**Ready to supercharge your coding workflow?** Get started with Amp's coding agent capabilities today!
