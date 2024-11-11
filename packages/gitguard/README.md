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

