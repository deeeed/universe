This document outlines the API for the GitGuard package.


# Commands
## analyze
- analyze --ai: Analyze changes with AI suggestions
- analyze --message: Analyze with commit message
- analyze --unstaged: Include unstaged changes
- analyze --staged: Include staged changes
- analyze --all: Analyze both staged and unstaged
- analyze --commit: Create commit after analysis

## hooks
- hooks:install: Install GitGuard hooks
- hooks:uninstall: Uninstall GitGuard hooks

## status
- status: Show GitGuard status

## init
- init: Initialize GitGuard configuration

# Services

## CommitService
### analyze
Analyzes commit changes and provides comprehensive analysis:
- Validates commit message format
- Checks security issues
- Analyzes code cohesion
- Generates AI suggestions if enabled
- Provides split recommendations

### getSuggestions
Generates AI-powered commit message suggestions:
- Uses file changes and diff to generate context
- Provides multiple conventional commit format suggestions
- Includes explanations for each suggestion
- Respects monorepo scoping

### formatCommitMessage
Formats commit message to conventional commit format:
- Ensures message adheres to specified pattern
- Provides feedback on formatting issues

### analyzeCommitCohesion
Checks if commit should be split:
- Evaluates changes for cohesion and split potential

## PRService
- analyze: Analyze pull request changes
- generateAIDescription: Generate PR description using AI
- generateSplitSuggestion: Suggest PR split if too large

## ReporterService
- generateReport: Create analysis report
- generateMarkdownReport: Create markdown formatted report
- generateConsoleReport: Create console formatted report
