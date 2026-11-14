/**
 * The entries that a replica folded, and the one `Own` over them
 * (`notes/2026-11-13-scope-client.md`, section 9; `notes/2026-11-13-state-seed.md`, sections 3 and 9).
 *
 * The fold and the judges read earlier entries of the scope's own journal
 * through `Own`. This `Own` follows `floorOwn` of `packages/replay` for a
 * journal with no floor: it answers each entry from the genesis to the
 * replica's head, and null above the head (ruling 7c8774a2, c). It never
 * answers null for a position that the scope holds and the replica lacks.
 * It throws `UnheldEntry` there, and it records each throw, because three
 * catch sites of `packages/derive` can catch the throw first (carry
 * 556eca2b). After each call of a judge or of the fold, the replica takes
 * the record.
 *
 * The replica keeps one `Own` object for its life: the judges compare
 * `Own` by identity.
 */

import type { Entry, FactUse, Head, Sealed, SequenceRef } from "@generalbusiness/dap-contract";
import { admitSequenceGenesis, scopeIdOf, type CheckedSequence } from "@generalbusiness/dap-bytes";
import type { Own } from "@generalbusiness/dap-derive";

/**
 * The scope holds a thing that the replica lacks. `seq`: the position of
 * the entry, or null for a retained copy of an entry of another scope.
 */
export class UnheldEntry extends Error {
  override readonly name = "UnheldEntry";
  constructor(readonly seq: number | null) {
    super(seq === null ? "the replica holds no retained copy that the scope holds" : `the replica lacks entry ${seq}, which the scope holds`);
  }
}

/** One folded entry, parsed, with its hash. The store keeps no bytes: the parsed form is what `Own` answers. */
export interface HeldEntry { entry: Entry; hash: Sealed["hash"] }

export class HeldEntries {
  readonly own: Own;
  readonly #entries: HeldEntry[] = [];
  #record: UnheldEntry[] = [];
  #sequence: CheckedSequence | null = null;
  /** The test seam: positions that this store lacks while it holds the positions after them. */
  readonly #lacking = new Set<number>();

  constructor(readonly entryBytes: number) {
    const unheld = (seq: number | null): never => {
      const fault = new UnheldEntry(seq);
      this.#record.push(fault);
      throw fault;
    };
    const own: Own = (seq: number) => {
      if (!Number.isSafeInteger(seq) || seq < 0 || seq >= this.#entries.length) return null;
      if (this.#lacking.has(seq)) return unheld(seq);
      const held = this.#entries[seq]!;
      return { entry: held.entry, hash: held.hash };
    };
    own.sequence = () => {
      if (this.#entries.length > 0 && this.#lacking.has(0)) return unheld(0);
      return this.#sequence;
    };
    // The scope keeps retained copies of entries of other scopes. The replica keeps none, so a read of one never answers "none".
    own.retained = (_use: FactUse): Entry | null => unheld(null);
    const entries = this.#entries;
    own.positions = function* (before: number) { for (let seq = 0; seq < Math.min(before, entries.length); seq++) yield seq; };
    // A replica folds only a journal with no floor: it holds no size proof, and no position is archived.
    own.sizeProofs = () => [];
    own.archived = () => null;
    this.own = own;
  }

  get size(): number { return this.#entries.length; }
  get head(): Head | null {
    const last = this.#entries.at(-1);
    return last ? { seq: last.entry.seq, hash: last.hash } : null;
  }
  at(seq: number): HeldEntry | null { return Number.isSafeInteger(seq) && seq >= 0 ? this.#entries[seq] ?? null : null; }

  /** Keep the next entry, after the fold took it. `bytes`: the entry's bytes, as the log gave them. Only the genesis entry's are read, to admit the sequence. */
  put(held: HeldEntry, bytes: string): void {
    if (held.entry.seq !== this.#entries.length) throw new RangeError(`entry ${held.entry.seq} is not the next position ${this.#entries.length}`);
    if (held.entry.seq === 0) {
      const input = held.entry.input;
      if (input.type !== "genesis") throw new RangeError("entry 0 is no genesis");
      const at: SequenceRef = { scope: scopeIdOf(input.seed), genesis: held.hash };
      this.#sequence = admitSequenceGenesis(bytes, at, this.entryBytes);
    }
    this.#entries.push({ entry: held.entry, hash: held.hash });
  }

  /** Forget every entry, for a fold again from the genesis. The `Own` object stays the same. */
  clear(): void {
    this.#entries.length = 0;
    this.#sequence = null;
    this.#record = [];
  }

  /** Read the record of `UnheldEntry` throws since the last take, and clear it. */
  take(): readonly UnheldEntry[] {
    const record = this.#record;
    this.#record = [];
    return record;
  }

  /** TEST SEAM. From now on this store lacks that position. The package entry does not export it (ruling 7c8774a2, f). */
  lack(seq: number): void { this.#lacking.add(seq); }
}
