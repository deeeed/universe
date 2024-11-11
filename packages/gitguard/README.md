# GitGuard

A smart Git tool that helps maintain high-quality commits and PRs using AI.

## AI Quick Start

### Commit Messages

```bash
# Using npx (npm)
npx @siteed/gitguard commit analyze
npx @siteed/gitguard commit create --ai

# Using yarn dlx (yarn berry)
yarn dlx @siteed/gitguard commit analyze
yarn dlx @siteed/gitguard commit create --ai
```

### Branch Management

```bash
npx @siteed/gitguard branch 
npx @siteed/gitguard branch --ai --split
```

## Features

### 🛠️ Smart Commit Management

1. **Commit Analysis**
   - Analyze changes before committing
   - Get AI-powered suggestions
   - Detect security issues
   ```bash
   # Analyze staged changes
   npx @siteed/gitguard commit analyze
   
   # Get AI suggestions
   npx @siteed/gitguard commit suggest
   
   # Create commit with analysis
   npx @siteed/gitguard commit create -m "feat: update login"
   ```

2. **Branch Management**
   - Analyze branch changes
   - Create and manage PRs
   - Smart package split detection
   ```bash
   # Analyze branch
   npx @siteed/gitguard branch analyze
   
   # Create PR with analysis
   npx @siteed/gitguard branch pr --title "My PR"
   ```

3. **Security Features**
   - Secret detection
   - Large file checks
   - PR template validation
   ```bash
   # Run security checks
   npx @siteed/gitguard commit analyze --security
   ```

### 🤖 AI Integration

- **Multi-Provider Support**: 
  - Azure OpenAI
  - OpenAI
  - Local Ollama models
- **Smart Features**:
  - Commit message suggestions
  - PR description generation
  - Change analysis
  - Package split recommendations

### 📦 Repository Intelligence

- Automatic monorepo detection
- Smart package change analysis
- Cross-package dependency tracking
- PR template management

## Configuration

GitGuard can be configured both globally and locally using the `init` command:

```bash
# Initialize local configuration (in current repository)
npx @siteed/gitguard init
# Initialize global configuration (user-level)
npx @siteed/gitguard init -g

# View all configurations
npx @siteed/gitguard status

# View only global config
npx @siteed/gitguard status --global

# View only local config
npx @siteed/gitguard status --local
```

The status command will show:

- Global configuration (if exists)
- Local configuration (if exists)
- Effective configuration (merged global and local)
- Quick actions and next steps

Configuration precedence:

- Local configuration (repository-specific)
- Global configuration (user-level)
- Default values

## Configuration Reference

Create a `.gitguard/config.json` file in your repository or home directory. The configuration supports JSON with comments (JSONC):

```json
{
  // All configuration is optional and will use smart defaults if not provided
  // This is a complete reference of all available options

  // Git-related configuration
  "git": {
    // Base branch for comparisons (default: "main")
    "baseBranch": "main",
    // Patterns to detect monorepo packages (default: ["packages/", "apps/", "libs/"])
    "monorepoPatterns": ["packages/*", "apps/*"],
    // Patterns to ignore in all git operations (default: [])
    "ignorePatterns": ["*.lock", "dist/*"],
    "github": {
      // GitHub token can be set here but it's recommended to use GITHUB_TOKEN 
      // or GH_TOKEN environment variable instead
      "token": "your-token-here",
      "enterprise": {
        "url": "https://github.yourcompany.com"
      }
    }
  },

  // Analysis configuration
  "analysis": {
    // Maximum number of files in a commit (default: 500)
    "maxCommitSize": 500,
    // Maximum lines in a single file (default: 800)
    "maxFileSize": 800,
    // Enable conventional commit checking (default: true)
    "checkConventionalCommits": true,
    // Complexity analysis options
    "complexity": {
      // TODO See: complexity threshold algorithm for reference
      "structureThresholds": {
        "scoreThreshold": 10,     // Total complexity score that triggers restructuring
        "reasonsThreshold": 2    // Number of reasons that triggers restructuring
      },
    }
  },

  // Security checks configuration
  "security": {
    // Enable/disable all security checks (default: true)
    "enabled": true,
    "rules": {
      "secrets": {
        // Enable/disable secrets detection (default: true)
        "enabled": true,
        // Severity level for secrets (default: "high")
        "severity": "high",
        // Block PR on secret detection (default: true)
        "blockPR": true,
        // Additional patterns to detect secrets
        // These are combined with built-in patterns, not replacing them
        // Built-in patterns detect:
        // - AWS keys (AKIA...)
        // - API keys and tokens
        // - Database credentials
        // - Private keys
        // - GitHub tokens (gh[ps]_...)
        // - Slack tokens (xox...)
        // - Stripe keys (sk_live_...)
        // and more...
        "patterns": []
      },
      "files": {
        // Enable/disable sensitive file detection (default: true)
        "enabled": true,
        // Severity level for sensitive files (default: "high")
        "severity": "high",
        // Additional patterns to detect sensitive files
        // These are combined with built-in patterns, not replacing them
        // Built-in patterns detect:
        // - Environment files (.env*)
        // - Config files with secrets
        // - Key files (.pem, .key, etc)
        // - Certificate files
        // - Database files
        // - Log files
        "patterns": []
      }
    }
  },

  // AI integration settings
  "ai": {
    // Enable/disable AI features (default: true)
    "enabled": true,
    // Choose provider: "azure", "openai", or "ollama"
    "provider": "azure",
    // Maximum tokens for AI prompts (default: 32000)
    "maxPromptTokens": 32000,
    // Maximum cost per prompt in USD (default: 0.1)
    "maxPromptCost": 0.1,
    // Azure OpenAI configuration
    "azure": {
      "endpoint": "https://your-endpoint.openai.azure.com",
      "deployment": "your-deployment",
      "apiVersion": "2023-05-15",
      // API key can be set here but it's recommended to use 
      // AZURE_OPENAI_API_KEY environment variable instead
      "apiKey": "your-key-here"
    },
    // OpenAI configuration
    "openai": {
      // API key can be set here but it's recommended to use 
      // OPENAI_API_KEY environment variable instead
      "apiKey": "your-key-here",
      "model": "gpt-4",
      "organization": "your-org-id"
    },
    // Ollama configuration (local AI)
    "ollama": {
      "host": "http://localhost:11434",
      "model": "codellama"
    },
    // AI commit details configuration
    "commitDetails": {
      "enabled": true,
      "complexityThreshold": 50,
      "alwaysInclude": false
    }
  },

  // Pull Request configuration
  "pr": {
    "template": {
      // Path to PR template (default: ".github/pull_request_template.md")
      "path": ".github/pull_request_template.md",
      // Require PR template (default: false)
      "required": false,
      // Required sections in PR template
      "sections": {
        "description": true,
        "breaking": true,
        "testing": true,
        "checklist": true
      }
    },
    // Maximum PR size in lines (default: 800)
    "maxSize": 800,
    // Required number of approvals (default: 1)
    "requireApprovals": 1
  },

  // Debug mode for verbose logging (default: false)
  "debug": false,
  // Enable/disable colored output (default: true)
  "colors": true
}
```

### Important Notes

1. **Configuration is Optional**: All settings are optional and will use smart defaults if not provided. You only need to configure what you want to customize.

2. **Security Patterns**:
   - Custom patterns in `security.rules.secrets.patterns` and `security.rules.files.patterns` are **added to** the built-in patterns, not replacing them
   - Built-in patterns provide comprehensive security checks out of the box
   - Custom patterns allow you to add organization-specific checks

3. **Sensitive Values**:
   The following values should preferably be set via environment variables:
   - GitHub Token: Use `GITHUB_TOKEN` or `GH_TOKEN`
   - Azure OpenAI Key: Use `AZURE_OPENAI_API_KEY`
   - OpenAI Key: Use `OPENAI_API_KEY`

4. **Environment Variables**:
   All configuration options can also be set via environment variables. See the Environment Variables section below for details.

