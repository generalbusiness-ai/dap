import { clockDefinition } from "./definition-corpus-data.ts";
/** Node SQLite and the real native commit/replay code. Explicit local grants
 * and unjudged membership/destination references are stand-ins, not enrollment. */
import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type DeclaredDefinition, type MemberRef, type ScopeKind, type ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, definitionDigest, newIncarnation, scopeIdOf, utf8 } from "@generalbusiness/artroom-bytes";
import { packApplication, secretSigner, signedIntent } from "@generalbusiness/artroom-client";
import { verify, type HistorySource } from "@generalbusiness/artroom-replay";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { LocalApplicationScope } from "../src/application-local.ts";

const time = "2026-10-18T12:00:00Z", now = Date.parse(time);
const signer = secretSigner(new Uint8Array(32).fill(31)), other = secretSigner(new Uint8Array(32).fill(32));
function reference(kind: ScopeKind): ScopeRef {
  return { scope: scopeIdOf({ v: 1, kind, definition: `sha256:${"0".repeat(64)}`, creator: null, cause: `sha256:${"1".repeat(64)}`, ordinal: 0 }), inc: newIncarnation(new Uint8Array(16).fill(2)), kind };
}
const membership = reference("membership"), member: MemberRef = { membership, member: "@local" }, second: MemberRef = { membership, member: "@second" };
async function packet(kind: "counter" | "lending") {
  const path = kind === "counter" ? "../../../apps/counter/definition.json" : "../../../examples/lending/definition.json";
  const definition: DeclaredDefinition = JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
  return declarationPacket(definition, kind);
}
async function declarationPacket(definition: DeclaredDefinition, name: string) {
  const id = definitionDigest(definition);
  return packApplication({ name: `ai.generalbusiness.${name}`, version: "0.1.0", semantic: { v: 1, entry: id, definitions: [{ id, bytes: canonicalize(definition) }],
    host: { execution: "recorded-do", profiles: ["restricted@1"] }, projections: {}, capabilities: [], roles: {}, predecessor: null },
    presentation: { v: 1, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: b64url(utf8("<title>local fixture</title>")) }], descriptions: {} } }, signer);
}

test("local Counter uses native SQLite commits, explicit actor grants, exact retries and replay", async () => {
  const founding = await signedIntent(signer, { to: null, kind: "found", fields: { opener: member, target: 10 } }, { now });
  const actors = [{ key: signer.key, member, actions: ["counting.control", "counting.join"] }, { key: other.key, member: second, actions: [] }];
  const scope = await LocalApplicationScope.found(await packet("counter"), founding, actors, time);
  try {
    expect(scope.state.item(0)).toMatchObject({ type: "configuration", values: { target: 10 } });
    const initialize = await signedIntent(signer, { to: scope.at, kind: "initialize", expected: { configuration: scope.state.item(0)!.revision } }, { now });
    const accepted = await scope.submit(initialize);
    expect(accepted).toMatchObject({ answer: "accepted" });
    const head = scope.state.scope()!.head;
    expect(await scope.submit(initialize)).toEqual(accepted);
    expect(scope.state.scope()!.head).toEqual(head);
    // Changing caller-owned grant input after setup cannot widen the held list.
    actors[1]!.actions.push("counting.join");
    const denied = await signedIntent(other, { to: scope.at, kind: "join" }, { now });
    expect(await scope.submit(denied)).toMatchObject({ answer: "refused", reason: "unauthorized" });
    expect(scope.state.scope()!.head).toEqual(head);
    const join = await signedIntent(signer, { to: scope.at, kind: "join" }, { now });
    expect(await scope.submit(join)).toMatchObject({ answer: "accepted" });
    expect(scope.state.count("participant", "joined")).toBe(1);
    const replay = await scope.replay();
    expect(replay.report.mode).toBe("replay");
    expect([replay.report.result, replay.why]).toEqual(["consistent", null]);
    expect(replay.report.trusts.join(" ")).toContain("authority");
    expect(replay.report.target).toMatchObject({ at: scope.at, ...scope.state.scope()!.head });
  } finally { scope.close(); }
  expect(() => scope.at).toThrow("closed"); scope.close();
});

test("advancing local time runs a due native transition and its resulting history replays", async () => {
  const definition = clockDefinition();
  const checked = validateDefinition(definition, PROPOSED_BOUNDS, RULE_PROFILES);
  expect(checked.ok ? [] : checked.problems).toEqual([]);
  const founding = await signedIntent(signer, { to: null, kind: "found" }, { now });
  const scope = await LocalApplicationScope.found(await declarationPacket(definition, "clock-fixture"), founding, [{ key: signer.key, member, actions: ["clock.schedule"] }], time);
  try {
    const schedule = await signedIntent(signer, { to: scope.at, kind: "schedule", fields: { until: "2026-10-18T12:01:00Z" } }, { now });
    expect(await scope.submit(schedule)).toMatchObject({ answer: "accepted" });
    const notice = scope.state.page("notice", ["waiting"], null, 1).items[0]!.id;
    const head = scope.state.scope()!.head;
    await scope.advance("2026-10-18T12:00:59Z");
    expect(scope.state.item(notice)?.state).toBe("waiting"); expect(scope.state.scope()!.head).toEqual(head);
    await scope.advance("2026-10-18T12:01:00Z");
    expect(scope.state.item(notice)?.state).toBe("done"); expect(scope.state.scope()!.head.seq).toBe(head.seq + 1);
    const replay = await scope.replay(); expect([replay.report.mode, replay.report.result, replay.why]).toEqual(["replay", "consistent", null]);
  } finally { scope.close(); }
});

test("local Lending runs restricted rules and journals sends without executing destination effects", async () => {
  const founding = await signedIntent(signer, { to: null, kind: "found", fields: { opener: member, destination: reference("destination") } }, { now });
  const scope = await LocalApplicationScope.found(await packet("lending"), founding, [{ key: signer.key, member, actions: ["lending.member"] }], time);
  try {
    const request = async (page: string) => signedIntent(signer, { to: scope.at, kind: "donate", expected: { library: scope.state.item(0)!.revision },
      fields: { name: "Pot", description: "Copper", page, content: "A signed page" } }, { now });
    expect(await scope.submit(await request("README.md"))).toMatchObject({ answer: "refused", reason: "guard-failed" });
    expect(await scope.submit(await request("shelf/0123456789abcdef.md"))).toMatchObject({ answer: "accepted" });
    expect(scope.state.count("thing", "available")).toBe(1);
    expect((await scope.replay()).report.result).toBe("consistent");
    const page = await scope.source.page(scope.at.scope, 0, { bytes: 100_000, entries: 10 });
    expect(page.ok && JSON.parse(page.page.entries.at(-1)!.bytes).sends).toHaveLength(1);
    await expect(scope.advance("2026-10-18T11:59:59Z")).rejects.toThrow("monotonically");
    await scope.advance("2026-10-18T12:01:00Z");
    expect((await scope.replay()).report.result).toBe("consistent");
  } finally { scope.close(); }
});

test("replay reads the actual retained source and refuses altered history or missing definitions", async () => {
  const founding = await signedIntent(signer, { to: null, kind: "found", fields: { opener: member, target: 10 } }, { now });
  const scope = await LocalApplicationScope.found(await packet("counter"), founding, [], time);
  try {
    const altered: HistorySource = { ...scope.source, page: async (...args) => {
      const page = await scope.source.page(...args);
      return page.ok ? { ...page, page: { ...page.page, entries: page.page.entries.map(entry => ({ ...entry, bytes: entry.bytes.replace('"target":10', '"target":11') })) } } : page;
    } };
    expect((await verify(altered, { mode: "replay", scope: scope.at.scope, grants: "as-recorded" })).report.result).toBe("mismatch");
    const absent: HistorySource = { ...scope.source, retained: async () => ({ ok: false, reason: "not-found" }) };
    expect((await verify(absent, { mode: "replay", scope: scope.at.scope, grants: "as-recorded" })).report.result).not.toBe("consistent");
    expect(await scope.source.page(scope.at.scope, 0, { bytes: 1, entries: 1 })).toEqual({ ok: false, reason: "too-large" });
  } finally { scope.close(); }
});
