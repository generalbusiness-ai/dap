import { capacityLargeText, capacityLargeTextAgain, capacityWhole, capacityTwoSpans } from "../../derive/test/definition-corpus/replay-mutations-data.ts";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, entryHash, signIntent, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { created, keys, notesDefinition, on, variant } from "@generalbusiness/dap-derive/testing";
import { MemorySource, render, verify } from "../src/index.ts";
import { served } from "./world.ts";

// Real in-memory judges/fold/verifier; fixture grants are explicitly trusted
// as recorded. No native runtime, production membership or provider is claimed.
test("whole-scope replay counts escaped text once per digest and reports only the historical span whose later redaction lost its size", async () => {
  const definition = variant(notesDefinition.declared, capacityLargeText);
  const history = created(definition, {}, "capacity-redaction");
  const body = "é\n".repeat(5000), digest = textDigest(body);
  for (let n = 0; n < 2; n++) expect(history.act(keys.rita, "write", { ...on(history, 0), fields: { body: digest } }, { texts: () => utf8(body).length }).result).toBe("write");
  const entries = history.entries.reduce((bytes, { entry }) => bytes + utf8(canonicalize(entry)).length, 0);
  const limit = entries + utf8(canonicalize(definition.declared)).length + utf8(canonicalize(body)).length + PROPOSED_BOUNDS.entryBytes;
  const live = served(history, [history]);
  live.retained = [...live.retained!, { kind: "text", digest, bytes: canonicalize(body) }];
  const options = { mode: "replay", scope: history.at.scope, grants: "as-recorded", bounds: { ...PROPOSED_BOUNDS, scopeBytes: limit } } as const;
  const exact = await verify(new MemorySource([live]), options);
  expect([exact.report.result, exact.why, exact.report.incompleteBytes]).toEqual(["consistent", null, undefined]);
  const full = await verify(new MemorySource([live]), { ...options, bounds: { ...options.bounds, scopeBytes: limit - 1 } });
  expect([full.report.result, full.report.at?.seq, full.why]).toEqual(["mismatch", 2, "the entry exceeds scopeBytes: Used plus Reserved is over its ceiling"]);

  history.did(keys.rita, "strike", on(history, 0));
  const gone = await verify(new MemorySource([served(history, [history])]), options);
  expect([gone.report.result, gone.why, gone.report.coverage[0]?.through]).toEqual(["incomplete", "redacted size not retained", 3]);
  expect(gone.report.incompleteBytes).toEqual([{ scope: history.at, from: 1, through: 2, reason: "redacted size not retained" }]);
  expect(render(gone.report, gone.why)).toContain("entries, items, records and requests were still checked");
});

test("an unknown historical text size does not hide a later item-key overflow", async () => {
  const definition = variant(notesDefinition.declared, capacityLargeTextAgain);
  const history = created(definition, {}, "capacity-unknown-items");
  const body = "formerly retained";
  expect(history.act(keys.rita, "write", { ...on(history, 0), fields: { body: textDigest(body) } }, { texts: () => body.length }).result).toBe("write");
  history.did(keys.rita, "add-note");
  history.did(keys.rita, "strike", on(history, 0));
  const replayed = await verify(new MemorySource([served(history, [history])]), { mode: "replay", scope: history.at.scope, grants: "as-recorded", bounds: { ...PROPOSED_BOUNDS, scopeItems: 1 } });
  expect([replayed.report.result, replayed.report.at?.seq, replayed.why]).toEqual(["mismatch", 2, "the entry exceeds scopeItems: Used plus Reserved is over its ceiling"]);
  // The item mismatch stops before the later tombstone is checked: the
  // report must not claim that redaction has already been proved.
  expect(replayed.report.incompleteBytes).toEqual([{ scope: history.at, from: 1, through: 1, reason: "retained text unavailable" }]);
});


test("an anchored foreign entry still has to fit the opt-in receiver's retained-entry producer ceiling", async () => {
  const definition = variant(notesDefinition.declared, capacityWhole);
  const sender = created(notesDefinition, {}, "large-anchored-source"), receiver = created(definition, {}, "small-receiver");
  const body = "a";
  expect(sender.act(keys.rita, "write", { ...on(sender, 0), fields: { body: textDigest(body) } }, { texts: () => body.length }).result).toBe("write");
  // Hand-authored foreign copy, explicitly trusted at an exact anchor.
  // No claim is made for its sender's definition, admission or bounds.
  const copy = structuredClone(sender.last);
  if (copy.input.type !== "act") throw new Error("the foreign fixture must be an act");
  copy.input.signed = signIntent({ ...copy.input.signed.intent, fields: { body: textDigest(body), title: "x".repeat(PROPOSED_BOUNDS.entryBytes) } }, keys.rita.secret);
  const bytes = canonicalize(copy), hash = entryHash(copy), fact = { at: sender.at, seq: copy.seq, hash };
  expect(utf8(bytes).length).toBeGreaterThan(PROPOSED_BOUNDS.entryBytes);
  expect(receiver.act(keys.rita, "vouch", { ...on(receiver, 0), fields: {} }, { presented: { proof: fact }, facts: [{ fact, entry: copy, under: "notes" }] }).result).toBe("write");
  const source = new MemorySource([{ scope: receiver.at, entries: receiver.entries.map(({ entry, hash }) => ({ seq: entry.seq, hash, bytes: canonicalize(entry) })), retained: [
    { kind: "definition", digest: definition.digest, bytes: canonicalize(definition.declared) },
    { kind: "entry", digest: digestBytes(utf8(bytes)), bytes, under: "notes" },
  ] }]);
  const replayed = await verify(source, { mode: "replay", scope: receiver.at.scope, grants: "as-recorded", anchors: [{ scope: sender.at.scope, seq: copy.seq, hash }] });
  expect([replayed.report.result, replayed.report.at?.seq, replayed.why]).toEqual(["mismatch", 1, "a retained foreign entry exceeds its opt-in entryBytes producer ceiling"]);
});

test("a later missing body cannot erase the proved redaction reason of an earlier byte span", async () => {
  const definition = variant(notesDefinition.declared, capacityTwoSpans);
  const history = created(definition, {}, "two-byte-spans");
  const write = (item: number, body: string) => expect(history.act(keys.rita, "write", { ...on(history, item), fields: { body: textDigest(body) } }, { texts: () => body.length }).result).toBe("write");
  write(0, "redacted earlier");
  history.did(keys.rita, "strike", on(history, 0));
  const next = history.did(keys.rita, "add-note").seq;
  write(next, "missing later");
  const replayed = await verify(new MemorySource([served(history, [history])]), { mode: "replay", scope: history.at.scope, grants: "as-recorded" });
  expect([replayed.report.result, replayed.report.coverage[0]?.through]).toEqual(["incomplete", 4]);
  expect(replayed.report.incompleteBytes).toEqual([
    { scope: history.at, from: 1, through: 1, reason: "redacted size not retained" },
    { scope: history.at, from: 4, through: 4, reason: "retained text unavailable" },
  ]);
});
