/**
 * The interface of a live scope's turn (live note, sections 3.3 and 3.4).
 * It is a platform interface: no recorded entry rests on it, and the
 * kernel's `Answer`, `Read` and `ScopeApi` (`packages/contract`) do not
 * name it.
 *
 * A **generation** is one life of the live scope's object in memory. The
 * object mints a random generation value when it starts, and no order
 * between two generations is promised. A **tick** counts the inputs that
 * the scope applied in one generation. It starts at the sequence of the
 * journal's head, and each applied act or timed rule adds one.
 */

import type { ApplicationProjectionRow, Cursor, Digest, Item, ReadRefusal, RefusalReason, ScopeRef, UnavailableReason } from "@generalbusiness/dap-contract";

/**
 * The four answers to a live act.
 *
 * - `applied`: the act changed live state in `generation` at `tick`. An act
 *   that opens an item gives it `tick` as its ID. The answer says nothing
 *   about whether that state still exists.
 * - `refused`: the judge refused the act at `tick` of `generation`, with a
 *   reason of the recorded contract. Nothing changed.
 * - `reset`: the act named another generation than the current one, which
 *   the answer names. Nothing was judged. The caller reads again.
 * - `unavailable`: the act was not judged now.
 */
export type LiveAnswer =
  | { answer: "applied"; generation: string; tick: number }
  | { answer: "refused"; reason: RefusalReason; name?: string; generation: string; tick: number }
  | { answer: "reset"; generation: string }
  | { answer: "unavailable"; reason: UnavailableReason };


/**
 * Why a live read gives no value, or why no watch opens. A read session
 * authorizes the live reads as it authorizes the reads of the record, so
 * the reasons of its check are the reasons of `ReadRefusal`. `not-found`:
 * no live state is available, or the definition names no such item type.
 * `unavailable`: the scope holds as many streams as it may.
 */
export type LiveReadRefusal = Extract<ReadRefusal, "forbidden" | "sessions-unavailable" | "clock-behind" | "not-found" | "unavailable" | "rate-limited">;

/**
 * One answer to a live read (live note, section 3.5). It names the
 * generation and the tick of the state that it shows, and no head: a live
 * read never answers a part of the record, and a read of the record never
 * answers live state. `complete` and `next` page the items as a read of
 * the record pages them.
 */
export type LiveRead<T> =
  | { ok: true; generation: string; tick: number; value: T; complete: boolean; next?: Cursor }
  | { ok: false; reason: LiveReadRefusal };

/**
 * The live summary: the items of each type that are in no final state, at
 * most the type's `max`, by ID; and the count of every type and state of
 * the definition, by type, then state, as the summary of the record counts
 * them.
 */
export interface LiveSummary {
  scope: ScopeRef;
  definition: Digest;
  items: readonly Item[];
  counts: readonly (readonly [type: string, state: string, n: number])[];
}

/** A live summary bound to one installed application's canonical query. */
export interface LiveApplicationProjectionData {
  scope: ScopeRef;
  definition: Digest;
  projection: Digest;
  sources: Readonly<Record<string, readonly ApplicationProjectionRow[]>>;
}
export type LiveApplicationProjectionRead =
  | (Extract<LiveRead<LiveApplicationProjectionData>, { ok: true }> & { query: Digest })
  | Extract<LiveRead<LiveSummary>, { ok: false }>
  | { ok: false; reason: "incomplete" };

/** One line of the watch: the live state changed, or a new generation started. A viewer that receives it reads again. */
export interface LiveLine { generation: string; tick: number }
