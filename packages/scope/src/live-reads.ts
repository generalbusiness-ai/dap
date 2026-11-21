/**
 * The reads of live state and the watch (live note, section 3.5). They are
 * a platform interface: the shapes are `LiveRead`, `LiveSummary` and
 * `LiveLine` of `packages/platform/src/live.ts`, and the kernel's `Read`
 * does not name them.
 *
 * A live scope answers two families of read, and they never mix. The reads
 * of the record (`reads.ts`) answer its creation entries at the journal's
 * head. These reads answer the state in memory, and each answer names the
 * generation and the tick that it shows. No answer here holds a head, an
 * entry or a fact.
 *
 * A read session authorizes them, as it authorizes the reads of the
 * record: the live summary needs the read `summary`, the live items the
 * read `items`, and the watch the read `summary`, as the head stream does.
 * A signed read names entries of the record, and live state has none, so a
 * reader that presents one is refused. Who may read is asked first, so a
 * refusal says nothing about whether the scope is live.
 *
 * The watch is a stream of `Streams` (`sessions.ts`) whose line is the
 * generation and the tick. It counts against the scope's one bound of
 * streams, its session is checked before every send, and while one line
 * waits unread a later change sends nothing more: the reader is sent the
 * latest generation and tick when it reads next.
 */

import type { Cursor, Item } from "@generalbusiness/dap-contract";
import type { LiveLine, LiveRead, LiveReadRefusal, LiveSummary } from "@generalbusiness/dap-platform";
import type { ValidDefinition } from "@generalbusiness/dap-derive";
import type { LiveGeneration, LiveTurns } from "./live.ts";
import type { ReadName, Readers } from "./ports.ts";
import { finalPage, summaryOf } from "./reads.ts";
import { presentsSignedRead } from "./signed-reads.ts";
import type { Line } from "./sessions.ts";

const no = (reason: LiveReadRefusal): { ok: false; reason: LiveReadRefusal } => ({ ok: false, reason });

export class LiveReads {
  readonly #readers: Readers;
  readonly #live: () => LiveTurns | null;
  readonly #definition: () => ValidDefinition | null;
  readonly #retainedItems: number;

  /** `live`: the object's live turn, or null for a retired room. `retainedItems`: the most final items in one page, as a read of the record pages them. */
  constructor(readers: Readers, live: () => LiveTurns | null, definition: () => ValidDefinition | null, retainedItems: number) {
    this.#readers = readers;
    this.#live = live;
    this.#definition = definition;
    this.#retainedItems = retainedItems;
  }

  /** The reader's session first, then the live state now and the definition that it follows. */
  #open(reader: unknown, read: ReadName): (LiveGeneration & { definition: ValidDefinition }) | { ok: false; reason: LiveReadRefusal } {
    if (presentsSignedRead(reader)) return no("forbidden");
    const allowed = this.#readers.allows(reader, read);
    if (allowed !== true) return no(allowed === false ? "forbidden" : allowed);
    const current = this.#live()?.current(), definition = this.#definition();
    return current && definition ? { ...current, definition } : no("not-found");
  }

  /** Whether that reader may watch, and the scope is an active live scope. Null: it may. */
  watchable(reader: unknown): { ok: false; reason: LiveReadRefusal } | null {
    const open = this.#open(reader, "summary");
    return "view" in open ? null : open;
  }

  /** The items in no final state and the counts, as the summary of the record shows them, at the generation and tick named. */
  summary(reader: unknown): LiveRead<LiveSummary> {
    const open = this.#open(reader, "summary");
    if (!("view" in open)) return open;
    const { items, counts, complete } = summaryOf(open.view, open.definition);
    return { ok: true, generation: open.generation, tick: open.tick, value: { scope: open.view.scope()!.at, definition: open.definition.digest, items, counts }, complete };
  }

  /** A page of the final items of one type, by ID, at the generation and tick named. A cursor holds across ticks of one generation. */
  items(reader: unknown, type: string, cursor?: Cursor): LiveRead<readonly Item[]> {
    const open = this.#open(reader, "items");
    if (!("view" in open)) return open;
    const page = finalPage(open.view, open.definition, type, cursor, this.#retainedItems);
    if (!page) return no("not-found");
    return { ok: true, generation: open.generation, tick: open.tick, value: page.items, complete: page.next === undefined, ...page.next === undefined ? {} : { next: page.next } };
  }

  /** The watch's line: the generation and the tick now. Null: no live state to show. */
  readonly line: Line = () => {
    const current = this.#live()?.current();
    if (!current) return null;
    const line: LiveLine = { generation: current.generation, tick: current.tick };
    return { key: `${line.generation}:${line.tick}`, line };
  };
}
