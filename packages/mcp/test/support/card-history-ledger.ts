/** Literal card-history oracle. No production imports or observed displays. */
export type ReadResult = "complete" | "truncated";
export type Delay = "relay" | "admission" | "result";
export type CardCommand =
  | { kind: "open" | "supersede"; view: string }
  | { kind: "switch"; process: 0 | 1 }
  | { kind: "read" | "refresh" | "reopen" | "check" | "timeout" | "release" | "duplicate" | "close" | "probe-closed" }
  | { kind: "write"; answer: "accepted" | "unknown" }
  | { kind: "exact"; result: ReadResult }
  | { kind: "begin"; delay: Delay; result: ReadResult };
export type VisibleCut = { view: string; cut: number; active: boolean; page: "item" | "diff"; original: boolean; truncated: boolean | null; apply: boolean };
type Mounted = { view: string; process: 0 | 1; cut: number; page: "item" | "diff"; held: ReadResult | null;
  original: number | null; apply: boolean; busy: boolean; writes: Map<number, "accepted" | "unknown"> };
type Pending = { view: string; process: 0 | 1; cut: number; delay: Delay; result: ReadResult; admitted: boolean; wait: "waiting" | "timeout" | "closed" };

export class CardHistoryLedger {
  process: 0 | 1 = 0;
  view = "";
  active: [string | null, string | null] = [null, null];
  mounts = new Map<string, Mounted>();
  client: VisibleCut | null = null;
  pending: Pending | null = null;
  closed = false;
  calls = 0;
  waiters = 0;
  late = 0;
  completed = 0;
  reads = 0;
  writes = 0;
  checks: number[] = [];
  lastReason: string | null = null;
  key(process = this.process, view = this.view) { return `${process}:${view}`; }
  selected() { return this.mounts.get(this.key()); }
  #mount(process: 0 | 1, view: string) {
    const key = this.key(process, view);
    if (!this.mounts.has(key)) {
      this.mounts.set(key, { view, process, cut: 0, page: "item", held: null, original: null, apply: true, busy: false, writes: new Map() });
      this.active[process] = view;
    }
    return this.mounts.get(key)!;
  }
  #visible(card: Mounted): VisibleCut {
    return { view: card.view, cut: card.cut, active: this.active[card.process] === card.view, page: card.page,
      original: card.original !== null, truncated: card.page === "diff" ? card.held === "truncated" : null, apply: card.page === "item" && card.apply };
  }
  #call() {
    this.waiters++;
    if (this.closed) { this.lastReason = "closed"; return false; }
    this.calls++; this.lastReason = null; return true;
  }
  #guard(card: Mounted | undefined, cut: number, busy = true): string | null {
    if (!card) return "absent";
    if (this.active[card.process] !== card.view) return "superseded";
    if (card.cut !== cut) return "stale";
    if (busy && card.busy) return "busy";
    return null;
  }
  #read() {
    if (!this.#call()) return;
    const card = this.selected();
    if (!card) { this.lastReason = "absent"; return; }
    this.client = this.#visible(card);
  }
  #finishRead(card: Mounted, result: ReadResult) {
    card.held = result; card.page = "diff"; card.apply = false; card.cut++;
  }
  #exact(result: ReadResult) {
    if (!this.#call()) return;
    const card = this.selected(), reason = this.#guard(card, this.client?.cut ?? -1);
    if (reason) { this.lastReason = reason; return; }
    if (card!.original !== null) { this.lastReason = "busy"; return; }
    if (card!.held !== "complete") this.reads++;
    this.#finishRead(card!, card!.held === "complete" ? "complete" : result);
    this.client = this.#visible(card!);
  }
  apply(command: CardCommand): void {
    if (command.kind === "switch") { this.process = command.process; return; }
    if (command.kind === "open" || command.kind === "reopen") {
      if (command.kind === "open") this.view = command.view;
      if (!this.#call()) return;
      this.#mount(this.process, this.view); this.#read(); return;
    }
    if (command.kind === "supersede") { this.#mount(this.process, command.view); return; }
    if (command.kind === "read") { this.#read(); return; }
    if (command.kind === "exact") { this.#exact(command.result); return; }
    if (command.kind === "refresh") {
      if (!this.#call()) return;
      const card = this.selected(), reason = this.#guard(card, this.client?.cut ?? -1);
      if (reason) { this.lastReason = reason; return; }
      if (card!.original === null) { card!.cut++; card!.page = "item"; card!.apply = true; }
      this.client = this.#visible(card!); return;
    }
    if (command.kind === "write") {
      if (!this.#call()) return;
      const card = this.selected(), cut = this.client?.cut ?? -1;
      // The original native dispatch replays even after its display moves.
      if (card?.writes.has(cut)) { this.client = this.#visible(card); return; }
      const reason = this.#guard(card, cut);
      if (reason) { this.lastReason = reason; return; }
      if (!card!.apply || card!.page !== "item") { this.lastReason = "shape"; return; }
      this.writes++; card!.writes.set(cut, command.answer);
      if (command.answer === "unknown") { card!.original = this.writes; card!.apply = false; card!.cut++; }
      this.client = this.#visible(card!); return;
    }
    if (command.kind === "check") {
      if (!this.#call()) return;
      const card = this.selected(), reason = this.#guard(card, this.client?.cut ?? -1);
      if (reason) { this.lastReason = reason; return; }
      if (card!.original === null) { this.lastReason = "shape"; return; }
      this.checks.push(card!.original); card!.original = null; card!.apply = false; card!.cut++;
      this.client = this.#visible(card!); return;
    }
    if (command.kind === "begin") {
      if (this.closed || this.pending) throw new Error("The generated history starts at most one live original.");
      const card = this.selected();
      if (this.#guard(card, this.client?.cut ?? -1) || card!.held === "complete" || card!.original !== null)
        throw new Error("The generated history delays a fresh admissible read.");
      this.calls++;
      const admitted = command.delay === "result";
      this.pending = { view: this.view, process: this.process, cut: this.client!.cut, delay: command.delay, result: command.result, admitted, wait: "waiting" };
      if (command.delay !== "relay") card!.busy = true;
      if (admitted) this.reads++;
      return;
    }
    if (command.kind === "timeout") {
      if (!this.pending || this.pending.wait !== "waiting" || this.closed) throw new Error("Only a waiting original times out.");
      this.pending.wait = "timeout"; this.waiters++; this.lastReason = "timeout"; return;
    }
    if (command.kind === "release") {
      const pending = this.pending;
      if (!pending) throw new Error("A release names its original.");
      const card = this.mounts.get(this.key(pending.process, pending.view));
      let reason = this.#guard(card, pending.cut, pending.delay === "relay");
      if (!reason && card!.original !== null) reason = "busy";
      if (!reason) {
        if (!pending.admitted && card!.held !== "complete") { this.reads++; pending.admitted = true; }
        this.#finishRead(card!, card!.held === "complete" ? "complete" : pending.result);
      }
      if (card) card.busy = false;
      this.completed++;
      if (!this.closed) {
        if (pending.wait === "timeout") this.late++;
        else {
          this.waiters++; this.lastReason = reason;
          if (!reason) this.client = this.#visible(card!);
        }
      }
      this.pending = null; return;
    }
    if (command.kind === "close") {
      if (!this.closed && this.pending?.wait === "waiting") { this.pending.wait = "closed"; this.waiters++; this.lastReason = "closed"; }
      this.closed = true; return;
    }
    if (command.kind === "probe-closed") { this.#call(); return; }
    // An exact duplicate reply changes no waiter, original or dispatch count.
  }
  snapshot() {
    return { process: this.process, view: this.view, active: [...this.active], client: this.client && { ...this.client }, closed: this.closed,
      calls: this.calls, waiters: this.waiters, late: this.late, completed: this.completed, reads: this.reads, writes: this.writes,
      signatures: this.reads + this.writes, checks: [...this.checks], lastReason: this.lastReason,
      pending: this.pending && { process: this.pending.process, view: this.pending.view, cut: this.pending.cut, delay: this.pending.delay,
        admitted: this.pending.admitted, wait: this.pending.wait },
      mounts: [...this.mounts.values()].sort((a, b) => a.process - b.process || a.view.localeCompare(b.view))
        .map(card => ({ process: card.process, ...this.#visible(card) })),
    };
  }
}
