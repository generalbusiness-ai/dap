/**
 * NF-4 moved the install request and the installation read into `@generalbusiness/dap-client/install`, where each refusal is typed and
 * carries no words. MCP maps each refusal back to its words. `support/install-words-7ea170c9-c38bf62a.json` holds what MCP
 * returned before the move, for each case of `support/install-words.ts`: `node --import tsx` ran the same module in a checkout of
 * main 7ea170c9, and again at the cutover head c38bf62a. The answer words come from 7ea170c9. The scope references and fact hashes
 * come from c38bf62a, because the identifier cutover changes reference bytes on purpose. Real: `McpService`, the client's install request and installation read, and the public HTTPS Git reader.
 * STAND-IN: the room and the Git host of `support/install-room.ts`.
 */
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { installWords } from "./support/install-words.ts";

test("install_application and application_installation return byte for byte what they returned before the move", { timeout: 60_000 }, async () => {
  const before = readFileSync(new URL("./support/install-words-7ea170c9-c38bf62a.json", import.meta.url), "utf8");
  expect(`${JSON.stringify(await installWords(), null, 2)}\n`).toBe(before);
});
