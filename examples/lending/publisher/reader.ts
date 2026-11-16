/** Read a publisher trailer, then reproduce the entire commit with the shared fold. No branch or scope exchange occurs here. */
import type { FactRef, ScopeRef } from "@generalbusiness/dap-contract";
import { isFactRef, isScopeRef } from "@generalbusiness/dap-bytes";
import { idOf, objectId, parseCommit, type ObjectId } from "@generalbusiness/dap-git";
import { buildPublication, type BuiltPublication, type PublicationInput } from "./fold.ts";

export interface PublicationTrailer { readonly scope: ScopeRef; readonly through: FactRef; readonly base: ObjectId | null }
const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

export function readPublicationTrailer(bytes: Uint8Array): PublicationTrailer | null {
  try {
    const parsed = parseCommit(bytes), raw = text.decode(bytes);
    const boundary = raw.indexOf("\n\n");
    if (boundary < 0 || !raw.endsWith("\n")) return null;
    const message = raw.slice(boundary + 2);
    const match = /(?:^|\n)Dap-Scope: ([^\n]+)\nDap-Genesis: ([^\n]+)\nDap-Through: (0|[1-9][0-9]*) ([^\n]+)\nDap-Base: ([^\n]+)\n$/.exec(message);
    if (!match || message.slice(0, match.index).split("\n").some(line => /^Dap-(Scope|Genesis|Through|Base):/.test(line))) return null;
    const scope = { scope: match[1], genesis: match[2] };
    const through = { at: scope, seq: Number(match[3]), hash: match[4] };
    if (!isScopeRef(scope) || !isFactRef(through)) return null;
    const base = match[5] === "none" ? null : objectId(match[5], "base");
    if (base === null ? parsed.parents.length !== 0 : parsed.parents.length !== 1 || parsed.parents[0] !== base) return null;
    return { scope, through, base };
  } catch { return null; }
}

export type PublicationCheck = { readonly ok: true; readonly publication: BuiltPublication }
  | { readonly ok: false; readonly reason: "trailer" | "scope" | "through" | "base" | "commit" };

export function checkPublication(input: PublicationInput, candidateBytes: Uint8Array): PublicationCheck {
  const trailer = readPublicationTrailer(candidateBytes);
  if (!trailer) return { ok: false, reason: "trailer" };
  if (trailer.scope.scope !== input.scope.scope || trailer.scope.genesis !== input.scope.genesis) return { ok: false, reason: "scope" };
  if (trailer.base !== input.base) return { ok: false, reason: "base" };
  if (trailer.through.seq !== input.through.seq || trailer.through.hash !== input.through.hash) return { ok: false, reason: "through" };
  // A failed reconstruction remains a failed read. Do not report a mismatch when its inputs were incomplete.
  const publication = buildPublication(input), expected = publication.objects.at(-1)!.data;
  if (publication.commit !== idOf("commit", candidateBytes) || expected.length !== candidateBytes.length
    || expected.some((byte, index) => byte !== candidateBytes[index])) return { ok: false, reason: "commit" };
  return { ok: true, publication };
}
