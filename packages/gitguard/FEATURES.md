GitGuard Core Features
Commit-Level Features
Primary Goals

Ensure clear, consistent commit messages
Prevent accidental commits of sensitive data
Guide developers to create focused commits

Key Features

Commit Message Enhancement

AI-powered message suggestions
Conventional commit format validation
Auto-detect scope from changed files


Commit Quality

Detect mixed concerns (changes across unrelated areas)
Suggest splitting commits when changes lack cohesion
Basic security checks (secrets, sensitive files)



Example Flow
bashCopy# Developer makes changes and tries to commit
git add .
git commit -m "update code"

# GitGuard intercepts and suggests:
✨ Detected changes in multiple areas. Suggested messages:
1. feat(auth): add user session timeout
2. fix(api): correct error handling in login
> These changes might be better as separate commits. Split?
PR-Level Features
Primary Goals

Create informative PR descriptions
Identify PRs that should be split
Make code review more efficient

Key Features

PR Description Enhancement

Generate clear descriptions from commits
Highlight key changes and impact
Link related issues/tickets


PR Organization

Detect when PR scope is too large
Suggest logical ways to split the PR
Group related changes for easier review



Example Flow
bashCopy# Developer runs PR analysis
gitguard analyze pr

# GitGuard provides:
📝 Suggested PR Description:
- Add user session timeout feature
- Fix login error handling
- Update API documentation

⚠️ Recommendation:
These changes touch 3 separate features.
Consider splitting into:
1. User Session Management
2. Login Error Handling
3. API Documentation Update
Shared Features

AI Integration

Azure OpenAI or Ollama for suggestions
Context-aware recommendations
Learning from repository patterns


Analytics

Track message improvement rate
Monitor PR split recommendations
Measure adoption and effectiveness



Simple Configuration
jsonCopy{
  "ai": {
    "enabled": true,
    "provider": "azure"
  },
  "commit": {
    "requireConventional": true,
    "suggestSplits": true
  },
  "pr": {
    "maxChanges": 500,
    "suggestSplits": true
  }
}
Success Metrics

Better commit message clarity
More focused PRs
Reduced review cycles
Improved code organization
