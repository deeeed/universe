#!/usr/bin/env node

import { loadConfig } from "./config";
import { AnalysisService } from "./services/analysis.service";
import { LoggerService } from "./services/logger.service";
import { LogLevel } from "./types/logger.types";

async function test(): Promise<void> {
  const logger = new LoggerService({
    level: LogLevel.DEBUG,
    silent: false,
  });

  try {
    logger.info("Loading configuration...");
    const config = await loadConfig();

    logger.info("Initializing analysis service...");
    const analysisService = new AnalysisService({
      logger,
      config,
    });

    logger.info("Starting analysis...");
    const result = await analysisService.analyze({});

    logger.info("Analysis complete:", result);
  } catch (error) {
    logger.error("Test failed:", error);
    process.exit(1);
  }
}

test().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
