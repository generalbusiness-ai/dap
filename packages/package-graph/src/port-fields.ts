/** Native message-field inclusion. Unknown values are not treated as proof. */
import type { FieldType } from "@generalbusiness/dap-contract";
import { fieldAssignable } from "./field-types.ts";
import { array, own, record, subjectType, type GraphCreate, type GraphRow, type GraphSend } from "./model.ts";
import type { PortLink } from "./ports.ts";
import type { PackageFinding } from "./types.ts";

export interface PackageValueRules { readonly literalFits: (type: FieldType, value: unknown) => boolean }
interface Produced { readonly type: FieldType | null; readonly guaranteed: boolean; readonly literal?: unknown; readonly absent?: boolean }
const unknown: Produced = { type: null, guaranteed: false };

export function portFieldFindings(rows: readonly GraphRow[], links: readonly PortLink[], creations: readonly GraphCreate[], rules: PackageValueRules): PackageFinding[] {
  const findings: PackageFinding[] = [];
  const kindOf = (row: GraphRow) => row.family === "receives" ? String(row.data["message"]) : row.family === "timed" ? `timed:${row.name}` : row.name;
  const itemFact = (row: GraphRow, type: string): FieldType | null => {
    const kinds = [...new Set(rows.filter(candidate => candidate.owner.id === row.owner.id && candidate.opens && candidate.primary === type).map(kindOf))];
    return kinds.length ? { type: "fact", under: row.owner.definition.name, kind: kinds } : null;
  };
  const wire = (row: GraphRow, type: FieldType): FieldType | null => {
    if (type.type === "item") return itemFact(row, type.of);
    if (type.type === "list") { const of = wire(row, type.of); return of ? { ...type, of } : null; }
    if (type.type !== "record") return type;
    const fields = Object.entries(type.of).map(([name, member]) => {
      const value = wire(row, member);
      return [name, value && { ...value, required: member.required }] as const;
    });
    return fields.every(([, member]) => member !== null) ? { ...type, of: Object.fromEntries(fields) as Record<string, FieldType & { required: boolean }> } : null;
  };
  const guardedSet = (guards: unknown, of: unknown, slot: string): boolean => array(guards).some(value => {
    const guard = record(value);
    return guard["set"] === slot && (guard["of"] ?? "on") === (of ?? "on")
      || Array.isArray(guard["anyOf"]) && guard["anyOf"].length > 0 && guard["anyOf"].every(branch => guardedSet(branch, of, slot));
  });
  const slot = (row: GraphRow, type: string | null, name: string): Produced => {
    if (!type) return unknown;
    const item = record(own(record(row.owner.definition.items), type));
    for (const [family, member] of [["refs", "to"], ["values", "of"]]) {
      const declaration = record(own(record(item[family!]), name)), value = declaration[member!];
      if (value && typeof record(value)["type"] === "string") return { type: value as FieldType, guaranteed: declaration["required"] === true || Object.hasOwn(declaration, "default") };
    }
    const party = record(own(record(item["parties"]), name));
    if (!Object.keys(party).length) return unknown;
    // Native party lists have their own bounded domain. Without its bound
    // here, do not manufacture a list maximum from an unrelated item max.
    return party["list"] === true ? unknown : { type: { type: "member" }, guaranteed: party["required"] === true };
  };
  const scopeKind = (row: GraphRow): string | null => {
    const incoming = creations.filter(edge => edge.target === row.owner.id);
    const kinds = new Set(incoming.map(edge => edge.send.data["kind"]));
    return kinds.size === 0 ? "lane" : kinds.size === 1 && typeof [...kinds][0] === "string" ? [...kinds][0] as string : null;
  };
  const source = (send: GraphSend, written: unknown): Produced => {
    const { row } = send;
    if (written === "self") return { type: { type: "fact", under: row.owner.definition.name, kind: [kindOf(row)] }, guaranteed: true };
    const form = record(written);
    if (Object.hasOwn(form, "const")) return { type: null, guaranteed: form["const"] !== null, literal: form["const"], ...(form["const"] === null ? { absent: true } : {}) };
    if (form["none"] === true) return { ...unknown, absent: true };
    let produced: Produced = unknown;
    if (typeof form["field"] === "string") {
      const field = own(record(row.data["fields"]), form["field"]);
      if (field) produced = { type: field as FieldType, guaranteed: record(field)["required"] === true || Object.hasOwn(record(field), "default") };
    } else if (typeof form["slot"] === "string") {
      const type = form["of"] === "each" ? record(send.data["each"])["type"] : subjectType(row, form["of"]);
      produced = slot(row, typeof type === "string" ? type : null, form["slot"]);
      const changed = array(row.data["effects"]).some(value => {
        const effect = record(value);
        return (effect["of"] ?? "on") === (form["of"] ?? "on") && ["ref", "value", "party"].some(key => record(effect[key])["slot"] === form["slot"]);
      });
      if (!changed && guardedSet(row.data["guards"], form["of"], form["slot"])) produced = { ...produced, guaranteed: true };
    } else if (typeof form["item"] === "string") {
      const type = form["item"] === "each" ? record(send.data["each"])["type"] : subjectType(row, form["item"]);
      produced = typeof type === "string" ? { type: { type: "item", of: type }, guaranteed: true } : unknown;
    } else if (form["scope"] === true) {
      const kind = scopeKind(row);
      if (kind) produced = { type: { type: "scope", kind: kind as Extract<FieldType, { type: "scope" }>["kind"] }, guaranteed: true };
    } else if (form["signer"] === true) produced = { type: { type: "member" }, guaranteed: true };
    else if (form["intent"] === true) produced = { type: { type: "digest" }, guaranteed: true };
    else if (form["sender"] === true) {
      const kind = record(row.data["from"])["kind"];
      if (typeof kind === "string") produced = { type: { type: "scope", kind: kind as Extract<FieldType, { type: "scope" }>["kind"] }, guaranteed: true };
    } else if (form["source"] === "time") produced = { type: { type: "time" }, guaranteed: true };
    else if (form["source"] === "seq" || form["update"] === "revision") produced = { type: { type: "int", min: 0, max: Number.MAX_SAFE_INTEGER }, guaranteed: true };
    else if (Object.hasOwn(form, "collect")) {
      const collect = record(form["collect"]), range = record(collect["items"]), type = range["type"];
      const item = typeof type === "string" ? record(own(record(row.owner.definition.items), type)) : {};
      const fields: [string, FieldType & { required: boolean }][] = [];
      for (const [name, member] of Object.entries(record(collect["fields"]))) {
        const value = member === "item" && typeof type === "string" ? { type: itemFact(row, type), guaranteed: true }
          : member === "state" ? { type: { type: "enum", of: Object.keys(record(item["states"])) } as FieldType, guaranteed: true }
          : typeof member === "string" ? slot(row, typeof type === "string" ? type : null, member) : unknown;
        const typed = value.type && wire(row, value.type);
        if (!typed) return unknown;
        fields.push([name, { ...typed, required: value.guaranteed }]);
      }
      if (typeof item["max"] === "number") produced = { type: { type: "list", max: item["max"], of: { type: "record", of: Object.fromEntries(fields) } }, guaranteed: true };
    }
    if (form["part"] !== undefined && form["part"] !== "ref") {
      const part = form["part"];
      return part === "time" ? { type: { type: "time" }, guaranteed: produced.guaranteed }
        : part === "seq" ? { type: { type: "int", min: 0, max: Number.MAX_SAFE_INTEGER }, guaranteed: produced.guaranteed }
        : part === "intent" ? { type: { type: "digest" }, guaranteed: produced.guaranteed } : unknown;
    }
    return { ...produced, type: produced.type && wire(row, produced.type) };
  };
  const matches = (from: FieldType, to: FieldType, receiver: GraphRow): boolean => {
    if (from.type === "fact" && to.type === "item") return from.under === receiver.owner.definition.name && from.kind.length > 0 && from.kind.every(kind => rows.some(row => row.owner.id === receiver.owner.id && row.opens && row.primary === to.of && kindOf(row) === kind));
    if (from.type === "record" && to.type === "record") return Object.entries(from.of).every(([name, field]) => Object.hasOwn(to.of, name) && matches(field, to.of[name]!, receiver))
      && Object.entries(to.of).every(([name, field]) => !field.required || Object.hasOwn(from.of, name) && from.of[name]!.required === true);
    if (from.type === "list" && to.type === "list") return from.max <= to.max && matches(from.of, to.of, receiver);
    return fieldAssignable(from, to);
  };
  const check = (send: GraphSend, receiver: GraphRow) => {
    const fields = record(send.data[send.kind === "relate" ? "detail" : "fields"]), expected = record(receiver.data["fields"]);
    const bad = Object.keys(fields).filter(name => !Object.hasOwn(expected, name));
    for (const [name, declared] of Object.entries(expected)) {
      const type = declared as FieldType, value = Object.hasOwn(fields, name) ? source(send, fields[name]) : { ...unknown, absent: true };
      const needsValue = record(declared)["required"] === true && record(declared)["default"] === undefined;
      if (needsValue && !value.guaranteed || !value.absent && (Object.hasOwn(value, "literal") ? !rules.literalFits(type, value.literal) : !value.type || !matches(value.type, type, receiver))) bad.push(name);
    }
    if (bad.length) findings.push({ definition: send.row.owner.id, row: send.path, check: "port-typing", reason: "field-mismatch", severity: "refusal", message: `Cannot prove that fields fit ${receiver.owner.definition.name}.${receiver.path}: ${[...new Set(bad)].join(", ")}.` });
  };
  for (const { send, handler } of links) check(send, handler);
  for (const edge of creations) {
    const genesis = rows.find(row => row.owner.id === edge.target && row.family === "acts" && row.name === row.owner.definition.genesis);
    if (genesis) check(edge.send, genesis);
  }
  return findings;
}
