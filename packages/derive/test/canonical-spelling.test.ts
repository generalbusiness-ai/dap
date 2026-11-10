import { readFileSync, readdirSync } from "node:fs";
import { expect, test } from "vitest";
import { canonicalize, definitionDigest } from "@generalbusiness/dap-bytes";
import { PROPOSED_BOUNDS, type DeclaredDefinition } from "@generalbusiness/dap-contract";
import { validateDefinition } from "../src/validate/index.ts";
import { normalizeDefinition } from "../src/validate/spelling.ts";
import { RULE_PROFILES } from "../src/rule/index.ts";
import { notes } from "./definition-corpus/fixture-data.ts";
import { shippedDefinitions } from "./definition-corpus/shipped.ts";
import { nativeDefinitions } from "./definition-corpus/native.ts";
import type { DefinitionCorpusRow } from "./definition-corpus/row.ts";
import { change, changeDemo, change3, changeDemo3, changeEvidence4, issueEvidence4 } from "../../../apps/room/lanes/src/index.ts";
import { changeJ4 } from "../../../apps/room/lanes/src/j4.ts";
import { changeFinding } from "../../../apps/room/lanes/src/change-finding.ts";
import { room } from "../../../examples/grow/room.ts";
import { site } from "../../../examples/grow/site.ts";
import { demoDefinitions } from "../../../examples/grow/demo-definitions.ts";

test("normalization omits only implied subjects and empty range filters, retaining range subjects and literal data", () => {
  const before = structuredClone(notes);
  before.acts["write"]!.guards = [
    { of: "on", equals: { a: { slot: "title", of: "on" }, b: { field: "title" } } },
    { of: "also.peer", equals: { a: { slot: "title", of: "also.peer" }, b: { slot: "title", of: "on" } } },
    { none: { type: "note", states: ["kept"], where: [], except: [] } },
    { none: { type: "note", states: ["kept"], where: [{ equals: { a: { slot: "title" }, b: { slot: "title", of: "on" } } }] } },
    { equals: { a: { const: { of: "on", where: [], except: [] } }, b: { const: { of: "on", where: [], except: [] } } } },
  ];
  const original = canonicalize(before);
  const after = normalizeDefinition(before);
  expect(after.acts["write"]!.guards).toEqual([
    { equals: { a: { slot: "title" }, b: { field: "title" } } },
    { of: "also.peer", equals: { a: { slot: "title" }, b: { slot: "title", of: "on" } } },
    { none: { type: "note", states: ["kept"] } },
    { none: { type: "note", states: ["kept"], where: [{ equals: { a: { slot: "title" }, b: { slot: "title", of: "on" } } }] } },
    { equals: { a: { const: { of: "on", where: [], except: [] } }, b: { const: { of: "on", where: [], except: [] } } } },
  ]);
  expect(canonicalize(before)).toBe(original);
  expect(normalizeDefinition(after)).toEqual(after);
  expect(definitionDigest(after)).not.toBe(definitionDigest(before));
});

test("nested guards keep distinct subjects while optional list and fact filters disappear and required has.where stays", () => {
  const before = structuredClone(notes), write = before.acts["write"]!;
  write.fields["peer"] = { type: "item", of: "note", required: true };
  write.fields["entries"] = { type: "list", of: { type: "item", of: "note" }, max: 8, required: true };
  write.fields["proof"] = { type: "fact", under: "notes", kind: ["write"], required: true };
  before.items["note"]!.refs["me"] = { fixed: false, required: false, to: { type: "item", of: "note" } };
  write.also = { peer: { item: "note", by: "peer" } };
  write.guards = [
    { of: "also.peer", anyOf: [
      [{ of: "on", state: ["kept"] }],
      [{ of: "also.peer", equals: { a: { slot: "title", of: "also.peer" }, b: { slot: "title", of: "on" } } }],
    ] },
    { of: "also.peer", each: { list: { field: "entries" }, as: "e", where: [], guards: [{ of: "on", state: ["kept"] }] } },
    { has: { list: { field: "entries" }, as: "e", where: [] } },
    { sameSet: { list: { field: "entries" }, as: "e", key: { element: "e" }, items: { type: "note", states: ["kept"], where: [], except: [] }, match: [] } },
    { of: "also.peer", fact: { field: "proof", where: [{ equals: { a: { field: "title" }, b: { slot: "title", of: "also.peer" } } }] } },
    { fact: { field: "proof", where: [] } },
    { of: "also.peer", each: { list: { field: "entries" }, as: "e", where: [{ equals: { a: { slot: "title", of: "also.peer" }, b: { slot: "title", of: "on" } } }], guards: [] } },
    { sameSet: { list: { field: "entries" }, as: "e", key: { element: "e" }, items: { type: "note", states: ["kept"] }, match: [
      { equals: { a: { slot: "title" }, b: { slot: "title", of: "on" } } },
      { equals: { a: { field: "proof", part: { of: { set: { item: { slot: "me" }, slot: "title" } }, then: "seq" } }, b: { field: "proof", part: { of: { set: { item: { slot: "me", of: "also.peer" }, slot: "title" } }, then: "seq" } } } },
    ] } },
    { of: "also.peer", equals: { a: { field: "proof", part: { of: { set: { item: { slot: "me", of: "also.peer" }, slot: "title" } }, then: "seq" } }, b: { const: 0 } } },
  ];
  before.receives["inspect"] = {
    message: "inspect", class: "tell", from: { kind: "lane" }, opens: null,
    fields: { peer: { type: "item", of: "note", required: true }, title: { type: "text", max: 40, required: true } },
    also: { peer: { item: "note", by: "peer" } },
    guards: [{ of: "also.peer", equals: { a: { source: { set: { item: { slot: "me", of: "also.peer" }, slot: "title" } } }, b: { field: "title" } } }],
    effects: [], sends: [], attention: [],
  };
  const after = normalizeDefinition(before);
  expect(after.acts["write"]!.guards).toEqual([
    { of: "also.peer", anyOf: [
      [{ of: "on", state: ["kept"] }],
      [{ equals: { a: { slot: "title" }, b: { slot: "title", of: "on" } } }],
    ] },
    { of: "also.peer", each: { list: { field: "entries" }, as: "e", guards: [{ of: "on", state: ["kept"] }] } },
    { has: { list: { field: "entries" }, as: "e", where: [] } },
    { sameSet: { list: { field: "entries" }, as: "e", key: { element: "e" }, items: { type: "note", states: ["kept"] } } },
    { of: "also.peer", fact: { field: "proof", where: [{ equals: { a: { field: "title" }, b: { slot: "title" } } }] } },
    { fact: { field: "proof" } },
    { of: "also.peer", each: { list: { field: "entries" }, as: "e", where: [{ equals: { a: { slot: "title" }, b: { slot: "title", of: "on" } } }], guards: [] } },
    { sameSet: { list: { field: "entries" }, as: "e", key: { element: "e" }, items: { type: "note", states: ["kept"] }, match: [
      { equals: { a: { slot: "title" }, b: { slot: "title", of: "on" } } },
      { equals: { a: { field: "proof", part: { of: { set: { item: { slot: "me" }, slot: "title" } }, then: "seq" } }, b: { field: "proof", part: { of: { set: { item: { slot: "me", of: "also.peer" }, slot: "title" } }, then: "seq" } } } },
    ] } },
    { of: "also.peer", equals: { a: { field: "proof", part: { of: { set: { item: { slot: "me" }, slot: "title" } }, then: "seq" } }, b: { const: 0 } } },
  ]);
  expect(after.receives["inspect"]!.guards).toEqual([
    { of: "also.peer", equals: { a: { source: { set: { item: { slot: "me" }, slot: "title" } } }, b: { field: "title" } } },
  ]);
  for (const declaration of [before, after]) {
    const checked = validateDefinition(declaration, PROPOSED_BOUNDS, RULE_PROFILES);
    expect(checked.ok ? [] : checked.problems).toEqual([]);
    if (checked.ok) expect(checked.definition.digest).toBe(definitionDigest(declaration));
  }
  const refused = validateDefinition(before, PROPOSED_BOUNDS, RULE_PROFILES, { canonical: true });
  expect(refused.ok ? [] : refused.problems).toEqual([
    { code: "shape", path: "", message: "must omit redundant subjects and empty optional filters in canonical mode" },
  ]);
  const accepted = validateDefinition(after, PROPOSED_BOUNDS, RULE_PROFILES, { canonical: true });
  expect(accepted.ok ? [] : accepted.problems).toEqual([]);
  expect(normalizeDefinition(after)).toEqual(after);
});

// These exact signed declarations are recorded inputs, not current generators.
// Their original spelling, bytes, signatures and raw digests remain authoritative.
const recordedExclusions = new Map([
  ["retained Grow demo packet/Room", "The signed deployed Room declaration and its archive/simulator histories retain b89e7f84 until the identifier cutover."],
  ["retained Grow demo packet/Site", "The signed deployed Site declaration retains d2bc830e and its old Room dependency until the identifier cutover."],
]);

test("every pinned and generated application and native declaration has canonical spelling except the two recorded Grow packet declarations", async () => {
  const demo = demoDefinitions();
  const current = { change, changeDemo, change3, changeDemo3, changeEvidence4: changeEvidence4(definitionDigest(issueEvidence4)), changeJ4, changeFinding, room, site, demoRoom: demo.room, demoSite: demo.site };
  expect(Object.keys(current)).toHaveLength(11);
  const generated: DefinitionCorpusRow[] = Object.entries(current).map(([name, declaration]) => ({
    name: `current generator/${name}`, origins: [name], declaration: () => declaration, bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES,
  }));
  const directory = new URL("../../../apps/room/lanes/definitions/", import.meta.url);
  const pinned: DefinitionCorpusRow[] = readdirSync(directory).filter(name => name.endsWith(".json")).map(name => ({
    name: `all lane pins/${name}`, origins: [`apps/room/lanes/definitions/${name}`],
    declaration: (): unknown => JSON.parse(readFileSync(new URL(name, directory), "utf8")), bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES,
  }));
  const failures: unknown[] = [], excluded: string[] = [];
  for (const row of [...shippedDefinitions, ...nativeDefinitions, ...generated, ...pinned]) {
    const declaration = await row.declaration();
    const checked = validateDefinition(declaration, row.bounds, row.profiles, row.options);
    if (!checked.ok) { failures.push({ name: row.name, problems: checked.problems }); continue; }
    const raw = canonicalize(declaration);
    if (row.expectedDigest !== undefined && checked.definition.digest !== row.expectedDigest) failures.push({ name: row.name, digest: checked.definition.digest, expected: row.expectedDigest });
    const exclusion = recordedExclusions.get(row.name);
    if (exclusion !== undefined) {
      excluded.push(row.name);
      expect(exclusion).not.toBe("");
      expect(checked.definition.digest).toBe(definitionDigest(declaration as DeclaredDefinition));
      expect(canonicalize(checked.definition.declared)).toBe(raw);
      expect(validateDefinition(declaration, row.bounds, row.profiles, { ...row.options, canonical: true }).ok, row.name).toBe(false);
      continue;
    }
    const canonical = validateDefinition(declaration, row.bounds, row.profiles, { ...row.options, canonical: true });
    if (!canonical.ok) failures.push({ name: row.name, problems: canonical.problems });
    const normalized = normalizeDefinition(checked.definition.declared);
    if (canonicalize(normalized) !== raw) failures.push({ name: row.name, reason: "redundant subject or empty range filter" });
    expect(definitionDigest(normalized), row.name).toBe(checked.definition.digest);
  }
  expect(excluded.sort()).toEqual([...recordedExclusions.keys()].sort());
  expect(failures).toEqual([]);
});
