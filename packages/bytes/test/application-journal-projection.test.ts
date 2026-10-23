import { journalProjectionDefinition as definition } from "./definition-corpus-data.ts";
/** Canonical signed tail fixtures, not native authority or whole replay. */
import { expect, test } from "vitest";
import type { Entry } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, entryHash, keyIdOfSecret, signIntent, textDigest, utf8 } from "../src/index.ts";
import { directory } from "./fixtures.ts";
import { bindApplicationProjection, applicationProjectionId, readApplicationProjection } from "../src/application-v2.ts";
import { projectApplicationQueryReads } from "../src/application-projection-read.ts";
import { applicationProjectionQueryDigest, readApplicationProjectionReply } from "../src/application-projection-wire.ts";
const scope = { ...directory, kind: "lane" as const }, secret = new Uint8Array(32).fill(71);

const projection = () => ({ v: 1, definition: definitionDigest(definition), revision: "revision", sources: { log: {
  read: "entries", acts: ["note", "observe"], window: 2, limit: 2, latestBy: null as string | null, fields: {
    room: { from: { kind: "field", name: "room" }, of: { type: "int", min: 0, max: 10 }, nullable: false },
    actor: { from: { kind: "signer", name: "member" }, of: { type: "member" }, nullable: true },
  },
} } });
function journal() {
  const entries: { seq: number; hash: ReturnType<typeof textDigest>; bytes: string }[] = [];
  let prev = textDigest("PUBLIC TEST prefix outside the declared tail");
  for (const seq of [4, 5]) {
    const entry: Entry = { v: 1, at: scope, seq, prev, time: "2026-10-18T12:00:00Z", clamped: false, epoch: 0, uses: [], prepared: [], effects: [], sends: [],
      input: { type: "act", signed: signIntent({ v: 1, to: scope, actor: keyIdOfSecret(secret), kind: seq === 4 ? "observe" : "note", on: seq === 4 ? null : 1, expected: {}, fields: { room: 1 },
        idempotencyKey: `PUBLIC-TEST-${seq}`, notAfter: "2026-10-18T12:01:00Z" }, secret), authority: [], presented: {} } };
    prev = entryHash(entry); entries.push({ seq, hash: prev, bytes: canonicalize(entry) });
  }
  return { scope, at: { seq: 5, hash: prev }, entries };
}
test("a declared complete tail retains exact entry facts, fields and latest selection", () => {
  const declaration = bindApplicationProjection(projection(), definition), read = journal();
  const data = projectApplicationQueryReads(declaration, definition, scope, {}, {}, { log: read });
  expect(data.at).toEqual(read.at);
  expect(data.sources["log"]!.map(row => ({ id: row.id, type: row.type, fields: row.fields, entry: row.entry, time: row.time, on: row.on }))).toEqual(read.entries.map(row => ({
    id: row.seq, type: row.seq === 4 ? "observe" : "note", fields: { room: 1, actor: null }, entry: { at: scope, seq: row.seq, hash: row.hash }, time: "2026-10-18T12:00:00Z", on: row.seq === 4 ? null : 1,
  })));
  expect(Object.isFrozen(data.sources["log"]![0]!.entry)).toBe(true);
  const query = { v: 1 as const, scope, directory, install: 7, projection: "activity", items: {} }, good = { ok: true, query: applicationProjectionQueryDigest(query), value: data };
  expect(readApplicationProjectionReply(utf8(canonicalize(good)), query)).toEqual(good);
  const row = data.sources["log"]![0]!;
  for (const changed of [{ ...row, entry: { ...row.entry!, seq: row.id + 1 } }, { ...row, state: "open" }, { ...row, time: "yesterday" }, { ...row, on: -1 }, { ...row, on: "2" }]) {
    expect(readApplicationProjectionReply(utf8(canonicalize({ ...good, value: { ...data, sources: { log: [changed] } } })), query)).toBeNull();
  }
  const latest = projection(); latest.sources.log.latestBy = "room";
  expect(projectApplicationQueryReads(latest, definition, scope, {}, {}, { log: read }).sources["log"]!.map(row => row.id)).toEqual([5]);
  expect(applicationProjectionId(declaration)).not.toBe(applicationProjectionId(readApplicationProjection(latest)));
  const last = projection(); last.sources.log.read = "latest-entry"; last.sources.log.limit = 1;
  expect(projectApplicationQueryReads(last, definition, scope, {}, {}, { log: read }).sources["log"]!.map(row => row.id)).toEqual([5]);
});
test("missing tail entries, corrupt hashes, insufficient row limits and schema drift refuse", () => {
  for (const changed of [
    { ...journal(), entries: journal().entries.slice(1) },
    { ...journal(), entries: journal().entries.slice().reverse() },
    { ...journal(), at: { ...journal().at, hash: textDigest("PUBLIC TEST wrong head") } },
    { ...journal(), entries: journal().entries.map((row, i) => i ? row : { ...row, hash: textDigest("PUBLIC TEST corrupt entry") }) },
  ]) expect(() => projectApplicationQueryReads(projection(), definition, scope, {}, {}, { log: changed })).toThrow();
  const limited = projection(); limited.sources.log.limit = 1;
  expect(() => projectApplicationQueryReads(limited, definition, scope, {}, {}, { log: journal() })).toThrow("incomplete");
  const unknown = projection(); unknown.sources.log.fields.room.from.name = "unknown";
  expect(() => bindApplicationProjection(unknown, definition)).toThrow("binding");
  const alias = projection(); alias.sources.log.latestBy = "missing";
  expect(() => readApplicationProjection(alias)).toThrow();
  const actor = projection(); actor.sources.log.latestBy = "actor";
  expect(() => projectApplicationQueryReads(actor, definition, scope, {}, {}, { log: journal() })).toThrow("incomplete");
});
