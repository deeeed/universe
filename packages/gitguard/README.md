# GitGuard

A smart Git commit hook that helps maintain high-quality, consistent commit messages using AI.

## Installation

### Prerequisites
- Python 3.7 or higher (`python3 --version` to check)
- git
- curl
- pip3

### Quick Install (Recommended)
```bash
curl -sSL https://raw.githubusercontent.com/deeeed/universe/main/packages/gitguard/install.sh | bash -c "CURL_INSTALL=1 bash"
```

### Troubleshooting Installation
If the installation fails, the script will provide specific instructions. Common issues:

1. **Missing Dependencies**
   - Ubuntu/Debian: `sudo apt update && sudo apt install python3 python3-pip git curl`
   - MacOS: `brew install python3 git curl`
   - Windows: `choco install python3 git curl`

2. **Not in a Git Repository**
   - Ensure you run the install command from your git project root
   - Or initialize a new repo: `git init`

3. **Permission Issues**
   - Check write permissions to `.git/hooks` directory
   - Verify pip installation permissions

4. **Testing Installation**
   ```bash
   git commit -m "test" --allow-empty
   ```

### Development Install
If you're working on GitGuard itself:
```bash
git clone https://github.com/deeeed/universe.git
cd universe
yarn install
cd packages/gitguard
./install.sh
```

## Features

- 🎯 **Smart Repository Detection**: 
  - Automatically detects monorepo vs standard repository structure
  - Adapts commit message format accordingly
- 🤖 **Multi-Provider AI Suggestions**: Offers intelligent commit message suggestions using:
  - Azure OpenAI (with fallback model support)
  - Local Ollama models
- 📦 **Repository-Aware Formatting**:
  - Monorepo: Enforces package scopes and detects cross-package changes
  - Standard Repos: Uses conventional commits without forcing scopes
- ✨ **Conventional Commits**: 
  - Enforces conventional commit format
  - Monorepo: `type(scope): description`
  - Standard: `type: description` (scope optional)
- 🔍 **Smart Change Analysis**: 
  - Analyzes file changes to suggest appropriate commit types
  - Groups changes by directory type in standard repos
  - Groups by package in monorepos
- 🚨 **Change Cohesion Checks**:
  - Monorepo: Alerts when changes span multiple packages
  - Standard: Warns about changes across unrelated components

## Security Features

### Secret Detection
GitGuard automatically scans for:
- API Keys (AWS, Google, Azure, etc.)
- Authentication Tokens (GitHub, JWT, etc.)
- Private Keys and Certificates
- Database Connection Strings
- Environment Variables
- Credentials in URLs
- Cryptocurrency Private Keys
- Social Media Tokens

### File Pattern Detection
Warns about newly added sensitive files:
- Environment Files (.env, config.json, etc.)
- Key Files (.pem, .key, certificates)
- Log Files
- Database Files
- Cache and Build Directories

## How It Works

1. When you create a commit, GitGuard:
   - Detects repository type (monorepo vs standard)
   - Analyzes your staged changes
   - Performs security checks for secrets and sensitive files
   - Suggests appropriate commit structure based on repository type
   - Offers AI suggestions for commit messages

2. Repository-specific behavior:
   - Monorepo:
     - Enforces package scopes
     - Warns about cross-package changes
     - Adds "Affected packages" section for multi-package commits
   - Standard Repository:
     - Makes scopes optional
     - Groups changes by directory type (src, test, docs, etc.)
     - Focuses on change type and description clarity

## Example Usage

```bash
# Monorepo commit
git commit -m "update login form"
# GitGuard will transform to: feat(auth): update login form

# Standard repo commit
git commit -m "update login form"
# GitGuard will transform to: feat: update login form

# Monorepo multi-package changes
git commit -m "update theme colors"
# GitGuard will warn about multiple packages and suggest:
# style(design-system): update theme colors
#
# Affected packages:
# - @siteed/design-system
# - @siteed/mobile-components

# Standard repo complex changes
git commit -m "update authentication"
# GitGuard will suggest:
# feat: update authentication
#
# Changes:
# Source:
#   • src/auth/login.ts
#   • src/auth/session.ts
# Tests:
#   • tests/auth/login.test.ts
```

## Testing Security Features

You can test GitGuard's security features using the provided sample scripts:

```bash
# Create sample files
./create-samples.sh

# Test security detection
echo "AWS_KEY=AKIAXXXXXXXXXXXXXXXX" >> .env
git add .env
git commit -m "add config"  # Should be blocked

# Test sensitive file detection
git add packages/core/src/
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
