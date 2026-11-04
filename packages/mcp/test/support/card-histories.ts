import { CardHistoryLedger, type CardCommand } from "./card-history-ledger.ts";

export type CardHistory = { name: string; commands: CardCommand[] };
export const cardHistories: CardHistory[] = [
  { name: "late complete read keeps its original and replays without signing", commands: [
    { kind: "open", view: "v1" }, { kind: "begin", delay: "result", result: "complete" }, { kind: "timeout" },
    { kind: "read" }, { kind: "release" }, { kind: "duplicate" }, { kind: "read" }, { kind: "refresh" },
    { kind: "exact", result: "complete" }, { kind: "close" }, { kind: "probe-closed" },
  ] },
  { name: "truncated read needs an explicit new read before complete replay", commands: [
    { kind: "open", view: "v1" }, { kind: "exact", result: "truncated" }, { kind: "duplicate" },
    { kind: "exact", result: "complete" }, { kind: "refresh" }, { kind: "exact", result: "complete" }, { kind: "close" },
  ] },
  { name: "receiving process holds no view until the original opening arrives", commands: [
    { kind: "open", view: "v1" }, { kind: "switch", process: 1 }, { kind: "read" }, { kind: "reopen" },
    { kind: "write", answer: "accepted" }, { kind: "refresh" }, { kind: "exact", result: "complete" },
    { kind: "refresh" }, { kind: "exact", result: "complete" }, { kind: "close" },
  ] },
  { name: "superseded pre-admission read spends no signature", commands: [
    { kind: "open", view: "v1" }, { kind: "begin", delay: "admission", result: "complete" }, { kind: "timeout" },
    { kind: "supersede", view: "v2" }, { kind: "release" }, { kind: "read" }, { kind: "close" },
  ] },
  { name: "superseding an admitted read keeps its one signature", commands: [
    { kind: "open", view: "v1" }, { kind: "begin", delay: "result", result: "complete" }, { kind: "timeout" },
    { kind: "supersede", view: "v2" }, { kind: "release" }, { kind: "read" }, { kind: "close" },
  ] },
  { name: "a queued press with an old display cut signs nothing", commands: [
    { kind: "open", view: "v1" }, { kind: "begin", delay: "relay", result: "complete" }, { kind: "timeout" },
    { kind: "refresh" }, { kind: "release" }, { kind: "read" }, { kind: "exact", result: "complete" }, { kind: "close" },
  ] },
  { name: "unknown native outcome keeps the exact original through reads and refresh", commands: [
    { kind: "open", view: "v1" }, { kind: "write", answer: "unknown" }, { kind: "read" }, { kind: "refresh" },
    { kind: "check" }, { kind: "refresh" }, { kind: "write", answer: "accepted" }, { kind: "write", answer: "accepted" }, { kind: "close" },
  ] },
  { name: "teardown settles the waiter once while admitted server work finishes", commands: [
    { kind: "open", view: "v1" }, { kind: "begin", delay: "result", result: "truncated" }, { kind: "close" },
    { kind: "release" }, { kind: "duplicate" }, { kind: "probe-closed" }, { kind: "close" },
  ] },
  { name: "checking an original never manufactures a successor signature", commands: [
    { kind: "open", view: "v1" }, { kind: "write", answer: "unknown" }, { kind: "check" }, { kind: "check" },
    { kind: "refresh" }, { kind: "begin", delay: "relay", result: "complete" }, { kind: "release" }, { kind: "duplicate" }, { kind: "close" },
  ] },
  { name: "teardown after timeout neither resettles the waiter nor accepts a late reply", commands: [
    { kind: "open", view: "v1" }, { kind: "begin", delay: "admission", result: "complete" }, { kind: "timeout" },
    { kind: "close" }, { kind: "release" }, { kind: "duplicate" }, { kind: "probe-closed" }, { kind: "close" },
  ] },
];

function choices(model: CardHistoryLedger, commands: readonly CardCommand[]): CardCommand[] {
  const last = commands.at(-1)?.kind, card = model.selected();
  const fresh = `v${1 + Math.max(0, ...[...model.mounts.values()].map(value => Number(value.view.slice(1))))}`;
  if (model.closed) return model.pending ? [{ kind: "release" }] : [];
  const options: CardCommand[] = [];
  const unknown = [...model.mounts.values()].some(value => value.original !== null);
  const moving = (): void => {
    if (!unknown && last !== "switch") options.push({ kind: "switch", process: model.process === 0 ? 1 : 0 });
    if (!unknown) options.push({ kind: "open", view: fresh });
  };
  if (model.pending) {
    options.push({ kind: "release" });
    if (model.pending.wait === "waiting") options.push({ kind: "timeout" });
    else {
      if (last !== "read") options.push({ kind: "read" });
      if (model.client) options.push({ kind: "refresh" });
      if (model.client?.page === "item" || model.client?.truncated) options.push({ kind: "exact", result: "complete" });
      moving();
    }
    if (model.active[model.process] === model.view) options.push({ kind: "supersede", view: fresh });
    if (commands.length >= 6) options.push({ kind: "close" });
    return options;
  }
  if (!card) {
    if (last !== "read") options.push({ kind: "read" });
    options.push({ kind: "reopen" });
    return options;
  }
  if (last !== "read") options.push({ kind: "read" });
  options.push({ kind: "refresh" });
  if (model.client?.original) options.push({ kind: "check" });
  else if (model.client?.page === "item" && model.client.apply && last !== "write") {
    options.push({ kind: "write", answer: "accepted" });
    if (!unknown) options.push({ kind: "write", answer: "unknown" });
  }
  if (model.client?.page === "item" || model.client?.truncated) {
    options.push({ kind: "exact", result: "complete" }, { kind: "exact", result: "truncated" });
  }
  const active = model.active[model.process] === model.view;
  if (active && model.client?.cut === card.cut && card.held !== "complete" && card.original === null) {
    for (const delay of ["relay", "admission", "result"] as const)
      for (const result of ["complete", "truncated"] as const) options.push({ kind: "begin", delay, result });
  }
  if (!unknown) {
    moving();
    if (active) options.push({ kind: "supersede", view: fresh });
  }
  if (!commands.some(command => command.kind === "duplicate")) options.push({ kind: "duplicate" });
  if (commands.length >= 6) options.push({ kind: "close" });
  return options;
}

// Ninety-nine joint histories plus the separate named bridge regression make
// one hundred plain histories. No elapsed sleep or observed production state
// chooses a command. Stop after teardown; never pad a terminal history.
for (let index = cardHistories.length; index < 99; index++) {
  const model = new CardHistoryLedger();
  const commands: CardCommand[] = [{ kind: "open", view: "v1" }];
  model.apply(commands[0]!);
  let seed = (index + 101) * 2654435761 >>> 0;
  const budget = 12 + index % 7;
  while (commands.length < budget) {
    const options = choices(model, commands);
    if (options.length === 0) break;
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const command = options[(seed >>> 0) % options.length]!;
    commands.push(command); model.apply(command);
  }
  if (model.pending) { commands.push({ kind: "release" }); model.apply({ kind: "release" }); }
  if (!model.closed) { commands.push({ kind: "close" }); model.apply({ kind: "close" }); }
  if (commands.length < 20) commands.push({ kind: "probe-closed" });
  cardHistories.push({ name: "event order preserves display cuts, originals and signature counts", commands });
}
