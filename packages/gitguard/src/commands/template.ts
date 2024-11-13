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
}

export function createTemplateCommand(): Command {
  return new Command("template")
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
    .action(async (options: TemplateCommandOptions) => {
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
          const isValid = await validateTemplates({ logger, registry });
          if (!isValid) {
            process.exit(1);
          }
        }

        if (options.list) {
          await registry.loadTemplates();
          listTemplates({ logger, registry });
        }

        if (!options.init && !options.validate && !options.list) {
          logger.info(chalk.yellow("\nNo action specified. Use one of:"));
          logger.info("  --init      Initialize default templates");
          logger.info("  --validate  Validate existing templates");
          logger.info("  --list      List available templates");
        }
      } catch (error) {
        logger.error("Template command failed:", error);
        process.exit(1);
      }
    });
}
