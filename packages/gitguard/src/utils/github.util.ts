import { Config } from "../types/config.types.js";
import { Logger } from "../types/logger.types.js";
import chalk from "chalk";

export function checkGitHubToken(params: {
  config: Config;
  logger: Logger;
}): boolean {
  const { config, logger } = params;
  const token = config.git.github?.token;

  if (!token) {
    logger.warn(
      "\n⚠️  GitHub token not found. To enable GitHub integration, you need to:",
    );
    logger.info("\n1. Create a Personal Access Token (PAT):");
    logger.info(chalk.cyan("   https://github.com/settings/tokens"));
    logger.info("\n2. Add the token using one of these methods:");
    logger.info(chalk.dim("   • Environment variable:"));
    logger.info(chalk.cyan("     export GITHUB_TOKEN=your_token_here"));
    logger.info(chalk.dim("   • Global config (~/.gitguard/config.json):"));
    logger.info(
      chalk.cyan(
        '     { "git": { "github": { "token": "your_token_here" } } }',
      ),
    );
    logger.info(chalk.dim("   • Project config (.gitguard/config.json)"));
    logger.info("\nFor more information, see:");
    logger.info(
      chalk.cyan("https://github.com/your-org/gitguard#github-integration"),
    );
    return false;
  }

  return true;
}
