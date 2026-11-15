/**
 * STAND-INS for the replica's tests: a scope in memory (`Ledger` of the
 * derive fixtures) behind a scripted service binding that answers
 * `summary` and `log`, and an observation that the test drives. They prove
 * what the replica does with the pages and the notices that it gets, not
 * what a scope stores or streams.
 */
import { DOMAINS, PROPOSED_BOUNDS, type DeclaredDefinition, type Digest, type Entry, type Head, type LogPage, type Read } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import { validateDefinition, type ValidDefinition } from "@generalbusiness/dap-derive";
import { changedDraft, lane, valid, type Ledger } from "@generalbusiness/dap-derive/testing";
import { DeclaredHandle, ScopeHandle, bindingTransport, type Observation, type ObservationState, type ServiceBinding } from "../src/index.ts";
import type { Observe } from "../src/scope.ts";

export const SESSION = "Session TEST-token";

export const hashOfBytes = (bytes: string): Digest => digestBytes(utf8(`${DOMAINS.entry}\n${bytes}`));

/**
 * The lane, with one more act: `cite` names an entry of the scope's own
 * journal, and is refused when the intent already cites that entry. Its
 * guard compares a local fact, so the judge reads `Own` (ruling b1b1d492).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const citing: DeclaredDefinition = changedDraft(lane, (d: any) => {
  const cause = { type: "fact", kind: ["remark"], under: "lane" };
  d.items.intent.values.cited = { fixed: false, required: false, of: cause };
  d.acts.cite = {
    step: "transition", on: "intent", grant: "remark", also: {}, fields: { cause: { ...cause, required: true } },
    guards: [{ state: ["open"] }, { differs: { a: { field: "cause" }, b: { slot: "cited" } } }],
    effects: [{ value: { slot: "cited", from: { field: "cause" } } }], sends: [], attention: [],
  };
});
export const citingDefinition: ValidDefinition = valid(validateDefinition(citing, PROPOSED_BOUNDS));

/** What the scripted log answers, beside the scope's own pages. */
export interface Serving {
  /** Entries for each page. */
  page: number;
  /** An answer in place of the page from that cursor, or null for the page. */
  refuse: ((from: number) => Read<LogPage> | null) | null;
  /** Bytes served at a position in place of the scope's entry, for one read. */
  replace: Map<number, Entry>;
  /** The definition that the summary and each page name, in place of the scope's. */
  definition: Digest | null;
  /** Each cursor that the log was read from. */
  reads: number[];
}

/** A typed handle on the scope, served from its entries. `reader`: what the handle presents. A reader that is no session reads a filtered page. */
export function served(s: Ledger, declared: DeclaredDefinition, digest: Digest = s.definition.digest, over: Partial<Serving> = {}, reader = SESSION) {
  const serving: Serving = { page: 50, refuse: null, replace: new Map(), definition: null, reads: [], ...over };
  const head = (): Head => ({ seq: s.head.seq, hash: s.head.hash });
  const named = () => serving.definition ?? s.definition.digest;
  const binding = {
    summary: async () => ({ ok: true, at: head(), value: { scope: s.at, status: "active", definition: named(), time: s.now, items: [], counts: [] }, complete: true }),
    log: async (_scope: string, _reader: unknown, cursor?: string): Promise<Read<LogPage>> => {
      const from = cursor === undefined ? 0 : Number(cursor);
      serving.reads.push(from);
      const refused = serving.refuse?.(from);
      if (refused) return refused;
      const end = Math.min(s.entries.length, from + serving.page);
      const entries = s.entries.slice(from, end).map(({ entry, hash }) => {
        const replaced = serving.replace.get(entry.seq);
        if (!replaced) return { seq: entry.seq, hash, bytes: canonicalize(entry) };
        serving.replace.delete(entry.seq);
        const bytes = canonicalize(replaced);
        return { seq: replaced.seq, hash: hashOfBytes(bytes), bytes };
      });
      const more = end < s.entries.length;
      return { ok: true, at: head(), value: { scope: s.at, definition: named(), entries }, complete: !more, ...(more ? { next: String(end) } : {}) };
    },
  } as unknown as ServiceBinding;
  const handle = new DeclaredHandle(new ScopeHandle(bindingTransport(binding), s.at.scope, reader), s.at, declared, digest);
  return { handle, serving };
}

/** An observation that the test drives. `cancelled`: the calls of `cancel`. */
export class Feed {
  #emit: ((state: ObservationState<unknown>) => void) | null = null;
  cancelled = 0;
  readonly observe: Observe = (emit) => {
    this.#emit = emit;
    const observation: Observation = { refresh: () => {}, cancel: () => { this.cancelled++; }, done: Promise.resolve() };
    return observation;
  };
  emit(state: ObservationState<unknown>): void { this.#emit!(state); }
  /** The scope's head, as the complete snapshot of a streaming observation. */
  current(s: Ledger): void {
    this.emit({ status: "streaming" });
    this.emit({ status: "current", snapshot: { scope: s.at, definition: s.definition.digest, at: { seq: s.head.seq, hash: s.head.hash }, value: null } });
  }
  down(): void { this.emit({ status: "fallback", reason: "stream-ended" }); }
}
