/** Actual bridge/view-session histories over scripted parent, DOM and native
 * ports. The separate browser workflow owns rendered recovery and signing. */
import { afterEach, expect, test, vi } from "vitest";
import { CardHistoryFixture } from "./support/card-history-fixture.ts";
import { CardHistoryLedger } from "./support/card-history-ledger.ts";
import { cardHistories } from "./support/card-histories.ts";
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

for (const [index, history] of cardHistories.entries()) test(`${String(index).padStart(3, "0")} ${history.name}`, async () => {
  vi.useFakeTimers();
  const model = new CardHistoryLedger(), actual = new CardHistoryFixture();
  try {
    await actual.initialize();
    expect(actual.snapshot()).toEqual(model.snapshot());
    for (const [step, command] of history.commands.entries()) {
      model.apply(command); await actual.run(command);
      expect(actual.snapshot(), `${step}: ${JSON.stringify(command)}`).toEqual(model.snapshot());
    }
  } finally { await actual.finish(); }
});
