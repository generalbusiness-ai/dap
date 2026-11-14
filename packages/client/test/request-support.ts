/** The real in-memory judge and fold behind a scripted transport, with independent scope and client clocks. */
import type { Answer, Beside, Grant, SignedIntent } from "@generalbusiness/dap-contract";
import { intentDigest, textDigest, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { Scope, keys } from "@generalbusiness/dap-derive/testing";
import { DeclaredHandle } from "../src/declared.ts";
import { secretSigner } from "../src/intent.ts";
import type { ClientClock } from "../src/request-schedule.ts";
import { Feed, citing, citingDefinition, served } from "./replica-support.ts";

export function requestScene() {
  const scope = new Scope(citingDefinition);
  let now = Date.parse(scope.now), timerId = 0;
  const timers = new Map<number, { at: number; run(): void }>();
  const clock: ClientClock = { now: () => now, set(run, delay) { const id = timerId++; timers.set(id, { at: now + delay, run }); return id; },
    clear(id) { timers.delete(id as number); } };
  let mode: "answer" | "hold" | "lost" | "unavailable" | "refused" | "protocol" | "protocol-recorded" = "answer", signs = 0;
  const held: { signed: SignedIntent; beside: Beside }[] = [], copies: SignedIntent[] = [];
  const actor = keys.rita;
  const actual = secretSigner(actor.secret);
  let signerFailure = false;
  let inspectCopy: ((signed: SignedIntent) => Promise<void>) | null = null;
  const signer = { key: actor.key, sign: async (bytes: Uint8Array) => {
    if (signerFailure) throw new Error("scripted signer failure");
    signs++; return actual.sign(bytes);
  } };
  const apply = (signed: SignedIntent, beside: Beside): Answer => {
    const texts = new Map((beside.texts ?? []).map(text => [textDigest(text), utf8(text).length]));
    const result = scope.submit(signed, { texts: digest => texts.get(digest) });
    switch (result.result) {
      case "write": case "accepted-before": {
        const seq = result.result === "write" ? scope.head.seq : result.seq;
        const { entry } = scope.entries[seq]!;
        if (!("genesis" in entry)) throw new Error("an accepted request cannot name the genesis");
        return { answer: "accepted", receipt: { fact: scope.fact(seq), definition: scope.definition.digest,
          intent: intentDigest(signed.intent), effects: entry.effects, sends: entry.sends.map(send => `${seq}.${send.n}` as const), epoch: entry.epoch } };
      }
      case "refused": return { answer: "refused", reason: result.reason, ...(result.name === undefined ? {} : { name: result.name }), judgedAt: scope.head };
      case "mismatch": return { answer: "mismatch", reason: "idempotency-mismatch" };
      default: return { answer: "unavailable", reason: "unavailable" };
    }
  };
  const base = served(scope, citing);
  const transport = new Proxy(base.handle.scope, { get(target, name) {
    if (name === "submit") return async (signed: SignedIntent, _grants: readonly Grant[], beside: Beside = {}): Promise<Answer> => {
      copies.push(signed);
      await inspectCopy?.(signed);
      if (mode === "hold") { held.push({ signed, beside }); return new Promise<Answer>(() => {}); }
      if (mode === "protocol" || mode === "protocol-recorded") {
        if (mode === "protocol-recorded") apply(signed, beside);
        return { answer: "refused", reason: "unknown-act", judgedAt: scope.head };
      }
      if (mode === "refused") { held.push({ signed, beside }); return { answer: "refused", reason: "guard-failed", judgedAt: scope.head }; }
      if (mode === "unavailable") return { answer: "unavailable", reason: "unavailable" };
      const answer = apply(signed, beside);
      if (mode === "lost") throw new Error("scripted lost reply");
      return answer;
    };
    const value = Reflect.get(target, name, target) as unknown;
    return typeof value === "function" ? value.bind(target) : value;
  } });
  const handle = new DeclaredHandle(transport, scope.at, citing, scope.definition.digest), feed = new Feed();
  const advance = (ms: number) => {
    now += ms;
    for (;;) {
      const due = [...timers].find(([, timer]) => timer.at <= now);
      if (!due) break;
      timers.delete(due[0]); due[1].run();
    }
  };
  return { scope, handle, feed, actor, signer, clock, timers, copies, held, serving: base.serving,
    inspectCopies: (inspect: (signed: SignedIntent) => Promise<void>) => { inspectCopy = inspect; },
    signs: () => signs, now: () => now, advance,
    scopeAdvance: (ms: number) => { scope.now = timeOf(Date.parse(scope.now) + ms); },
    mode: (next: typeof mode) => { mode = next; }, failSigner: (fail: boolean) => { signerFailure = fail; },
    deliverHeld: () => { const copy = held.shift(); return copy ? apply(copy.signed, copy.beside) : null; },
  };
}
