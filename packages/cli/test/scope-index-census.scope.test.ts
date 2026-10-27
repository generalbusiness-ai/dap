/** Real Native scope births, registered index rows/SQL, install-signer gate,
 * routed reads and unchanged entry-0/hash/pin verification. Host configuration,
 * local config/files, aligned setup clock and the in-process fetch bridge are
 * TEST fixtures. No hosted deployment or unregistered-object inventory runs. */
import { expect, test } from "vitest";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { ARCHIVE_DEVICE_APPLICATION_COHORT } from "@generalbusiness/dap-platform";
import { scopeCensusFixture } from "../../scope/test/support/scope-census-fixture.ts";
import { observeSessionReads, type SessionReadChoice } from "../../scope/test/session-settings.ts";
import { scopeIndexCommand, type IndexFiles } from "../src/scope-index-command.ts";
import { readIndexManifest } from "../src/scope-index-manifest.ts";
import type { Context } from "../src/commands.ts";
import { memoryStore } from "../src/store.ts";

// Invariant: the real census gives the unchanged versions reader both rooms,
// while the existing 6499 repository traversal still lists only its own room.
// Required leases keep command reads on the actual Signed/session policy.
test("Native CLI census lists the registered fleet for versions while ordinary inventory stays repository-only", async () => {
  const f = await scopeCensusFixture();
  const choices: SessionReadChoice[] = [];
  const stopWatching = observeSessionReads(f.life.owner, choice => choices.push(choice));
  try {
    const saved = new Map<string, Uint8Array>(), calls: { method: string; path: string; cursor: string | null; authority: string }[] = [];
    const deny = async (): Promise<never> => expect.fail("The census witness requests no local secret or configuration mutation.");
    const ctx: Context = { now: Date.now, store: { ...memoryStore(), config: async () => f.config, signer: async () => f.operator,
      secret: deny, save: deny, keep: deny, private: deny, keepPrivate: deny, newSigner: deny },
      fetch: async (url, init) => {
        const parsed = new URL(url), census = parsed.pathname === "/v1/scope-index/census";
        const options = init as typeof init & { redirect?: string; credentials?: string };
        if (census) {
          expect(options?.redirect).toBe("error"); expect(options?.credentials).toBe("omit");
          expect(parsed.searchParams.get("limit")).toBe("100");
        }
        const authorization = init?.headers?.["authorization"] ?? "";
        calls.push({ method: init?.method ?? "GET", path: parsed.pathname, cursor: parsed.searchParams.get("cursor"),
          authority: authorization.startsWith("Signed ") ? "Signed" : authorization.startsWith("Session ") ? "Session" : "none" });
        // The shared fixture forwards the actual method/body/authorization to
        // the real Worker route. Node-only redirect/credential flags are TEST
        // bridge assertions above, not simulated provider redirect handling.
        return f.fetch(url, init);
      } };
    const files: IndexFiles = { read: async path => {
      const bytes = saved.get(path); if (!bytes) expect.fail("The command must read its complete saved manifest."); return bytes.slice();
    }, save: async (path, bytes) => {
      expect(saved.has(path)).toBe(false); saved.set(path, bytes.slice());
    } };
    await f.life.owner.required(async () => {
      const census = await scopeIndexCommand(ctx, ["census", "--out", "TEST-census.json"], files);
      expect(census.code).toBe(0); expect(census.lines).toHaveLength(1);
      expect(JSON.parse(census.lines[0]!)).toMatchObject({ v: 1, outcome: "complete", rows: f.rows.length, pages: 1, written: true });
      expect(calls).toEqual([{ method: "GET", path: "/v1/scope-index/census", cursor: "", authority: "Signed" }]);
      const manifest = readIndexManifest(saved.get("TEST-census.json")!, f.service, f.root);
      expect(Object.keys(manifest)).toEqual(["v", "service", "root", "scopes"]);
      expect(manifest.scopes).toEqual(f.rows);

      calls.length = 0;
      const versions = await scopeIndexCommand(ctx, ["versions", "--manifest", "TEST-census.json"], files);
      expect(versions.code).toBe(0);
      const observed = JSON.parse(versions.lines[0]!) as { ready: boolean; listed: number; rows: { at: ScopeRef; result: string; definition?: string }[] };
      expect(observed.ready).toBe(true); expect(observed.listed).toBe(f.rows.length);
      const pins: Partial<Record<ScopeRef["kind"], string>> = ARCHIVE_DEVICE_APPLICATION_COHORT;
      expect(observed.rows).toEqual(f.rows.map(row => ({ at: row.at, result: "verified", definition: pins[row.at.kind] })));
      const entryReads = calls.filter(call => call.path.endsWith("/entries/0"));
      expect(new Set(entryReads.map(call => call.path))).toEqual(new Set(f.rows.map(row => `/v1/scopes/${row.at.scope}/entries/0`)));
      expect(calls.some(call => call.path.includes("/history"))).toBe(false);

      calls.length = 0;
      const inventory = await scopeIndexCommand(ctx, ["inventory", "--out", "TEST-repository.json"], files);
      expect(inventory.code).toBe(0);
      const repository = readIndexManifest(saved.get("TEST-repository.json")!, f.service, f.root);
      const own = [f.R.name, f.D.name, ...f.children.map(node => node.name)], other = [f.other.R.name, f.other.D.name, ...f.other.children.map(node => node.name)];
      expect(new Set(repository.scopes.map(row => row.at.scope))).toEqual(new Set(own));
      expect(manifest.scopes).toHaveLength(own.length + other.length);
      expect(other.every(scope => manifest.scopes.some(row => row.at.scope === scope))).toBe(true);
      expect(other.every(scope => repository.scopes.every(row => row.at.scope !== scope))).toBe(true);
      expect(calls.some(call => other.some(scope => call.path.includes(scope)))).toBe(false);
      expect(choices.length).toBeGreaterThan(0);
      expect(choices.every(choice => choice.branch === "real" && choice.sessions && choice.requiredLeases > 0)).toBe(true);
      console.info("TEST-native-census-command-proof-v1", { censusRows: manifest.scopes.length, censusPages: 1,
        verifiedPins: observed.rows.length, repositoryRows: repository.scopes.length, otherRepositoryRows: other.length,
        genericReadsUsedRealRequiredPolicy: true,
        qualification: "Actual Native index/gate/route/entry hash and pin reads; TEST configuration/files, setup clock and in-process wire bridge. Registered scopes only; not a hosted census or absence proof." });
    });
  } finally { stopWatching(); f.life.release(); }
});
