/**
 * The `dap` command under Node: the arguments, the files of
 * `files.ts`, the runtime's `fetch`, and the command line of `line.ts`. A
 * command's lines go to standard output when it is done, and to standard
 * error otherwise; the exit code is the command's.
 */

import { join } from "node:path";
import { fileStore as mcpCustodyStore } from "@generalbusiness/dap-mcp/node";
import { readFile } from "node:fs/promises";
import { fileStore } from "./files.ts";
import { configDir, ConfigDirectoryError } from "./config-dir.ts";
import { nodeGit } from "./git.ts";
import { command } from "./line.ts";
import { mcp } from "./mcp.ts";
import { checkCommand, newCommand, packCommand } from "./application-command.ts";
import { runApplicationDevelopment } from "./application-dev.ts";

/** The command under Node. Returns the exit code. */
export async function main(argv: readonly string[]): Promise<number> {
  if (argv[0] === "dev") return runApplicationDevelopment(argv);
  if (argv[0] === "check" || argv[0] === "new") {
    const outcome = argv[0] === "new" ? await newCommand(argv) : await checkCommand(argv);
    (outcome.code === 0 ? process.stdout : process.stderr).write(`${outcome.lines.join("\n")}\n`);
    return outcome.code;
  }
  const read = async (path: string): Promise<Uint8Array | null> => { try { return new Uint8Array(await readFile(path)); } catch { return null; } };
  let home: string;
  try { home = configDir(); }
  catch (error) {
    if (!(error instanceof ConfigDirectoryError)) throw error;
    process.stderr.write(`${error.message}\n`);
    return 2;
  }
  const ctx = { store: fileStore(home), git: nodeGit(), read, applicationCustody: mcpCustodyStore(join(home, "private", "mcp-custody")) };
  // The MCP server runs until its input ends; its own output is the protocol, so it prints only on failure.
  const outcome = argv[0] === "pack" ? await packCommand(ctx.store, argv) : argv[0] === "mcp" ? await mcp(ctx, home, argv.slice(1)) : await command(ctx, argv);
  if (argv[0] === "mcp" && outcome.lines.length === 0) return outcome.code;
  (outcome.code === 0 ? process.stdout : process.stderr).write(`${outcome.lines.join("\n")}\n`);
  return outcome.code;
}
