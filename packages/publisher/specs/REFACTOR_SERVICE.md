# Publisher Service Architecture Plan

## 1. Core Architecture Goals

- Consistent dependency injection pattern across all services
- Type-safe configuration management
- Clear service boundaries and responsibilities
- Testable and maintainable code structure
- Minimized circular dependencies
- Standardized error handling
- Clear lifecycle management

## 2. Core Services

### 2.1 Service Factory
- Central point for service creation and dependency management
- Handles service lifecycle (initialization, cleanup)
- Manages singleton instances
- Provides type-safe access to services

### 2.2 Configuration Service
- Manages global and package-specific configurations
- Handles config file loading and validation
- Supports config merging and inheritance
- Manages config schema validation
- Handles environment variable integration
# Publisher Migration Plan

## Phase 1: Setup New Structure

### 1.1. Create New Directory Structure
```
src/
├── core/           # New implementation
│   ├── services/
│   │   ├── config/
│   │   ├── git/
│   │   ├── workspace/
│   │   ├── changelog/
│   │   ├── version/
│   │   ├── package-manager/
│   │   └── release/
│   ├── factory/
│   ├── errors/
│   └── types/
├── legacy/         # Move existing implementations here
└── commands/       # CLI commands
```

### 1.2. Initial Files to Create
```typescript
// src/core/types/service.ts
export interface BaseServiceOptions {
  logger: Logger;
}

export interface BaseService {
  initialize(): Promise<void>;
}

// src/core/factory/service.factory.ts
export class ServiceFactory {
  private services: Map<string, unknown> = new Map();
  constructor(private readonly options: BaseServiceOptions) {}
  
  async initialize(): Promise<void> {}
}

// src/core/errors/index.ts
export class PublisherError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}
```

## Phase 2: Service Migration (One Service at a Time)

### 2.1. Config Service Migration

1. Create new files:
```typescript
// src/core/services/config/config.interface.ts
export interface ConfigServiceOptions extends BaseServiceOptions {
  workspaceService?: WorkspaceService;
}

export interface ConfigService extends BaseService {
  getGlobalConfig(): MonorepoConfig;
  getPackageConfig(packageName: string): Promise<ReleaseConfig>;
}

// src/core/services/config/config.service.ts
export class ConfigServiceImpl implements ConfigService {
  constructor(private readonly options: ConfigServiceOptions) {}
  
  async initialize(): Promise<void> {
    // New implementation
  }
}

// src/core/services/config/index.ts
export * from './config.interface';
export { ConfigServiceImpl as ConfigService } from './config.service';
```

2. Create compatibility layer:
```typescript
// src/legacy/config.ts
import { ConfigService } from '../core/services/config';

let configServiceInstance: ConfigService | null = null;

export async function loadConfig(): Promise<MonorepoConfig> {
  if (!configServiceInstance) {
    configServiceInstance = new ConfigService({
      logger: new Logger(),
      workspaceService: new WorkspaceService()
    });
    await configServiceInstance.initialize();
  }
  return configServiceInstance.getGlobalConfig();
}
```

### 2.2. Follow Same Pattern for Each Service

For each service (git, workspace, changelog, etc.):
1. Create interface file
2. Create implementation
3. Create compatibility layer
4. Update tests
5. Verify existing functionality

## Phase 3: Command Layer Updates

### 3.1. Create Base Command Structure
```typescript
// src/commands/base.command.ts
export abstract class BaseCommand {
  protected readonly factory: ServiceFactory;
  
  constructor(options: BaseServiceOptions) {
    this.factory = new ServiceFactory(options);
  }
  
  abstract execute(args: string[], options: CommandOptions): Promise<void>;
}
```

### 3.2. Update Each Command Gradually
```typescript
// src/commands/release.command.ts
export class ReleaseCommand extends BaseCommand {
  async execute(args: string[], options: CommandOptions): Promise<void> {
    await this.factory.initialize();
    const configService = this.factory.getConfigService();
    // ... rest of implementation
  }
}
```

## Phase 4: Testing Strategy

### 4.1. Create Test Helpers
```typescript
// test/helpers/service.factory.mock.ts
export class MockServiceFactory extends ServiceFactory {
  // Mock implementation
}

// test/helpers/test.utils.ts
export function createTestServices(options?: Partial<BaseServiceOptions>) {
  // Create test services
}
```

### 4.2. Update Tests Incrementally
- Keep existing tests working
- Add new tests for new implementations
- Gradually migrate tests to new patterns

## Phase 5: Documentation Updates

### 5.1. Update API Documentation
- Document new service interfaces
- Add migration guides
- Update examples

### 5.2. Update README
- Add new installation instructions
- Update usage examples
- Add deprecation notices

## Implementation Order

1. Core Infrastructure:
   ```
   1. Create directory structure
   2. Add base interfaces
   3. Create ServiceFactory
   4. Add error handling
   ```

2. First Service Migration (Config):
   ```
   1. Create config service files
   2. Implement new ConfigService
   3. Create compatibility layer
   4. Update tests
   5. Verify functionality
   ```

3. Remaining Services (in order):
   ```
   1. WorkspaceService
   2. GitService
   3. ChangelogService
   4. VersionService
   5. PackageManagerService
   6. ReleaseService
   ```

4. Command Layer:
   ```
   1. Create base command
   2. Update release command
   3. Update other commands
   4. Update CLI entry points
   ```

## Git Strategy

Create branches:
```bash
feature/new-architecture-setup
feature/config-service-migration
feature/workspace-service-migration
# etc.
```

## Rollback Plan

For each change:
1. Keep old implementations until new ones are proven
2. Add feature flags if needed
3. Maintain compatibility layer
4. Document rollback procedures

## Timeline Estimate

- Phase 1: 1-2 days
- Phase 2: 1-2 days per service
- Phase 3: 2-3 days
- Phase 4: 2-3 days
- Phase 5: 1-2 days

Total: 2-3 weeks

## Success Criteria

1. All tests passing
2. No breaking changes
3. All services migrated
4. Documentation updated
5. Performance maintained or improved

## Monitoring and Validation

1. Add logging to track service usage
2. Monitor for deprecation warnings
3. Track any error reports
4. Validate performance metrics

Would you like me to:
1. Detail the implementation for a specific service?
2. Create specific test examples?
3. Show more detailed rollback procedures?
4. Create detailed API documentation?
5. Show command implementation examples?
