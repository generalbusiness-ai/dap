/** Observe one synchronous traversal. Dispatch and admission never consult this registry. */
import type { ValidDefinition } from "../validate/index.ts";
import { immutable } from "./data.ts";
import { structureOf, type BodyStructure, type StructureNode } from "./structure.ts";

export type Primitive = "expressions" | "guards" | "effects" | "sends" | "prepared" | "scans" | "native";
export interface ProgramEvent {
  readonly ordinal: number;
  readonly parent: number | null;
  readonly primitive: Primitive;
  readonly body: BodyStructure | null;
  readonly node: StructureNode | null;
  readonly path: string;
  readonly op: string;
  readonly result: unknown;
  readonly reads?: Readonly<Record<string, unknown>>;
}
export interface ProgramObservation<T> {
  readonly value: T;
  readonly trace: readonly ProgramEvent[];
  readonly truncated: boolean;
  readonly primitives: Readonly<Record<Primitive, number>>;
}
interface Pending {
  readonly ordinal: number;
  readonly parent: number | null;
  readonly primitive: Primitive;
  readonly retained: boolean;
  readonly body: BodyStructure | null;
  readonly node: StructureNode | null;
  readonly path: string;
  readonly op: string;
  result: unknown;
  reads?: Record<string, unknown>;
}
interface Observer {
  readonly budget: number | undefined;
  readonly events: Pending[];
  readonly stack: Pending[];
  readonly primitives: Record<Primitive, number>;
  ordinal: number;
  truncated: boolean;
}
const active = new WeakMap<ValidDefinition, readonly Observer[]>();
export const programObserved = (definition: ValidDefinition): boolean => (active.get(definition)?.length ?? 0) > 0;

/** Undefined disables retained events; counts still describe the same traversal. */
export function observeProgram<T>(definition: ValidDefinition, budget: number | undefined, call: () => T): ProgramObservation<T> {
  if (!structureOf(definition)) throw new TypeError("program observation has no admitted definition");
  const observer: Observer = { budget: budget === undefined ? undefined : Number.isFinite(budget) ? Math.max(0, Math.floor(budget)) : 0,
    events: [], stack: [], primitives: { expressions: 0, guards: 0, effects: 0, sends: 0, prepared: 0, scans: 0, native: 0 }, ordinal: 0, truncated: false };
  const previous = active.get(definition) ?? [];
  active.set(definition, [...previous, observer]);
  try {
    const value = call();
    if (observer.stack.length) throw new TypeError("unfinished synchronous program observation");
    return Object.freeze({ value, trace: Object.freeze(observer.events.map(({ retained: _retained, ...event }) => Object.freeze({ ...event, ...(event.reads ? { reads: Object.freeze(event.reads) } : {}) }))),
      truncated: observer.truncated, primitives: Object.freeze(observer.primitives) });
  } finally {
    if (previous.length) active.set(definition, previous); else active.delete(definition);
  }
}
function copy(observer: Observer, value: unknown): unknown {
  // An opaque value that cannot be retained never changes the traversal's result.
  try { return immutable(value); }
  catch { observer.truncated = true; return "[value could not be retained]"; }
}
function begin(observer: Observer, primitive: Primitive, body: BodyStructure | null, node: StructureNode | null, path: string, op: string): Pending {
  observer.primitives[primitive]++;
  const retained = observer.budget !== undefined && observer.events.length < observer.budget;
  const event: Pending = { ordinal: observer.ordinal++, parent: observer.stack.at(-1)?.ordinal ?? null, primitive, retained, body, node, path, op, result: "entered" };
  if (observer.budget !== undefined) {
    if (retained) observer.events.push(event);
    else observer.truncated = true;
  }
  return event;
}

/** Call the existing primitive once. The observer only keeps its returned result and captured reads. */
export function observeInstruction<T>(definition: ValidDefinition, primitive: Primitive, body: BodyStructure | null, node: StructureNode | null, path: string, op: string, call: () => T): T {
  const observers = active.get(definition);
  if (!observers?.length) return call();
  const events = observers.map(observer => {
    const parent = observer.stack.at(-1);
    const event = begin(observer, primitive, body ?? parent?.body ?? null, node ?? parent?.node ?? null, path, op); observer.stack.push(event); return event;
  });
  let returned = false;
  try {
    const value = call(); returned = true;
    observers.forEach((observer, index) => {
      const event = events[index]!;
      // No value capture or opaque-object walk when events are disabled or exhausted.
      event.result = event.retained ? copy(observer, value) : "returned";
    });
    return value;
  } finally {
    observers.forEach((observer, index) => {
      const event = events[index]!;
      if (!returned) event.result = "threw";
      if (observer.stack.pop() !== event) throw new TypeError("program observation scopes are out of order");
    });
  }
}

/** A loop can retain its own return/continue behavior and close this scope in finally. */
export function enterProgramInstruction(definition: ValidDefinition, primitive: Primitive, body: BodyStructure | null, node: StructureNode | null, path: string, op: string): () => void {
  const observers = active.get(definition);
  if (!observers?.length) return () => {};
  const events = observers.map(observer => {
    const event = begin(observer, primitive, body, node, path, op); event.result = "visited"; observer.stack.push(event); return event;
  });
  return () => observers.forEach((observer, index) => {
    if (observer.stack.pop() !== events[index]) throw new TypeError("program observation scopes are out of order");
  });
}

/** Retain values at the point that the existing primitive reads them. */
export function captureProgramReads(definition: ValidDefinition, reads: Readonly<Record<string, unknown>>): void {
  for (const observer of active.get(definition) ?? []) {
    const event = observer.stack.at(-1);
    if (event?.retained) event.reads = { ...event.reads, ...copy(observer, reads) as Record<string, unknown> };
  }
}

/** A completed leaf whose result already exists does not need another invocation. */
export function recordProgramLeaf(definition: ValidDefinition, primitive: Primitive, path: string, op: string, result: unknown, reads?: Readonly<Record<string, unknown>>): void {
  for (const observer of active.get(definition) ?? []) {
    const parent = observer.stack.at(-1), event = begin(observer, primitive, parent?.body ?? null, parent?.node ?? null, path, op);
    if (event.retained) {
      event.result = copy(observer, result);
      if (reads) event.reads = copy(observer, reads) as Record<string, unknown>;
    }
  }
}
