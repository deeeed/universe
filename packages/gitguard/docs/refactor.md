src/controllers/
├── commit/
│   ├── commit.coordinator.ts
│   │   interface CommitCoordinatorParams { ... }
│   │   interface CommitCoordinatorResult { ... }
│   │
│   ├── commit-analysis.controller.ts
│   │   interface CommitAnalysisParams { ... }
│   │   interface CommitAnalysisResult { ... }
│   │
│   ├── commit-security.controller.ts
│   │   interface CommitSecurityParams { ... }
│   │   interface CommitSecurityResult { ... }
│   │
│   ├── commit-ai.controller.ts
│   │   interface CommitAIParams { ... }
│   │   interface CommitAIResult { ... }
│   │
│   └── index.ts  // Only exports the public API
│
├── branch/
│   ├── branch.coordinator.ts
│   │   interface BranchCoordinatorParams { ... }
│   │   interface BranchCoordinatorResult { ... }
│   │
│   ├── branch-analysis.controller.ts
│   │   interface BranchAnalysisParams { ... }
│   │   interface BranchAnalysisResult { ... }
│   │
│   ├── branch-pr.controller.ts
│   │   interface BranchPRParams { ... }
│   │   interface BranchPRResult { ... }
│   │
│   ├── branch-ai.controller.ts
│   │   interface BranchAIParams { ... }
│   │   interface BranchAIResult { ... }
│   │
│   └── index.ts  // Only exports the public API

// example of a controller file branch-analysis.controller.ts
interface BranchAnalysisParams {
  logger: Logger;
  config: Config;
  git: GitService;
  github: GitHubService;
}

interface AnalyzeBranchParams {
  branch: string;
  baseBranch: string;
  enableAI: boolean;
  enablePrompts: boolean;
}

interface BranchAnalysisResult {
  files: FileChange[];
  commits: CommitInfo[];
  diff: string;
  warnings: Warning[];
}

export function createBranchAnalysisController(params: BranchAnalysisParams) {
  const { logger, config, git, github } = params;

  async function analyzeBranch(params: AnalyzeBranchParams): Promise<BranchAnalysisResult> {
    // Implementation
  }

  return {
    analyzeBranch,
  };
}

. Naming Conventions:
- Prefix all files and interfaces with domain name (e.g., `BranchAnalysisController`, `CommitSecurityController`)
- Use suffixes to indicate purpose (-params, -result, -controller)
- Keep interface names descriptive and specific to their use case

. Interface Organization:
- Keep interfaces in the same file as their implementation
- Group related interfaces together
- Use object parameters for functions
- Avoid type duplication across files

. Controller Pattern:
- Each controller should have:
  - Params interface for initialization
  - Method-specific params interfaces
  - Result interfaces for returns
  - Factory function for creation
  - Clear, single responsibility

. Coordinator Pattern:
- Use coordinator to orchestrate between controllers
- Keep backward compatibility through coordinator
- Handle service initialization in coordinator
- Manage flow control and error handling

. Best Practices:
- Use object parameters instead of multiple parameters
- Keep interfaces close to their implementation
- Export only what's necessary through index.ts
- Use factory functions for controller creation
- Maintain single responsibility principle
