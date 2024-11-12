import { Config } from "../types/config.types.js";
import { GitService } from "./git.service.js";
import { Logger } from "../types/logger.types.js";
import { CommitService } from "./commit.service.js";

describe("parseConventionalCommit", () => {
  const service = new CommitService({
    config: {} as Config,
    git: {} as GitService,
    logger: {} as Logger,
  });

  it("should parse standard conventional commit format", () => {
    const result = service.parseConventionalCommit(
      "fix: correct type definition",
    );
    expect(result).toEqual({
      type: "fix",
      scope: undefined,
      breaking: false,
      description: "correct type definition",
    });
  });

  it("should parse commit with scope", () => {
    const result = service.parseConventionalCommit(
      "feat(core): add new feature",
    );
    expect(result).toEqual({
      type: "feat",
      scope: "core",
      breaking: false,
      description: "add new feature",
    });
  });

  it("should parse breaking change", () => {
    const result = service.parseConventionalCommit(
      "feat(api)!: breaking change",
    );
    expect(result).toEqual({
      type: "feat",
      scope: "api",
      breaking: true,
      description: "breaking change",
    });
  });

  it("should return null for invalid format", () => {
    const result = service.parseConventionalCommit("invalid commit message");
    expect(result).toBeNull();
  });
});
