/** A member's publication cycle. All scope exchanges pass through the client. */
import type { Answer, FactRef, Head, Item, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, entryHash, isEntry, isFactRef, isMemberRef, isRecord, parseStrict, same, scopeIdOf, utf8 } from "@generalbusiness/dap-bytes";
import { Custody, DeclaredHandle, Lost, ScopeHandle, TransportError, meaningOf, type Envelope, type Signer } from "@generalbusiness/dap-client";
import { lendingPublisher } from "./definition.ts";
import { buildPublication, type BuiltPublication, type JournalRow, type PublicationInput } from "./fold.ts";
import type { PublicationGit } from "./git.ts";
import { PACKAGE } from "./identity.ts";
import { isPublication, openingOf } from "./map.ts";
import { checkPublication, readPublicationTrailer } from "./reader.ts";

export interface Repository { host: string; namespace: string; name: string }
export interface PublisherOptions {
  scope: ScopeHandle;
  target: ScopeRef;
  service: string;
  member: MemberRef;
  signer: Signer;
  repository: Repository;
  git: PublicationGit;
  custody: Custody;
  now?: () => number;
  stage?: (name: "read" | "before-compare" | "after-ref-update" | "before-report", publication?: BuiltPublication) => Promise<void>;
}
export type PublicationResult = { status: "published"; commit: string; answer: Answer }
  | { status: "idle" | "retry" | "stopped"; reason: string };
class Stop extends Error {}
const stop = (reason: string): never => { throw new Stop(reason); };
const sameRef = (a: ScopeRef, b: ScopeRef) => a.scope === b.scope && a.genesis === b.genesis;

function checkedRow(target: ScopeRef, row: JournalRow): JournalRow {
  if (entryHash(row.entry) !== row.hash || !("genesis" in row.entry) || row.entry.genesis !== target.genesis) stop("entry-mismatch");
  return row;
}

/** One fixed journal cut. A newer page never changes the summary this cycle uses. */
export async function journal(scope: ScopeHandle, target: ScopeRef, from: number, head: Head): Promise<JournalRow[]> {
  const rows: JournalRow[] = [];
  if (from > head.seq) return rows;
  let cursor = String(from), previous = from - 1;
  for (;;) {
    const read = await scope.log(cursor, { at: target, head });
    if (!read.ok || read.coverage !== "whole" || !read.complete && read.next === undefined) stop("journal-incomplete");
    for (const row of read.value.entries) {
      if (row.seq > head.seq) break;
      if (row.seq !== previous + 1) stop("journal-gap");
      const entry: unknown = parseStrict(row.bytes);
      if (!isEntry(entry)) stop("journal-entry-mismatch");
      rows.push({ entry, hash: row.hash }); previous = row.seq;
    }
    if (previous === head.seq) {
      if (rows.at(-1)?.hash !== head.hash) stop("journal-head-mismatch");
      return rows;
    }
    if (read.next === undefined || read.next === cursor) stop("journal-incomplete");
    cursor = read.next;
  }
}

async function cursorOf(scope: ScopeHandle, target: ScopeRef, library: Item, head: Head): Promise<FactRef | null> {
  const held = library.refs["cursor"];
  if (held === null || held === undefined) return null;
  const seq = typeof held === "number" && Number.isSafeInteger(held) && held >= 0 ? held : isFactRef(held) && sameRef(held.at, target) ? held.seq : stop("cursor-mismatch");
  if (seq > head.seq) stop("cursor-ahead");
  const read = await scope.entry(seq, { at: target, head });
  if (!read.ok || !read.complete) stop("cursor-unavailable");
  const row = checkedRow(target, read.value);
  if (row.entry.seq !== seq || isFactRef(held) && held.hash !== row.hash) stop("cursor-mismatch");
  return { at: target, seq, hash: row.hash };
}

/** One attempt at the eight-step loop. A caller repeats retry/idle after a wake. */
export async function publish(options: PublisherOptions): Promise<PublicationResult> {
  try { return await cycle(options); }
  catch (error) {
    if (error instanceof Stop || error instanceof TransportError) return { status: "stopped", reason: error instanceof Stop ? error.message : "scope-unavailable" };
    throw error;
  }
}

async function cycle(options: PublisherOptions): Promise<PublicationResult> {
  const { scope, target, signer, git, custody } = options;
  const summary = await scope.summary();
  if (!summary.ok || !summary.complete || summary.next !== undefined) stop("summary-incomplete");
  const pin = definitionDigest(lendingPublisher);
  if (!sameRef(summary.value.scope, target) || summary.value.definition !== pin) stop("definition-mismatch");
  const birth = await scope.entry(0, { at: target, head: summary.at });
  if (!birth.ok || !birth.complete || !isEntry(birth.value.entry) || birth.value.hash !== target.genesis
    || entryHash(birth.value.entry) !== target.genesis || birth.value.entry.input.type !== "genesis"
    || scopeIdOf(birth.value.entry.input.seed) !== target.scope || birth.value.entry.input.seed.definition !== pin) stop("genesis-unavailable");
  const kind = birth.value.entry.input.seed.kind;
  const libraries = summary.value.items.filter(item => item.type === "library" && item.state === "open");
  if (libraries.length !== 1) stop("library-unavailable");
  const library = libraries[0]!;
  if (!isMemberRef(library.parties["publisher"]) || !same(library.parties["publisher"], options.member)) stop("not-publisher");
  if (!isRecord(library.values["repository"]) || canonicalize(library.values["repository"]) !== canonicalize(options.repository)) stop("repository-mismatch");
  const deliver = async (envelope: Envelope): Promise<Answer> => {
    try { return await scope.submit(envelope.signed, [], envelope.beside); }
    catch (error) { if (error instanceof TransportError) throw new Lost(); throw error; }
  };
  // An accepted report may already have advanced the cursor while its answer was lost.
  // Recover its kept original before deciding that no new mapped entries exist.
  for (const held of await custody.store.unresolved()) {
    const record = await custody.store.read(held.id);
    if (!record || record.identity.service !== options.service || record.identity.signer !== signer.key
      || !("scope" in record.identity.target) || !sameRef(record.identity.target, target)
      || !same(record.identity.membership, options.member.membership)) continue;
    if (record.binding.definition !== lendingPublisher.name || record.binding.pinned !== pin
      || record.binding.kind !== kind || record.envelope.signed.intent.kind !== "published") stop("custody-mismatch");
    const commit = record.envelope.signed.intent.fields["commit"];
    if (typeof commit !== "string") stop("custody-mismatch");
    const settled = await custody.settle(record.identity, async envelope => {
      let answer;
      try { answer = await scope.settle(envelope.signed); }
      catch (error) { if (error instanceof TransportError) throw new Lost(); throw error; }
      if (answer.ok) return answer.value;
      if (answer.reason === "archived") return answer;
      if (answer.reason !== "not-found") stop("settlement-unavailable");
      return null;
    });
    if (settled?.receipt) return { status: "published", commit, answer: { answer: "accepted", receipt: settled.receipt } };
    if (settled?.decided) {
      if (settled.decided.archivedSettlement) return { status: "stopped", reason: "scope-archived" };
      const answer = settled.decided.answer;
      if (!answer) stop("custody-mismatch");
      return reportResult(commit, answer);
    }
    if (await git.head() !== commit) stop("unresolved-branch-differs");
    const sent = await custody.send(record.identity, record.meaning, async () => { throw new Error("The kept original must not be signed again."); }, deliver,
      { notAfter: record.envelope.signed.intent.notAfter });
    if ("archivedSettlement" in sent) return { status: "stopped", reason: "scope-archived" };
    if ("lost" in sent) return { status: "retry", reason: "report-unresolved" };
    return reportResult(commit, sent.answer);
  }
  const heldHead = library.values["head"], base = heldHead === undefined || heldHead === null ? null : typeof heldHead === "string" ? heldHead : stop("head-mismatch");
  const cursor = await cursorOf(scope, target, library, summary.at);
  const entries = await journal(scope, target, cursor === null ? 0 : cursor.seq + 1, summary.at);
  if (entries.length && cursor !== null && entries[0]!.entry.prev !== cursor.hash) stop("cursor-chain-mismatch");
  const mapped = entries.filter(isPublication);
  if (mapped.length === 0) return { status: "idle", reason: "no-publication-entries" };
  const last = mapped.at(-1)!;
  const through: FactRef = { at: target, seq: last.entry.seq, hash: last.hash };
  const openings: JournalRow[] = [];
  for (const id of new Set(mapped.map(openingOf).filter((id): id is number => id !== null))) {
    if (entries.some(row => row.entry.seq === id)) continue;
    const read = await scope.entry(id, { at: target, head: summary.at });
    if (!read.ok || !read.complete) stop("opening-unavailable");
    const row = checkedRow(target, read.value);
    if (row.entry.seq !== id) stop("opening-mismatch");
    openings.push(row);
  }
  await options.stage?.("read");
  const branch = await git.head();
  const input: PublicationInput = { scope: target, base, files: await git.files(base), entries, openings, through };
  let publication: BuiltPublication;
  if (branch === base) {
    publication = buildPublication(input);
    await options.stage?.("before-compare", publication);
    await git.compare(base, publication);
    const observed = await git.head();
    if (observed !== publication.commit) return { status: "retry", reason: "branch-moved" };
    await options.stage?.("after-ref-update", publication);
  } else {
    if (branch === null) stop("branch-differs");
    const bytes = await git.commit(branch), trailer = readPublicationTrailer(bytes);
    if (trailer === null) stop("branch-differs");
    if (!sameRef(trailer.scope, target) || trailer.base !== base) stop("branch-differs");
    if (cursor !== null && trailer.through.seq <= cursor.seq) stop("branch-differs");
    // Another publisher may have read a later complete cut. Gather it on the next cycle.
    if (trailer.through.seq > summary.at.seq) return { status: "retry", reason: "newer-through" };
    const claimed = entries.find(row => row.entry.seq === trailer.through.seq && row.hash === trailer.through.hash);
    if (!claimed || !isPublication(claimed)) stop("branch-differs");
    const checked = checkPublication({ ...input, through: trailer.through }, bytes);
    if (!checked.ok) stop("branch-differs");
    publication = checked.publication;
    if (publication.commit !== branch) stop("branch-differs");
  }
  await options.stage?.("before-report", publication);
  const fields = { through: publication.through, ...(base === null ? {} : { base }), commit: publication.commit, tree: publication.tree };
  const meaning = meaningOf({ package: PACKAGE, target, revision: library.revision, fields });
  const identity = { service: options.service, membership: options.member.membership, signer: signer.key, target,
    key: `${publication.commit}:${library.revision}` };
  const now = options.now?.() ?? Date.now(), notAfter = new Date(now + 5 * 60_000).toISOString();
  // The complete summary above already checked this exact pin. No second read changes its cut.
  const typed = new DeclaredHandle(scope, target, lendingPublisher, pin);
  const result = await custody.send(identity, meaning, async () => {
    const made = await typed.intent(signer, "published", { on: library.id, expected: { on: library.revision }, fields },
      { now, lifetimeSeconds: 300, idempotencyKey: `p1-${meaning.slice(7)}` });
    return { binding: { definition: lendingPublisher.name, kind, declaration: pin, pinned: pin }, envelope: made };
  }, deliver, { notAfter, bytes: utf8(canonicalize(fields)).length });
  if ("archivedSettlement" in result) return { status: "stopped", reason: "scope-archived" };
  if ("lost" in result) return { status: "retry", reason: "report-unresolved" };
  return reportResult(publication.commit, result.answer);
}

function reportResult(commit: string, answer: Answer): PublicationResult {
  if (answer.answer === "accepted") return { status: "published", commit, answer };
  if (answer.answer === "unavailable" || answer.answer === "refused" && (answer.reason === "guard-failed" || answer.reason === "revision-moved")) return { status: "retry", reason: "report-reconcile" };
  return { status: "stopped", reason: `report-${answer.answer}` };
}
