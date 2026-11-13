/** Standalone and room replay verification. */
import type { Context, Outcome } from "./command-context.ts";
import { configOf, done, failed, handleOf, managedReadsOf, readSigning, run, signerOf, stopCommand, summaryOf, usage } from "./command-support.ts";
import { scopeNamed } from "./command-targets.ts";
import type { Config } from "./store.ts";
import { Verification } from "./verification.ts";
import { observeCleanup } from "./verify-cleanup.ts";
import { canonicalize, isEntry, isEntryBodyOf, parseStrict, scopeIdOf } from "@generalbusiness/dap-bytes";
import { type Fetch, signedLogReader, TransportError } from "@generalbusiness/dap-client";
import type { FactRef, ScopeId, ScopeRef, Seed } from "@generalbusiness/dap-contract";
import { CAPABILITY_CODE as REPLAY_CAPABILITY_CODE } from "@generalbusiness/dap-derive";
import { ARCHIVE_REPLAY_CODE, platform } from "@generalbusiness/dap-platform";
import { type FinishedRoom, type HistorySource, httpSource, otherRoomsLine, render, verify as replay, roomVerification, SourceError } from "@generalbusiness/dap-replay";

interface SessionDeniedDependency { neededFact: FactRef; at: FactRef; from: 0; through: 0; line: string }

/** A permission finding needs the verifier's exact missing fact, its actual
 * Register creation-result context and a final Session HTTP403 at that page.
 * Other absent/unavailable histories retain their original result labels.
 */
function sessionDeniedDependency(report: Pick<import("@generalbusiness/dap-contract").Report, "mode" | "result" | "at">, missing: readonly FactRef[], results: ReadonlyMap<string, FactRef>, denied: ReadonlySet<string>): SessionDeniedDependency | null {
  if (report.mode !== "replay" || report.result !== "missing-dependency" || !report.at || missing.length !== 1) return null;
  const neededFact = missing[0]!;
  if (neededFact.seq !== 0 || neededFact.hash !== neededFact.at.genesis || !denied.has(`${neededFact.at.scope}:0`)) return null;
  const named = results.get(canonicalize(report.at));
  if (!named || canonicalize(named) !== canonicalize(neededFact)) return null;
  return { neededFact, at: report.at, from: 0, through: 0, line: `not proven: needs ${neededFact.at.scope} entries 0 to 0, not readable by this session` };
}

/** One authenticated source owner: Session first, then the maintained Signed fallback. */
async function replaySource(ctx: Context, config: Config, budget: Verification, accounting: "count" | "unique") {
  const managed = await budget.wait(() => managedReadsOf(ctx, config));
  const signer = await budget.wait(() => signerOf(ctx, config));
  const options = ctx.fetch ? { fetch: ctx.fetch } : {};
  const signed = httpSource(config.service, { ...options, reader: signedLogReader(signer, readSigning(ctx)) });
  const sourceFor = (reader: string | null, observe?: (status: number) => void) => reader === null ? signed : httpSource(config.service, { ...options, reader, ...(observe ? { fetch: async (url: string, init?: Parameters<Fetch>[1]) => {
    const response = await (ctx.fetch ?? globalThis.fetch as unknown as Fetch)(url, init);
    observe(response.status); return response;
  } } : {}) });
  const denied = new Set<string>(), results = new Map<string, FactRef>();
  const source: HistorySource = {
    page: async (named, from, allow) => {
      budget.at("replay", named, from); budget.historyRead(accounting);
      let usedSession = false, sessionDenied = false;
      let got = await budget.wait(() => managed.read(async reader => {
        usedSession = reader !== null;
        let status = 0;
        const result = await sourceFor(reader, code => { status = code; }).page(named, from, allow);
        sessionDenied = reader?.startsWith("Session ") === true && status === 403 && !result.ok && result.reason === "forbidden";
        return result;
      }));
      if (sessionDenied && !got.ok && got.reason === "forbidden") denied.add(`${named}:${from}`);
      if (!got.ok && got.reason === "forbidden" && usedSession) got = await budget.wait(() => signed.page(named, from, allow));
      if (got.ok) {
        if (accounting === "unique") for (const stored of got.page.entries) budget.storedEntry(named, got.page.scope, stored);
        else budget.entries(got.page.entries.length);
        // The configured register is the one register whose create results this check reads.
        if (got.page.scope.scope === named) for (const stored of got.page.entries) {
          budget.check();
          // Keep only result metadata from actual journal pages. Retained
          // copies never substitute for the missing admission-proof page.
          let entry: unknown;
          try { entry = parseStrict(stored.bytes); } catch { continue; }
          const at: FactRef = { at: got.page.scope, seq: stored.seq, hash: stored.hash };
          if (!isEntry(entry) || !isEntryBodyOf(entry, at)) continue;
          const input = entry.input;
          if (input.type !== "delivery" || input.message.class !== "result" || input.message.outcome !== "applied"
            || input.sourceKind !== "directory" || input.from.seq !== 0 || canonicalize(input.message.of.from.at) !== canonicalize(got.page.scope)) continue;
          results.set(canonicalize(at), input.from);
        }
      }
      return got;
    },
    retained: async (named, kind, digest, allow, domain) => {
      budget.at("replay", named);
      let usedSession = false;
      let got = await budget.wait(() => managed.read(reader => { usedSession = reader !== null; return sourceFor(reader).retained(named, kind, digest, allow, domain); }));
      if (!got.ok && got.reason === "forbidden" && usedSession) got = await budget.wait(() => signed.retained(named, kind, digest, allow, domain));
      return got;
    },
  };
  return { source, results, denied };
}

/** A room's reader cannot read another room's directory on the shared register. The report says what stands on the service's word. */
const otherRoomsOf = (config: Config) => config.repository ? { otherRooms: { ownDirectory: config.repository.directory.scope } } : {};

/** Standalone verification keeps its isolated traversal and count budget. */
async function replayOf(ctx: Context, config: Config, scope: ScopeId, budget: Verification) {
  budget.at("replay", scope, 0); budget.historyRead();
  const { source, results, denied } = await replaySource(ctx, config, budget, "count");
  const verification = await budget.wait(() => replay(source, { mode: "replay", scope, ...otherRoomsOf(config), limits: budget.remaining(), platform, sourceName: ARCHIVE_REPLAY_CODE.sourceName, receiverIdentity: ARCHIVE_REPLAY_CODE.receiverIdentity, grants: "proven", capabilities: REPLAY_CAPABILITY_CODE, owners: REPLAY_CAPABILITY_CODE }));
  return { ...verification, notProven: sessionDeniedDependency(verification.report, verification.report.dependencies.missing, results, denied) };
}

/** The derived context reaches session probes/retries as well as replay HTTP. */
function verificationContext(ctx: Context, budget: Verification): Context {
  const send = ctx.fetch ?? globalThis.fetch as unknown as Fetch;
  return { ...ctx, fetch: budget.fetch(send) };
}

export function verifyScopeCommand(ctx: Context, named: string | undefined, options: { all?: boolean } = {}): Promise<Outcome> {
  if (options.all) return named === undefined ? verifyAll(ctx) : Promise.resolve(usage("verify --all takes no scope: it verifies every scope of the room."));
  return run(async () => {
    const budget = new Verification(ctx.verify);
    try {
      const reading = verificationContext(ctx, budget);
      const config = await budget.wait(() => configOf(reading));
      const scope = scopeNamed(config, named);
      budget.at("replay", scope); budget.progress();
      const { report, why, notProven } = await replayOf(reading, config, scope, budget);
      budget.check();
      const lines = render(report, notProven ? `Register creation result ${notProven.at.at.scope}:${notProven.at.seq}.` : why).split("\n").filter((line) => line.length > 0);
      if (notProven) lines[0] = `Result: ${notProven.line}.`;
      return report.result === "consistent" ? done(...lines) : failed(...lines);
    } finally { budget.close(); }
  });
}

/**
 * The scopes of the room: the register, the directory, and every scope that the directory created and each of those created, in
 * the order of their histories. A scope is found by the creation that its creator's entry sends; the register's other creations
 * are other rooms', and are not followed.
 */
async function roomScopes(ctx: Context, config: Config, budget: Verification): Promise<{ kind: string; scope: ScopeId }[]> {
  const pageLimit = ctx.historyPages ?? 1000;
  if (!Number.isSafeInteger(pageLimit) || pageLimit < 1) return stopCommand(usage("The room history page limit must be a positive integer."));
  const directory = config.repository!.directory.scope;
  budget.at("discovery", directory); budget.progress();
  const D = await budget.wait(() => handleOf(ctx, config, directory));
  const register = ((await budget.wait(() => summaryOf(D))).items.find((item) => item.type === "repository")?.refs["register"] as ScopeRef | undefined)?.scope;
  const matched = [...(register ? [{ kind: "register", scope: register }] : []), { kind: "directory", scope: directory }];
  const seen = new Set(matched.map(row => row.scope));
  // From the directory on: each scope found is read in turn, and what its history creates is added at the end.
  for (let i = matched.length - 1; i < matched.length; i++) {
    budget.at("discovery", matched[i]!.scope); budget.progress();
    const handle = await budget.wait(() => handleOf(ctx, config, matched[i]!.scope));
    for (let cursor: string | undefined, pages = 0; pages < pageLimit; pages++) {
      budget.at("discovery", handle.scope, cursor ?? null); budget.historyRead("unique");
      const page = await budget.wait(() => handle.history(cursor));
      if (!page.ok) return stopCommand(failed(`Cannot read the history of ${handle.scope}: ${page.reason}.`));
      for (const sealed of page.value) budget.sealedEntry(handle.scope, sealed);
      for (const { entry } of page.value) {
        for (const send of entry.sends) {
          if (!("creator" in send.to)) continue;
          const seed = send.to as Seed;
          const scope = scopeIdOf(seed);
          if (!seen.has(scope)) { seen.add(scope); matched.push({ kind: seed.kind, scope }); }
        }
      }
      if (page.next === undefined) break;
      if (pages + 1 === pageLimit) return stopCommand(failed(`Incomplete: room discovery for ${handle.scope} reached ${pageLimit} history pages; next cursor ${JSON.stringify(page.next)}. The whole room was not verified.`));
      cursor = page.next;
    }
  }
  return matched;
}

/** Disclose the shared proof once, including the actual root of each prefix. */
function sharedProofLines(proof: FinishedRoom): string[] {
  const lines = [...proof.otherRooms && !proof.dependencies.missing.length ? [otherRoomsLine(proof.anchors.length)] : [], `Shared room proof: ${proof.roots.length} roots; ${proof.dependencies.verified} verified dependencies; ${proof.dependencies.anchored} anchored dependencies; ${proof.dependencies.missing.length} missing dependencies.`];
  for (const row of proof.coverage) lines.push(`Shared coverage: ${row.scope.scope}, genesis ${row.scope.genesis}${row.kind ? `, kind ${row.kind}` : ""}, entries ${row.from} to ${row.through}; proving root ${row.root}.`);
  for (const row of proof.texts) lines.push(`Shared checked text: ${row.digest}; source ${row.source.scope}, genesis ${row.source.genesis}; proving root ${row.root}; consumers ${row.consumers.join(", ") || "none"}.`);
  for (const trust of proof.trusts) lines.push(`Shared trust: ${trust}.`);
  for (const fact of proof.anchors) lines.push(`Shared anchor: ${canonicalize(fact)}.`);
  for (const fact of proof.dependencies.missing) lines.push(`Shared missing dependency: ${canonicalize(fact)}.`);
  for (const row of proof.redacted) lines.push(`Shared redacted text: tombstone ${canonicalize(row.tombstone)}, item ${row.item}, slot ${JSON.stringify(row.slot)}.`);
  for (const row of proof.omittedTexts ?? []) lines.push(`Shared omitted text: ${row.digest}, ${row.bytes} bytes, first use ${canonicalize(row.first)}.`);
  for (const row of proof.incompleteBytes ?? []) lines.push(`Shared incomplete byte checks: ${canonicalize(row.scope)}, entries ${row.from} to ${row.through}: ${row.reason}.`);
  return lines;
}

/** The shared room proof, then the usual per-scope summaries and first finding. */
function verifyAll(ctx: Context): Promise<Outcome> {
  return run(async () => {
    const budget = new Verification(ctx.verify);
    let room: ReturnType<typeof roomVerification> | undefined;
    try {
      const reading = verificationContext(ctx, budget);
      const config = await budget.wait(() => configOf(reading));
      if (!config.repository) return usage("No repository is known here. Run: dap create <name>, or dap join <link>.");
      budget.at("session", config.repository.membership.scope); budget.progress();
      await budget.wait(async () => { await (await managedReadsOf(reading, config)).session(); });
      const lines: string[] = [];
      let first: string | null = null;
      const scopes = await roomScopes(reading, config, budget);
      const { source, results, denied } = await replaySource(reading, config, budget, "unique");
      // These are cumulative engine ceilings, fixed once. The outer owner
      // also charges discovery, authentication and every actual wire read.
      const owner = room = roomVerification(source, { mode: "replay", ...otherRoomsOf(config), limits: { bytes: budget.limits.bytes, entries: budget.limits.entries, scopes: budget.limits.requests },
        platform, sourceName: ARCHIVE_REPLAY_CODE.sourceName, receiverIdentity: ARCHIVE_REPLAY_CODE.receiverIdentity, grants: "proven", capabilities: REPLAY_CAPABILITY_CODE, owners: REPLAY_CAPABILITY_CODE });
      for (const { scope } of scopes) {
        budget.at("replay", scope); budget.progress();
        await budget.wait(() => owner.checkTarget({ scope }));
      }
      const finished = await budget.wait(() => owner.finish());
      if (finished.roots.length !== scopes.length) return failed("The room proof omitted a requested scope. The whole room was not verified.");
      for (const line of sharedProofLines(finished)) lines.push(line);
      for (const [index, { kind, scope }] of scopes.entries()) {
        const report = finished.roots[index]!;
        if (report.requested !== scope) return failed("The room proof returned another requested scope. The whole room was not verified.");
        budget.at("replay", scope); budget.progress(true);
        if (report.result === "not-read") {
          lines.push(`${kind} ${scope}: not read.`);
          first ??= `First finding: ${kind} ${scope}: ${report.why}.`;
          continue;
        }
        const { why } = report;
        const notProven = sessionDeniedDependency(report, report.missing, results, denied);
        lines.push(`${kind} ${scope}, entry ${report.target.seq}: ${notProven?.line ?? report.result}.`);
        if (notProven) lines.push(`Proof dependency: Register creation result ${notProven.at.at.scope}:${notProven.at.seq}.`);
        if (report.result !== "consistent") first ??= notProven ? `First finding: ${kind} ${scope}: ${notProven.line}.` : `First finding: ${kind} ${scope} is ${report.result}${why ? `: ${why}` : ""}.`;
        if (kind === "destination" && report.result === "consistent") {
          try {
            budget.at("cleanup", scope); budget.progress();
            const handle = await budget.wait(() => handleOf(reading, config, scope));
            const cleanup = await budget.wait(() => observeCleanup(handle, report.target, ctx.historyPages ?? 1000));
            lines.push(...cleanup.lines);
            first ??= cleanup.finding;
          } catch (error) {
            if (!(error instanceof SourceError) && !(error instanceof TransportError)) throw error;
            const finding = `Cleanup status not read: destination ${scope}: ${error.message}.`;
            lines.push(finding); first ??= finding;
          }
        } else if (kind === "destination") {
          lines.push(`Cleanup status not read: destination ${scope}: ${notProven?.line ?? `historical replay is ${report.result}`}; no verified cleanup snapshot.`);
        }
      }
      budget.check();
      lines.push(first ?? `All consistent: ${scopes.length} scopes${finished.otherRooms ? `, and ${finished.anchors.length} creation result${finished.anchors.length === 1 ? "" : "s"} of other rooms on the service's word` : ""}.`);
      return { code: first === null ? 0 : 1, lines };
    } finally { room?.close(); budget.close(); }
  });
}
