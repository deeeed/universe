import { exec as cpExec, ExecOptions } from "child_process";
import { promisify } from "util";

const execAsync = promisify(cpExec);

export async function exec(
  command: string,
  options?: ExecOptions,
): Promise<void> {
  try {
    const { stdout, stderr } = await execAsync(command, options);
    if (stdout) {
      // eslint-disable-next-line no-console
      console.log(stdout);
    }
    if (stderr) {
      console.error(stderr);
    }
  } catch (error) {
    console.error(`Error executing command "${command}":`, error);
    throw error;
  }
}
