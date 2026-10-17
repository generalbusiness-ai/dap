/** Made-up platform data and code for request Amount witnesses. */
import { PROPOSED_BOUNDS, type PlatformData, type PlatformSend } from "@generalbusiness/dap-contract";
import { validateDefinition, type PlatformRules } from "../src/index.ts";
import { notesDefinition, valid } from "./fixtures.ts";

export function platformRequests(whole = true, withKind = false) {
  const data: PlatformData = { ...structuredClone(notesDefinition.declared), name: "platform:task", outcomes: withKind ? { noop: { code: "noop", row: "P3", attempts: 1, most: { effects: 0, operations: [] } } } : {} };
  if (whole) data.capacity = { name: "whole-scope", version: 1 };
  data.items["note"]!.states = { kept: { final: false }, struck: { final: true }, waiting: { final: false }, ended: { final: true } };
  data.items["row"] = { many: true, max: 8, states: { pending: { final: false }, done: { final: true } }, initial: "pending", parties: {}, refs: {}, values: {} };
  const finish = { ...structuredClone(data.acts["strike"]!), fields: {}, effects: [{ state: "ended" }] };
  data.acts["resolve-note"] = { ...finish, guards: [{ state: ["waiting"] }], settles: { of: "on", in: ["waiting"] } };
  data.acts["finish-row"] = { ...finish, on: "row", guards: [{ state: ["pending"] }], effects: [{ state: "done" }], settles: { of: "on", in: ["pending"] } };
  const opening = { code: "open-row", row: "P1", most: { effects: 0, operations: [], opens: "row" } };
  const request: PlatformSend = { create: { kind: "lane", definition: "platform:task@1", fields: { unexpected: { const: true } }, result: {
    applied: [{ state: "waiting" }], refused: [opening], conflict: [{ code: "two-changes", row: "P2", most: { effects: 2, operations: [] } }],
  } } };
  data.acts["ask"] = { ...structuredClone(data.acts["vouch"]!), presents: {}, guards: [], sends: [request] } as typeof data.acts[string];
  const quiet = { create: { ...request.create, result: {} } };
  data.acts["idle"] = { ...structuredClone(data.acts["ask"]!), sends: [] };
  data.acts["quiet"] = { ...structuredClone(data.acts["ask"]!), sends: [quiet] };
  data.acts["both"] = { ...structuredClone(data.acts["ask"]!), sends: [request, quiet] } as typeof data.acts[string];
  return valid(validateDefinition(data, PROPOSED_BOUNDS, undefined, { platform: true }));
}


export const platformRequestRules: PlatformRules = { named: "platform:task@1", rules: {
  "open-row": { place: "effect", most: 1, run: given => [{ effect: "open", item: given.resolved.self, type: "row", state: "pending" }] },
  "two-changes": { place: "effect", most: 2, run: () => [] },
  noop: { place: "outcome", rules: { selects: false, read: false, retries: () => false } },
} };
