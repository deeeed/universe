import { GitService } from "../../services/git.service.js";
import { Logger } from "../../types/logger.types.js";
import { SecurityService } from "../../services/security.service.js";
import { FileChange } from "../../types/git.types.js";
import { SecurityCheckResult } from "../../types/security.types.js";
import chalk from "chalk";
import { promptChoice, promptYesNo } from "../../utils/user-prompt.util.js";

interface CommitSecurityControllerParams {
  logger: Logger;
  security: SecurityService;
  git: GitService;
}

interface AnalyzeSecurityParams {
  files: FileChange[];
  shouldAnalyzeStaged: boolean;
}

interface HandleSecurityIssuesParams {
  securityResult: SecurityCheckResult;
}

export class CommitSecurityController {
  private readonly logger: Logger;
  private readonly security: SecurityService;
  private readonly git: GitService;

  constructor({ logger, security, git }: CommitSecurityControllerParams) {
    this.logger = logger;
    this.security = security;
    this.git = git;
  }

  async analyzeSecurity({
    files,
    shouldAnalyzeStaged,
  }: AnalyzeSecurityParams): Promise<SecurityCheckResult> {
    this.logger.debug(`Running security analysis on ${files.length} files...`);

    if (files.length > 50) {
      this.logger.info(
        chalk.yellow("\n⚠️  Analyzing large diff, this may take a moment..."),
      );
    }

    const startTime = Date.now();
    const securityDiff = shouldAnalyzeStaged
      ? await this.git.getStagedDiff()
      : await this.git.getUnstagedDiff();

    const result = this.security.analyzeSecurity({
      files,
      diff: securityDiff,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    this.logger.debug(`Security analysis completed in ${duration}s`);

    return result;
  }

  async handleSecurityIssues({
    securityResult,
  }: HandleSecurityIssuesParams): Promise<void> {
    if (
      !securityResult.secretFindings.length &&
      !securityResult.fileFindings.length
    ) {
      return;
    }

    this.logger.info("\n🚨 Security issues detected:");

    // Display findings
    [...securityResult.secretFindings, ...securityResult.fileFindings].forEach(
      (finding, index) => {
        this.logger.info(
          `\n${chalk.bold.red(`${index + 1}.`)} ${finding.type === "secret" ? "🔑" : "📄"} ${chalk.cyan(finding.path)}${
            finding.line ? ` (line ${finding.line})` : ""
          }`,
        );
        this.logger.info(`   ${chalk.dim("Issue:")} ${finding.suggestion}`);
        if (finding.content) {
          this.logger.info(`   ${chalk.dim("Content:")} ${finding.content}`);
        }
      },
    );

    const action = await promptChoice<"unstage" | "ignore" | "abort">({
      message: "\nHow would you like to proceed?",
      choices: [
        {
          label: "Unstage affected files and abort commit",
          value: "unstage",
        },
        {
          label:
            "Ignore and proceed (not recommended for high severity issues)",
          value: "ignore",
        },
        {
          label: "Abort without changes",
          value: "abort",
        },
      ],
      logger: this.logger,
    });

    await this.handleSecurityAction({ action, securityResult });
  }

  private async handleSecurityAction({
    action,
    securityResult,
  }: {
    action: "unstage" | "ignore" | "abort";
    securityResult: SecurityCheckResult;
  }): Promise<void> {
    switch (action) {
      case "unstage":
        if (securityResult.filesToUnstage.length > 0) {
          this.logger.info("\n📝 Unstaging affected files...");
          try {
            await this.git.unstageFiles({
              files: securityResult.filesToUnstage,
            });
            this.logger.info(chalk.green("✅ Files unstaged successfully"));
          } catch (error) {
            this.logger.error(chalk.red("❌ Failed to unstage files:"), error);
            throw error;
          }
        }
        this.logger.info("\n❌ Commit aborted due to security issues");
        process.exit(1);
        break;

      case "ignore":
        if (securityResult.shouldBlock) {
          const confirmed = await promptYesNo({
            message:
              "\n⚠️ High severity security issues found. Are you sure you want to proceed?",
            defaultValue: false,
            logger: this.logger,
          });

          if (!confirmed) {
            this.logger.info("\n❌ Commit aborted");
            process.exit(1);
          }
        }
        this.logger.info(
          chalk.yellow("\n⚠️ Proceeding despite security issues..."),
        );
        break;

      case "abort":
        this.logger.info("\n❌ Commit aborted");
        process.exit(1);
        break;
    }
  }

  displaySecuritySummary(securityResult: SecurityCheckResult): void {
    const totalIssues =
      securityResult.secretFindings.length + securityResult.fileFindings.length;

    if (totalIssues > 0) {
      this.logger.info(
        `\n${chalk.yellow("⚠️")} Found ${totalIssues} security ${
          totalIssues === 1 ? "issue" : "issues"
        }`,
      );
    } else {
      this.logger.info("\n✅ No security issues detected");
    }
  }
}
