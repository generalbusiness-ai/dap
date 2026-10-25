import { expect, test, vi } from "vitest";
import { INVITATION_KEY_MEMBERSHIP, INVITATION_PROOF_DOMAIN } from "@generalbusiness/dap-contract";
import { textDigest } from "@generalbusiness/dap-bytes";
import { ARCHIVE_NATIVE_DATA, admitArchiveExport, admitArchiveNativeValuePlace } from "../src/archive-policy.ts";

// Policy only, with a SCRIPTED inventory and trusted certificate stand-in.
// No archive writer, native inventory, export permission or Git write runs.
test("export admission checks exact reviewed native pin and data together, preserves credential refusals and requires whole inventory", () => {
  const inventory = vi.fn(() => ({ customDomains: false, foreignCopies: false }));
  const declaration = textDigest("SCRIPTED checker-certified public definition");
  const certified = new Set([declaration]);
  for (const pin of ["platform:membership@1", "platform:membership@2", "platform:membership@4", "platform:membership@5", "platform:membership@8"]) {
    expect(admitArchiveExport(pin, certified, inventory)).toEqual({ ok: false, reason: "unsupported-credential-cohort" });
  }
  expect(inventory).not.toHaveBeenCalled();
  for (const pin of ["platform:directory@14", "platform:register@17", "platform:register@18", "platform:register@19", "platform:directory@19"]) {
    expect(admitArchiveExport(pin, certified, inventory, ARCHIVE_NATIVE_DATA["platform:directory@16"])).toEqual({ ok: false, reason: "unsupported-archive-cohort" });
  }
  for (const [pin, digest] of Object.entries(ARCHIVE_NATIVE_DATA)) {
    expect(admitArchiveExport(pin, certified, inventory)).toEqual({ ok: false, reason: "unsupported-archive-cohort" });
    expect(admitArchiveExport(pin, certified, inventory, declaration)).toEqual({ ok: false, reason: "unsupported-archive-cohort" });
    expect(inventory).not.toHaveBeenCalled();
    expect(admitArchiveExport(pin, certified, inventory, digest)).toEqual({ ok: true });
    expect(admitArchiveExport(pin, certified, () => ({ customDomains: true, foreignCopies: false }), digest)).toEqual({ ok: false, reason: "unsupported-custom-domain" });
    expect(admitArchiveExport(pin, certified, () => ({ customDomains: false, foreignCopies: true }), digest)).toEqual({ ok: false, reason: "unsupported-foreign-copy" });
    inventory.mockClear();
  }
  expect(admitArchiveExport("platform:directory@9", certified, inventory)).toEqual({ ok: false, reason: "unsupported-archive-cohort" });
  expect(admitArchiveExport(textDigest("another declaration"), certified, inventory)).toEqual({ ok: false, reason: "unsupported-archive-cohort" });
  expect(inventory).not.toHaveBeenCalled();
  expect(admitArchiveExport(INVITATION_KEY_MEMBERSHIP, certified, inventory)).toEqual({ ok: true });
  expect(admitArchiveExport(declaration, certified, inventory)).toEqual({ ok: true });
  expect(admitArchiveExport(INVITATION_KEY_MEMBERSHIP, certified, () => ({ customDomains: true, foreignCopies: false }))).toEqual({ ok: false, reason: "unsupported-custom-domain" });
  expect(admitArchiveExport(INVITATION_KEY_MEMBERSHIP, certified, () => ({ customDomains: false, foreignCopies: true }))).toEqual({ ok: false, reason: "unsupported-foreign-copy" });
  // Invariant: a public native domain stays confined to its reviewed
  // declaration identity, exact place and bound; a TEST table cannot move it.
  const rules = "platform:rules@10", data = ARCHIVE_NATIVE_DATA[rules]!, domain = "dap-application-release-2", place = "acts.install-application.fields.release.value";
  expect(admitArchiveNativeValuePlace(rules, data, domain, 4096, place)).toBe(true);
  expect(admitArchiveNativeValuePlace(rules, data, domain, 4096, "owners.platform:rules@10.fetch-application")).toBe(false);
  expect(admitArchiveNativeValuePlace(rules, data, "TEST-unlisted-native-value", 4096, place)).toBe(false);
  expect(admitArchiveNativeValuePlace("platform:rules@9", data, domain, 4096, place)).toBe(false);
  expect(admitArchiveNativeValuePlace(rules, declaration, domain, 4096, place)).toBe(false);
  expect(admitArchiveNativeValuePlace(rules, data, domain, 8192, place)).toBe(false);
  // The two Destination evaluators share declaration data, but each keeps
  // its own exact owner place. Neither admits the other's changed-set row.
  for (const version of [12, 13]) {
    const pin = `platform:destination@${version}`, data = ARCHIVE_NATIVE_DATA[pin]!;
    const owner = `owners.${pin}.judge`;
    expect(admitArchiveNativeValuePlace(pin, data, "artroom-changed-set-1", 256 * 1024, owner)).toBe(true);
    expect(admitArchiveNativeValuePlace(pin, data, "artroom-rules-extents-1", 256 * 1024, "outcomes.judge.observes.0.retains.0")).toBe(true);
    expect(admitArchiveNativeValuePlace(pin, data, "artroom-changed-set-1", 256 * 1024, `owners.platform:destination@${version === 12 ? 13 : 12}.judge`)).toBe(false);
    expect(admitArchiveNativeValuePlace(pin, data, "artroom-changed-set-1", 256 * 1024 + 1, owner)).toBe(false);
    expect(admitArchiveNativeValuePlace(pin, declaration, "artroom-changed-set-1", 256 * 1024, owner)).toBe(false);
  }
  // Policy-function boundary only: these full pin/data/place rows do not
  // prove native certificate outcome selection, inventory, export or replay.
  const q11 = "platform:rules@11", q11Data = ARCHIVE_NATIVE_DATA[q11]!;
  const g14 = "platform:destination@14", g14Data = ARCHIVE_NATIVE_DATA[g14]!;
  const proposal = "acts.publish.fields.proposal.value", proof = "acts.publish.fields.proof.value";
  const policyDomain = "artroom-rules-policy-1", treeDomain = "artroom-rules-tree-1", bound = 256 * 1024;
  expect(admitArchiveNativeValuePlace(q11, q11Data, policyDomain, bound, proposal)).toBe(true);
  expect(admitArchiveNativeValuePlace(q11, q11Data, treeDomain, bound, proof)).toBe(true);
  expect(admitArchiveNativeValuePlace(q11, q11Data, policyDomain, bound, proof)).toBe(false);
  expect(admitArchiveNativeValuePlace(q11, q11Data, treeDomain, bound, proposal)).toBe(false);
  expect(admitArchiveNativeValuePlace(q11, g14Data, policyDomain, bound, proposal)).toBe(false);
  expect(admitArchiveNativeValuePlace(q11, q11Data, treeDomain, bound + 1, proof)).toBe(false);
  const certificateOwner = "owners.platform:destination@14.certify-rules-tree";
  for (const domain of [policyDomain, treeDomain]) {
    expect(admitArchiveNativeValuePlace(g14, g14Data, domain, bound, certificateOwner)).toBe(true);
    expect(admitArchiveNativeValuePlace(g14, g14Data, domain, bound, "owners.platform:destination@14.judge")).toBe(false);
    expect(admitArchiveNativeValuePlace(g14, g14Data, domain, bound, "owners.platform:destination@13.certify-rules-tree")).toBe(false);
  }
  expect(admitArchiveNativeValuePlace(g14, q11Data, policyDomain, bound, certificateOwner)).toBe(false);
  expect(admitArchiveNativeValuePlace(g14, g14Data, treeDomain, bound + 1, certificateOwner)).toBe(false);
  const observation = "outcomes.judge.observes.0.retains.0";
  expect(admitArchiveNativeValuePlace(g14, g14Data, "artroom-rules-extents-2", bound, observation)).toBe(true);
  expect(admitArchiveNativeValuePlace(g14, g14Data, "artroom-rules-extents-1", bound, observation)).toBe(false);
  expect(admitArchiveNativeValuePlace(g14, g14Data, "artroom-rules-extents-2", bound, certificateOwner)).toBe(false);
  for (const pin of ["platform:destination@12", "platform:destination@13"]) {
    expect(admitArchiveNativeValuePlace(pin, ARCHIVE_NATIVE_DATA[pin]!, "artroom-rules-extents-2", bound, observation)).toBe(false);
  }
  expect(admitArchiveNativeValuePlace(q11, q11Data, INVITATION_PROOF_DOMAIN, bound, proposal)).toBe(false);
  expect(admitArchiveNativeValuePlace(g14, g14Data, INVITATION_PROOF_DOMAIN, bound, certificateOwner)).toBe(false);
});
