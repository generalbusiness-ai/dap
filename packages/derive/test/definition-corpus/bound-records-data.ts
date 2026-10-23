/** Raw bound-record declarations; no validation or history construction. */
import type { PlatformData } from "@generalbusiness/dap-contract";
import { receiverPinData } from "./receiver-pins-data.ts";

export function boundRecordData(firstKey = false, whole = true): PlatformData {
  const data = receiverPinData() as unknown as PlatformData;
  if (!whole) delete data.capacity;
  data.name = "platform:task"; data.capabilities = firstKey ? [{ name: "hold", version: 1 }] : []; data.outcomes = {};
  data.items["job"] = {
    many: true, max: 2, initial: "open", states: { open: { final: false }, done: { final: true } }, parties: {}, values: {},
    refs: { owner: { fixed: true, required: true, to: { type: "scope", kind: "directory" } } }, holds: { decisions: { stop: 1 } },
  };
  const touch = data.acts["touch"]!;
  data.acts = { file: data.acts["file"]!, touch, "open-job": {
    ...touch, step: "open", on: "job", fields: { owner: { type: "scope", kind: "directory", required: true } }, effects: [{ ref: { slot: "owner", from: { field: "owner" } } }],
  } };
  data.receives = { stop: {
    class: "tell", message: "stop", from: { kind: "directory" }, opens: null,
    fields: { job: { type: "item", of: "job", required: true } }, also: { job: { item: "job", by: "job" } },
    bound: { of: "also.job", where: [{ equals: { a: { sender: true }, b: { slot: "owner", of: "also.job" } } }] },
    guards: [{ state: ["open"], of: "also.job" }], effects: [
      { state: "done", of: "also.job" },
      ...(firstKey ? [{ capability: { name: "hold", do: "license", with: { export: { const: 99 }, from: { none: true }, checkpoint: { const: "fixture" }, hold: { const: 0 }, instance: { const: "i" }, k: { const: 3 } } } } as const] : []),
    ], sends: [], attention: [],
  } };
  return data;
}
