# @siteed/guardian

A smart git commit hook that uses AI to improve your commit messages and optionally split commits in monorepos.

## Quick Start

```bash
# Install
npm install -D @siteed/guardian

# Initialize (adds the commit hook automatically)
npx guardian init
```

That's it! Now just commit as usual, and Guardian will help improve your commits.

## How it Works

```bash
# Your normal git workflow
git add .
git commit -m "update auth stuff"

# Guardian intercepts via prepare-commit-msg hook:
🔍 Analyzing changes...

📝 Suggested message:
feat(auth): implement OAuth2 authentication flow
- Add Google OAuth integration
- Update user session handling
- Add authentication types

? Accept this message? [Y/n]
```

## Monorepo Detection

```bash
# When changes span multiple packages:
git add .
git commit -m "add login"

🔍 Detected changes in multiple packages

📦 Suggested splits:
1. feat(auth): implement OAuth service
2. feat(ui): add login component
3. feat(api): create auth endpoints

? Create separate commits? [Y/n]
```

## Configuration

`.guardianrc.json` (optional):
```json
{
  "ai": {
    // Required: Your OpenAI API key
    "apiKey": "sk-xxx",
    
    // Optional: Custom prompts
    "prompts": {
      "analyze": "Custom analysis prompt",
      "improve": "Custom improvement prompt"
    }
  },

  // Optional: Hook behavior
  "hooks": {
    "autoAccept": false,    // Accept suggestions without asking
    "allowSkip": true,      // Allow skipping with --no-verify
    "splitCommits": true    // Enable auto-split for monorepos
  }
}
```

Or use environment variables:
```bash
GUARDIAN_AI_KEY=sk-xxx
GUARDIAN_AUTO_ACCEPT=true
```

## Core Git Hooks Used

```bash
# .git/hooks/prepare-commit-msg
#!/bin/sh
npx guardian improve "$1"

# .git/hooks/pre-commit (optional, for split detection)
#!/bin/sh
npx guardian check-split
```

## Examples

### Single Package Changes
```bash
# Before:
$ git commit -m "fix bug"

# Guardian suggests:
fix(auth): resolve token expiration validation
- Fix JWT verification logic
- Add proper error handling
- Update error messages

# After user accepts:
[main abc123d] fix(auth): resolve token expiration validation
 3 files changed, 25 insertions(+), 10 deletions(-)
```

### Multi-Package Changes
```bash
# Before:
$ git commit -m "add login"

# Guardian analyzes:
📦 Changes detected in:
- packages/auth/src/oauth.ts
- packages/ui/components/Login.tsx
- packages/api/routes/auth.ts

Suggested commits:
1. feat(auth): implement OAuth authentication
2. feat(ui): add login component
3. feat(api): create auth endpoints

# After user accepts:
[main def456e] feat(auth): implement OAuth authentication
[main ghi789f] feat(ui): add login component
[main jkl012m] feat(api): create auth endpoints
```

## Key Features

- 🎯 **Simple Installation**: Just a commit hook
- 🤖 **Smart Analysis**: AI-powered commit improvements
- 📦 **Monorepo Aware**: Automatic package detection
- 🔄 **Split Commits**: Optional multi-package commit splitting
- ⚡ **Fast**: Quick analysis and suggestions
- 🎨 **Customizable**: Configure prompts and behavior

## Commit Analysis Prompt

```typescript
const defaultAnalysisPrompt = `
Analyze these git changes and suggest a conventional commit message:

DIFF:
{{diff}}

GUIDELINES:
1. Use conventional commit format (type(scope): description)
2. Be specific and concise
3. List main changes as bullet points
4. Detect breaking changes
5. Keep subject under 72 chars

{{#if isMonorepo}}
MONOREPO CONTEXT:
- Changed packages: {{changedPackages}}
- Package structure: {{packagePaths}}
{{/if}}
`;
```

## Advanced Usage

### Skip Guardian for a commit
```bash
git commit -m "quick fix" --no-verify
```

### Custom prompts
```json
{
  "ai": {
    "prompts": {
      "analyze": "Custom prompt that handles {{diff}}"
    }
  }
}
```

### CI/CD Usage
```bash
# Disable interactivity in CI
GUARDIAN_CI=true git commit -m "..."
```

Would you like me to:
1. Add more hook implementation details?
2. Show more prompt examples?
3. Expand the configuration options?
4. Add debugging information?
