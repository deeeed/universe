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
    name: "AWS Access Key ID",
    pattern: /(?:^|[^\w/])(AKIA\w{16})(?:[^\w]|$)/,
    severity: "high",
  },
  {
    name: "AWS Secret Access Key",
    pattern:
      /(?:aws_secret|secret_key|secret_access_key)['"]?\s*[:=]\s*['"]([a-z\d/+]{40})['"]/i,
    severity: "high",
  },
  {
    name: "AWS MWS Key",
    pattern:
      /(?:^|[^\w])(amzn\.mws\.[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})(?:[^\w]|$)/,
    severity: "high",
  },
  {
    name: "Generic API Key",
    pattern:
      /(?:^|\s)["'](?:api[_-]?key|apikey|api[_-]?token)["'][\s]*[:=][\s]*["'](\w[-+=]{16,})["']/i,
    severity: "high",
  },
  {
    name: "Authentication Token",
    pattern:
      /(?:^|\s)["'](?:auth[_-]?token|access[_-]?token)["'][\s]*[:=][\s]*["'](\w[-+=]{16,})["']/i,
    severity: "high",
  },
  {
    name: "Database URL",
    pattern:
      /["']?(?:postgres|mysql|mongodb|redis):\/\/[^:]+:([^@]{8,})@[^:]+:\d+\/[^'"]+["']?/,
    severity: "high",
  },
  {
    name: "Database Password",
    pattern:
      /(?:^|\s)(?:DB_PASSWORD|DATABASE_PASSWORD)\s*=\s*['"]([^'"]+)['"]/i,
    severity: "high",
  },
  {
    name: "Google API Key",
    pattern: /(?:^|[^\w])(AIza[\w\-_]{35})(?:[^\w]|$)/,
    severity: "high",
  },
  {
    name: "Google OAuth",
    pattern:
      /(?:^|[^\w])([\d]+-\w{32}\.apps\.googleusercontent\.com)(?:[^\w]|$)/,
    severity: "high",
  },
  {
    name: "Azure Key",
    pattern:
      /(?:^|\s)['"]?azure[_-]?key['"]?\s*[:=]\s*['"](\w{24}|\w{32})['"](?:\s|$)/i,
    severity: "high",
  },
  {
    name: "Private Key",
    pattern:
      /-----BEGIN\s+(?:RSA|DSA|EC|OPENSSH)\s+PRIVATE\s+KEY-----[A-Za-z0-9+/=\s]+-----END\s+(?:RSA|DSA|EC|OPENSSH)\s+PRIVATE\s+KEY-----/,
    severity: "high",
  },
  {
    name: "SSH Private Key",
    pattern:
      /-----BEGIN\s+(?:RSA|DSA|EC|OPENSSH)\s+PRIVATE\s+KEY(?:\s+BLOCK)?-----[\s\S]+?-----END/,
    severity: "high",
  },
  {
    name: "GitHub Token",
    pattern: /(?:^|[^\w])(gh[ps]_\w{36})(?:[^\w]|$)/,
    severity: "high",
  },
  {
    name: "Slack Token",
    pattern: /(?:^|[^\w])(xox[baprs]-\w{10,48})(?:[^\w]|$)/,
    severity: "high",
  },
  {
    name: "Stripe API Key",
    pattern: /(?:^|[^\w])(sk_live_\w{24})(?:[^\w]|$)/,
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
