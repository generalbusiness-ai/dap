/** Bounded reconstruction from public journal entries. The caller must obtain
 * its acknowledged prefix from the application's own recorded cursor. This
 * does not read a native record table or infer absence from a short suffix. */
import type { Digest, FactRef, Head, MemberRef, ScopeRef, Sealed } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isFactRef, isMemberRef } from "@generalbusiness/artroom-bytes";
import type { SimulatedDevice } from "./simulator.ts";

const CAPABILITY: string = "device-command@1";
export const COMMAND_SUFFIX_ENTRIES = 800;
export const COMMAND_SUFFIX_BYTES = 4 * 1024 * 1024;
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
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
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
        if (!opened || !["confirmed", "refused", "unknown"].includes(effect.state) || v["decided"] !== 1 || v["answerAt"] !== entry.seq
          || typeof v["description"] !== "string" || new TextEncoder().encode(v["description"]).length > 1024
          || Object.keys(v).sort().join(",") !== "answerAt,decided,description,device,kind,level,owner,target,targetAt"
          || !equal(binding, { device: opened.device, kind: opened.kind, target: opened.target, level: opened.level, owner: opened.owner })) return invalid();
        records.delete(key);
      }
    }
    previous = sealed.hash; position++;
  }
  if (previous !== head.hash) return invalid();
  return [...records.values()];
}
