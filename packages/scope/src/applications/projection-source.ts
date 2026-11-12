import { answersVersionQuestion } from "@generalbusiness/dap-platform";
/** Two native metadata peers, selected only after the read owner authenticates
 * and checks the target's recorded birth. No R2, Git or application code. */
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isRecord, isScopeRef, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { applicationJson } from "@generalbusiness/dap-platform/application";
import type { Binding } from "../namespace.ts";
import type { PreparationRun } from "../preparation-flight.ts";
import { isRoomRetiredStop, type RoomRetiredStop } from "../room-retired.ts";
export const APPLICATION_DECLARATION_BYTES = 132 * 1024;
const RETIRED_DECLARATION = Symbol("retired-application-declaration");
export interface ApplicationDeclarationSource {
  read(directory: ScopeRef, install: number, name: string, run: PreparationRun): Promise<unknown>;
}
interface DirectoryPeer { applicationRoomBytes(): Promise<string | null | RoomRetiredStop> }
interface RulesPeer { applicationProjectionDeclarationBytes(directory: ScopeRef, install: number, name: string): Promise<string | null | RoomRetiredStop> }
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
      if (isRoomRetiredStop(reply)) throw RETIRED_DECLARATION;
      const room = owned(reply, 1024);
      if (!isRecord(room)) return null;
      const keys = Object.keys(room).sort().join();
      if (keys !== "directory,rules" && (keys !== "directory,membershipDefinition,rules"
        || (!answersVersionQuestion(room["membershipDefinition"], "applicationProjectionMembership")))) return null;

      if (!isScopeRef(room["directory"])
        || canonicalize(room["directory"]) !== canonicalize(directory) || !isScopeRef(room["rules"]) || room["rules"].kind !== "rules") return null;
      const declared = await (binding.get(binding.idFromName(room["rules"].scope)) as RulesPeer).applicationProjectionDeclarationBytes(directory, install, name);
      if (run.active() && isRoomRetiredStop(declared)) throw RETIRED_DECLARATION;
      return run.active() ? owned(declared, APPLICATION_DECLARATION_BYTES) : null;
    } catch (failed) { if (failed === RETIRED_DECLARATION) throw failed; return null; }
  } };
}
