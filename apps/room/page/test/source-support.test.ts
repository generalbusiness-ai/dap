import { customListDefinition } from "./definition-corpus-data.ts";
import { expect, test } from "vitest";
import { definitionDigest, isRecord } from "@generalbusiness/dap-bytes";
import { change3, changeDemo3, MANIFEST_DIGESTS } from "@generalbusiness/dap-lanes";
import { knownLIST1, LIST1_DEFINITION_DIGESTS } from "../src/source-support.ts";

// Invariant: LIST1 eligibility requires both an adopted exact pin and those
// declaration bytes, never a name, similar fields or a custom digest. Pure Node
// boundary; native editor collection/freeze/unknown custody stays in its story.
test("LIST1 accepts exact supported declarations and rejects changed/custom or mismatched bytes", () => {
  expect(knownLIST1(change3, MANIFEST_DIGESTS.change)).toBe(true);
  expect(knownLIST1(changeDemo3, MANIFEST_DIGESTS.demo)).toBe(true);
  expect(knownLIST1(changeDemo3, MANIFEST_DIGESTS.change)).toBe(false);
  for (const [current, currentPin, recordedPin] of [[change3, MANIFEST_DIGESTS.change, LIST1_DEFINITION_DIGESTS.change], [changeDemo3, MANIFEST_DIGESTS.demo, LIST1_DEFINITION_DIGESTS.demo]] as const) {
    const earlier = structuredClone(current), ask = earlier.acts["ask-rules"]!.sends[0]!;
    if (!("tell" in ask) || !isRecord(ask.tell.to) || ask.tell.to["slot"] !== "rulesScope") throw Error("The retained ask-rules send must name rulesScope");
    ask.tell.to = { ...ask.tell.to, of: "on" };
    let restored = 1;
    for (const kind of ["request-check", "review-verdict"]) for (const guard of earlier.acts[kind]!.guards) {
      if (guard.of !== "also.earlier" || !("equals" in guard) || !("slot" in guard.equals.a)) continue;
      guard.equals.a = { slot: guard.equals.a.slot, of: "also.earlier" }; restored++;
    }
    expect(restored).toBe(4);
    expect(definitionDigest(earlier)).toBe(recordedPin);
    expect(currentPin).not.toBe(recordedPin);
    expect(knownLIST1(earlier, recordedPin)).toBe(true);
    expect(knownLIST1(earlier, currentPin)).toBe(false);
    expect(knownLIST1(current, recordedPin)).toBe(false);
  }
  const custom = customListDefinition();
  expect(knownLIST1(custom, MANIFEST_DIGESTS.demo)).toBe(false);
  expect(knownLIST1(custom, definitionDigest(custom))).toBe(false);
});
