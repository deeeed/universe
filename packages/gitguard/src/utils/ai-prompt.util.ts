import { PRStats } from "../types/analysis.types.js";
import { CommitInfo, FileChange } from "../types/git.types.js";
import { Logger } from "../types/logger.types.js";

export interface PRPromptParams {
  commits: CommitInfo[];
  stats: PRStats;
  files: FileChange[];
  template?: string;
  baseBranch: string;
}

export function buildCommitPrompt(params: {
  files: FileChange[];
  packages: Record<string, FileChange[]>;
  originalMessage: string;
  diff: string;
  logger: Logger;
}): string {
  const fileChanges = formatFileChanges({ files: params.files });
  const packageSummary = formatPackageSummary({
    packages: params.packages,
  });
  const truncatedDiff = truncateDiff({
    diff: params.diff,
    logger: params.logger,
  });

  return `Analyze these git changes and suggest commit messages following conventional commits format.

Files Changed:
${fileChanges}

Package Changes:
${packageSummary}

Original message: "${params.originalMessage}"

Git diff (truncated):
\`\`\`diff
${truncatedDiff}
\`\`\`

Please provide 3 suggestions in this JSON format:
${getCommitSuggestionFormat()}

Guidelines:
1. Follow conventional commits format: type(scope): description
2. Be specific about the changes
3. Keep descriptions concise but informative
4. Include scope when changes affect specific packages
5. Use appropriate type based on the changes`;
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
            "message": "complete conventional commit message",
            "explanation": "detailed reasoning for the suggestion",
            "type": "commit type (feat|fix|docs|style|refactor|test|chore)",
            "scope": "affected package or component",
            "description": "clear description of changes"
        }
    ]
}`;
}

function truncateDiff(params: {
  diff: string;
  maxLength?: number;
  logger: Logger;
}): string {
  const { diff, maxLength = 8000, logger } = params;

  if (diff.length <= maxLength) return diff;

  // Split by file sections and take most important ones
  const sections = diff.split("diff --git");
  const truncatedSections = sections
    .slice(0, 5) // Take first 5 files
    .join("diff --git");

  logger.debug("Truncating diff:", {
    originalLength: diff.length,
    sectionsCount: sections.length,
    truncatedLength: truncatedSections.length,
  });

  return (
    truncatedSections.slice(0, maxLength) +
    `\n\n... (truncated ${sections.length - 5} more files)`
  );
}

interface PromptParams {
  files: FileChange[];
  message: string;
  diff: string;
  logger: Logger;
}

export function generateCommitSuggestionPrompt(params: PromptParams): string {
  const { files, message, diff, logger } = params;

  const fileChanges = formatFileChanges({ files });
  const truncatedDiff = truncateDiff({ diff, logger });

  logger.debug("Generating commit suggestion prompt:", {
    filesCount: files.length,
    originalDiffLength: diff.length,
    truncatedDiffLength: truncatedDiff.length,
    message,
  });

  const prompt = `Analyze these git changes and suggest a commit message:

Files Changed:
${fileChanges}

Original message: "${message}"

Git diff (truncated):
\`\`\`diff
${truncatedDiff}
\`\`\`

Please provide suggestions in this JSON format:
${getCommitSuggestionFormat()}

Guidelines:
1. Follow conventional commits format
2. Be specific about the changes
3. Keep descriptions concise
4. Include scope when appropriate
5. Use appropriate type based on changes`;

  logger.debug("Generated prompt:", {
    length: prompt.length,
    preview: prompt.slice(0, 200) + "...",
  });

  return prompt;
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

  return `Generate a Pull Request title and description based on these changes:

Base Branch: ${params.baseBranch}

Commits:
${commitMessages}

Files Changed:
${fileChanges}

Stats:
- Total Commits: ${params.stats.totalCommits}
- Files Changed: ${params.stats.filesChanged}
- Additions: ${params.stats.additions}
- Deletions: ${params.stats.deletions}
- Authors: ${params.stats.authors.join(", ")}
${templateInstructions}

Please provide a PR title and description in this JSON format:
{
  "title": "concise and descriptive PR title",
  "description": "detailed PR description following template if provided",
  "breaking": boolean,
  "testing": "testing instructions if applicable",
  "checklist": ["list", "of", "checkboxes"]
}

Guidelines:
1. Title should be clear and follow conventional commit format
2. Description should be comprehensive but well-structured
3. Include relevant technical details
4. Highlight significant changes
5. Note any breaking changes
6. Follow template structure if provided`;
}

export function generatePRSplitPrompt(params: PRPromptParams): string {
  const commitMessages = params.commits
    .map((c) => `- ${c.hash.slice(0, 7)}: ${c.message}`)
    .join("\n");

  const fileChanges = formatFileChanges({ files: params.files });

  return `Analyze these changes and suggest how to split them into multiple PRs:

Base Branch: ${params.baseBranch}

Commits:
${commitMessages}

Files Changed:
${fileChanges}

Stats:
- Total Commits: ${params.stats.totalCommits}
- Files Changed: ${params.stats.filesChanged}
- Additions: ${params.stats.additions}
- Deletions: ${params.stats.deletions}
- Authors: ${params.stats.authors.join(", ")}

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
