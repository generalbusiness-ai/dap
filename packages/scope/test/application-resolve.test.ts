/** Real signatures/native admission/private local R2, with an explicit
 * in-memory Git-object transport stand-in. The Git reader's real repository
 * witnesses live in packages/git/test/application-blob.test.ts. No HTTP Git
 * server, provider, native install or host format-support claim here. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { resolveAndStoreApplication, resolveTrustedApplication } from "../src/applications/resolve.ts";
import { applicationResolverFixture as fixture } from "./support/application-fixture.ts";
const utf8 = new TextEncoder();
// Invariant: immutable URI resolution and trust precede any private store write;
// existing cached bytes cannot substitute for checking the requested Git URI.
test("resolved trusted bytes enter private storage only after the exact address was checked and closed", async () => {
  for (const format of ["sha1"] as const) {
    const f = await fixture(format);
    try {
      expect(await resolveAndStoreApplication(f.uri, f.packet.ids.release, f.trust, PROPOSED_BOUNDS, f.open, f.store)).toEqual(f.packet);
      expect(f.opened).toHaveLength(1); expect(f.opened[0]).toMatchObject({ remote: "https://git.example/packages.git", commit: f.commit, objectFormat: format, segments: ["packages", "application.dap.json"] }); expect(f.closed()).toBe(1);
      const first = await env.APPLICATION_CONTENT.head(f.key);
      await expect(resolveAndStoreApplication(f.uri.replace(f.commit, "f".repeat(f.commit.length)), f.packet.ids.release, f.trust, PROPOSED_BOUNDS, f.open, f.store)).rejects.toMatchObject({ reason: "absent" });
      expect(f.opened).toHaveLength(2); expect(f.closed()).toBe(2);
      expect((await env.APPLICATION_CONTENT.head(f.key))!.version).toBe(first!.version);
    } finally { await env.APPLICATION_CONTENT.delete(f.key); }
  }
});

test("untrusted, malformed and unavailable resolution never falls back or writes a package", async () => {
  const f = await fixture("sha1", utf8.encode("TEST wrong immutable Git file"));
  try {
    await expect(resolveTrustedApplication(f.uri, f.packet.ids.release, [], PROPOSED_BOUNDS, f.open)).rejects.toThrow("application-untrusted-release"); expect(f.opened).toEqual([]);
    await expect(resolveTrustedApplication(f.uri + "?credential=TEST", f.packet.ids.release, f.trust, PROPOSED_BOUNDS, f.open)).rejects.toThrow("application-uri-invalid"); expect(f.opened).toEqual([]);
    await expect(resolveAndStoreApplication(f.uri, f.packet.ids.release, f.trust, PROPOSED_BOUNDS, f.open, f.store)).rejects.toThrow();
    expect(f.closed()).toBe(1); expect(await env.APPLICATION_CONTENT.head(f.key)).toBeNull();
    let calls = 0;
    await expect(resolveTrustedApplication(f.uri, f.packet.ids.release, f.trust, PROPOSED_BOUNDS, async () => { calls++; throw Error("TEST raw transport failure"); })).rejects.toThrow("application-release-unavailable"); expect(calls).toBe(1);
  } finally { await env.APPLICATION_CONTENT.delete(f.key); }
});

test("the M1 host refuses a valid SHA-256 URI before transport or storage without downgrading", async () => {
  const f = await fixture("sha256");
  await expect(resolveAndStoreApplication(f.uri, f.packet.ids.release, f.trust, PROPOSED_BOUNDS, f.open, f.store)).rejects.toMatchObject({ reason: "unsupported-object-format" });
  expect(f.opened).toEqual([]); expect(f.closed()).toBe(0);
  expect(await env.APPLICATION_CONTENT.head(f.key)).toBeNull();
});
