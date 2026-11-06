/** Local declaration stand-ins for the M3 clock callers; no host or authority evidence. */
import { PROPOSED_BOUNDS, type DeclaredDefinition, type Guard, type PlatformData, type ReceiveType } from "@generalbusiness/dap-contract";
import { jobs } from "./forms-guards-data.ts";
import { T0 } from "./fixture-identities.ts";
import type { DefinitionCorpusRow } from "./row.ts";

export const CLOCK_CASES = ["plain", "value-time", "effect-if", "effect-unless", "tell-condition", "relate-condition", "attention", "future-clause", "clause-value", "clause-condition", "historical-time"] as const;
export type ClockCase = typeof CLOCK_CASES[number];
const BOARD = "also.board" as const;

export function clockCutoverData(kind: ClockCase, clock = true): DeclaredDefinition {
  const data = structuredClone(jobs);
  data.name = "m3-clock";
  const board = data.items["board"]!;
  board.states["closed"] = { final: true };
  board.values["due"] = { fixed: false, required: false, of: { type: "time" } };
  board.values["text"] = { fixed: false, required: false, of: { type: "text", max: 40 } };
  board.refs["peer"] = { fixed: false, required: false, to: { type: "scope", kind: "lane" } };
  data.acts["connect"] = { step: "transition", on: "board", grant: "connect", also: {}, fields: { peer: { type: "scope", kind: "lane", required: true } },
    guards: [{ state: ["open"] }], effects: [{ ref: { slot: "peer", from: { field: "peer" } } }], sends: [], attention: [] };
  const time: Guard = clock ? { of: BOARD, before: { slot: "due" } } : { of: BOARD, unset: "due" };
  const omitted: readonly Guard[] = [{ of: BOARD, state: ["closed"] }, time];
  const now = clock ? { time: { plusSeconds: 1 } } as const : { const: T0 } as const;
  const body: ReceiveType = { class: "tell", message: "clock", from: { kind: "lane" }, opens: null, fields: {},
    also: { board: { item: "board", one: true } }, guards: [], effects: [], sends: [], attention: [] };
  if (kind === "value-time") body.effects = [{ of: BOARD, value: { slot: "due", from: now } }];
  if (kind === "effect-if") body.effects = [{ of: BOARD, value: { slot: "text", from: { const: "kept" } }, if: omitted }];
  if (kind === "effect-unless") body.effects = [{ of: BOARD, value: { slot: "text", from: { const: "kept" } }, unless: [{ anyOf: [[{ of: BOARD, state: ["open"] }], [time]] }] }];
  if (kind === "tell-condition") body.sends = [{ tell: { to: { slot: "peer", of: BOARD }, message: "later", fields: {}, if: omitted, result: {} } }];
  if (kind === "relate-condition") body.sends = [{ relate: { to: { slot: "peer", of: BOARD }, item: { item: BOARD }, name: "mirrors", state: "set", detail: {}, if: omitted, result: {} } }];
  if (kind === "attention") body.attention = [{ notify: { of: BOARD, slot: "owner", when: "before", reason: "check", if: omitted } }];
  if (kind === "future-clause" || kind === "clause-value" || kind === "clause-condition") body.sends = [{ tell: {
    to: { slot: "peer", of: BOARD }, message: "later", fields: {}, result: { applied: kind === "clause-condition"
      ? [{ of: BOARD, value: { slot: "text", from: { const: "kept" } }, if: omitted }]
      : [{ of: BOARD, value: { slot: "due", from: now } }] },
  } }];
  if (kind === "historical-time") body.effects = [{ of: BOARD, value: { slot: "due", from: { source: "time" } } }];
  data.receives["clock"] = body;
  return data;
}

export function nativeClockCutoverData(): PlatformData {
  const data = clockCutoverData("plain") as unknown as PlatformData;
  data.name = "platform:m3-clock";
  data.outcomes = {};
  data.receives["clock"]!.fields["note"] = { type: "code", code: "clock-value", row: "M3", required: false };
  return data;
}

export const clockCutoverDefinitions: readonly DefinitionCorpusRow[] = [
  ...CLOCK_CASES.flatMap(kind => [false, true].map(clock => ({ name: `M3 clock cutover/${kind}/${clock ? "clock" : "no-clock"}`,
    origins: ["packages/derive/test/definition-corpus/clock-cutover-data.ts#clockCutoverData"], declaration: () => clockCutoverData(kind, clock), bounds: PROPOSED_BOUNDS }))),
  { name: "M3 clock cutover/native optional type", origins: ["packages/derive/test/definition-corpus/clock-cutover-data.ts#nativeClockCutoverData"],
    declaration: nativeClockCutoverData, bounds: PROPOSED_BOUNDS, options: { platform: true } },
];
