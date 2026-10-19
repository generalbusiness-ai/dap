/** Strict composition syntax shared without a bytes/derive dependency cycle.
 * Digest identities have already been checked by the caller's codec; every
 * currently usable reference must name one of those exact definitions. */
import type { Digest } from "@generalbusiness/dap-contract";
import { PACKAGE_COMPOSITION_LIMITS as B, type PackageComposition } from "./types.ts";

export class PackageCompositionError extends Error {
  constructor(readonly reason: "bounds" | "unsupported-form", readonly path: string, detail: string) { super(`${reason} at ${path}: ${detail}`); }
}
const fail = (path: string, detail: string): never => { throw new PackageCompositionError("bounds", path, detail); };
const object = (value: unknown, path: string): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : fail(path, "is an object");
const only = (value: unknown, path: string, keys: string): Record<string, unknown> => {
  const got = object(value, path);
  return Object.keys(got).sort().join() === keys ? got : fail(path, `has exactly ${keys}`);
};
const name = (value: unknown, path: string): string => typeof value === "string" && value.length > 0 && value.length <= B.nameUnits ? value : fail(path, "is a non-empty bounded name");
const list = (value: unknown, path: string, most: number): readonly unknown[] => Array.isArray(value) && value.length <= most ? value : fail(path, `is an array of at most ${most}`);
const dictionary = (value: unknown, path: string, most: number): Record<string, unknown> => {
  const got = object(value, path); if (Object.keys(got).length > most) return fail(path, `has at most ${most} names`);
  for (const key of Object.keys(got)) name(key, `${path}.${key}`); return got;
};
const unique = (seen: Set<string>, key: string, path: string): void => { if (seen.has(key)) fail(path, "is duplicated"); seen.add(key); };

export function readPackageComposition(value: unknown, definitions: ReadonlySet<Digest>): PackageComposition {
  const body = only(value, "composition", "connections,derivation,exercises,groups,order,parameters,rights");
  const definition = (value: unknown, path: string): Digest => typeof value === "string" && definitions.has(value as Digest) ? value as Digest : fail(path, "names a definition in this package");
  const endpoints = new Set<string>();
  for (const [i, value] of list(body["connections"], "connections", B.connections).entries()) {
    const path = `connections.${i}`, row = only(value, path, "from,item,slot,to");
    const from = definition(row["from"], `${path}.from`), item = name(row["item"], `${path}.item`), slot = name(row["slot"], `${path}.slot`);
    if (row["to"] !== "outside") definition(row["to"], `${path}.to`);
    unique(endpoints, JSON.stringify([from, item, slot]), path);
  }
  const rights = dictionary(body["rights"], "rights", B.rights);
  for (const [right, value] of Object.entries(rights)) definition(only(value, `rights.${right}`, "owner")["owner"], `rights.${right}.owner`);
  const exercises = new Set<string>();
  for (const [i, value] of list(body["exercises"], "exercises", B.exercises).entries()) {
    const path = `exercises.${i}`, row = only(value, path, "definition,right,row");
    const owner = definition(row["definition"], `${path}.definition`), declared = name(row["row"], `${path}.row`), right = name(row["right"], `${path}.right`);
    if (!Object.hasOwn(rights, right)) fail(`${path}.right`, "names a declared right");
    unique(exercises, JSON.stringify([owner, declared, right]), path);
  }
  const orders = new Set<string>();
  for (const [i, value] of list(body["order"], "order", B.order).entries()) {
    const path = `order.${i}`, row = only(value, path, "by,definition,handler");
    const owner = definition(row["definition"], `${path}.definition`), handler = name(row["handler"], `${path}.handler`);
    unique(orders, JSON.stringify([owner, handler]), path);
    if (row["by"] !== "any") {
      const by = object(row["by"], `${path}.by`), keys = Object.keys(by);
      if (keys.length !== 1 || keys[0] !== "right" && keys[0] !== "group") fail(`${path}.by`, "names one right or group");
      const key = keys[0]!; name(by[key], `${path}.by.${key}`);
      if (key === "right" && !Object.hasOwn(rights, by[key] as string)) fail(`${path}.by.right`, "names a declared right");
    }
  }
  // Future forms have no P1 interpretation. Empty places are still explicit
  // on the wire; they are not silently discarded or judged as current forms.
  const groups = list(body["groups"], "groups", B.groups);
  const derivation = object(body["derivation"], "derivation"), parameters = dictionary(body["parameters"], "parameters", B.parameters);
  if (Object.keys(derivation).length > B.derivation) fail("derivation", `has at most ${B.derivation} definitions`);
  if (groups.length) throw new PackageCompositionError("unsupported-form", "groups", "group interpretation belongs to P1g");
  if (Object.keys(derivation).length) throw new PackageCompositionError("unsupported-form", "derivation", "derivation belongs to P5");
  if (Object.keys(parameters).length) throw new PackageCompositionError("unsupported-form", "parameters", "parameters belong to P5");
  for (const [i, value] of (body["order"] as readonly Record<string, unknown>[]).entries()) if (typeof value["by"] === "object" && value["by"] !== null && Object.hasOwn(value["by"], "group")) throw new PackageCompositionError("unsupported-form", `order.${i}.by`, "group order belongs to P1g");
  return body as unknown as PackageComposition;
}
