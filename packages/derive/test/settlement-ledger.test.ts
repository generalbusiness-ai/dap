/** Made-up marker/Works definitions and platform callbacks. Actual judges,
 * admission and fold must match a literal ledger after every command. */
import { expect, test } from "vitest";
import { SettlementFixture } from "./support/settlement-ledger-fixture.ts";
import { histories } from "./support/settlement-ledger-histories.ts";
import { SettlementLedger } from "./support/settlement-ledger-model.ts";

for (const [index, history] of histories.entries()) test(history.name, () => {
  const model = new SettlementLedger(history.family, history.capacity);
  const actual = new SettlementFixture(history.family, history.capacity, 100 + index);
  expect(history.commands.length).toBeLessThanOrEqual(20);
  expect(actual.snapshot()).toEqual(model.snapshot());
  for (const [step, command] of history.commands.entries()) {
    const expected = model.apply(command);
    expect(actual.run(command), `${step}: ${JSON.stringify(command)}`).toBe(expected);
    expect(actual.snapshot(), `${step}: ${JSON.stringify(command)}`).toEqual(model.snapshot());
  }
  expect(model.jobs.size).toBeGreaterThanOrEqual(2);
  expect(model.jobs.size).toBeLessThanOrEqual(3);
});
