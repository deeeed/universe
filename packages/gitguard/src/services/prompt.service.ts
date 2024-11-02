import { FileChange } from "../types/git.types";
import { ServiceOptions } from "../types/service.types";
import { BaseService } from "./base.service";

export class PromptService extends BaseService {
  constructor(params: ServiceOptions) {
    super(params);
  }

  buildCommitPrompt(params: {
    files: FileChange[];
    packages: Record<string, FileChange[]>;
    originalMessage: string;
    diff: string;
  }): string {
    const fileChanges = params.files
      .map((f) => `- ${f.path} (+${f.additions} -${f.deletions})`)
      .join("\n");

    const packageSummary = Object.entries(params.packages)
      .map(([pkg, files]) => {
        const changes = files.reduce(
          (sum, f) => sum + f.additions + f.deletions,
          0,
        );
        return `- ${pkg}: ${files.length} files (${changes} changes)`;
      })
      .join("\n");

    return `Analyze these git changes and suggest commit messages following conventional commits format.

Files Changed:
${fileChanges}

Package Changes:
${packageSummary}

Original message: "${params.originalMessage}"

Git diff:
\`\`\`diff
${params.diff}
\`\`\`

Please provide 3 suggestions in this JSON format:
{
    "suggestions": [
        {
            "message": "complete conventional commit message",
            "explanation": "detailed reasoning for the suggestion",
            "type": "commit type (feat|fix|docs|style|refactor|test|chore)",
            "scope": "affected package or component",
            "description": "clear description of changes"
        }
    ]
}

Guidelines:
1. Follow conventional commits format: type(scope): description
2. Be specific about the changes
3. Keep descriptions concise but informative
4. Include scope when changes affect specific packages
5. Use appropriate type based on the changes`;
  }

  generateCommitSuggestionPrompt(params: {
    files: FileChange[];
    message: string;
  }): string {
    const fileChanges = params.files
      .map((f) => `- ${f.path} (+${f.additions} -${f.deletions})`)
      .join("\n");

    return `Analyze these git changes and suggest a commit message:

Files Changed:
${fileChanges}

Original message: "${params.message}"

Please provide suggestions in this JSON format:
{
    "suggestions": [
        {
            "message": "complete conventional commit message",
            "explanation": "detailed reasoning for the suggestion",
            "type": "commit type",
            "scope": "affected package or component",
            "description": "clear description of changes"
        }
    ]
}

Guidelines:
1. Follow conventional commits format
2. Be specific about the changes
3. Keep descriptions concise
4. Include scope when appropriate
5. Use appropriate type based on changes`;
  }

  generateSplitSuggestionPrompt(params: {
    files: FileChange[];
    message: string;
  }): string {
    const fileChanges = params.files
      .map((f) => `- ${f.path} (+${f.additions} -${f.deletions})`)
      .join("\n");

    return `Analyze these git changes and suggest if they should be split into multiple commits:

Files Changed:
${fileChanges}

Original message: "${params.message}"

Please provide suggestion in this JSON format:
{
    "reason": "explanation why the changes should be split",
    "suggestions": [
        {
            "message": "commit message",
            "files": ["list of files"],
            "order": "commit order number",
            "type": "commit type",
            "scope": "affected package or component"
        }
    ],
    "commands": ["git commands to execute the split"]
}

Guidelines:
1. Split commits by logical changes
2. Keep related changes together
3. Order commits logically
4. Follow conventional commits format
5. Include clear git commands`;
  }
}
