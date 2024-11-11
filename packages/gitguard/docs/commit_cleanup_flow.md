Analyze these git changes and determine if they should be split into multiple commits. If the changes are cohesive and make sense together, return empty suggestions.

Files Changed:
- packages/gitguard/.check.env (+0 -0)
- packages/gitguard/CONTRIBUTING.md (+0 -2)
- packages/gitguard/docs/refactor.md (+0 -104)
- packages/gitguard/install.sh (+0 -249)
- packages/gitguard/jest.config.cjs (+56 -0)
- packages/gitguard/jest.config.ts (+0 -33)
- packages/gitguard/jest.integration.setup.ts (+12 -0)
- packages/gitguard/jest.setup.ts (+2 -2)
- packages/gitguard/package.json (+8 -2)
- packages/gitguard/src/services/git.service.integration.test.ts (+159 -0)
- packages/gitguard/src/services/git.service.ts (+17 -1)
- packages/gitguard/tsconfig.json (+3 -1)
- packages/gitguard/tsconfig.test.json (+3 -1)
- yarn.lock (+1 -0)
Changes:
```diff
diff --git c/packages/gitguard/.check.env i/packages/gitguard/.check.env
deleted file mode 100644
index e69de29..0000000
diff --git c/packages/gitguard/CONTRIBUTING.md i/packages/gitguard/CONTRIBUTING.md
index 4a8c3dd..ab3470c 100644
--- c/packages/gitguard/CONTRIBUTING.md
+++ i/packages/gitguard/CONTRIBUTING.md
@@ -1,5 +1,3 @@
-Here's the content in a simple markdown format that's easy to copy:
-
 # Personal Dev Notes
 
 Quick setup:
diff --git c/packages/gitguard/docs/refactor.md i/packages/gitguard/docs/refactor.md
deleted file mode 100644
index 08563db..0000000
--- c/packages/gitguard/docs/refactor.md
+++ /dev/null
@@ -1,104 +0,0 @@
-src/controllers/
-├── commit/
-│   ├── commit.coordinator.ts
-│   │   interface CommitCoordinatorParams { ... }
-│   │   interface CommitCoordinatorResult { ... }
-│   │
-│   ├── commit-analysis.controller.ts
-│   │   interface CommitAnalysisParams { ... }
-│   │   interface CommitAnalysisResult { ... }
-│   │
-│   ├── commit-security.controller.ts
-│   │   interface CommitSecurityParams { ... }
-│   │   interface CommitSecurityResult { ... }
-│   │
-│   ├── commit-ai.controller.ts
-│   │   interface CommitAIParams { ... }
-│   │   interface CommitAIResult { ... }
-│   │
-│   └── index.ts  // Only exports the public API
-│
-├── branch/
-│   ├── branch.coordinator.ts
-│   │   interface BranchCoordinatorParams { ... }
-│   │   interface BranchCoordinatorResult { ... }
-│   │
-│   ├── branch-analysis.controller.ts
-│   │   interface BranchAnalysisParams { ... }
-│   │   interface BranchAnalysisResult { ... }
-│   │
-│   ├── branch-pr.controller.ts
-│   │   interface BranchPRParams { ... }
-│   │   interface BranchPRResult { ... }
-│   │
-│   ├── branch-ai.controller.ts
-│   │   interface BranchAIParams { ... }
-│   │   interface BranchAIResult { ... }
-│   │
-│   └── index.ts  // Only exports the public API
-
-// example of a controller file branch-analysis.controller.ts
-interface BranchAnalysisParams {
-  logger: Logger;
-  config: Config;
-  git: GitService;
-  github: GitHubService;
-}
-
-interface AnalyzeBranchParams {
-  branch: string;
-  baseBranch: string;
-  enableAI: boolean;
-  enablePrompts: boolean;
-}
-
-interface BranchAnalysisResult {
-  files: FileChange[];
-  commits: CommitInfo[];
-  diff: string;
-  warnings: Warning[];
-}
-
-export function createBranchAnalysisController(params: BranchAnalysisParams) {
-  const { logger, config, git, github } = params;
-
-  async function analyzeBranch(params: AnalyzeBranchParams): Promise<BranchAnalysisResult> {
-    // Implementation
-  }
-
-  return {
-    analyzeBranch,
-  };
-}
-
-. Naming Conventions:
-- Prefix all files and interfaces with domain name (e.g., `BranchAnalysisController`, `CommitSecurityController`)
-- Use suffixes to indicate purpose (-params, -result, -controller)
-- Keep interface names descriptive and specific to their use case
-
-. Interface Organization:
-- Keep interfaces in the same file as their implementation
-- Group related interfaces together
-- Use object parameters for functions
-- Avoid type duplication across files
-
-. Controller Pattern:
-- Each controller should have:
-  - Params interface for initialization
-  - Method-specific params interfaces
-  - Result interfaces for returns
-  - Factory function for creation
-  - Clear, single responsibility
-
-. Coordinator Pattern:
-- Use coordinator to orchestrate between controllers
-- Keep backward compatibility through coordinator
-- Handle service initialization in coordinator
-- Manage flow control and error handling
-
-. Best Practices:
-- Use object parameters instead of multiple parameters
-- Keep interfaces close to their implementation
-- Export only what's necessary through index.ts
-- Use factory functions for controller creation
-- Maintain single responsibility principle
diff --git c/packages/gitguard/install.sh i/packages/gitguard/install.sh
deleted file mode 100755
index d1d6ab6..0000000
--- c/packages/gitguard/install.sh
+++ /dev/null
@@ -1,249 +0,0 @@
-#!/bin/bash
-
-# Exit on any error
-set -e
-
-# Colors for output
-GREEN='\033[0;32m'
-RED='\033[0;31m'
-YELLOW='\033[1;33m'
-BLUE='\033[0;34m'
-NC='\033[0m' # No Color
-
-# Store the script's directory for development installation
-SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
-
-check_existing_hook() {
-    local hook_path="$1"
-    if [ -f "$hook_path" ]; then
-        if grep -q "gitguard" "$hook_path"; then
-            echo "gitguard"
-        else
-            echo "other"
-        fi
-    else
-        echo "none"
-    fi
-}
-
-check_installation_status() {
-    local project_hook=""
-    local global_hook=""
-    local status=()
-
-    # Check project installation
-    if git rev-parse --git-dir > /dev/null 2>&1; then
-        local project_dir="$(git rev-parse --git-dir)"
-        project_hook=$(check_existing_hook "$project_dir/hooks/prepare-commit-msg")
-        status+=("project:$project_hook")
-    else
-        status+=("project:none")
-    fi
-
-    # Initialize GLOBAL_GIT_DIR
-    GLOBAL_GIT_DIR="$(git config --global core.hooksPath || echo "")"
-    if [ -z "$GLOBAL_GIT_DIR" ]; then
-        GLOBAL_GIT_DIR="$HOME/.config/git/hooks"
-    fi
-    
-    global_hook=$(check_existing_hook "$GLOBAL_GIT_DIR/prepare-commit-msg")
-    status+=("global:$global_hook")
-
-    printf "%s " "${status[@]}"
-}
-
-handle_installation() {
-    local target_dir="$1"
-    local install_type="$2"
-    
-    echo -e "${BLUE}Starting $install_type installation...${NC}"
-    echo -e "Target directory: $target_dir"
-    
-    # For global installation, use GLOBAL_GIT_DIR directly
-    if [ "$install_type" = "global" ]; then
-        if [ -z "$GLOBAL_GIT_DIR" ]; then
-            echo -e "${RED}Error: Global git hooks directory is not set${NC}"
-            echo -e "Attempting to create default directory at: $HOME/.config/git/hooks"
-            GLOBAL_GIT_DIR="$HOME/.config/git/hooks"
-        fi
-        target_dir="$GLOBAL_GIT_DIR"
-    fi
-    
-    local hook_path="$target_dir/prepare-commit-msg"
-    echo -e "Installing hook to: $hook_path"
-    
-    # Check existing hook
-    local existing_hook=$(check_existing_hook "$hook_path")
-    
-    if [ "$existing_hook" = "other" ]; then
-        echo -e "${RED}⚠️  Another prepare-commit-msg hook exists at: $hook_path${NC}"
-        read -p "Do you want to overwrite it? (y/N) " -n 1 -r < /dev/tty
-        echo
-        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
-            echo -e "${YELLOW}Skipping $install_type installation${NC}"
-            return
-        fi
-    fi
-
-    # Create directory with verbose output
-    echo -e "Creating directory: $(dirname "$hook_path")"
-    if ! mkdir -p "$(dirname "$hook_path")" 2>/dev/null; then
-        echo -e "${RED}Failed to create directory: $(dirname "$hook_path")${NC}"
-        echo -e "Attempting with sudo..."
-        sudo mkdir -p "$(dirname "$hook_path")"
-    fi
-
-    # Copy hook file with verbose output
-    echo -e "Copying hook from: $SCRIPT_DIR/gitguard-prepare.py"
-    if ! cp "$SCRIPT_DIR/gitguard-prepare.py" "$hook_path" 2>/dev/null; then
-        echo -e "${RED}Failed to copy hook file${NC}"
-        echo -e "Attempting with sudo..."
-        sudo cp "$SCRIPT_DIR/gitguard-prepare.py" "$hook_path"
-    fi
-
-    # Set permissions with verbose output
-    echo -e "Setting execute permissions"
-    if ! chmod +x "$hook_path" 2>/dev/null; then
-        echo -e "${RED}Failed to set permissions${NC}"
-        echo -e "Attempting with sudo..."
-        sudo chmod +x "$hook_path"
-    fi
-    
-    # If this is a global installation, set the global hooks path
-    if [ "$install_type" = "global" ]; then
-        echo -e "Configuring global git hooks path"
-        if ! git config --global core.hooksPath "$GLOBAL_GIT_DIR" 2>/dev/null; then
-            echo -e "${RED}Failed to set global git hooks path${NC}"
-            echo -e "Attempting with sudo..."
-            sudo git config --global core.hooksPath "$GLOBAL_GIT_DIR"
-        fi
-    fi
-    
-    # Verify installation
-    if [ -x "$hook_path" ]; then
-        echo -e "${GREEN}✅ GitGuard installed successfully for $install_type use!${NC}"
-        echo -e "Hook location: $hook_path"
-    else
-        echo -e "${RED}❌ Installation failed. Please check permissions and try again.${NC}"
-        echo -e "You may need to run the script with sudo or manually create the directory:"
-        echo -e "mkdir -p \"$(dirname "$hook_path")\""
-        exit 1
-    fi
-}
-
-main() {
-    echo -e "${BLUE}Welcome to GitGuard Installation!${NC}"
-    
-    if [ ! -f "$SCRIPT_DIR/gitguard-prepare.py" ]; then
-        echo -e "${RED}❌ Error: Could not find gitguard-prepare.py in $SCRIPT_DIR${NC}"
-        exit 1
-    fi
-
-    local status=($(check_installation_status))
-    local project_status=$(echo "${status[0]}" | cut -d':' -f2)
-    local global_status=$(echo "${status[1]}" | cut -d':' -f2)
-    
-    # Show current status
-    echo -e "\n${BLUE}Current Installation Status:${NC}"
-    if git rev-parse --git-dir > /dev/null 2>&1; then
-        echo -e " Project ($(git rev-parse --show-toplevel)): ${project_status:-none}"
-    fi
-    echo -e "🌍 Global: ${global_status:-none}"
-    
-    # Determine installation options
-    if [ "$project_status" = "none" ] && [ "$global_status" = "none" ]; then
-        # Both are not installed - ask where to install
-        echo -e "\nWhere would you like to install GitGuard?"
-        echo -e "1) Project only ${GREEN}[default]${NC}"
-        echo -e "2) Global only"
-        echo -e "3) Both project and global"
-        read -p "Select an option (1-3, press Enter for default): " -r < /dev/tty
-        echo
-        
-        # Default to option 1 if Enter is pressed
-        REPLY=${REPLY:-1}
-        
-        case $REPLY in
-            1) handle_installation "$(git rev-parse --git-dir)/hooks" "project" ;;
-            2) handle_installation "$GLOBAL_GIT_DIR" "global" ;;
-            3)
-                handle_installation "$(git rev-parse --git-dir)/hooks" "project"
-                handle_installation "$GLOBAL_GIT_DIR" "global"
-                ;;
-            *) 
-                echo -e "${YELLOW}Invalid option. Using default: Project only${NC}"
-                handle_installation "$(git rev-parse --git-dir)/hooks" "project"
-                ;;
-        esac
-    else
-        # At least one is installed - show reinstall/install options
-        echo -e "\n${YELLOW}Installation options:${NC}"
-        if [ "$project_status" = "none" ]; then
-            echo -e "1) Install project hooks"
-        else
-            echo -e "1) Reinstall project hooks"
-        fi
-        if [ "$global_status" = "none" ]; then
-            echo -e "2) Install global hooks"
-        else
-            echo -e "2) Reinstall global hooks"
-        fi
-        echo -e "3) Cancel ${GREEN}[default]${NC}"
-        
-        read -p "Select an option (1-3, press Enter to cancel): " -r < /dev/tty
-        echo
-        
-        case $REPLY in
-            1) 
-                if [ -n "$(git rev-parse --git-dir 2>/dev/null)" ]; then
-                    handle_installation "$(git rev-parse --git-dir)/hooks" "project"
-                else
-                    echo -e "${RED}Not in a git repository${NC}"
-                fi
-                ;;
-            2) handle_installation "$GLOBAL_GIT_DIR" "global" ;;
-            *) 
-                echo -e "${YELLOW}Installation cancelled.${NC}"
-                exit 0
-                ;;
-        esac
-    fi
-}
-
-handle_remote_install() {
-    # Create temporary directory
-    local temp_dir=$(mktemp -d)
-    trap 'rm -rf "$temp_dir"' EXIT
-
-    echo -e "${BLUE}Downloading GitGuard...${NC}"
-    
-    # Download the necessary files
-    curl -s -o "$temp_dir/gitguard-prepare.py" "https://raw.githubusercontent.com/deeeed/universe/main/packages/gitguard/gitguard-prepare.py"
-    
-    if [ ! -f "$temp_dir/gitguard-prepare.py" ]; then
-        echo -e "${RED}❌ Failed to download GitGuard files${NC}"
-        exit 1
-    fi
-
-    # Set script directory to temp directory for installation
-    SCRIPT_DIR="$temp_dir"
-    
-    # Force interactive mode
-    export INTERACTIVE=1
-    
-    # Run the main installation
-    main
-}
-
-# Check how the script was invoked
-if [ -n "$BASH_SOURCE" ] && [ "${BASH_SOURCE[0]}" != "$0" ]; then
-    # Script is being sourced
-    export CURL_INSTALL=1
-else
-    # Script is being executed directly
-    if [ -n "$CURL_INSTALL" ] || [ "$1" = "--remote" ]; then
-        handle_remote_install
-    else
-        main
-    fi
-fi
diff --git c/packages/gitguard/jest.config.cjs i/packages/gitguard/jest.config.cjs
new file mode 100644
index 0000000..dd7e024
--- /dev/null
+++ i/packages/gitguard/jest.config.cjs
@@ -0,0 +1,56 @@
+/** @type {import('@jest/types').Config.InitialOptions} */
+const config = {
+  projects: [
+    {
+      displayName: "unit",
+      testMatch: [
+        "<rootDir>/src/**/*.test.ts",
+        "!<rootDir>/src/**/*.integration.test.ts",
+      ],
+      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
+      transform: {
+        "^.+\\.tsx?$": [
+          "ts-jest",
+          {
+            useESM: true,
+          },
+        ],
+      },
+      moduleNameMapper: {
+        "@siteed/gitguard": "<rootDir>/src",
+        "(.+)\\.js": "$1",
+      },
+      testEnvironment: "node",
+      extensionsToTreatAsEsm: [".ts"],
+      moduleFileExtensions: ["ts", "js", "json", "node"],
+      rootDir: ".",
+    },
+    {
+      displayName: "integration",
+      testMatch: ["<rootDir>/src/**/*.integration.test.ts"],
+      setupFilesAfterEnv: ["<rootDir>/jest.integration.setup.ts"],
+      transform: {
+        "^.+\\.tsx?$": [
+          "ts-jest",
+          {
+            useESM: true,
+          },
+        ],
+      },
+      moduleNameMapper: {
+        "@siteed/gitguard": "<rootDir>/src",
+        "(.+)\\.js": "$1",
+      },
+      testEnvironment: "node",
+      extensionsToTreatAsEsm: [".ts"],
+      moduleFileExtensions: ["ts", "js", "json", "node"],
+      rootDir: ".",
+    },
+  ],
+  verbose: true,
+  collectCoverage: true,
+  coverageDirectory: "coverage",
+  coverageReporters: ["text", "lcov"],
+};
+
+module.exports = config;
diff --git c/packages/gitguard/jest.config.ts i/packages/gitguard/jest.config.ts
deleted file mode 100644
index 04707e3..0000000
--- c/packages/gitguard/jest.config.ts
+++ /dev/null
@@ -1,33 +0,0 @@
-import type { Config } from "@jest/types";
-
-const config: Config.InitialOptions = {
-  preset: "ts-jest",
-  testEnvironment: "node",
-  roots: ["<rootDir>/src"],
-  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
-  transform: {
-    "^.+\\.ts$": [
-      "ts-jest",
-      {
-        tsconfig: "tsconfig.test.json", // Point to test config
-      },
-    ],
-  },
-  moduleFileExtensions: ["ts", "js", "json", "node"],
-  collectCoverageFrom: [
-    "src/**/*.ts",
-    "!src/**/*.d.ts",
-    "!src/**/__tests__/**",
-  ],
-  coverageThreshold: {
-    global: {
-      branches: 80,
-      functions: 80,
-      lines: 80,
-      statements: 80,
-    },
-  },
-  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
-};
-
-export default config;
diff --git c/packages/gitguard/jest.integration.setup.ts i/packages/gitguard/jest.integration.setup.ts
new file mode 100644
index 0000000..77b3e2f
--- /dev/null
+++ i/packages/gitguard/jest.integration.setup.ts
@@ -0,0 +1,12 @@
+// Increase timeout for integration tests
+jest.setTimeout(10000);
+
+// Silence console logs during tests
+// const mockConsole = {
+//   log: jest.fn(),
+//   info: jest.fn(),
+//   error: jest.fn(),
+//   warn: jest.fn(),
+// } as unknown as Console;
+
+// global.console = mockConsole;
diff --git c/packages/gitguard/jest.setup.ts i/packages/gitguard/jest.setup.ts
index 6e16798..725130b 100644
--- c/packages/gitguard/jest.setup.ts
+++ i/packages/gitguard/jest.setup.ts
@@ -1,5 +1,5 @@
-// Increase timeout for all tests
-jest.setTimeout(10000);
+// Already has the timeout for unit tests
+jest.setTimeout(5000);
 
 // Silence console logs during tests
 const mockConsole = {
diff --git c/packages/gitguard/package.json i/packages/gitguard/package.json
index c2f7ae8..053f7f8 100644
--- c/packages/gitguard/package.json
+++ i/packages/gitguard/package.json
@@ -28,7 +28,13 @@
     "build:clean": "yarn clean && yarn build",
     "build:types": "tsc --project tsconfig.types.json",
     "typecheck": "tsc -p tsconfig.test.json --noEmit && tsc -p tsconfig.json --noEmit",
-    "test": "jest",
+    "test": "NODE_OPTIONS='--loader ts-node/esm' jest --config jest.config.cjs --selectProjects unit",
+    "test:unit": "NODE_OPTIONS='--loader ts-node/esm' jest --config jest.config.cjs --selectProjects unit",
+    "test:unit:watch": "NODE_OPTIONS='--loader ts-node/esm' jest --config jest.config.cjs --selectProjects unit --watch",
+    "test:integration": "NODE_OPTIONS='--loader ts-node/esm' jest --config jest.config.cjs --selectProjects integration",
+    "test:integration:watch": "NODE_OPTIONS='--loader ts-node/esm' jest --config jest.config.cjs --selectProjects integration --watch",
+    "test:all": "NODE_OPTIONS='--loader ts-node/esm' jest --config jest.config.cjs --selectProjects unit integration",
+    "test:e2e": "NODE_OPTIONS='--loader ts-node/esm' ts-node --esm ./e2e/index.ts --interactive",
     "test:e2e:commit:basic": "NODE_OPTIONS='--loader ts-node/esm' ts-node --esm ./e2e/index.ts --tests=commit-message --scenario=basic-formatting",
     "test:e2e:commit:monorepo": "NODE_OPTIONS='--loader ts-node/esm' ts-node --esm ./e2e/index.ts --tests=commit-message --scenario=monorepo-detection",
     "test:e2e:commit:multi": "NODE_OPTIONS='--loader ts-node/esm' ts-node --esm ./e2e/index.ts --tests=commit-message --scenario=multi-package",
@@ -46,7 +52,6 @@
     "test:e2e:branch:split": "NODE_OPTIONS='--loader ts-node/esm' ts-node --esm ./e2e/index.ts --tests=branch-features --scenario=branch-split-suggestion",
     "test:e2e:branch:template": "NODE_OPTIONS='--loader ts-node/esm' ts-node --esm ./e2e/index.ts --tests=branch-features --scenario=pr-template-parsing",
     "test:e2e:branch:complex": "NODE_OPTIONS='--loader ts-node/esm' ts-node --esm ./e2e/index.ts --tests=branch-features --scenario=complex-branch-split",
-    "test:e2e": "NODE_OPTIONS='--loader ts-node/esm' ts-node --esm ./e2e/index.ts --interactive ",
     "lint": "eslint \"**/*.ts\"",
     "lint:fix": "eslint \"**/*.ts\" --fix",
     "format": "prettier --write \"src/**/*.ts\" \"bin/**/*.ts\"",
@@ -78,6 +83,7 @@
     "eslint": "^8.56.0",
     "eslint-config-prettier": "^9.0.0",
     "eslint-plugin-prettier": "^5.0.1",
+    "jest": "^29.7.0",
     "rimraf": "^5.0.5",
     "rollup": "^4.12.0",
     "ts-jest": "^29.1.1",
diff --git c/packages/gitguard/src/services/git.service.integration.test.ts i/packages/gitguard/src/services/git.service.integration.test.ts
new file mode 100644
index 0000000..3a17fa7
--- /dev/null
+++ i/packages/gitguard/src/services/git.service.integration.test.ts
@@ -0,0 +1,159 @@
+import { exec } from "child_process";
+import { mkdtemp, rm, writeFile } from "fs/promises";
+import { tmpdir } from "os";
+import { join } from "path";
+import { promisify } from "util";
+import { GitService } from "./git.service.js";
+
+const execPromise = promisify(exec);
+
+describe("GitService Integration Tests", () => {
+  let tempDir: string;
+  let gitService: GitService;
+
+  beforeEach(async () => {
+    // Create a temporary directory for each test
+    tempDir = await mkdtemp(join(tmpdir(), "gitguard-test-"));
+
+    // Initialize git service with temp directory
+    gitService = new GitService({
+      gitConfig: {
+        cwd: tempDir,
+        baseBranch: "main",
+        monorepoPatterns: [],
+        ignorePatterns: [],
+      },
+      logger: {
+        debug: jest.fn(),
+        info: jest.fn(),
+        warn: jest.fn(),
+        error: jest.fn(),
+        success: jest.fn(),
+        warning: jest.fn(),
+        raw: jest.fn(),
+        newLine: jest.fn(),
+        table: jest.fn(),
+        isDebug: jest.fn(),
+      },
+    });
+
+    // Initialize git repository
+    await execPromise("git init", { cwd: tempDir });
+  });
+
+  afterEach(async () => {
+    // Cleanup temporary directory
+    await rm(tempDir, { recursive: true, force: true });
+  });
+
+  describe("getCurrentBranch", () => {
+    it("should return default branch for new repository", async () => {
+      const branch = await gitService.getCurrentBranch();
+      expect(branch).toBe("main");
+    });
+
+    it("should return correct branch after first commit", async () => {
+      // Create and commit a file
+      await writeFile(join(tempDir, "test.txt"), "test content");
+      await execPromise("git add .", { cwd: tempDir });
+      await execPromise('git commit -m "Initial commit"', { cwd: tempDir });
+
+      const branch = await gitService.getCurrentBranch();
+      expect(branch).toBe("main");
+    });
+
+    it("should return new branch name after branch creation", async () => {
+      // Setup initial commit
+      await writeFile(join(tempDir, "test.txt"), "test content");
+      await execPromise("git add .", { cwd: tempDir });
+      await execPromise('git commit -m "Initial commit"', { cwd: tempDir });
+
+      // Create and checkout new branch
+      await execPromise("git checkout -b feature-branch", { cwd: tempDir });
+
+      const branch = await gitService.getCurrentBranch();
+      expect(branch).toBe("feature-branch");
+    });
+  });
+
+  describe("getStagedChanges", () => {
+    it("should return empty array for new repository", async () => {
+      const changes = await gitService.getStagedChanges();
+      expect(changes).toEqual([]);
+    });
+
+    it("should return staged files", async () => {
+      // Create and stage a file
+      await writeFile(join(tempDir, "test.txt"), "test content");
+      await execPromise("git add .", { cwd: tempDir });
+
+      const changes = await gitService.getStagedChanges();
+      expect(changes).toHaveLength(1);
+      expect(changes[0]).toMatchObject({
+        path: "test.txt",
+        additions: 1,
+        deletions: 0,
+      });
+    });
+  });
+
+  describe("getUnstagedChanges", () => {
+    it("should return empty array for new repository", async () => {
+      const changes = await gitService.getUnstagedChanges();
+      expect(changes).toEqual([]);
+    });
+
+    it("should return unstaged files", async () => {
+      // Create file without staging
+      await writeFile(join(tempDir, "test.txt"), "test content");
+
+      const changes = await gitService.getUnstagedChanges();
+      expect(changes).toHaveLength(1);
+      expect(changes[0]).toMatchObject({
+        path: "test.txt",
+        status: "untracked",
+      });
+    });
+
+    it("should return modified files", async () => {
+      // Create and commit a file
+      await writeFile(join(tempDir, "test.txt"), "initial content");
+      await execPromise("git add .", { cwd: tempDir });
+      await execPromise('git commit -m "Initial commit"', { cwd: tempDir });
+
+      // Modify the file
+      await writeFile(join(tempDir, "test.txt"), "modified content");
+
+      const changes = await gitService.getUnstagedChanges();
+      expect(changes).toHaveLength(1);
+      expect(changes[0]).toMatchObject({
+        path: "test.txt",
+        status: "modified",
+      });
+    });
+  });
+
+  describe("renameBranch", () => {
+    beforeEach(async () => {
+      // Setup initial commit
+      await writeFile(join(tempDir, "test.txt"), "test content");
+      await execPromise("git add .", { cwd: tempDir });
+      await execPromise('git commit -m "Initial commit"', { cwd: tempDir });
+    });
+
+    it("should rename current branch", async () => {
+      await gitService.renameBranch({ from: "main", to: "new-main" });
+      const branch = await gitService.getCurrentBranch();
+      expect(branch).toBe("new-main");
+    });
+
+    it("should throw error when target branch exists", async () => {
+      // Create target branch
+      await execPromise("git branch new-main", { cwd: tempDir });
+
+      await expect(
+        gitService.renameBranch({ from: "main", to: "new-main" }),
+      ).rejects.toThrow('Branch "new-main" already exists');
+    });
+  });
+});
diff --git c/packages/gitguard/src/services/git.service.ts i/packages/gitguard/src/services/git.service.ts
index 176b9c5..fba6ad5 100644
--- c/packages/gitguard/src/services/git.service.ts
+++ i/packages/gitguard/src/services/git.service.ts
@@ -39,6 +39,22 @@ export class GitService extends BaseService {
   async getCurrentBranch(): Promise<string> {
     try {
       this.logger.debug("Getting current branch");
+
+      // First check if there are any commits
+      const hasCommits = await this.execGit({
+        command: "rev-parse",
+        args: ["--verify", "HEAD"],
+      }).catch(() => false);
+
+      if (!hasCommits) {
+        // If no commits exist, we're on the default branch (usually 'main' or 'master')
+        const defaultBranch = this.gitConfig.baseBranch || "main";
+        this.logger.debug(
+          `No commits yet, returning default branch: ${defaultBranch}`,
+        );
+        return defaultBranch;
+      }
+
       const result = await this.execGit({
         command: "rev-parse",
         args: ["--abbrev-ref", "HEAD"],
@@ -347,7 +363,7 @@ export class GitService extends BaseService {
       let currentChanges: string[] = [];
 
       output.split("\n").forEach((line) => {
-        if (line.match(/^[0-9a-f]{40}$/)) {
+        if (/^[0-9a-f]{40}$/.exec(line)) {
           // This is a commit hash line
           if (currentHash && currentChanges.length) {
             changesByCommit.set(
diff --git c/packages/gitguard/tsconfig.json i/packages/gitguard/tsconfig.json
index 9997105..13b385d 100644
--- c/packages/gitguard/tsconfig.json
+++ i/packages/gitguard/tsconfig.json
@@ -38,8 +38,10 @@
     "bin/**/*",
     ".publisher/**/*",
     "package.json",
-    "jest.config.ts",
+    "jest.config.cjs",
     "jest.setup.ts",
+    "jest.integration.config.ts",
+    "jest.integration.setup.ts",
     "e2e/**/*"
   ],
   "exclude": [
diff --git c/packages/gitguard/tsconfig.test.json i/packages/gitguard/tsconfig.test.json
index 461f6cd..91b01da 100644
--- c/packages/gitguard/tsconfig.test.json
+++ i/packages/gitguard/tsconfig.test.json
@@ -8,7 +8,9 @@
       "src/**/*",
       "e2e/**/*",
       "jest.setup.ts",
-      "jest.config.ts"
+      "jest.config.ts",
+      "jest.integration.setup.ts",
+      "jest.integration.config.ts"
     ],
     "exclude": ["node_modules", "dist"]
   }
diff --git c/yarn.lock i/yarn.lock
index cecf371..0ded781 100644
--- c/yarn.lock
+++ i/yarn.lock
@@ -6311,6 +6311,7 @@ __metadata:
     eslint-config-prettier: "npm:^9.0.0"
     eslint-plugin-prettier: "npm:^5.0.1"
     inquirer: "npm:^12.0.1"
+    jest: "npm:^29.7.0"
     js-tiktoken: "npm:^1.0.15"
     openai: "npm:^4.70.2"
     rimraf: "npm:^5.0.5"

```

Original message: ""

Please provide analysis in this JSON format:
{
  "reason": "explanation why changes should be split OR why they work well together (max 100 chars)",
  "suggestions": [
    {
      "message": "conventional commit message",
      "files": ["list of files"],
      "order": 1,
      "type": "commit type (feat|fix|refactor|etc)",
      "scope": "affected component or area"
    }
  ],
  "commands": [
    "git commands to execute the split"
  ]
}

Guidelines:
1. If changes are cohesive (e.g., single feature, related components), return empty suggestions array
2. Only suggest splits for truly separate concerns or unrelated changes
3. Keep related changes together (e.g., component + its types + its tests)
4. Follow conventional commits format
5. Order suggestions by importance (1 being most important)
6. Consider package boundaries in monorepo setups
7. Provide clear reasoning whether splitting or keeping together



------------------------------------

{
"reason": "Changes should be split as they contain distinct concerns: test setup changes, cleanup of old files, and new features",
"suggestions": [
{
"message": "test: migrate to jest projects setup with integration tests",
"files": [
"packages/gitguard/jest.config.cjs",
"packages/gitguard/jest.integration.setup.ts",
"packages/gitguard/jest.setup.ts",
"packages/gitguard/package.json",
"packages/gitguard/tsconfig.json",
"packages/gitguard/tsconfig.test.json",
"packages/gitguard/jest.config.ts"
],
"order": 1,
"type": "test",
"scope": "gitguard"
},
{
"message": "test: add git service integration tests",
"files": [
"packages/gitguard/src/services/git.service.integration.test.ts",
"packages/gitguard/src/services/git.service.ts"
],
"order": 2,
"type": "test",
"scope": "gitguard"
},
{
"message": "chore: cleanup unused files",
"files": [
"packages/gitguard/.check.env",
"packages/gitguard/CONTRIBUTING.md",
"packages/gitguard/docs/refactor.md",
"packages/gitguard/install.sh"
],
"order": 3,
"type": "chore",
"scope": "gitguard"
}
],
"commands": [
"git reset HEAD~1",
"git add packages/gitguard/jest.config.cjs packages/gitguard/jest.integration.setup.ts packages/gitguard/jest.setup.ts packages/gitguard/package.json packages/gitguard/tsconfig.json packages/gitguard/tsconfig.test.json packages/gitguard/jest.config.ts",
"git commit -m 'test(gitguard): migrate to jest projects setup with integration tests'",
"git add packages/gitguard/src/services/git.service.integration.test.ts packages/gitguard/src/services/git.service.ts",
"git commit -m 'test(gitguard): add git service integration tests'",
"git add packages/gitguard/.check.env packages/gitguard/CONTRIBUTING.md packages/gitguard/docs/refactor.md packages/gitguard/install.sh",
"git commit -m 'chore(gitguard): cleanup unused files'"
]
}
