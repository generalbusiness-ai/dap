/** Typed references in a rule string. Raw text keeps the normal profile admission. */
import type { Subject } from "@generalbusiness/dap-contract";
import type { ItemDef, Slots } from "./index.ts";

interface NamedSubject {
  readonly item: ItemDef;
  readonly subject: Subject;
}

interface ExpressionContext {
  readonly f: Readonly<Record<string, { readonly field: string }>>;
  readonly on: NamedSubject | undefined;
  readonly also: Readonly<Record<string, NamedSubject>>;
}
interface RowContext { readonly row: Readonly<Record<string, { readonly row: string }>> }

type FieldReference<C extends ExpressionContext> = C["f"][keyof C["f"] & string] & { readonly part?: never };
type SlotReference<S> = S extends { readonly item: infer I extends ItemDef; readonly subject: infer N extends Subject }
  ? { readonly slot: Slots<I>; readonly of: N; readonly part?: never }
  : never;
type Reference<C extends ExpressionContext | RowContext> = C extends ExpressionContext
  ? FieldReference<C> | SlotReference<C["on"]> | SlotReference<C["also"][keyof C["also"] & string]>
  : C extends RowContext ? C["row"][keyof C["row"] & string] & { readonly part?: never } : never;

const keywords = new Set(["and", "or", "in", "true", "false", "null", "function"]);
const actContext = (ctx: ExpressionContext | RowContext): ctx is ExpressionContext => "f" in ctx && "on" in ctx && "also" in ctx;

/** A quoted name is one path member, including an alias such as also.library. */
function member(base: string, name: string): string {
  const before = base ? `${base}.` : "";
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && !keywords.has(name)) return `${before}${name}`;
  if (!name.includes("`")) return `${before}\`${name}\``;
  // The profile's backquoted names have no escape for a literal backtick.
  throw new TypeError("expression cannot quote a name containing a backtick");
}

function path(ctx: ExpressionContext | RowContext, reference: unknown): string {
  if (typeof reference !== "object" || reference === null || Array.isArray(reference)) throw new TypeError("expression requires a field or slot reference");
  const value = reference as Record<string, unknown>;
  const keys = Object.keys(value);
  if (!actContext(ctx)) {
    if (keys.length !== 1 || keys[0] !== "row" || typeof value["row"] !== "string" || !Object.hasOwn(ctx.row, value["row"]) || ctx.row[value["row"]]!.row !== value["row"]) throw new TypeError("expression names no projected row field");
    return member("", value["row"]);
  }
  if (keys.length === 1 && keys[0] === "field" && typeof value["field"] === "string") {
    const name = value["field"];
    if (!Object.hasOwn(ctx.f, name)) throw new TypeError(`expression names no field ${name}`);
    return member("fields", name);
  }
  if (keys.length !== 2 || !Object.hasOwn(value, "slot") || !Object.hasOwn(value, "of") || typeof value["slot"] !== "string" || typeof value["of"] !== "string") {
    throw new TypeError("expression requires a field or slot reference without a computed part");
  }
  const name = value["slot"], subject = value["of"];
  const alias = subject.startsWith("also.") ? subject.slice(5) : null;
  const bound = subject === "on" ? ctx.on : alias !== null && Object.hasOwn(ctx.also, alias) ? ctx.also[alias] : undefined;
  if (bound === undefined || bound.subject !== subject) throw new TypeError(`expression names no subject ${subject}`);
  const groups = (["parties", "values", "refs"] as const).filter((group) => Object.hasOwn(bound.item.type[group], name));
  if (groups.length !== 1) throw new TypeError(`expression names no unique slot ${subject}.${name}`);
  return member(member(member("subjects", subject), groups[0]!), name);
}

/**
 * Return a tag whose holes accept the bound act reads or projected row fields.
 * TypeScript checks those references. The ordinary compiler checks raw rule text.
 */
export function expression<const C extends ExpressionContext | RowContext>(ctx: C): (parts: TemplateStringsArray, ...references: Reference<C>[]) => string {
  return (parts, ...references) => {
    if (parts.length !== references.length + 1 || typeof parts[0] !== "string") throw new TypeError("expression requires a complete template");
    let source = parts[0];
    references.forEach((reference, i) => {
      const next = parts[i + 1];
      if (typeof next !== "string") throw new TypeError("expression contains an invalid template escape");
      source += path(ctx, reference) + next;
    });
    return source;
  };
}
