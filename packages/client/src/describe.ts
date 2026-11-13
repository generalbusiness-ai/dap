/**
 * Readable descriptions, derived from the whole declaration (plan 031,
 * section 4). A definition has no description text, so everything an agent
 * reads about an act is derived here from the act's declaration: its
 * sentence, its fields, its presented facts and its guards. The derivation
 * is total over the contract's forms (`definition.ts` of the contract, with
 * the marks of platform data): every guard, operand, part and field type
 * has a rendering. Unknown guards use a plain label; their original bytes
 * remain available through inspect declaration.
 *
 * Consumers render the declaration through these neutral sentences, fields
 * and guards. MCP owns its tool-description character bound and pointer.
 */

import { isRecord } from "@generalbusiness/dap-bytes";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { markDescriptionsOf, type MarkCatalogue } from "./mark-descriptions.ts";

// ---------------------------------------------------------------- the forms, loosely, as both declared and platform data hold them

/** A field type, of a declared definition or of platform data (a mark, or a value place). */
export type FieldLike = Record<string, unknown> & { type?: string; required?: boolean };
/** The act shape needed for a compact declaration line, without caller standing. */
export interface ActSummary {
  step: "open" | "transition" | "comment";
  on: string | null;
  grant: string | { code: string; grant?: string };
  fields: Readonly<Record<string, FieldLike>>;
}
/** An act, of a declared definition or of platform data. */
export interface ActLike extends ActSummary {
  grant: string | { code: string; row: string; grant?: string };
  also: Readonly<Record<string, Record<string, unknown>>>;
  presents?: Readonly<Record<string, { kind: readonly string[]; under: string; required: boolean }>>;
  guards: readonly unknown[];
  effects: readonly unknown[];
}
export interface DefinitionLike {
  name: string;
  genesis: string;
  items: Readonly<Record<string, unknown>>;
  acts: Readonly<Record<string, ActLike>>;
  rules?: Readonly<Record<string, string>>;
}

/** Who may sign, for this caller: the standing read from membership, or a rule. */
export type Who =
  | { standing: "holds"; role: string }
  | { standing: "lacks"; role: string | null }
  | { standing: "unknown" }
  /** Known on some of the binding's memberships and unknown on others: never said to be held, and still listed. */
  | { standing: "partly-unknown" }
  | { standing: "mixed" };

/** What a rendering needs besides the act: the definition's pinned name or digest, and the choices of a definition value place. */
export interface Setting {
  /** The platform name and version, such as `platform:directory@3`, or the digest of a declared definition. */
  pinned: string;
  /** The definitions the rules scope holds active, for a field whose value is a definition's bytes. */
  active?: readonly { name: string; digest: string }[];
}

/** The definition domain: a value place in it is a choice of the active definitions. */
const DEFINITION_DOMAIN = "artroom-definition-1";

const describeJson = (v: unknown): string => { try { return canonicalize(v); } catch { return JSON.stringify(v); } };
const or = (words: readonly string[]): string => (words.length <= 1 ? words.join("") : `${words.slice(0, -1).join(", ")} or ${words.at(-1)}`);
const and = (words: readonly string[]): string => (words.length <= 1 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`);
const plural = (noun: string): string => (/(s|x|sh|ch)$/.test(noun) ? `${noun}es` : /[^aeiou]y$/.test(noun) ? `${noun.slice(0, -1)}ies` : `${noun}s`);
const article = (noun: string): string => (/^[aeiou]/i.test(noun) ? `an ${noun}` : `a ${noun}`);
/** An unknown form, as its JSON, marked so a reader and the totality test can see it. */
const raw = (form: unknown): string => `the form ${describeJson(form)}`;

// ---------------------------------------------------------------- the act's sentence

export function grantAction(act: Pick<ActSummary, "grant">): string | null {
  return typeof act.grant === "string" ? act.grant : act.grant.grant ?? null;
}

/** States a transition leaves and reaches: from the `state` guards on its item, and the state effects on it. */
function transitionOf(act: ActLike): string {
  if (act.step !== "transition") return "";
  const from = new Set<string>();
  for (const guard of act.guards) if (isRecord(guard) && Array.isArray(guard["state"]) && (guard["of"] === undefined || guard["of"] === "on")) for (const s of guard["state"] as string[]) from.add(s);
  const to = new Set<string>();
  for (const effect of act.effects) if (isRecord(effect) && typeof effect["state"] === "string" && (effect["of"] === undefined || effect["of"] === "on")) to.add(effect["state"]);
  const parts = [...(from.size > 0 ? [`from ${or([...from])}`] : []), ...(to.size > 0 ? [`to ${or([...to])}`] : [])];
  return parts.length > 0 ? `; ${parts.join(", ")}` : "";
}

/** The declared step and item, with each consumer's established article form. */
function actWords(act: Pick<ActSummary, "step" | "on">, compact: boolean): string {
  const item = compact ? `a ${act.on}` : article(act.on ?? "item");
  return act.step === "open" ? `opens ${item}`
    : act.step === "transition" ? `moves ${item}`
    : act.on === null ? "comments on no item" : `comments on ${item}`;
}

/** The declared grant. Compact lines state the requirement without claiming caller standing. */
function grantWords(grant: ActSummary["grant"], who: Who, compact: boolean): string {
  if (typeof grant !== "string") {
    return `the rule ${grant.code} decides who may sign${grant.grant ? compact ? `, with ${grant.grant}` : `, or your role holds ${grant.grant}` : ""}`;
  }
  if (compact) return `needs ${grant}`;
  return who.standing === "holds" ? `needs ${grant}, which your role (${who.role}) holds`
    : who.standing === "lacks" ? `needs ${grant}, which your role${who.role ? ` (${who.role})` : ""} does not hold`
    : who.standing === "mixed" ? `needs ${grant}, which your role holds on some scopes of this kind`
    : who.standing === "partly-unknown" ? `needs ${grant}; your standing is unknown on some scopes of this kind, and each scope decides`
    : `needs ${grant}; your standing here is unknown`;
}

/** `<kind>: <what it does>; <who may sign>`. */
export function actSentence(kind: string, act: ActLike, who: Who): string {
  return `${kind}: ${actWords(act, false)}; ${grantWords(act.grant, who, false)}${transitionOf(act)}`;
}

/** The CLI's existing compact line. It reports no caller standing or guard outcome. */
export function describeActLine(kind: string, act: ActSummary): string {
  const fields = compactDescriptions.fieldLines(act, { pinned: "" }, "compact").join(" ") || "none";
  return `${kind}: ${actWords(act, true)}; ${grantWords(act.grant, { standing: "unknown" }, true)}. Fields: ${fields}.`;
}

// ---------------------------------------------------------------- fields

export function presentedLines(act: ActLike): string[] {
  return Object.entries(act.presents ?? {}).map(([name, p]) => `${name}${p.required ? " (required)" : ""}: a fact of kind ${or(p.kind)} under ${p.under}, given in presented`);
}

// ---------------------------------------------------------------- operands and parts

interface Scope {
  act: ActLike;
  definition: DefinitionLike;
  setting: Setting;
  /** The item type of the range whose `where` is being read, whose slots a slot with no `of` names. */
  range: string | null;
  /** The subject of the guard being read, for a slot with no `of` outside a range. */
  subject: string;
}

/** A subject as a noun phrase: `this <item>`, `the <also name>`, `this scope`, or the range's item. */
function subjectPhrase(subject: string, at: Scope): string {
  if (subject === "on") return `this ${at.act.on ?? "item"}`;
  if (subject === "scope") return "this scope";
  if (subject === "each") return at.range ? `the ${at.range}` : "each item";
  if (subject.startsWith("also.")) return `the ${subject.slice(5)}`;
  return raw(subject);
}

function entryPart(part: unknown, at: Scope): string {
  if (typeof part === "string") return `'s ${part}`;
  if (!isRecord(part)) return ` ${raw(part)}`;
  if (typeof part["field"] === "string") return `'s field ${part["field"]}`;
  if (typeof part["opened"] === "string") return `'s opened ${part["opened"]}`;
  if (typeof part["carried"] === "string") return `'s carried ${part["carried"]}`;
  if (isRecord(part["set"])) return `'s set ${String(part["set"]["slot"])} of ${operand(part["set"]["item"], at)}`;
  if (part["of"] !== undefined && typeof part["then"] === "string") return `${entryPart(part["of"], at)}, then its ${part["then"]}`;
  return ` ${raw(part)}`;
}

/** An operand in words. */
export function operand(o: unknown, at: Scope): string {
  if (!isRecord(o)) return typeof o === "number" ? String(o) : raw(o);
  const part = o["part"] === undefined ? "" : entryPart(o["part"], at);
  if (typeof o["field"] === "string") return `the act's ${o["field"]}${part}`;
  if (typeof o["presented"] === "string") return `the presented ${o["presented"]}${part}`;
  if (typeof o["slot"] === "string") {
    const of = typeof o["of"] === "string" ? o["of"] : at.range ? "each" : at.subject;
    return `${possessive(subjectPhrase(of, at))} ${o["slot"]}${part}`;
  }
  if (typeof o["element"] === "string") return `${o["element"].includes(".") ? o["element"] : `the element ${o["element"]}`}${part}`;
  if (typeof o["item"] === "string") return subjectPhrase(o["item"], at);
  if (o["signer"] === true) return "you";
  if (o["sender"] === true) return "the sender";
  if (o["source"] !== undefined) return `the source entry${entryPart(o["source"], at)}`;
  if (typeof o["update"] === "string") return `the update's ${o["update"]}`;
  if (o["result"] === "reason") return "the result's reason";
  if (o["scope"] === true) return "this scope";
  if (o["intent"] === true) return "the intent's digest";
  if (o["none"] === true) return "nothing";
  if (Object.hasOwn(o, "const")) return describeJson(o["const"]);
  return raw(o);
}

// ---------------------------------------------------------------- guards

/** One guard sentence, with its declared name and the sentences nested under it. */
export interface Sentence { text: string; names?: string[]; nested?: Sentence[]; group?: Sentence[][]; /** The reason name, after what the form nests. */ tail?: string }

/** The possessive of a phrase: `the rules'`, `this item's`. */
export const possessive = (phrase: string): string => (/s$/.test(phrase) ? `${phrase}'` : `${phrase}'s`);

/** One sentence and what it nests, on one line: nested sentences in brackets. */
export function inline(s: Sentence): string {
  if (s.nested) return `${s.text} [${s.nested.map(inline).join("; ")}]${s.tail ?? ""}`;
  if (s.group) return `${s.text} ${s.group.map((alt) => `[${alt.map(inline).join("; ")}]`).join(" or ")}${s.tail ?? ""}`;
  return s.text;
}

/** Every name a sentence or a nested one declares, in order. */
export function namesOf(list: readonly Sentence[]): string[] {
  const out: string[] = [];
  const walk = (s: Sentence) => { out.push(...(s.names ?? [])); s.nested?.forEach(walk); s.group?.forEach((alt) => alt.forEach(walk)); };
  list.forEach(walk);
  return out;
}

/** The sentence a guard name points at, for a refusal that carries that name: the first guard, nested or not, that declares it. */
export function sentenceNamed(list: readonly Sentence[], name: string): Sentence | null {
  for (const s of list) {
    if (s.names?.includes(name)) return s;
    const inner = sentenceNamed([...(s.nested ?? []), ...(s.group ?? []).flat()], name);
    if (inner) return inner;
  }
  return null;
}

// ---------------------------------------------------------------- the complete text and the bounded description

export interface Bound {
  definition: string;
  kind: string;
  declaration: string;
  digests: readonly string[];
}

// ---------------------------------------------------------------- the input schema

const isDetached = (type: FieldLike): boolean => type.type === "text" ? type["detached"] === true
  : type.type === "list" ? isDetached(type["of"] as FieldLike)
  : type.type === "record" ? Object.values(type["of"] as Record<string, FieldLike>).some(isDetached) : false;
const isValuePlace = (type: FieldLike): boolean => type.type === "digest" && isRecord(type["value"]);

/** Which beside inputs an act takes: detached texts, presented facts, values in a byte domain. */
export function besideOf(act: ActLike): { texts: boolean; presented: boolean; values: boolean } {
  const fields = Object.values(act.fields);
  return { texts: fields.some(isDetached), presented: Object.keys(act.presents ?? {}).length > 0, values: fields.some(isValuePlace) };
}

/** What `on` is for this act: required, optional or absent (section 3, "Parameters"). */
export function onOf(act: ActLike): "required" | "absent" {
  return act.step === "transition" || (act.step === "comment" && act.on !== null) ? "required" : "absent";
}

/** Bind the full derivations to one explicit catalogue. Nested descriptions
 * retain this binding; another factory call cannot replace it. */
export function descriptionsOf(catalogue: MarkCatalogue) {
  const { MARK_TEXTS, markText, markRefusals } = markDescriptionsOf(catalogue);

  /** A field type in words. */
  function typeWords(type: FieldLike, setting: Setting, format: "full" | "compact" = "full"): string {
    if (format === "compact") return type.type === "code" || type.type === undefined ? `${String(type["code"] ?? "code")} (rule)` : type.type;
    if (typeof type["code"] === "string" && (type.type === "code" || type.type === undefined)) {
      return `a value that the platform rule checks: ${markText(setting.pinned, { code: type["code"], row: String(type["row"] ?? "") })}`;
    }
    switch (type.type) {
      case "text": return `text up to ${String(type["max"])} bytes${type["detached"] ? ", kept apart from the entry: give the text itself, or its digest with the text in texts" : ""}`;
      case "int": return `a whole number from ${String(type["min"])} to ${String(type["max"])}`;
      case "bool": return "true or false";
      case "time": return "a time, as RFC 3339 UTC ending in Z";
      case "enum": return `one of ${(type["of"] as string[]).join(", ")}`;
      case "member": return "a member, as @handle";
      case "item": return `the ID of ${article(String(type["of"]))} item on this scope`;
      case "reference": return `a document digest or entry fact, as { document } or { entry }, with an optional opaque fragment up to ${String(type["fragment"])} UTF-8 bytes; this grants no read permission`;
      case "fact": return `an entry of kind ${or(type["kind"] as string[])} under ${String(type["under"])}, as { at, seq, hash }`;
      case "scope": return `a reference to ${article(String(type["kind"]))} scope, as { scope, genesis }`;
      case "commit": return "a Git commit ID, 40 or 64 hex characters";
      case "tree": return "a Git tree ID, 40 or 64 hex characters";
      case "digest": {
        const value = type["value"];
        if (!isRecord(value)) return "a digest, sha256: and 64 hex characters";
        const domain = String(value["domain"]);
        const base = `the digest of a value in the ${domain === DEFINITION_DOMAIN ? "definition" : domain} domain, up to ${String(value["max"])} bytes, with its bytes in values`;
        if (domain !== DEFINITION_DOMAIN) return base;
        const active = setting.active ?? [];
        return `${base} or read from the rules scope; choices from the rules scope: ${active.length === 0 ? "none active" : active.map((d) => `${d.name} ${d.digest}`).join(", ")}`;
      }
      case "record": {
        const members = type["of"] as Record<string, FieldLike>;
        return `a record of ${Object.entries(members).map(([name, member]) => `${name}${member.required ? " (required)" : ""}: ${typeWords(member, setting)}`).join("; ")}`;
      }
      case "list": return `a list of up to ${String(type["max"])}, each ${typeWords(type["of"] as FieldLike, setting)}`;
      default: return raw(type);
    }
  }

  function fieldLines(act: Pick<ActSummary, "fields">, setting: Setting, format: "full" | "compact" = "full"): string[] {
    return Object.entries(act.fields).map(([name, field]) => format === "compact"
      ? `${name}${field.required ? "" : "?"}:${typeWords(field, setting, "compact")}`
      : `${name}${field.required ? " (required)" : ""}: ${typeWords(field, setting)}`);
  }


  const where = (clauses: unknown, at: Scope): string =>
    (Array.isArray(clauses) && clauses.length > 0 ? ` where ${and(clauses.map((c) => sentence(c, at).text))}` : "");

  function range(r: unknown, at: Scope): { type: string; states: string; where: string; except: string } {
    if (!isRecord(r)) return { type: raw(r), states: "", where: "", except: "" };
    const type = String(r["type"]);
    const inner: Scope = { ...at, range: type };
    const except = Array.isArray(r["except"]) && r["except"].length > 0 ? `, except ${and((r["except"] as string[]).map((s) => subjectPhrase(s, at)))}` : "";
    return { type, states: or((r["states"] as string[] | undefined) ?? []), where: where(r["where"], inner), except };
  }

  /** `a equals b`, or `you are b` when the signer is the first operand. */
  const compare = (a: string, b: string, same: boolean): string => (a === "you" ? `you are ${same ? "" : "not "}${b}` : `${a} ${same ? "equals" : "differs from"} ${b}`);

  const bound = (v: unknown, at: Scope): string => (typeof v === "number" ? String(v) : operand(v, at));

  const UNKNOWN_GUARD = "a guard of an unrecognized form";

  /** One guard as a sentence. Unknown guards never become agent-directed text. */
  function sentence(g: unknown, at: Scope): Sentence {
    if (!isRecord(g)) return { text: UNKNOWN_GUARD };
    // A platform mark: the platform's text for it, with the refusal names its rule declares.
    if (typeof g["code"] === "string" && typeof g["row"] === "string" && Object.keys(g).every((k) => k === "code" || k === "row")) {
      const names = markRefusals(at.setting.pinned, g["code"]);
      return { text: `${markText(at.setting.pinned, { code: g["code"], row: g["row"] })}${names.length > 0 ? ` (${names.join(", ")})` : ""}`, ...(names.length > 0 ? { names: [...names] } : {}) };
    }
    const subject = typeof g["of"] === "string" ? g["of"] : "on";
    const here: Scope = { ...at, subject };
    const s = subjectPhrase(subject, here);
    const named = (made: Sentence): Sentence => {
      const reason = typeof g["reason"] === "string" ? g["reason"] : undefined;
      const when = g["ifPresent"] === true ? ", when it is given" : "";
      const nests = made.nested !== undefined || made.group !== undefined;
      const suffix = `${when}${reason ? ` (${reason})` : ""}`;
      return { ...made, ...(nests ? (suffix ? { tail: suffix } : {}) : { text: `${made.text}${suffix}` }), ...(reason ? { names: [reason] } : {}) };
    };
    if (Array.isArray(g["state"])) return named({ text: `${s} is ${or(g["state"] as string[])}` });
    if (Array.isArray(g["signer"])) return named({ text: `you are ${possessive(s)} ${or(g["signer"] as string[])}` });
    if (Array.isArray(g["notIn"])) return named({ text: `neither you nor your principal is ${possessive(s)} ${or(g["notIn"] as string[])}` });
    if (typeof g["set"] === "string") return named({ text: `${possessive(s)} ${g["set"]} is set` });
    if (typeof g["unset"] === "string") return named({ text: `${possessive(s)} ${g["unset"]} is not set` });
    if (isRecord(g["equals"])) return named({ text: compare(operand(g["equals"]["a"], here), operand(g["equals"]["b"], here), true) });
    if (isRecord(g["differs"])) return named({ text: compare(operand(g["differs"]["a"], here), operand(g["differs"]["b"], here), false) });
    if (isRecord(g["some"])) { const r = range(g["some"], here); return named({ text: `some ${r.type} is ${r.states}${r.where}${r.except}` }); }
    if (isRecord(g["none"])) { const r = range(g["none"], here); return named({ text: `no ${r.type} is ${r.states}${r.where}${r.except}` }); }
    if (isRecord(g["count"])) {
      const r = range(g["count"], here);
      const min = g["count"]["min"] === undefined ? "0" : bound(g["count"]["min"], here);
      const count = g["count"]["max"] === undefined ? `at least ${min}` : `between ${min} and ${bound(g["count"]["max"], here)}`;
      return named({ text: `${count} ${plural(r.type)} are ${r.states}${r.where}${r.except}` });
    }
    if (isRecord(g["every"])) return named({ text: `every item in the act's ${String(g["every"]["list"])} is ${or((g["every"]["states"] as string[]) ?? [])}` });
    if (isRecord(g["fact"])) {
      const f = g["fact"];
      if (typeof f["field"] === "string") {
        const type = at.act.fields[f["field"]];
        const kinds = Array.isArray(type?.["kind"]) ? or(type!["kind"] as string[]) : "its declared kind";
        return named({ text: `the act's ${f["field"]} names an entry of kind ${kinds} under ${String(type?.["under"] ?? "its declared definition")}${where(f["where"], here)}` });
      }
      if (typeof f["presented"] === "string") {
        const p = at.act.presents?.[f["presented"]];
        return named({ text: `the presented ${f["presented"]} names an entry of kind ${p ? or(p.kind) : "its declared kind"} under ${p?.under ?? "its declared definition"}` });
      }
      if (typeof f["element"] === "string") return named({ text: `${f["element"]} names an entry of its declared kind` });
      return { text: UNKNOWN_GUARD };
    }
    if (isRecord(g["before"])) return named({ text: `now is before ${possessive(s)} ${String(g["before"]["slot"])}` });
    if (isRecord(g["after"])) return named({ text: `now is after ${possessive(s)} ${String(g["after"]["slot"])}` });
    if (typeof g["rule"] === "string") {
      const expression = at.definition.rules?.[g["rule"]];
      return named({ text: `the rule ${g["rule"]} holds: ${expression ?? "(its expression is not in the definition)"}` });
    }
    if (isRecord(g["each"])) {
      const e = g["each"];
      return named({ text: `for each ${String(e["as"])} in ${operand(e["list"], here)}${where(e["where"], here)}:`, nested: guards(e["guards"], here) });
    }
    if (isRecord(g["has"])) {
      const h = g["has"];
      const inner = Array.isArray(h["guards"]) && h["guards"].length > 0 ? guards(h["guards"], here) : undefined;
      return named({ text: `some ${String(h["as"])} in ${operand(h["list"], here)}${where(h["where"], here)}${inner ? " has:" : ""}`, ...(inner ? { nested: inner } : {}) });
    }
    if (Array.isArray(g["anyOf"])) return named({ text: "one of:", group: (g["anyOf"] as unknown[]).map((alt) => guards(alt, here)) });
    if (isRecord(g["distinct"])) {
      const d = g["distinct"];
      // A key that is the element itself: the elements are distinct.
      const whole = isRecord(d["key"]) && d["key"]["element"] === d["as"] && d["key"]["part"] === undefined;
      return named({ text: whole ? `no two elements of ${operand(d["list"], here)} are the same` : `no two ${String(d["as"])} in ${operand(d["list"], here)} have the same ${operand(d["key"], here)}` });
    }
    if (isRecord(g["sameSet"])) {
      const d = g["sameSet"];
      const r = range(d["items"], here);
      const match = Array.isArray(d["match"]) && d["match"].length > 0 ? ` matched by ${and((d["match"] as unknown[]).map((c) => sentence(c, { ...here, range: r.type }).text))}` : "";
      return named({ text: `the ${operand(d["key"], here)} of each ${String(d["as"])} in ${operand(d["list"], here)} are exactly the ${r.type} items that are ${r.states}${r.where}${r.except}${match}${d["ordered"] ? ", in order" : ""}` });
    }
    if (isRecord(g["capability"])) {
      const c = g["capability"];
      const args = Object.entries(isRecord(c["with"]) ? c["with"] : {}).map(([name, arg]) => `${name} ${capabilityArg(arg, here)}`);
      return named({ text: `${String(c["name"])}'s rule ${String(c["guard"])} holds, with ${args.length > 0 ? and(args) : "no arguments"}` });
    }
    return { text: UNKNOWN_GUARD };
  }

  function capabilityArg(arg: unknown, at: Scope): string {
    if (isRecord(arg) && arg["each"] !== undefined && typeof arg["as"] === "string") return `${operand(arg["value"], at)} for each ${arg["as"]} in ${operand(arg["each"], at)}`;
    if (isRecord(arg) && isRecord(arg["items"]) && typeof arg["slot"] === "string") { const r = range(arg["items"], at); return `the ${arg["slot"]} of each ${r.type} that is ${r.states}${r.where}${r.except}`; }
    return operand(arg, at);
  }

  function guards(list: unknown, at: Scope): Sentence[] {
    return Array.isArray(list) ? list.map((g) => sentence(g, at)) : [{ text: UNKNOWN_GUARD }];
  }

  /** The act's guards as sentences, in written order. */
  function guardSentences(definition: DefinitionLike, act: ActLike, setting: Setting): Sentence[] {
    return guards(act.guards, { act, definition, setting, range: null, subject: "on" });
  }




  return { MARK_TEXTS, markText, markRefusals, typeWords, fieldLines,
    sentence, guardSentences };
}

// The compact declaration line reads no native marks or refusal metadata.
const compactDescriptions = descriptionsOf({});
