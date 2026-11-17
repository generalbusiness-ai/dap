/** The normal pack path reproduces the reviewed source identifiers.
 * The public TEST signer reads no custody. Published packets use the real codec. */
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { readApplicationTrust, secretSigner } from "@generalbusiness/dap-client";
import { readPublishedApplicationPackage2 } from "@generalbusiness/dap-platform/application-v2";
import { DEMO_RELEASE, DEMO_PUBLISHER } from "../../../examples/grow/demo-release.ts";
import { prepareApplicationDirectory } from "../src/application-files.ts";
import { prepareGrowDemo } from "../../../examples/grow/prepare-demo.ts";

test("Grow, Lending and Counter reproduce their reviewed definition and presentation identifiers from canonical sources", async () => {
  const repository = fileURLToPath(new URL("../../../", import.meta.url));
  const signer = secretSigner(new Uint8Array(32).fill(254));
  const grow = await prepareGrowDemo();
  try {
    const sources = [
      { name: "Grow", root: grow, config: "dap.application.json", identifiers: "examples/grow/release-identifiers.json" },
      { name: "Lending", root: repository, config: "examples/lending/dap.application.json", identifiers: "examples/lending/release-identifiers.json" },
      { name: "Counter", root: repository, config: "apps/counter/dap.application.json", identifiers: "apps/counter/release-identifiers.json" },
    ];
    const authoredVersions = new Map<string, string>();
    for (const source of sources) {
      const { packet } = await prepareApplicationDirectory(source.root, signer, { config: source.config });
      authoredVersions.set(source.name, packet.package.release.manifest.version);
      const expected = JSON.parse(await readFile(new URL(`../../../${source.identifiers}`, import.meta.url), "utf8"));
      expect({
        entry: packet.package.semantic.entry,
        definitions: packet.package.semantic.definitions.map(part => part.id).sort(),
        semantic: packet.ids.semantic,
        presentation: packet.ids.presentation,
      }, source.name).toEqual(expected);
    }
    // Grow retains its existing current-release comparison.
    const published = [
      { name: "Grow", path: "examples/grow/demo/application.dap.json", identifiers: "examples/grow/release-identifiers.json", release: DEMO_RELEASE, publisher: DEMO_PUBLISHER },
    ] as const;
    for (const source of published) {
      const bytes = new Uint8Array(await readFile(new URL(`../../../${source.path}`, import.meta.url)));
      const packet = readPublishedApplicationPackage2(bytes, source.release);
      expect(packet.ids.release, source.name).toBe(source.release);
      expect(packet.package.release.manifest.publisher, source.name).toBe(source.publisher);
      const expected = JSON.parse(await readFile(new URL(`../../../${source.identifiers}`, import.meta.url), "utf8"));
      expect({
        entry: packet.package.semantic.entry,
        definitions: packet.package.semantic.definitions.map(part => part.id).sort(),
        semantic: packet.ids.semantic,
        presentation: packet.ids.presentation,
      }, `${source.name}: published packet`).toEqual(expected);
    }

    // Match deployment rows to validated versioned packets without a second
    // identifiers baseline or a release/publisher constants module.
    const deployment = JSON.parse((await readFile(new URL("../../../apps/room/wrangler.lending.jsonc", import.meta.url), "utf8"))
      .replace(/^\s*\/\/.*$/gm, ""));
    const trust = readApplicationTrust(deployment.vars.APPLICATION_TRUST);
    const installed = [
      { name: "Lending", application: "ai.generalbusiness.lending", version: "0.3.0", path: "examples/lending/releases/0.3.0/application.dap.json", identifiers: "examples/lending/release-identifiers.json", config: "examples/lending/dap.application.json" },
      { name: "Lending", application: "ai.generalbusiness.lending", version: "0.4.0", path: "examples/lending/releases/0.4.0/application.dap.json", identifiers: "examples/lending/release-identifiers.json", config: "examples/lending/dap.application.json" },
      { name: "Lending", application: "ai.generalbusiness.lending", version: "0.5.0", path: "examples/lending/releases/0.5.0/application.dap.json", identifiers: "examples/lending/release-identifiers.json", config: "examples/lending/dap.application.json" },
      { name: "Counter", application: "ai.generalbusiness.counter", version: "0.4.0", path: "apps/counter/releases/0.4.0/application.dap.json", identifiers: "apps/counter/release-identifiers.json", config: "apps/counter/dap.application.json" },
      { name: "Counter", application: "ai.generalbusiness.counter", version: "0.5.0", path: "apps/counter/releases/0.5.0/application.dap.json", identifiers: "apps/counter/release-identifiers.json", config: "apps/counter/dap.application.json" },
      { name: "Counter", application: "ai.generalbusiness.counter", version: "0.6.0", path: "apps/counter/releases/0.6.0/application.dap.json", identifiers: "apps/counter/release-identifiers.json", config: "apps/counter/dap.application.json" },
    ];
    const packets = new Map<string, { source: typeof installed[number]; bytes: Uint8Array }>();
    for (const source of installed) {
      const bytes = new Uint8Array(await readFile(new URL(`../../../${source.path}`, import.meta.url)));
      const packet = readPublishedApplicationPackage2(bytes, null);
      expect(packet.package.release.manifest.name, source.path).toBe(source.application);
      expect(packet.package.release.manifest.version, source.path).toBe(source.version);
      expect(packets.has(packet.ids.release), "Each committed packet must name a distinct release").toBe(false);
      packets.set(packet.ids.release, { source, bytes });
    }
    expect(trust.map(row => row.release).sort(), "dap-lending must trust each committed packet exactly once")
      .toEqual([...packets.keys()].sort());
    expect(deployment.r2_buckets).toEqual([{ binding: "APPLICATION_CONTENT", bucket_name: "dap-lending-application-content" }]);
    for (const row of trust) {
      const committed = packets.get(row.release);
      if (!committed) expect.fail(`dap-lending trust row ${row.release} has no matching committed packet`);
      const { source, bytes } = committed;
      const packet = readPublishedApplicationPackage2(bytes, row.release);
      expect(packet.ids.release, source.name).toBe(row.release);
      expect(packet.package.release.manifest.publisher, source.name).toBe(row.publisher);
      expect(row.host, source.name).toBe("github.com");
      const authoredVersion = authoredVersions.get(source.name);
      if (authoredVersion === undefined) expect.fail(`${source.name} has no authored package version`);
      if (packet.package.release.manifest.version === authoredVersion) {
        const expected = JSON.parse(await readFile(new URL(`../../../${source.identifiers}`, import.meta.url), "utf8"));
        expect({
          entry: packet.package.semantic.entry,
          definitions: packet.package.semantic.definitions.map(part => part.id).sort(),
          semantic: packet.ids.semantic,
          presentation: packet.ids.presentation,
        }, `${source.name} ${authoredVersion}: signed identifiers differ from current source. Raise the version in ${source.config} and package.ts before changing a signed release.`).toEqual(expected);
      }
    }
  } finally { await rm(grow, { recursive: true }); }
});
