# GitGuard

A smart Git commit hook and CLI tool that helps maintain high-quality, consistent commit messages using AI.

## Quick Start

No installation needed! Use directly with `npx` or `yarn dlx`:

```bash
# Using npx (npm)
npx @siteed/gitguard hook install --global

# Using yarn dlx
yarn dlx @siteed/gitguard hook install --global
```

## Features

### 🛠️ Multiple Usage Modes

1. **Git Hook Mode**
   - Automatically formats and validates commits
   - Integrates with your git workflow
   ```bash
   npx @siteed/gitguard hook install --global
   git commit -m "your message"  # Hook will format automatically
   ```

2. **CLI Mode**
   - Format messages directly
   - Check commit history
   - Analyze repository patterns
   ```bash
   # Format a message
   npx @siteed/gitguard format "update login form"
   
   # Check last commit
   npx @siteed/gitguard check
   
   # Analyze repository
   npx @siteed/gitguard analyze
   ```

3. **Programmatic Usage**
   ```typescript
   import { formatMessage } from '@siteed/gitguard';
   
   const formatted = await formatMessage({
     message: "update login form",
     cwd: process.cwd()
   });
   ```

### 🤖 Smart Features

- 🎯 **Smart Repository Detection**: 
  - Automatically detects monorepo vs standard repository structure
  - Adapts commit message format accordingly
- 🤖 **Multi-Provider AI Suggestions**: 
  - Azure OpenAI (with fallback model support)
  - Local Ollama models
- 📦 **Repository-Aware Formatting**:
  - Monorepo: Enforces package scopes and detects cross-package changes
  - Standard Repos: Uses conventional commits without forcing scopes

## Installation Options

### 1. Temporary Usage (Recommended)
```bash
# Run commands directly without installation
npx @siteed/gitguard <command>
yarn dlx @siteed/gitguard <command>
```

### 2. Global Installation
```bash
# Install globally
npm install -g @siteed/gitguard
yarn global add @siteed/gitguard

# Now you can use directly
gitguard <command>
```

### 3. Project Installation
```bash
# Install in your project
npm install --save-dev @siteed/gitguard
yarn add -D @siteed/gitguard

# Add to package.json scripts
{
  "scripts": {
    "commit": "gitguard format",
    "prepare": "gitguard hook install"
  }
}
```

## CLI Commands

```bash
# Hook Management
gitguard hook install [--global]    # Install git hooks
gitguard hook uninstall [--global]  # Remove git hooks

# Message Formatting
gitguard format "your message"      # Format a commit message
gitguard check                      # Check last commit
gitguard analyze                    # Analyze repository patterns

# Configuration
gitguard init                       # Initialize configuration
gitguard config check              # Validate configuration
```

## Configuration

GitGuard can be configured using:
- TypeScript/JavaScript: `gitguard.config.ts` or `gitguard.config.js`
- JSON: `.gitguard/config.json`
- Environment variables

### TypeScript Configuration
```typescript
import { defineConfig } from '@siteed/gitguard';

export default defineConfig({
  auto_mode: false,        // Skip prompts and use automatic formatting
  use_ai: false,          // Enable/disable AI suggestions
  ai_provider: "azure",   // "azure" or "ollama"
  
  azure: {
    endpoint: "",         // Azure OpenAI endpoint
    deployment: "",       // Primary deployment
    fallback_deployment: "", // Fallback model
    api_version: "",      // API version
  },
  
  ollama: {
    host: "http://localhost:11434",
    model: "codellama",
  },
  
  debug: false
});
```

// ... (keep existing Configuration sections) ...

## Husky Integration

If you're using Husky, you can integrate GitGuard in two ways:

### 1. Direct Integration (Recommended)
```bash
# Install husky
yarn add -D husky
# Add GitGuard hook
npx @siteed/gitguard hook install
```

### 2. Manual Integration
Add to your prepare-commit-msg hook:

```typescript:.husky/prepare-commit-msg
#!/usr/bin/env node
import { prepareCommit } from '@siteed/gitguard/hooks';

prepareCommit({ messageFile: process.argv[2] })
  .catch((error) => {
    console.error('Hook failed:', error);
    process.exit(1);
  });
```

## Examples

### Basic Usage
```bash
# Format a message
npx @siteed/gitguard format "update login form"
# Output: feat(auth): update login form

# Check last commit
npx @siteed/gitguard check

# Install hooks
npx @siteed/gitguard hook install --global
```

### Advanced Usage
```bash
# Analyze repository for patterns
npx @siteed/gitguard analyze

# Format with specific scope
npx @siteed/gitguard format "update colors" --scope design-system

# Check commit history
npx @siteed/gitguard check --last 10
```

// ... (keep rest of troubleshooting section) ...
```

The key changes are:
1. Emphasized temporary usage with `npx`/`yarn dlx`
2. Added CLI mode and programmatic usage
3. Reorganized installation options by preference
4. Added more examples and use cases
5. Updated Husky integration with simpler options
6. Added comprehensive CLI commands section

Would you like me to continue with any other sections or add more examples?
