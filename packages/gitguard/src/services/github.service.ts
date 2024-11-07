/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { Config } from "../types/config.types.js";
import { Logger } from "../types/logger.types.js";
import { BaseService } from "./base.service.js";
import { GitService } from "./git.service.js";

interface GitHubPR {
  url: string;
  number: number;
  title: string;
  description: string;
}

interface GitHubServiceOptions {
  config: Config;
  logger: Logger;
  git: GitService;
}

interface CreatePRParams {
  owner: string;
  repo: string;
  title: string;
  description: string;
  branch: string;
  baseBranch: string;
  draft?: boolean;
  labels?: string[];
  base?: string;
}

interface GetPRParams {
  owner: string;
  repo: string;
  number: number;
}

interface ListPRsParams {
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
  base?: string;
  head?: string;
}

type PullRequestResponse =
  RestEndpointMethodTypes["pulls"]["get"]["response"]["data"];

type GitHubBranch =
  RestEndpointMethodTypes["repos"]["getBranch"]["response"]["data"];

export class GitHubService extends BaseService {
  private readonly config: Config;
  private readonly octokit?: Octokit;
  private readonly git: GitService;
  private readonly isEnabled: boolean;

  constructor(options: GitHubServiceOptions) {
    super(options);
    this.config = options.config;
    this.git = options.git;

    // Check if GitHub integration is possible
    this.isEnabled = Boolean(this.config.git.github?.token);

    if (this.isEnabled && this.config.git.github?.token) {
      this.octokit = new Octokit({
        auth: this.config.git.github.token,
        ...(this.config.git.github?.enterprise?.url && {
          baseUrl: this.config.git.github.enterprise.url,
        }),
      });
    }

    this.logger.debug("GitHub service initialized:", {
      isEnabled: this.isEnabled,
      hasToken: Boolean(this.config.git.github?.token),
      hasEnterprise: Boolean(this.config.git.github?.enterprise),
    });
  }

  public isGitHubEnabled(): boolean {
    return this.isEnabled;
  }

  public async createPR(params: CreatePRParams): Promise<GitHubPR> {
    if (!this.isEnabled || !this.octokit) {
      throw new Error("GitHub integration is not enabled");
    }

    try {
      this.logger.debug("Creating PR:", params);

      // Get the authenticated user and repository info
      const [{ data: user }, { data: repo }] = await Promise.all([
        this.octokit.users.getAuthenticated(),
        this.octokit.repos.get({
          owner: params.owner,
          repo: params.repo,
        }),
      ]);

      // Check if branch exists
      try {
        await this.octokit.repos.getBranch({
          owner: params.owner,
          repo: params.repo,
          branch: params.branch,
        });
      } catch (error) {
        throw new Error(
          `Branch '${params.branch}' not found or not accessible`,
        );
      }

      // Determine if we're working in a fork
      const isFork = repo.fork;
      const headOwner = isFork ? user.login : params.owner;

      // Construct head reference based on whether we're in a fork
      const headReference = isFork
        ? `${headOwner}:${params.branch}` // Fork: owner:branch
        : params.branch; // Same repo: just branch

      this.logger.debug("PR creation context:", {
        isFork,
        headOwner,
        headReference,
        baseOwner: params.owner,
        baseRepo: params.repo,
        baseBranch: params.baseBranch,
        authenticated: user.login,
      });

      const response = await this.octokit.pulls.create({
        owner: params.owner,
        repo: params.repo,
        title: params.title,
        body: params.description,
        head: headReference,
        base: params.baseBranch,
        draft: params.draft,
      });

      if (params.labels?.length) {
        await this.octokit.issues.addLabels({
          owner: params.owner,
          repo: params.repo,
          issue_number: response.data.number,
          labels: params.labels,
        });
      }

      this.logger.debug("PR created successfully:", response.data.html_url);
      return this.transformPullRequest(response.data);
    } catch (error) {
      this.logger.error("Failed to create PR:", error);
      throw error;
    }
  }

  public async getPR(params: GetPRParams): Promise<GitHubPR> {
    if (!this.isEnabled || !this.octokit) {
      throw new Error("GitHub integration is not enabled");
    }

    try {
      this.logger.debug("Getting PR:", params);

      const response = await this.octokit.pulls.get({
        owner: params.owner,
        repo: params.repo,
        pull_number: params.number,
      });

      return this.transformPullRequest(response.data);
    } catch (error) {
      this.logger.error("Failed to get PR:", error);
      throw error;
    }
  }

  public async listPRs(params: ListPRsParams): Promise<GitHubPR[]> {
    if (!this.isEnabled || !this.octokit) {
      throw new Error("GitHub integration is not enabled");
    }

    try {
      this.logger.debug("Listing PRs:", params);

      const response = await this.octokit.pulls.list({
        owner: params.owner,
        repo: params.repo,
        state: params.state ?? "open",
        base: params.base,
        head: params.head,
      });

      return response.data.map((pr) =>
        this.transformPullRequest(pr as PullRequestResponse),
      );
    } catch (error) {
      this.logger.error("Failed to list PRs:", error);
      throw error;
    }
  }

  public async getGitHubInfo(): Promise<{ owner: string; repo: string }> {
    if (!this.isEnabled || !this.octokit) {
      throw new Error("GitHub integration is not enabled");
    }

    try {
      const remoteUrl = await this.git.execGit({
        command: "config",
        args: ["--get", "remote.origin.url"],
      });

      this.logger.debug("Getting GitHub repo info for:", remoteUrl);

      // Clean up the URL and extract owner/repo
      const cleanUrl = remoteUrl.trim();
      const urlRegex = /github\.com[:/]([^/]+)\/([^/.]+)/;
      const urlMatch = urlRegex.exec(cleanUrl);

      if (!urlMatch) {
        throw new Error(`Invalid GitHub URL format: ${cleanUrl}`);
      }

      const [, owner, repo] = urlMatch;

      // Validate repository exists using Octokit
      const { data } = await this.octokit.repos.get({
        owner,
        repo,
      });

      this.logger.debug("Validated GitHub repo:", {
        owner: data.owner.login,
        repo: data.name,
      });

      return {
        owner: data.owner.login,
        repo: data.name,
      };
    } catch (error) {
      this.logger.error("Failed to validate GitHub repository:", error);
      throw new Error("Not a valid GitHub repository");
    }
  }

  public async isGitHubRepo(): Promise<boolean> {
    try {
      await this.getGitHubInfo();
      return true;
    } catch {
      return false;
    }
  }

  private readonly transformPullRequest = (
    pr: PullRequestResponse,
  ): GitHubPR => {
    return {
      url: pr.html_url,
      number: pr.number,
      title: pr.title,
      description: pr.body ?? "",
    };
  };

  public async createPRFromBranch(params: {
    branch: string;
    title: string;
    description: string;
    draft?: boolean;
    labels?: string[];
    base?: string;
  }): Promise<GitHubPR | null> {
    if (!this.isEnabled) {
      this.logger.warn("GitHub integration is not enabled (no token provided)");
      return null;
    }

    try {
      const info = await this.getGitHubInfo();

      if (!info) {
        throw new Error("Not a GitHub repository");
      }

      return this.createPR({
        owner: info.owner,
        repo: info.repo,
        title: params.title,
        description: params.description,
        branch: params.branch,
        baseBranch: params.base ?? this.git.config.baseBranch,
        draft: params.draft,
        labels: params.labels,
      });
    } catch (error) {
      this.logger.error("Failed to create PR from branch:", error);
      throw error;
    }
  }

  public async getBranch(params: { branch: string }): Promise<GitHubBranch> {
    if (!this.isEnabled || !this.octokit) {
      throw new Error("GitHub integration is not enabled");
    }

    const info = await this.getGitHubInfo();

    const response = await this.octokit.repos.getBranch({
      owner: info.owner,
      repo: info.repo,
      branch: params.branch,
    });

    return response.data;
  }
}
