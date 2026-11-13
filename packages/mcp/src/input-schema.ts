/** MCP envelope schemas. Client forms contain only declarations and descriptions. */
import { isRecord } from "@generalbusiness/dap-bytes";
import type { ActLike, DefinitionLike, FieldLike, Form, Setting } from "@generalbusiness/dap-client";
import { descriptions } from "./description-context.ts";

const { typeWords } = descriptions;
type Schema = Record<string, unknown>;
type ActForm = Pick<Form<DefinitionLike, string>, "on" | "fields" | "presents" | "beside">;
const or = (words: readonly string[]): string => (words.length <= 1 ? words.join("") : `${words.slice(0, -1).join(", ")} or ${words.at(-1)}`);

/** A presented fact: an entry by its scope reference, its position and its hash. */
const FACT_SCHEMA = {
  type: "object",
  properties: {
    at: { type: "object", properties: { scope: { type: "string" }, genesis: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" } }, required: ["scope", "genesis"], additionalProperties: false },
    seq: { type: "integer", minimum: 0 },
    hash: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" },
  },
  required: ["at", "seq", "hash"],
  additionalProperties: false,
} as const;

/** The facts an act presents, each by the name it declares, with the kinds and the definition it must be under; closed. */
function presentedSchema(declared: NonNullable<ActLike["presents"]>): Schema {
  const presents = Object.entries(declared);
  return {
    type: "object",
    description: "Facts presented beside the intent, by the names the act declares.",
    properties: Object.fromEntries(presents.map(([name, p]) => [name, { ...FACT_SCHEMA, description: `an entry of kind ${or(p.kind)} under ${p.under}${p.required ? "" : "; optional"}` }])),
    required: presents.filter(([, p]) => p.required).map(([name]) => name),
    additionalProperties: false,
  };
}

/** The controls of an act tool, at the top level; the declared fields under `fields`, so no field can collide with a control. */
export const AT_INPUT = { type: "object", additionalProperties: { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER }, description: "Captured revisions keyed by exactly the act's bound subjects (on and also aliases). Omit to read current revisions. A stale captured revision is signed unchanged and the scope decides." };

/** The JSON Schema of one field type. It carries the same facts as the words, for a host that validates. */
export function schemaOf(type: FieldLike, setting: Setting): Schema {
  const description = typeWords(type, setting);
  if (typeof type["code"] === "string" && (type.type === "code" || type.type === undefined)) return { description };
  switch (type.type) {
    case "text": return type["detached"] ? { type: "string", description } : { type: "string", maxLength: type["max"], description };
    case "int": return { type: "integer", minimum: type["min"], maximum: type["max"] };
    case "bool": return { type: "boolean" };
    case "time": return { type: "string", format: "date-time", pattern: "^(\\d{4})-(\\d{2})-(\\d{2})T(\\d{2}):(\\d{2}):(\\d{2})(?:\\.(\\d{3}))?Z$", description: "UTC, ending in Z; no fraction for whole seconds, otherwise three digits." };
    case "enum": return { type: "string", enum: type["of"] };
    case "member": return { anyOf: [{ type: "string", pattern: "^@" }, { type: "object", required: ["membership", "member"] }], description };
    case "item": return { type: "integer", minimum: 0, description };
    case "reference": {
      const fragment = { type: "string", description: `At most ${String(type["fragment"])} UTF-8 bytes` };
      const entry = { type: "object", required: ["at", "seq", "hash"], additionalProperties: false, properties: {
        at: { type: "object", required: ["scope", "genesis"], additionalProperties: false, properties: {
          scope: { type: "string" }, genesis: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" },
        } },
        seq: { type: "integer", minimum: 0 }, hash: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" },
      } };
      return { oneOf: [
        { type: "object", properties: { document: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" }, fragment }, required: ["document"], additionalProperties: false },
        { type: "object", properties: { entry, fragment }, required: ["entry"], additionalProperties: false },
      ], description };
    }
    case "fact": return { type: "object", required: ["at", "seq", "hash"], description };
    case "scope": return { type: "object", required: ["scope", "genesis"], properties: { scope: { type: "string" }, genesis: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" } }, description };
    case "commit": case "tree": return { type: "string", pattern: "^([0-9a-f]{40}|[0-9a-f]{64})$" };
    case "digest": return { type: "string", pattern: "^sha256:[0-9a-f]{64}$", ...(isRecord(type["value"]) ? { description } : {}) };
    case "record": {
      const members = type["of"] as Record<string, FieldLike>;
      return { type: "object", properties: Object.fromEntries(Object.entries(members).map(([n, m]) => [n, schemaOf(m, setting)])), required: Object.entries(members).filter(([, m]) => m.required).map(([n]) => n), additionalProperties: false };
    }
    case "list": return { type: "array", maxItems: type["max"], items: schemaOf(type["of"] as FieldLike, setting) };
    default: return { description };
  }
}


/** Build an MCP envelope around the Client form's declared inputs. Target policy stays here. */
export function actInputSchema(form: ActForm, setting: Setting, target: "required" | "optional", item: string | null): Schema {
  const beside = form.beside;
  const fields = Object.entries(form.fields);
  const properties: Record<string, unknown> = {
    target: { type: ["string", "integer"], description: target === "optional" ? "The scope: its ID. Leave it out: the room's own scope of this kind." : "The scope: its ID, or for a lane the issue or change number." },
    ...(form.on === "required" ? { on: { type: "integer", minimum: 0, description: `The local ID of the ${item ?? "item"} this act is on.` } } : {}),
    idempotencyKey: { type: "string", minLength: 1, maxLength: 128, description: "Your key for this one meaning, 1 to 128 bytes. Keep it: settle with it after a lost reply." },
    resubmit: { type: "boolean", description: "Send a refused envelope again, deliberately. The default is false." },
    at: AT_INPUT,
    fields: { type: "object", properties: Object.fromEntries(fields.map(([n, f]) => [n, schemaOf(f, setting)])), required: fields.filter(([, f]) => f.required).map(([n]) => n), additionalProperties: false },
    ...(beside.texts ? { texts: { type: "array", items: { type: "string" }, description: "Detached texts whose digests the fields name." } } : {}),
    ...(beside.presented ? { presented: presentedSchema(form.presents) } : {}),
    ...(beside.values ? { values: { type: "array", items: { type: "string" }, description: "Values beside the intent, each its canonical JSON text." } } : {}),
  };
  const required = ["idempotencyKey", ...(target === "required" ? ["target"] : []), ...(form.on === "required" ? ["on"] : []), ...(fields.some(([, f]) => f.required) ? ["fields"] : []),
    ...(Object.values(form.presents).some((p) => p.required) ? ["presented"] : [])];
  return { type: "object", properties, required, additionalProperties: false };
}
