/** The normal pack path reproduces the reviewed source identifiers.
 * The public TEST signer reads no custody. No release signature is compared. */
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { secretSigner } from "@generalbusiness/dap-client";
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
    for (const source of sources) {
      const { packet } = await prepareApplicationDirectory(source.root, signer, { config: source.config });
      const expected = JSON.parse(await readFile(new URL(`../../../${source.identifiers}`, import.meta.url), "utf8"));
      expect({
        entry: packet.package.semantic.entry,
        definitions: packet.package.semantic.definitions.map(part => part.id).sort(),
        semantic: packet.ids.semantic,
        presentation: packet.ids.presentation,
      }, source.name).toEqual(expected);
    }
  } finally { await rm(grow, { recursive: true }); }
});
