# GitGuard Template System

## Overview
GitGuard's template system provides type-safe, discoverable templates for AI operations with built-in Handlebars support.

## Implementation Status

✅ Completed:
1. Core Types
   - Template interfaces
   - AI configuration types
   - Variable definitions
2. Template Discovery
   - Git root-based paths
   - Multiple location support
   - YAML parsing
3. Handlebars Integration
   - Basic helpers (json, joinLines, formatDate)
   - Type-safe rendering
4. Template Registry Implementation
   - Template loading
   - Type validation
   - Template lookup

🚧 Current Sprint:
1. Integration with Existing AI Controllers
   - Update CommitAIController to use templates
   - Update BranchAIController to use templates
   - Add fallback to default prompts
2. Template Migration
   - Move existing prompts to template files
   - Add default templates to package
3. Configuration Updates
   - Add template override support
   - Add template discovery paths

⏳ Next Steps:
1. Template Integration Strategy:
   ```typescript
   // Template Registry Usage
   const registry = new TemplateRegistry({
     paths: config.templates?.paths,
     logger
   });

   // In AI Controllers
   const template = await registry.getTemplate({
     type: "commit",
     format: "api",
     id: config.templates?.commit?.id ?? "default"
   });
   ```

2. Default Template Structure:
   ```
   templates/
     commit/
       default.api.yaml    # JSON output
       default.human.yaml  # Text output
     pr/
       default.api.yaml
       default.human.yaml
     split/
       commit.api.yaml
       pr.api.yaml
   ```

3. Integration Tasks:
   - Add template registry to AI service initialization
   - Update prompt generation to use templates
   - Add template variable validation
   - Implement template caching
   - Add template override support
   - Update tests for template integration

4. Breaking Changes Mitigation:
   - Keep existing prompt utils as fallback
   - Add gradual migration path
   - Maintain backward compatibility
   - Add deprecation warnings

## Integration Strategy

### Phase 1: Template Registry Integration
1. Add TemplateRegistry to AI Controllers
2. Implement getTemplate with fallback
3. Add template variable mapping

### Phase 2: Default Templates
1. Convert existing prompts to templates
2. Add default templates to package
3. Implement template discovery

### Phase 3: Configuration Updates
1. Add template configuration
2. Add template override support
3. Update documentation

## Example Integration

### Template Registry Usage
```typescript
interface TemplateRegistryOptions {
  paths?: string[];
  logger: Logger;
}

class TemplateRegistry {
  async getTemplate(params: {
    type: PromptType;
    format: PromptFormat;
    id?: string;
  }): Promise<PromptTemplate | null>;
}
```

### AI Controller Integration
```typescript
class CommitAIController {
  private async generatePrompt(params: GeneratePromptParams): Promise<string> {
    const template = await this.registry.getTemplate({
      type: "commit",
      format: params.format ?? "api",
      id: this.config.templates?.commit?.id
    });

    if (template) {
      return this.registry.renderTemplate({
        template,
        variables: {
          files: params.files,
          message: params.message,
          diff: params.bestDiff.content,
          // ... other variables
        }
      });
    }

    // Fallback to existing prompt generation
    return generateCommitSuggestionPrompt({
      files: params.files,
      message: params.message ?? "",
      diff: params.bestDiff.content,
      logger: this.logger,
      needsDetailedMessage: params.result.complexity.needsStructure,
      format: params.format
    });
  }
}
```

### Configuration Updates
```typescript
interface TemplateConfig {
  paths?: string[];
  commit?: {
    id?: string;
    format?: PromptFormat;
  };
  pr?: {
    id?: string;
    format?: PromptFormat;
  };
}

interface Config {
  // ... existing config ...
  templates?: TemplateConfig;
}
```
