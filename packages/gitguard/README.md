# GitGuard Commit Hook

A smart Git commit hook that helps maintain high-quality, consistent commit messages across your monorepo.

## Features

- 🎯 **Automatic Scope Detection**: Automatically detects the package scope based on changed files
- 🤖 **Multi-Provider AI Suggestions**: Offers intelligent commit message suggestions using:
  - Azure OpenAI (with fallback model support)
  - Local Ollama models
- 📦 **Monorepo Awareness**: Detects changes across multiple packages and suggests appropriate formatting
- ✨ **Conventional Commits**: Enforces conventional commit format (`type(scope): description`)
- 🔍 **Change Analysis**: Analyzes file changes to suggest appropriate commit types
- 🚨 **Multi-Package Warning**: Alerts when changes span multiple packages, encouraging atomic commits

## How It Works

1. When you create a commit, the hook analyzes your staged changes
2. If changes span multiple packages, it warns you and suggests splitting the commit
3. You can request AI suggestions, which will provide 3 different commit message options with explanations
4. If you skip AI suggestions or prefer manual input, it helps format your message with the correct scope and type
5. For multi-package changes, it automatically adds an "Affected packages" section

## Example Usage

```bash
# Regular commit
git commit -m "update login form"
# GitGuard will transform to: feat(auth): update login form

# Multi-package changes
git commit -m "update theme colors"
# GitGuard will warn about multiple packages and suggest:
# style(design-system): update theme colors
#
# Affected packages:
# - @siteed/design-system
# - @siteed/mobile-components
```

## Installation

1. Install the package in your monorepo:
```bash
yarn add -D @siteed/gitguard
```

2. Add to your git hooks (using husky or direct installation):
```bash
# Using husky
yarn husky add .husky/prepare-commit-msg 'yarn gitguard $1'

# Direct installation
cp node_modules/@siteed/gitguard/gitguard-prepare.py .git/hooks/prepare-commit-msg
chmod +x .git/hooks/prepare-commit-msg
```

## Configuration

GitGuard can be configured using:
- Global config: `~/.gitguard/config.json`
- Local repo config: `.gitguard/config.json`
- Environment variables

### Configuration Options

```json
{
  "auto_mode": false,        // Skip prompts and use automatic formatting
  "use_ai": false,          // Enable/disable AI suggestions by default
  "ai_provider": "azure",   // AI provider to use ("azure" or "ollama")
  
  // Azure OpenAI Configuration
  "azure_endpoint": "",     // Azure OpenAI endpoint
  "azure_deployment": "",   // Primary Azure OpenAI deployment name
  "azure_fallback_deployment": "", // Fallback model if primary fails
  "azure_api_version": "",  // Azure OpenAI API version
  
  // Ollama Configuration
  "ollama_host": "http://localhost:11434", // Ollama API host
  "ollama_model": "codellama", // Ollama model to use
  
  "debug": false           // Enable debug logging
}
```

### Environment Variables

- `GITGUARD_AUTO`: Enable automatic mode (1/true/yes)
- `GITGUARD_USE_AI`: Enable AI suggestions (1/true/yes)
- `GITGUARD_AI_PROVIDER`: AI provider to use ("azure" or "ollama")

Azure OpenAI Variables:
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI endpoint
- `AZURE_OPENAI_API_KEY`: Azure OpenAI API key
- `AZURE_OPENAI_DEPLOYMENT`: Azure OpenAI deployment name
- `AZURE_OPENAI_API_VERSION`: Azure OpenAI API version

Ollama Variables:
- `OLLAMA_HOST`: Ollama API host
- `OLLAMA_MODEL`: Ollama model to use

Debug Variables:
- `GITGUARD_DEBUG`: Enable debug logging (1/true/yes)

### AI Provider Configuration

#### Azure OpenAI
GitGuard supports Azure OpenAI with fallback model capability. If the primary model fails (e.g., rate limits), it will automatically try the fallback model.

```json
{
  "ai_provider": "azure",
  "azure_deployment": "gpt-4",
  "azure_fallback_deployment": "gpt-35-turbo"
}
```

#### Ollama
For local AI processing, GitGuard supports Ollama. Make sure Ollama is running.
