/**
 * The definition validator's bounded entry (scope contract, section 6.1).
 * A declared format selects one named check set: format-1.ts owns
 * artroom-definition-1 and calls the existing grammar families beside it.
 * Unknown formats never use its checks as a fallback. Public inputs,
 * defaults and derived results retain their existing API.
 */

import type { Bounds, DeclaredDefinition, Digest } from "@generalbusiness/dap-contract";
import { canonicalize, utf8 } from "@generalbusiness/dap-bytes";
import type { Underived } from "./capability.ts";
import type { PendingWorkAmounts, PendingCopy } from "./capacity.ts";
import type { MarkPlace, RangeIndex } from "./context.ts";
import type { Reserving } from "./holds.ts";
import { shapes, type Problem } from "./shape.ts";
import type { Markers } from "../markers.ts";
import type { Standing } from "./standing.ts";
import { PROFILE } from "../rule/profile.ts";
import { FORMAT_1, validateFormat1 } from "./format-1.ts";

export type { MarkKind, MarkPlace, RangeIndex } from "./context.ts";
export type { Problem, ProblemCode } from "./shape.ts";
export type { Underived } from "./capability.ts";
export type { KindReserved, Reserving } from "./holds.ts";
export { timedGraph, type TimedGraph, type TimedMove } from "./timed.ts";

/** A definition that passed, with what was derived from it. The judges and the fold take only this. */
export interface ValidDefinition {
  readonly declared: DeclaredDefinition;
  readonly digest: Digest;
  /** C1's platform-only monotone singleton entry reservation. Absent: none. */
  readonly standing?: Standing;
  readonly timedTypes: readonly string[];   // section 5.2
  readonly holdTypes: readonly string[];    // section 6.8: the types a `hold: open` effect targets
  readonly indexes: readonly RangeIndex[];
  /**
   * Section 17.2, a chain of timed rules: for each timed item type and each
   * live state a timed rule applies in, the entries a deadline held in that
   * state reserves: one for each rule of the longest chain that starts there.
   */
  readonly deadlines: Readonly<Record<string, Readonly<Record<string, number>>>>;
  /**
   * Section 17.2, a request's clauses: the entries a request reserves for
   * what the clause of its result or diagnosis can start. The largest, over
   * every request send of the definition and its clauses `applied`,
   * `refused`, `superseded` and `undelivered`, of the chains of the
   * deadlines that clause can create.
   */
  readonly clauseEntries: number;
  /**
   * Section 17.2, row 3: for each item type and each state in which an item
   * awaits a settlement that an act or handler declares with `settles`, the
   * entries that item reserves: the settling entry and what it can start.
   */
  readonly pending: Readonly<Record<string, Readonly<Record<string, number>>>>;
  /** Section 17.2, row 4: each relationship whose copies await a settlement, with the states and the entries a copy in one of them reserves. */
  readonly pendingCopies: readonly PendingCopy[];
  /** Known declared task terms, including future requests and their result-source bytes. Other axes/retention remain partial. */
  readonly pendingWorkAmounts: PendingWorkAmounts;
  /** Opt-in writer ceiling for each retained rule input; absent in legacy definitions. */
  readonly ruleInputBytes?: number;
  /**
   * Section 6.11: each form that this package reads and does not derive by
   * itself, with the capability version whose own code derives it. A runtime
   * or a verifier that has no such code answers `unsupported-definition` for
   * the whole definition (`derivable`). Empty: every form is derived here.
   */
  readonly underived: readonly Underived[];
  /**
   * Section 6.1, "Platform code: a mark, and its rule": each mark of the
   * data of a platform definition, with its place. A runtime or a verifier
   * that lacks the rule of one, of the kind of its place, answers
   * `unsupported-definition` for the whole definition (`runnable`, in
   * `marks.ts`). Empty: a declared definition, which holds no mark.
   */
  readonly marks: readonly MarkPlace[];
  /**
   * Section 17.2a: what the data of a platform definition reserves by the
   * `holds` of its item types, the `adds` of its acts and the marks of its
   * kinds of `outcomes`, as amounts in the five dimensions. Absent: a
   * declared definition, or platform data with no kind and no `holds`.
   */
  readonly reserving?: Reserving;
  /**
   * Section 17.2, "A marker duty" (revision 22): each item type that some
   * form settles by a mark, with what the amounts of its pending work is derived
   * from (`markers.ts`). An item of such a type reserves by its state and
   * by the marks that are `true`, so `pending` has no row for the type.
   * Absent: no form of the definition settles by a mark.
   */
  readonly markers?: Markers;
  /**
   * Section 17.2a, "An index that an item type declares" (revision 23): for
   * each item type of platform data that states `indexes`, its indexed
   * slots. The fold writes one row for each, with the item. Absent: no type
   * declares one.
   */
  readonly keyed?: Readonly<Record<string, readonly string[]>>;
  /**
   * Section 16.1, "The subjects that an entry observes" (revision 20): the
   * data of a platform definition states rows of `observes`, or the
   * `origin` of an outcome, somewhere. Then each entry of the definition
   * retains exactly the observations of the subjects that its rows give,
   * and an outcome's `uses` is a copy of its origin's. False: no data of
   * the definition states either, as for every declared definition, and
   * the older rule stands as a stand-in (`observes.ts`, "The stand-in").
   */
  readonly observing: boolean;
}

export type Validation = { ok: true; definition: ValidDefinition } | { ok: false; problems: readonly Problem[] };

/**
 * An evaluator profile, by `name@version` (section 6.1). `admit` says why the
 * profile does not admit a rule's text, or null. It is synchronous. The
 * evaluator's own entry point, `@generalbusiness/dap-derive/rule`, exports
 * the table that checks each rule; this one checks names and shapes only, so
 * that the judges never load the engine.
 */
export interface Profile { admit?: (source: string) => string | null; inputBytes?: number }

export const PROFILES: Readonly<Record<string, Profile>> = { "restricted@1": { inputBytes: PROFILE.inputBytes } };

/**
 * What only a platform definition may state, and only the platform package passes (section 6.1). `platform`: the value is the data
 * of a platform definition. Its name may begin `platform:`. It has the member `outcomes`, and it may hold a mark at each of the seven
 * places. The validator checks that each mark is well formed and stands at one of them, lists it, and derives nothing from it. It
 * does not read the table of rules. A definition that came from an input is validated without the option: a mark in it is a form
 * that the contract does not define, and is refused as any such form is.
 */
export interface ValidateOptions {
  readonly platform?: boolean;
  /** Static declarations of the trusted pinned owner code, by outcome kind. */
  readonly outcomeValues?: Readonly<Record<string, readonly import("../ledger.ts").EvidenceValueDomain[]>> | null;
}

export function validateDefinition(input: unknown, bounds: Bounds, profiles: Readonly<Record<string, Profile>> = PROFILES, options: ValidateOptions = {}): Validation {
  if (options.outcomeValues === null) return { ok: false, problems: [{ code: "shape", path: "outcomes", message: "an owner with an evidence value reader has no static domain declaration for this pinned version and kind" }] };
  const read = shapes(bounds);
  const { problems, bad, rec } = read;

  const platform = options.platform === true;
  const top = rec(input, "", ["format", "name", "profile", "capabilities", "genesis", "items", "acts", "receives", "timed", "rules", ...(platform ? ["outcomes"] : [])], ["level", "capacity", ...(platform ? ["standing"] : [])]);
  if (!top) return { ok: false, problems };
  // Section 6.1: the bound on a definition's canonical bytes limits the validator's work, so it is checked before anything is read.
  // A value with no canonical bytes is refused at the end, as before.
  let size: number | null = null;
  try { size = utf8(canonicalize(input)).length; } catch { /* refused below */ }
  if (size !== null && size > bounds.definitionBytes) return { ok: false, problems: [{ code: "bound", path: "", message: `has ${size} canonical bytes; at most ${bounds.definitionBytes}` }] };
  const format = top["format"];
  if (format !== FORMAT_1) {
    if (typeof format === "string" && format !== "") {
      bad("unsupported-definition", "format", `definition format ${JSON.stringify(format)} is not supported`);
      return { ok: false, problems };
    }
    // Preserve the existing malformed-format diagnostic and later problems.
    // Only a nonempty unknown format selects the unsupported-format refusal.
    bad("shape", "format", "must be artroom-definition-1");
  }
  return validateFormat1(input, bounds, profiles, options, top, read, platform);
}
