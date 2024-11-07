import { CommitComplexity, PRStats } from "../types/analysis.types.js";
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
  scope?: string;
  complexity?: CommitComplexity;
  includeDetails?: boolean;
}): string {
  const fileChanges = formatFileChanges({ files: params.files });
  const packageSummary = formatPackageSummary({
    packages: params.packages,
  });
  const truncatedDiff = truncateDiff({
    diff: params.diff,
    logger: params.logger,
  });

  const scopeGuideline = params.scope
    ? `\nValid scope: "${params.scope}"\n`
    : "\nNo specific scope detected\n";

  const detailsGuideline = params.includeDetails
    ? `\nPlease provide a high-level summary in the details field that includes:
- Main architectural or structural changes
- Key features added or removed
- Important refactoring decisions
- Breaking changes (if any)
- Impact on existing functionality

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

Git diff (truncated):
\`\`\`diff
${truncatedDiff}
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

function truncateDiff(params: {
  diff: string;
  maxLength?: number;
  logger: Logger;
}): string {
  const { diff, maxLength = 8000, logger } = params;

  if (diff.length <= maxLength) return diff;

  // Split by file sections and take most important ones
  const sections = diff.split("diff --git").filter(Boolean);
  const truncatedSections = sections
    .slice(0, 5) // Take first 5 files
    .map((section) => `diff --git${section}`) // Add back the "diff --git" prefix
    .join("\n");

  logger.debug("Truncating diff:", {
    originalLength: diff.length,
    sectionsCount: sections.length,
    truncatedLength: truncatedSections.length,
  });

  return truncatedSections.length > maxLength
    ? truncatedSections.slice(0, maxLength) +
        `\n\n... (truncated ${sections.length - 5} more files)`
    : truncatedSections +
        `\n\n... (truncated ${sections.length - 5} more files)`;
}

export interface CommitSuggestionPromptParams {
  files: FileChange[];
  message: string;
  diff: string;
  logger: Logger;
  scope?: string;
  complexity: CommitComplexity;
}

export function generateCommitSuggestionPrompt(
  params: CommitSuggestionPromptParams,
): string {
  const fileChanges = params.files
    .map((f) => `- ${f.path} (+${f.additions} -${f.deletions})`)
    .join("\n");

  return `Analyze these git changes and suggest commit messages following conventional commits format.

Files Changed:
${fileChanges}

Key Changes:
${params.diff}

Original message: "${params.message}"

Complexity Analysis:
- Score: ${params.complexity.score}
- Reasons: ${params.complexity.reasons.join(", ") || "None"}
- Needs detailed structure: ${params.complexity.needsStructure}
${params.scope ? `\nValid scope: "${params.scope}"` : ""}

Please provide suggestions in this JSON format:
{
  "suggestions": [
    {
      "title": "short descriptive title without scope or type",
      "message": "${params.complexity.needsStructure ? "detailed explanation of changes" : "optional details"}",
      "type": "commit type (feat|fix|docs|style|refactor|test|chore)"
    }
  ]
}

Guidelines:
1. Follow conventional commits format: type(scope): description
2. Be specific about the changes
3. Keep descriptions concise but informative
4. Only use the provided scope if one is specified
5. Use appropriate type based on the changes
6. ${params.complexity.needsStructure ? "Include detailed commit information in the message field" : "Message field is optional"}`;
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

export function getPriorityDiffs(params: {
  files: FileChange[];
  diff: string;
  maxLength?: number;
}): string {
  const maxLength = params.maxLength ?? 4000;

  // Split diff into file sections
  const fileDiffs = params.diff.split("diff --git").filter(Boolean);

  // Sort files by significance and take top 5
  const significantDiffs = fileDiffs
    .map((diff) => {
      const additions = (diff.match(/^\+(?!\+\+)/gm) || []).length;
      const deletions = (diff.match(/^-(?!--)/gm) || []).length;
      return { diff, significance: additions + deletions };
    })
    .sort((a, b) => b.significance - a.significance)
    .slice(0, 5)
    .map(({ diff }) => "diff --git" + diff);

  // Combine diffs within maxLength
  let result = "";
  for (const diff of significantDiffs) {
    if (result.length + diff.length <= maxLength) {
      result += diff;
    } else {
      break;
    }
  }

  return result;
}
