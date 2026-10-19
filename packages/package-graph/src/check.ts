/** Package-only obligations over declarations already checked by the native
 * validator. Findings never stand in for per-definition validation. */
import type { Bounds, Digest } from "@generalbusiness/dap-contract";
import type { PackageComposition, PackageFinding, PackageGraphDefinition } from "./types.ts";
import { array, graphCreates, graphRows, graphSends, graphWriters, own, record, reportedCount, subjectType, type GraphRow, type GraphWriter } from "./model.ts";
import { instanceBounds, relateKeyBound } from "./fan-in.ts";
import { packagePorts } from "./ports.ts";
import { portFieldFindings, type PackageValueRules } from "./port-fields.ts";
import { graphBudget } from "./budget.ts";
import { cycleFindings } from "./cycles.ts";
import { projectedUse } from "./projected.ts";

export interface PackageGraphInput extends PackageValueRules {
  readonly bounds: Bounds;
  readonly entry: Digest;
  readonly definitions: readonly PackageGraphDefinition[];
  readonly composition: PackageComposition;
  readonly roles: Readonly<Record<string, readonly string[]>>;
}
export interface PackageGraphReport {
  readonly findings: readonly PackageFinding[];
  /** Successful scope instances over their lifetime. Null means unproved. */
  readonly instances: readonly { readonly definition: Digest; readonly maximum: number | string | null }[];
  readonly projected: ReturnType<typeof projectedUse> | null;
}

export function checkPackageGraph(input: PackageGraphInput): PackageGraphReport {
  const { definitions, composition } = input, findings: PackageFinding[] = [];
  const budget = graphBudget(definitions, input.bounds);
  if (budget.length) return { findings: budget, instances: [], projected: null };
  const rows = graphRows(definitions), sends = graphSends(rows), writers = graphWriters(rows, sends);
  const ids = new Map(definitions.map(part => [part.id, part])), creations = graphCreates(sends, new Set(ids.keys()));
  const add = (definition: Digest, row: string, check: string, reason: PackageFinding["reason"], message: string, severity: PackageFinding["severity"] = "refusal") => {
    findings.push({ definition, row, check, reason, message, severity });
  };
  for (const owner of definitions) for (const [item, written] of Object.entries(owner.definition.items)) {
    for (const [slot, reference] of Object.entries(record(record(written)["refs"]))) {
      if (record(record(reference)["to"])["type"] === "scope"
        && !composition.connections.some(edge => edge.from === owner.id && edge.item === item && edge.slot === slot)) {
        add(owner.id, `items.${item}.refs.${slot}`, "endpoint-binding", "unbound-endpoint", "Declare the definition that fills this scope endpoint, or outside.");
      }
    }
  }
  const appliedCreation = (writer: GraphWriter, target: Digest) => writer.clause?.outcome === "applied"
    && creations.some(edge => edge.send === writer.clause!.send && edge.target === target)
    && record(record(writer.data["ref"])["from"])["sender"] === true;
  const fromCreator = (writer: GraphWriter, target: Digest) => {
    if (writer.row.family !== "acts" || writer.row.name !== writer.row.owner.definition.genesis || writer.clause) return false;
    const source = record(record(writer.data["ref"])["from"]), field = source["field"];
    if (typeof field !== "string" || Object.keys(source).length !== 1) return false;
    const parents = creations.filter(edge => edge.target === writer.row.owner.id);
    return writer.row.owner.id !== input.entry && parents.length > 0 && parents.every(edge => edge.send.row.owner.id === target
      && record(own(record(edge.send.data["fields"]), field))["scope"] === true);
  };
  const endpointWriters = new Map<string, GraphWriter[]>();
  const endpointKey = (definition: Digest, item: string, slot: string) => JSON.stringify([definition, item, slot]);
  for (const writer of writers) {
    const item = subjectType(writer.row, writer.data["of"]), slot = record(writer.data["ref"])["slot"];
    if (item && typeof slot === "string") {
      const key = endpointKey(writer.row.owner.id, item, slot), group = endpointWriters.get(key) ?? [];
      group.push(writer); endpointWriters.set(key, group);
    }
  }
  for (const [index, edge] of composition.connections.entries()) {
    const owner = ids.get(edge.from)!;
    const slot = record(own(record(record(own(record(owner.definition.items), edge.item))["refs"]), edge.slot));
    if (record(slot["to"])["type"] !== "scope") {
      add(edge.from, `connections.${index}`, "endpoint-binding", "unbound-endpoint", "The connection must name a scope-reference slot."); continue;
    }
    if (edge.to === "outside") continue;
    for (const writer of endpointWriters.get(endpointKey(edge.from, edge.item, edge.slot)) ?? []) {
      if (!appliedCreation(writer, edge.to) && !fromCreator(writer, edge.to)) {
        add(edge.from, writer.path, "endpoint-binding", "unbound-endpoint", `The ${edge.item}.${edge.slot} endpoint must come from its declared child or creator.`);
      }
    }
  }
  for (const send of sends) if (send.kind !== "index") {
    const result = record(send.data["result"]), required = send.kind === "create" ? ["refused", "undelivered", "conflict"] : ["refused", "undelivered"];
    for (const outcome of required) if (!Object.hasOwn(result, outcome)) add(send.row.owner.id, send.path, "result-coverage", "unhandled-result", `Declare the ${outcome} result clause; an explicit empty clause is allowed.`);
  }
  const granted = new Set(Object.values(input.roles).flat());
  for (const row of rows) {
    if (row.family === "acts" && !granted.has(String(row.data["grant"]))) add(row.owner.id, row.path, "grant-coverage", "ungranted-act", "No default role holds this act's action.");
    if (row.family === "receives" && row.path === row.logical) {
      if (!composition.order.some(order => order.definition === row.owner.id && order.handler === row.name)) add(row.owner.id, row.path, "explicit-order", "order-undeclared", "Declare this handler's package order.");
      if (row.primary && typeof record(own(record(row.owner.definition.items), row.primary))["max"] === "number"
        && !composition.exercises.some(exercise => exercise.definition === row.owner.id && exercise.row === row.logical)) {
        add(row.owner.id, row.path, "one-owner", "unowned-bound", "This bounded opening handler declares no exercised right; complete writer coverage is not proved.", "warning");
      }
    }
  }
  for (const [index, exercise] of composition.exercises.entries()) {
    const row = rows.find(row => row.owner.id === exercise.definition && row.path === exercise.row && row.family !== "timed");
    if (!row || own(composition.rights, exercise.right) === undefined || composition.rights[exercise.right]!.owner !== exercise.definition) {
      add(exercise.definition, `exercises.${index}`, "one-owner", "right-not-owned", "The exercise must name an existing act or handler and a right owned by that definition.");
    }
  }
  for (const [index, order] of composition.order.entries()) {
    const row = rows.find(row => row.owner.id === order.definition && row.family === "receives" && row.name === order.handler && row.path === row.logical);
    const right = typeof order.by === "object" && "right" in order.by ? order.by.right : null;
    if (!row || right !== null && !composition.exercises.some(exercise => exercise.definition === order.definition && exercise.row === row.logical && exercise.right === right)) {
      add(order.definition, `order.${index}`, "explicit-order", "order-undeclared", "Order must name an existing handler and, when selected, its exercised right.");
    }
  }
  // An item is pending in states named by a settling row. A send that can
  // enter one needs a written timed exit on that same type and state.
  const pending = new Map<string, Set<string>>();
  for (const row of rows) {
    const settles = record(row.data["settles"]), type = subjectType(row, settles["of"]);
    if (!type || !Object.hasOwn(settles, "in")) continue;
    const key = `${row.owner.id}/${type}`, states = pending.get(key) ?? new Set<string>();
    for (const state of array(settles["in"])) if (typeof state === "string") states.add(state);
    pending.set(key, states);
  }
  const timedExits = (row: GraphRow, type: string, state: string) => rows.some(timed => timed.owner.id === row.owner.id && timed.family === "timed" && timed.primary === type
    && array(timed.data["states"]).includes(state) && writers.some(writer => writer.row === timed && !writer.clause && subjectType(timed, writer.data["of"]) === type
      && !Object.hasOwn(writer.data, "if") && !Object.hasOwn(writer.data, "unless")
      && typeof writer.data["state"] === "string" && !pending.get(`${row.owner.id}/${type}`)?.has(writer.data["state"])));
  for (const row of rows) {
    if (!sends.some(send => send.row === row && send.kind !== "index")) continue;
    const entered = writers.filter(writer => writer.row === row && !writer.clause).map(writer => ({ type: subjectType(row, writer.data["of"]), state: writer.data["state"], path: writer.path }));
    const replacesInitial = writers.some(writer => writer.row === row && !writer.clause && subjectType(row, writer.data["of"]) === row.primary
      && typeof writer.data["state"] === "string" && !Object.hasOwn(writer.data, "if") && !Object.hasOwn(writer.data, "unless"));
    if (row.opens && row.primary && !replacesInitial) entered.push({ type: row.primary, state: record(own(record(row.owner.definition.items), row.primary))["initial"], path: row.path });
    for (const { type, state, path } of entered) if (type && typeof state === "string" && pending.get(`${row.owner.id}/${type}`)?.has(state) && !timedExits(row, type, state)) {
      add(row.owner.id, path, "settled-pending", "unsettled-pending", `Pending ${type}.${state} needs a timed exit from pending states.`);
    }
  }
  const bounds = instanceBounds(input.entry, definitions, creations, writers);
  const ports = packagePorts(input.entry, definitions, composition, rows, sends, creations);
  findings.push(...ports.findings);
  findings.push(...portFieldFindings(rows, ports.links, creations, input));
  findings.push(...cycleFindings(rows, ports.links, creations));
  for (const handler of rows) {
    if (handler.family !== "receives" || handler.path !== handler.logical || handler.data["class"] !== "relate") continue;
    const incoming = ports.links.filter(link => link.handler === handler), parts = incoming.map(({ send }) => {
      const instances = bounds.get(send.row.owner.id) ?? null, keys = relateKeyBound(send);
      return instances === null || keys === null ? null : instances * keys;
    });
    if (parts.some(part => part === null)) {
      add(handler.owner.id, handler.path, "port-typing", "fan-in-unproved", "Lifetime sender instances and related keys are not both proved.");
    } else {
      const maximum = parts.reduce<bigint>((sum, part) => sum + part!, 0n), copies = handler.data["copies"];
      if (typeof copies === "number" && maximum > BigInt(copies)) add(handler.owner.id, handler.path, "port-typing", "fan-in-exceeds-copies", `Lifetime fan-in ${maximum} exceeds copies ${copies}.`);
    }
  }
  return { findings, instances: definitions.map(part => ({ definition: part.id, maximum: reportedCount(bounds.get(part.id) ?? null) })),
    projected: projectedUse(input.entry, definitions, rows, creations, bounds, input.bounds) };
}
