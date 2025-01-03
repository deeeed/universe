import globby from "globby";
import { readFile } from "node:fs/promises";
import path from "path";
import { PackageJson } from "../../types/config";
import { WorkspaceService } from "../workspace";
import fs from "fs";
import { Logger } from "../../utils/logger";
import { MonorepoConfig } from "../../types/config";
import { generateDefaultConfig } from "../../templates/package-config.template";

// Mock modules
jest.mock("globby", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("node:fs/promises", () => ({
  readFile: jest.fn(),
}));

jest.mock("fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Add mockConfig definition
const mockConfig: MonorepoConfig = {
  ...generateDefaultConfig({
    packageJson: { name: "test-package" },
    packageManager: "yarn",
    conventionalCommits: true,
    changelogFormat: "conventional",
    versionStrategy: "independent",
    bumpStrategy: "prompt",
    npm: {
      publish: true,
      access: "public",
    },
  }),
  maxConcurrency: 1,
  packages: {},
  ignorePackages: [],
  packValidation: {
    enabled: true,
    validateFiles: true,
    validateBuildArtifacts: true,
    requiredFiles: ["dist/", "README.md"],
  },
};

describe("WorkspaceService", () => {
  let workspaceService: WorkspaceService;
  let mockLogger: Logger;
  const mockRootDir = "/mock/root";

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock process.cwd to return a consistent path
    jest.spyOn(process, "cwd").mockReturnValue(mockRootDir);

    // Create a mock logger
    mockLogger = new Logger();
    jest
      .spyOn(mockLogger, "warning")
      .mockImplementation(function (this: void) {});
    jest
      .spyOn(mockLogger, "error")
      .mockImplementation(function (this: void) {});

    // Mock fs.existsSync to return true for package.json
    (fs.existsSync as jest.Mock).mockImplementation((path: string) =>
      path.endsWith("package.json"),
    );
    // Mock fs.readFileSync to return a workspace config
    (fs.readFileSync as jest.Mock).mockImplementation(() =>
      JSON.stringify({ workspaces: ["packages/*"] }),
    );

    // Create workspace service with undefined config and logger
    workspaceService = new WorkspaceService(undefined, mockLogger);
  });

  describe("getPackages", () => {
    it("should detect workspace packages correctly", async () => {
      const mockPackages = ["packages/pkg-a", "packages/pkg-b"];

      const mockPackageJsons: Record<string, PackageJson> = {
        "packages/pkg-a": {
          name: "@scope/pkg-a",
          version: "1.0.0",
        },
        "packages/pkg-b": {
          name: "@scope/pkg-b",
          version: "2.0.0",
        },
        "": {
          workspaces: ["packages/*"],
        },
      };

      const globbyMock = globby as jest.MockedFunction<typeof globby>;
      globbyMock.mockResolvedValue(mockPackages);

      const readFileMock = readFile as jest.MockedFunction<typeof readFile>;
      readFileMock.mockImplementation((filePath) => {
        const relativePath = path
          .relative(process.cwd(), filePath as string)
          .split(path.sep)
          .join("/");
        const pkgPath =
          relativePath === "package.json"
            ? ""
            : relativePath.replace(/\/?package\.json$/, "");
        const packageJson = mockPackageJsons[pkgPath];

        if (!packageJson) {
          throw new Error(`Mock package.json not found for path: ${pkgPath}`);
        }

        return Promise.resolve(JSON.stringify(packageJson));
      });

      const packages = await workspaceService.getPackages();

      expect(packages).toHaveLength(2);
      expect(packages[0].name).toBe("@scope/pkg-a");
      expect(packages[1].name).toBe("@scope/pkg-b");
    });

    it("should skip packages without a name", async () => {
      const mockPackages = ["packages/pkg-unnamed"];
      const mockPackageJsons: Record<string, PackageJson> = {
        "packages/pkg-unnamed": {
          version: "1.0.0",
        },
        "": {
          workspaces: ["packages/*"],
        },
      };

      const globbyMock = globby as jest.MockedFunction<typeof globby>;
      globbyMock.mockResolvedValue(
        mockPackages.map((pkg) => path.join(mockRootDir, pkg)),
      );

      const readFileMock = readFile as jest.MockedFunction<typeof readFile>;
      readFileMock.mockImplementation((filePath) => {
        const relativePath = path
          .relative(mockRootDir, filePath as string)
          .split(path.sep)
          .join("/");
        const pkgPath = relativePath.replace(/\/?package\.json$/, "");
        const packageJson = mockPackageJsons[pkgPath];

        if (!packageJson) {
          throw new Error(`Mock package.json not found for path: ${pkgPath}`);
        }

        return Promise.resolve(JSON.stringify(packageJson));
      });

      const packages = await workspaceService.getPackages();

      expect(packages).toHaveLength(0);
    });

    it("should handle workspaces defined as an object with packages array", async () => {
      const mockPackages = ["packages/pkg-a"];
      const mockPackageJsons: Record<string, PackageJson> = {
        "packages/pkg-a": {
          name: "@scope/pkg-a",
          version: "1.0.0",
        },
        "": {
          workspaces: {
            packages: ["packages/*"],
          },
        },
      };

      const globbyMock = globby as jest.MockedFunction<typeof globby>;
      globbyMock.mockResolvedValue(mockPackages);

      const readFileMock = readFile as jest.MockedFunction<typeof readFile>;
      readFileMock.mockImplementation((filePath) => {
        const relativePath = path
          .relative(process.cwd(), filePath as string)
          .split(path.sep)
          .join("/");
        const pkgPath =
          relativePath === "package.json"
            ? ""
            : relativePath.replace(/\/?package\.json$/, "");
        const packageJson = mockPackageJsons[pkgPath];

        if (!packageJson) {
          throw new Error(`Mock package.json not found for path: ${pkgPath}`);
        }

        return Promise.resolve(JSON.stringify(packageJson));
      });

      const packages = await workspaceService.getPackages();

      expect(packages).toHaveLength(1);
      expect(packages[0].name).toBe("@scope/pkg-a");
    });

    it("should correctly parse dependencies", async () => {
      const mockPackages = ["packages/pkg-a"];
      const mockPackageJsons: Record<string, PackageJson> = {
        "packages/pkg-a": {
          name: "@scope/pkg-a",
          version: "1.0.0",
          dependencies: {
            lodash: "^4.17.21",
          },
          devDependencies: {
            jest: "^27.0.0",
          },
          peerDependencies: {
            react: "^17.0.0",
          },
        },
        "": {
          workspaces: ["packages/*"],
        },
      };

      const globbyMock = globby as jest.MockedFunction<typeof globby>;
      globbyMock.mockResolvedValue(mockPackages);

      const readFileMock = readFile as jest.MockedFunction<typeof readFile>;
      readFileMock.mockImplementation((filePath) => {
        const relativePath = path
          .relative(process.cwd(), filePath as string)
          .split(path.sep)
          .join("/");
        const pkgPath =
          relativePath === "package.json"
            ? ""
            : relativePath.replace(/\/?package\.json$/, "");
        const packageJson = mockPackageJsons[pkgPath];

        if (!packageJson) {
          throw new Error(`Mock package.json not found for path: ${pkgPath}`);
        }

        return Promise.resolve(JSON.stringify(packageJson));
      });

      const packages = await workspaceService.getPackages();

      expect(packages).toHaveLength(1);
      const pkg = packages[0];
      expect(pkg.dependencies).toEqual({ lodash: "^4.17.21" });
      expect(pkg.devDependencies).toEqual({ jest: "^27.0.0" });
      expect(pkg.peerDependencies).toEqual({ react: "^17.0.0" });
    });
  });

  describe("getPackageConfig", () => {
    it("should return package-specific config when it exists", async () => {
      const packageName = "@scope/pkg-a";
      const packagePath = "packages/pkg-a";

      // Initialize WorkspaceService with mockConfig
      workspaceService = new WorkspaceService(mockConfig, mockLogger);

      // Populate the package cache directly
      workspaceService["packageCache"].set(packageName, {
        name: packageName,
        path: packagePath,
        currentVersion: "1.0.0",
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
      });

      // Mock readFile for package.json
      const readFileMock = readFile as jest.MockedFunction<typeof readFile>;
      readFileMock.mockImplementation((filePath) => {
        // Handle FileHandle case
        if (
          typeof filePath === "object" &&
          filePath !== null &&
          "fd" in filePath
        ) {
          throw new Error("FileHandle not supported in mock");
        }

        // Convert PathLike to string
        const pathString = Buffer.isBuffer(filePath)
          ? filePath.toString("utf8")
          : filePath instanceof URL
            ? filePath.pathname
            : String(filePath);

        if (pathString.endsWith("package.json")) {
          return Promise.resolve(
            JSON.stringify({
              name: packageName,
              version: "1.0.0",
            }),
          );
        }
        throw new Error(`Unexpected file read: ${pathString}`);
      });

      // Get the package config
      const config = await workspaceService.getPackageConfig(packageName);

      expect(config).toBeDefined();
      expect(config.packageManager).toBe("yarn");
      expect(config.packValidation).toEqual({
        enabled: true,
        validateFiles: true,
        validateBuildArtifacts: true,
        requiredFiles: ["dist/", "README.md"],
      });
    });

    it("should return default config when package-specific config does not exist", async () => {
      const packageName = "@scope/pkg-a";
      workspaceService["packageCache"].set(packageName, {
        name: packageName,
        path: "packages/pkg-a",
        currentVersion: "1.0.0",
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
      });

      const config = await workspaceService.getPackageConfig(packageName);

      expect(config).toBeDefined();
      expect(config.packageManager).toBe("yarn");
      expect(config.packValidation).toEqual({
        enabled: true,
        validateFiles: true,
        validateBuildArtifacts: true,
        requiredFiles: undefined,
      });
    });
  });
});
