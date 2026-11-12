/** Native answers projected for MCP without changing their authority or custody. */
import type { Answer, Archived, FactRef, Head, OutboxId } from "@generalbusiness/dap-contract";
import type { ArchivedSettlement, Phase } from "@generalbusiness/dap-client";
import { archivedAnswer } from "./errors.ts";

export type ActResult = {
  answer: Answer["answer"];
  sentence?: string;
  next?: string;
  scope?: string;
  kind?: string;
  tool?: string;
  fact?: FactRef;
  outboxIds?: readonly OutboxId[];
  reason?: string;
  name?: string;
  judgedAt?: Head;
  retained?: boolean;
  archived?: Archived;
  phase?: Phase;
  effects?: number;
  item?: number;
}
export interface AnswerContext {
  scope?: string;
  kind?: string;
  tool?: string;
  retained?: boolean;
  phase?: Phase;
  item?: number;
  said?: { sentence: string; next: string };
}
/** A settlement without a fact stays distinct from a native Answer. */
export function projectAnswer(input: { answer: Answer } | { archivedSettlement: ArchivedSettlement }, context?: AnswerContext): ActResult {
  const { said, ...at } = context ?? {};
  if ("archivedSettlement" in input) {
    const read = input.archivedSettlement;
    return { answer: "archived", ...at, archived: read.archived, ...(read.fact ? { fact: read.fact } : {}),
      ...(context ? { phase: "archived", retained: true, ...archivedAnswer(read.archived, read.fact) } : {}) };
  }
  const answer = input.answer;
  const base: ActResult = { answer: answer.answer, ...at, ...(said ? {
    sentence: at.retained ? `${said.sentence} This outcome was kept under custody; this call sent nothing.` : said.sentence,
    next: at.retained && answer.answer === "refused" ? `${said.next} To send the same envelope again, deliberately: resubmit: true.` : said.next,
  } : {}) };
  switch (answer.answer) {
    case "archived": return { ...base, archived: answer.archived, fact: answer.fact };
    case "accepted": return { ...base, fact: answer.receipt.fact, outboxIds: answer.receipt.sends, effects: answer.receipt.effects.length };
    case "refused": return { ...base, reason: answer.reason, ...(answer.name ? { name: answer.name } : {}), judgedAt: answer.judgedAt };
    default: return { ...base, reason: answer.reason };
  }
}

/** The key map checks presence; the explicit schemas below constrain each advertised shape. */
type JsonSchema = { type?: string | readonly string[]; enum?: readonly string[]; description?: string; properties?: Record<string, JsonSchema>; required?: readonly string[]; items?: JsonSchema; minimum?: number; maximum?: number; additionalProperties?: boolean };
const answers = { accepted: true, archived: true, refused: true, unavailable: true, mismatch: true } satisfies Record<Answer["answer"], true>;
const phases = { prepared: true, sent: true, unknown: true, accepted: true, archived: true, refused: true, mismatch: true, settled: true } satisfies Record<Phase, true>;
const integer = { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER } satisfies JsonSchema;
const head = { type: "object", properties: { seq: integer, hash: { type: "string" } }, required: ["seq", "hash"] } satisfies JsonSchema;
const properties = {
  answer: { type: "string", enum: Object.keys(answers), description: "The room's Native decision: accepted, archived, refused, unavailable, or mismatch. A lost reply remains a separate custody finding." },
  sentence: { type: "string" }, next: { type: "string" },
  scope: { type: "string" }, kind: { type: "string" }, tool: { type: "string" },
  fact: { type: "object", properties: { at: { type: "object", properties: { scope: { type: "string" }, inc: { type: "string" }, kind: { type: "string" } }, required: ["scope", "inc", "kind"] }, seq: integer, hash: { type: "string" } }, required: ["at", "seq", "hash"] },
  outboxIds: { type: "array", items: { type: "string" } },
  reason: { type: "string" }, name: { type: "string" }, judgedAt: head,
  retained: { type: "boolean", description: "true when this is a terminal outcome kept under custody, and nothing was sent" },
  archived: { type: "object", properties: { floor: integer, commit: { type: "string" }, through: head }, required: ["floor", "commit", "through"] },
  phase: { type: "string", enum: Object.keys(phases), description: "The state of this client's kept request. Acceptance records the request; it does not prove that the installation workflow finished." }, effects: integer, item: integer,
} satisfies Record<keyof ActResult, JsonSchema>;
type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
const required = { answer: true } satisfies Record<RequiredKeys<ActResult>, true>;
/** Inline schema. Key completeness does not prove TypeScript-to-JSON-Schema value equivalence. */
export const ACT_OUTPUT = { type: "object", properties, required: Object.keys(required) };
