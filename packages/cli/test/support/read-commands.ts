// STAND-IN: scripted HTTP replies for one destination scope and one
// membership scope. No scope judged these entries or summaries. The replies
// show what `remote`, `show` and `acts` render from given native reads; they
// prove no admission, authority or publication.
import { entryHash, keyIdOfSecret, textDigest } from "@generalbusiness/dap-bytes";
import type { Fetch } from "@generalbusiness/dap-client";
import type { Entry, Head, ScopeRef } from "@generalbusiness/dap-contract";
import type { Context } from "../../src/command-context.ts";
import { memoryStore, type Config, type Store } from "../../src/store.ts";

export const SECRET = new Uint8Array(32).fill(7);
export const KEY = keyIdOfSecret(SECRET);
export const SERVICE = "https://service.test";
export const DESTINATION: ScopeRef = { scope: `sc_${"a".repeat(52)}`, genesis: textDigest("TEST destination genesis") };
export const MEMBERSHIP: ScopeRef = { scope: `sc_${"b".repeat(51)}a`, genesis: textDigest("TEST membership genesis") };
export const HEAD: Head = { seq: 7, hash: `sha256:${"e".repeat(64)}` };
export const MEMBERSHIP_HEAD: Head = { seq: 3, hash: `sha256:${"f".repeat(64)}` };
export const DEFINITION = "platform:destination@19";
export const REMOTE = "https://git.test/git/demo/r.git";
export const ENTRY: Entry = { v: 1, genesis: DESTINATION.genesis, seq: 5, prev: textDigest("TEST prev"), time: "2026-10-07T12:00:00Z", clamped: false, epoch: 0,
  input: { type: "checkpoint", through: 4, state: textDigest("TEST state") }, uses: [], prepared: [], effects: [], sends: [] };
export const ENTRY_HASH = entryHash(ENTRY);
const TIME = "2026-10-07T12:00:00Z";

export const roomConfig = (remote?: string): Config => ({ v: 2, service: SERVICE, key: "operator",
  repository: { directory: { ...DESTINATION, scope: `sc_${"d".repeat(51)}a` }, membership: MEMBERSHIP, destination: DESTINATION.scope, rules: `sc_${"c".repeat(51)}a` },
  ...(remote === undefined ? {} : { remote }) });

/** What the scripted service answers. `fail`: every scope read throws this error at the fetch, as a lost connection does. */
export interface Script { repository: Record<string, string> | null; entry: "found" | "not-found"; fail: Error | null }

export function scriptedFetch(script: Script): Fetch {
  return async (url) => {
    const path = new URL(url).pathname;
    // The service has no session secret: every read is a signed read by the caller's key.
    if (path.endsWith("/sessions")) return Response.json({ ok: false, reason: "sessions-unavailable" });
    if (script.fail) throw script.fail;
    if (path === `/v1/scopes/${MEMBERSHIP.scope}`) return Response.json({ ok: true, at: MEMBERSHIP_HEAD, complete: true,
      value: { scope: MEMBERSHIP, status: "active", definition: "platform:membership@2", time: TIME, counts: [], items: [
        { id: 1, type: "key", state: "active", revision: 1, opened: null, parties: {}, refs: { member: 2 }, attributed: [], values: { id: KEY } },
        { id: 2, type: "member", state: "active", revision: 1, opened: null, parties: {}, refs: {}, attributed: [], values: { role: "admin", handle: "@operator" } },
        { id: 0, type: "roster", state: "open", revision: 1, opened: null, parties: {}, refs: {}, attributed: [], values: { adminActions: ["destination.adopt", "ledger.retry", "destination.read-token"] } },
      ] } });
    if (path === `/v1/scopes/${DESTINATION.scope}/entries/5`) return script.entry === "found"
      ? Response.json({ ok: true, at: HEAD, complete: true, value: { entry: ENTRY, hash: ENTRY_HASH } })
      : Response.json({ ok: false, reason: "not-found" }, { status: 404 });
    if (path === `/v1/scopes/${DESTINATION.scope}`) return Response.json({ ok: true, at: HEAD, complete: true,
      value: { scope: DESTINATION, status: "active", definition: DEFINITION, time: TIME, counts: [],
        items: [{ id: 0, type: "branch", state: "ready", revision: 0, opened: null, parties: {}, refs: {}, attributed: [], values: { repository: script.repository } }] } });
    return Response.json({ ok: false, reason: "not-found" }, { status: 404 });
  };
}

/** One configured room on the given store (memory by default), its script and a Context over the scripted service. */
export async function readRoom(options: { remote?: string; store?: Store } = {}): Promise<{ store: Store; script: Script; ctx: Context }> {
  const store = options.store ?? memoryStore();
  await store.keep("operator", SECRET);
  await store.save(roomConfig(options.remote));
  const script: Script = { repository: { host: "artifacts", namespace: "demo", name: "r", id: "r" }, entry: "found", fail: null };
  return { store, script, ctx: { store, fetch: scriptedFetch(script), now: () => Date.parse(TIME) } };
}
