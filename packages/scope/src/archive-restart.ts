/** Trusted deployment directive; never request/body/header authority. */
import type { Digest, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, isDigest, isHead, isRecord, isScopeRef, natural, parseStrict, timeMs, utf8 } from "@generalbusiness/dap-bytes";
import type { ArchivedPosition } from "./archive-row.ts";
import type { DestinationRepository } from "./destination-host.ts";
import { ArchiveBudget } from "./archive-budget.ts";
export interface ArchiveRestartDirective {
  readonly v: 1; readonly command: Digest; readonly at: ScopeRef;
  readonly repository: DestinationRepository; readonly format: "sha1" | "sha256";
  readonly confirmed: ArchivedPosition & { readonly layout: 2 };
  readonly rowDigest: Digest; readonly generation: number; readonly expires: Timestamp;
}
const fields = (v: Record<string, unknown>, names: string) => Object.keys(v).sort().join(",") === names;
/** Absolute expiry is operator-chosen; no TTL extension or inferred target. */
export function readArchiveRestart(raw: unknown, now: Timestamp, budget = new ArchiveBudget()): ArchiveRestartDirective | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 8192) return null;
  budget.spend({ metadata: 32 * 1024, inputWork: 256 * 1024 });
  if (utf8(raw).length > 8192) return null;
  try {
    const v: unknown = parseStrict(raw);
    if (!isRecord(v) || !fields(v,"at,command,confirmed,expires,format,generation,repository,rowDigest,v") || v["v"] !== 1 || canonicalize(v) !== raw
      || !isDigest(v["command"]) || !isDigest(v["rowDigest"]) || !natural(v["generation"]) || v["generation"] >= Number.MAX_SAFE_INTEGER
      || !isScopeRef(v["at"]) || !fields(v["at"] as unknown as Record<string,unknown>,"inc,kind,scope")
      || !isRecord(v["repository"]) || !fields(v["repository"],"host,id,name,namespace")
      || Object.values(v["repository"]).some(x => typeof x !== "string" || x.length === 0 || x.length > 1024)
      || (v["format"] !== "sha1" && v["format"] !== "sha256") || typeof v["expires"] !== "string") return null;
    const at = timeMs(now), end = timeMs(v["expires"]);
    if (at === null || end === null || at >= end) return null;
    const c = v["confirmed"];
    if (!isRecord(c) || !fields(c,Object.hasOwn(c,"anchorsPublished") ? "anchorsPublished,commit,layout,through" : "commit,layout,through")
      || c["layout"] !== 2 || Object.hasOwn(c,"anchorsPublished") && c["anchorsPublished"] !== true
      || typeof c["commit"] !== "string" || !(v["format"] === "sha1" ? /^[0-9a-f]{40}$/ : /^[0-9a-f]{64}$/).test(c["commit"])
      || !isHead(c["through"]) || !fields(c["through"] as unknown as Record<string,unknown>,"hash,seq")) return null;
    const { command, ...payload } = v;
    if (digestBytes(utf8(canonicalize(payload))) !== command) return null;
    budget.check();
    return v as unknown as ArchiveRestartDirective;
  } catch { return null; }
}
