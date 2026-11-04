/** Display captured values from one evaluation. Never rerun a guard to explain it. */
import type { Evaluation } from "./evaluate.ts";
import type { Program } from "./model.ts";

export interface Explanation { text: string; sourcePath: string | null; values: Readonly<Record<string, unknown>>; opaque: boolean; incomplete: boolean }
export function explain(program: Program, evaluation: Evaluation): Explanation {
  const { ran } = evaluation;
  if (ran.result !== "refused") return { text: ran.result === "ran" ? "The body ran." : `The body is unavailable: ${ran.reason}.`, sourcePath: null, values: {}, opaque: false, incomplete: evaluation.truncated };
  const index = /^guards\.(\d+)$/.exec(ran.detail), guard = index ? program.guards.guards[Number(index[1])] : undefined;
  const path = guard && guard.op !== "all" ? guard.metadata.path : null;
  const event = path ? evaluation.trace.find(event => event.path === path && event.result === "fail") : undefined;
  if (!event) return { text: `${ran.reason}: ${ran.detail}. Captured values are unavailable.`, sourcePath: path, values: {}, opaque: false, incomplete: true };
  const values = event.reads ?? {}, opaque = values["opaque"] === true;
  const details = Object.entries(values).filter(([name]) => name !== "input" && name !== "opaque").map(([name, value]) => `${name}=${JSON.stringify(value)}`).join(", ");
  return { text: `${path}: ${event.op} failed (${details}).${opaque ? " The prepared rule body is opaque." : ""}`, sourcePath: path, values, opaque, incomplete: false };
}
