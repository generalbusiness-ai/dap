/** Project one authenticated summary observation into release metadata only.
 * This is neither a genesis proof nor an independent installation replay. */
import type { Digest, KeyId, PlatformData, ReadRefusal, ScopeRef, Summary } from "@generalbusiness/dap-contract";
import { isDigest, isKeyId, isRead, isScopeRef, isSummary } from "@generalbusiness/dap-bytes";
import { readApplicationReleaseUri } from "@generalbusiness/dap-client";
import { ARCHIVE_APPLICATION_COHORT, ARCHIVE_CERTIFIED_RULES_COHORT, ARCHIVE_DECLARED_APPLICATION_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT, DECLARED_APPLICATION_COHORT, DEVICE_APPLICATION_COHORT, HARDENED_CERTIFIED_RULES_COHORT, TRUSTED_APPLICATION_COHORT, platform } from "@generalbusiness/dap-platform";

export interface InstalledApplicationRow {
  readonly scope: ScopeRef;
  readonly installItem: { readonly scope: ScopeRef; readonly item: number };
  readonly release: Digest;
  readonly publisher: KeyId;
  readonly host: string;
}
export type ApplicationListingReason = ReadRefusal | "malformed-summary" | "identity-mismatch" | "incomplete-summary" | "scope-not-active" | "malformed-installation" | "installation-pending";
export interface ApplicationListingError { readonly scope: ScopeRef; readonly why: ApplicationListingReason }
export interface ScopeApplicationListing {
  readonly applications: readonly InstalledApplicationRow[];
  readonly errors: readonly ApplicationListingError[];
}

const summaryRead = isRead(isSummary);
const installationRules: ReadonlySet<string> = new Set([
  TRUSTED_APPLICATION_COHORT.rules, DECLARED_APPLICATION_COHORT.rules,
  ARCHIVE_APPLICATION_COHORT.rules, ARCHIVE_DECLARED_APPLICATION_COHORT.rules,
  DEVICE_APPLICATION_COHORT.rules, ARCHIVE_DEVICE_APPLICATION_COHORT.rules,
  ARCHIVE_CERTIFIED_RULES_COHORT.rules, HARDENED_CERTIFIED_RULES_COHORT.rules,
]);
const sameScope = (left: ScopeRef, right: ScopeRef): boolean => left.scope === right.scope && left.inc === right.inc && left.kind === right.kind;

/** Counts name every native type/state, including unbounded retained finals.
 * Only the live states must equal the items in a complete summary. */
function nativeItemsAgree(summary: Summary, data: PlatformData, seq: number): boolean {
  const counts = new Map<string, Map<string, { n: number; listed: number }>>();
  let expected = 0;
  for (const [name, type] of Object.entries(data.items)) {
    counts.set(name, new Map());
    expected += Object.keys(type.states).length;
  }
  if (summary.counts.length !== expected) return false;
  for (const [name, state, n] of summary.counts) {
    const type = Object.hasOwn(data.items, name) ? data.items[name]! : null;
    const states = counts.get(name);
    if (!type || !Object.hasOwn(type.states, state) || !states || states.has(state)) return false;
    states.set(state, { n, listed: 0 });
  }
  let previous = -1;
  for (const item of summary.items) {
    const type = Object.hasOwn(data.items, item.type) ? data.items[item.type]! : null;
    const state = type && Object.hasOwn(type.states, item.state) ? type.states[item.state]! : null;
    const count = counts.get(item.type)?.get(item.state);
    if (!state || state.final || !count || item.id <= previous || item.id > seq || item.opened === null
      || item.revision < 1 || item.revision - 1 > seq - item.id) return false;
    previous = item.id;
    count.listed++;
  }
  for (const [name, type] of Object.entries(data.items)) {
    let live = 0;
    for (const [state, rule] of Object.entries(type.states)) {
      const count = counts.get(name)?.get(state);
      if (!count) return false;
      if (!rule.final) {
        if (count.n !== count.listed || count.n > type.max - live) return false;
        live += count.n;
      }
    }
  }
  return true;
}

/** The listed reference is already validated by readIndexManifest. Each bad
 * observation fails atomically; callers may still retain other scope results. */
export function projectScopeApplications(listed: ScopeRef, reply: unknown): ScopeApplicationListing {
  const fail = (why: ApplicationListingReason): ScopeApplicationListing => ({ applications: [], errors: [{ scope: { ...listed }, why }] });
  if (!summaryRead(reply)) return fail("malformed-summary");
  if (!reply.ok) return fail(reply.reason);
  const summary = reply.value;
  if (!sameScope(listed, summary.scope)) return fail("identity-mismatch");
  if (!reply.complete || reply.next !== undefined) return fail("incomplete-summary");
  if (summary.status !== "active") return fail("scope-not-active");

  // Declared application scopes cannot impersonate native Rules through an
  // item name. Their private items are not interpreted by this projection.
  if (isDigest(summary.definition)) return listed.kind === "rules" ? fail("unsupported-definition") : { applications: [], errors: [] };
  const code = platform(summary.definition);
  if (!code) return fail("unsupported-definition");
  const nativeKind = code.data.name === "platform:directory-partition" ? "directory" : code.data.name.slice("platform:".length);
  if (nativeKind !== listed.kind) return fail("identity-mismatch");
  if (!nativeItemsAgree(summary, code.data, reply.at.seq)) return fail("malformed-summary");
  if (listed.kind !== "rules") return { applications: [], errors: [] };
  if (!Object.hasOwn(code.data.items, "installation")) return { applications: [], errors: [] };
  if (!installationRules.has(summary.definition)) return fail("unsupported-definition");

  const applications: InstalledApplicationRow[] = [];
  const seen = new Set<string>();
  let pending = false;
  for (const item of summary.items) {
    if (item.type !== "installation") continue;
    if (item.state === "pending") { pending = true; continue; }
    if (item.state !== "active") return fail("malformed-installation");
    const scope = item.refs["scope"], membership = item.refs["membership"], destination = item.refs["destination"];
    const release = item.values["release"], publisher = item.values["publisher"];
    if (!isScopeRef(scope) || scope.kind !== "lane" || !isScopeRef(membership) || membership.kind !== "membership"
      || !isScopeRef(destination) || destination.kind !== "destination" || !isDigest(release) || !isKeyId(publisher)
      || !["definition", "semantic", "presentation"].every(name => isDigest(item.values[name])) || seen.has(scope.scope)) return fail("malformed-installation");
    let host: string;
    try { host = new URL(readApplicationReleaseUri(item.values["uri"]).remote).hostname; }
    catch { return fail("malformed-installation"); }
    seen.add(scope.scope);
    applications.push({ scope: { ...scope }, installItem: { scope: { ...listed }, item: item.id }, release, publisher, host });
  }
  return { applications, errors: pending ? [{ scope: { ...listed }, why: "installation-pending" }] : [] };
}
