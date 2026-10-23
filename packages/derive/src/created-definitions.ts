/** Native static create-definition edges, shared by creation and archive closure. */
import type { DeclaredDefinition, Digest } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, parseStrict } from "@generalbusiness/dap-bytes";
import { byteOrder } from "./values.ts";
import type { Problem, ValidDefinition } from "./validate/index.ts";

/** The digests a declaration names in its `create` sends, once each, in byte order. A platform definition is supplied in code and is not among them. */
export function creates(declared: DeclaredDefinition): Digest[] {
  const named = new Set<Digest>();
  for (const from of [...Object.values(declared.acts), ...Object.values(declared.receives)]) {
    const late = "late" in from ? from.late?.then?.sends ?? [] : [];
    for (const send of [...from.sends, ...late]) if ("create" in send && isDigest(send.create.definition)) named.add(send.create.definition);
  }
  return [...named].sort(byteOrder);
}

export type DeclarationRead = { ok: true; bytes: string } | { ok: false; reason: "absent" | "unavailable" | "unsupported-definition" };
export type NamedDeclarations =
  | { ok: true; declarations: readonly { digest: Digest; bytes: string }[] }
  | { ok: false; reason: "unavailable" }
  | { ok: false; reason: "unsupported-definition"; problems: readonly Problem[] };

/** The reachable native child declarations, once each, excluding root.
 * Whole-scope birth requires the complete closure. Legacy birth keeps its
 * existing absent-child behavior. The limit counts distinct named children,
 * including an absent name, and cycles never read a declaration twice. */
export async function namedDeclarations(root: ValidDefinition, read: (digest: Digest) => Promise<DeclarationRead>, validate: (bytes: string) => ValidDefinition | null, limit: number): Promise<NamedDeclarations> {
  const declarations: { digest: Digest; bytes: string }[] = [];
  const asked = new Set<Digest>([root.digest]);
  const queue = creates(root.declared);
  const bad = (code: Problem["code"], digest: Digest, message: string): NamedDeclarations => ({ ok: false, reason: "unsupported-definition", problems: [{ code, path: `definitions.${digest}`, message }] });
  for (let i = 0; i < queue.length; i++) {
    const digest = queue[i]!;
    if (asked.has(digest)) continue;
    if (asked.size > limit) return bad("bound", digest, `the child-definition closure names more than ${limit} declarations`);
    asked.add(digest);
    const matched = await read(digest);
    if (!matched.ok) {
      if (matched.reason === "unavailable") return { ok: false, reason: "unavailable" };
      if (!root.declared.capacity) continue;
      return bad("name", digest, `the required child definition ${digest} is ${matched.reason === "absent" ? "missing" : "unsupported"}`);
    }
    const valid = validate(matched.bytes);
    if (valid?.digest !== digest) return bad("shape", digest, `the child definition ${digest} is not a valid declaration with that digest`);
    declarations.push({ digest, bytes: canonicalize(parseStrict(matched.bytes)) });
    queue.push(...creates(valid.declared));
  }
  return { ok: true, declarations };
}
