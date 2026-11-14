import { expect, test } from "vitest";
import type {
  ActType, CapacityVersion, DurabilityLevel, ReceiveType, TimedRule,
} from "@generalbusiness/dap-contract";
import {
  author, authorsOf, bool, by, collect, compile, CompileError, constant,
  create, define, detached, equals, fact, final, grants, int, isFact, item, itemOf, list, live,
  open, optional, party, range, receive, reference, required,
  resultReason, sameSet, some, text, timed, time, transition, update, value,
  withDefault, type ItemDef,
} from "../src/index.ts";

const grant = grants({ establish: "forms.establish", open: "forms.open", edit: "forms.edit" });
const root = item("root", { states: { open: live } });
const establish = open(root, grant.establish);

function declaration<const A extends Record<string, ActType>>(
  items: readonly ItemDef[],
  acts: A,
  options: {
    receives?: Record<string, ReceiveType>;
    timed?: Record<string, TimedRule>;
    level?: DurabilityLevel;
    capacity?: CapacityVersion;
  } = {},
) {
  return define({
    name: "contract-forms", genesis: "establish", grants: grant,
    items: [root, ...items], acts: { establish, ...acts }, ...options,
  });
}

/** Refusals must come from the real validator, not an unrelated finding. */
function refuses(input: Parameters<typeof compile>[0], message: RegExp): void {
  let diagnostics: CompileError["diagnostics"] | undefined;
  try { compile(input); }
  catch (error) {
    expect(error).toBeInstanceOf(CompileError);
    if (!(error instanceof CompileError)) throw error;
    diagnostics = error.diagnostics;
  }
  expect(diagnostics?.some(d => d.stage === "validator" && message.test(d.message))).toBe(true);
}

test("redaction admits detached text only in a signed act", () => {
  const document = item("document", {
    many: 2, states: { open: live },
    values: { body: value.fixed(detached(80)), label: value.optional(text(20)) },
  });
  const redact = transition(document, grant.edit, {}, ({ on }) => ({
    guards: [on.in("open")], effects: [on.redact("body")],
  }));
  expect(compile(declaration([document], { redact })).validation.ok).toBe(true);
  const wrongSlot = transition(document, grant.edit, {}, ({ on }) => ({ effects: [on.redact("label")] }));
  refuses(declaration([document], { wrongSlot }), /holds a detached text/);
  const unsigned = receive({
    message: "redact", class: "tell", from: { kind: "lane" },
    also: { document: by(document) },
  }, ({ also }) => ({ effects: [also.document.redact("body")] }));
  refuses(declaration([document], {}, { receives: { unsigned } }), /a redaction is an effect of an act/);
});

test("every, signer exclusion, and some resolve declared item lists and states", () => {
  const task = item("task", {
    many: 3, states: { open: live, done: final }, parties: { blocked: party.list(2) },
  });
  const check = (state: string) => transition(task, grant.edit, {
    fields: { selected: required(list(itemOf(task), 3)) },
  }, ({ on }) => ({ guards: [
    on.in("open"), on.every("selected", state), on.notSigner("blocked"),
    some(range(task, ["open"])),
  ] }));
  const valid = compile(declaration([task], { check: check("open") }));
  expect(valid.validation.ok).toBe(true);
  expect(valid.definition.acts["check"]?.guards).toContainEqual({ notIn: ["blocked"] });
  refuses(declaration([task], { check: check("missing") }), /names no state/);
  const wrongList = transition(task, grant.edit, {
    fields: { selected: required(list(int(0, 3), 3)) },
  }, ({ on }) => ({ guards: [on.every("selected", "open")] }));
  refuses(declaration([task], { wrongList }), /list.*item/);
});

test("collect and authorsOf resolve bounded ranges and declared source slots", () => {
  const work = item("work", {
    many: 3, states: { open: live }, parties: { authors: author(party.list(2)) },
    values: { label: value.optional(text(20)) },
  });
  const report = item("report", { states: { open: live }, parties: { authors: party.list(8) } });
  const publish = (slot: string, member: string) => transition(report, grant.edit, {
    also: { work: by(work) },
  }, ({ on, also }) => ({
    guards: [on.in("open")],
    effects: [on.attribute("authors", also.work, [authorsOf(range(work, ["open"]), slot)])],
    sends: [create({ kind: "lane", definition: "self", fields: {
      rows: collect(range(work, ["open"]), { item: "item", state: "state", label: member }),
    } })],
  }));
  expect(compile(declaration([work, report], { publish: publish("authors", "label") })).validation.ok).toBe(true);
  refuses(declaration([work, report], { publish: publish("label", "label") }), /names no party slot/);
  refuses(declaration([work, report], { publish: publish("authors", "missing") }), /is item, state or a slot of work/);
});

test("field defaults belong to optional fields and match the declared type", () => {
  const label = text(20);
  const defaults = (start: string | number) =>
    transition(root, grant.edit, { fields: { label: withDefault(optional(label), start) } });
  const valid = declaration([], { defaults: defaults("untitled") });
  expect(compile(valid).validation.ok).toBe(true);
  refuses(declaration([], { defaults: defaults(42) }), /value of the field's type, on an optional field/);
  const requiredDefault = transition(root, grant.edit, { fields: { label: withDefault(required(label), "untitled") } });
  refuses(declaration([], { requiredDefault }), /value of the field's type, on an optional field/);
});

test("settlesBy requires a mutable false-default mark and permits only true writes", () => {
  const task = item("task", {
    many: 2, states: { open: live }, values: { complete: value.required(bool, false) },
  });
  const settle = (mark: boolean) => transition(task, grant.edit, {}, ({ on }) => ({
    guards: [on.in("open")], settles: on.settlesBy("complete", "open"),
    effects: [on.value("complete", constant(mark))],
  }));
  expect(compile(declaration([task], { settle: settle(true) })).validation.ok).toBe(true);
  refuses(declaration([task], { settle: settle(false) }), /sets it only to the constant true/);
  const wrong = item("wrong", {
    states: { open: live }, values: { complete: value.required(bool, true) },
  });
  const wrongDefault = transition(wrong, grant.edit, {}, ({ on }) => ({ settles: on.settlesBy("complete", "open") }));
  refuses(declaration([wrong], { wrongDefault }), /with the default false, and not fixed/);
});

test("update operands belong to relate handlers, including their revision", () => {
  const mirror = item("mirror", { many: 2, states: { open: live }, values: {
    state: value.optional(text(20)),
    item: value.optional(int(0, Number.MAX_SAFE_INTEGER)),
    revision: value.optional(int(0, Number.MAX_SAFE_INTEGER)),
  } });
  const handler = (kind: "relate" | "tell") => receive({
    message: "changed", class: kind, from: { kind: "lane" },
    opens: mirror, ...(kind === "relate" ? { copies: 2 } : {}),
  }, ({ on }) => ({ effects: [
    on.value("state", update("state")), on.value("item", update("item")),
    on.value("revision", update("revision")),
  ] }));
  expect(compile(declaration([mirror], {}, { receives: { changed: handler("relate") } })).validation.ok).toBe(true);
  refuses(declaration([mirror], {}, { receives: { changed: handler("tell") } }), /there is no update here/);
});

test("resultReason belongs to result effects rather than the sending act", () => {
  const request = item("request", {
    states: { open: live }, values: { reason: value.optional(text(80)) },
  });
  const send = transition(request, grant.edit, {}, ({ on }) => ({
    sends: [create({ kind: "lane", definition: "self", fields: {},
      result: { refused: [on.value("reason", resultReason)] },
    })],
  }));
  expect(compile(declaration([request], { send })).validation.ok).toBe(true);
  const tooEarly = transition(request, grant.edit, {}, ({ on }) => ({ effects: [on.value("reason", resultReason)] }));
  refuses(declaration([request], { tooEarly }), /there is no result here/);
});

test("timed attention has no condition and accompanies a total exit", () => {
  const task = item("task", {
    many: 2, states: { waiting: live, done: final }, parties: { recipient: party.fixed },
    values: { deadline: value.fixed(time) },
  });
  const expire = (condition: boolean) => timed(task, {
    states: ["waiting"], deadline: "deadline", effects: it => [it.to("done")],
    attention: it => [it.notify("recipient", "after", "expired", condition ? { if: [it.in("waiting")] } : undefined)],
  });
  expect(compile(declaration([task], {}, { timed: { expire: expire(false) } })).validation.ok).toBe(true);
  refuses(declaration([task], {}, { timed: { expire: expire(true) } }), /a notice of a timed rule has no condition/);
});

test("level and capacity stay explicit data and unsupported durability refuses", () => {
  const omitted = compile(declaration([], {}));
  expect(omitted.validation.ok).toBe(true);
  expect(omitted.definition).not.toHaveProperty("level");
  expect(omitted.definition).not.toHaveProperty("capacity");
  const explicit = compile(declaration([], {}, {
    level: { name: "recorded", version: 1 }, capacity: { name: "whole-scope", version: 1 },
  }));
  expect(explicit.validation.ok).toBe(true);
  expect(explicit.definition.level).toEqual({ name: "recorded", version: 1 });
  expect(explicit.definition.capacity).toEqual({ name: "whole-scope", version: 1 });
  expect(explicit.digest).not.toBe(omitted.digest);
  expect(compile(declaration([], {}, { level: { name: "sequenced", version: 1 } })).validation.ok).toBe(true);
  const unsupported = declaration([], {}, { level: { name: "live", version: 1 } });
  // Inject an unsupported version after the typed builder to test runtime validation.
  Object.assign(unsupported, { level: { name: "live", version: 2 } });
  refuses(unsupported, /the validator admits recorded, live and sequenced durability version 1/);
});

test("reference fragments retain their byte bound and refuse oversized bounds", () => {
  const citation = item("citation", {
    states: { open: live }, values: { source: value.optional(reference(64)) },
  });
  const cite = transition(citation, grant.edit, {
    fields: { source: optional(reference(64)) },
  }, ({ f, on }) => ({ effects: [on.value("source", f.source)] }));
  const built = compile(declaration([citation], { cite }));
  expect(built.validation.ok).toBe(true);
  expect(built.definition.acts["cite"]?.fields["source"]).toEqual({ type: "reference", fragment: 64, required: false });
  const oversized = transition(root, grant.edit, { fields: { source: optional(reference(65_537)) } });
  refuses(declaration([], { oversized }), /at most 65536 bytes/);
});

test("a field fact can match foreign input fields while other fact reads keep their shape", () => {
  const matched = (equal: boolean) => transition(root, grant.edit, {
    fields: { report: required(fact("foreign", "report")), label: required(text(20)) },
  }, ({ f }) => ({ guards: [isFact(f.report, [
    equals(equal ? { field: "label" } : constant("label"), f.label),
  ])] }));
  const built = compile(declaration([], { matched: matched(true) }));
  expect(built.validation.ok).toBe(true);
  expect(built.definition.acts["matched"]?.guards).toEqual([{ fact: {
    field: "report", where: [{ equals: { a: { field: "label" }, b: { field: "label" } } }],
  } }]);
  refuses(declaration([], { matched: matched(false) }), /must be a field of the entry's intent or message/);
  expect(isFact({ field: "report" })).toEqual({ fact: { field: "report" } });
  expect(isFact({ presented: "report" })).toEqual({ fact: { presented: "report" } });
  expect(isFact({ element: "row" })).toEqual({ fact: { element: "row" } });
});

test("sameSet applies its range filter and exclusions before matching list keys", () => {
  const task = item("task", {
    many: 3, states: { open: live }, values: { label: value.optional(text(20)) },
  });
  const check = (except: "on" | "also.missing") => transition(task, grant.edit, {
    fields: { selected: required(list(itemOf(task), 3)), label: required(text(20)) },
  }, ({ f }) => ({ guards: [sameSet(f.selected, "selected", row => row.self, task, ["open"], {
    where: it => [equals(it.slot("label"), f.label)], except: [except],
  })] }));
  const built = compile(declaration([task], { check: check("on") }));
  expect(built.validation.ok).toBe(true);
  expect(built.definition.acts["check"]?.guards).toEqual([{ sameSet: {
    list: { field: "selected" }, as: "selected", key: { element: "selected" },
    items: { type: "task", states: ["open"], where: [{ equals: {
      a: { slot: "label" }, b: { field: "label" },
    } }], except: ["on"] },
  } }]);
  refuses(declaration([task], { check: check("also.missing") }), /names no subject/);
  expect(sameSet({ field: "selected" }, "row", row => row.self, task, ["open"])).toEqual({ sameSet: {
    list: { field: "selected" }, as: "row", key: { element: "row" },
    items: { type: "task", states: ["open"] },
  } });
});
