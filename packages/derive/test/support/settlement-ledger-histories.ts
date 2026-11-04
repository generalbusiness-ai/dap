import { SettlementLedger, type Command, type Family } from "./settlement-ledger-model.ts";

export type History = { name: string; family: Family; capacity: number; commands: Command[] };
const open = (): Command => ({ kind: "open" });
const marker: Command[][] = [
  [open(), open(), open(), { kind: "point", item: 2, target: 3 }, { kind: "mark-target", item: 2, next: 4 }],
  [open(), open(), { kind: "note", item: 2 }, { kind: "finish", item: 2 }, { kind: "settle", item: 3 }],
  [open(), open(), open()],
  [open(), open(), open(), ...[2, 3, 4].flatMap(item => [
    { kind: "mark-a", item }, { kind: "mark-b", item }, { kind: "settle", item },
  ] as Command[]), { kind: "checkpoint" }],
  [open(), open(), { kind: "mark-a-far", item: 2 }, { kind: "reply", origin: 4, result: "applied" }, { kind: "reply", origin: 4, result: "applied" }],
];
const works: Command[][] = [
  [open(), open(), { kind: "outcome", operation: "2:0", result: "unknown" }, { kind: "finish", item: 2 },
    { kind: "outcome", operation: "2:0", result: "confirmed", report: true }, { kind: "reply", origin: 6, result: "applied" }, { kind: "reply", origin: 6, result: "applied" }],
  [open(), open(), { kind: "outcome", operation: "2:0", result: "unknown" }, { kind: "settle", item: 2 },
    { kind: "outcome", operation: "2:0", result: "refused" }, { kind: "outcome", operation: "2:0", result: "refused" }],
  [open(), open(), { kind: "ask-short", item: 2 }, { kind: "ask-long", item: 2 }, { kind: "reply", origin: 5, result: "applied" },
    { kind: "reply", origin: 4, result: "refused" }, { kind: "reply", origin: 5, result: "applied" },
    { kind: "outcome", operation: "6:0", result: "unknown" }, { kind: "outcome", operation: "6:0", result: "confirmed" }],
  [open(), open(), open(), { kind: "outcome", operation: "2:0", result: "confirmed", spawn: "tidy", report: true },
    { kind: "outcome", operation: "5:0", result: "unknown" }, { kind: "outcome", operation: "5:0", result: "refused" },
    { kind: "reply", origin: 5, result: "refused" }, { kind: "reply", origin: 5, result: "refused" }],
];
const markerNames = ["binds settlement before retargeting", "ordinary marks and finality retain duties", "one-short capacity refuses another item", "exact capacity settles three items and checkpoints", "duplicate result spends no new reservation"];
const worksNames = ["ordinary final holder survives unknown and late confirmation", "settled holder waits for its late outcome", "each request uses its originating allowance", "spawned work and duplicate replies keep separate accounts"];

/** Choices use only the literal ledger. No observed reservation guides a trace. */
function choices(model: SettlementLedger): Command[] {
  const commands: Command[] = [];
  const live = [...model.jobs].filter(([, job]) => job.state === "open");
  for (const [item, job] of live) {
    if (model.family === "marker") {
      if (!job.a) commands.push({ kind: "mark-a", item }, { kind: "mark-a-far", item });
      if (!job.b) commands.push({ kind: "mark-b", item }, { kind: "note", item });
      for (const [target] of live) if (target !== item) {
        if (target !== job.target) commands.push({ kind: "point", item, target });
        if (job.target !== null && model.jobs.get(job.target)!.state === "open" && !model.jobs.get(job.target)!.a)
          commands.push({ kind: "mark-target", item, next: target });
      }
      commands.push({ kind: "finish", item }, { kind: "settle", item });
    } else {
      commands.push({ kind: "finish", item }, { kind: "ask-short", item }, { kind: "ask-long", item });
      const owned = [...model.operations.values()].filter(op => op.item === item);
      if (owned.every(op => op.kind === "step") && ![...model.requests.values()].some(request => request.account === item))
        commands.push({ kind: "settle", item });
    }
  }
  for (const op of model.operations.values()) {
    if (["confirmed", "refused"].includes(op.results.at(-1) ?? "")) continue;
    if (op.results.length === 0) commands.push({ kind: "outcome", operation: op.id, result: "unknown" });
    for (const result of ["confirmed", "refused"] as const) {
      commands.push({ kind: "outcome", operation: op.id, result });
      if (op.kind === "step" && op.item !== null && !model.settled.has(op.item)) {
        const held = model.holders.get(op.item);
        if (held?.requests) commands.push({ kind: "outcome", operation: op.id, result, report: true });
        for (const spawn of ["step", "tidy"] as const) if (held?.[spawn]) commands.push({ kind: "outcome", operation: op.id, result, spawn });
      }
    }
  }
  for (const request of model.requests.values()) if (request.result === null)
    for (const result of ["applied", "refused"] as const) commands.push({ kind: "reply", origin: request.seq, result });
  // Checkpoint only when no command can advance another obligation.
  return commands.length ? commands : [{ kind: "checkpoint" }];
}

export const histories: History[] = Array.from({ length: 100 }, (_, index) => {
  const family: Family = index < 50 ? "marker" : "works", local = index % 50;
  const prefix = (family === "marker" ? marker : works)[local];
  const capacity = index === 2 ? 20 : index === 3 ? 21 : 256;
  const commands = prefix ? [...prefix] : Array.from({ length: 2 + (index % 2) }, open);
  const model = new SettlementLedger(family, capacity);
  for (const command of commands) model.apply(command);
  let seed = (index + 1) * 2654435761 >>> 0;
  // Keep minimized witnesses short. Other traces vary legal order and suffix.
  if (!prefix) while (commands.length < 12 + index % 9) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const options = choices(model), command = options[(seed >>> 0) % options.length]!;
    commands.push(command); model.apply(command);
    if (command.kind === "checkpoint") break;
  }
  const named = (family === "marker" ? markerNames : worksNames)[local];
  return { name: `${String(index).padStart(3, "0")} ${family}: ${named ?? "obligations follow legal history"}`, family, capacity, commands };
});

export const storageHistories = [0, 1, 2, 3, 50, 51, 52, 53].map(index => histories[index]!);
