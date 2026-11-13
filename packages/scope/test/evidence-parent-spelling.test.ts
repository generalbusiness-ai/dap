import { PROPOSED_BOUNDS, type Entry } from "@generalbusiness/dap-contract";
import { net as sourceNet } from "../src/testing.ts";
import { expect, test } from "vitest";
import { definitionDigest, isRecord, isSeed, parseStrict, scopeIdOf } from "@generalbusiness/dap-bytes";
import { admittedOrigin, type Sourced } from "../src/namespace.ts";
import { changeEvidence4 } from "../../../apps/room/lanes/src/change4.ts";
import { issueEvidence4 } from "../../../apps/room/lanes/src/issue4.ts";
import { EVIDENCE_INCIDENT_PINS_V17, evidenceIncidentOriginV17 } from "../../platform/src/evidence-incident-origin-v17.ts";
import { claimPublishedEvidence, evidenceEntry, evidenceItems, evidenceNativeRoom, preparePublishedEvidence, publishEvidenceFile } from "./evidence-rules-real-fixture.ts";
import { evidenceFactoryProof } from "./evidence-parent-spelling-fixture.ts";

test("real old and canonical evidence parents keep native incident identity while coherent mixed factory pins are refused", { timeout: 240_000 }, async () => {
  const current = changeEvidence4(definitionDigest(issueEvidence4)), earlier = structuredClone(current);
  let restored = 0;
  const ask = earlier.acts["ask-rules"]!.sends[0]!;
  if (!("tell" in ask) || !isRecord(ask.tell.to) || ask.tell.to["slot"] !== "rulesScope") throw Error("The retained ask-rules send must name rulesScope");
  ask.tell.to = { ...ask.tell.to, of: "on" }; restored++;
  for (const kind of ["request-check", "review-verdict"]) {
    for (const guard of earlier.acts[kind]!.guards) {
      if (guard.of !== "also.earlier" || !("equals" in guard) || !isRecord(guard.equals.a) || !("slot" in guard.equals.a) || typeof guard.equals.a["slot"] !== "string") continue;
      guard.equals.a = { slot: guard.equals.a["slot"], of: "also.earlier" }; restored++;
    }
  }
  expect(restored).toBe(4);
  const recordedPin = EVIDENCE_INCIDENT_PINS_V17.change, currentPin = definitionDigest(current);
  expect(definitionDigest(earlier)).toBe(recordedPin);
  expect(currentPin).not.toBe(recordedPin);
  for (const [declaration, selected, other] of [[earlier, recordedPin, currentPin], [current, currentPin, recordedPin]] as const) {
    const room = await evidenceNativeRoom();
    try {
      const setup = await preparePublishedEvidence(room, declaration);
      expect(setup.definitions.change).toBe(selected);
      const publication = await publishEvidenceFile(room, setup, "TEST canonical parent compatibility"), job = await publication.job();
      await claimPublishedEvidence(room, setup, publication, job, "failed");
      const incidents = await evidenceItems(publication.lane, "incident");
      expect(incidents).toHaveLength(1);
      const creator = await evidenceEntry(publication.lane, incidents[0]!.id);
      const made = creator.sends.find(send => isSeed(send.to) && send.to.definition === setup.definitions.issue);
      if (!made || !isSeed(made.to)) throw Error("Actual native incident child creation required");
      const child = room.life.platform(scopeIdOf(made.to)); room.nodes.push(child); await room.pause(room.nodes);
      const source = await (child.stub as unknown as { source(seq: number, origin: boolean, context: import("../src/ports.ts").SourceReadContext): Promise<Sourced | null> }).source(0, true, { maxBytes: (sourceNet.sized.get(child.name) ?? PROPOSED_BOUNDS).entryBytes, milliseconds: Math.floor((sourceNet.sized.get(child.name) ?? PROPOSED_BOUNDS).fetchSeconds * 1000) });
      expect(source?.under).toBe("issue");
      expect(source?.origin).toHaveLength(9);
      if (!source?.origin) throw Error("Actual full nine-fact origin required");
      const facts = admittedOrigin(source.origin.map(copy => ({ ...copy, entry: parseStrict(copy.bytes) as Entry })), (sourceNet.sized.get(child.name) ?? PROPOSED_BOUNDS).entryBytes);
      expect(evidenceIncidentOriginV17(setup.definitions.issue, facts)).toBe(true);
      // Both transformed proofs retain coherent signatures, hashes, causes,
      // sends and binding metadata. The same-pin control rebases nontrivially
      // and must pass the full checker before the mixed relationship refuses.
      const matching = evidenceFactoryProof(facts, selected);
      expect(evidenceIncidentOriginV17(setup.definitions.issue, matching)).toBe(true);
      const mixed = evidenceFactoryProof(facts, other);
      expect(evidenceIncidentOriginV17(setup.definitions.issue, mixed)).toBe(false);
    } finally { room.life.release(); }
  }
});
