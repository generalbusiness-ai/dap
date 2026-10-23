/** Pure admission boundary in workerd, using real native declarations and
 * signatures. No installation, membership, content storage or provider. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest } from "@generalbusiness/dap-bytes";
import { packApplication, type ApplicationPackageInput } from "@generalbusiness/dap-client";
import { countingCommitments } from "../../../apps/counter/commitments.ts";
import { lending } from "../../../examples/lending/definition.ts";
import { APPLICATION_HOST_PACKAGE_BYTES, ApplicationAdmissionError, readApplicationTrust, readTrustedApplication } from "../src/applications/admission.ts";
import { applicationTrust, fixedSigner } from "./fixtures-native.ts";
const signer = fixedSigner(61);
const input = (definition: DeclaredDefinition): ApplicationPackageInput => ({ name: "test.example.admission", version: "1", semantic: {
  v: 1, entry: definitionDigest(definition), definitions: [{ id: definitionDigest(definition), bytes: canonicalize(definition) }], host: { execution: "recorded-do", profiles: ["restricted@1"] }, roles: {}, projections: {}, predecessor: null, capabilities: [],
}, presentation: { v: 1, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "PHRpdGxlPlRFU1Q8L3RpdGxlPg" }], descriptions: {} } });

// Invariant: exact operator-listed release AND publisher, signature integrity
// and native host support are all necessary before any later store/install.
test("both current application definitions admit only under their exact release and publisher", async () => {
  for (const definition of [countingCommitments, lending]) {
    const packet = await packApplication(input(definition), signer), rows = [{ release: packet.ids.release, publisher: signer.key }];
    const trust = readApplicationTrust(JSON.stringify(rows, null, 2));
    expect(readTrustedApplication(packet.bytes, packet.ids.release, trust, PROPOSED_BOUNDS)).toEqual(packet);
    expect(Object.isFrozen(trust[0])).toBe(true);
    expect(() => readTrustedApplication(new Uint8Array([255]), packet.ids.release, [], PROPOSED_BOUNDS)).toThrow("application-untrusted-release");
    const wrong = readApplicationTrust(JSON.stringify([{ ...rows[0], publisher: fixedSigner(62).key }]));
    expect(() => readTrustedApplication(packet.bytes, packet.ids.release, wrong, PROPOSED_BOUNDS)).toThrow("application-untrusted-release");
    const altered = new Uint8Array(packet.bytes); altered[altered.length - 2] = altered[altered.length - 2]! ^ 1;
    expect(() => readTrustedApplication(altered, packet.ids.release, trust, PROPOSED_BOUNDS)).toThrow();
  }
});

test("invalid trust and a trusted but unsupported package refuse without partial admission", async () => {
  const packet = await packApplication(input(lending), signer), row = { release: packet.ids.release, publisher: signer.key };
  expect(readApplicationTrust(undefined)).toEqual([]);
  expect(() => readTrustedApplication(new Uint8Array(APPLICATION_HOST_PACKAGE_BYTES + 1), packet.ids.release, readApplicationTrust(JSON.stringify([row])), PROPOSED_BOUNDS)).toThrow("application-package-limit");
  for (const setting of ["not JSON", "null", "{}", JSON.stringify([row, row]), JSON.stringify([{ ...row, extra: true }]), JSON.stringify([{ ...row, publisher: "not-a-key" }]), JSON.stringify(Array.from({ length: 129 }, () => row)), " ".repeat(64 * 1024 + 1)]) expect(() => readApplicationTrust(setting)).toThrow(ApplicationAdmissionError);
  const base = input(lending), unsupported = { ...base, semantic: { ...base.semantic, host: { ...base.semantic.host, profiles: ["restricted@1", "unknown@1"] } } };
  const other = await packApplication(unsupported, signer), trust = readApplicationTrust(applicationTrust(other, signer.key));
  expect(() => readTrustedApplication(other.bytes, other.ids.release, trust, PROPOSED_BOUNDS)).toThrow("application-unsupported-host");
  const invalid = JSON.parse(canonicalize(lending)) as DeclaredDefinition; invalid.acts["donate"]!.on = "missing";
  const bad = await packApplication(input(invalid), signer), badTrust = readApplicationTrust(applicationTrust(bad, signer.key));
  expect(() => readTrustedApplication(bad.bytes, bad.ids.release, badTrust, PROPOSED_BOUNDS)).toThrow("application-unsupported-definition");
});
