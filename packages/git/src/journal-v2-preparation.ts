/** One receipt-bound layout session. No scope entry/retained payload,
 * inventory, privacy admission or export certificate is supplied here. */
import type { Head, ScopeRef } from "@generalbusiness/dap-contract";
import { isHead, isScopeRef, natural } from "@generalbusiness/dap-bytes";
import { JournalObjectReader, journalFormat, journalId, type JournalFormat, type JournalObjectSource } from "./journal-objects.ts";
import { readJournalPassParent } from "./journal-v2-parent.ts";
import { JOURNAL_V2_LAST_POSITION, journalV2PassPath, readJournalV2Path } from "./journal-v2-path.ts";
import { sameJournalScope } from "./journal-selection.ts";
import { JournalV2TreePatch, type JournalV2PlannedFile, type JournalV2PatchForecast } from "./journal-v2-tree.ts";
import { JournalLayoutRefusal, JournalWork, refuseJournal, type JournalBudget, type JournalCost, type JournalLayoutReason } from "./journal-work.ts";

const preparationCostKeys = ["entries", "attempts", "nodes", "calls", "metadata", "inputWork"] as const;
function addPreparationCost(total: JournalCost, before: JournalCost, after: JournalCost): void {
  for (const key of preparationCostKeys) {
    const delta = after[key] - before[key];
    if (!natural(delta) || !natural(total[key] + delta)) return refuseJournal("unavailable");
    total[key] += delta;
  }
}

export interface JournalPassPreparationOptions {
  readonly format: JournalFormat; readonly at: ScopeRef; readonly after: Head | null;
  readonly parent: { readonly id: string; readonly source: JournalObjectSource } | null;
  readonly budget: JournalBudget;
}
export type JournalPassPreparationResult = { readonly ok: true; readonly preparation: JournalPassPreparation }
  | { readonly ok: false; readonly reason: JournalLayoutReason; readonly where?: string };

export class JournalPassPreparation {
  #used = false;
  readonly #patch: JournalV2TreePatch;
  readonly #metadataCost: JournalCost;
  private constructor(readonly format: JournalFormat, readonly at: ScopeRef, readonly after: Head | null,
    readonly parent: string | null, readonly first: number, readonly work: JournalWork, patch: JournalV2TreePatch,
    metadataCost: JournalCost) { this.#patch = patch; this.#metadataCost = metadataCost; }

  static async begin(options: JournalPassPreparationOptions): Promise<JournalPassPreparationResult> {
    try {
      const before = options.budget.admitted();
      const work = new JournalWork(options.budget), format = journalFormat(options.format);
      work.metadata(1024);
      if (!isScopeRef(options.at) || options.after !== null && !isHead(options.after)) return refuseJournal("parent");
      const at = Object.freeze({ ...options.at }), after = options.after ? Object.freeze({ ...options.after }) : null;
      const supplied = options.parent, parent = supplied ? { id: journalId(format, supplied.id), source: supplied.source } : null;
      if ((parent === null) !== (after === null)) return refuseJournal("parent");
      const first = after ? after.seq + 1 : 0;
      if (first > JOURNAL_V2_LAST_POSITION) return refuseJournal("limit");
      const reader = parent ? new JournalObjectReader(format, parent.source, work) : null;
      const tree = parent ? await readJournalPassParent(reader!, parent.id, at, after!, work) : null;
      const patch = new JournalV2TreePatch(reader, tree, work);
      // Every pass owns these two files. Further calls add only new segment
      // and retained paths, never another allowance or a replacement pass.
      await patch.prepare(["journal/v2/head.json", journalV2PassPath(first)]);
      const cost = { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 };
      addPreparationCost(cost, before, options.budget.admitted());
      const preparation = new JournalPassPreparation(format, at, after, parent?.id ?? null, first, work, patch, cost);
      Object.freeze(preparation);
      return { ok: true, preparation };
    } catch (error) {
      if (error instanceof JournalLayoutRefusal) return { ok: false, reason: error.reason, ...(error.where ? { where: error.where } : {}) };
      const reason = error && typeof error === "object" && "reason" in error ? error.reason : "unavailable";
      return { ok: false, reason: reason === "limit" || reason === "timeout" ? reason : "unavailable" };
    }
  }
  /** Structured unique deltas only, outside a native synchronous frame.
   * Registration cannot select a body; final selection still binds bytes. */
  async prepare(paths: readonly string[]): Promise<void> {
    this.work.check();
    if (this.#used) return refuseJournal("unavailable");
    const before = this.work.budget.admitted();
    try {
      this.work.metadata(paths.length * 64);
      for (const path of paths) {
        if (typeof path !== "string" || path.length > 1024) return refuseJournal("tree");
        this.work.input(path.length, 4);
        const named = readJournalV2Path(path);
        if (!named || named.kind === "head" || named.kind === "pass"
          || named.kind === "retained" && named.first !== this.first
          || named.kind === "segment" && (named.pass !== this.first || named.first < this.first)) return refuseJournal("parent", path);
      }
      await this.#patch.prepare(paths);
    } finally {
      addPreparationCost(this.#metadataCost, before, this.work.budget.admitted());
    }
  }
  /** Exact work inside settled preparation/forecast calls only. Reporting this
   * attribution never changes the live allowance. Work between calls and
   * final payload construction remain outside it. Await calls serially;
   * do not spend this budget on other work while a call is pending. */
  metadataCost(): Readonly<JournalCost> { return Object.freeze({ ...this.#metadataCost }); }
  /** Patch construction only, under this same receipt/format/work. It is
   * not the complete native pass's finish forecast or an allowance. */
  forecast(files: readonly JournalV2PlannedFile[]): JournalV2PatchForecast {
    this.work.check(); if (this.#used) return refuseJournal("unavailable");
    const before = this.work.budget.admitted();
    try { return this.#patch.forecast(this.format, files); }
    finally { addPreparationCost(this.#metadataCost, before, this.work.budget.admitted()); }
  }
  /** Builder handshake only. A checked handle is consumed, not serialized
   * as admission evidence. Every final payload/maker debit is still owed. */
  consume(format: JournalFormat, at: ScopeRef, after: Head | null, parent: string | null, budget: JournalBudget): JournalV2TreePatch {
    this.work.check();
    if (this.#used) return refuseJournal("unavailable");
    this.#used = true;
    if (this.work.budget !== budget || format !== this.format || parent !== this.parent || !sameJournalScope(at, this.at)
      || (this.after === null ? after !== null : after === null || after.seq !== this.after.seq || after.hash !== this.after.hash)) return refuseJournal("parent");
    return this.#patch;
  }
}

export function prepareJournalPass(options: JournalPassPreparationOptions): Promise<JournalPassPreparationResult> {
  return JournalPassPreparation.begin(options);
}
