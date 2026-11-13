/**
 * NF-4 moved `declarationDigest` from `packages/mcp/src/catalogue.ts` into `src/install-request.ts`. The digest is the declaration
 * an install request expects of each trusted Rules pin, so it must not change with the move. Each value below is what
 * `declarationDigest` in `packages/mcp/src/catalogue.ts` computed at main 7ea170c9, before the move: `node --import tsx` ran it
 * in a checkout of that commit over the Rules pin of every MCP application room cohort.
 */
import { expect, test } from "vitest";
import type { PlatformDefinition } from "@generalbusiness/dap-contract";
import { VERSIONS, mcpApplicationRoomCohort, platform } from "@generalbusiness/dap-platform";
import type { DefinitionLike } from "../src/describe.ts";
import { declarationDigest } from "../src/install-request.ts";

const AT_7EA170C9: Record<string, string> = {
  "platform:rules@5": "sha256:bfe7108f746325fffac11325f0e8e30ceb9ae92e7f3cd4a012517752060cdfb4",
  "platform:rules@6": "sha256:f29404560669f33542c73b7113a441549183b2cd5d70d18b4f2e2f7779aa3a7f",
  "platform:rules@7": "sha256:a15fdb217e0e3018232997ddb957f04c58fdb9312ccc48ce0aab687d53d99180",
  "platform:rules@8": "sha256:17b74267f0d3ab4b15964b838d4b8a9c7d79baf19f52d31d0370e7f0a56c7477",
  "platform:rules@9": "sha256:70640a645994770c6fe23dd7a7f6d797bebf6f275fbad1b5157492e1c55cf21f",
  "platform:rules@10": "sha256:864e057e2940a44ec3c6f00ab074fcbe38c331fb24de4e5c0b55785ce7b9c4b7",
  "platform:rules@14": "sha256:de4234715aa5908bf9866dbc4ea989c14cfb74599422f495500e9b6ffb84ad7b",
};

test("the install request's declaration digest of each trusted Rules pin is the digest MCP computed before the move", () => {
  const pins = new Set<string>();
  for (const pin of Object.keys(VERSIONS)) { const cohort = mcpApplicationRoomCohort(pin as PlatformDefinition); if (cohort) pins.add(cohort.rules); }
  expect([...pins].sort()).toEqual(Object.keys(AT_7EA170C9).sort());
  for (const pin of pins) expect(declarationDigest(platform(pin as PlatformDefinition)!.data as unknown as DefinitionLike, "install-application", pin), pin).toBe(AT_7EA170C9[pin]);
});
