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
  // AWS
  {
    name: "AWS Access Key ID",
    pattern: /AKIA[0-9A-Z]{16}/,
    severity: "high",
  },
  {
    name: "AWS Secret Access Key",
    pattern: /[0-9a-zA-Z/+]{40}/,
    severity: "high",
  },
  {
    name: "AWS MWS Key",
    pattern:
      /amzn\.mws\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    severity: "high",
  },

  // Generic API Keys and Tokens
  {
    name: "Generic API Key",
    pattern:
      /['"](api[_-]?key|apikey|api[_-]?token)['"]\s*[:=]\s*['"][\w\-+=]{16,}['"]/i,
    severity: "high",
  },
  {
    name: "Authentication Token",
    pattern:
      /['"]?(auth[_-]?token|access[_-]?token)['"]?\s*[:=]\s*['"][\w\-+=]{16,}['"]/i,
    severity: "high",
  },

  // Database Connection Strings
  {
    name: "Database URL",
    pattern:
      /(postgres|mysql|mongodb|redis):\/\/[^:]+:[^@]+@[^:]+:[0-9]+\/[^'"]+/,
    severity: "high",
  },
  {
    name: "Database Password",
    pattern:
      /['"]?(db[_-]?password|database[_-]?password)['"]?\s*[:=]\s*['"][^'"]+['"]/i,
    severity: "high",
  },

  // Cloud Platform Keys
  {
    name: "Google API Key",
    pattern: /AIza[0-9A-Za-z\-_]{35}/,
    severity: "high",
  },
  {
    name: "Google OAuth",
    pattern: /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/,
    severity: "high",
  },
  {
    name: "Azure Key",
    pattern: /[0-9a-zA-Z]{32}|[0-9a-zA-Z]{24}/,
    severity: "high",
  },

  // Private Keys and Certificates
  {
    name: "Private Key",
    pattern: /-----BEGIN\s+PRIVATE\s+KEY( BLOCK)?-----/,
    severity: "high",
  },
  {
    name: "SSH Private Key",
    pattern:
      /-----BEGIN\s+(?:RSA|DSA|EC|OPENSSH)\s+PRIVATE\s+KEY( BLOCK)?-----/,
    severity: "high",
  },

  // Platform-specific Tokens
  {
    name: "GitHub Token",
    pattern: /gh[ps]_[0-9a-zA-Z]{36}/,
    severity: "high",
  },
  {
    name: "Slack Token",
    pattern: /xox[baprs]-([0-9a-zA-Z]{10,48})/,
    severity: "high",
  },
  {
    name: "Stripe API Key",
    pattern: /sk_live_[0-9a-zA-Z]{24}/,
    severity: "high",
  },
];

export const PROBLEMATIC_FILE_PATTERNS: ProblematicFilePattern[] = [
  {
    category: "Environment Files",
    patterns: [
      /\.env$/,
      /\.env\.[^.]+$/,
      /\.env\.local$/,
      /\.env\.development$/,
      /\.env\.production$/,
    ],
    severity: "high",
  },
  {
    category: "Configuration Files",
    patterns: [
      /config\.json$/,
      /secrets\.ya?ml$/,
      /credentials\.json$/,
      /\.npmrc$/,
      /\.pypirc$/,
    ],
    severity: "high",
  },
  {
    category: "Key Files",
    patterns: [
      /\.pem$/,
      /\.key$/,
      /\.pkcs12$/,
      /\.pfx$/,
      /\.p12$/,
      /\.asc$/,
      /id_rsa/,
      /id_dsa/,
      /id_ecdsa/,
      /id_ed25519/,
    ],
    severity: "high",
  },
  {
    category: "Certificate Files",
    patterns: [
      /\.crt$/,
      /\.cer$/,
      /\.ca-bundle$/,
      /\.p7b$/,
      /\.p7c$/,
      /\.p7s$/,
      /\.crl$/,
    ],
    severity: "high",
  },
  {
    category: "Database Files",
    patterns: [
      /\.sql$/,
      /\.sqlite$/,
      /\.sqlite3$/,
      /\.db$/,
      /dump\.sql$/,
      /backup\.sql$/,
    ],
    severity: "medium",
  },
  {
    category: "Log Files",
    patterns: [
      /\.log$/,
      /error\.log$/,
      /access\.log$/,
      /debug\.log$/,
      /npm-debug\.log$/,
    ],
    severity: "medium",
  },
];
