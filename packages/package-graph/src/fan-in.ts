/** Lifetime proofs. A live maximum is never treated as a lifetime bound
 * merely because it exists, and arithmetic does not round large products. */
import type { Digest } from "@generalbusiness/dap-contract";
import type { PackageGraphDefinition } from "./types.ts";
import { array, countOf, finalStates, own, record, subjectType, type GraphCreate, type GraphSend, type GraphWriter } from "./model.ts";

export function successfulCreationBound(edge: GraphCreate, writers: readonly GraphWriter[]): bigint | null {
  const { row } = edge.send, type = row.primary;
  if (!row.opens || !type) return null;
  const item = record(own(record(row.owner.definition.items), type)), maximum = countOf(item["max"]);
  if (maximum === null) return null;
  // A singleton handler reuses its existing primary item on later messages;
  // unlike an open act, an invocation need not open a new backing slot.
  if (row.family === "receives" && item["many"] !== true) return null;
  const final = finalStates(row.owner, type);
  if (final.size === 0) return maximum;
  if (typeof item["initial"] === "string" && final.has(item["initial"])) return null;
  for (const effect of array(record(edge.send.data["result"])["refused"])) {
    const of = record(effect)["of"];
    if (of !== undefined && of !== "on") return null;
  }
  for (const writer of writers) {
    if (writer.row.owner.id !== row.owner.id) continue;
    const target = subjectType(writer.row, writer.data["of"]);
    if (writer.clause?.send === edge.send && writer.clause.outcome === "conflict") {
      if (typeof writer.data["state"] === "string" && target && finalStates(row.owner, target).has(writer.data["state"])) return null;
    }
    if (target !== type) continue;
    if (Object.hasOwn(writer.data, "hold")) return null; // its managed state is not a written state proof
    if (typeof writer.data["state"] !== "string" || !final.has(writer.data["state"])) continue;
    if (writer.clause?.send !== edge.send || writer.clause.outcome !== "refused" || writer.data["of"] !== undefined && writer.data["of"] !== "on") return null;
  }
  return maximum;
}

export function instanceBounds(entry: Digest, definitions: readonly PackageGraphDefinition[], creations: readonly GraphCreate[], writers: readonly GraphWriter[]): ReadonlyMap<Digest, bigint | null> {
  const incoming = new Map<Digest, GraphCreate[]>();
  for (const edge of creations) incoming.set(edge.target, [...incoming.get(edge.target) ?? [], edge]);
  const done = new Map<Digest, bigint | null>(), open = new Set<Digest>();
  const bound = (id: Digest): bigint | null => {
    if (done.has(id)) return done.get(id)!;
    if (open.has(id)) return null;
    const producers = incoming.get(id) ?? [];
    // Root=one applies only when its definition cannot be created again.
    if (id === entry) { const result = producers.length === 0 ? 1n : null; done.set(id, result); return result; }
    if (producers.length !== 1) { done.set(id, null); return null; }
    open.add(id);
    const edge = producers[0]!, parent = bound(edge.send.row.owner.id), slots = successfulCreationBound(edge, writers);
    open.delete(id);
    const result = parent === null || slots === null ? null : parent * slots;
    done.set(id, result); return result;
  };
  for (const definition of definitions) bound(definition.id);
  return done;
}

export function relateKeyBound(send: GraphSend): bigint | null {
  if (send.kind !== "relate") return null;
  const item = send.data["item"];
  const type = item === "self" && send.row.opens ? send.row.primary : subjectType(send.row, record(item)["item"] ?? null);
  if (!type || finalStates(send.row.owner, type).size !== 0) return null;
  return countOf(record(own(record(send.row.owner.definition.items), type))["max"]);
}
