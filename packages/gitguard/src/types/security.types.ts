// types/security.types.ts

export type Severity = "high" | "medium" | "low";

// Single interface for security findings
export interface SecurityFinding {
  path: string;
  line?: number;
  match?: string;
  content?: string;
  suggestion: string;
  severity: Severity;
  type: "secret" | "sensitive_file";
}

export interface SecurityAnalysis {
  findings: SecurityFinding[];
  commands: string[];
  shouldBlock: boolean;
}

export interface SecurityPattern {
  name: string;
  pattern: RegExp;
  severity: Severity;
}

export interface ProblematicFilePattern {
  category: string;
  patterns: RegExp[];
  severity: Severity;
}

export interface SecurityCheckResult {
  secretFindings: SecurityFinding[];
  fileFindings: SecurityFinding[];
  filesToUnstage: string[];
  shouldBlock: boolean;
  commands: string[];
}

// Mapping your Python patterns to TypeScript
export const SECRET_PATTERNS: SecurityPattern[] = [
  {
    name: "AWS Access Key",
    pattern: /AKIA[0-9A-Z]{16}/,
    severity: "high",
  },
  {
    name: "Google API Key",
    pattern: /AIza[0-9A-Za-z\-_]{35}/,
    severity: "high",
  },
  {
    name: "Google OAuth",
    pattern: /\d+-\w{32}\.apps\.googleusercontent\.com/,
    severity: "high",
  },
  {
    name: "Azure Key",
    pattern:
      /[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/,
    severity: "high",
  },
];

export const PROBLEMATIC_FILE_PATTERNS: ProblematicFilePattern[] = [
  {
    category: "Environment Files",
    patterns: [/\.env.*/, /config\.json/, /secrets\.yaml/, /credentials\.json/],
    severity: "high",
  },
  {
    category: "Key Files",
    patterns: [/.*\.pem$/, /.*\.key$/, /.*\.keystore$/, /.*\.p12$/, /id_rsa/],
    severity: "high",
  },
];
