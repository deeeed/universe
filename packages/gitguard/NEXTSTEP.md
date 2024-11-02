# GitGuard File Structure

```
.
├── src/
│   ├── cli/                    # CLI commands
│   │   ├── analyze.ts         # PR analysis command
│   │   ├── commit.ts          # Commit analysis command
│   │   └── index.ts           # CLI entry point
│   │
│   ├── services/
│   │   ├── ai/               # AI integration
│   │   │   ├── ai.service.ts
│   │   │   ├── azure.service.ts
│   │   │   └── ollama.service.ts
│   │   │
│   │   ├── analysis/         # Analysis services
│   │   │   ├── commit.service.ts
│   │   │   └── pr.service.ts
│   │   │
│   │   ├── base.service.ts   # Base service with logger
│   │   ├── git.service.ts    # Git operations
│   │   └── logger.service.ts # Logging
│   │
│   ├── hooks/                # Git hooks
│   │   └── prepare-commit-msg.ts
│   │
│   ├── types/
│   │   ├── ai.types.ts       # AI-related types
│   │   ├── analysis.types.ts # General analysis types
│   │   ├── commit.types.ts   # Commit-specific types
│   │   ├── config.types.ts   # Configuration types
│   │   ├── git.types.ts      # Git operation types
│   │   ├── logger.types.ts   # Logger types
│   │   └── pr.types.ts       # PR-specific types
│   │
│   ├── utils/
│   │   └── commit-parser.util.ts
│   │
│   ├── config.ts            # Configuration management
│   └── index.ts            # Main exports
│
├── scripts/                 # Installation scripts
│   ├── install.sh
│   └── setup-hooks.sh
│
└── samples/                # Example configurations
    └── .gitguard.json
```

## Key Changes from Current Structure:

1. **New Directories**:
   - `cli/` - Separated CLI commands
   - `services/ai/` - AI service implementations
   - `services/analysis/` - Separate commit and PR analysis
   - `hooks/` - Git hook implementations

2. **Additional Types**:
   - `ai.types.ts` - AI service interfaces
   - `pr.types.ts` - PR analysis types

3. **Simplified Services**:
   - Moved from generic `analysis.service.ts` to specific services
   - Separated AI concerns

4. **Organized Scripts**:
   - Moved shell scripts to `scripts/` directory
   - Added hook setup script

## Migration Steps:

1. **Initial Restructuring**
```bash
# Create new directories
mkdir -p src/cli src/services/ai src/services/analysis src/hooks scripts

# Move existing files
mv src/cli.ts src/cli/index.ts
mv install.sh scripts/
mv setup-cli.sh scripts/
```

2. **Service Separation**
```bash
# Split analysis.service.ts into:
touch src/services/analysis/commit.service.ts
touch src/services/analysis/pr.service.ts

# Create AI services
touch src/services/ai/ai.service.ts
touch src/services/ai/azure.service.ts
touch src/services/ai/ollama.service.ts
```

3. **Update Types**
```bash
# Add new type definitions
touch src/types/ai.types.ts
touch src/types/pr.types.ts
```

4. **CLI Organization**
```bash
# Create CLI commands
touch src/cli/analyze.ts
touch src/cli/commit.ts
```

Would you like me to:
1. Define the interfaces for any specific service?
2. Show the exports structure?
3. Detail the configuration updates?
4. Plan the first migration step?
