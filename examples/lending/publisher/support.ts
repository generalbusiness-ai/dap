/** Real in-memory judges and fold, with scripted membership and read authority.
 * No enrollment, native object, delivery, network or Git host runs here. */
import { HISTORY_PAGE_BYTES, HISTORY_PAGE_ENTRIES, PROPOSED_BOUNDS, type Answer, type Beside, type Digest, type KeyId, type LogPage, type MemberRef, type Read, type ReadMinimum, type Receipt, type RetainedInput, type ScopeApi, type Sealed, type SignedIntent, type Summary } from "@generalbusiness/dap-contract";
import { canonicalBytes, canonicalize, digestBytes, intentDigest, textDigest, utf8, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { prepareRules, resolvedEntryEffects, validateDefinition, type Fetched } from "@generalbusiness/dap-derive";
import { evaluateRules, RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { created, grantOf, keys, valid, type Actor, type Ledger } from "@generalbusiness/dap-derive/testing";
import { MemorySource, verify } from "@generalbusiness/dap-replay";
import { lendingPublisher } from "./definition.ts";
import { publisherRoles } from "./roles.ts";

export interface ScriptedAuthority {
  key: KeyId;
  member: MemberRef;
  principal: MemberRef | null;
  actions: readonly string[];
}

export type PublisherLedger = Ledger & {
  authorities: readonly ScriptedAuthority[];
  ruleInputs: Map<Digest, string>;
  retainedTexts: Map<Digest, string>;
  facts: readonly Fetched[];
};

/** Explicit stand-ins. A test can assign two keys to one member without enrolling either key. */
export function makePublisher(options: { actors?: readonly ScriptedAuthority[]; key?: string } = {}): PublisherLedger {
  const definition = valid(validateDefinition(lendingPublisher, PROPOSED_BOUNDS, RULE_PROFILES));
  const ledger: PublisherLedger = Object.assign(created(definition, { opener: keys.rita.member }, options.key ?? "publisher-found"), {
    authorities: options.actors ?? [
      { ...keys.rita, actions: publisherRoles.roles.admin },
      { ...keys.una, actions: publisherRoles.roles.agent },
      { ...keys.vic, actions: publisherRoles.roles.agent },
      { ...keys.sam, actions: publisherRoles.roles.agent },
    ],
    ruleInputs: new Map<Digest, string>(), retainedTexts: new Map<Digest, string>(), facts: [] as readonly Fetched[],
  });
  ledger.presentedGrants = () => ledger.authorities.map(row => ({
    // grantOf uses only these public identity fields; it never reads this stand-in secret.
    grant: grantOf({ key: row.key, member: row.member, principal: row.principal, secret: new Uint8Array(0) } satisfies Actor, ledger.at, row.actions), current: true,
  }));
  return ledger;
}

function receipt(ledger: PublisherLedger, seq: number): Receipt {
  const sealed = ledger.entries[seq]!;
  const input = sealed.entry.input;
  return {
    fact: ledger.fact(seq), definition: ledger.definition.digest,
    intent: input.type === "act" ? intentDigest(input.signed.intent) : null,
    effects: resolvedEntryEffects(ledger.state, ledger.definition, sealed.entry, ledger.at),
    sends: sealed.entry.sends.map(send => `${seq}.${send.n}`), epoch: 0,
  };
}

/** Judge the caller's existing envelope. A duplicate returns its original receipt. */
export async function submitPublisher(ledger: PublisherLedger, signed: SignedIntent, beside: Beside = {}, facts: readonly Fetched[] = ledger.facts): Promise<Answer> {
  const texts = new Map((beside.texts ?? []).map(text => [textDigest(text), text]));
  const context = ledger.context({ facts, presented: beside.presented, texts: digest => {
    const text = texts.get(digest);
    return text === undefined ? undefined : utf8(text).length;
  } });
  const inputs = prepareRules(ledger.state, ledger.definition, { act: signed, context });
  const prepared = await evaluateRules(inputs);
  const judgment = ledger.submit(signed, { ...context, prepared });
  switch (judgment.result) {
    case "write":
      for (const input of inputs) if (judgment.draft.prepared.some(row => row.input === input.digest)) ledger.ruleInputs.set(input.digest, canonicalize(input.input));
      for (const [digest, text] of texts) ledger.retainedTexts.set(digest, canonicalize(text));
      ledger.remember(facts);
      return { answer: "accepted", receipt: receipt(ledger, ledger.last.seq) };
    case "accepted-before": return { answer: "accepted", receipt: receipt(ledger, judgment.seq) };
    case "refused": return { answer: "refused", reason: judgment.reason, ...(judgment.name === undefined ? {} : { name: judgment.name }), judgedAt: judgment.judgedAt };
    case "mismatch": return { answer: "mismatch", reason: judgment.reason };
    case "unavailable": return { answer: "unavailable", reason: judgment.reason };
    case "due": return { answer: "unavailable", reason: "unavailable" };
  }
}

/** The read credential is a stand-in, not a native session or membership proof. */
export const PUBLISHER_READER = "Session publisher-fixture";
const turns = new WeakMap<PublisherLedger, Promise<unknown>>();

/** Client-facing scope exchange over the actual ledger. Unsupported ports refuse explicitly. */
export function publisherTransport(ledger: PublisherLedger, options: { pageEntries?: number } = {}): ScopeApi {
  const pageEntries = options.pageEntries ?? HISTORY_PAGE_ENTRIES;
  if (!Number.isInteger(pageEntries) || pageEntries < 1 || pageEntries > HISTORY_PAGE_ENTRIES) throw new Error("Invalid fixture page size.");
  const unavailable = async () => ({ ok: false, reason: "unavailable" } as const);
  const at = <T>(scope: string, reader: unknown, read: () => Read<T>, minimum?: ReadMinimum): Read<T> => {
    if (scope !== ledger.at.scope) return { ok: false, reason: "not-found" };
    if (reader !== PUBLISHER_READER) return { ok: false, reason: "forbidden" };
    if (minimum) {
      if (minimum.at.scope !== ledger.at.scope || minimum.at.genesis !== ledger.at.genesis) return { ok: false, reason: "wrong-genesis" };
      const seq = typeof minimum.head === "number" ? minimum.head : minimum.head.seq;
      if (ledger.head.seq < seq || typeof minimum.head !== "number" && ledger.head.seq === seq && ledger.head.hash !== minimum.head.hash) return { ok: false, reason: "behind", current: ledger.fact(ledger.head.seq) };
    }
    return structuredClone(read());
  };
  return {
    create: async () => ({ answer: "unavailable", reason: "unavailable" }),
    prepare: async () => ({ answer: "unavailable", reason: "unavailable" }),
    submit: (scope, signed, _grants, beside) => {
      if (scope !== ledger.at.scope) return Promise.resolve<Answer>({ answer: "refused", reason: "misaddressed", judgedAt: ledger.head });
      // One scope judges one turn at a time, including asynchronous rule preparation.
      const result = (turns.get(ledger) ?? Promise.resolve()).then(() => submitPublisher(ledger, signed, beside));
      turns.set(ledger, result.catch(() => undefined));
      return result;
    },
    settle: async (scope, signed) => {
      if (scope !== ledger.at.scope || !verifySignedIntent(signed) || signed.intent.to?.scope !== ledger.at.scope) return { ok: false, reason: "not-found" };
      if (signed.intent.to.genesis !== ledger.at.genesis) return { ok: false, reason: "wrong-genesis" };
      const accepted = ledger.state.accepted(signed.intent.actor, signed.intent.idempotencyKey);
      if (!accepted || accepted.intent !== intentDigest(signed.intent)) return { ok: false, reason: "not-found" };
      return { ok: true, at: ledger.head, complete: true, value: receipt(ledger, accepted.seq) };
    },
    summary: async (scope, reader, minimum) => at<Summary>(scope, reader, () => {
      const state = ledger.state.scope()!;
      const counts: [string, string, number][] = [];
      for (const [name, type] of Object.entries(ledger.definition.declared.items).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
        for (const state of Object.keys(type.states).sort()) counts.push([name, state, ledger.state.count(name, state)]);
      }
      return { ok: true, at: ledger.head, complete: true, value: {
        scope: ledger.at, status: state.status, definition: ledger.definition.digest, time: state.time,
        items: ledger.state.all().items.filter(item => !ledger.definition.declared.items[item.type]!.states[item.state]!.final), counts,
      } };
    }, minimum),
    entry: async (scope, reader, seq, minimum) => at<Sealed>(scope, reader, () => {
      const sealed = ledger.entries[seq];
      return sealed ? { ok: true, at: ledger.head, complete: true, value: sealed } : { ok: false, reason: "not-found" };
    }, minimum),
    log: async (scope, reader, cursor) => at<LogPage>(scope, reader, () => {
      const from = cursor === undefined ? 0 : /^(0|[1-9][0-9]{0,15})$/.test(cursor) ? Number(cursor) : -1;
      if (from < 0 || !Number.isSafeInteger(from)) return { ok: false, reason: "not-found" };
      const entries: { seq: number; hash: Digest; bytes: string }[] = [];
      let bytes = 0;
      for (const sealed of ledger.entries.slice(from, from + pageEntries)) {
        const text = canonicalize(sealed.entry), size = utf8(text).length;
        if (bytes + size > HISTORY_PAGE_BYTES) break;
        entries.push({ seq: sealed.entry.seq, hash: sealed.hash, bytes: text }); bytes += size;
      }
      if (from < ledger.entries.length && entries.length === 0) return { ok: false, reason: "too-large" };
      const next = from + entries.length;
      return { ok: true, at: ledger.head, complete: next >= ledger.entries.length, ...(next < ledger.entries.length ? { next: String(next) } : {}), value: { scope: ledger.at, definition: ledger.definition.digest, entries } };
    }),
    retained: async (scope, reader, kind, digest) => at<RetainedInput>(scope, reader, () => {
      const input: RetainedInput | undefined = kind === "definition" && digest === ledger.definition.digest ? { kind, digest, bytes: canonicalize(ledger.definition.declared) }
        : kind === "rule" && ledger.ruleInputs.has(digest) ? { kind, digest, bytes: ledger.ruleInputs.get(digest)! }
        : kind === "text" && ledger.retainedTexts.has(digest) ? { kind, digest, bytes: ledger.retainedTexts.get(digest)! } : undefined;
      return input ? { ok: true, at: ledger.head, complete: true, value: input } : { ok: false, reason: "not-found" };
    }),
    items: unavailable, queryItems: unavailable, applicationProjection: async () => canonicalize({ ok: false, reason: "unavailable" }),
    history: unavailable, outbox: unavailable, outboxItem: unavailable,
  };
}

/** Replay actual entry and rule-input bytes. Membership freshness remains as recorded. */
export function replayPublisher(ledger: PublisherLedger, others: readonly PublisherLedger[] = []) {
  const all = [ledger, ...others];
  const source = new MemorySource(all.map(current => {
    const retained: RetainedInput[] = [
      { kind: "definition", digest: current.definition.digest, bytes: canonicalize(current.definition.declared) },
      ...[...current.ruleInputs].map(([digest, bytes]) => ({ kind: "rule" as const, digest, bytes })),
      ...[...current.retainedTexts].map(([digest, bytes]) => ({ kind: "text" as const, digest, bytes })),
    ];
    for (const { entry } of current.entries) for (const use of entry.uses) {
      const owner = all.find(other => other.at.scope === use.fact.at.scope && other.at.genesis === use.fact.at.genesis);
      const original = owner?.entries[use.fact.seq];
      if (!original || original.hash !== use.fact.hash || digestBytes(canonicalBytes(original.entry)) !== use.content) throw new Error("Replay requires the exact retained foreign entry.");
      retained.push({ kind: "entry", digest: use.content, bytes: canonicalize(original.entry), under: owner!.under });
    }
    return { scope: current.at, entries: current.entries.map(({ entry, hash }) => ({ seq: entry.seq, hash, bytes: canonicalize(entry) })), retained };
  }));
  return verify(source, { mode: "replay", scope: ledger.at.scope, grants: "as-recorded", bounds: PROPOSED_BOUNDS });
}
