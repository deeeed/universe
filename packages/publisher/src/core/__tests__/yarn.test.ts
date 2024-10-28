import { YarnService } from "../yarn";
import { NpmConfig, PackageContext } from "../../types/config";
import { mocked } from "jest-mock";
import execa, { ExecaReturnValue } from "execa";

jest.mock("execa");
const mockExeca = mocked(execa);

describe("YarnService", () => {
  const mockConfig: NpmConfig = {
    registry: "https://registry.npmjs.org",
    tag: "latest",
    access: "public",
    publish: true,
  };

  const mockContext: PackageContext = {
    path: "/test/path",
    name: "test-package",
    currentVersion: "1.0.0",
  };
  const service = new YarnService(mockConfig);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateAuth", () => {
    it("should validate authentication successfully", async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: Buffer.from("user"),
      } as ExecaReturnValue<Buffer>);

      await expect(service.validateAuth()).resolves.not.toThrow();
      expect(mockExeca).toHaveBeenCalledWith("yarn", [
        "npm",
        "whoami",
        "--registry",
        mockConfig.registry,
      ]);
    });

    it("should throw an error if not authenticated", async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: Buffer.from(""),
      } as ExecaReturnValue<Buffer>);

      await expect(service.validateAuth()).rejects.toThrow(
        "Not authenticated to npm registry",
      );
    });

    it("should throw an error if execa fails", async () => {
      mockExeca.mockRejectedValueOnce(new Error("Authentication error"));

      await expect(service.validateAuth()).rejects.toThrow(
        "yarn npm authentication failed: Authentication error",
      );
    });
  });

  describe("publish", () => {
    it("should publish a package successfully", async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: Buffer.from(""),
      } as ExecaReturnValue<Buffer>);

      const result = await service.publish(mockContext);
      expect(result).toEqual({
        published: true,
        registry: mockConfig.registry,
      });
      expect(mockExeca).toHaveBeenCalledWith(
        "yarn",
        [
          "npm",
          "publish",
          "--registry",
          mockConfig.registry,
          "--tag",
          mockConfig.tag,
          "--access",
          mockConfig.access,
        ],
        { cwd: mockContext.path },
      );
    });

    it("should throw an error if publishing fails", async () => {
      mockExeca.mockRejectedValueOnce(new Error("Publish error"));

      await expect(service.publish(mockContext)).rejects.toThrow(
        "Failed to publish package: Publish error",
      );
    });
  });

  describe("getLatestVersion", () => {
    it("should return the latest version successfully", async () => {
      const mockResponse = Buffer.from(JSON.stringify({ data: "1.2.3" }));
      mockExeca.mockResolvedValueOnce({
        stdout: mockResponse,
      } as ExecaReturnValue<Buffer>);

      const version = await service.getLatestVersion("test-package");
      expect(version).toBe("1.2.3");
      expect(mockExeca).toHaveBeenCalledWith("yarn", [
        "npm",
        "info",
        "test-package",
        "version",
        "--registry",
        mockConfig.registry,
        "--json",
      ]);
    });

    it('should return "0.0.0" if an error occurs', async () => {
      mockExeca.mockRejectedValueOnce(new Error("Error fetching version"));

      const version = await service.getLatestVersion("test-package");
      expect(version).toBe("0.0.0");
    });
  });

  describe("checkWorkspaceIntegrity", () => {
    it("should return true if integrity check passes", async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: Buffer.from(""),
      } as ExecaReturnValue<Buffer>);

      const result = await service.checkWorkspaceIntegrity();
      expect(result).toBe(true);
      expect(mockExeca).toHaveBeenCalledWith("yarn", [
        "install",
        "--check-cache",
      ]);
    });

    it("should return false if integrity check fails", async () => {
      mockExeca.mockRejectedValueOnce(new Error("Integrity check failed"));

      const result = await service.checkWorkspaceIntegrity();
      expect(result).toBe(false);
    });
  });

  describe("getWorkspaceVersion", () => {
    it("should return the workspace version", async () => {
      const mockResponse = Buffer.from(JSON.stringify({ version: "1.0.0" }));
      mockExeca.mockResolvedValueOnce({
        stdout: mockResponse,
      } as ExecaReturnValue<Buffer>);

      const version = await service.getWorkspaceVersion("test-package");
      expect(version).toBe("1.0.0");
      expect(mockExeca).toHaveBeenCalledWith("yarn", [
        "workspaces",
        "info",
        "test-package",
        "--json",
      ]);
    });

    it('should return "0.0.0" if an error occurs', async () => {
      mockExeca.mockRejectedValueOnce(
        new Error("Error fetching workspace version"),
      );

      const version = await service.getWorkspaceVersion("test-package");
      expect(version).toBe("0.0.0");
    });
  });

  describe("updateDependencies", () => {
    it("should update dependencies successfully", async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: Buffer.from(""),
      } as ExecaReturnValue<Buffer>);

      await expect(
        service.updateDependencies(mockContext, ["dep1", "dep2"]),
      ).resolves.not.toThrow();
      expect(mockExeca).toHaveBeenCalledWith("yarn", ["up", "dep1", "dep2"], {
        cwd: mockContext.path,
      });
    });

    it("should throw an error if updating dependencies fails", async () => {
      mockExeca.mockRejectedValueOnce(new Error("Update failed"));

      await expect(
        service.updateDependencies(mockContext, ["dep1", "dep2"]),
      ).rejects.toThrow("Failed to update dependencies: Update failed");
    });
  });

  // Continue with similar adjustments for pack and runScript
});
