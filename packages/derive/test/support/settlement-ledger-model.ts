/** Literal oracle for two small fixtures. No production imports or forecasts.
 * a owes its act plus a two-entry request; b/state owe one entry each.
 * A one-attempt operation owes first/late outcomes. The long request adds
 * one unheld one-attempt cleanup to the short request's two entries. */
export type Family = "marker" | "works";
export type Result = "unknown" | "confirmed" | "refused";
export type Command =
  | { kind: "open" }
  | { kind: "point"; item: number; target: number }
  | { kind: "mark-target"; item: number; next: number }
  | { kind: "mark-a" | "mark-a-far" | "mark-b" | "note" | "finish" | "settle" | "ask-short" | "ask-long"; item: number }
  | { kind: "outcome"; operation: string; result: Result; spawn?: "step" | "tidy"; report?: boolean }
  | { kind: "reply"; origin: number; result: "applied" | "refused" }
  | { kind: "checkpoint" };
type Job = { state: "open" | "done"; a: boolean; b: boolean; target: number | null };
type Duty = { item: number; kind: "mark" | "state"; slot: string | null; entries: number; requests: number };
type Operation = { id: string; kind: "step" | "tidy" | "audit"; item: number | null; results: Result[] };
type Request = { seq: number; source: string; entries: number; account: number | null; result: "applied" | "refused" | null };
type Holder = { step: number; tidy: number; requests: number };
const terminal = (op: Operation) => ["confirmed", "refused"].includes(op.results.at(-1) ?? "");
const dutyKey = (item: number, slot: string | null) => `${item}:${slot ?? "state"}`;

export class SettlementLedger {
  next = 2; // The existing fixtures have genesis 0 and confirmation 1.
  checkpoint = false;
  jobs = new Map<number, Job>();
  duties = new Map<string, Duty>();
  operations = new Map<string, Operation>();
  requests = new Map<number, Request>();
  holders = new Map<number, Holder>();
  settled = new Set<number>();
  constructor(readonly family: Family, readonly capacity = 256) {}
  #owe(item: number, slot: string | null, entries: number, requests = 0) {
    this.duties.set(dutyKey(item, slot), { item, kind: slot === null ? "state" : "mark", slot, entries, requests });
  }
  #request(seq: number, source: string, entries: number, account: number | null) {
    this.requests.set(seq, { seq, source, entries, account, result: null });
  }
  #operation(seq: number, kind: Operation["kind"], item: number | null) {
    if (item !== null) this.holders.get(item)![kind as "step" | "tidy"]--;
    const id = `${seq}:0`;
    this.operations.set(id, { id, kind, item, results: [] });
  }
  #release() {
    for (const [item, held] of this.holders) if (held.step + held.tidy + held.requests === 0) this.holders.delete(item);
    // The selected settled-holder histories finish their original steps
    // without starting more work. Ordinary final transitions release nothing.
    for (const item of this.settled) {
      const pending = [...this.operations.values()].some(op => op.item === item && !terminal(op))
        || [...this.requests.values()].some(request => request.account === item && request.result === null);
      if (!pending) this.holders.delete(item);
    }
  }
  reservation() {
    let entries = 0, requests = 0;
    for (const duty of this.duties.values()) { entries += duty.entries; requests += duty.requests; }
    for (const held of this.holders.values()) { entries += 2 * (held.step + held.tidy) + 4 * held.requests; requests += held.requests; }
    for (const operation of this.operations.values()) if (!terminal(operation)) entries += operation.results.length ? 1 : 2;
    for (const request of this.requests.values()) if (request.result === null) entries += request.entries;
    return { entries: entries + (this.checkpoint && entries === 0 ? 0 : 1), requests };
  }
  #copy() {
    const copy = new SettlementLedger(this.family, this.capacity);
    copy.next = this.next; copy.checkpoint = this.checkpoint;
    copy.jobs = new Map([...this.jobs].map(([id, job]) => [id, { ...job }]));
    copy.duties = new Map([...this.duties].map(([id, duty]) => [id, { ...duty }]));
    copy.operations = new Map([...this.operations].map(([id, op]) => [id, { ...op, results: [...op.results] }]));
    copy.requests = new Map([...this.requests].map(([id, request]) => [id, { ...request }]));
    copy.holders = new Map([...this.holders].map(([id, held]) => [id, { ...held }]));
    copy.settled = new Set(this.settled);
    return copy;
  }
  apply(command: Command): "written" | "repeat" | "scope-full" {
    const before = this.#copy(), result = this.#apply(command);
    // Exact/one-short capacity histories contain no foreign receipts. Wider
    // generated histories stay below 256 even with retained peer inputs.
    if (this.family === "marker" && result === "written" && this.next + this.reservation().entries > this.capacity) {
      this.next = before.next; this.checkpoint = before.checkpoint; this.jobs = before.jobs; this.duties = before.duties;
      this.operations = before.operations; this.requests = before.requests; this.holders = before.holders; this.settled = before.settled;
      return "scope-full";
    }
    return result;
  }
  #apply(command: Command): "written" | "repeat" {
    if (command.kind === "outcome") {
      const op = this.operations.get(command.operation)!;
      if (terminal(op) || op.results.at(-1) === command.result) return "repeat";
    }
    if (command.kind === "reply" && this.requests.get(command.origin)!.result !== null) return "repeat";
    const seq = this.next++;
    this.checkpoint = command.kind === "checkpoint";
    if (command.kind === "open") {
      this.jobs.set(seq, { state: "open", a: false, b: false, target: null });
      this.#owe(seq, null, 1);
      if (this.family === "marker") { this.#owe(seq, "a", 3, 1); this.#owe(seq, "b", 1); }
      else { this.holders.set(seq, { step: 2, tidy: 1, requests: 1 }); this.#operation(seq, "step", seq); }
    } else if (command.kind === "point") this.jobs.get(command.item)!.target = command.target;
    else if (command.kind === "mark-target") {
      const primary = this.jobs.get(command.item)!, target = primary.target!;
      if (!this.jobs.get(target)!.a) this.duties.delete(dutyKey(target, "a"));
      this.jobs.get(target)!.a = true;
      primary.target = command.next; // Bind target before changing this selector.
    } else if (command.kind === "mark-a" || command.kind === "mark-a-far") {
      const job = this.jobs.get(command.item)!;
      if (!job.a) this.duties.delete(dutyKey(command.item, "a"));
      job.a = true;
      if (command.kind === "mark-a-far") this.#request(seq, "acts.mark-a-far", 2, null);
    } else if (command.kind === "mark-b" || command.kind === "note") {
      const job = this.jobs.get(command.item)!;
      if (command.kind === "mark-b" && !job.b) this.duties.delete(dutyKey(command.item, "b"));
      job.b = true;
    } else if (command.kind === "finish" || command.kind === "settle") {
      this.jobs.get(command.item)!.state = "done";
      if (command.kind === "settle") {
        this.duties.delete(dutyKey(command.item, null));
        if (this.family === "works") this.settled.add(command.item);
      }
    } else if (command.kind === "ask-short" || command.kind === "ask-long") {
      this.#request(seq, `acts.${command.kind}`, command.kind === "ask-short" ? 2 : 4, null);
    } else if (command.kind === "outcome") {
      const op = this.operations.get(command.operation)!;
      op.results.push(command.result);
      if (command.spawn) this.#operation(seq, command.spawn, op.item);
      if (command.report) { this.holders.get(op.item!)!.requests--; this.#request(seq, "outcomes.step", 2, op.item); }
    } else if (command.kind === "reply") {
      const request = this.requests.get(command.origin)!;
      request.result = command.result;
      if (request.source === "acts.ask-long" && command.result === "applied") this.#operation(seq, "audit", null);
    }
    this.#release();
    return "written";
  }
  snapshot() {
    return {
      head: this.next - 1,
      jobs: [...this.jobs].map(([item, job]) => ({ item, state: job.state, ...(this.family === "marker" ? { a: job.a, b: job.b, target: job.target } : {}) })),
      duties: [...this.duties.values()].sort((a, b) => a.item - b.item || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : (a.slot ?? "").localeCompare(b.slot ?? ""))),
      requests: [...this.requests.values()].filter(request => request.result === null).map(({ seq, source, entries, account }) => ({ seq, n: 0, source, entries, requests: 0, account })),
      operations: [...this.operations.values()].map(op => ({ ...op, results: [...op.results] })),
      holders: [...this.holders].map(([item, held]) => ({ item, ...held })),
      settled: [...this.settled],
      reservation: this.reservation(),
    };
  }
}
