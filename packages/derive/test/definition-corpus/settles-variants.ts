/** Shared raw positive settlement variants; no validator runs on import. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PROPOSED_BOUNDS, type PlatformData, type DeclaredDefinition } from "@generalbusiness/dap-contract";
import { canonicalBytes, parseStrictBytes } from "@generalbusiness/dap-bytes";
import { PROFILES } from "../../src/validate/index.ts";
import { M, act, MARK, set } from "./forms-settles-data.ts";
import type { DefinitionCorpusRow } from "./row.ts";
export const settlesChanges = {
  alias: (d: any) => {
    d.capacity = { name: "whole-scope", version: 1 };
    d.items.job.refs.target = { fixed: false, required: false, to: { type: "item", of: "job" } };
    d.acts.point = structuredClone(d.acts["mark-a"]);
    delete d.acts.point.settles;
    d.acts.point.fields = { target: { type: "item", of: "job", required: true } };
    d.acts.point.effects = [{ ref: { slot: "target", from: { field: "target" } } }];
    d.acts["mark-target"] = structuredClone(d.acts["mark-a"]);
    d.acts["mark-target"].fields = { next: { type: "item", of: "job", required: true } };
    d.acts["mark-target"].also = { target: { item: "job", via: { slot: "target", of: "on" } } };
    d.acts["mark-target"].settles.of = "also.target";
    d.acts["mark-target"].effects = [{ ref: { slot: "target", from: { field: "next" } } }, set("a", "also.target")];
  },
  handlers: (d: any) => {
    d.capacity = { name: "whole-scope", version: 1 };
    const handler = { message: "flag", class: "tell", from: { kind: "directory" }, fields: { job: { type: "item", of: "job", required: true } }, opens: null, also: { job: { item: "job", by: "job" } }, settles: { of: "also.job", sets: "a", in: ["open"] }, guards: [], effects: [set("a", "also.job")], sends: [], attention: [] };
    d.receives.flag = handler;
    d.receives.note = { ...structuredClone(handler), message: "note" };
    delete d.receives.note.settles;
    d.receives.advice = { ...structuredClone(handler), message: "index", class: "advisory" };
  },
  duties: (d: any) => {
    d.capacity = { name: "whole-scope", version: 1 };
    d.acts.note = structuredClone(d.acts["mark-b"]);
    delete d.acts.note.settles;
  },
  removeMarkersWhole: (d: any) => {
    d.capacity = { name: "whole-scope", version: 1 };
    for (const kind of ["mark-a", "mark-a-far", "mark-b"]) delete d.acts[kind];
  },
  whole: (d: any) => { d.capacity = { name: "whole-scope", version: 1 }; },
  guarded: (d: any) => {
    d.capacity = { name: "whole-scope", version: 1 };
    d.rules.check = "true";
    for (const kind of ["mark-a", "mark-a-far", "mark-b", "close"]) d.acts[kind].guards.push({ rule: "check" });
  },
  fields: (d: any) => {
    d.capacity = { name: "whole-scope", version: 1 };
    d.outcomes = {};
    d.acts["mark-b"].fields = {
      memo: { type: "text", max: 3, detached: true, required: false },
      proof: { type: "fact", under: "fixture", kind: ["fact"], required: false },
      value: { type: "digest", value: { domain: "fixture-value", max: 17 }, required: false },
    };
    d.acts["mark-b"].presents = { extra: { under: "fixture", kind: ["fact"], required: false } };
  },
  rows: (d: any) => {
    d.capacity = { name: "whole-scope", version: 1 };
    d.outcomes = {};
    const row = (max: number, clause = false) => ({ of: "rules", window: 60, use: "once", ...(clause ? { without: "write" } : {}), retains: [{ domain: "fixture-row-value", max }] });
    d.acts["mark-b"].observes = [row(11)];
    const send = d.acts["mark-a-far"].sends[0].tell;
    send.result = {};
    send.observes = { applied: [row(17, true)], refused: [row(23, true)] };
  },
  m2: (d: any) => {
      d.acts.close.effects = [{ state: "held" }];
      d.acts.finish = act({ step: "transition", on: "job", grant: "close", settles: { of: "on", in: ["held"] }, guards: [{ state: ["held"] }], effects: [{ state: "done" }] });
    },
  plain: (d: any) => { for (const kind of ["mark-a", "mark-a-far", "mark-b"]) delete d.acts[kind]; },
  m5: (d: any) => {
  d.name = "platform:marks";
  d.outcomes = {};
  for (const kind of ["mark-a", "mark-a-far", "mark-b", "close"]) delete d.acts[kind];
  delete d.items.job.values.b;
  d.items.job.values.until = { fixed: false, required: false, of: { type: "time" } };
  d.timed.lapse = { on: "job", states: ["held"], deadline: "until", effects: [{ state: "done" }], attention: [] };
  d.receives.flag = {
    message: "flag", class: "tell", from: { kind: "directory" }, fields: { job: { type: "item", of: "job", required: true } }, opens: null,
    also: { job: { item: "job", by: "job" } }, settles: { of: "also.job", sets: "a", in: ["open"] },
    guards: [], effects: [{ code: "raise", row: "X1" }], sends: [], attention: [],
  };
},
};

export const settlesThreeChange = (d: any) => {
  for (const kind of ["mark-a-far", "close"]) delete d.acts[kind];
  Object.assign(d.acts["mark-a"]!, { settles: { of: "on", sets: "a", in: ["open"] }, guards: [{ state: ["open"] }], effects: [set("a"), { state: "held" }] });
  Object.assign(d.acts["mark-b"]!, { settles: { of: "on", sets: "b", in: ["held"] }, guards: [{ state: ["held"] }], effects: [set("b"), { state: "open" }] });
};

export function settlesTimedData(to: "held" | "done") {
  const data = structuredClone(M);
  for (const name of ["mark-a", "mark-a-far", "mark-b"]) delete data.acts[name];
  data.items["root"]!.values["flag"] = { ...MARK };
  data.items["job"]!.values["until"] = { fixed: false, required: false, of: { type: "time" } };
  data.acts["close"]!.effects = [{ state: to }];
  data.acts["trigger"] = act({
    step: "transition", on: "root", grant: "trigger", settles: { of: "on", sets: "flag", in: ["open"] },
    also: { job: { item: "job", by: "job" } }, fields: { job: { type: "item", of: "job", required: true } },
    guards: [{ state: ["open", "held"], of: "also.job" }], effects: [set("flag"), { state: "held", of: "also.job" }],
  }) as unknown as DeclaredDefinition["acts"][string];
  data.timed["resume"] = { on: "job", states: ["held"], deadline: "until", effects: [{ state: "open" }], attention: [] };
  return data;
}

export function settlesHolderData() {
  const data = structuredClone(M) as unknown as PlatformData;
      data.name = "platform:marks";
      data.items["root"]!.holds = { operations: { pulse: 1 }, requests: 1, items: 1 };
      data.items["job"]!.values["until"] = { fixed: false, required: false, of: { type: "time" } };
      data.timed["pause"] = { on: "job", states: ["open"], deadline: "until", effects: [{ state: "held" }], attention: [] };
      data.acts["start"]!.sends = [{ tell: { to: { slot: "desk" }, message: "resume", fields: {}, result: { applied: [{ state: "open" }] } } }];
      data.items["result"] = { many: true, max: 8, states: { done: { final: true } }, initial: "done", parties: {}, refs: {}, values: {} };
      // One alternative opens a result while settling the existing job. The shorter relate alternative may create its first
      // copy while settling that same mark: each dimension takes its own largest alternative, not the form with most entries.
      data.acts["mark-a-far"] = act({
        step: "open", on: "result", grant: "mark", also: { job: { item: "job", by: "job" } }, fields: { job: { type: "item", of: "job", required: true } },
        settles: { of: "also.job", sets: "a", in: ["open"] }, effects: [set("a", "also.job")],
        sends: [{ tell: { to: { slot: "desk", of: "also.job" }, message: "marked", fields: {}, result: {} } }],
      }) as unknown as PlatformData["acts"][string];
      data.receives["record-a"] = {
        class: "relate", message: "record-a", from: { kind: "lane" }, copies: 8, opens: null,
        fields: { job: { type: "item", of: "job", required: true } }, also: { job: { item: "job", by: "job" } },
        settles: { of: "also.job", sets: "a", in: ["open"] }, guards: [], effects: [set("a", "also.job")], sends: [], attention: [],
      };
      data.outcomes = {
        pulse: { code: "pulse", row: "X1", attempts: 1, most: { effects: 1, opens: "job" } },
        spawn: { code: "spawn", row: "X2", attempts: 1, most: { effects: 0, opens: "job" } },
      };
        return data;
}

export function settlesOwnCopyChange(ownCopy: PlatformData) {
  ownCopy.receives["record-a"]!.settles = { copy: ["set"] };
      ownCopy.receives["record-a"]!.opens = "result";
}

export function settlesMarkedCopyChange(ownCopy: PlatformData) {
  ownCopy.capacity = { name: "whole-scope", version: 1 };
      ownCopy.receives["record-a"]!.opens = null;
      ownCopy.receives["record-a"]!.effects = [...ownCopy.receives["record-a"]!.effects, { code: "copy-result", row: "X3", most: { effects: 2, opens: "result" } }];
}

const changed = (change: (d: any) => void) => { const data = structuredClone(M); change(data); return data; };
const row = (name: string, declaration: () => unknown, origin: string, platform = false): DefinitionCorpusRow => ({
 name: `derive/forms-settles/${name}`, origins: [`packages/derive/test/forms-settles.test.ts#${origin}`], declaration,
 bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform },
});
export const settlesVariantDefinitions: readonly DefinitionCorpusRow[] = [
  row("alias", () => changed(settlesChanges.alias), "alias settlement", false),
  row("handlers", () => changed(settlesChanges.handlers), "delivered settlement", false),
  row("duties", () => changed(settlesChanges.duties), "ordinary marker duty", false),
  row("removeMarkersWhole", () => changed(settlesChanges.removeMarkersWhole), "malformed computed amount control", false),
  row("whole", () => changed(settlesChanges.whole), "whole pending amounts", false),
  row("guarded", () => changed(settlesChanges.guarded), "pending rules", false),
  row("fields", () => changed(settlesChanges.fields), "pending fields and presented input", true),
  row("rows", () => changed(settlesChanges.rows), "pending observation rows", true),
  row("m2", () => changed(settlesChanges.m2), "two-state settlement", false),
  row("plain", () => changed(settlesChanges.plain), "no marker data", false),
  row("m5", () => changed(settlesChanges.m5), "coded settling marker", true),
  row("m3", () => changed(settlesThreeChange), "two marker path"),
  { name: "derive/forms-settles/timed-done", origins: ["packages/derive/test/forms-settles.test.ts#finite canonical timed closure"], declaration: () => parseStrictBytes(canonicalBytes(settlesTimedData("done"))), bounds: PROPOSED_BOUNDS },
  row("holder", () => parseStrictBytes(canonicalBytes(settlesHolderData())), "canonical holder amounts", true),
  row("ownCopy", () => { const data = settlesHolderData(); settlesOwnCopyChange(data); return parseStrictBytes(canonicalBytes(data)); }, "canonical copy holder", true),
  row("markedCopy", () => { const data = settlesHolderData(); settlesOwnCopyChange(data); settlesMarkedCopyChange(data); return parseStrictBytes(canonicalBytes(data)); }, "canonical marked copy holder", true),
];
