/** The digest of one act of a real definition: what it covers, and what it leaves out.
 * Real definitions, the real package codec and real signatures. No scope, store or client runs here. */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { actDescriptorDigest, b64url, canonicalize, definitionDigest, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { packApplication, readApplicationPackage, secretSigner } from "../src/index.ts";

const load = (path: string): DeclaredDefinition => parseStrict(readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8")) as DeclaredDefinition;
const room = load("examples/grow/definitions/room.json");
const definitions = { grow: room, lending: load("examples/lending/definition.json"), counter: load("apps/counter/definition.json") } as const;

/** Each act of the definition, by kind. */
const digests = (definition: DeclaredDefinition): Record<string, string> =>
  Object.fromEntries(Object.keys(definition.acts).map(kind => [kind, actDescriptorDigest(definition, kind)]));
/** The kinds whose digests differ, sorted. */
const changed = (before: Record<string, string>, after: Record<string, string>): string[] =>
  Object.keys(before).filter(kind => before[kind] !== after[kind]).sort();
/** A copy of the definition with one edit made to it. */
function edited(definition: DeclaredDefinition, work: (value: any) => void): DeclaredDefinition {
  const value = structuredClone(definition); work(value); return value;
}

const signer = secretSigner(new Uint8Array(32).fill(7));
/** Pack the Counter definition at one version, and read its definition back through the package reader. */
async function released(version: string): Promise<{ definition: DeclaredDefinition; semantic: string; release: string }> {
  const source = definitions.counter, grants = [...new Set(Object.values(source.acts).map(act => act.grant))].sort();
  const packet = await packApplication({ name: "ai.generalbusiness.counter", version, semantic: {
    v: 1, entry: definitionDigest(source), definitions: [{ id: definitionDigest(source), bytes: canonicalize(source) }],
    host: { execution: "recorded-do", profiles: ["restricted@1"] }, projections: {}, capabilities: [], roles: { member: grants }, predecessor: null,
  }, presentation: { v: 1, entry: "index.html", assets: [
    { path: "index.html", mediaType: "text/html; charset=utf-8", bytes: b64url(utf8("<!doctype html><title>Counter</title>")) },
  ], descriptions: {} } }, signer);
  const read = readApplicationPackage(packet.bytes, packet.ids.release);
  return { definition: parseStrict(read.package.semantic.definitions[0]!.bytes) as DeclaredDefinition,
    semantic: read.ids.semantic, release: read.ids.release };
}

describe("the digest of one act", () => {
  test("a version-only release of the signed Counter package keeps each digest", async () => {
    const first = await released("0.5.0"), second = await released("0.5.1");
    // Only the version differs between the two releases: the release changes, the definition does not.
    expect(second.release).not.toBe(first.release);
    expect(second.semantic).toBe(first.semantic);
    expect(Object.keys(first.definition)).not.toContain("version");
    expect(digests(second.definition)).toEqual(digests(first.definition));
    expect(digests(first.definition)).toEqual(digests(definitions.counter));
  });

  test.each(Object.entries(definitions))("a renamed %s definition keeps each digest, and no definition holds a version", (_name, definition) => {
    expect(Object.keys(definition)).not.toContain("version");
    expect(digests(edited(definition, value => { value.name = "renamed"; }))).toEqual(digests(definition));
  });

  test("a change of one act changes that act and no act that shares no content", () => {
    const kinds = Object.keys(room.acts).sort(), before = digests(room);
    expect(kinds).toHaveLength(31);
    // A new field of `take-task`: item `task` is as written, so only this act changes.
    const field = digests(edited(room, value => { value.acts["take-task"].fields["note"] = { type: "bool", required: false }; }));
    expect(changed(before, field)).toEqual(["take-task"]);
    // A rule that three acts name.
    const rule = digests(edited(room, value => { value.rules["device-target"] += " or true"; }));
    expect(changed(before, rule)).toEqual(["set-fan", "set-heater", "set-vent"]);
    // An item type that three acts name.
    const item = digests(edited(room, value => { value.items["task"].max += 1; }));
    expect(changed(before, item)).toEqual(["offer-task", "report-task", "take-task"]);
  });

  test("the profile changes exactly the acts that name a rule", () => {
    const before = digests(room);
    const after = digests(edited(room, value => { value.profile.version += 1; }));
    const ruled = Object.entries(room.acts).filter(([, act]) => JSON.stringify(act).includes('"rule":')).map(([kind]) => kind).sort();
    expect(ruled).toContain("set-fan");
    expect(ruled).not.toContain("take-task");
    expect(ruled.length).toBeLessThan(Object.keys(room.acts).length);
    expect(changed(before, after)).toEqual(ruled);
  });

  test("a kind that the definition lacks has no digest", () => {
    expect(() => actDescriptorDigest(room, "no-such-act")).toThrow();
    expect(() => actDescriptorDigest(room, "__proto__")).toThrow();
  });
});
