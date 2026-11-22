/**
 * The `dap` command under Node: the arguments, the files of
 * `files.ts`, the runtime's `fetch`, and the command line of `line.ts`. A
 * command's lines go to standard output when it is done, and to standard
 * error otherwise; the exit code is the command's. With `--json` at an
 * option position, one JSON document goes to standard output instead
 * (`json-output.ts`), and the exit code is the document's.
 */

import { join } from "node:path";
import { fileStore as custodyStore } from "@generalbusiness/dap-client/node";
import { readFile } from "node:fs/promises";
import { RetiredHomeError, fileStore } from "./files.ts";
import { configDir, ConfigDirectoryError } from "./config-dir.ts";
import { nodeGit } from "./git.ts";
import { command, commandWords, execute, JSON_COMMANDS, JSON_LONG_LIVED, JSON_OPERATOR, NO_JSON_OUTPUT, scanJson, USAGE } from "./line.ts";
import { envelope, localError, STATUS_EXIT, unexpectedError, usageError, type Phase, type PublicError, type Typed } from "./json-output.ts";
import type { Context } from "./commands.ts";
import { applicationCommands } from "./application-install-runtime.ts";
import { checkCommand, newCommand, packCommand } from "./application-command.ts";
import { runApplicationDevelopment } from "./application-dev.ts";
import { scopeIndexCommand } from "./scope-index-command.ts";

/** The command under Node. Returns the exit code. The output mode is known before the config directory or any early dispatch. */
export async function main(argv: readonly string[]): Promise<number> {
  const line = scanJson(argv);
  if (line.json) return mainJson(line.argv);
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
  const ctx: Context = { store: fileStore(home), git: nodeGit(), read, verify: { progress: line => { process.stderr.write(`${line}\n`); } } };
  // A home of the retired format is refused before any command signs or reads a target. `dap mcp` reads the same config.
  try { await ctx.store.config(); }
  catch (error) {
    if (error instanceof RetiredHomeError) { process.stderr.write(`${error.message}\n`); return 2; }
  }
  ctx.applicationCommand = applicationCommands(ctx, custodyStore(join(home, "private", "mcp-custody")), undefined, process.env["APPLICATION_TRUST"]);
  // The MCP server runs until its input ends; its own output is the protocol, so it prints only on failure. Only `dap mcp` loads it.
  const outcome = argv[0] === "scope-index" ? await scopeIndexCommand(ctx, argv.slice(1)) : argv[0] === "pack" ? await packCommand(ctx.store, argv) : argv[0] === "mcp" ? await (await import("./mcp.ts")).mcp(ctx, home, argv.slice(1)) : await command(ctx, argv);
  if (argv[0] === "mcp" && outcome.lines.length === 0) return outcome.code;
  (outcome.code === 0 ? process.stdout : process.stderr).write(`${outcome.lines.join("\n")}\n`);
  return outcome.code;
}

/**
 * JSON mode: one compact document and one newline on standard output for every finite invocation, and the exit is the
 * document's. `mcp` and `dev` run until they are stopped, and `scope-index` is outside version 1: each ends with usage/2
 * before it reads configuration, a file or a port. A command without a typed result ends the same way. An unexpected
 * failure ends with the fixed `unexpected-error`; no exception text, path or argv reaches the document.
 */
async function mainJson(argv: readonly string[]): Promise<number> {
  const words = commandWords(argv);
  const write = (typed: Typed): number => { process.stdout.write(`${envelope(words, typed)}\n`); return STATUS_EXIT[typed.status]; };
  const refuse = (error: PublicError): number => write({ phase: "parse", status: "usage", error });
  const name = words[0];
  if (name === undefined) return refuse(usageError("usage", USAGE));
  if (JSON_LONG_LIVED.includes(name)) return refuse(usageError("long-lived"));
  if (JSON_OPERATOR.includes(name)) return refuse(usageError("operator-command"));
  if (NO_JSON_OUTPUT.includes(name) || !Object.hasOwn(JSON_COMMANDS, name)) return refuse(usageError("no-json-output"));
  let phase: Phase = "preflight";
  try {
    let home: string;
    try { home = configDir(); }
    catch (error) {
      if (!(error instanceof ConfigDirectoryError)) throw error;
      return write({ phase, status: "usage", error: localError(error.code) });
    }
    const ctx: Context = { store: fileStore(home) };
    try { await ctx.store.config(); }
    catch (error) {
      if (error instanceof RetiredHomeError) return write({ phase, status: "usage", error: localError("retired-home") });
    }
    phase = "read";
    const outcome = await execute(ctx, argv);
    // Every branch of these commands is typed; an untyped usage outcome is the command line's own.
    return write(outcome.typed ?? (outcome.code === 2 ? { phase: "parse", status: "usage", error: usageError("usage", USAGE) } : { phase, status: "error", error: unexpectedError() }));
  } catch {
    return write({ phase, status: "error", error: unexpectedError() });
  }
}
