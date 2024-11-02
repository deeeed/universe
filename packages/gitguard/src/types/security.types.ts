// types/security.types.ts
export interface SecurityFinding {
  type: "secret" | "sensitive_file";
  severity: "high" | "medium" | "low";
  path: string;
  line?: number;
  match?: string;
  content?: string;
  suggestion: string;
}

export interface SecurityAnalysis {
  findings: SecurityFinding[];
  commands: string[];
  shouldBlock: boolean;
}

export interface SecurityPattern {
  name: string;
  pattern: RegExp;
  severity: "high" | "medium" | "low";
}

export interface ProblematicFilePattern {
  category: string;
  patterns: RegExp[];
  severity: "high" | "medium" | "low";
}

// Mapping your Python patterns to TypeScript
export const SECRET_PATTERNS: SecurityPattern[] = [
  {
    name: "AWS Key",
    pattern: /AKIA[0-9A-Z]{16}/,
    severity: "high",
  },
  {
    name: "AWS Secret",
    pattern: /aws[_\-\s]*(?:secret|key|token|password)/i,
    severity: "high",
  },
  {
    name: "Google API Key",
    pattern: /AIza[0-9A-Za-z\-_]{35}/,
    severity: "high",
  },
  // ... other patterns from your Python script
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
  // ... other patterns from your Python script
];
