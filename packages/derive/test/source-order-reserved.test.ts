import { reservedOrderData, reservedArrivalData } from "./definition-corpus/general-creation-data.ts";
/** Native capability/judge/fold over MemoryState. Task source entries and
 * per-key grants are scripted fixture inputs, not object/provider authority. */
import { expect, test } from "vitest";
import { factRefOf } from "@generalbusiness/artroom-bytes";
import { capacityFull, holdCapability, judgeDelivery, ownerReservations, validateDefinition } from "../src/index.ts";
import { arriving, created, forged, keys, valid, PIN_BOUNDS } from "./fixtures-entry.ts";

test("suppressing a reserved export decision settles its pin, fits the reserved boundary and repeats without another debit", () => {
  for (const order of ["source", "arrival"] as const) {
    const owner = holdCapability({ tokensPerHold: 2, rootRetentionSeconds: 600 });
    const data = reservedOrderData(order);
    const definition = valid(validateDefinition(data, PIN_BOUNDS));
    const ledger = created(definition, { title: "A", opener: keys.rita.member }); ledger.bounds = PIN_BOUNDS;
    const second = ledger.did(keys.rita, "open-export", { fields: { title: "B", opener: keys.rita.member } }).seq;
    const task = { ...ledger.at, kind: "task" as const };
    for (const exported of [0, second]) expect(ledger.act(keys.rita, "license", { on: exported, expected: { on: ledger.item(exported).revision }, fields: { peer: task, export: exported } }, { capabilities: owner })).toMatchObject({ result: "write" });
    for (const [seq, exported] of [[101, second], [100, 0]] as const) {
      const send = { n: 0, to: ledger.at, message: { class: "request" as const, type: "tell" as const, body: { message: "export-license", fields: { export: exported, k: 2 } } } };
      const source = forged(task, seq, { type: "checkpoint", through: 0, state: definition.digest }, [send]);
      const arrival = { ...send, from: factRefOf(source.entry) }, context = { ...arriving(ledger, arrival, source), capabilities: owner, bounds: PIN_BOUNDS };
      const result = judgeDelivery(ledger.state, definition, arrival, context);
      expect(result).toMatchObject({ result: "write", draft: { settles: true, input: { decision: seq === 100 && order === "source" ? "superseded" : "applied" } } });
      if (result.result !== "write") throw Error("Expected the actual native deciding entry.");
      ledger.remember([{ ...source, fact: arrival.from }]); ledger.seal(result.draft);
      if (seq === 100) {
        expect(ledger.state.record("hold@1", "receiver-pin", [0])?.values["decided"]).toBe(2);
        const remaining = ownerReservations(owner, ledger.state, definition);
        expect(remaining.entries).toBe(2);
        const used = { entries: ledger.head.seq + 1, bytes: null, ...ledger.state.keyCounts() };
        expect(capacityFull(used, remaining, { ...PIN_BOUNDS, scopeEntries: used.entries + 2 })).toBeNull();
        expect(capacityFull(used, remaining, { ...PIN_BOUNDS, scopeEntries: used.entries + 1 })).toBe("scopeEntries");
        const count = ledger.entries.length;
        expect(judgeDelivery(ledger.state, definition, arrival, context)).toMatchObject({ result: "repeat" });
        expect(ledger.entries).toHaveLength(count);
        expect(ownerReservations(owner, ledger.state, definition)).toEqual(remaining);
      }
    }
  }
});

test("item-bound native handlers retain arrival semantics and refuse the unsupported source-order combination", () => {
  const data = reservedArrivalData();
  expect(validateDefinition(data, PIN_BOUNDS, undefined, { platform: true }).ok).toBe(true);
  data.receives["stop"]!.order = "source";
  const checked = validateDefinition(data, PIN_BOUNDS, undefined, { platform: true });
  expect(checked.ok).toBe(false);
  if (!checked.ok) expect(checked.problems.some(problem => problem.path === "receives.stop.order")).toBe(true);
});
