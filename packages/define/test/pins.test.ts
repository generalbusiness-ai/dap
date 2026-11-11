/**
 * Authoring witnesses: typed helpers compile each definition to the
 * exact bytes its application pins. The pinned definitions are the
 * witnesses; nothing here is compared to a value these fixtures wrote.
 */
import { expect, test } from "vitest";
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest } from "@generalbusiness/dap-bytes";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { CURRENT_DEFINITION_PINS } from "./fixtures/current-definition-pins.ts";
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
  return { definition, digest };
};

const retained = (source: Parameters<typeof compile>[0], data: DeclaredDefinition, expected: (typeof CURRENT_DEFINITION_PINS)[keyof typeof CURRENT_DEFINITION_PINS]) => {
  const { definition } = witness(source, data, expected.pin);
  const bytes = canonicalize(definition);
  expect(Buffer.byteLength(bytes)).toBe(expected.bytes);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(expected.sha256);
};

test("lending compiles to the pinned definition", () => witness(lending, lendingData, LENDING_DEFINITION));
test("the live Counter (counting commitments) compiles to the pinned definition", () => witness(countingCommitments, commitmentsData, COUNTING_COMMITMENTS_DEFINITION));

// ---------------------------------------------------------------- grow: canonical spelling

const roomData = JSON.parse(readFileSync(new URL("../../../examples/grow/definitions/room.json", import.meta.url), "utf8")) as DeclaredDefinition;
const siteData = JSON.parse(readFileSync(new URL("../../../examples/grow/definitions/site.json", import.meta.url), "utf8")) as DeclaredDefinition;
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

test("the grow room compiles to the retained canonical bytes and pin", () => {
  retained(room, roomData, CURRENT_DEFINITION_PINS.room);
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
  expect(diffs.map((d) => d.replace(/^acts\./, "").replace(/\.of: "on" vs undefined$/, "")).sort()).toEqual([...paths].sort());
  expect(normalize(earlier)).toEqual(roomData);
  expect(normalize(roomData)).toEqual(roomData);
  expect(definitionDigest(normalize(earlier))).not.toBe(definitionDigest(earlier));
  expect(definitionDigest(normalize(roomData))).toBe(definitionDigest(roomData));
});

test("the grow site compiles to its retained bytes with the exact room parent pin", () => {
  retained(growSite(CURRENT_DEFINITION_PINS.room.pin), siteData, CURRENT_DEFINITION_PINS.site);
});

// ---------------------------------------------------------------- complete lanes

import { change as changeSource, issue as issueSource } from "./fixtures/lanes.ts";
const change = JSON.parse(readFileSync(new URL("../../../apps/room/lanes/definitions/change.json", import.meta.url), "utf8")) as DeclaredDefinition;
const issue = JSON.parse(readFileSync(new URL("../../../apps/room/lanes/definitions/issue.json", import.meta.url), "utf8")) as DeclaredDefinition;

test("the complete change author preserves the retained canonical bytes and pin", () => {
  retained(changeSource, change, CURRENT_DEFINITION_PINS.change);
});

test("the complete issue author preserves the retained canonical bytes and pin", () => {
  retained(issueSource, issue, CURRENT_DEFINITION_PINS.issue);
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
