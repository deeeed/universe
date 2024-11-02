I'm working on migrating a Python git hook tool to TypeScript. I have the following structure ready:

```
src/
├── cli.ts
├── config.ts
├── services/
│   ├── analysis.service.ts
│   ├── base.service.ts
│   ├── git.service.ts
│   ├── logger.service.ts
│   └── reporter.service.ts
├── types/
│   ├── analysis.types.ts
│   ├── commit.types.ts
│   ├── config.types.ts
│   ├── git.types.ts
│   ├── logger.types.ts
│   └── service.types.ts
└── utils/
    └── commit-parser.util.ts
```

The tool has two main features:
1. Commit-time: Enhance commit messages using AI, ensure conventional commits, and suggest splitting commits when they lack cohesion
2. PR-time: Analyze PRs to suggest better descriptions and recommend splitting large PRs into smaller, focused ones

Key Implementation Requirements:
1. **TypeScript Practices**:
   - Use object parameters for all functions for better maintainability
   ```typescript
   // Prefer this:
   function analyze(params: { files: string[]; branch: string }): Result
   
   // Over this:
   function analyze(files: string[], branch: string): Result
   ```
   - Strict typing for all parameters and returns
   - Explicit error handling

2. **Architecture Requirements**:
   - Services should be extensible (easy to add new features)
   - Clear separation of concerns
   - Easy to add new AI providers
   - Easy to add new analysis rules
   - Maintainable and testable structure

3. **Example of Preferred Style**:
   ```typescript
   interface AnalyzeOptions {
     files: string[];
     branch: string;
     config?: Partial<AnalysisConfig>;
   }

   class AnalysisService {
     async analyze(params: AnalyzeOptions): Promise<AnalysisResult> {
       // Implementation
     }
   }
   ```

I need help with:
1. Restructuring the project to better support these features
2. Migrating the Python functionality (from gitguard-prepare.py)
3. Setting up the services and their interactions

Here's my Python hook for reference:
[Paste your Python script here]

Note: The commit-parser.util.ts is already implemented and working. I also have the logger service ready.

Could you help me:
1. Review and validate the current structure
2. Suggest the immediate next steps for migration
3. Start implementing the core services needed for the commit-time features

Focus on maintaining:
- Clean, consistent TypeScript patterns
- Extensible service architecture
- Clear separation of concerns
- Easy maintenance and testing
