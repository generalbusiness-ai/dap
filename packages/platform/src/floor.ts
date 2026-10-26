/** Native entry positions that current platform readers follow. These
 * are grammar fields, not a scan of arbitrary numbers in platform values. */
import type { Own, PlatformRules, StateSnapshot, ValidDefinition } from "@generalbusiness/dap-derive";
import { own } from "@generalbusiness/dap-derive";
import { same } from "@generalbusiness/dap-bytes";
import { readRulesCertificateDeclinedV15 } from "./rules-certificate-v15.ts";

export const platformFloorReferences: NonNullable<PlatformRules["floorReferences"]> = function* (snapshot: StateSnapshot, definition: ValidDefinition, _history: Own) {
  if (definition.declared.name === "platform:directory") {
    const repository = snapshot.items.find(item => item.type === "repository");
    if (typeof repository?.values["import"] === "string" && (repository.values["imported"] ?? null) === null) {
      // directory.import-spent follows opening effects, then reads attempt
      // counters from operation rows. Closed outcome bodies are not needed.
      for (const operation of snapshot.operations) if (operation.owner.startsWith("platform:directory@") && operation.kind === "import") yield Number(operation.id.split(":")[0]);
    }
    return;
  }
  if (definition.declared.name !== "platform:destination") return;
  // Native code types are recorded in validated marks, rather than the
  // resolved declared FieldType. Only the exact G15 genesis selects this
  // reader. Old definitions have no such mark and retain their old roots.
  const declined = definition.marks.some(mark => mark.kind === "type"
    && mark.path === "items.branch.values.rulesCertificateDeclined.of"
    && mark.code === "rules-certificate-declined-v15");
  const genesis = declined ? _history(0)?.entry.input : null;
  if (genesis?.type === "genesis" && genesis.seed.definition === "platform:destination@15") {
    for (const item of snapshot.items) if (item.type === "branch") {
      const record = readRulesCertificateDeclinedV15(item.values["rulesCertificateDeclined"]);
      if (record && same(record.request.at, snapshot.scope?.at) && same(record.interveningFact.at, snapshot.scope?.at)) {
        yield record.request.seq;
        yield record.interveningFact.seq;
      }
    }
  }
  const live = new Set(snapshot.items.filter(item => !own(own(definition.declared.items, item.type)?.states, item.state)?.final).map(item => item.id));
  for (const item of snapshot.items) {
    if (!live.has(item.id) || item.type !== "publication") continue;
    // pushesOf, mintRevoked, stagedOwn and cleanup* read this reservation's
    // origin and the entries of its write/mint/revoke operation histories.
    if (typeof item.values["reservedAt"] === "number") yield item.values["reservedAt"];
    const token = item.values["token"];
    if (typeof token === "string" && /^\d+:\d+$/.test(token)) yield Number(token.split(":")[0]);
  }
  // Destination receipts and first-head recovery also inspect completed
  // operations while their holder remains live. The operation row is the
  // typed association; its counters are not mistaken for journal positions.
  for (const operation of snapshot.operations) if (operation.for !== undefined && live.has(operation.for)) {
    yield Number(operation.id.split(":")[0]);
    for (const attempt of operation.attempts) { yield attempt.opened; for (const outcome of attempt.outcomes) yield outcome.seq; }
  }
};
