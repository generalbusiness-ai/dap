/** SCRIPTED public journal entries: exercises the client reconstruction
 * boundary only, never native issuance, authority or owner settlement. */
import { expect, test } from "vitest";
import type { Entry, MemberRef, ScopeRef, Sealed } from "@generalbusiness/dap-contract";
import { entryHash, scopeIdOf } from "@generalbusiness/artroom-bytes";
import { openCommands } from "./command-journal.ts";
const scope: ScopeRef = { scope: scopeIdOf({ v: 1, kind: "lane", creator: null, cause: `sha256:${"2".repeat(64)}`, ordinal: 0, definition: `sha256:${"1".repeat(64)}` }), inc: "in_aaaaaaaaaaaaaaaaaaaaaaaaaa", kind: "lane" };
const owner: MemberRef = { membership: { ...scope, kind: "membership" }, member: "@sensors" };
function history(): Sealed[] {
  const result: Sealed[] = [];
  const append = (effects: unknown[]) => {
    const seq = result.length;
    // The fixture deliberately scripts both the entries and effects. It is
    // hashed as a public read would be; no judge, membership or grant runs.
    const entry: Entry = JSON.parse(JSON.stringify({ v: 1, at: scope, seq, prev: result.at(-1)?.hash ?? null, time: "2026-10-19T12:00:00Z", clamped: false, epoch: 0,
      input: { type: "timed", item: 0, rule: "TEST-scripted", due: "2026-10-19T12:00:00Z" }, uses: [], prepared: [], effects, sends: [] }));
    result.push({ entry, hash: entryHash(entry) });
  };
  const values = (seq: number) => ({ device: 8, kind: "heater", target: seq === 1 ? "on" : "off", level: seq === 1 ? 100 : 0, targetAt: seq, owner, decided: 0 });
  const record = (key: number, state: string, v: unknown) => ({ effect: "record", capability: "device-command@1", kind: "command", key: [key], state, values: v });
  append([]); append([record(1, "open", values(1))]); append([record(2, "open", values(2))]);
  append([{ effect: "value", item: 8, slot: "reported", value: "on" }]);
  append([record(1, "confirmed", { ...values(1), decided: 1, description: "TEST late closure", answerAt: 4 })]);
  return result;
}

test("complete public coverage keeps an old pending command until its own closure; gaps, stale heads, wrong ownership and limits never imply absence", () => {
  const journal = history(), at = (n: number) => ({ seq: n, hash: journal[n]!.hash });
  expect(openCommands(scope, owner, null, at(3), journal.slice(0, 4)).map(c => [c.fact.seq, c.target])).toEqual([[1, "on"], [2, "off"]]);
  expect(openCommands(scope, owner, null, at(4), journal).map(c => [c.fact, c.target])).toEqual([[{ at: scope, seq: 2, hash: journal[2]!.hash }, "off"]]);
  for (const suffix of [journal.slice(1), journal.slice(0, 4), [...journal.slice(0, 2), ...journal.slice(3)]]) expect(() => openCommands(scope, owner, null, at(4), suffix)).toThrow("coverage");
  expect(() => openCommands(scope, { ...owner, member: "@climate" }, null, at(4), journal)).toThrow("coverage");
  expect(() => openCommands(scope, owner, null, { seq: 4, hash: `sha256:${"0".repeat(64)}` }, journal)).toThrow("coverage");
  expect(() => openCommands(scope, owner, null, { seq: 800, hash: journal[4]!.hash }, [])).toThrow("coverage");
  // A claimed closed prefix ending at2 is false: the later closure of1
  // exposes it. No progress marker may hide that earlier pending command.
  expect(() => openCommands(scope, owner, { at: scope, ...at(2) }, at(4), journal.slice(3))).toThrow("coverage");
  const corrupted = structuredClone(journal); corrupted[3]!.entry.prev = journal[0]!.hash;
  expect(() => openCommands(scope, owner, null, at(4), corrupted)).toThrow("coverage");
});
