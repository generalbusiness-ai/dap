/** Raw declarations used by handler/result-clause histories. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { desk, ticket } from "./fixture-data.ts";
/* eslint-disable @typescript-eslint/no-explicit-any */
export function auditedData(kind: string, under: string): DeclaredDefinition {
  const d = structuredClone(desk) as any;
  d.items.repo.refs.asked = { fixed: false, required: false, to: { type: "fact", kind: [kind], under } };
  d.receives.audit = { message: "audit", class: "tell", from: { kind: "lane" }, fields: { repo: { type: "item", of: "repo", required: true } }, opens: null, also: { repo: { item: "repo", by: "repo" } }, guards: [], effects: [{ of: "also.repo", ref: { slot: "asked", from: { source: "ref" } } }], sends: [], attention: [] };
  return d;
}

export function refusingTicketData(): DeclaredDefinition {
  const d = structuredClone(ticket) as any;
  d.acts.link.fields.why = { type: "int", min: 0, max: 9, required: true };
  d.acts.link.sends[0].relate.detail.why = { field: "why" };
  const set = { some: { type: "link", states: ["set"], where: [{ equals: { a: { slot: "me" }, b: { item: "on" } } }] } };
  d.acts.link.sends[0].relate.result = { refused: [{ state: "removed", if: [{ equals: { a: { result: "reason" }, b: { const: "one" } } }, set] }] };
  d.receives.closes.fields.why = { type: "int", min: 0, max: 9, required: true };
  d.receives.closes.guards = [{ differs: { a: { field: "why" }, b: { const: 1 } }, reason: "one" }, { differs: { a: { field: "why" }, b: { const: 2 } }, reason: "two" }];
  return d;
}
