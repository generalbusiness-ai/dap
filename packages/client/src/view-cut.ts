/** A private, immutable recorded cut for one published client view. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import type { StateView, ValidDefinition } from "@generalbusiness/dap-derive";
import { copyActState } from "./act-state.ts";
import { seamOf, type Replica } from "./replica.ts";
import { HeldEntries } from "./replica-own.ts";

/** Return null unless the state, held journal and published head name one cut. */
export function viewCut<D extends DeclaredDefinition>(replica: Replica<D>, definition: ValidDefinition) {
  const published = replica.view;
  if (published.state.is !== "current" || !published.head) return null;
  const seam = seamOf(replica as unknown as Replica<DeclaredDefinition>), base = seam.state(), scope = base.scope(), held = seam.held;
  if (seam.reading() || !scope || !held.head || canonicalize(scope.head) !== canonicalize(published.head)
    || canonicalize(held.head) !== canonicalize(published.head) || held.size !== published.head.seq + 1) return null;
  const entries = new HeldEntries(held.entryBytes), hashes = new Map<number, ReturnType<StateView["fixedHash"]>>();
  for (let seq = 0; seq < held.size; seq++) {
    const entry = held.at(seq);
    if (!entry) return null;
    const copy = structuredClone(entry);
    entries.put(copy, canonicalize(copy.entry));
    hashes.set(seq, base.fixedHash(seq));
  }
  const snapshot = structuredClone(base.all());
  // copyActState must not retain mutable objects or hash readers from the live state.
  const stable = new Proxy<StateView>(base, { get: (target, name) => {
    if (name === "all") return () => structuredClone(snapshot);
    if (name === "fixedHash") return (seq: number) => hashes.get(seq) ?? null;
    if (name === "heldEntryCount") return () => entries.size;
    const value: unknown = Reflect.get(target, name, target);
    return typeof value === "function" ? value.bind(target) : value;
  } });
  const state = copyActState(stable, definition).view;
  return { head: structuredClone(published.head), state, own: entries.own, take: () => entries.take() };
}
