/**
 * Authoring witnesses: typed helpers compile each definition to the
 * exact bytes its application pins. The pinned definitions are the
 * witnesses; nothing here is compared to a value these fixtures wrote.
 */
import { expect, test } from "vitest";
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/dap-bytes";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { readFileSync } from "node:fs";
const lendingData = JSON.parse(readFileSync(new URL("../../../examples/lending/definition.json", import.meta.url), "utf8")) as DeclaredDefinition;
import { LENDING_DEFINITION } from "../../../examples/lending/pin.ts";
const commitmentsData = JSON.parse(readFileSync(new URL("../../../apps/counter/commitments.json", import.meta.url), "utf8")) as DeclaredDefinition;
import { COUNTING_COMMITMENTS_DEFINITION } from "../../../apps/counter/commitments-pin.ts";
import { lendingSource as lending } from "../../../examples/lending/definition.ts";
import { countingCommitmentsSource as countingCommitments } from "../../../apps/counter/commitments.ts";
import { compile } from "../src/index.ts";

const witness = (built: Parameters<typeof compile>[0], pinned: DeclaredDefinition, pin: string) => {
  const { definition, digest, findings } = compile(built);
  expect(definition).toEqual(pinned);
  expect(digest).toBe(pin);
  expect(digest).toBe(definitionDigest(pinned));
  expect(findings).toEqual([]);
  const checked = validateDefinition(definition, PROPOSED_BOUNDS, RULE_PROFILES);
  expect(checked.ok ? [] : checked.problems).toEqual([]);
};

test("lending compiles to the pinned definition", () => witness(lending, lendingData, LENDING_DEFINITION));
test("the live Counter (counting commitments) compiles to the pinned definition", () => witness(countingCommitments, commitmentsData, COUNTING_COMMITMENTS_DEFINITION));

// ---------------------------------------------------------------- grow: canonical spelling

import { room as roomData } from "../../../examples/grow/room.ts";
import { site as siteData } from "../../../examples/grow/site.ts";
import { room } from "./fixtures/grow-room.ts";
import { growSite } from "./fixtures/grow-site.ts";
import { normalize } from "../src/index.ts";

/** Every path at which two JSON values differ, as `a.b[2].c`. */
function differences(a: unknown, b: unknown, at = ""): string[] {
  if (Array.isArray(a) && Array.isArray(b)) return a.length !== b.length ? [`${at} length ${a.length} vs ${b.length}`] : a.flatMap((x, i) => differences(x, b[i], `${at}[${i}]`));
  if (typeof a === "object" && a && typeof b === "object" && b && !Array.isArray(a) && !Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].flatMap((k) => differences((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], at ? `${at}.${k}` : k));
  }
  return JSON.stringify(a) === JSON.stringify(b) ? [] : [`${at}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`];
}

/** Reintroduce the exact old subject spellings without changing the current generator. */
function repeatedSubjects(definition: DeclaredDefinition, rows: readonly (readonly [string, string])[]): DeclaredDefinition {
  const copy = structuredClone(definition);
  for (const [path, subject] of rows) {
    let value: unknown = copy;
    for (const key of path.replace(/\[(\d+)\]/g, ".$1").split(".")) value = (value as Record<string, unknown>)[key];
    (value as Record<string, unknown>)["of"] = subject;
  }
  return copy;
}

test("the grow room compiles to the pinned definition in canonical spelling", () => {
  const { definition, findings } = compile(room);
  expect(findings).toEqual([]);
  expect(definition).toEqual(normalize(roomData));
  const checked = validateDefinition(definition, PROPOSED_BOUNDS, RULE_PROFILES);
  expect(checked.ok ? [] : checked.problems).toEqual([]);
});

test("the pinned grow room is canonical and the earlier spelling adds only twelve repeated subjects", () => {
  const paths = [
    "report-site.guards[0]",
    "set-vent.guards[2].anyOf[0][0]", "set-vent.guards[2].anyOf[1][0]",
    "set-fan.guards[2].anyOf[0][0]", "set-fan.guards[2].anyOf[1][0]",
    "set-heater.guards[2].anyOf[0][0]", "set-heater.guards[2].anyOf[1][0]",
    "bind-zone-devices.guards[0]", "hold.guards[0]", "authorize.guards[0]", "propose-restoration.guards[0]", "close-incident.guards[0]",
  ];
  const earlier = repeatedSubjects(roomData, paths.map(path => [`acts.${path}`, "on"] as const));
  const diffs = differences(earlier, normalize(earlier));
  expect(diffs.every((d) => d.endsWith('.of: "on" vs undefined'))).toBe(true);
  expect(diffs.map((d) => d.replace(/^acts\./, "").replace(/\.of: "on" vs undefined$/, ""))).toEqual(paths);
  expect(normalize(earlier)).toEqual(roomData);
  expect(normalize(roomData)).toEqual(roomData);
  expect(definitionDigest(normalize(earlier))).not.toBe(definitionDigest(earlier));
  expect(definitionDigest(normalize(roomData))).toBe(definitionDigest(roomData));
});

test("the grow site compiles to the exact pinned definition, given the room's pinned digest", () => {
  const roomPin = definitionDigest(roomData);
  const { definition, digest, findings } = compile(growSite(roomPin));
  expect(findings).toEqual([]);
  expect(definition).toEqual(siteData);
  expect(digest).toBe(definitionDigest(siteData));
  const checked = validateDefinition(definition, PROPOSED_BOUNDS, RULE_PROFILES);
  expect(checked.ok ? [] : checked.problems).toEqual([]);
});

// ---------------------------------------------------------------- lanes: row by row

import { acts as laneActs, items as laneItems, receives as laneReceives } from "./fixtures/lanes.ts";

const change = JSON.parse(readFileSync(new URL("../../../apps/room/lanes/definitions/change.json", import.meta.url), "utf8")) as typeof lendingData;

test("the rewritten change-lane rows preserve the complete pinned definition in canonical spelling", () => {
  // The witness rewrites a slice, so validate it in the complete pinned
  // definition rather than inventing a partial genesis or skipping checks.
  const complete = {
    ...change,
    items: { ...change.items, ...Object.fromEntries(laneItems.map((item) => [item.name, item.type])) },
    acts: { ...change.acts, ...laneActs },
    receives: { ...change.receives, ...laneReceives },
  };
  const definition = compile(complete).definition as typeof lendingData;
  const canonical = normalize(change);
  expect(definition).toEqual(canonical);
  for (const name of Object.keys(laneItems.reduce((o, i) => ({ ...o, [i.name]: 1 }), {}))) expect(definition.items[name], name).toEqual(change.items[name]);
  for (const name of Object.keys(laneActs)) expect(definition.acts[name], name).toEqual(canonical.acts[name]);
  for (const name of Object.keys(laneReceives)) expect(definition.receives[name], name).toEqual(canonical.receives[name]);
});

test("the pinned change lane is canonical and the earlier spelling adds only five repeated subjects", () => {
  const earlier = repeatedSubjects(change, [
    ["acts.ask-rules.sends[0].tell.to", "on"],
    ["acts.propose-manifest.sends[0].tell.to", "on"],
    ["acts.request-check.guards[2].equals.a", "also.earlier"],
    ["acts.request-check.guards[3].equals.a", "also.earlier"],
    ["acts.review-verdict.guards[4].equals.a", "also.earlier"],
  ]);
  const diffs = differences(earlier, normalize(earlier));
  expect(diffs).toEqual([
    'acts.ask-rules.sends[0].tell.to.of: "on" vs undefined',
    'acts.propose-manifest.sends[0].tell.to.of: "on" vs undefined',
    'acts.request-check.guards[2].equals.a.of: "also.earlier" vs undefined',
    'acts.request-check.guards[3].equals.a.of: "also.earlier" vs undefined',
    'acts.review-verdict.guards[4].equals.a.of: "also.earlier" vs undefined',
  ]);
  expect(normalize(earlier)).toEqual(change);
  expect(normalize(change)).toEqual(change);
  expect(definitionDigest(normalize(change))).toBe(definitionDigest(change));
});
