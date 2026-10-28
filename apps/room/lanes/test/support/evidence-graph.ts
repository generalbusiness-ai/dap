/** Lane-only Native fixture: real turn, SQLite, dispatcher and capability
 * code; office/authority and remote Rules/Destination peers are stand-ins. */
import { expect, onTestFinished } from "vitest";
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/dap-bytes";
import { ScopeHandle, create, declaredHandle, secretSigner, signedIntent } from "@generalbusiness/dap-client";
import { timeMs, validateDefinition } from "@generalbusiness/dap-derive";
import { issueEvidence4 } from "../../src/issue4.ts";
import { changeEvidence4 } from "../../src/change4.ts";
import { cloneEvidence } from "../../src/evidence-fields.ts";
import { officeDefinition } from "./definition-corpus-data.ts";
import { Graph, Node, net, reader, rita, transport } from "./graph.ts";

export async function evidenceGraph() {
  net.hold = net.deaf = null; net.capability = {}; net.outside = null;
  const issue = issueEvidence4, change = changeEvidence4(definitionDigest(issue));
  const office: DeclaredDefinition = cloneEvidence(officeDefinition);
  for (const [kind, definition] of [["open-issue", issue], ["open-change", change]] as const) {
    const send = office.acts[kind]!.sends[0];
    if (!send || !("create" in send)) throw Error("The existing fixture office must create a declared lane");
    send.create.definition = definitionDigest(definition);
  }
  const valid = (definition: DeclaredDefinition) => { const checked = validateDefinition(definition, PROPOSED_BOUNDS); if (!checked.ok) throw Error(JSON.stringify(checked.problems)); return checked.definition; };
  const signed = await signedIntent(secretSigner(rita.secret), { to: null, kind: "found", fields: {} }, { now: timeMs(net.clock.now)! });
  const created = await create(transport, signed, office, [issue, change], reader);
  expect(created.answer.answer).toBe("accepted");
  if (!created.scope) throw Error("The declared fixture office must exist");
  const checked = await declaredHandle(new ScopeHandle(transport, created.scope.scope, reader), office);
  if (!checked.ok) throw Error("The fixture office must publish its exact declaration");
  // Only the two constant child digests differ; the existing Graph's office
  // operations retain their original fields and semantics. No authority claim.
  const graph = new Graph(new Node(checked.handle, valid(office)) as unknown as Node<typeof officeDefinition>);
  onTestFinished(async () => { net.hold = net.deaf = null; await graph.settle(); net.capability = null; net.outside = null; });
  const open = async (kind: "open-issue" | "open-change") => {
    const definition = kind === "open-issue" ? issue : change;
    const receipt = await graph.office.did(rita, kind, { fields: kind === "open-issue" ? { title: "Evidence work", conditions: ["It works"] } : { title: "Evidence change", destination: graph.destination.at, rules: graph.rules.at } } as never);
    return graph.created(graph.office, receipt.fact.seq, definition, valid(definition));
  };
  return { graph, issue, change, valid, open };
}
