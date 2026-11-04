/** Coverage of the first act-body slice. Unsupported bodies never execute a prefix. */
import type { Bounds, FieldType, FieldValue, Guard as WrittenGuard } from "@generalbusiness/dap-contract";
import type { ValidDefinition } from "../validate/index.ts";
import { isObject } from "../values.ts";
import * as m from "./model.ts";

export type Lowered = { supported: true; program: m.Program } | { supported: false; paths: readonly string[] };
export function lower(definition: ValidDefinition, kind: string, bounds: Bounds): Lowered {
  const act = definition.declared.acts[kind];
  if (!act) return { supported: false, paths: [`acts.${kind}`] };
  const context = m.schema(definition, kind), paths: string[] = [], root = `acts.${kind}`;
  const unsupported = (path: string): null => { paths.push(path); return null; };
  const attempt = <T>(path: string, read: () => T): T | null => {
    try { return read(); } catch (error) { if (!(error instanceof TypeError)) throw error; return unsupported(path); }
  };
  const resolve = (name: string) => m.subject(context, name);
  const slot = (name: string, of = "on") => m.slot(resolve(of), name);
  const expression = (written: unknown, path: string, target?: FieldType): m.Expr<FieldType, "working"> | null => attempt(path, () => {
    if (written === "self") {
      if (target && target.type !== "fact") throw new TypeError("self needs a fact slot");
      return m.self(target?.type === "fact" ? target : { type: "fact", kind: [kind], under: definition.declared.name }, "working", path) as m.Expr<FieldType, "working">;
    }
    if (!isObject(written) || "part" in written) throw new TypeError("unsupported expression");
    if (typeof written["field"] === "string") return m.readField(m.field(context, written["field"]), "working", path);
    if (typeof written["slot"] === "string") return m.readSlot(slot(written["slot"], typeof written["of"] === "string" ? written["of"] : "on"), "working", path);
    if (written["signer"] === true) return m.signer("working", path) as m.Expr<FieldType, "working">;
    if (isObject(written["time"]) && typeof written["time"]["plusSeconds"] === "number") return m.time(written["time"]["plusSeconds"], "working", path) as m.Expr<FieldType, "working">;
    if (Object.hasOwn(written, "const")) {
      const value = written["const"], type: FieldType | undefined = target ?? (typeof value === "string" ? { type: "enum", of: [value] } : typeof value === "boolean" ? { type: "bool" } : typeof value === "number" ? { type: "int", min: value, max: value } : undefined);
      if (!type) throw new TypeError("constant needs a descriptor");
      return m.literal(type, value as FieldValue, "working", path, bounds);
    }
    throw new TypeError("unsupported expression");
  });
  const guards = (written: readonly WrittenGuard[] | undefined, path: string): m.All => ({ op: "all", path,
    guards: (written ?? []).flatMap((g, i): m.Guard[] => {
      const p = `${path}.${i}`;
      const value = attempt(p, (): m.Guard | null => {
        const metadata: m.Metadata = m.immutable({ path: p, subject: resolve(g.of ?? "on"), ...(g.of === undefined ? {} : { of: g.of }), ...(g.ifPresent === undefined ? {} : { ifPresent: g.ifPresent }), ...(g.reason === undefined ? {} : { reason: g.reason }) });
        // Keep the registered handle identity while copying the remaining declaration metadata.
        const meta = { ...metadata, subject: resolve(g.of ?? "on") };
        if ("state" in g) return { op: "state", states: m.immutable(g.state), metadata: meta };
        if ("rule" in g) return { op: "prepared", rule: g.rule, metadata: meta };
        if ("before" in g || "after" in g) {
          const op = "before" in g ? "before" : "after", name = "before" in g ? g.before.slot : g.after.slot;
          const read = m.readSlot(slot(name, g.of ?? "on"), "before", `${p}.${op}`);
          if (read.type.type !== "time") return unsupported(p);
          return m.before(read as m.Expr<{ type: "time" }, "before">, meta, op);
        }
        return unsupported(p);
      });
      return value ? [value] : [];
    }) });
  if (act.attention.length) paths.push(`${root}.attention`);
  if (act.settles !== undefined) paths.push(`${root}.settles`);
  if (definition.holdTypes.length || definition.underived.some(form => form.path.startsWith(`${root}.`)) || definition.marks.some(mark => mark.path.startsWith(`${root}.`))) paths.push(root);
  const top = guards(act.guards, `${root}.guards`);
  const effects = act.effects.flatMap((written, i): m.Effect[] => {
    const path = `${root}.effects.${i}`;
    const value = attempt(path, (): m.Effect | null => {
      const condition: m.Condition = { ...(written.if ? { if: guards(written.if, `${path}.if`) } : {}), ...(written.unless ? { unless: guards(written.unless, `${path}.unless`) } : {}) };
      const of = resolve(written.of ?? "on");
      if ("state" in written) return { op: "state", subject: of, state: written.state, condition, path };
      const op = "value" in written ? "value" : "ref" in written ? "ref" : "party" in written ? "party" : null;
      if (!op) return unsupported(path);
      const form = "value" in written ? written.value : "ref" in written ? written.ref : "party" in written ? written.party : null;
      if (!form || "list" in form) return unsupported(path);
      const target = m.slot(of, form.slot);
      const from = form.from === null ? null : expression(form.from, `${path}.${op}.from`, target.type);
      if (form.from !== null && !from) return null;
      const source: m.Source = from === null ? { op: "clear" } : m.assign(target, from);
      return { op, slot: target, source, condition, path };
    });
    return value ? [value] : [];
  });
  const sends = act.sends.flatMap((written, i): m.Tell[] => {
    const path = `${root}.sends.${i}`;
    const value = attempt(path, (): m.Tell | null => {
      if (!("tell" in written) || Object.keys(written.tell.result).length) return unsupported(path);
      const tell = written.tell, fields: (readonly [string, m.Expr<FieldType, "working">])[] = [];
      for (const [name, source] of Object.entries(tell.fields)) { const value = expression(source, `${path}.tell.fields.${name}`); if (value) fields.push([name, value]); }
      return { op: "tell", destination: slot(tell.to.slot, tell.to.of ?? "on"), message: tell.message,
        condition: tell.if ? guards(tell.if, `${path}.tell.if`) : null, fields, clauses: {}, path };
    });
    return value ? [value] : [];
  });
  if (paths.length) return { supported: false, paths: [...new Set(paths)] };
  return { supported: true, program: m.body(context, top, effects, sends) };
}
