/** Bounded reconstruction from public journal entries. The caller must obtain
 * its acknowledged prefix from the application's own recorded cursor. This
 * does not read a native record table or infer absence from a short suffix. */
import type { Digest, FactRef, Head, MemberRef, ScopeRef, Sealed } from "@generalbusiness/dap-contract";
import { isLocalId as integer, canonicalize, entryHash, isFactRef, isMemberRef } from "@generalbusiness/dap-bytes";
import type { SimulatedDevice } from "./simulator.ts";

const CAPABILITY: string = "device-command@1";
export const COMMAND_SUFFIX_ENTRIES = 800;
// Keep reply headroom inside the invocation's four-MiB total allowance.
// One extra bounded history page can be fetched before this prefix fills;
// later owner-entry proofs, snapshots and signed-write replies still fit.
export const COMMAND_SUFFIX_BYTES = 1024 * 1024;
export const COMMAND_SUFFIX_RECORDS = 64;
export interface OpenCommand {
  readonly fact: FactRef;
  readonly device: number;
  readonly kind: SimulatedDevice["kind"];
  readonly target: SimulatedDevice["target"];
  readonly level: number;
  readonly owner: MemberRef;
}
const equal = (a: unknown, b: unknown): boolean => canonicalize(a) === canonicalize(b);
const invalid = (): never => { throw new Error("incomplete or invalid device-command journal coverage"); };

/** A complete chain through one exact head, after a previously acknowledged
 * closed prefix. A suffix ending before the head is never evidence that no
 * command remains open. Ownership is the full current MemberRef. */
export function openCommands(scope: ScopeRef, owner: MemberRef, through: FactRef | null, head: Head, suffix: readonly Sealed[]): readonly OpenCommand[] {
  if (!isMemberRef(owner) || (through !== null && (!isFactRef(through) || !equal(through.at, scope))) || !integer(head.seq)) return invalid();
  const from = through === null ? 0 : through.seq + 1;
  if (from > head.seq + 1 || head.seq - from + 1 > COMMAND_SUFFIX_ENTRIES || suffix.length !== head.seq - from + 1) return invalid();
  if (new TextEncoder().encode(canonicalize(suffix)).length > COMMAND_SUFFIX_BYTES) return invalid();
  const records = new Map<number, OpenCommand>();
  let previous: Digest | null = through?.hash ?? null, position = from, recordCount = 0;
  for (const sealed of suffix) {
    const entry = sealed.entry;
    if (entry.seq !== position || !equal(entry.at, scope) || entry.prev !== previous || entryHash(entry) !== sealed.hash) return invalid();
    for (const effect of entry.effects) {
      if (effect.effect !== "record" || effect.capability !== CAPABILITY || effect.kind !== "command") continue;
      if (++recordCount > COMMAND_SUFFIX_RECORDS || effect.key.length !== 1 || !integer(effect.key[0])) return invalid();
      const key = effect.key[0], v = effect.values;
      if (!integer(v["device"]) || typeof v["kind"] !== "string" || !["vent", "fan", "heater"].includes(v["kind"])
        || typeof v["target"] !== "string" || !["open", "closed", "on", "off"].includes(v["target"]) || !integer(v["level"]) || v["level"] > 100
        || v["targetAt"] !== key || !isMemberRef(v["owner"]) || !equal(v["owner"], owner)) return invalid();
      const binding = { device: v["device"], kind: v["kind"] as OpenCommand["kind"], target: v["target"] as OpenCommand["target"], level: v["level"], owner };
      if (effect.state === "open") {
        if (key !== entry.seq || records.has(key) || v["decided"] !== 0
          || Object.keys(v).sort().join(",") !== "decided,device,kind,level,owner,target,targetAt") return invalid();
        records.set(key, { fact: { at: scope, seq: entry.seq, hash: sealed.hash }, ...binding });
      } else {
        const opened = records.get(key);
        if (!["confirmed", "refused", "unknown"].includes(effect.state) || v["decided"] !== 1 || v["answerAt"] !== entry.seq
          || typeof v["description"] !== "string" || new TextEncoder().encode(v["description"]).length > 1024
          || Object.keys(v).sort().join(",") !== "answerAt,decided,description,device,kind,level,owner,target,targetAt") return invalid();
        // A summary can acknowledge a command whose closing entry lies
        // after the scanned head. Later windows encounter that closure;
        // its older key is already covered by the trusted cursor contract.
        if (!opened) { if (key < from) continue; return invalid(); }
        if (!equal(binding, { device: opened.device, kind: opened.kind, target: opened.target, level: opened.level, owner: opened.owner })) return invalid();
        records.delete(key);
      }
    }
    previous = sealed.hash; position++;
  }
  if (previous !== head.hash) return invalid();
  return [...records.values()];
}

/** Current public history cursors accept an explicit decimal entry position
 * (scope reads.ts). Thereafter follow the server's opaque continuation.
 * A long gap returns a bounded prefix with complete=false, never a fabricated
 * empty command set for the unscanned remainder. */
export async function readCommandJournal(reader: Pick<import("@generalbusiness/dap-client").ScopeHandle, "history">,
  scope: ScopeRef, owner: MemberRef, through: FactRef | null, head: Head): Promise<{ entries: readonly Sealed[]; open: readonly OpenCommand[]; through: FactRef | null; complete: boolean }> {
  if (through !== null && (!isFactRef(through) || !equal(through.at, scope))) return invalid();
  const start = through === null ? 0 : through.seq + 1;
  if (!integer(start) || !integer(head.seq) || head.seq < start - 1) return invalid();
  const entries: Sealed[] = [];
  let cursor: string | undefined = String(start), records = 0, bytes = 2, limited = false;
  for (let page = 0; page < 4 && entries.length < head.seq - start + 1 && !limited; page++) {
    const read = await reader.history(cursor);
    if (!read.ok || read.at.seq < head.seq || read.at.seq === head.seq && read.at.hash !== head.hash || read.value.length === 0) return invalid();
    for (const sealed of read.value) {
      if (sealed.entry.seq > head.seq) break;
      const changes = sealed.entry.effects.filter(effect => effect.effect === "record" && effect.capability === CAPABILITY && effect.kind === "command").length;
      const size = new TextEncoder().encode(canonicalize(sealed)).length + 1;
      if (entries.length === COMMAND_SUFFIX_ENTRIES || records + changes > COMMAND_SUFFIX_RECORDS || bytes + size > COMMAND_SUFFIX_BYTES) { limited = true; break; }
      entries.push(sealed); records += changes; bytes += size;
    }
    if (entries.at(-1)?.entry.seq === head.seq || limited) break;
    if (read.complete || typeof read.next !== "string" || read.next === cursor) return invalid();
    cursor = read.next;
  }
  const last = entries.at(-1), complete = last?.entry.seq === head.seq || start === head.seq + 1;
  if (!last && !complete) return invalid();
  const selected = complete ? head : { seq: last!.entry.seq, hash: last!.hash };
  const open = openCommands(scope, owner, through, selected, entries);
  return { entries, open, through: last ? { at: scope, seq: last.entry.seq, hash: last.hash } : through, complete };
}
