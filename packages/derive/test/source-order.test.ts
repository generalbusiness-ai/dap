import { sourceArrival, sourceTime, sourceOnlyOne } from "./definition-corpus/general-creation-data.ts";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { newIncarnation } from "@generalbusiness/dap-bytes";
import { validateDefinition } from "../src/index.ts";
import { created, deliver, keys, t, sourceOrderDefinition, sourceOrderFixture } from "./fixtures-entry.ts";

test("source order applies increasing pairs and suppresses lower pairs only after a higher delivery applied", () => {
  for (const arrivals of [[[1, 0], [1, 1], [2, 0], [2, 1]], [[2, 1], [1, 0], [2, 0], [1, 1]]]) {
    const { sender, receiver } = sourceOrderFixture(), applied: number[][] = [], decisions: string[] = [];
    for (const [seq, n] of arrivals) {
      const result = deliver(receiver, sender, seq!, n!);
      expect(result).toMatchObject({ result: "write" });
      const input = receiver.last.input;
      expect(input.type).toBe("delivery");
      if (input.type === "delivery" && "decision" in input) {
        decisions.push(input.decision);
        expect(receiver.last.sends.at(-1)?.message).toMatchObject({ class: "result", outcome: input.decision });
      }
      if (input.type === "delivery" && "decision" in input && input.decision === "applied") applied.push([seq!, n!]);
    }
    expect(applied).toEqual(arrivals[0]![0] === 1 ? [[1, 0], [1, 1], [2, 0], [2, 1]] : [[2, 1]]);
    expect(decisions).toEqual(arrivals[0]![0] === 1 ? ["applied", "applied", "applied", "applied"] : ["applied", "superseded", "superseded", "superseded"]);
    expect(receiver.item(0).values["last"]).toBe(4);
    expect(receiver.state.sourceOrder(sender.at, "sample")).toMatchObject({ seq: 2, n: 1 });
    const before = receiver.entries.length;
    expect(deliver(receiver, sender, 2, 1)).toMatchObject({ result: "repeat" });
    expect(receiver.entries).toHaveLength(before);
    // Another handler and another source each have an independent frontier.
    expect(deliver(receiver, sender, 1, 2)).toMatchObject({ result: "write", draft: { input: { decision: "applied" } } });
    const other = created(sender.definition, {}, "other-sender");
    expect(receiver.state.sourceOrder(other.at, "sample")).toBeNull();
    other.did(keys.rita, "emit", { on: 0, expected: { on: other.item(0).revision }, fields: { to: receiver.at, first: 99, second: 100 } });
    expect(deliver(receiver, other, 1, 0)).toMatchObject({ result: "write", draft: { input: { decision: "applied" } } });
    expect(receiver.item(0).values["last"]).toBe(99);
    expect(receiver.state.sourceOrder(sender.at, "sample")).toMatchObject({ seq: 2, n: 1 });
    expect(receiver.state.sourceOrder({ ...sender.at, inc: newIncarnation(new Uint8Array(16).fill(2)) }, "sample")).toBeNull();
  }
});

test("arrival order stays available, and only a tell handler admits an exact order enum", () => {
  const arrival = structuredClone(sourceOrderDefinition); sourceArrival(arrival);
  const { sender, receiver } = sourceOrderFixture(arrival);
  for (const seq of [2, 1]) expect(deliver(receiver, sender, seq)).toMatchObject({ result: "write", draft: { input: { decision: "applied" } } });
  expect(receiver.item(0).values["last"]).toBe(1);
  expect(receiver.state.sourceOrder(sender.at, "sample")).toBeNull();
  for (const edit of [(d: DeclaredDefinition) => Reflect.set(d.receives["sample"]!, "order", ["source"]), (d: DeclaredDefinition) => { d.receives["sample"]!.class = "relate"; d.receives["sample"]!.copies = 1; }, (d: DeclaredDefinition) => Reflect.set(d.acts["emit"]!, "order", "source")]) {
    const invalid = structuredClone(sourceOrderDefinition); edit(invalid);
    const result = validateDefinition(invalid, PROPOSED_BOUNDS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.some(problem => problem.path.endsWith(".order"))).toBe(true);
  }
});

test("a handler reads time from its verified source entry, and an act cannot read the source operand", () => {
  const declaration = structuredClone(sourceOrderDefinition);
  sourceTime(declaration);
  const { receiver, sender } = sourceOrderFixture(declaration);
  receiver.now = t(60);
  expect(deliver(receiver, sender, 1)).toMatchObject({ result: "write", draft: { input: { decision: "applied" } } });
  expect(receiver.item(0).values["sampledAt"]).toBe(sender.entries[1]!.entry.time);
  expect(receiver.item(0).values["sampledAt"]).not.toBe(receiver.last.time);
  expect(receiver.last.uses.map(use => use.fact)).toContainEqual(sender.fact(1));
  declaration.acts["emit"]!.effects = [...declaration.acts["emit"]!.effects, { value: { slot: "sampledAt", from: { source: "time" } } }];
  expect(validateDefinition(declaration, PROPOSED_BOUNDS).ok).toBe(false);
});

test("a refused higher pair does not suppress a lower pair that can apply", () => {
  const declaration = structuredClone(sourceOrderDefinition);
  sourceOnlyOne(declaration);
  const { receiver, sender } = sourceOrderFixture(declaration);
  expect(deliver(receiver, sender, 2, 1)).toMatchObject({ result: "write", draft: { input: { decision: "refused", reason: { code: "guard-failed", name: "not-one" } } } });
  expect(receiver.state.sourceOrder(sender.at, "sample")).toBeNull();
  expect(deliver(receiver, sender, 1, 0)).toMatchObject({ result: "write", draft: { input: { decision: "applied" } } });
  expect(receiver.state.sourceOrder(sender.at, "sample")).toMatchObject({ seq: 1, n: 0 });
  expect(receiver.item(0).values["last"]).toBe(1);
});
