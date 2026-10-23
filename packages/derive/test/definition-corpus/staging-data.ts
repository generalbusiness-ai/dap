/** Raw staging declaration before any validator or retained-history constructor. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { lane } from "./fixture-data.ts";

const commit = { type: "commit" } as const;
/* eslint-disable @typescript-eslint/no-explicit-any */
export function stagingData(): DeclaredDefinition {
  const def = structuredClone(lane) as any;
  def.capabilities.push({ name: "git-read", version: 1 });
  def.items.report.states = { reported: { final: false }, accepted: { final: true }, refused: { final: true } };
  def.items.report.values = { commit: { fixed: false, required: false, of: commit } };
  def.items.export = { many: true, max: 4, states: { authorized: { final: false }, done: { final: true } }, initial: "authorized", parties: {}, refs: { hold: { fixed: true, required: true, to: { type: "item", of: "hold" } } }, values: {} };
  const report = def.acts.report;
  report.fields = { ...report.fields, commit: { ...commit, required: true } };
  report.guards.push({ capability: { name: "hold", guard: "staged", with: { commit: { field: "commit" }, under: { item: "also.commitment" } } } }, { capability: { name: "git-read", guard: "ancestry", with: { commit: { field: "commit" }, row: { const: "report" } } } });
  report.effects.push({ value: { slot: "commit", from: { field: "commit" } } }, { capability: { name: "hold", do: "pin-hold", with: { commit: { field: "commit" } } } });
  def.acts["refuse-report"] = {
    step: "transition", on: "report", grant: "review", also: {}, fields: {}, guards: [{ state: ["reported"] }], sends: [], attention: [],
    effects: [{ state: "refused" }, { capability: { name: "hold", do: "pin-release", with: { commit: { slot: "commit" } } } }],
  };
  // A selected input of a commitment, with the state and the slot that `git-read@1` reads by name, as `use-input` of `issue` opens it.
  def.items.input = { many: true, max: 4, states: { selected: { final: false }, replaced: { final: true } }, initial: "selected", parties: {}, refs: { for: { fixed: true, required: true, to: { type: "item", of: "commitment" } } }, values: {} };
  def.acts["use-input"] = {
    step: "open", on: "input", grant: "report", also: { commitment: { item: "commitment", by: "commitment" } }, fields: { commitment: { type: "item", of: "commitment", required: true } },
    guards: [], effects: [{ ref: { slot: "for", from: { item: "also.commitment" } } }], sends: [], attention: [],
  };
  def.acts.authorize = {
    step: "open", on: "export", grant: "export", also: { hold: { item: "hold", by: "hold" } }, fields: { hold: { type: "item", of: "hold", required: true } },
    guards: [{ of: "also.hold", state: ["ended"] }], effects: [{ ref: { slot: "hold", from: { field: "hold" } } }], sends: [], attention: [],
  };
  // The license request of a task scope, with the capability's guard and effect as `issue` writes them, argument for argument.
  const license = { export: { item: "also.export" }, from: { sender: true }, checkpoint: { field: "checkpoint" }, hold: { item: "also.target" }, instance: { field: "instance" } };
  def.receives["export-license"] = {
    message: "export-license", class: "tell", from: { kind: "task" }, opens: null,
    fields: { export: { type: "item", of: "export", required: true }, k: { type: "int", min: 1, max: 3, required: true }, checkpoint: { type: "digest", required: true }, hold: { type: "item", of: "hold", required: true }, instance: { type: "text", max: 128, required: true } },
    also: { export: { item: "export", by: "export" }, target: { item: "hold", by: "hold" } },
    guards: [{ capability: { name: "hold", guard: "license", with: license } }],
    effects: [{ capability: { name: "hold", do: "license", with: { ...license, k: { field: "k" } } } }], sends: [], attention: [],
  };
  return def;
}
