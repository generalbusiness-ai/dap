/**
 * Real destination@3 validator, judges, signatures, seal and fold in memory.
 * publicationJourney labels its creator, grants, observations and host replies
 * SCRIPTED. StandIn still scripts membership/read-session and HTTP authority;
 * neither this adapter nor the witness runs a Native Worker or a sealed floor.
 */
import { expect } from "vitest";
import { platform } from "@generalbusiness/dap-platform";
import { timeOf } from "@generalbusiness/dap-bytes";
import { keys } from "@generalbusiness/dap-derive/testing";
import { publicationJourney } from "../../../platform/test/support-publication-journey.ts";
import { StandIn } from "./standin.ts";

export function absenceDestination(stand: StandIn) {
  const named = "platform:destination@3";
  const native = platform(named);
  if (!native) throw Error("The absence witness needs the maintained destination@3");
  const journey = publicationJourney(native.data, named, native.rules);
  const ledger = journey.make();
  const sequence = ledger.own.sequence();
  if (!sequence) throw Error("The judged destination needs its admitted genesis");

  // Project already-judged bytes and derived items. Never hydrate an invented
  // state into Ledger, edit a sealed row, or use StandIn.append for this target.
  const served = { ref: ledger.at, sequence, definition: "platform:destination@3" as const,
    entries: ledger.entries, items: [...ledger.state.all().items],
    retained: new Map<string, string>(), final: [] };
  stand.scopes.set(ledger.at.scope, served);
  stand.destination = ledger.at;
  const directory = stand.scopes.get(stand.directory.scope);
  const repository = directory?.items[0];
  if (!directory || !repository) throw Error("The scripted directory needs its repository projection");
  directory.items[0] = { ...repository, refs: { ...repository.refs, destination: ledger.at } };

  function appendAt(milliseconds: number, key: string) {
    const previous = ledger.entries.at(-1)!;
    if (milliseconds < Date.parse(previous.entry.time)) throw Error("The witness must preserve the accepted clock floor");
    ledger.now = timeOf(milliseconds);
    const judged = ledger.act(keys.una, "read-token", {
      on: 0, expected: { on: ledger.item(0).revision }, fields: { hours: 1 }, idempotencyKey: key,
    }, { platform: journey.platform });
    if (judged.result !== "write") expect.fail(`The other signer's real destination act was not written: ${JSON.stringify(judged)}`);
    served.items = [...ledger.state.all().items];
    return { previous, sealed: ledger.entries.at(-1)! };
  }

  return { ledger, appendAt, otherSigner: keys.una.key };
}
