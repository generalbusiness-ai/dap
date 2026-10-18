/**
 * The replay command (scope contract, sections 9.5 and 11.4): read one
 * scope's history from a scope service, check it, and print the report.
 *
 *   artroom-replay <service URL> <scope ID> [--mode integrity|replay]
 *       [--head <seq>:<hash>] [--anchor <scope>:<seq>:<hash>]... [--json]
 *
 * Exit codes: 0, the history is consistent; 1, it is not (mismatch, missing
 * dependency, incomplete or unsupported definition); 2, the command was not
 * understood, or the target's history could not be read.
 *
 * `main` reads no process state, so it runs wherever `fetch` does. `bin.ts`
 * is its entry under Node.
 */

import type { FactRef, Head, Report } from "@generalbusiness/dap-contract";
import { isDigest, isFactRef, isScopeId, positionOf } from "@generalbusiness/artroom-bytes";
import { verifyArchive, type ArchiveSource } from "./archive.ts";
import { render } from "./report.ts";
import { httpSource, type Fetch } from "./source.ts";
import { SourceError, verify, type Anchor } from "./verify.ts";

export const USAGE = "usage: artroom-replay <service URL> <scope ID> [options]\n       artroom-replay --git <clone> [<scope ID>] [--texts <directory>] [--receipt <file>] [options]\noptions: [--mode integrity|replay] [--head <seq>:<hash>] [--anchor <scope>:<seq>:<hash>]... [--json]";

/** Where the command writes, and the `fetch` it reads with. */
export interface Io {
  out(text: string): void; err(text: string): void; fetch?: Fetch;
  /** The Node entry supplies these caller-selected ports; portable main has no filesystem access. */
  archive?: (directory: string, texts?: string) => ArchiveSource;
  receipt?: (file: string) => Promise<{ readonly fact: FactRef }>;
}

export async function main(argv: readonly string[], io: Io): Promise<number> {
  const usage = (what: string): number => {
    io.err(`${what}\n${USAGE}`);
    return 2;
  };
  const positional: string[] = [];
  const anchors: Anchor[] = [];
  let mode: Report["mode"] = "replay";
  let head: Head | undefined;
  let json = false;
  let directory: string | undefined, texts: string | undefined, receiptFile: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--json") json = true;
    else if (arg === "--mode" || arg === "--head" || arg === "--anchor" || arg === "--git" || arg === "--texts" || arg === "--receipt") {
      const value = argv[++i];
      if (value === undefined) return usage(`${arg} needs a value`);
      if (arg === "--git" || arg === "--texts" || arg === "--receipt") {
        if (!value || value.startsWith("--")) return usage(`${arg} needs a path`);
        if (arg === "--git") { if (directory !== undefined) return usage("give --git once"); directory = value; }
        else if (arg === "--texts") { if (texts !== undefined) return usage("give --texts once"); texts = value; }
        else { if (receiptFile !== undefined) return usage("give --receipt once"); receiptFile = value; }
      } else if (arg === "--mode") {
        if (value !== "integrity" && value !== "replay") return usage("the mode is integrity or replay");
        mode = value;
      } else {
        // A digest holds a colon, so the hash is everything after the position.
        const parts = value.split(":");
        const hash = parts.slice(arg === "--head" ? 1 : 2).join(":");
        const seq = positionOf(parts[arg === "--head" ? 0 : 1]);
        if (seq === null || !isDigest(hash)) return usage(`${arg} is not a position and a hash`);
        if (arg === "--head") head = { seq, hash };
        else if (isScopeId(parts[0])) anchors.push({ scope: parts[0], seq, hash });
        else return usage("an anchor names a scope ID first");
      }
    } else if (arg.startsWith("--")) return usage(`unknown option ${arg}`);
    else positional.push(arg);
  }
  if (directory !== undefined) {
    if (positional.length > 1 || (!positional.length && receiptFile === undefined)) return usage("give a scope ID or a receipt for the clone");
    if (positional[0] !== undefined && !isScopeId(positional[0])) return usage("the argument is not a scope ID");
    if (!io.archive || receiptFile !== undefined && !io.receipt) return usage("local archive file ports are not available");
    try {
      const receipt = receiptFile === undefined ? undefined : await io.receipt!(receiptFile);
      if (receipt && !isFactRef(receipt.fact)) return usage("the receipt has no native fact");
      const scope = positional[0] ?? receipt?.fact.at.scope;
      if (!isScopeId(scope)) return usage("the receipt has no scope ID");
      const result = await verifyArchive(io.archive(directory, texts), { mode, scope, head, anchors, grants: "proven", ...(receipt ? { receipt } : {}) });
      if (json) io.out(JSON.stringify(result, null, 2));
      else if (result.kind === "archive-failure") io.out(`Archive ${result.result}: ${result.reason}\nRead location: ${JSON.stringify(result.location)}${result.native ? `\n${render(result.native.report, result.native.why)}` : ""}`);
      else io.out(`Archive: ${result.archive.format} commit ${result.archive.commit}, through entry ${result.archive.head.seq}.\n${render(result.verification.report, result.verification.why)}${result.receipt ? `\nReceipt: ${result.receipt.result}${result.receipt.reason ? `; ${result.receipt.reason}` : ""}.` : ""}`);
      if (result.kind === "archive-failure") return result.result === "mismatch" ? 1 : 2;
      return result.verification.report.result === "consistent" && (!result.receipt || result.receipt.result === "archived") ? 0 : 1;
    } catch {
      io.err("read error: the caller-selected archive or receipt could not be read"); return 2;
    }
  }
  if (texts !== undefined || receiptFile !== undefined) return usage("--texts and --receipt require --git");
  const [service, scope] = positional;
  if (positional.length !== 2 || service === undefined || !/^https?:\/\//.test(service)) return usage("give the service URL and the scope ID");
  if (!isScopeId(scope)) return usage("the second argument is not a scope ID");

  try {
    const source = httpSource(service, io.fetch ? { fetch: io.fetch } : {});
    // The command line never reads a grant with no freshness proof as a grant: such a history is a mismatch (the contract's section 15.6n, on E8).
    const { report, why } = await verify(source, { mode, scope, head, anchors, grants: "proven" });
    io.out(json ? JSON.stringify({ report, why }, null, 2) : render(report, why));
    return report.result === "consistent" ? 0 : 1;
  } catch (error) {
    if (!(error instanceof SourceError)) throw error;
    io.err(`read error: ${error.message}`);
    return 2;
  }
}
