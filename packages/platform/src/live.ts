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

import type { RefusalReason, UnavailableReason } from "@generalbusiness/dap-contract";

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
