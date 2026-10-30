/** Raw declarations only: the scan corpus keeps its own mutable slot. */
import type { DeclaredDefinition, Operand, Range } from "@generalbusiness/dap-contract";
import { act, jobs, text } from "./forms-guards-data.ts";

export function fixedSlotData(fixed = true): DeclaredDefinition {
  const data = structuredClone(jobs);
  data.name = "fixed-slot-counts";
  const job = data.items["job"]!;
  job.values["name"] = { fixed, required: true, of: text };
  job.values["stamp"] = { fixed: true, required: false, of: { type: "record", of: {
    at: { type: "scope", kind: "lane", required: true },
    seq: { type: "int", min: 0, max: Number.MAX_SAFE_INTEGER, required: true },
    hash: { type: "digest", required: true },
  } } };
  const request = data.acts["request"]!;
  request.fields["stamp"] = { ...job.values["stamp"].of, required: false };
  request.effects = [...request.effects, { value: { slot: "stamp", from: { field: "stamp" } } }];
  const range = (slot: string, value: Operand): Range => ({ type: "job", states: ["requested", "passed"], where: [{ equals: { a: { slot }, b: value } }] });
  data.acts["unique-constant"] = act({ step: "transition", on: "board", grant: "merge", guards: [{ none: range("name", { const: "unused" }), reason: "handle-in-use" }] });
  data.acts["unique-field"] = act({ step: "transition", on: "board", grant: "merge", fields: { needle: { ...text, required: true } }, guards: [{ none: range("name", { field: "needle" }), reason: "handle-in-use" }] });
  data.acts["except-field"] = act({ step: "transition", on: "board", grant: "merge", also: { job: { item: "job", by: "job" } },
    fields: { needle: { ...text, required: true }, job: { type: "item", of: "job", required: true } },
    guards: [{ count: { ...range("name", { field: "needle" }), states: ["requested", "passed", "requested"], except: ["also.job", "also.job"], min: 1, max: 1 } }],
  });
  data.acts["stamp-unused"] = act({ step: "transition", on: "board", grant: "merge", guards: [{ none: range("stamp", { const: 1 }), reason: "stamp-in-use" }] });
  data.acts["tick"] = act({ step: "comment", on: "board", grant: "merge" });
  return data;
}
