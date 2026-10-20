/** Timestamp metadata from the native owner of a captured item read. This
 * checks exact refs/head and bounded shape; it is not a separate entry-body
 * verification or a permission to look up foreign facts. */
import type { Digest, Head, Item, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isFactRef, isHead, isLocalId, isRecord, parseStrict, timeMs } from "./index.ts";
import { applicationJson } from "./application-json.ts";
import { APPLICATION_PROJECTION_LIMITS as B, projectionFailure, type ApplicationItemProjectionSource } from "./application-projection-types.ts";

export interface ApplicationFactTimeRead {
  readonly scope: ScopeRef;
  readonly at: Head;
  readonly entries: readonly { readonly seq: number; readonly hash: Digest; readonly time: Timestamp }[];
}
const unavailableProjection = (): never => projectionFailure("unavailable");
export interface ApplicationProjectionFactRef { readonly seq: number; readonly hash: Digest | null }
export function applicationProjectionFactRefs(source: ApplicationItemProjectionSource, scope: ScopeRef, at: Head, items: readonly Pick<Item, "refs">[]): readonly ApplicationProjectionFactRef[] {
  const refs = new Map<number, ApplicationProjectionFactRef>();
  const fields = Object.values(source.fields).filter(field => field.from.kind === "fact-time");
  if (items.length > B.rows || fields.length > B.fields) return unavailableProjection();
  for (const item of items) for (const field of fields) {
    const value = item.refs[field.from.name];
    if (value === null && field.nullable) continue;
    // Native self refs are local entry positions. Full refs must name this
    // exact scope; neither form may select a future entry.
    const ref = isLocalId(value) ? { seq: value, hash: null } : isFactRef(value) && canonicalize(value.at) === canonicalize(scope) ? { seq: value.seq, hash: value.hash } : null;
    if (!ref || ref.seq > at.seq) return unavailableProjection();
    const prior = refs.get(ref.seq);
    if (prior?.hash && ref.hash && prior.hash !== ref.hash) return unavailableProjection();
    refs.set(ref.seq, prior?.hash ? prior : ref);
  }
  return [...refs.values()].sort((a, b) => a.seq - b.seq);
}
export function readApplicationFactTimes(value: unknown, scope: ScopeRef, at: Head, refs: readonly ApplicationProjectionFactRef[]): ReadonlyMap<number, Timestamp> {
  const owned: unknown = parseStrict(applicationJson(value, B.metadataBytes));
  if (!isRecord(owned) || Object.keys(owned).sort().join() !== "at,entries,scope" || !isHead(owned["at"])
    || canonicalize(owned["scope"]) !== canonicalize(scope) || canonicalize(owned["at"]) !== canonicalize(at)
    || !Array.isArray(owned["entries"]) || owned["entries"].length !== refs.length) return unavailableProjection();
  const times = new Map<number, Timestamp>();
  for (let i = 0; i < refs.length; i++) {
    const entry: unknown = owned["entries"][i], ref = refs[i]!;
    if (!isRecord(entry) || Object.keys(entry).sort().join() !== "hash,seq,time" || entry["seq"] !== ref.seq
      || !isDigest(entry["hash"]) || ref.hash !== null && entry["hash"] !== ref.hash || timeMs(entry["time"]) === null) return unavailableProjection();
    times.set(ref.seq, entry["time"] as Timestamp);
  }
  return times;
}
