/** Evaluate the admitted body once and explain only what that traversal captured. */
import type { Digest } from "@generalbusiness/dap-contract";
import type { Judging, RuleInput } from "../guards.ts";
import { executeBody, type BodyOptions, type Ran } from "./body.ts";
import type { Explanation } from "./reports.ts";
import { observeProgram, type Primitive, type ProgramEvent } from "./observe.ts";
import { checkedBody, type BodyStructure } from "./structure.ts";

export interface AdmittedEvaluation {
  readonly ran: Ran;
  readonly asked: readonly RuleInput[];
  readonly trace: readonly ProgramEvent[];
  readonly truncated: boolean;
  readonly primitives: Readonly<Record<Primitive, number>>;
}
const owners = new WeakMap<AdmittedEvaluation, BodyStructure>();

/** The same runner serves every body family. Observation does not select another engine. */
export function evaluateAdmitted(body: BodyStructure, input: Judging, cause: Digest, options: BodyOptions = {}, traceBudget?: number): AdmittedEvaluation {
  checkedBody(input.definition, body);
  const j: Judging = { ...input, used: [], ...(input.asked === undefined ? {} : { asked: [] }), ran: { clock: input.ran?.clock === true },
    ...(input.declined ? { declined: new Map(input.declined) } : {}), ...(input.coded ? { coded: new Map(input.coded) } : {}) };
  const observed = observeProgram(input.definition, traceBudget, () => executeBody(j, body, cause, options));
  const evaluation: AdmittedEvaluation = Object.freeze({ ran: observed.value, asked: Object.freeze([...(j.asked ?? [])]), trace: observed.trace,
    truncated: observed.truncated, primitives: observed.primitives });
  owners.set(evaluation, body);
  return evaluation;
}

/** Diagnostic paths label captured events. They never select execution or establish ownership. */
export function explainAdmitted(body: BodyStructure, evaluation: AdmittedEvaluation): Explanation {
  if (owners.get(evaluation) !== body) throw new TypeError("evaluation belongs to another admitted body");
  const { ran } = evaluation;
  if (ran.result !== "refused") return { text: ran.result === "ran" ? "The body ran." : `The body is unavailable: ${ran.reason}.`, sourcePath: null, values: {}, opaque: false, incomplete: evaluation.truncated };
  const guard = /^guards\.(\d+)$/.exec(ran.detail);
  const other = /^(effects|sends)\.(\d+)(?::|$)/.exec(ran.detail);
  const node = guard ? body.nodes.filter(node => node.category === "guard")[Number(guard[1])]
    : other ? body.nodes.filter(node => node.category === (other[1] === "effects" ? "effect" : "send"))[Number(other[2])] : undefined;
  const path = node?.path ?? null;
  const event = node ? evaluation.trace.find(event => event.body === body && event.node === node
    && (guard ? event.primitive === "guards" && event.result === "fail" : event.primitive === "effects" || event.primitive === "sends")) : undefined;
  if (!event) return { text: `${ran.reason}: ${ran.detail}. Captured values are unavailable.`, sourcePath: path, values: {}, opaque: false, incomplete: true };
  const values = event.reads ?? Object.fromEntries(evaluation.trace.filter(child => child.parent === event.ordinal && child.primitive === "expressions").map(child => [child.path, child.result]));
  const opaque = values["opaque"] === true;
  const details = Object.entries(values).filter(([name]) => name !== "input" && name !== "opaque").map(([name, value]) => `${name}=${JSON.stringify(value)}`).join(", ");
  return { text: `${path}: ${event.op} ${guard ? "failed" : `refused (${ran.reason})`} (${details}).${opaque ? " The prepared rule body is opaque." : ""}`, sourcePath: path, values, opaque, incomplete: evaluation.truncated };
}
