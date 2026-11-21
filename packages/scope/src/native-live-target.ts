/** Read-only exact-pin classification for the sender's live-target proof. */
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { isScopeRef, utf8 } from "@generalbusiness/dap-bytes";
import { same } from "@generalbusiness/dap-derive";
import { PreparationBudget } from "./preparation-budget.ts";
import { PROOF_BYTE_BOUNDS } from "./proof-bytes.ts";
import type { ReadPreparation } from "./read-preparation.ts";
import { readNativeBirth, type NativeBirth } from "./native-birth.ts";

/** This response is an internal attestation by the trusted native namespace. */
export interface NativeLiveTarget { birth: NativeBirth; level: "live" | "other" }
export interface LiveTargetSource { read(at: ScopeRef, milliseconds: number): Promise<boolean | null> }

/** One fresh bounded capture. It performs no turn, alarm recovery or live read. */
export function nativeLiveTarget(preparation: ReadPreparation, at: unknown, budget: PreparationBudget, maxBytes: number): NativeLiveTarget | null {
  if (!isScopeRef(at) || !Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > PROOF_BYTE_BOUNDS.body) return null;
  const captured = preparation.birth(budget, maxBytes);
  if (!captured || !budget.available || !same(captured.scope.at, at) || captured.scope.status !== "active" || captured.genesis.decision !== "applied") return null;
  const definition = captured.pinned.definition;
  if (!definition) return null;
  const declarationName = definition.declared.name;
  if (typeof declarationName !== "string" || utf8(declarationName).length > 256) return null;
  const birth: NativeBirth = { v: 1, proof: captured.birth, named: captured.pinned.named, declarationName, native: captured.pinned.platform !== null };
  const level = definition.declared.level?.name === "live" ? "live" : "other";
  return { birth, level };
}

/** Re-admit the closed response and its exact birth before trusting its level. */
export function readNativeLiveTarget(value: unknown, at: ScopeRef, maxBytes: number): boolean | null {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join() !== "birth,level") return null;
    const reply = value as Record<string, unknown>;
    if (reply["level"] !== "live" && reply["level"] !== "other") return null;
    const admitted = readNativeBirth(reply["birth"], at, maxBytes, () => undefined);
    if (!admitted || admitted.entry.input.decision !== "applied" || (admitted.birth.native && reply["level"] === "live")) return null;
    return reply["level"] === "live";
  } catch { return null; }
}
