import chalk from "chalk";
import { Command } from "commander";
import { homedir } from "os";
import { join } from "path";
import { GitService } from "../services/git.service.js";
import { LoggerService } from "../services/logger.service.js";
import { TemplateRegistry } from "../services/template/template-registry.js";
import { loadConfig } from "../utils/config.util.js";
import {
  initializeTemplates,
  listTemplates,
  validateTemplates,
} from "../utils/template.util.js";

interface TemplateCommandOptions {
  init?: boolean;
  validate?: boolean;
  list?: boolean;
  path?: string;
  debug?: boolean;
  global?: boolean;
  force?: boolean;
  filter?: string;
  preview?: boolean;
}

export function createTemplateCommand(): Command {
  const command = new Command("template")
    .description("Manage GitGuard templates")
    .option("--init", "Initialize default templates")
    .option("--validate", "Validate existing templates")
    .option("--list", "List available templates")
    .option(
      "--path <path>",
      "Custom template path (default: .gitguard/templates)",
    )
    .option(
      "-g, --global",
      "Use global template directory (~/.gitguard/templates)",
    )
    .option("-f, --force", "Force overwrite all existing templates")
    .option(
      "--filter <pattern>",
      "Filter templates by name, title, or type (case-insensitive)",
    )
    .option(
      "--preview",
      "Show template preview during validation (default: only for single template)",
    );

  // Add custom error handling for unknown options
  command.showHelpAfterError(true);
  command.showSuggestionAfterError(true);

  // Add custom help text
  command.addHelpText(
    "after",
    `
Examples:
  $ gitguard template --validate                    Validate all templates (no preview)
  $ gitguard template --validate --filter pr.api    Validate specific template (preview enabled)
  $ gitguard template --validate --preview          Validate all templates with preview
  $ gitguard template --list                        List all available templates
  $ gitguard template --init                        Initialize default templates
    `,
  );

  command.action(async (options: TemplateCommandOptions) => {
    const logger = new LoggerService({ debug: options.debug });
    try {
      const config = await loadConfig();
      const git = new GitService({ logger, gitConfig: config.git });

      const templatePath = options.global
        ? join(homedir(), ".gitguard/templates")
        : (options.path ?? join(git.getCWD(), ".gitguard/templates"));

      const registry = new TemplateRegistry({
        logger,
        gitRoot: git.getCWD(),
      });

      if (options.init) {
        await initializeTemplates({
          logger,
          templatePath,
          force: options.force,
          registry,
        });
      }

      if (options.validate) {
        const isValid = await validateTemplates({
          logger,
          registry,
          preview: options.preview,
          filter: options.filter,
        });
        if (!isValid) {
          process.exit(1);
        }
      }

      if (options.list) {
        await registry.loadTemplates();
        listTemplates({ logger, registry });
      }

      if (!options.init && !options.validate && !options.list) {
        logger.info(chalk.yellow("\nNo action specified. Available commands:"));
        logger.info("  --init      Initialize default templates");
        logger.info("  --validate  Validate existing templates");
        logger.info("  --list      List available templates");
        logger.info("\nOptions:");
        logger.info("  --filter    Filter templates by name/title/type");
        logger.info(
          "  --preview   Show template preview (default: only for single template)",
        );
        logger.info("  --global    Use global template directory");
        logger.info("  --path      Specify custom template path");
        logger.info("  --force     Force overwrite existing templates");
        logger.info("\nUse --help for more information");
      }
    } catch (error) {
      logger.error("Template command failed:", error);
      process.exit(1);
    }
  });

  return command;
}
