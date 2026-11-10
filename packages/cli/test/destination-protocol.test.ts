import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { supportsManifestListDestination, supportsOneFileDestination } from "../src/destination-protocol.ts";

/** Old CLI lists frozen before the platform query owner existed. */
const frozen = JSON.parse(readFileSync(new URL("../../platform/test/fixtures/version-questions-86179b0c.json", import.meta.url), "utf8")) as {
  rows: { pin: string; answers: { cliManifestListDestination: boolean; cliOneFileDestination: boolean } }[];
};

test.each(frozen.rows)("CLI protocols retain the independent old answers for $pin", row => {
  expect(supportsManifestListDestination(row.pin)).toBe(row.answers.cliManifestListDestination);
  expect(supportsOneFileDestination(row.pin)).toBe(row.answers.cliOneFileDestination);
});
