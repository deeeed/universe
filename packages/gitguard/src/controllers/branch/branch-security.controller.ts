import chalk from "chalk";
import { GitService } from "../../services/git.service.js";
import { SecurityService } from "../../services/security.service.js";
import { PRAnalysisResult } from "../../types/analysis.types.js";
import { Logger } from "../../types/logger.types.js";
import { SecurityCheckResult } from "../../types/security.types.js";
import { promptChoice, promptYesNo } from "../../utils/user-prompt.util.js";

interface BranchSecurityControllerParams {
  logger: Logger;
  security: SecurityService;
  git: GitService;
}

export class BranchSecurityController {
  private readonly logger: Logger;
  private readonly security: SecurityService;
  private readonly git: GitService;

  constructor({ logger, security, git }: BranchSecurityControllerParams) {
    this.logger = logger;
    this.security = security;
    this.git = git;
  }

  analyzeSecurity({
    result,
  }: {
    result: PRAnalysisResult;
  }): SecurityCheckResult {
    this.logger.debug("Running security analysis for branch...");

    this.logger.debug(
      `Analyzing ${result.files.length} files between ${result.baseBranch} and ${result.branch}`,
    );

    return this.security.analyzeSecurity({
      files: result.files,
      diff: result.diff,
    });
  }

  async handleSecurityIssues({
    securityResult,
  }: {
    securityResult: SecurityCheckResult;
  }): Promise<void> {
    if (
      !securityResult.secretFindings.length &&
      !securityResult.fileFindings.length
    ) {
      return;
    }

    this.logger.info("\n🚨 Security issues detected in branch:");

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

    const action = await promptChoice<"revert" | "ignore" | "abort">({
      message: "\nHow would you like to proceed?",
      choices: [
        {
          label: "Revert changes and abort PR creation",
          value: "revert",
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
    action: "revert" | "ignore" | "abort";
    securityResult: SecurityCheckResult;
  }): Promise<void> {
    switch (action) {
      case "revert":
        if (securityResult.filesToUnstage.length > 0) {
          this.logger.info("\n📝 Reverting affected files...");
          try {
            await this.git.execGit({
              command: "checkout",
              args: ["HEAD", "--", ...securityResult.filesToUnstage],
            });
            this.logger.info(chalk.green("✅ Files reverted successfully"));
          } catch (error) {
            this.logger.error(chalk.red("❌ Failed to revert files:"), error);
            throw error;
          }
        }
        this.logger.info("\n❌ PR creation aborted due to security issues");
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
            this.logger.info("\n❌ PR creation aborted");
            process.exit(1);
          }
        }
        this.logger.info(
          chalk.yellow("\n⚠️ Proceeding despite security issues..."),
        );
        break;

      case "abort":
        this.logger.info("\n❌ PR creation aborted");
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
