import { expect, test } from "vitest";
import { platform } from "@generalbusiness/dap-platform";
import { command, describe, heldActs, memoryStore, type DefinitionShape } from "../src/index.ts";
import { DEFINITION, DESTINATION, ENTRY_HASH, readRoom, REMOTE } from "./support/read-commands.ts";

// Invariant: `remote`, `show` and `acts` print the same lines with the same
// exit codes after their typed results arrive. The expected lines restate the
// words of the producers at main facb24f9 for the STAND-IN replies of
// support/read-commands.ts, so this file also passes on that commit.

test("remote prints its recorded repository, its placeholder URL, a missing record and a missing room as before", async () => {
  const published = await readRoom({ remote: REMOTE });
  expect(await command(published.ctx, ["remote"])).toEqual({ code: 0, lines: ["Host: artifacts", "Namespace: demo", "Name: r", `Remote URL: ${REMOTE}`] });
  const placeholder = await readRoom();
  expect(await command(placeholder.ctx, ["remote"])).toEqual({ code: 0, lines: ["Host: artifacts", "Namespace: demo", "Name: r",
    "Remote URL: https://<service host>/git/demo/r.git (the service host is the deployment's setting; dap clone prints it whole)"] });
  placeholder.script.repository = null;
  expect(await command(placeholder.ctx, ["remote"])).toEqual({ code: 1, lines: [`The destination ${DESTINATION.scope} records no repository.`] });
  expect(await command({ store: memoryStore() }, ["remote"])).toEqual({ code: 2, lines: ["No room is set up here. Run: dap install <base-url>, or dap join <link>."] });
});

test("show prints one entry with its computed hash, and its refusals and usage stops, as before", async () => {
  const room = await readRoom();
  expect(await command(room.ctx, ["show", "destination:5"])).toEqual({ code: 0, lines: [`${DESTINATION.scope}:5  2026-10-07T12:00:00Z  checkpoint; 0 effects, 0 sends; hash ${ENTRY_HASH}.`, "Effects: []."] });
  expect(await command(room.ctx, ["show", "destination"])).toEqual({ code: 2, lines: ["Name an entry as <scope>:<seq>, as log prints it."] });
  expect(await command(room.ctx, ["show", "nowhere:1"])).toEqual({ code: 2, lines: ["No scope named nowhere is known here. Name one of: directory, membership, rules, destination; or give a scope ID."] });
  room.script.entry = "not-found";
  expect(await command(room.ctx, ["show", "destination:5"])).toEqual({ code: 1, lines: ["Cannot read entry destination:5: not-found."] });
});

test("acts prints the held forms of a platform definition for an active member, as before", async () => {
  const room = await readRoom();
  const { acts, hidden } = heldActs(platform(DEFINITION)!.data as unknown as DefinitionShape, { handle: "@operator", role: "admin", actions: ["destination.adopt", "ledger.retry", "destination.read-token"] });
  expect(acts.length).toBeGreaterThan(0);
  expect(await command(room.ctx, ["acts", "destination"])).toEqual({ code: 0, lines: [
    `Acts on ${DESTINATION.scope} (${DEFINITION}) for @operator (admin):`,
    ...acts.map(([kind, act]) => `  ${describe(kind, act)}`),
    ...(hidden > 0 ? [`Not shown: ${hidden} that need an action your role does not hold.`] : []),
  ] });
});
