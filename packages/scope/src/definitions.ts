/**
 * The definitions a scope retains for its children (scope contract, sections
 * 5.1, 6.1, 7.2 and 9.2). No registry holds a declaration. A declaration is
 * immutable bytes named by their digest, and the scope that may create a
 * child under it retains those bytes:
 *
 * - A scope retains its own declaration, and the declaration of every
 *   definition its own names in a `create` send, and of every definition
 *   those name in turn. They are supplied when a directory is created, and
 *   read from the creator when a child is created.
 * - A child, before its genesis turn, reads the declaration its seed names
 *   from its creator, by digest, and checks the digest.
 *
 * So a creator can always supply what its children need, for as long as its
 * history is retained.
 */

import type { Digest } from "@generalbusiness/dap-contract";
import { namedDeclarations } from "@generalbusiness/dap-derive";
import type { ValidDefinition } from "@generalbusiness/dap-derive";
import type { DefinitionRead } from "./ports.ts";
import type { Retained } from "./store.ts";

// Preserve the native scope module's existing export.
export { creates } from "@generalbusiness/dap-derive";

/**
 * What a scope under `root` retains for its children: the declaration of
 * each definition that `root` names in a `create` send, and that those name
 * in turn, as `read` supplies them.
 *
 * - `absent`: legacy birth leaves it out, and a creation under it waits
 *   (`dependency-unavailable`). Opt-in birth refuses before genesis, with
 *   a validation problem naming the missing declaration.
 * - Bytes that are not a valid declaration with that digest:
 *   `unsupported-definition`. Nothing is retained.
 * - Bytes that cannot be read now: `unavailable`. Nothing is retained.
 * - More than `limit` definitions named: `unsupported-definition`.
 */
export async function namedBy(root: ValidDefinition, read: (digest: Digest) => Promise<DefinitionRead>, validate: (bytes: string) => ValidDefinition | null, limit: number) {
  const named = await namedDeclarations(root, read, validate, limit);
  if (!named.ok) return named;
  const retain: Retained[] = named.declarations.map(declared => ({ kind: "definition", ...declared }));
  return { ok: true as const, retain };
}
