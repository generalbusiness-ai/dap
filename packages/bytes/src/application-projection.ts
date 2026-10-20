/** Bounded projection declarations only. Native schema binding and actual
 * journal reads belong to the reader; this module performs neither. */
import { CAPABILITIES, type Capability, type Digest, type ScopeKind } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, isDigest, isRecord, parseStrict, utf8 } from "./index.ts";
import { applicationJson } from "./application-json.ts";
import { ApplicationPackageError } from "./application-types.ts";
import { APPLICATION_PROJECTION_LIMITS as B, ApplicationProjectionError, type ApplicationReadProjection } from "./application-projection-types.ts";
export * from "./application-projection-types.ts";
const NAME = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const KINDS: Record<ScopeKind, true> = { register: true, directory: true, membership: true, rules: true, destination: true, inbox: true, task: true, lane: true };
const META = new Set(["id", "type", "state", "revision"]);
const fail = (reason: ApplicationProjectionError["reason"] = "invalid"): never => { throw new ApplicationProjectionError(reason); };
const object = (value: unknown, keys: string): Record<string, unknown> => isRecord(value) && Object.keys(value).sort().join() === keys ? value : fail();
const name = (value: unknown): string => typeof value === "string" && NAME.test(value) ? value : fail();
const integer = (value: unknown, min: number, max: number): number => typeof value === "number" && Number.isSafeInteger(value) && !Object.is(value, -0) && value >= min && value <= max ? value : fail();
function names(value: unknown, most: number, ordered = false, read = name): readonly string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > most) return fail("limit");
  const found = value.map(read);
  if (new Set(found).size !== found.length || ordered && found.some((item, i) => i > 0 && found[i - 1]! >= item)) return fail();
  return found;
}
/** Native preparation kinds may appear in fact slots; no caller-defined
 * capability or step is introduced by projection metadata. */
function entryKind(value: unknown): string {
  if (typeof value !== "string") return fail();
  if (NAME.test(value)) return value;
  const split = value.indexOf(":"), capability = value.slice(0, split), step = value.slice(split + 1);
  const table = CAPABILITIES as Readonly<Record<string, Capability>>;
  return split > 0 && Object.hasOwn(table, capability) && Object.hasOwn(table[capability]!.steps, step) ? value : fail();
}
function record(value: unknown, most: number, minimum = 1): Record<string, unknown> {
  if (!isRecord(value)) return fail();
  const keys = Object.keys(value);
  if (keys.length < minimum || keys.length > most) return fail("limit");
  for (const key of keys) name(key);
  return value;
}
function fieldType(value: unknown, budget: { left: number }, depth = 0): void {
  if (--budget.left < 0 || depth >= B.typeDepth) return fail("limit");
  if (!isRecord(value)) return fail();
  switch (value["type"]) {
    case "text": object(value, "max,type"); integer(value["max"], 1, B.textBytes); return;
    case "int": {
      object(value, "max,min,type"); const min = integer(value["min"], -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
      integer(value["max"], min, Number.MAX_SAFE_INTEGER); return;
    }
    case "bool": case "time": case "digest": case "commit": case "tree": case "member": object(value, "type"); return;
    case "enum": {
      object(value, "of,type"); const members = value["of"];
      if (!Array.isArray(members) || !members.length || members.length > 64) return fail("limit");
      if (members.some(member => typeof member !== "string" || !member.length || utf8(member).length > 256) || new Set(members).size !== members.length) return fail();
      return;
    }
    case "item": object(value, "of,type"); name(value["of"]); return;
    case "scope": object(value, "kind,type"); if (typeof value["kind"] !== "string" || !Object.hasOwn(KINDS, value["kind"])) return fail(); return;
    case "fact": object(value, "kind,type,under"); name(value["under"]); names(value["kind"], 64, false, entryKind); return;
    case "list": object(value, "max,of,type"); integer(value["max"], 1, 64); fieldType(value["of"], budget, depth + 1); return;
    case "record": {
      object(value, "of,type");
      for (const child of Object.values(record(value["of"], B.fields, 0))) {
        if (!isRecord(child) || typeof child["required"] !== "boolean") return fail();
        const { required: _required, ...type } = child;
        fieldType(type, budget, depth + 1);
      }
      return;
    }
    default: return fail();
  }
}
function freeze(value: unknown): void {
  if (value !== null && typeof value === "object") { for (const part of Object.values(value)) freeze(part); Object.freeze(value); }
}
/** Own the complete bounded JSON before inspecting fields. This refuses
 * accessors and retains no caller-owned nested object. */
export function readApplicationProjection(value: unknown): ApplicationReadProjection {
  let owned: unknown;
  try { owned = parseStrict(applicationJson(value, B.metadataBytes)); }
  catch (error) { return fail(error instanceof ApplicationPackageError && error.reason === "limit" ? "limit" : "invalid"); }
  const body = object(owned, "definition,revision,sources,v");
  if (body["v"] !== 1 || !isDigest(body["definition"]) || body["revision"] !== "revision") return fail();
  const budget = { left: B.typeNodes };
  for (const given of Object.values(record(body["sources"], B.sources))) {
    if (isRecord(given) && (given["read"] === "entries" || given["read"] === "latest-entry")) {
      const source = object(given, "acts,fields,latestBy,limit,read,window");
      names(source["acts"], 32, true); integer(source["window"], 1, B.rows);
      integer(source["limit"], 1, source["read"] === "latest-entry" ? 1 : B.rows);
      const fields = record(source["fields"], B.fields, 0);
      for (const [alias, given] of Object.entries(fields)) {
        if (META.has(alias) || alias === "time" || alias === "on") return fail();
        const field = object(given, "from,nullable,of"), from = object(field["from"], "kind,name");
        if (typeof field["nullable"] !== "boolean" || from["kind"] !== "field" && from["kind"] !== "signer") return fail();
        name(from["name"]);
        if (from["kind"] === "signer" && from["name"] !== "member") return fail();
        fieldType(field["of"], budget);
      }
      if (source["latestBy"] !== null && (source["read"] === "latest-entry" || typeof source["latestBy"] !== "string" || !Object.hasOwn(fields, source["latestBy"]))) return fail();
      continue;
    }
    const source = object(given, "fields,item,limit,read,states"); name(source["item"]); names(source["states"], 16, true);
    if (typeof source["read"] !== "string" || !["item", "one", "many"].includes(source["read"])) return fail();
    integer(source["limit"], 1, source["read"] === "many" ? B.rows : 1);
    for (const [key, given] of Object.entries(record(source["fields"], B.fields, 0))) {
      if (META.has(key)) return fail();
      const field = object(given, "from,nullable,of"), from = object(field["from"], "kind,name");
      if (typeof from["kind"] !== "string" || !["value", "party", "ref", "fact-time"].includes(from["kind"]) || typeof field["nullable"] !== "boolean") return fail();
      name(from["name"]); fieldType(field["of"], budget);
    }
  }
  freeze(owned);
  return owned as ApplicationReadProjection;
}
export function applicationProjectionId(value: ApplicationReadProjection): Digest {
  return digestBytes(utf8("dap-application-projection-1\n" + canonicalize(readApplicationProjection(value))));
}
