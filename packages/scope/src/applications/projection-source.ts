/** Two native metadata peers, selected only after the read owner authenticates
 * and checks the target's recorded birth. No R2, Git or application code. */
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isRecord, isScopeRef, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { applicationJson } from "@generalbusiness/dap-bytes/application";
import type { Binding } from "../namespace.ts";
import type { PreparationRun } from "../preparation-flight.ts";
export const APPLICATION_DECLARATION_BYTES = 132 * 1024;
export interface ApplicationDeclarationSource {
  read(directory: ScopeRef, install: number, name: string, run: PreparationRun): Promise<unknown>;
}
interface DirectoryPeer { applicationRoomBytes(): Promise<string | null> }
interface RulesPeer { applicationProjectionDeclarationBytes(directory: ScopeRef, install: number, name: string): Promise<string | null> }
function owned(bytes: unknown, most: number): unknown {
  if (typeof bytes !== "string" || bytes.length > most || utf8(bytes).length > most) return null;
  const value: unknown = parseStrict(bytes);
  return applicationJson(value, most) === bytes ? value : null;
}
export function applicationDeclarationsIn(binding: Binding): ApplicationDeclarationSource {
  return { async read(directory, install, name, run) {
    if (!run.active()) return null;
    try {
      // Do not race these RPCs against a second timer. A late underlying
      // task keeps the owner's flight occupied until it actually settles.
      const reply = await (binding.get(binding.idFromName(directory.scope)) as DirectoryPeer).applicationRoomBytes();
      if (!run.active()) return null;
      const room = owned(reply, 1024);
      if (!isRecord(room) || Object.keys(room).sort().join() !== "directory,rules" || !isScopeRef(room["directory"])
        || canonicalize(room["directory"]) !== canonicalize(directory) || !isScopeRef(room["rules"]) || room["rules"].kind !== "rules") return null;
      const declared = await (binding.get(binding.idFromName(room["rules"].scope)) as RulesPeer).applicationProjectionDeclarationBytes(directory, install, name);
      return run.active() ? owned(declared, APPLICATION_DECLARATION_BYTES) : null;
    } catch { return null; }
  } };
}
