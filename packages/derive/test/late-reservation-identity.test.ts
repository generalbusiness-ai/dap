import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { holdCapability, judgeDelivery, validateDefinition } from "../src/index.ts";
import { arriving, created, deliver, keys, sent, t, valid, lateDefinition } from "./fixtures-entry.ts";

function declaration(platform: boolean, collision: boolean) {
  const data = { ...lateDefinition(true), name: platform ? "platform:late-collision" : "test.late-collision",
    capacity: { name: "whole-scope" as const, version: 1 as const }, capabilities: [{ name: "hold", version: 1 }], ...(platform ? { outcomes: {} } : {}) };
  const peer = { of: "also.board" as const, ref: { slot: "peer", from: { sender: true as const } } };
  data.receives["sample"]!.late!.then = { effects: [peer], sends: [{ tell: {
    to: { slot: "peer", of: "also.board" }, message: "other", fields: { value: { const: 21 } },
    result: { applied: [{ capability: { name: "hold", do: "license", with: {
      export: { const: 99 }, from: { none: true }, checkpoint: { const: "fixture" }, hold: { const: 0 }, instance: { const: "i" }, k: { const: 3 },
    } } }] },
  } }] };
  const cheap = structuredClone(data.receives["other"]!);
  cheap.message = "cheap"; cheap.effects = [peer]; cheap.sends = [{ tell: {
    to: { slot: "peer", of: "also.board" }, message: "other", fields: { value: { const: 21 } }, result: {},
  } }];
  data.receives[collision ? "sample.late.then" : "cheap-handler"] = cheap;
  return data;
}

test.each([false, true])("platform=%s: a real handler cannot overwrite a late body's native reservation identity", platform => {
  // Real validator, delivery/result judges, hold capability, fold and
  // MemoryState. Declarations, per-key grants and clock are fictional inputs;
  // these Directory-kind test roots prove no live install or provider authority.
  const data = declaration(platform, false), checked = validateDefinition(data, PROPOSED_BOUNDS, undefined, { platform });
  expect(checked.ok ? [] : checked.problems).toEqual([]);
  const definition = valid(checked), path = "receives.sample.late.then.sends.0";
  const quote = definition.reserving?.requests?.[path] ?? definition.pendingWorkAmounts.requests?.[path];
  expect(quote).toMatchObject({ records: 1 });
  const receiver = created(definition, {}, "receiver"), sender = created(definition, {}, "sender");
  sender.did(keys.rita, "emit", { on: 0, expected: { on: sender.item(0).revision }, fields: { to: receiver.at, first: 1, second: 2 } });
  receiver.now = t(31);
  expect(deliver(receiver, sender, 1, 0)).toMatchObject({ result: "write" });
  const deciding = receiver.last.seq;
  expect(receiver.state.request(deciding, 0)?.reservation).toMatchObject({ records: 1 });
  expect(deliver(sender, receiver, deciding, 0)).toMatchObject({ result: "write" });
  const { delivered, source } = sent(sender, sender.last.seq, 0);
  const result = judgeDelivery(receiver.state, definition, delivered, { ...arriving(receiver, delivered, source), capabilities: holdCapability({ tokensPerHold: 2, rootRetentionSeconds: 600 }) });
  expect(result).toMatchObject({ result: "write" });
  if (result.result !== "write") return;
  receiver.seal(result.draft);
  expect(receiver.state.record("hold@1", "receiver-pin", [99])).toMatchObject({ state: "standing", values: { k: 3, decided: 3 } });
  const ambiguous = declaration(platform, true), refused = validateDefinition(ambiguous, PROPOSED_BOUNDS, undefined, { platform });
  expect(refused.ok).toBe(false);
  if (!refused.ok) expect(refused.problems).toContainEqual(expect.objectContaining({ code: "handler-body-collision", path: "receives.sample.late.then" }));
  // The name itself stays valid when no replacement creates that identity.
  delete ambiguous.receives["sample"]!.late!.then;
  expect(validateDefinition(ambiguous, PROPOSED_BOUNDS, undefined, { platform }).ok).toBe(true);
});
