/** A bounded native birth chain, anchored at the exact active installation.
 * The package codec already closes all declared create edges; matching a
 * selected definition alone grants no ownership. No application state is read. */
import { same } from "@generalbusiness/dap-bytes";
import type { Digest, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isScopeRef } from "@generalbusiness/dap-bytes";
import { readNativeBirth, type NativeBirthSource } from "../native-birth.ts";
import { proofEntry } from "../proof-bytes.ts";
import type { PreparationRun } from "../preparation-flight.ts";
import type { PreparedRead } from "../read-preparation.ts";

/** Additional projection-owner work, separate from unchanged G2p and native
 * item-query allowances. Counts are admission limits, not heap measurements. */
export const APPLICATION_OWNERSHIP_BOUNDS = Object.freeze({ ancestors: 16, birthBytes: 64 * 1024, totalBirthBytes: 16 * 64 * 1024 });
export async function projectionScopeOwned(frame: PreparedRead, root: ScopeRef, rootDefinition: Digest, directory: ScopeRef,
  births: NativeBirthSource | null, run: PreparationRun): Promise<"owned" | "unavailable" | "unowned" | "too-large"> {
  if (same(frame.scope.at, root)) return frame.pinned.named === rootDefinition && same(frame.genesis.seed.creator, directory) ? "owned" : "unowned";
  if (!births || !isDigest(frame.pinned.named)) return "unavailable";
  let genesis = frame.genesis;
  const seen = new Set([canonicalize(frame.scope.at)]);
  for (let count = 0; count < APPLICATION_OWNERSHIP_BOUNDS.ancestors; count++) {
    const parent = genesis.seed.creator;
    if (!isScopeRef(parent) || !genesis.source || !same(genesis.source.at, parent) || same(parent, directory) || seen.has(canonicalize(parent))) return "unowned";
    seen.add(canonicalize(parent));
    if (!run.active()) return "unavailable";
    // No second caller timer: a late underlying RPC retains this flight.
    const raw = await births.read(parent, run.remaining(), APPLICATION_OWNERSHIP_BOUNDS.birthBytes);
    if (!run.active()) return "unavailable";
    const birth = readNativeBirth(raw, parent, APPLICATION_OWNERSHIP_BOUNDS.birthBytes);
    if (!birth || birth.native || !isDigest(birth.named)) return "unowned";
    const entry = proofEntry(birth.proof, birth.proof.fact, APPLICATION_OWNERSHIP_BOUNDS.birthBytes);
    if (!entry || entry.input.type !== "genesis" || entry.input.decision !== "applied" || !same(entry.at, parent)) return "unowned";
    if (same(parent, root)) return birth.named === rootDefinition && same(entry.input.seed.creator, directory) ? "owned" : "unowned";
    genesis = entry.input;
  }
  return "too-large";
}
