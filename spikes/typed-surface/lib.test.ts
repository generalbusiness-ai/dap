import { expect, test } from "vitest";
import { canonicalize } from "@generalbusiness/dap-bytes";
import {
  anyOf, by, compile, CompileError, constant, define, differs, equals, fact, grants, item, itemOf, live, none,
  one, open, optional, party, reasons, ref, require, required, roles, rule, siblings, subject,
  text, transition, value, via, when,
} from "./lib.ts";

const grant = grants({ establish: "example.establish", edit: "example.edit" });
const why = reasons({ rejected: "rejected" });
const root = item("root", { states: { open: live }, values: { label: value.fixed(text(40)) } });
const establish = open(root, grant.establish, { fields: { label: required(text(40)) } }, ({ f, on }) => ({ effects: [...on.take(f, "label")] }));
const definition = () => define({ name: "example", genesis: "establish", grants: grant, reasons: why, items: [root], acts: { establish } });

test("literal reads remain data and subject comparisons retain their subject", () => {
  expect(equals({ field: "label" }, "ready")).toEqual({ equals: { a: { field: "label" }, b: { const: "ready" } } });
  expect(differs({ field: "label" }, null)).toEqual({ differs: { a: { field: "label" }, b: { none: true } } });
  expect(subject(root, "also.root").equals({ field: "label" }, false)).toEqual({ of: "also.root", equals: { a: { field: "label" }, b: { const: false } } });
});

test("take copies slots in source order and chooses the declared slot kind", () => {
  const document = item("document", { states: { open: live }, parties: { author: party.fixed }, values: { label: value.fixed(text(40)) }, refs: { root: ref.fixed(itemOf(root)) } });
  const form = open(document, grant.edit, { fields: { author: required({ type: "member" }), label: required(text(40)), root: required(itemOf(root)) } }, ({ f, on }) => ({ effects: [...on.take(f, "label", "root", "author")] }));
  expect(form.effects).toEqual([
    { of: "on", value: { slot: "label", from: { field: "label" } } },
    { of: "on", ref: { slot: "root", from: { field: "root" } } },
    { of: "on", party: { slot: "author", from: { field: "author" } } },
  ]);
});

test("binding inference preserves explicit optional and fact fields", () => {
  const form = transition(root, grant.edit, {
    fields: { previous: optional(itemOf(root)), root: required(fact("example", "establish")) },
    also: { current: by(root), previous: by(root, "previous") },
  });
  expect(form.fields).toEqual({ previous: { type: "item", of: "root", required: false }, root: { type: "fact", under: "example", kind: ["establish"], required: true } });
  expect(transition(root, grant.edit, { also: { root: by(root) } }).fields).toEqual({ root: { type: "item", of: "root", required: true } });
});

test("dependent siblings use the actual declared source reference", () => {
  const link = item("link", { states: { open: live }, refs: { root: ref.fixed(itemOf(root)) } });
  const row = transition(link, grant.edit, { also: (on) => siblings({ link: one(link) }, ($) => ({ root: via(root, $.link, "root"), original: via(root, on, "root") })) });
  expect(row.also).toEqual({ link: { item: "link", one: true }, root: { item: "root", via: { slot: "root", of: "also.link" } }, original: { item: "root", via: { slot: "root", of: "on" } } });
  expect(none(link, ["open"], (it) => [equals(it.slot("root"), 0)])).toEqual({ none: { type: "link", states: ["open"], where: [{ equals: { a: { slot: "root" }, b: { const: 0 } } }] } });
});

test("inline rules hoist once and conflicting declarations refuse compilation", () => {
  const marked = open(root, grant.establish, { fields: { label: required(text(40)) } }, ({ f, on }) => ({ guards: [require(rule("allowed", "true"), why.rejected), rule("allowed", "true")], effects: [...on.take(f, "label")] }));
  const built = define({ name: "example", genesis: "establish", grants: grant, reasons: why, items: [root], acts: { establish: marked } });
  expect(compile(built).definition.rules).toEqual({ allowed: "true" });
  expect(compile(built).refusals).toEqual({ establish: ["rejected"] });
  const conflict = define({ name: "example", genesis: "establish", items: [root], acts: { establish: { ...marked, guards: [rule("allowed", "true"), rule("allowed", "false")] } } });
  try { compile(conflict); throw new Error("expected conflicting rule refusal"); }
  catch (error) {
    expect(error).toBeInstanceOf(CompileError);
    if (!(error instanceof CompileError)) throw error;
    expect(error.diagnostics).toContainEqual(expect.objectContaining({ act: "establish", form: "acts.establish.guards[1]", offending: { rule: "allowed" }, message: "rule allowed has different expressions" }));
  }
});

test("definition metadata is absent from canonical bytes and facts use available act values", () => {
  const declared = definition();
  expect(fact(declared.acts.establish)).toEqual({ type: "fact", under: "example", kind: ["establish"] });
  const built = compile(declared);
  expect(fact(built.definition.acts.establish)).toEqual(fact(declared.acts.establish));
  expect(built.validation.ok).toBe(true);
  expect(Object.keys(built.definition)).not.toContain("grants");
  expect(canonicalize(built.definition)).not.toContain("declarations");
  expect(fact("foreign", "offer")).toEqual({ type: "fact", under: "foreign", kind: ["offer"] });
});

test("roles return ordinary manifest data and retain runtime coverage checking", () => {
  expect(roles(grant, { admin: [grant.establish, grant.edit], reader: [grant.edit] })).toEqual({ admin: ["example.establish", "example.edit"], reader: ["example.edit"] });
  expect(() => Reflect.apply(roles, null, [grant, { reader: [grant.edit] }])).toThrow("no role holds example.establish");
});

test("compile refuses a structurally incomplete full definition", () => {
  expect(() => compile({ ...definition(), genesis: "missing" })).toThrow(CompileError);
});

test("literal rule and reason records stay data while nested real guards are inspected", () => {
  const literal = { rule: "not-a-rule", reason: "not-a-refusal" };
  const literalOnly = define({
    name: "example", genesis: "establish", grants: grant, reasons: reasons({}), items: [root],
    acts: { establish: { ...establish, guards: [equals(constant(literal), constant(literal))] } },
  });
  const compiled = compile(literalOnly);
  expect(compiled.findings).toEqual([]);
  expect(compiled.refusals).toEqual({});
  expect(compiled.definition.rules).toEqual({});
  expect(compiled.definition.acts.establish.guards).toEqual(literalOnly.acts.establish.guards);

  const nested = define({
    name: "example", genesis: "establish", grants: grant, reasons: why, items: [root],
    acts: { establish: { ...establish,
      guards: [anyOf([require(rule("nested", "true"), why.rejected)])],
      effects: establish.effects.map(effect => when(effect, { unless: [rule("conditional", "false")] })),
    } },
  });
  expect(compile(nested).refusals).toEqual({ establish: ["rejected"] });
  expect(compile(nested).definition.rules).toEqual({ nested: "true", conditional: "false" });
  const broken = define({
    name: "example", genesis: "establish", items: [root],
    acts: { establish: { ...establish, guards: [anyOf([rule("nested", "fields.undeclared = 1")])] } },
  });
  try { compile(broken); throw new Error("expected nested field refusal"); }
  catch (error) {
    expect(error).toBeInstanceOf(CompileError);
    if (!(error instanceof CompileError)) throw error;
    expect(error.diagnostics).toContainEqual(expect.objectContaining({ act: "establish", form: "acts.establish.guards[0].anyOf[0][0]", offending: { rule: "nested" }, message: "nested: reads a field the act does not declare: undeclared" }));
  }
});
