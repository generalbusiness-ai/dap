/** Maintained packages use the browser's actual native definition and contain
 * their screen resources. Scenarios use public TEST grants, no live room or
 * destination; queued Lending publication is not a provider effect. */
import { fileURLToPath } from "node:url";
import { rm } from "node:fs/promises";
import { expect, test } from "vitest";
import { isRecord } from "@generalbusiness/dap-bytes";
import { secretSigner } from "@generalbusiness/dap-client";
import { COUNTING_COMMITMENTS_DEFINITION } from "../../../apps/counter/commitments-pin.ts";
import { LENDING_DEFINITION } from "../../../examples/lending/pin.ts";
import { prepareApplicationDirectory, readApplicationScenario } from "../src/application-files.ts";
import { runApplicationScenario } from "../src/application-scenarios.ts";
import { prepareGrowCheck } from "../../../examples/grow/prepare-check.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
test("maintained Counter and Lending packages bind their current browser definition and own all screen resources", async () => {
  for (const [config, pin, steps, through] of [
    ["apps/counter/dap.application.json", COUNTING_COMMITMENTS_DEFINITION, 18, 10],
    ["examples/lending/dap.application.json", LENDING_DEFINITION, 14, 4],
  ] as const) {
    const prepared = await prepareApplicationDirectory(root, secretSigner(new Uint8Array(32).fill(254)), { config });
    const packet = prepared.packet;
    expect(packet.package.v).toBe(2);
    expect(Object.keys(packet.package.semantic.projections)).toEqual(["activity", "state"]);
    expect(packet.package.semantic.entry).toBe(pin);
    expect(packet.package.semantic.definitions.map(definition => definition.id)).toEqual([pin]);
    expect(packet.package.semantic.roles["agent"]).not.toContain(config.startsWith("apps/") ? "counting.control" : "lending.staff");
    const assets = new Map(packet.package.presentation.assets.map(asset => [asset.path, asset]));
    const text = (path: string) => Buffer.from(assets.get(path)!.bytes, "base64url").toString("utf8");
    const origin = "https://packages.test/room/installation/presentation/";
    const owned = (from: string, reference: string) => {
      expect(reference.startsWith("/")).toBe(false);
      const resolved = new URL(reference, origin + from);
      expect(resolved.href.startsWith(origin)).toBe(true);
      expect(assets.has(decodeURIComponent(resolved.href.slice(origin.length)))).toBe(true);
    };
    const html = text(packet.package.presentation.entry);
    for (const match of html.matchAll(/<(?:link|script)\b[^>]*(?:href|src)="([^"]+)"/g)) owned(packet.package.presentation.entry, match[1]!);
    for (const asset of assets.values()) if (asset.mediaType.startsWith("text/css")) {
      for (const match of text(asset.path).matchAll(/url\(["']?([^"')]+)["']?\)/g)) owned(asset.path, match[1]!);
    }
    for (const path of ["brand/dap-wordmark.svg", "brand/dap-wordmark-white.svg", "brand/fonts/LICENSE-OpenRunde.txt", "brand/fonts/LICENSE-SometypeMono.txt", "brand/fonts/LICENSE-Teletype33.txt"]) expect(assets.has(path)).toBe(true);
    expect(prepared.scenarios).toHaveLength(1);
    const result = await runApplicationScenario(packet, await readApplicationScenario(prepared.root, prepared.scenarios[0]!));
    expect(result.steps).toBe(steps); expect(result.replay.report).toMatchObject({ result: "consistent", target: { seq: through } });
    expect(result.projectionChecks).toBe(3);
    expect(result.ownerRecords).toEqual([]);
  }
});

// Invariant: maintained Grow reads use the actual Site/Room declarations,
// retain the complete 100-bench fixture, and separate current presence from activity.
test("maintained Grow declarations check durable presence and the complete room grid at native local heads", async () => {
  const root = await prepareGrowCheck();
  try {
    const prepared = await prepareApplicationDirectory(root, secretSigner(new Uint8Array(32).fill(254)));
    expect(prepared.packet.package.v).toBe(2);
    expect(prepared.packet.package.semantic.definitions).toHaveLength(2);
    for (const [path, steps, through, owners, projections] of [["site-scenario.json", 13, 6, 0, 4], ["fault-scenario.json", 222, 169, 8, 3]] as const) {
      const input = await readApplicationScenario(root, path);
      const result = await runApplicationScenario(prepared.packet, input);
      expect(result.steps).toBe(steps);
      expect(result.projectionChecks).toBe(projections);
      expect(result.replay.report).toMatchObject({ result: "consistent", target: { seq: through } });
      expect(result.ownerRecords).toEqual([]);
      expect(result.preparations).toBe(owners);
      expect(result.capabilityGrant?.authority ?? null).toBe(owners ? "scripted-parent-creation" : null);
      if (owners) {
        // With the same grant and target/sensor journey, no owner execution
        // means every command remains open and every outcome stays absent.
        if (!isRecord(input) || !Array.isArray(input["steps"])) throw Error("The maintained fixture must list steps.");
        const outcomeChecks = input["steps"].filter(step => isRecord(step) && isRecord(step["assert"]) && isRecord(step["assert"]["values"]) && Object.hasOwn(step["assert"]["values"], "outcome"));
        const steps = input["steps"].filter(step => isRecord(step) && !Object.hasOwn(step, "prepare") && !Object.hasOwn(step, "record") && !outcomeChecks.includes(step) && !(typeof step["retry"] === "string" && step["retry"].startsWith("answer-")));
        for (const check of outcomeChecks) if (isRecord(check) && isRecord(check["assert"])) steps.push({ assert: { item: check["assert"]["item"], values: { outcome: null }, refs: { outcomeAt: null } } });
        for (const step of input["steps"]) if (isRecord(step) && isRecord(step["record"])) steps.push({ record: { ...step["record"], state: "open", values: { decided: 0 } } });
        const unanswered = await runApplicationScenario(prepared.packet, { ...input, steps });
        expect(unanswered.preparations).toBe(0);
        expect(unanswered.ownerRecords).toEqual([]);
        expect(unanswered.capabilityGrant?.authority).toBe("scripted-parent-creation");
        expect(unanswered.replay.report).toMatchObject({ result: "consistent", target: { seq: through - owners } });
      }
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
