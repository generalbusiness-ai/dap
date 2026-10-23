/** Raw positive hold variants and original option matrices; no eager validation. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalBytes, parseStrictBytes } from "@generalbusiness/dap-bytes";
import { PROFILES, type ValidateOptions } from "../../src/validate/index.ts";
import { works, chain } from "./holds-data.ts";
import type { DefinitionCorpusRow } from "./row.ts";
export const holdsChanges = {
  loose: (d: any) => { d.outcomes.loose = { code: "loose", row: "P16" }; },
  receiverBegin: (d: any) => { d.receives.start.opens = null; d.receives.start.effects = [{ code: "begin", row: "P16", most: { effects: 2, opens: "job" } }]; },
  chainNoChild: (d: any) => { d.outcomes.k.most.operations = []; },
  mixed: (d: any) => { d.items.job.holds.operations.h = 1; d.outcomes.k.most.operations = ["u", "h"]; d.outcomes.h = { code: "u", row: "P16", attempts: 1 }; },
  note: (d: any) => { d.items.note = { ...d.items.job, holds: undefined }; delete d.items.note.holds; d.items.job.holds.items = 1; d.outcomes.step.most = { effects: 2, operations: ["step", "tidy"], opens: "note" }; },
  clauseTidy: (d: any) => { d.outcomes.step.send.result = { applied: [{ code: "after", row: "P16", most: { effects: 0, operations: ["tidy"] } }] }; },
  noHolder: (d: any) => { delete d.items.job.holds; delete d.acts.again.adds; d.outcomes.step.most.operations = []; },
  wChild: (d: any) => { d.outcomes.w = { code: "u", row: "P16", attempts: 1, send: { code: "report", row: "P16", result: {} } }; d.outcomes.k.most.operations = ["u", "w"]; },
};

export const holdsStartedChange = (most: { effects: number; opens?: string }) => (data: any) => {
  data.items.note = structuredClone(data.items.job);
  delete data.items.note.holds;
  data.items.other = structuredClone(data.items.note);
  data.items.job.values.deadline = { fixed: false, required: false, of: { type: "time" } };
  data.timed.expire = { on: "job", states: ["open"], deadline: "deadline", effects: [{ state: "done" }], attention: [] };
  data.items.job.holds.items = 1;
  data.outcomes.step.most = { ...most, operations: ["step", "tidy"] };
};

export const holdsSettlingChange = (operations: string[]) => (d: any) => { d.acts.finish.settles = { of: "on", in: ["open"] }; d.acts.finish.effects.push({ code: "after", row: "P16", most: { effects: 0, operations } }); };

export const holdsSendChange = (once: boolean) => (d: any) => { d.outcomes.w = { code: "u", row: "P16", attempts: 2, send: { code: "report", row: "P16", result: {}, ...(once ? { once: true } : {}) } }; };

export function namedKind(name: string) {
  const data = structuredClone(works);
  data.outcomes = Object.fromEntries([[name, { ...data.outcomes["step"]!, most: { effects: 0, operations: [name, "tidy"] } }], ["tidy", data.outcomes["tidy"]!]]);
  data.items["job"]!.holds = { operations: Object.fromEntries([[name, 2], ["tidy", 1]]), requests: 1 };
  data.acts["again"]!.adds = { operations: Object.fromEntries([[name, 1]]) };
  return parseStrictBytes(canonicalBytes(data)) as typeof works;
}

export function holdsClauseData(clause: "applied" | "refused" | "superseded", effects: "missing" | "empty" | "invalid", retains = true) {
  const data = structuredClone(works);
  data.items["job"]!.refs["peer"] = { fixed: false, required: false, to: { type: "scope", kind: "lane" } };
  data.acts["again"]!.adds = { operations: { step: 1 }, requests: 1 };
  data.acts["again"]!.sends = [{ tell: {
    to: { slot: "peer" }, message: "observe", fields: {},
    result: effects === "missing" ? {} : { [clause]: effects === "empty" ? [] : "not a list" },
    observes: { [clause]: [{ of: "rules", window: 10, use: "once", without: "wait", retains: retains ? [{ domain: "clause-value-1", max: 321 }] : [] }] },
  } } as unknown as typeof data.acts[string]["sends"][number]];
  return data;
}

export const holdsEvidenceOptions: ValidateOptions = { platform: true, outcomeValues: { k: [{ domain: "changes-1", max: 262144 }], u: [{ domain: "other-1", max: 64 }] } };
const changed = (base: typeof works, change: (d: any) => void) => { const data = structuredClone(base); change(data); return data; };
const row = (name: string, declaration: () => unknown, origin: string): DefinitionCorpusRow => ({
 name: `derive/forms-holds/${name}`, origins: [`packages/derive/test/forms-holds.test.ts#${origin}`], declaration,
 bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true },
});
export const holdsVariantDefinitions: readonly DefinitionCorpusRow[] = [
  row("base-works", () => structuredClone(works), "worksDefinition shared direct validations"),
  row("base-chain", () => structuredClone(chain), "chainDefinition shared direct validations"),
  row("loose", () => changed(works, holdsChanges.loose), "legacy loose outcome"),
  row("receiverBegin", () => changed(works, holdsChanges.receiverBegin), "receiver mark opening"),
  row("chainNoChild", () => changed(chain, holdsChanges.chainNoChild), "held chain without child"),
  row("mixed", () => changed(chain, holdsChanges.mixed), "mixed held and unheld graph"),
  row("note", () => changed(works, holdsChanges.note), "outcome ordinary item opening"),
  row("clauseTidy", () => changed(works, holdsChanges.clauseTidy), "holder pending clause"),
  row("noHolder", () => changed(works, holdsChanges.noHolder), "no folded holder"),
  row("wChild", () => changed(chain, holdsChanges.wChild), "unheld kind with request"),
  ...[{ effects: 0 }, { effects: 1 }, { effects: 0, opens: "note" }, { effects: 1, opens: "note" }].map(most => row(`started-${most.effects}-${most.opens ?? "none"}`, () => changed(works, holdsStartedChange(most)), `actual outcome most/${most.effects}/${most.opens ?? "none"}`)),
  row("settling-held", () => changed(chain, holdsSettlingChange(["k"])), "settling mark operations/k"),
  ...[false, true].map(once => row(`request-once-${once}`, () => changed(chain, holdsSendChange(once)), `outcome request once/${once}`)),
  { name: "derive/forms-holds/evidence-domains", origins: ["packages/derive/test/forms-holds.test.ts#counted evidence value domains"], declaration: () => structuredClone(chain), bounds: PROPOSED_BOUNDS, options: holdsEvidenceOptions },
  ...["__proto__", "constructor", "toString"].flatMap(name => [
    { label: "omitted", options: { platform: true } },
    { label: "empty-adapter", options: { platform: true, outcomeValues: {} } },
    { label: "own-empty", options: { platform: true, outcomeValues: Object.fromEntries([[name, []]]) } },
  ].map(({ label, options }) => ({ name: `derive/forms-holds/inherited-${name}-${label}`, origins: [`packages/derive/test/forms-holds.test.ts#inherited-name/${name}/${label}`], declaration: () => namedKind(name), bounds: PROPOSED_BOUNDS, options }))),
  { name: "derive/forms-holds/ordinary-name", origins: ["packages/derive/test/forms-holds.test.ts#held-name/normal"], declaration: () => namedKind("normal"), bounds: PROPOSED_BOUNDS, options: { platform: true } },
  ...(["applied", "refused", "superseded"] as const).flatMap(clause => [
    { effects: "missing" as const, retains: true }, { effects: "empty" as const, retains: true }, { effects: "missing" as const, retains: false },
  ].map(({ effects, retains }) => ({ name: `derive/forms-holds/clause-${clause}-${effects}-${retains}`, origins: [`packages/derive/test/forms-holds.test.ts#observation-only-clause/${clause}/${effects}/${retains}`], declaration: () => parseStrictBytes(canonicalBytes(holdsClauseData(clause, effects, retains))), bounds: PROPOSED_BOUNDS, options: { platform: true } }))),
];
