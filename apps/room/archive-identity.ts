/** Paid immutable installation provenance. No retained alias, package cache,
 * current item or provider reply establishes this creation chain. */
import type { Bounds, Digest, Entry, FactRef, ScopeRef, Seed } from "@generalbusiness/dap-contract";
import { admitSequenceGenesis, canonicalize, deliveryCauseDigest, isDigest, isFactRef, isMemberRef, isPlatformDefinition, isRecord, isScopeRef, isSeed, messageDigest, resolveGenesisSelf, scopeIdOf, utf8, type CheckedSequence } from "@generalbusiness/dap-bytes";
import { same, sentBy } from "@generalbusiness/dap-derive";
import { applicationAdmissionCohort, platform } from "@generalbusiness/dap-platform";
import { ArchiveBudget, ArchiveChainLimit } from "../../packages/scope/src/archive-budget.ts";
import { APPLICATION_ACT_ADMISSION_BOUNDS as LIMIT } from "../../packages/scope/src/applications/act-admission.ts";
import { readNativeBirth } from "../../packages/scope/src/native-birth.ts";
import { namespace, type Binding } from "../../packages/scope/src/namespace.ts";
import { ProofBytes, proofEntry, type ProofBody } from "../../packages/scope/src/proof-bytes.ts";
import type { Sql, SqlValue } from "../../packages/scope/src/sqlite.ts";

export interface ArchiveInstallationIdentity {
  readonly directory: ScopeRef; readonly rules: ScopeRef; readonly rulesNamed: string; readonly item: number;
  readonly root: ScopeRef; readonly definition: Digest;
  readonly ids: { readonly release: Digest; readonly semantic: Digest; readonly presentation: Digest };
}
type Genesis = Entry & { input: Extract<Entry["input"], { type: "genesis" }> };
const applied = (entry: Entry | null, sequence: CheckedSequence): entry is Genesis => entry?.input.type === "genesis" && entry.input.decision === "applied"
  && entry.seq === 0 && entry.prev === null && entry.input.seed.kind === sequence.kind && scopeIdOf(entry.input.seed) === sequence.at.scope;
const sqlBytes = (rows: readonly Record<string, SqlValue>[]): number => rows.reduce((total, row) => total + Object.values(row).reduce<number>((n, value) => n + (typeof value === "string" ? utf8(value).length : typeof value === "number" ? 8 : 0), 0), 0);

/** The walk matches fresh-act admission's immutable chain. This separate
 * caller pays the archive's original budget and never borrows its cache. */
export async function archiveInstallationIdentity(at: ScopeRef, seed: Seed, sql: Pick<Sql, "exec">, binding: Binding, bounds: Bounds, budget: ArchiveBudget, foreignBirth?: ProofBody): Promise<ArchiveInstallationIdentity | "unpackaged" | null> {
  const maximum = Math.min(bounds.entryBytes, LIMIT.body), peers = namespace(binding);
  const local = new ProofBytes(budget.native(sql, query => query.startsWith("SELECT bytes")
    ? { metadata: maximum, inputWork: maximum * 64 }
    : { metadata: 4096, inputWork: 4096 * 8 }, sqlBytes));
  const first = foreignBirth ? { kind: "body" as const, value: foreignBirth } : local.own(0, maximum);
  if (first.kind !== "body" || !same(first.value.fact.at, at)) return null;
  budget.spend({ inputWork: utf8(first.value.bytes).length * 32 });
  const own = admitSequenceGenesis(first.value.bytes, at, maximum);
  if (!own) return null;
  let child = proofEntry(first.value, first.value.fact, maximum, own), childAt = at;
  if (!applied(child, own) || !same(child.input.seed, seed)) return null;
  const seen = new Set([canonicalize(at)]);
  let bodies = 1, received = utf8(first.value.bytes).length, rpcs = 0;
  const capacity = () => {
    budget.check();
    if (bodies >= LIMIT.bodies || received >= LIMIT.bytes || rpcs > LIMIT.rpcs) throw new ArchiveChainLimit();
    return Math.min(maximum, LIMIT.bytes - received);
  };
  const decode = (value: ProofBody, fact: FactRef, sequence: CheckedSequence, content?: Digest) => {
    const size = utf8(value.bytes).length;
    if (size > capacity()) return null;
    bodies++; received += size;
    budget.spend({ inputWork: size * 32 });
    return proofEntry(value, fact, maximum, sequence, content);
  };
  for (let n = 0; n < LIMIT.ancestors; n++) {
    budget.spend({ metadata: 512, inputWork: 4096 });
    const born = child.input;
    if (born.seed.creator === null) return born.source === null && born.n === null && born.message === null && born.founding !== null ? "unpackaged" : null;
    const parent = born.source ? resolveGenesisSelf(born.seed.creator, born.source) : born.seed.creator;
    if (!isScopeRef(parent) || !isFactRef(born.source) || !same(born.source.at, parent) || born.n === null || !born.message
      || born.message.class !== "request" || born.message.type !== "create" || seen.has(canonicalize(parent))) return null;
    seen.add(canonicalize(parent));
    const uses = child.uses.filter(use => same(use.fact, born.source));
    if (uses.length !== 1) return null;
    const use = uses[0]!, cap = capacity();
    if (++rpcs > LIMIT.rpcs) throw new ArchiveChainLimit();
    const held = budget.reserve({ nodes: 1, calls: 1, metadata: cap, inputWork: cap * 8 });
    const reply = await budget.wait(() => peers.births.read(parent, Math.min(10_000, budget.remaining()), cap));
    const admitted = readNativeBirth(reply, parent, cap, size => { budget.settle(held, size); budget.spend({ inputWork: size * 32 }); bodies++; received += size; });
    if (!admitted || !applied(admitted.entry, admitted.sequence)) return null;
    const creator = admitted.entry;
    let source: Entry | null = null;
    if (n === 0) {
      const retained = local.retained(use, capacity());
      if (retained.kind === "body") source = decode(retained.value, born.source, admitted.sequence, use.content);
    }
    if (!source) {
      const cap = capacity();
      if (++rpcs > LIMIT.rpcs) throw new ArchiveChainLimit();
      const reservation = budget.reserve({ calls: 1, metadata: cap, inputWork: cap * 8 });
      const exact = await budget.wait(() => peers.proofs.read(born.source!, cap, Math.min(10_000, budget.remaining())));
      if (!exact) return null;
      budget.settle(reservation, utf8(exact.bytes).length);
      source = decode(exact, born.source, admitted.sequence, use.content);
    }
    if (!source || source.sends.filter(send => send.n === born.n).length !== 1
      || !sentBy(source, { from: born.source, n: born.n, to: born.seed, message: born.message }, admitted.sequence)) return null;
    if (!admitted.birth.native) { child = creator; childAt = parent; continue; }
    if (!isPlatformDefinition(admitted.birth.named) || !platform(admitted.birth.named)) return null;
    const made = source.input;
    const installing = made.type === "delivery" && made.message.class === "request" && made.message.type === "tell"
      && isRecord(made.message.body) && made.message.body["message"] === "application-create";
    if (!installing) return "unpackaged";
    const cohort = applicationAdmissionCohort(admitted.birth.named);
    if (!cohort || admitted.sequence.kind !== "directory" || made.type !== "delivery" || made.decision !== "applied"
      || made.message.class !== "request" || made.message.type !== "tell" || !isRecord(made.message.body)
      || made.message.body["message"] !== "application-create" || !isRecord(made.message.body["fields"])) return null;
    const fields = made.message.body["fields"], origin: FactRef = { at: parent, seq: 0, hash: parent.genesis };
    const sibling = (kind: "rules" | "membership", pin: string, where: unknown) => isScopeRef(where) && creator.sends.some(send => isSeed(send.to)
      && send.to.kind === kind && send.to.definition === pin && same(resolveGenesisSelf(send.to.creator, origin), parent) && scopeIdOf(send.to) === where.scope);
    if (!sibling("rules", cohort.rules, made.from.at) || !isMemberRef(fields["installer"])
      || !sibling("membership", cohort.membership, fields["installer"].membership) || !isDigest(born.seed.definition)
      || fields["definition"] !== born.seed.definition || !isDigest(fields["release"]) || !isDigest(fields["semantic"]) || !isDigest(fields["presentation"])
      || typeof fields["job"] !== "number" || !Number.isSafeInteger(fields["job"]) || fields["job"] < 0
      || born.seed.kind !== "lane" || born.seed.ordinal !== 0
      || born.seed.cause !== deliveryCauseDigest({ v: 1, from: made.from, n: made.n, message: messageDigest(made.message) })
      || !isRecord(born.message.body) || !same(born.message.body["directory"], parent)
      || !same(born.message.body["membership"], fields["installer"].membership)) return null;
    return { directory: parent, rules: made.from.at, rulesNamed: cohort.rules, item: fields["job"], root: childAt, definition: born.seed.definition,
      ids: { release: fields["release"], semantic: fields["semantic"], presentation: fields["presentation"] } };
  }
  throw new ArchiveChainLimit();
}
