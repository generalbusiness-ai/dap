/** Bounded raw birth metadata and process-local byte admission. No read grant. */
import type { Digest, Entry, GenesisEntry, PlatformDefinition, ScopeId, ScopeKind, SequenceRef } from "@generalbusiness/dap-contract";
import { admitSequenceGenesis, freeze, isDigest, isFactRef, isPlatformDefinition, isRecord, isScopeId, isScopeKind, isSequenceRef, utf8, wellFormed, type CheckedSequence } from "@generalbusiness/dap-bytes";
import { same } from "@generalbusiness/dap-derive";
import { PreparationBudget } from "./preparation-budget.ts";
import type { ReadPreparation } from "./read-preparation.ts";
import { PROOF_BYTE_BOUNDS, proofEntry, type ProofBody } from "./proof-bytes.ts";

export interface NativeBirth {
  v: 1;
  proof: ProofBody;
  named: Digest | PlatformDefinition;
  declarationName: string;
  native: boolean;
}
/** Process-local admission only. RPC senders still return the five-key NativeBirth. */
export interface AdmittedNativeBirth {
  readonly birth: NativeBirth;
  readonly entry: GenesisEntry;
  readonly sequence: CheckedSequence;
}
export interface NativeBirthSource { read(at: SequenceRef, milliseconds: number, maxBytes?: number): Promise<NativeBirth | null> }
export interface NativeBirthNameSource { read(name: ScopeId, kind: ScopeKind, milliseconds: number, maxBytes?: number): Promise<NativeBirth | null> }
const genesisEntry = (entry: Entry | null): entry is GenesisEntry => entry !== null && entry.seq === 0 && entry.prev === null && entry.input.type === "genesis";
/** Admit the closed wire view before parsing its entry bytes. Native execution
 * still relies on the trusted one-namespace sender, as exact proof reads do. */
export function readNativeBirth(value: unknown, at: SequenceRef, maxBytes: number, debit: (bytes: number) => void): AdmittedNativeBirth | null {
  let birth: NativeBirth, expected: SequenceRef, bytes: number;
  try {
    if (!isSequenceRef(at) || !Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > PROOF_BYTE_BOUNDS.body || typeof debit !== "function") return null;
    expected = Object.freeze({ scope: at.scope, genesis: at.genesis });
    if (!isSequenceRef(expected) || !isRecord(value) || Object.keys(value).sort().join() !== "declarationName,named,native,proof,v") return null;
    const named = value["named"], declarationName = value["declarationName"], proof = value["proof"];
    if (value["v"] !== 1 || !(isDigest(named) || isPlatformDefinition(named)) || value["native"] !== isPlatformDefinition(named)
      || typeof declarationName !== "string" || !wellFormed(declarationName) || declarationName.length > 256 || utf8(declarationName).length > 256
      || !isRecord(proof) || !isFactRef(proof["fact"]) || proof["fact"].seq !== 0 || !same(proof["fact"].at, expected)
      || typeof proof["bytes"] !== "string" || proof["bytes"].length > maxBytes) return null;
    bytes = utf8(proof["bytes"]).length;
    if (bytes > maxBytes) return null;
    birth = Object.freeze({ v: 1, named, declarationName, native: isPlatformDefinition(named), proof: Object.freeze({
      fact: Object.freeze({ at: expected, seq: proof["fact"].seq, hash: proof["fact"].hash }), bytes: proof["bytes"],
    }) });
  } catch { return null; }
  // The caller owns the existing operation budget. Preserve its exact
  // limit/timeout stop rather than disguising it as malformed Native data.
  debit(bytes);
  const sequence = admitSequenceGenesis(birth.proof.bytes, expected, maxBytes);
  if (!sequence) return null;
  const entry = proofEntry(birth.proof, birth.proof.fact, maxBytes, sequence);
  if (!genesisEntry(entry) || (entry.input.decision !== "applied" && entry.input.decision !== "refused")
    || entry.input.seed.definition !== birth.named) return null;
  freeze(entry);
  return Object.freeze({ birth, entry, sequence });
}

/** The existing preparation owns pre-parse metadata/genesis/definition
 * admission and exact current code support. No legacy source() call or
 * retained/derived under label is involved. */
export function nativeBirth(preparation: ReadPreparation, at: unknown, budget: PreparationBudget = new PreparationBudget(), maxBytes: number = PROOF_BYTE_BOUNDS.body): NativeBirth | null {
  if (!isSequenceRef(at) || !Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > PROOF_BYTE_BOUNDS.body) return null;
  const captured = preparation.birth(budget, maxBytes);
  if (!captured || !same(captured.scope.at, at) || !captured.pinned.definition || !budget.available) return null;
  const name = captured.pinned.definition.declared.name;
  if (typeof name !== "string" || name.length > 256 || utf8(name).length > 256) return null;
  return { v: 1, proof: captured.birth, named: captured.pinned.named, declarationName: name, native: captured.pinned.platform !== null };
}

/** Internal discovery of an indexed object's incarnation. The caller must
 * still authenticate the returned genesis and its creation lineage. */
export function nativeBirthByName(preparation: ReadPreparation, name: unknown, kind: unknown, budget: PreparationBudget = new PreparationBudget(), maxBytes: number = PROOF_BYTE_BOUNDS.body): NativeBirth | null {
  if (!isScopeId(name) || !isScopeKind(kind) || !Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > PROOF_BYTE_BOUNDS.body) return null;
  const captured = preparation.birth(budget, maxBytes);
  if (!captured || captured.scope.at.scope !== name || captured.sequence.kind !== kind || !captured.pinned.definition || !budget.available) return null;
  const declarationName = captured.pinned.definition.declared.name;
  if (typeof declarationName !== "string" || !wellFormed(declarationName) || utf8(declarationName).length > 256) return null;
  return { v: 1, proof: captured.birth, named: captured.pinned.named, declarationName, native: captured.pinned.platform !== null };
}
