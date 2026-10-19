import type { Digest } from "@generalbusiness/dap-contract";
import type { PackageComposition, PackageFinding, PackageGraphDefinition } from "./types.ts";
import { record, sendEndpoint, type GraphCreate, type GraphRow, type GraphSend } from "./model.ts";

export interface PortLink { readonly send: GraphSend; readonly handler: GraphRow }
/** Resolve only declared in-package ports. Field compatibility is a separate
 * obligation; reaching a port does not establish that its fields fit. */
export function packagePorts(entry: Digest, definitions: readonly PackageGraphDefinition[], composition: PackageComposition, rows: readonly GraphRow[], sends: readonly GraphSend[], creations: readonly GraphCreate[]) {
  const links: PortLink[] = [], findings: PackageFinding[] = [];
  const kinds = new Map<Digest, Set<string>>();
  kinds.set(entry, new Set(["lane"])); // native application install root
  for (const edge of creations) {
    const values = kinds.get(edge.target) ?? new Set<string>();
    if (typeof edge.send.data["kind"] === "string") values.add(edge.send.data["kind"]);
    kinds.set(edge.target, values);
  }
  for (const send of sends) {
    if (send.kind !== "tell" && send.kind !== "relate") continue;
    const endpoint = sendEndpoint(send, composition.connections);
    const refuse = (reason: PackageFinding["reason"], message: string) => findings.push({ definition: send.row.owner.id, row: send.path, check: "port-typing", reason, severity: "refusal", message });
    if (!endpoint) { refuse("unbound-endpoint", "Declare this send's scope endpoint connection."); continue; }
    if (endpoint.to === "outside") continue;
    const message = send.kind === "tell" ? send.data["message"] : send.data["name"];
    const candidates = rows.filter(row => row.owner.id === endpoint.to && row.family === "receives" && row.path === row.logical
      && row.data["class"] === send.kind && row.data["message"] === message);
    const possibleKinds = kinds.get(send.row.owner.id) ?? new Set<string>();
    let complete = possibleKinds.size > 0;
    for (const kind of possibleKinds) {
      const handler = candidates.find(row => record(row.data["from"])["kind"] === kind);
      if (!handler) { complete = false; continue; }
      if (!links.some(link => link.send === send && link.handler === handler)) links.push({ send, handler });
      const from = record(handler.data["from"]);
      if (from["under"] !== send.row.owner.definition.name || from["pin"] !== send.row.owner.id) {
        findings.push({ definition: handler.owner.id, row: handler.path, check: "endpoint-binding", reason: "wrong-peer", severity: "refusal", message: "The handler must name and pin the connected sender's definition." });
      }
    }
    if (!complete) refuse("unknown-message", "The connected definition has no matching handler for every possible sender kind.");
  }
  for (const definition of definitions) for (const row of rows) {
    if (row.owner !== definition || row.family !== "receives" || row.path !== row.logical || links.some(link => link.handler === row)) continue;
    findings.push({ definition: definition.id, row: row.path, check: "port-typing", reason: "unreachable-handler", severity: "refusal", message: "No declared in-package sender reaches this handler." });
  }
  return { links, findings };
}
