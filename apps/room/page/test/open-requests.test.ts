import { expect, test } from "vitest";
import { digestBytes, keyIdOfSecret, scopeIdOf, timeOf, textDigest } from "@generalbusiness/dap-bytes";
import type { Digest, ScopeRef, ScopeKind } from "@generalbusiness/dap-contract";
import { sendableAt, type OriginalRow } from "@generalbusiness/dap-client";
import { act, type Room } from "../src/data.ts";
import { pressStop } from "../src/open-requests.ts";

// Invariant: a read that succeeded stops a press only for a row of this key at this scope. The room of `original-copy.scope.test.ts` opens work at one scope,
// so this case states the rule for a second partition over written rows. That file runs the rest on real scopes.
const digest = digestBytes(new Uint8Array([1, 2, 3]));
const scopeRef = (kind: ScopeKind, ordinal: number): ScopeRef => ({ scope: scopeIdOf({ v: 1, kind, definition: digest, creator: null, cause: digest, ordinal }), genesis: textDigest(`TEST genesis ${kind} ${ordinal}`) });
const key = keyIdOfSecret(new Uint8Array(32).fill(1)), other = keyIdOfSecret(new Uint8Array(32).fill(2));
const now = 1_800_000_000_000;
const row = (to: ScopeRef, actor = key, from = now + 300_000): OriginalRow => ({ digest: digestBytes(new Uint8Array([to.scope.length, from % 251])) as Digest, to, kind: "comment", on: null, actor, notAfter: timeOf(from) });
const partition = scopeRef("directory", 1), next = scopeRef("directory", 2), lane = scopeRef("lane", 3), elsewhere = scopeRef("lane", 4);
// The page holds both partitions from its last directory read.
const held = { key, directory: partition.scope, directoryIndex: { scope: partition, definition: "platform:directory@10" as const, partitions: [partition, next] } };

test("an opening act can go to another partition, so a row at one partition stops a press at the next", () => {
  expect(pressStop(held, [row(partition)], [], next, now)).toBe("locked");
  expect(pressStop(held, [row(partition)], [], lane, now)).toBeNull();
  expect(pressStop(held, [row(lane)], [], partition, now)).toBeNull();
});

test("only this key's row at this scope stops a press, and the margin and a draw decide how", () => {
  expect(pressStop(held, [], [], lane, now)).toBeNull();
  expect(pressStop(held, [row(lane, other)], [], lane, now)).toBeNull();
  expect(pressStop(held, [row(elsewhere)], [], lane, now)).toBeNull();
  const past = row(lane, key, now - 300_000);
  expect(now).toBeGreaterThanOrEqual(sendableAt(past.notAfter));
  expect(pressStop(held, [row(lane)], [row(lane)], lane, now)).toBe("locked");
  expect(pressStop(held, [past], [], lane, now)).toBe("unshown");
  expect(pressStop(held, [past], [past], lane, now)).toBeNull();
  expect(pressStop(held, [past, row(lane)], [past], lane, now)).toBe("locked");
});

// Invariant: the opening stop comes before the read of the open requests, so it holds no lock, and its words claim only this press. The earlier send can still arrive.
// The HTTP replies are SCRIPTED. The demo room's opening act went on past this line in a run, so `original-copy.scope.test.ts` does not reach it on real scopes.
test("an opening press that cannot find its partition speaks of this press and reads no lock", async () => {
  const directory: ScopeRef = { ...scopeRef("directory", 5) };
  const membership: ScopeRef = { ...scopeRef("membership", 6) };
  const asked: string[] = [];
  const repository = { id: 0, type: "repository", state: "open", revision: 1, opened: digest, attributed: [], parties: {}, refs: { membership }, values: {} };
  const head = { seq: 1, hash: digest };
  const room = { directory: directory.scope, directoryIndex: { scope: directory, definition: "platform:directory@10" }, membership, rules: directory.scope, destination: directory.scope, key, me: null, reader: null, unsessioned: "SCRIPTED", definitions: new Map(),
    session: { service: "https://room.test", secret: new Uint8Array(32).fill(1), now: () => now, fetch: async (url: string) => {
      const path = new URL(url).pathname;
      asked.push(path);
      if (path === `/v1/scopes/${directory.scope}`) return Response.json({ ok: true, complete: true, at: head, value: { scope: directory, status: "active", definition: "platform:directory@10", time: timeOf(now), items: [repository], counts: [] } });
      throw new Error("no reply to the query");
    } } } as unknown as Room;
  const stopped = await act(room, directory.scope, "open-issue", {}).then(() => "no stop", (error: Error) => error.message);
  expect(stopped).toMatch(/^Cannot open work: [a-z-]+\. This press sent nothing\.$/);
  expect(asked.some(path => path.endsWith("/originals") || path.endsWith("/acts"))).toBe(false);
});
