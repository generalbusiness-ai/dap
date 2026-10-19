/** Acknowledgement is structural. A state condition does not prove that a
 * business cycle terminates or establish a traffic/heap bound. */
import { array, record, type GraphCreate, type GraphRow, type GraphSend } from "./model.ts";
import type { PortLink } from "./ports.ts";
import type { PackageFinding } from "./types.ts";

const stateCondition = (guards: unknown): boolean => array(guards).some(value => {
  const guard = record(value);
  return Array.isArray(guard["state"]) && guard["state"].length > 0
    || array(guard["anyOf"]).some(stateCondition)
    || stateCondition(record(guard["each"])["guards"])
    || stateCondition(record(guard["has"])["guards"]);
});

export function cycleFindings(rows: readonly GraphRow[], links: readonly PortLink[], creations: readonly GraphCreate[]): PackageFinding[] {
  const unacknowledged = new Map<GraphRow, GraphRow[]>();
  const add = (send: GraphSend, to: GraphRow) => {
    if (stateCondition(send.row.data["guards"]) || stateCondition(send.data["if"])) return;
    const targets = unacknowledged.get(send.row) ?? [];
    targets.push(to); unacknowledged.set(send.row, targets);
  };
  for (const link of links) {
    add(link.send, link.handler);
    const replacement = rows.find(row => row.owner.id === link.handler.owner.id && row.logical === link.handler.logical && row.path !== row.logical);
    if (replacement) add(link.send, replacement);
  }
  for (const edge of creations) {
    const genesis = rows.find(row => row.owner.id === edge.target && row.family === "acts" && row.name === row.owner.definition.genesis);
    if (genesis) add(edge.send, genesis);
  }
  // Removing acknowledged edges tests every remaining cycle, rather than
  // accepting an SCC because one unrelated edge in it has a state guard.
  const completed = new Set<GraphRow>(), active = new Map<GraphRow, number>();
  for (const start of rows) {
    if (completed.has(start)) continue;
    const stack = [{ row: start, next: 0 }]; active.set(start, 0);
    while (stack.length) {
      const current = stack[stack.length - 1]!, targets = unacknowledged.get(current.row) ?? [];
      const next = targets[current.next++];
      if (!next) { completed.add(current.row); active.delete(current.row); stack.pop(); continue; }
      const position = active.get(next);
      if (position !== undefined) {
        const cycle = stack.slice(position).map(frame => `${frame.row.owner.definition.name}.${frame.row.path}`);
        return [{ definition: next.owner.id, row: next.path, check: "cycle-acknowledgement", reason: "cycle-unacknowledged", severity: "refusal", message: `Declare a state condition on this automatic send/create cycle: ${cycle.join(" -> ")}.` }];
      }
      if (!completed.has(next)) { active.set(next, stack.length); stack.push({ row: next, next: 0 }); }
    }
  }
  return [];
}
