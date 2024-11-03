import { exec } from "child_process";
import { platform } from "os";
import { Logger } from "../types/logger.types.js";

interface CopyToClipboardParams {
  text: string;
  logger: Logger;
}

function getClipboardCommand(): {
  command: string;
  args: string[];
} {
  switch (platform()) {
    case "darwin":
      return { command: "pbcopy", args: [] }; // macOS
    case "win32":
      return { command: "clip", args: [] }; // Windows
    default:
      // Linux (requires xsel or xclip)
      // Try xsel first, fallback to xclip
      return { command: "xsel", args: ["--clipboard", "--input"] };
  }
}

export async function copyToClipboard(
  params: CopyToClipboardParams,
): Promise<void> {
  const { text, logger } = params;
  const { command, args } = getClipboardCommand();

  return new Promise<void>((resolve, reject) => {
    const child = exec(`${command} ${args.join(" ")}`, (error) => {
      if (error) {
        // If xsel fails on Linux, try xclip as fallback
        if (platform() !== "win32" && platform() !== "darwin") {
          exec(`xclip -selection clipboard`, (err) => {
            if (err) {
              logger.debug("Failed to copy using both xsel and xclip:", err);
              reject(err);
            } else {
              resolve();
            }
          }).stdin?.end(text);
        } else {
          logger.debug("Failed to copy to clipboard:", error);
          reject(error);
        }
      } else {
        resolve();
      }
    });

    child.stdin?.write(text);
    child.stdin?.end();
  }).catch((error) => {
    logger.debug("Clipboard operation failed:", error);
    // Fallback: print to console
    logger.info("\nCommand (copy manually):\n", text);
    return Promise.resolve();
  });
}
