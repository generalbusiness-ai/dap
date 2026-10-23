/** One explicit Directory query page; names come from content-checked local
 * definition retention. No history scan, child reads or implicit pagination. */
import { DOMAINS, PROPOSED_BOUNDS, type Digest, type ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, domainRetainedJSON, isDigest, isRecord, isScopeRef } from "@generalbusiness/dap-bytes";
import { ScopeHandle, type Transport } from "@generalbusiness/dap-client";
import type { Outcome } from "./commands.ts";

export const APPLICATION_LIST_ROWS = 25;
const cell = (text: string) => JSON.stringify(text).slice(1, -1)
  .replace(/[\u007f-\u009f\u2028\u2029]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`).replaceAll("|", "\\|");

export async function applicationList(transport: Transport, reader: unknown, directory: ScopeRef, cursor: string | null): Promise<Outcome> {
  const page = await new ScopeHandle(transport, directory.scope, reader).queryItems({
    v: 1, scope: directory, type: "application", states: ["created"], ids: null, limit: APPLICATION_LIST_ROWS, cursor,
  });
  if (!page.ok) return { code: 1, lines: [`Application query refused: ${page.reason}. Coverage is incomplete.`] };
  const rows: string[] = [], names = new Map<Digest, string | null>();
  let unavailable = 0, shortened = 0;
  for (const item of page.value.items) {
    const digest = item.values["definition"], scope = item.refs["scope"];
    if (!isDigest(digest) || !isScopeRef(scope) || scope.kind !== "lane") return { code: 1, lines: ["A Directory application row has no valid definition or scope. Coverage is incomplete."] };
    if (!names.has(digest)) {
      const kept = await transport.retained(directory.scope, reader, "definition", digest);
      const value = kept.ok ? domainRetainedJSON(DOMAINS.definition, digest, kept.value.bytes, { canonical: true, max: PROPOSED_BOUNDS.definitionBytes }) : undefined;
      names.set(digest, isRecord(value) && typeof value["name"] === "string" ? value["name"] : null);
    }
    const name = names.get(digest)!;
    if (name === null) unavailable++;
    if (name !== null && name.length > 160) shortened++;
    rows.push(`${name === null ? "(name unavailable)" : cell(name.length > 160 ? name.slice(0, 160) + "…" : name)} | ${digest} | ${canonicalize(scope)}`);
  }
  return { code: 0, lines: [
    `Applications recorded by ${directory.scope} (${directory.inc}) at entry ${page.at.seq} (${page.at.hash}).`,
    "Name | Definition | Scope (full reference)", ...rows,
    `${rows.length} created applications in this page; selected suffix ${page.complete ? "complete" : "incomplete"}.`,
    ...(unavailable ? [`Names unavailable for ${unavailable} rows; their recorded definitions and scopes are shown.`] : []),
    ...(shortened ? [`${shortened} names shortened; use their definition digests for the full declarations.`] : []),
    ...(page.next === undefined ? [] : [`Next page: dap apps --cursor ${page.next}`]),
  ] };
}
