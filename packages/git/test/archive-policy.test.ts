import { expect, test, vi } from "vitest";
import { INVITATION_KEY_MEMBERSHIP } from "@generalbusiness/dap-contract";
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
  for (const pin of ["platform:directory@14", "platform:register@17"]) {
    expect(admitArchiveExport(pin, certified, inventory, ARCHIVE_NATIVE_DATA["platform:directory@16"])).toEqual({ ok: false, reason: "unsupported-archive-cohort" });
  }
  for (const [pin, digest] of Object.entries(ARCHIVE_NATIVE_DATA)) {
    expect(admitArchiveExport(pin, certified, inventory)).toEqual({ ok: false, reason: "unsupported-archive-cohort" });
    expect(admitArchiveExport(pin, certified, inventory, declaration)).toEqual({ ok: false, reason: "unsupported-archive-cohort" });
    expect(inventory).not.toHaveBeenCalled();
    expect(admitArchiveExport(pin, certified, inventory, digest)).toEqual({ ok: true });
    expect(admitArchiveExport(pin, certified, () => ({ customDomains: true, foreignCopies: false }), digest)).toEqual({ ok: false, reason: "unsupported-custom-domain" });
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
});
