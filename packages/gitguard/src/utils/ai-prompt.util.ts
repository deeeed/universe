import { CommitComplexity, PRStats } from "../types/analysis.types.js";
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
}

export function generateCommitSuggestionPrompt(
  params: CommitSuggestionPromptParams,
): string {
  const fileChanges = params.files
    .map((f) => `- ${f.path} (+${f.additions} -${f.deletions})`)
    .join("\n");

  const messageGuideline = params.needsDetailedMessage
    ? `\nFor the message field, provide bullet points covering:
• High-level architectural changes
• New features or removed functionality
• Breaking changes and impact
• Major refactoring decisions
• Dependencies affected

Format:
• Use bullet points (•)
• Keep each point concise
• Focus on impact and changes

Do not include:
• Number of lines changed
• Implementation details
• File paths or specific code changes`
    : "\nMessage field is optional for simple changes";

  return `Analyze these git changes and suggest commit messages following conventional commits format.

Files Changed:
${fileChanges}

Key Changes:
${params.diff}

Original message: "${params.message}"
${messageGuideline}

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
  logger: Logger;
}): string {
  const fileChanges = formatFileChanges({ files: params.files });

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

export function generatePRDescriptionPrompt(params: PRPromptParams): string {
  const commitMessages = params.commits
    .map((c) => `- ${c.hash.slice(0, 7)}: ${c.message}`)
    .join("\n");

  const fileChanges = formatFileChanges({ files: params.files });

  const templateInstructions = params.template
    ? `\nFollow this PR template structure:\n${params.template}`
    : "";

  const diffSection = params.diff
    ? `\nKey Changes:
\`\`\`diff
${formatDiffForAI({
  files: params.files,
  diff: params.diff,
  logger: params.logger,
})}
\`\`\`\n`
    : "";

  const jsonFormat = {
    title: "concise and descriptive PR title",
    description:
      "detailed description explaining the changes, their purpose, and impact",
    breaking: "boolean",
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

Changed Files:
${fileChanges}${diffSection}${templateInstructions}

Provide the description in this JSON format:
${JSON.stringify(jsonFormat, null, 2)}

Guidelines:
1. Title: Use clear, concise language following conventional commit format
2. Description: 
   - Explain the purpose and impact of changes
   - Highlight architectural decisions
   - Note API changes or breaking changes
   - Include migration steps if needed
3. Focus on technical impact and implementation details
4. Avoid listing commit hashes or file paths${params.template ? "\n5. Follow the provided template structure" : ""}`;
}

export function generatePRSplitPrompt(params: PRPromptParams): string {
  const commitMessages = params.commits
    .map((c) => `- ${c.hash.slice(0, 7)}: ${c.message}`)
    .join("\n");

  const fileChanges = formatFileChanges({ files: params.files });

  // Include diff context for better understanding of changes
  const diffSection = params.diff
    ? `\nKey Changes:
\`\`\`diff
${formatDiffForAI({
  files: params.files,
  diff: params.diff,
  logger: params.logger,
})}
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
