import {
  CommitComplexity,
  CommitSplitSuggestion,
  PRStats,
} from "../types/analysis.types.js";
import { CommitInfo, FileChange } from "../types/git.types.js";
import { Logger } from "../types/logger.types.js";
import { formatDiffForAI } from "./diff.util.js";

export interface PRPromptParams {
  commits: CommitInfo[];
  files: FileChange[];
  template?: string;
  baseBranch: string;
  diff?: string;
  stats?: PRStats;
  logger: Logger;
  format?: "api" | "human";
  options?: {
    includeTesting?: boolean;
    includeChecklist?: boolean;
  };
}

export function buildCommitPrompt(params: {
  files: FileChange[];
  packages: Record<string, FileChange[]>;
  originalMessage: string;
  diff: string;
  logger: Logger;
  scope?: string;
  complexity?: CommitComplexity;
  includeDetails?: boolean;
}): string {
  const fileChanges = formatFileChanges({ files: params.files });
  const packageSummary = formatPackageSummary({
    packages: params.packages,
  });
  const formattedDiff = formatDiffForAI({
    files: params.files,
    diff: params.diff,
    logger: params.logger,
  });

  const scopeGuideline = params.scope
    ? `\nValid scope: "${params.scope}"\n`
    : "\nNo specific scope detected\n";

  const detailsGuideline = params.includeDetails
    ? `\nPlease provide a bullet-point summary in the details field that includes:
• Main architectural/structural changes
• Key features added/removed
• Important refactoring decisions
• Breaking changes (if any)
• Impact on existing functionality

Format each point with a bullet (•) and keep points concise.
Avoid implementation details like line numbers or minor code changes.`
    : "\nDetails field is optional for this commit";

  return `Analyze these git changes and suggest commit messages following conventional commits format.

Files Changed:
${fileChanges}

Package Changes:
${packageSummary}
${scopeGuideline}
Original message: "${params.originalMessage}"

Complexity Analysis:
- Score: ${params.complexity?.score ?? "N/A"}
- Reasons: ${params.complexity?.reasons.join(", ") ?? "None"}
${detailsGuideline}

Git diff:
\`\`\`diff
${formattedDiff}
\`\`\`

Please provide suggestions in this JSON format:
${getCommitSuggestionFormat()}

Guidelines:
1. Follow conventional commits format: type(scope): description
2. Be specific about the changes
3. Keep descriptions concise but informative
4. Only use the provided scope if one is specified
5. Use appropriate type based on the changes
6. ${params.includeDetails ? "Include detailed commit information in the details field" : "Details field is optional"}
7. The "title" field should contain only the description without type or scope`;
}

// Helper functions to keep the code DRY
function formatFileChanges(params: { files: FileChange[] }): string {
  return params.files
    .map((f) => `- ${f.path} (+${f.additions} -${f.deletions})`)
    .join("\n");
}

function formatPackageSummary(params: {
  packages: Record<string, FileChange[]>;
}): string {
  return Object.entries(params.packages)
    .map(([pkg, files]) => {
      const changes = files.reduce(
        (sum, f) => sum + f.additions + f.deletions,
        0,
      );
      return `- ${pkg}: ${files.length} files (${changes} changes)`;
    })
    .join("\n");
}

function getCommitSuggestionFormat(): string {
  return `{
    "suggestions": [
        {
            "title": "short descriptive title without scope or type",
            "message": "detailed explanation of the changes",
            "type": "commit type (feat|fix|docs|style|refactor|test|chore)"
        }
    ]
}`;
}

export interface CommitSuggestionPromptParams {
  files: FileChange[];
  message: string;
  diff: string;
  logger: Logger;
  scope?: string;
  needsDetailedMessage?: boolean;
  format?: "api" | "human";
}

export function generateCommitSuggestionPrompt(
  params: CommitSuggestionPromptParams,
): string {
  const fileChanges = formatFileChanges({ files: params.files });

  if (params.format === "human") {
    return `You are a helpful AI assistant specializing in Git commits. Please help me create a good commit message for the following changes:

Context:
- Files Changed:
${fileChanges}
${params.message ? `\nOriginal commit message draft:\n${params.message}` : ""}
${params.needsDetailedMessage ? "\nNote: These changes are complex and would benefit from a detailed explanation." : ""}
${params.scope ? `\nSuggested scope: ${params.scope}` : ""}

Changes:
\`\`\`diff
${params.diff}
\`\`\`

Please suggest a commit message following the Conventional Commits format (https://www.conventionalcommits.org/). 
The message should include:
1. Type (feat, fix, docs, style, refactor, test, chore)
2. Optional scope in parentheses
3. Clear, concise description
4. Optional detailed explanation for complex changes

Respond with:
1. Your reasoning for the suggested message
2. The complete commit message
3. The command to copy (no formatting, quotes, or backticks)

Example response format:
Reasoning: [your explanation]

Suggested message:
[complete commit message]

Command to copy:
git commit -m "type(scope): title" -m $'detailed message line 1\\n• point 1\\n• point 2\\n• point 3'

Note: The command must use $'string' syntax with \\n for newlines to create a properly formatted multi-line commit message.`;
  }

  // API format (default)
  return `Analyze these git changes and suggest commit messages following conventional commits format.

Files Changed:
${fileChanges}

Key Changes:
${params.diff}

Original message: "${params.message}"
${params.needsDetailedMessage ? "\nNote: These changes are complex and would benefit from a detailed explanation." : ""}
${params.scope ? `\nSuggested scope: ${params.scope}` : ""}

Please provide suggestions in this JSON format:
{
  "suggestions": [
    {
      "title": "descriptive message without type or scope",
      "message": "${params.needsDetailedMessage ? "high-level overview of changes" : "optional details"}",
      "type": "commit type (feat|fix|docs|style|refactor|test|chore)"
    }
  ]
}

Guidelines:
1. The title field must not include type or scope
2. Be specific about the changes
3. Keep descriptions concise but informative
4. Use appropriate type based on the changes
5. ${params.needsDetailedMessage ? "Include high-level overview in message field" : "Message field is optional"}`;
}

export function generateSplitSuggestionPrompt(params: {
  files: FileChange[];
  message: string;
  diff: string;
  logger: Logger;
  basicSuggestion?: CommitSplitSuggestion;
}): string {
  const fileChanges = formatFileChanges({ files: params.files });
  const diffSection = params.diff
    ? `\nChanges:\n\`\`\`diff\n${params.diff}\n\`\`\``
    : "";

  return `Analyze these git changes and determine if they should be split into multiple commits. If the changes are cohesive and make sense together, return empty suggestions.

Files Changed:
${fileChanges}${diffSection}

Original message: "${params.message}"

Please provide analysis in this JSON format:
{
  "reason": "explanation why changes should be split OR why they work well together (max 100 chars)",
  "suggestions": [
    {
      "message": "conventional commit message",
      "files": ["list of files"],
      "order": 1,
      "type": "commit type (feat|fix|refactor|etc)",
      "scope": "affected component or area"
    }
  ],
  "commands": [
    "git commands to execute the split"
  ]
}

Guidelines:
1. If changes are cohesive (e.g., single feature, related components), return empty suggestions array
2. Only suggest splits for truly separate concerns or unrelated changes
3. Keep related changes together (e.g., component + its types + its tests)
4. Follow conventional commits format
5. Order suggestions by importance (1 being most important)
6. Consider package boundaries in monorepo setups
7. Provide clear reasoning whether splitting or keeping together`;
}

export function generatePRDescriptionPrompt(params: PRPromptParams): string {
  const commitMessages = params.commits
    .map((c) => `- ${c.hash.slice(0, 7)}: ${c.message}`)
    .join("\n");

  const fileChanges = formatFileChanges({ files: params.files });
  const diffSection = params.diff
    ? `\nKey Changes:
\`\`\`diff
${params.diff}
\`\`\`\n`
    : "";

  if (params.format === "human") {
    return `You are a helpful AI assistant specializing in Pull Requests. Please help me create a good PR description for these changes:

Base Branch: ${params.baseBranch}

Commits:
${commitMessages}

Files Changed:
${fileChanges}${diffSection}
${params.template ? `\nFollow this PR template structure:\n${params.template}` : ""}

Please provide:
1. A clear PR title following conventional commits format
2. A comprehensive description that explains:
   - The purpose and impact of changes
   - Key implementation details
   - Breaking changes (if any)
   - Migration steps (if needed)
3. Any testing instructions or special considerations

Format your response in markdown with clear headings and sections, making it ready to copy directly into the PR description. Include:

# Title
[Your suggested title]

# Description
[Your comprehensive description]

# Testing Instructions
[Any testing steps or considerations]

${params.template ? "# Template Sections\n[Fill in template-specific sections]" : ""}`;
  }

  // API format (default)
  const jsonFormat = {
    title: "concise and descriptive PR title",
    description: "detailed description explaining the changes",
    breaking: "boolean",
    branchName: "suggested-branch-name",
    commands: [
      "git command to create and switch to the branch",
      "git command to push the branch",
      "git command to create PR (if applicable)",
    ],
    ...(params.options?.includeTesting && {
      testing: "specific testing scenarios and instructions",
    }),
    ...(params.options?.includeChecklist && {
      checklist: [
        "implementation tasks",
        "testing requirements",
        "documentation needs",
      ],
    }),
  };

  return `Generate a Pull Request description that clearly explains these changes:

Base Branch: ${params.baseBranch}

Commits:
${commitMessages}

Files Changed:
${fileChanges}${diffSection}
${params.template ? `\nFollow this PR template structure:\n${params.template}` : ""}

Please provide suggestions in this JSON format:
${JSON.stringify(jsonFormat, null, 2)}

Guidelines:
1. Title: Use clear, concise language following conventional commit format
2. Description: 
   - Explain the purpose and impact of changes
   - Highlight architectural decisions
   - Note API changes or breaking changes
   - Include migration steps if needed
3. Focus on technical impact and implementation details
4. Avoid listing commit hashes or file paths
5. Provide a kebab-case branch name that reflects the changes
6. Include exact git commands to execute the changes${params.template ? "\n7. Follow the provided template structure" : ""}`;
}

export function generatePRSplitPrompt(params: PRPromptParams): string {
  const commitMessages = params.commits
    .map((c) => `- ${c.hash.slice(0, 7)}: ${c.message}`)
    .join("\n");

  const fileChanges = formatFileChanges({ files: params.files });
  const diffSection = params.diff
    ? `\nKey Changes:
\`\`\`diff
${params.diff}
\`\`\`\n`
    : "";

  return `Analyze these changes and suggest how to split them into multiple PRs:

Base Branch: ${params.baseBranch}

Commits:
${commitMessages}

Files Changed:
${fileChanges}${diffSection}

Please provide split suggestions in this JSON format:
{
  "reason": "explanation why the changes should be split",
  "suggestedPRs": [
    {
      "title": "descriptive PR title",
      "description": "detailed description of changes",
      "files": ["list", "of", "files"],
      "order": 1,
      "baseBranch": "branch to base PR on",
      "dependencies": ["list of PR numbers this depends on"]
    }
  ],
  "commands": ["git commands to execute the split"]
}

Guidelines:
1. Split by logical units of work
2. Keep related changes together
3. Consider package boundaries
4. Maintain dependency order
5. Follow conventional commit format for titles
6. Include clear git commands for implementation`;
}
