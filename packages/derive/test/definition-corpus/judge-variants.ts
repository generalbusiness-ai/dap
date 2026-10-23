/** Actual positive variant callbacks shared with their original owning tests. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { DefinitionCorpusRow } from "./row.ts";
import { lane, small } from "./fixture-data.ts";
import { otherLane } from "./fixture-identities.ts";
import { LAST_MS } from "../../src/time.ts";
/* eslint-disable @typescript-eslint/no-explicit-any */
export const judge_change0 = (def: any) => {
      def.items.note.values.backup = { fixed: false, required: false, of: { type: "scope", kind: "lane" }, default: otherLane };
      def.acts.restore = { ...def.acts.keep, effects: [{ ref: { slot: "peer", from: { slot: "backup" } } }] };
    };

export const judge_change1 = (def: any) => {
      def.acts.late = { ...def.acts.keep, effects: [{ value: { slot: "due", from: { time: { plusSeconds: Math.floor(LAST_MS / 1000) } } } }] };
    };

export const judge_change2 = (def: any) => def.acts.edit.effects.push({ of: "also.other", value: { slot: "text", from: { field: "text" } } });

export const judge_change3 = (def: any) => {
      const report = def.acts.report;
      report.fields = { ...report.fields, to: { type: "member", required: true } };
      report.effects.splice(2, 0, { of: "also.commitment", party: { slot: "performer", from: { field: "to" } } });
    };

export const judge_change4 = (def: any) => { def.acts.cite.fields.second = { type: "fact", kind: ["assign"], under: "lane", required: false }; };
export const judgeVariantDefinitions: readonly DefinitionCorpusRow[] = [
  { name: "derive/judge/judge_change0", origins: ["packages/derive/test/judge.test.ts#variant occurrence 0"], declaration: () => { const data = structuredClone(small); judge_change0(data); return data; }, bounds: PROPOSED_BOUNDS },
  { name: "derive/judge/judge_change1", origins: ["packages/derive/test/judge.test.ts#variant occurrence 1"], declaration: () => { const data = structuredClone(small); judge_change1(data); return data; }, bounds: PROPOSED_BOUNDS },
  { name: "derive/judge/judge_change2", origins: ["packages/derive/test/judge.test.ts#variant occurrence 2"], declaration: () => { const data = structuredClone(small); judge_change2(data); return data; }, bounds: PROPOSED_BOUNDS },
  { name: "derive/judge/judge_change3", origins: ["packages/derive/test/judge.test.ts#variant occurrence 3"], declaration: () => { const data = structuredClone(lane); judge_change3(data); return data; }, bounds: PROPOSED_BOUNDS },
  { name: "derive/judge/judge_change4", origins: ["packages/derive/test/judge.test.ts#variant occurrence 4"], declaration: () => { const data = structuredClone(small); judge_change4(data); return data; }, bounds: PROPOSED_BOUNDS },
];
