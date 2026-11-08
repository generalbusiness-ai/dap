/** Observe actual opaque calls without choosing a body or inspecting callback code. */
import type { Mark } from "@generalbusiness/dap-contract";
import type { MarkKind } from "../validate/context.ts";
import type { ValidDefinition } from "../validate/index.ts";
import { nativeBoundaryOfMark, nativeValidation } from "./native.ts";
import { captureProgramReads, programObserved, recordProgramLeaf } from "./observe.ts";

export type OutcomeHook = "reservation" | "values" | "ready" | "beforeSend" | "publicationOrigin" | "retries" | "holds" | "wellFormed" | "unknown" | "derives" | "origin" | "subjects";
export type NativeHook = "run" | "bind" | OutcomeHook;
export interface NativeTraceEvent {
  readonly ordinal: number;
  readonly kind: MarkKind;
  readonly code: string;
  readonly row: string;
  readonly hook: NativeHook;
  readonly context: string;
  readonly sourcePath: string | null;
  readonly result: "returned" | "threw";
  readonly opaque: true;
  readonly dependencies: "unknown";
}
export interface NativeObservation<T> {
  readonly value: T;
  readonly trace: readonly NativeTraceEvent[];
  readonly truncated: boolean;
  readonly calls: Readonly<Record<string, number>>;
}
type PendingEvent = Omit<NativeTraceEvent, "result"> & { result: NativeTraceEvent["result"] | null };
interface Observer { readonly budget: number; readonly events: PendingEvent[]; readonly calls: Map<string, number>; ordinal: number; truncated: boolean }
// This scoped registry serves observation only. Admission and dispatch never read it.
const active = new WeakMap<ValidDefinition, readonly Observer[]>();
const context = (kind: MarkKind, hook: NativeHook): string => {
  if (kind === "type") return "RuleGiven, value, field-or-slot";
  if (kind === "also") return hook === "bind" ? "indexed items, fields" : "RuleGiven, item type";
  if (kind !== "outcome") return "RuleGiven";
  switch (hook) {
    case "reservation": return "ValidDefinition";
    case "values": return "Evidence";
    case "ready": return "StateView, operation, attempt";
    case "beforeSend": case "unknown": return "StateView, operation, attempt, Own";
    case "publicationOrigin": return "StateView, operation, Own";
    case "retries": return "result, operation, RuleGiven";
    case "holds": case "origin": return "RuleGiven, operation";
    case "wellFormed": return "result, evidence, RuleGiven";
    case "derives": return "RuleGiven, operation, selected";
    case "subjects": return "RuleGiven, operation, row, FirstStep";
    case "run": case "bind": return "opaque";
  }
};

/** Scope an observer to one synchronous public judgment. Its returned value stays untouched. */
export function observeNativeCalls<T>(definition: ValidDefinition, budget: number, judge: () => T): NativeObservation<T> {
  if (!nativeValidation(definition)) throw new TypeError("Native trace has no admitted definition");
  const observer: Observer = { budget: Math.max(0, budget), events: [], calls: new Map(), ordinal: 0, truncated: false };
  const previous = active.get(definition) ?? [];
  active.set(definition, [...previous, observer]);
  try {
    const value = judge();
    const trace = Object.freeze(observer.events.map(event => {
      if (event.result === null) throw new TypeError("unfinished synchronous Native call");
      return Object.freeze({ ...event, result: event.result });
    }));
    return Object.freeze({ value, trace, truncated: observer.truncated, calls: Object.freeze(Object.fromEntries(observer.calls)) });
  } finally {
    if (previous.length) active.set(definition, previous); else active.delete(definition);
  }
}

/** The caller resolves arguments first, then invokes its existing callback exactly once. */
export function observeNativeCall<T>(definition: ValidDefinition, mark: Mark, kind: MarkKind, hook: NativeHook, callback: unknown, call: () => T): T {
  const observers = active.get(definition);
  if ((!observers?.length && !programObserved(definition)) || typeof callback !== "function") return call();
  const boundary = nativeBoundaryOfMark(definition, mark, kind);
  // Trusted returned joins use synthetic marks and do not count as admitted hooks.
  if (!boundary || boundary.kind !== kind) return call();
  const pending = (observers ?? []).map(observer => {
    const key = `${kind}/${mark.code}/${hook}`;
    observer.calls.set(key, (observer.calls.get(key) ?? 0) + 1);
    const ordinal = observer.ordinal++;
    if (!(observer.events.length < observer.budget)) { observer.truncated = true; return null; }
    const event: PendingEvent = { ordinal, kind, code: mark.code, row: mark.row, hook, context: context(kind, hook),
      sourcePath: boundary.body === null ? null : boundary.path, result: null, opaque: true, dependencies: "unknown" };
    observer.events.push(event); return event;
  });
  let returned = false;
  try { const value = call(); returned = true; return value; }
  finally {
    for (const event of pending) if (event) event.result = returned ? "returned" : "threw";
    captureProgramReads(definition, { opaque: true, dependencies: "unknown", code: mark.code, row: mark.row, hook });
    recordProgramLeaf(definition, "native", boundary.path, `${kind}.${hook}`, returned ? "returned" : "threw", { opaque: true, dependencies: "unknown", code: mark.code, row: mark.row });
  }
}
