/**
 * Spike 2 witnesses: the v2 vocabulary compiles each definition to the
 * exact bytes its application pins. The pinned definitions are the
 * witnesses; nothing here is compared to a value this directory wrote.
 */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/dap-bytes";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { lending as lendingData } from "../../examples/lending/definition.ts";
import { LENDING_DEFINITION } from "../../examples/lending/pin.ts";
import { countingCommitments as commitmentsData } from "../../apps/counter/commitments.ts";
import { COUNTING_COMMITMENTS_DEFINITION } from "../../apps/counter/commitments-pin.ts";
import { lending } from "./lending.ts";
import { countingCommitments } from "./commitments.ts";
import { compile } from "./lib.ts";

const witness = (built: Parameters<typeof compile>[0], pinned: typeof lendingData, pin: string) => {
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

import { room as roomData } from "../../examples/grow/room.ts";
import { site as siteData } from "../../examples/grow/site.ts";
import { room } from "./grow-room.ts";
import { growSite } from "./grow-site.ts";
import { normalize } from "./lib.ts";

/** Every path at which two JSON values differ, as `a.b[2].c`. */
function differences(a: unknown, b: unknown, at = ""): string[] {
  if (Array.isArray(a) && Array.isArray(b)) return a.length !== b.length ? [`${at} length ${a.length} vs ${b.length}`] : a.flatMap((x, i) => differences(x, b[i], `${at}[${i}]`));
  if (typeof a === "object" && a && typeof b === "object" && b && !Array.isArray(a) && !Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].flatMap((k) => differences((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], at ? `${at}.${k}` : k));
  }
  return JSON.stringify(a) === JSON.stringify(b) ? [] : [`${at}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`];
}

test("the grow room compiles to the pinned definition in canonical spelling", () => {
  const { definition, findings } = compile(room);
  expect(findings).toEqual([]);
  expect(definition).toEqual(normalize(roomData));
  const checked = validateDefinition(definition, PROPOSED_BOUNDS, RULE_PROFILES);
  expect(checked.ok ? [] : checked.problems).toEqual([]);
});

test("the pinned grow room spells `of: \"on\"` where canonical form leaves it out, and nowhere else differs", () => {
  const diffs = differences(roomData, normalize(roomData));
  // Each difference is one `of: "on"` on a guard whose subject is the act's item.
  expect(diffs.every((d) => d.endsWith('.of: "on" vs undefined'))).toBe(true);
  expect(diffs.map((d) => d.replace(/^acts\./, "").replace(/\.of: "on" vs undefined$/, ""))).toEqual([
    "report-site.guards[0]",
    "set-vent.guards[2].anyOf[0][0]", "set-vent.guards[2].anyOf[1][0]",
    "set-fan.guards[2].anyOf[0][0]", "set-fan.guards[2].anyOf[1][0]",
    "set-heater.guards[2].anyOf[0][0]", "set-heater.guards[2].anyOf[1][0]",
    "bind-zone-devices.guards[0]", "hold.guards[0]", "authorize.guards[0]", "propose-restoration.guards[0]", "close-incident.guards[0]",
  ]);
  // The kernel reads both spellings alike, so only the digest differs.
  expect(definitionDigest(normalize(roomData))).not.toBe(definitionDigest(roomData));
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

import { readFileSync } from "node:fs";
import { acts as laneActs, items as laneItems, receives as laneReceives } from "./lanes.ts";
import { define } from "./lib.ts";

const change = JSON.parse(readFileSync(new URL("../../apps/room/lanes/definitions/change.json", import.meta.url), "utf8")) as typeof lendingData;

test("a slice of the change lane compiles to the pinned rows in canonical spelling", () => {
  const slice = define({ name: "change", genesis: "accept", items: laneItems, acts: laneActs, receives: laneReceives, capabilities: [{ name: "hold", version: 1 }, { name: "git-read", version: 1 }] });
  const definition = compile(slice).definition as typeof lendingData;
  const canonical = normalize(change);
  for (const name of Object.keys(laneItems.reduce((o, i) => ({ ...o, [i.name]: 1 }), {}))) expect(definition.items[name], name).toEqual(change.items[name]);
  for (const name of Object.keys(laneActs)) expect(definition.acts[name], name).toEqual(canonical.acts[name]);
  for (const name of Object.keys(laneReceives)) expect(definition.receives[name], name).toEqual(canonical.receives[name]);
});

test("the pinned change lane's spelling differs from canonical form in five places, each a subject named twice", () => {
  const diffs = differences(change, normalize(change));
  expect(diffs).toEqual([
    'acts.ask-rules.sends[0].tell.to.of: "on" vs undefined',
    'acts.propose-manifest.sends[0].tell.to.of: "on" vs undefined',
    'acts.request-check.guards[2].equals.a.of: "also.earlier" vs undefined',
    'acts.request-check.guards[3].equals.a.of: "also.earlier" vs undefined',
    'acts.review-verdict.guards[4].equals.a.of: "also.earlier" vs undefined',
  ]);
});

// ---------------------------------------------------------------- the manifest and the scenario

import { lendingPackage } from "./lending-package.ts";
import { lendingStory } from "./lending-story.ts";

test("the lending manifest, built from the definition value, is the pinned dap.application.json", () => {
  const pinned = JSON.parse(readFileSync(new URL("../../examples/lending/dap.application.json", import.meta.url), "utf8"));
  expect(lendingPackage).toEqual(pinned);
});

test("the lending story, run on the real judges, writes the pinned scenario file", async () => {
  const pinned = JSON.parse(readFileSync(new URL("../../examples/lending/scenarios/application.json", import.meta.url), "utf8"));
  expect(await lendingStory()).toEqual(pinned);
});
