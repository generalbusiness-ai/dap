/** Compare a local branch with a supplied complete journal. This checks neither a live service nor membership authority. */
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { FactRef, Head, ScopeRef } from "@generalbusiness/dap-contract";
import { definitionDigest, entryHash, isDigest, isEntry, isFactRef, isRecord, isScopeRef, parseStrictBytes, scopeIdOf } from "@generalbusiness/dap-bytes";
import { idOf, objectId, parseCommit, type ObjectId } from "@generalbusiness/dap-git";
import { lendingPublisher } from "./definition.ts";
import type { JournalRow, PublicationInput } from "./fold.ts";
import { LocalGit, type PublicationGit } from "./git.ts";
import { PACKAGE } from "./identity.ts";
import { checkPublication, readPublicationTrailer, type PublicationTrailer } from "./reader.ts";

export interface ExportedJournal {
  readonly scope: ScopeRef;
  readonly entries: readonly JournalRow[];
  readonly complete: true;
  readonly coverage: "whole";
  readonly head: Head;
}
export type CloneReason = "journal-incomplete" | "journal-mismatch" | "journal-definition" | "journal-report"
  | "branch-unavailable" | "unreported-commit" | "mismatch" | "branch-head";
export type CloneCheck = { readonly ok: true; readonly checked: number }
  | { readonly ok: false; readonly checked: number; readonly reason: CloneReason };
interface Report {
  readonly trailer: PublicationTrailer;
  readonly cursor: FactRef | null;
  readonly commit: ObjectId;
  readonly tree: ObjectId;
}
interface JournalContext { readonly journal: ExportedJournal; readonly reports: ReadonlyMap<string, Report>; readonly adopted: ReadonlySet<ObjectId>; readonly head: ObjectId | null }
class JournalFailure extends Error {
  constructor(readonly reason: Extract<CloneReason, `journal-${string}`>) { super(reason); }
}
const sameScope = (a: ScopeRef, b: ScopeRef) => a.scope === b.scope && a.genesis === b.genesis;
const reportKey = (trailer: PublicationTrailer): string => `${trailer.through.seq} ${trailer.through.hash} ${trailer.base ?? "none"}`;

function journalContext(value: unknown): JournalContext {
  if (!isRecord(value) || Object.keys(value).sort().join() !== "complete,coverage,entries,head,scope"
    || value["complete"] !== true || value["coverage"] !== "whole" || !Array.isArray(value["entries"])) throw new JournalFailure("journal-incomplete");
  const scope = value["scope"], head = value["head"];
  if (!isScopeRef(scope) || !isRecord(head) || Object.keys(head).sort().join() !== "hash,seq"
    || !Number.isSafeInteger(head["seq"]) || (head["seq"] as number) < 0 || !isDigest(head["hash"])) throw new JournalFailure("journal-mismatch");
  const entries: JournalRow[] = [];
  for (const [seq, given] of value["entries"].entries()) {
    if (!isRecord(given) || Object.keys(given).sort().join() !== "entry,hash" || !isEntry(given["entry"]) || !isDigest(given["hash"])) throw new JournalFailure("journal-mismatch");
    const row = { entry: given["entry"], hash: given["hash"] };
    if (row.entry.seq !== seq || entryHash(row.entry) !== row.hash) throw new JournalFailure("journal-mismatch");
    if (seq === 0) {
      if (row.entry.input.type !== "genesis" || row.hash !== scope.genesis || scopeIdOf(row.entry.input.seed) !== scope.scope) throw new JournalFailure("journal-mismatch");
      if (row.entry.input.seed.definition !== definitionDigest(lendingPublisher)) throw new JournalFailure("journal-definition");
    } else if (!("genesis" in row.entry) || row.entry.genesis !== scope.genesis || row.entry.prev !== entries[seq - 1]!.hash) throw new JournalFailure("journal-mismatch");
    entries.push(row);
  }
  const last = entries.at(-1);
  if (!last || last.entry.seq !== head["seq"] || last.hash !== head["hash"]) throw new JournalFailure("journal-incomplete");
  const journal: ExportedJournal = { scope, entries, complete: true, coverage: "whole", head: { seq: last.entry.seq, hash: last.hash } };
  const reports = new Map<string, Report>(), adopted = new Set<ObjectId>();
  let currentHead: ObjectId | null = null, cursor: FactRef | null = null;
  for (const row of entries) {
    if (row.entry.input.type !== "act") continue;
    const intent = row.entry.input.signed.intent;
    if (!intent.to || !sameScope(intent.to, scope)) throw new JournalFailure("journal-mismatch");
    if (intent.kind === "adopt-head") {
      try { currentHead = objectId(intent.fields["commit"], "adopted head"); }
      catch { throw new JournalFailure("journal-report"); }
      adopted.add(currentHead);
    } else if (intent.kind === "published") {
      const through = intent.fields["through"], base = intent.fields["base"];
      if (!isFactRef(through) || !sameScope(through.at, scope) || through.seq >= row.entry.seq
        || entries[through.seq]?.hash !== through.hash || cursor !== null && through.seq <= cursor.seq) throw new JournalFailure("journal-report");
      let previous: ObjectId | null, commit: ObjectId, tree: ObjectId;
      try {
        previous = base === undefined ? null : objectId(base, "reported base");
        commit = objectId(intent.fields["commit"], "reported commit");
        tree = objectId(intent.fields["tree"], "reported tree");
      } catch { throw new JournalFailure("journal-report"); }
      if (previous !== currentHead) throw new JournalFailure("journal-report");
      const trailer: PublicationTrailer = { scope, through, base: previous }, key = reportKey(trailer);
      if (reports.has(key)) throw new JournalFailure("journal-report");
      reports.set(key, { trailer, cursor, commit, tree });
      currentHead = commit;
      cursor = through;
    }
  }
  return { journal, reports, adopted, head: currentHead };
}

/** The complete/whole fields are an exporter's claim. Row validation does not authenticate that claim against a live service. */
export async function checkClone(git: PublicationGit, exported: ExportedJournal): Promise<CloneCheck> {
  let context: JournalContext;
  try { context = journalContext(exported); }
  catch (error) { return { ok: false, checked: 0, reason: error instanceof JournalFailure ? error.reason : "journal-mismatch" }; }
  let checked = 0;
  try {
    const branch = await git.head();
    let at = branch;
    const seen = new Set<ObjectId>();
    while (at !== null) {
      if (seen.has(at)) return { ok: false, checked, reason: "mismatch" };
      seen.add(at);
      const bytes = await git.commit(at);
      if (idOf("commit", bytes) !== at) return { ok: false, checked, reason: "mismatch" };
      const parsed = parseCommit(bytes), trailer = readPublicationTrailer(bytes);
      if (trailer === null) {
        // Staff named this opaque baseline. It is not a commit that the publication fold produced.
        if (context.adopted.has(at)) break;
        return { ok: false, checked, reason: "unreported-commit" };
      }
      if (!sameScope(trailer.scope, context.journal.scope)) return { ok: false, checked, reason: "mismatch" };
      // Bind the report by its recorded input before comparing IDs. A changed file has another ID but keeps this context.
      const report = context.reports.get(reportKey(trailer));
      if (!report) return { ok: false, checked, reason: "unreported-commit" };
      const from = report.cursor === null ? 0 : report.cursor.seq + 1;
      const entries = context.journal.entries.slice(from, trailer.through.seq + 1);
      if (entries.length === 0 || entries[0]!.entry.seq !== from
        || report.cursor !== null && entries[0]!.entry.prev !== report.cursor.hash) return { ok: false, checked, reason: "journal-incomplete" };
      const openings = context.journal.entries.slice(0, from).filter(row => row.entry.input.type === "act" && row.entry.input.signed.intent.kind === "donate");
      const input: PublicationInput = { scope: context.journal.scope, base: trailer.base, files: await git.files(trailer.base), entries, openings, through: trailer.through };
      const result = checkPublication(input, bytes);
      if (!result.ok || result.publication.commit !== report.commit || result.publication.tree !== report.tree) return { ok: false, checked, reason: "mismatch" };
      checked++;
      // The strict trailer reader already proved zero parents or this exact single parent.
      at = parsed.parents[0] ?? null;
    }
    if (branch !== context.head) return { ok: false, checked, reason: "branch-head" };
    return { ok: true, checked };
  } catch { return { ok: false, checked, reason: "branch-unavailable" }; }
}

export const CHECK_QUALIFICATION = "Checks the supplied whole-journal claim and local branch; no live service or membership authority is verified.";
const MAX_EXPORT_BYTES = 256 * 1024 * 1024;
const USAGE = `Usage: node --import tsx examples/lending/publisher/check.ts --repository <canonical-bare-path> --work <canonical-work-dir> --journal <canonical-public-export> [--branch main]
${CHECK_QUALIFICATION}
The room's owner carries the local branch to a remote Git host with their own Git.
P1 reads no Git credential; P2 owns credential delivery.
`;

async function publicJournal(path: string): Promise<unknown> {
  if (!isAbsolute(path) || resolve(path) !== path || await realpath(path) !== path || /[\x00-\x1f\x7f]/.test(path)) throw new Error("journal-unavailable");
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = await file.stat();
    if (!before.isFile() || !Number.isSafeInteger(before.size) || before.size < 0 || before.size > MAX_EXPORT_BYTES) throw new Error("journal-unavailable");
    const bytes = new Uint8Array(before.size + 1);
    let length = 0;
    while (length < bytes.length) {
      const read = await file.read(bytes, length, bytes.length - length, length);
      if (read.bytesRead === 0) break;
      length += read.bytesRead;
    }
    const after = await file.stat();
    if (length !== before.size || after.size !== before.size || after.ino !== before.ino || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) throw new Error("journal-unavailable");
    return parseStrictBytes(bytes.subarray(0, length));
  } finally { await file.close(); }
}

export async function main(args: readonly string[]): Promise<number> {
  if (args.length === 1 && args[0] === "--help") { process.stdout.write(USAGE); return 0; }
  const options = new Map<string, string>(), names = new Set(["--repository", "--work", "--journal", "--branch"]);
  if (args.length % 2 !== 0) { process.stderr.write(USAGE); return 2; }
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index]!, value = args[index + 1]!;
    if (!names.has(name) || options.has(name)) { process.stderr.write(USAGE); return 2; }
    options.set(name, value);
  }
  if (!["--repository", "--work", "--journal"].every(name => options.has(name))) { process.stderr.write(USAGE); return 2; }
  let result: CloneCheck | { ok: false; checked: 0; reason: "input-unavailable" };
  try {
    const context = journalContext(await publicJournal(options.get("--journal")!));
    const git = await LocalGit.open(options.get("--repository")!, options.get("--work")!, options.get("--branch") ?? "main");
    result = await checkClone(git, context.journal);
  } catch (error) {
    result = { ok: false, checked: 0, reason: error instanceof JournalFailure ? error.reason : "input-unavailable" };
  }
  process.stdout.write(JSON.stringify({ package: PACKAGE, ...result, qualification: CHECK_QUALIFICATION }) + "\n");
  return result.ok ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(() => { process.exitCode = 1; });
}
