import { expect, test } from "vitest";
import type { Digest, ScopeRef, Seed, SequenceEntry } from "@generalbusiness/dap-contract";
import { canonicalize, factRefOf, intentDigest, newGenesisNonce, scopeIdOf, signIntent, textDigest } from "@generalbusiness/dap-bytes";
import { d, forged, keys, T0, t } from "@generalbusiness/dap-derive/testing";
import { applicationPublicationOrigin, sourceName, publishingLaneOrigin, publishingLaneAffiliation } from "../src/publishing-provenance.ts";
import { scriptedApplicationOrigin, scriptedOrigin } from "./fixtures-entry.ts";

test("supported change and issue pins acquire native names only through their authenticated native factories", () => {
  for (const name of ["change", "issue"] as const) {
    const native = scriptedOrigin(name), app = scriptedOrigin(name, "establish-application"), fake = scriptedOrigin(name, undefined, "declared:platform:directory");
    expect(sourceName(native.definition, name, native.origin)).toBe(name);
    expect(sourceName(app.definition, name, app.origin)).toBe(`declared:${name}`);
    expect(sourceName(fake.definition, name, fake.origin)).toBe(`declared:${name}`);
    expect(sourceName(native.definition, name, [native.origin[0]!])).toBeNull();
    const first = native.genesis;
    if (first.input.type !== "genesis") throw new Error("scripted origin has genesis");
    const seed = { ...first.input.seed, creator: null };
    // SCRIPTED: the same genesis with no creator and no source, admitted from its own bytes.
    const top = forged({ scope: scopeIdOf(seed), genesis: d("0") }, 0, { ...first.input, seed, source: null, sourceKind: null }, []);
    expect(sourceName(native.definition, name, [{ fact: factRefOf(top.entry, top.sequence.at), entry: top.entry, bytes: canonicalize(top.entry), under: name, sequence: top.sequence }])).toBe(`declared:${name}`);
  }
});

test("native publishing origin binds full Directory and destination incarnations and refuses missing closure", () => {
  const native = scriptedOrigin();
  expect(publishingLaneOrigin(native.from, native.directory, native.destination, native.origin)).toBe(true);
  const otherGenesis = textDigest("TEST genesis 31");
  expect(publishingLaneOrigin(native.from, { ...native.directory, genesis: otherGenesis }, native.destination, native.origin)).toBe(false);
  expect(publishingLaneOrigin(native.from, native.directory, { ...native.destination, genesis: otherGenesis }, native.origin)).toBe(false);
  expect(publishingLaneOrigin({ ...native.from, at: { ...native.from.at, genesis: otherGenesis } }, native.directory, native.destination, native.origin)).toBe(false);
  expect(publishingLaneOrigin(native.from, native.directory, native.destination, [native.origin[0]!])).toBe(false);
  expect(publishingLaneAffiliation(native.from, native.directory, native.destination, native.origin)).toBe(true);
  expect(publishingLaneAffiliation(native.from, { ...native.directory, genesis: otherGenesis }, native.destination, native.origin)).toBe(false);
  expect(publishingLaneAffiliation(native.from, native.directory, { ...native.destination, genesis: otherGenesis }, native.origin)).toBe(false);
});

test("application publication requires its own exact native Directory8 factory and treats missing immutable proof as pending", () => {
  // Coherent SCRIPTED immutable birth facts; actual Native admission is a Scope witness.
  const native = scriptedApplicationOrigin(), legacy = scriptedApplicationOrigin("platform:directory@5");
  expect(applicationPublicationOrigin(native.from, native.directory, native.destination, native.origin)).toBe(true);
  const noField = scriptedApplicationOrigin("platform:directory@8", false);
  expect(applicationPublicationOrigin(noField.from, noField.directory, noField.destination, noField.origin)).toBe(true);
  expect(applicationPublicationOrigin(legacy.from, legacy.directory, legacy.destination, legacy.origin)).toBe(false);
  expect(applicationPublicationOrigin(native.from, native.directory, native.destination, native.origin.slice(0, 2))).toBeNull();
  const other = textDigest("TEST genesis 31");
  expect(applicationPublicationOrigin(native.from, { ...native.directory, genesis: other }, native.destination, native.origin)).toBe(false);
  expect(applicationPublicationOrigin(native.from, native.directory, { ...native.destination, genesis: other }, native.origin)).toBe(false);
  expect(applicationPublicationOrigin(native.from, native.directory, native.destination,
    native.origin.map((copy, index) => index === 1 ? { ...copy, under: "declared:platform:directory" } : copy))).toBe(false);
  const change = scriptedOrigin();
  expect(applicationPublicationOrigin(change.from, change.directory, change.destination, change.origin)).not.toBe(true);
});

test("activated extension digests require the same authenticated native factory role rather than a catalog match", () => {
  // SCRIPTED pure proof shape. Actual activation/native admission is covered
  // by the existing real edit extension story, not claimed by these facts.
  for (const name of ["change", "issue"] as const) {
    const native = scriptedOrigin(name, undefined, undefined, d("f"));
    const app = scriptedOrigin(name, "establish-application", undefined, d("f"));
    expect(sourceName(native.definition, name)).toBeNull();
    expect(sourceName(native.definition, name, native.origin)).toBe(name);
    expect(sourceName(app.definition, name, app.origin)).toBe(`declared:${name}`);
    if (name === "change") expect(publishingLaneOrigin(native.from, native.directory, native.destination, native.origin)).toBe(true);
  }
});

test("an issue concern child keeps its authenticated parent's role only with exact self pin and inherited Directory proof", () => {
  // SCRIPTED pure add-concern shape; no native migration/factory run claimed.
  const parent = scriptedOrigin("issue");
  const signed = signIntent({ v: 1, to: parent.at, actor: keys.rita.key, kind: "add-concern", on: null,
    expected: {}, fields: { plan: 1, title: "Child", purpose: "Proof", role: "required", conditions: [] },
    idempotencyKey: "scripted-concern", notAfter: t(60) }, keys.rita.secret);
  const childOrigin = (definition: Digest = parent.definition, directory: ScopeRef = parent.directory, marker: object = { self: true }) => {
    const seed: Seed = { v: 1, kind: "lane", definition, creator: parent.at, cause: intentDigest(signed.intent), ordinal: 0 };
    const base: SequenceEntry = { v: 1, genesis: parent.at.genesis, seq: 3, prev: factRefOf(parent.genesis, parent.at).hash, time: T0, clamped: false, epoch: 0,
      input: { type: "act", signed, authority: [], presented: {} }, uses: [], prepared: [], effects: [], sends: [] };
    // Native creation retains the exact self marker; creationFields resolves
    // it to the parent act fact when the child judges its genesis.
    const message = { class: "request", type: "create", body: { directory,
      fields: { opener: keys.rita.member, title: "Child", conditions: [], origin: marker } } } as const;
    const creator: SequenceEntry = { ...base, sends: [{ n: 0, to: seed, message }] };
    // SCRIPTED: the child's genesis, made by hand and admitted from its own bytes.
    const child = forged({ scope: scopeIdOf(seed), genesis: d("0") }, 0, { type: "genesis", seed, nonce: newGenesisNonce(new Uint8Array(16).fill(21)), kind: "file", "founding": null,
      source: factRefOf(creator, parent.at), sourceKind: "lane", n: 0, message, decision: "applied" }, []);
    return [{ fact: factRefOf(child.entry, child.sequence.at), entry: child.entry, bytes: canonicalize(child.entry), under: "issue", sequence: child.sequence },
      { fact: factRefOf(creator, parent.at), entry: creator, bytes: canonicalize(creator), under: "issue", sequence: parent.sequence }, parent.origin[0]!];
  };
  const origin = childOrigin();
  expect(sourceName(parent.definition, "issue", origin)).toBe("issue");
  expect(sourceName(parent.definition, "issue", origin.slice(0, 2))).toBeNull();
  expect(sourceName(parent.definition, "issue", origin.map((copy, i) => i === 1 ? { ...copy, under: "declared:issue" } : copy))).toBe("declared:issue");
  // Each refused copy still hashes and sends coherently; only the named
  // creation invariant differs, rather than a broken entry digest.
  expect(sourceName(d("f"), "issue", childOrigin(d("f")))).toBe("declared:issue");
  expect(sourceName(parent.definition, "issue", childOrigin(parent.definition,
    { ...parent.directory, genesis: textDigest("TEST genesis 31") }))).toBe("declared:issue");
  expect(sourceName(parent.definition, "issue", childOrigin(parent.definition, parent.directory, { self: true, extra: true }))).toBe("declared:issue");
});
