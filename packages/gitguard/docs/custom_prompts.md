# Custom Prompts Guide

GitGuard provides a flexible template system for customizing AI prompts. This guide explains how to configure, customize, and create your own templates.

## Getting Started

The first step to customizing templates is initializing them in your desired location:

```bash
# Initialize templates at project level (in .gitguard/templates/)
gitguard template --init

# Initialize templates globally (in ~/.gitguard/templates/)
gitguard template --init --global
```

### Template Precedence

GitGuard supports both project-level and user-level templates:

1. **Project Templates** (`.gitguard/templates/`)
   - Specific to current repository
   - Highest precedence
   - Version controlled with project
   - Ideal for enforcing project-specific conventions

2. **Global Templates** (`~/.gitguard/templates/`)
   - Applied to all projects
   - Lower precedence than project templates
   - User-specific customizations
   - Great for personal preferences

This hierarchy allows you to:
- Set personal defaults globally
- Override specific templates per project
- Share project-specific templates via version control
- Use GitGuard without modifying project files

## Template Types

GitGuard includes 4 core workflows, each with two formats:

| Workflow | API Format | Human Format | Description |
|----------|------------|--------------|-------------|
| `commit` | Structured JSON output | Interactive CLI dialogue | Generate commit messages |
| `commit-split` | Structured split suggestions | Step-by-step commands | Split large commits |
| `pr` | Structured PR content | Markdown-ready description | Generate PR descriptions |
| `pr-split` | Structured PR split plan | Migration commands | Split complex PRs |

### API vs Human Format

- **API Format** (.api.yml)
  - Structured JSON responses
  - Designed for programmatic processing
  - Ideal for CI/CD integration
  - Used with direct API calls

- **Human Format** (.human.yml)
  - Natural language responses
  - Markdown-formatted output
  - Ideal for clipboard workflow
  - Used with web interfaces (ChatGPT, Claude)

## Template Structure

Templates are YAML files with the following structure:

```yaml
type: commit|pr|split-commit|split-pr
format: api|human
title: "Template Title"
version: "1.0"
active: true
ai:
  provider: openai|anthropic|azure|custom
  model: "model-name"
  temperature: 0.1
systemPrompt: |
  Optional system context for the AI -- only used for API format templates -- NOT RECOMMENDED to modify
template: |
  Please suggest 3 conventional commit messages for these changes:
  {{#each files}}
    - {{this.path}} (+{{this.additions}} -{{this.deletions}})
  {{/each}}
  
  {{#if message}}
    Original message: "{{message}}"
  {{/if}}

  Git Diff:
  {{diff}}

  Guidelines:
  1. Follow conventional commits format: type(scope): description
  2. Be specific about the changes
  3. Keep descriptions concise but informative
```

> 💡 For implementation details, see:
> - [template-registry.ts](../src/services/template/template-registry.ts) - Core template loading and management
> - [templates.type.ts](../src/types/templates.type.ts) - Template type definitions
> - [handlebars-helpers.util.ts](../src/utils/handlebars-helpers.util.ts) - Available template helpers
> - [shared-ai-controller.util.ts](../src/utils/shared-ai-controller.util.ts) - Template rendering and AI interaction


### Available Variables

Common variables available in all templates:
- `files` - Array of changed files
- `diff` - Git diff content
- `baseBranch` - Target branch name

Type-specific variables:
- Commit: `message`, `scope`, `complexity`
- PR: `commits`, `template`, `options`

## Available Helpers

Handlebars helpers for template formatting:

### Comparison Helpers
- `{{eq a b}}` - Equal comparison (a === b)
- `{{ne a b}}` - Not equal comparison (a !== b)
- `{{lt a b}}` - Less than (a < b)
- `{{gt a b}}` - Greater than (a > b)
- `{{lte a b}}` - Less than or equal (a <= b)
- `{{gte a b}}` - Greater than or equal (a >= b)

### Array Helpers
- `{{length array}}` - Get array length
- `{{first array}}` - Get first element
- `{{last array}}` - Get last element
- `{{includes array value}}` - Check if array includes value

### String Helpers
- `{{lowercase str}}` - Convert to lowercase
- `{{uppercase str}}` - Convert to uppercase
- `{{capitalize str}}` - Capitalize first letter

### Math Helpers
- `{{add a b}}` - Addition
- `{{subtract a b}}` - Subtraction
- `{{multiply a b}}` - Multiplication
- `{{divide a b}}` - Division

### Conditional Helpers
- `{{and a b ...}}` - Logical AND
- `{{or a b ...}}` - Logical OR
- `{{not value}}` - Logical NOT

### Utility Helpers
- `{{json object}}` - Convert to JSON string

## Customizing Templates

### Override Existing Template

1. Initialize templates in desired location
2. Modify template files as needed
3. Test with validation command:
```bash
# Validate specific template
gitguard template --validate --filter commit.api
```

### Template Parameters

The following parameters can be customized in templates, though some should be modified with caution:

```yaml
type: commit
format: api
title: "Template Title"
version: "1.0"
active: true
ai:
  provider: openai|anthropic|azure|custom
  model: "model-name"
  temperature: 0.1
systemPrompt: |
  Optional system context for the AI
template: |
  Your main prompt template here
```

> 📝 See [templates.type.ts](../src/types/templates.type.ts) for complete variable definitions and 
> [shared-ai-controller.util.ts](../src/utils/shared-ai-controller.util.ts) for how variables are passed to templates


#### Important Notes on Parameters

- **temperature** (default: 0.1)
  - Controls AI response randomness
  - Keep low for consistent, predictable outputs
  - Changing may cause inconsistent or invalid responses
  - Not recommended to modify for API format templates

- **systemPrompt**
  - Provides context to the AI model
  - Modification may break expected response formats
  - Critical for API format templates
  - Changes not recommended unless you understand the impact

### Disable Template

Set `active: false` in template file:
```yaml
type: commit
format: api
active: false
```

## Creating New Templates

1. Create new YAML file in `.gitguard/templates/`
2. Define required fields (type, format, template)
3. Add to version control
4. Templates are automatically discovered

### Debug Templates

```bash
# Validate all templates
gitguard template --validate

# Test specific template
gitguard template --validate --filter commit.api

# Preview template output
gitguard template --validate --preview
```


### API Debugging

GitGuard supports debugging API prompts through the `apiClipboard` configuration option:

```json
{
  "ai": {
    "apiClipboard": true  // Enables API prompt debugging (default: true)
  }
}
```

When enabled, this allows you to:
1. View the exact prompt being sent to the AI
2. Test prompts with different AI providers
3. Validate response formats
4. Debug template issues

This is particularly useful when:
- Developing new templates
- Troubleshooting AI responses
- Testing template modifications
- Validating API format outputs


## Best Practices

1. Keep prompts focused and specific
2. Use appropriate format for use case
3. Include clear instructions for AI
4. Test templates thoroughly
5. Version control your templates
6. Document custom templates
