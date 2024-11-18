import { ComplexityOptions } from "./types/analysis.types.js";

export const DEFAULT_MAX_PROMPT_TOKENS = 32000;
export const DEFAULT_CONTEXT_LINES = 3;
export const TOKEN_TO_CHAR_RATIO = 4; // Average number of characters per token
export const MAX_DIFF_LENGTH_RATIO = 0.25; // Maximum diff length as a ratio of total tokens
export const DEFAULT_TEMPERATURE = 0.1; // More deterministic, less creative

export const BINARY_FILE_PATTERNS = [
  /\.(png|jpe?g|gif|ico|webp|bmp)$/i, // Images
  /\.(pdf|doc[x]?|xls[x]?|ppt[x]?)$/i, // Documents
  /\.(zip|tar|gz|rar|7z)$/i, // Archives
  /\.(mp[34]|wav|ogg|webm)$/i, // Audio/Video
  /\.(ttf|otf|eot|woff2?)$/i, // Fonts
  /\.(so|dll|exe|bin)$/i, // Binaries
];

// Analysis defaults
export const DEFAULT_ANALYSIS_CONFIG = {
  maxCommitSize: 500,
  maxFileSize: 1000,
  checkConventionalCommits: true,
} as const;

// Security defaults
export const DEFAULT_SECURITY_CONFIG = {
  enabled: true,
  rules: {
    secrets: {
      enabled: true,
      severity: "high",
      blockPR: true,
    },
    files: {
      enabled: true,
      severity: "medium",
    },
  },
} as const;

// PR defaults
export const DEFAULT_PR_CONFIG = {
  maxSize: 800,
  requireApprovals: 1,
  template: {
    path: ".github/pull_request_template.md",
    required: true,
    sections: {
      description: true,
      breaking: true,
      testing: true,
      checklist: true,
    },
  },
} as const;

// AI defaults
export const DEFAULT_AI_CONFIG = {
  enabled: false,
  provider: null,
  maxPromptTokens: DEFAULT_MAX_PROMPT_TOKENS,
  maxPromptCost: 0.1,
  apiClipboard: true,
  commitDetails: {
    enabled: true,
    complexityThreshold: 5,
    alwaysInclude: false,
  },
} as const;

/**
 * Regular expressions for identifying file types in commit analysis
 * Used by CommitParser to categorize changed files and calculate complexity
 */
export const FILE_PATTERNS = {
  /**
   * Pattern to match test files
   * Matches paths containing /test/ or /tests/ and files ending in .test or .tests
   * Example matches: src/tests/utils.ts, components/Button.test.tsx
   */
  TEST: /\/tests?\/|\.tests?\./,

  /**
   * Pattern to match configuration files
   * Matches paths containing /config/ or /.config/
   * Example matches: .config/jest.js, src/config/database.ts
   */
  CONFIG: /\/\.?config\//,
} as const;

/**
 * Default file patterns for different file categories
 * Used in commit analysis to:
 * 1. Categorize changed files
 * 2. Calculate complexity scores based on file types
 * 3. Determine if changes require special attention
 */
export const DEFAULT_FILE_PATTERNS = {
  /**
   * Source code directories
   * Base score multiplier: 1.0 (sourceFileScore)
   */
  source: ["/src/", "/lib/", "/core/"],

  /**
   * Test directories and files
   * Base score multiplier: 1.0 (testFileScore)
   */
  test: ["/test/", "/tests/", "/spec/", "/specs/"],

  /**
   * Configuration directories
   * Base score multiplier: 0.5 (configFileScore)
   */
  config: ["/config/", "/.config/"],

  /** Documentation files and directories */
  docs: ["/docs/", "/documentation/", "/*.md"],

  /**
   * API-related directories
   * Base score multiplier: 2.0 (apiFileScore)
   * Higher score due to potential impact on consumers
   */
  api: ["/api/", "/interfaces/", "/services/"],

  /**
   * Database migration directories
   * Base score multiplier: 2.0 (migrationFileScore)
   * Higher score due to data structure changes
   */
  migrations: ["/migrations/", "/migrate/"],

  /**
   * UI component directories
   * Base score multiplier: 1.0 (componentFileScore)
   */
  components: ["/components/", "/views/", "/pages/"],

  /**
   * Hook and composable directories
   * Base score multiplier: 1.0 (hookFileScore)
   */
  hooks: ["/hooks/", "/composables/"],

  /**
   * Utility and helper directories
   * Base score multiplier: 0.5 (utilityFileScore)
   * Lower score as changes are typically isolated
   */
  utils: ["/utils/", "/helpers/", "/shared/"],

  /**
   * Critical configuration files that require special attention
   * Base score multiplier: 2.0 (criticalFileScore)
   * Higher score due to project-wide impact
   * These files trigger additional complexity reasons when modified
   */
  critical: [
    "package.json",
    "tsconfig.json",
    ".env",
    "pnpm-workspace.yaml",
    "yarn.lock",
    "package-lock.json",
  ],
} as const;

/** Default complexity analysis configuration */
export const DEFAULT_COMPLEXITY_OPTIONS: ComplexityOptions = {
  /** Thresholds for different complexity levels */
  thresholds: {
    /** Number of lines that makes a file large */
    largeFile: 100,
    /** Number of lines that makes a file very large */
    veryLargeFile: 300,
    /** Number of lines that makes a file huge */
    hugeFile: 500,
    /** Number of files that constitutes multiple files */
    multipleFiles: 5,
    /** Number of files that constitutes many files */
    manyFiles: 10,
  },
  /** Scoring weights for different file types */
  scoring: {
    /** Base score for any file */
    baseFileScore: 1,
    /** Score multiplier for large files */
    largeFileScore: 2,
    /** Score multiplier for very large files */
    veryLargeFileScore: 3,
    /** Score multiplier for huge files */
    hugeFileScore: 5,
    /** Score multiplier for source files */
    sourceFileScore: 1,
    /** Score multiplier for test files */
    testFileScore: 1,
    /** Score multiplier for config files */
    configFileScore: 0.5,
    /** Score multiplier for API files */
    apiFileScore: 2,
    /** Score multiplier for migration files */
    migrationFileScore: 2,
    /** Score multiplier for component files */
    componentFileScore: 1,
    /** Score multiplier for hook files */
    hookFileScore: 1,
    /** Score multiplier for utility files */
    utilityFileScore: 0.5,
    /** Score multiplier for critical files */
    criticalFileScore: 2,
  },
  /** File pattern configurations */
  patterns: {
    /** Patterns to identify source files */
    sourceFiles: [...DEFAULT_FILE_PATTERNS.source],
    /** Patterns to identify API files */
    apiFiles: [...DEFAULT_FILE_PATTERNS.api],
    /** Patterns to identify migration files */
    migrationFiles: [...DEFAULT_FILE_PATTERNS.migrations],
    /** Patterns to identify component files */
    componentFiles: [...DEFAULT_FILE_PATTERNS.components],
    /** Patterns to identify hook files */
    hookFiles: [...DEFAULT_FILE_PATTERNS.hooks],
    /** Patterns to identify utility files */
    utilityFiles: [...DEFAULT_FILE_PATTERNS.utils],
    /** Patterns to identify critical files */
    criticalFiles: [...DEFAULT_FILE_PATTERNS.critical],
  },
  /** Thresholds for structural complexity */
  structureThresholds: {
    /** Overall complexity score threshold */
    scoreThreshold: 10,
    /** Number of complexity reasons threshold */
    reasonsThreshold: 2,
  },
} as const;
