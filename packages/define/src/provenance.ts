/** Authoring provenance is metadata. It never enters a definition's bytes. */
import type { DeclaredDefinition, Digest } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, parseStrict } from "@generalbusiness/dap-bytes";

const parents = new WeakMap<DeclaredDefinition, { definition: DeclaredDefinition; digest: Digest }>();
const families = ["items", "acts", "receives", "timed", "rules"] as const;
type Family = typeof families[number];
export interface DefinitionProvenance {
  readonly parent: Digest;
  readonly added: Readonly<Record<Family, readonly string[]>>;
}
export interface CompiledParent { readonly definition: DeclaredDefinition; readonly digest: Digest }

/** Preserve authoring metadata across the existing normalization copy. */
export function copyDefinitionProvenance<D extends DeclaredDefinition>(from: D, into: D): D {
  const parent = parents.get(from);
  if (parent) parents.set(into, parent);
  return into;
}

/** Mark an extension of a compiled parent. The child keeps its own declarations. */
export function extend<const D extends DeclaredDefinition>(parent: CompiledParent, child: D): D {
  if (definitionDigest(parent.definition) !== parent.digest) throw new Error("the compiled parent digest does not match its definition");
  const held = parseStrict(canonicalize(parent.definition)) as DeclaredDefinition;
  parents.set(child, { definition: held, digest: parent.digest });
  definitionProvenance(child);
  return child;
}

/** Recheck parent preservation when compile consumes the child, including later edits. */
export function definitionProvenance(child: DeclaredDefinition): DefinitionProvenance | null {
  const parent = parents.get(child);
  if (!parent) return null;
  for (const key of ["format", "profile", "genesis", "capabilities", "level", "capacity"] as const) {
    const before = parent.definition[key], after = child[key];
    if (before === undefined ? after !== undefined : after === undefined || canonicalize(before) !== canonicalize(after)) {
      throw new Error(`an extension cannot replace its parent's ${key}`);
    }
  }
  const added = Object.fromEntries(families.map((family) => {
    const before = parent.definition[family], after = child[family];
    for (const [name, value] of Object.entries(before)) {
      if (!Object.hasOwn(after, name) || canonicalize(value) !== canonicalize(after[name])) {
        throw new Error(`an extension cannot replace its parent's ${family}.${name}`);
      }
    }
    return [family, Object.keys(after).filter(name => !Object.hasOwn(before, name)).sort()];
  })) as Record<Family, string[]>;
  return { parent: parent.digest, added };
}
