/** Signed package codecs and retained-value reads run against native SQLite.
 * The Rules scope/installation fold metadata below is an explicit stand-in:
 * this tests the proof reader's binding and byte boundary, not creation-chain
 * ownership, native installation, operator trust or export admission. */
import { expect, test } from "vitest";
import type { DeclaredDefinition, Digest, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import type { Item, StateView } from "@generalbusiness/dap-derive";
import { created } from "@generalbusiness/dap-derive/testing";
import { packApplication } from "@generalbusiness/dap-platform/application";
import { BASE_COHORT } from "@generalbusiness/dap-platform";
import { APPLICATION_RELEASE_VALUE, APPLICATION_SEMANTIC_VALUE } from "../../platform/src/application-install.ts";
import { APPLICATION_RELEASE_VALUE2, APPLICATION_SEMANTIC_VALUE2 } from "../../platform/src/application-install-v2.ts";
import { APPLICATION_ARCHIVE_PROOF_BYTES, isApplicationArchiveProofRefusal, readApplicationArchiveProof, storedApplicationArchiveProof } from "../src/applications/archive-proof.ts";
import { SqliteStore } from "../src/sqlite.ts";
import type { Store } from "../src/store.ts";
import { PREPARATION_BOUNDS } from "../src/preparation-budget.ts";
import { archiveSql } from "./support/archive.ts";
import { create } from "./fixtures-native.ts";
import { applicationCounterPacket2, fixedSigner } from "./fixtures.ts";

const refs = {
  directory: created(undefined, { source: "TEST archive directory" }, "archive-directory").at,
  membership: created(undefined, { source: "TEST archive membership" }, "archive-membership").at,
  destination: created(undefined, { source: "TEST archive destination" }, "archive-destination").at,
  application: created(undefined, { source: "TEST archive application" }, "archive-application").at,
};
type ProofStore = StateView & Pick<Store, "retainedSize" | "retained"> & Pick<SqliteStore, "itemBytes" | "itemPositions">;
type DamagedProof = { v: number; release: { sig: string }; installation: { definition: Digest; ids: { presentation: Digest } } };

test("archive install proof binds Base Rules, exact signed IDs and native retained byte limits without codec fallback", async () => {
  const packet = await applicationCounterPacket2(), lane = await create(), item = 7;
  await lane.inside(state => {
    const sql = archiveSql(state), store = new SqliteStore(sql), actual = store.scope()!;
    const installation = { id: item, type: "installation", state: "active", refs: {
      membership: refs.membership, destination: refs.destination, scope: refs.application,
    }, values: { definition: packet.package.semantic.entry, ...packet.ids, publisher: packet.package.release.manifest.publisher } } as unknown as Item;
    const room = { id: 0, type: "rules", state: "current", refs: { directory: refs.directory }, values: { membership: refs.membership.scope } } as unknown as Item;
    const bodies: string[] = [];
    const source = {
      scope: () => ({ ...actual, kind: "rules", head: { ...actual.head, seq: item } }),
      item: (id: number) => id === item ? installation : null,
      page: () => ({ items: [room], more: false }),
      itemBytes: (id: number) => id === item ? utf8(canonicalize(installation)).length : null,
      itemPositions: () => [{ id: 0, size: utf8(canonicalize(room)).length }],
      retainedSize: store.retainedSize.bind(store),
      retained: (...args: Parameters<Store["retained"]>) => { bodies.push(args[1]); return store.retained(...args); },
    } as unknown as ProofStore;
    const put = (domain: string, digest: typeof packet.ids.release, value: unknown) => store.retain({ kind: "value", domain, digest, bytes: canonicalize(value) });
    put(APPLICATION_SEMANTIC_VALUE2.domain, packet.ids.semantic, packet.package.semantic);
    put(APPLICATION_RELEASE_VALUE2.domain, packet.ids.release, packet.package.release);
    const expected = { named: BASE_COHORT.rules, rules: actual.at, directory: refs.directory, item };
    const answer = storedApplicationArchiveProof(source, BASE_COHORT.rules, refs.directory, item);
    expect(typeof answer).toBe("string");
    if (typeof answer !== "string") return;
    expect(utf8(answer).length).toBeLessThanOrEqual(APPLICATION_ARCHIVE_PROOF_BYTES);
    expect(readApplicationArchiveProof(answer, expected)).toMatchObject({ v: 2, publisher: packet.package.release.manifest.publisher,
      installation: { item, definition: packet.package.semantic.entry, ids: packet.ids, scope: refs.application } });
    expect(bodies).toEqual([packet.ids.semantic, packet.ids.release]);
    // Scalar item metadata refuses before either complete attributed record.
    let recordReads = 0;
    const oversizedMetadata = { ...source, itemBytes: () => PREPARATION_BOUNDS.metadata,
      item: () => { recordReads++; throw Error("must not read oversized installation"); },
      page: () => { recordReads++; throw Error("must not read Rules record after cap refusal"); } } as ProofStore;
    expect(storedApplicationArchiveProof(oversizedMetadata, BASE_COHORT.rules, refs.directory, item)).toEqual({ reason: "metadata-limit" });
    expect(recordReads).toBe(0);
    const ambiguousMetadata = { ...oversizedMetadata, itemPositions: () => [{ id: 0, size: 1 }, { id: 1, size: 1 }] } as ProofStore;
    expect(storedApplicationArchiveProof(ambiguousMetadata, BASE_COHORT.rules, refs.directory, item)).toEqual({ reason: "malformed-or-unsupported" });
    expect(recordReads).toBe(0);
    expect(storedApplicationArchiveProof(oversizedMetadata, "platform:rules@999", refs.directory, item)).toEqual({ reason: "malformed-or-unsupported" });
    expect(recordReads).toBe(0);
    const wrong: ScopeRef = { ...refs.directory, genesis: textDigest("TEST wrong directory birth") };
    expect(storedApplicationArchiveProof(source, BASE_COHORT.rules, wrong, item)).toEqual({ reason: "malformed-or-unsupported" });
    expect(storedApplicationArchiveProof(source, BASE_COHORT.rules, refs.directory, item + 1)).toEqual({ reason: "installation-not-active" });
    const pending = { ...source, item: () => ({ ...installation, state: "pending" }) } as ProofStore;
    expect(storedApplicationArchiveProof(pending, BASE_COHORT.rules, refs.directory, item)).toEqual({ reason: "installation-not-active" });
    const refused = { ...source, item: () => ({ ...installation, state: "refused" }) } as ProofStore;
    expect(storedApplicationArchiveProof(refused, BASE_COHORT.rules, refs.directory, item)).toEqual({ reason: "malformed-or-unsupported" });
    const provisional = { ...source, scope: () => ({ ...source.scope()!, status: "provisional" }) } as ProofStore;
    expect(storedApplicationArchiveProof(provisional, BASE_COHORT.rules, refs.directory, item)).toEqual({ reason: "installation-not-active" });
    const refusedScope = { ...source, scope: () => ({ ...source.scope()!, status: "refused" }) } as ProofStore;
    expect(storedApplicationArchiveProof(refusedScope, BASE_COHORT.rules, refs.directory, item)).toEqual({ reason: "malformed-or-unsupported" });
    expect(readApplicationArchiveProof(answer, { ...expected, directory: wrong })).toBeNull();
    expect(readApplicationArchiveProof(answer, { ...expected, item: item + 1 })).toBeNull();
    expect(readApplicationArchiveProof(answer, { ...expected, rules: wrong })).toBeNull();
    expect(readApplicationArchiveProof(answer, { ...expected, named: "platform:rules@5" })).toBeNull();
    expect(readApplicationArchiveProof(answer + " ", expected)).toBeNull();
    for (const mutate of [
      (value: DamagedProof) => { value.release.sig = (value.release.sig[0] === "A" ? "B" : "A") + value.release.sig.slice(1); },
      (value: DamagedProof) => { value.installation.definition = definitionDigest(created().definition.declared); },
      (value: DamagedProof) => { value.installation.ids.presentation = textDigest("TEST wrong presentation"); },
      (value: DamagedProof) => { value.v = 1; },
    ]) {
      const value = JSON.parse(answer) as DamagedProof; mutate(value);
      expect(readApplicationArchiveProof(canonicalize(value), expected)).toBeNull();
    }
    // Oversized source metadata refuses before selecting either proof body.
    sql.exec("UPDATE retained_value SET bytes=? WHERE domain=? AND digest=?", "x".repeat(APPLICATION_SEMANTIC_VALUE2.max + 1), APPLICATION_SEMANTIC_VALUE2.domain, packet.ids.semantic).toArray();
    bodies.length = 0;
    expect(storedApplicationArchiveProof(source, BASE_COHORT.rules, refs.directory, item)).toEqual({ reason: "malformed-or-unsupported" });
    expect(bodies).toEqual([]);
    sql.exec("UPDATE retained_value SET bytes=? WHERE domain=? AND digest=?", canonicalize(packet.package.semantic), APPLICATION_SEMANTIC_VALUE2.domain, packet.ids.semantic).toArray();
    sql.exec("DELETE FROM retained_value WHERE domain=? AND digest=?", APPLICATION_RELEASE_VALUE2.domain, packet.ids.release).toArray();
    expect(storedApplicationArchiveProof(source, BASE_COHORT.rules, refs.directory, item)).toEqual({ reason: "retained-proof-missing" });
    const sig = packet.package.release.sig;
    const damaged = { ...packet.package.release, sig: ((sig[0] === "A" ? "B" : "A") + sig.slice(1)) as typeof sig };
    put(APPLICATION_RELEASE_VALUE2.domain, packet.ids.release, damaged);
    expect(storedApplicationArchiveProof(source, BASE_COHORT.rules, refs.directory, item)).toEqual({ reason: "malformed-or-unsupported" });
  });

  // The old native pin selects only its v1 domains and signature codec.
  const definition = JSON.parse(packet.package.semantic.definitions.find(part => part.id === packet.package.semantic.entry)!.bytes) as DeclaredDefinition, digest = definitionDigest(definition);
  const legacy = await packApplication({ name: "test.archive-proof-v1", version: "1", semantic: { v: 1,
    entry: digest, definitions: [{ id: digest, bytes: canonicalize(definition) }], host: { execution: "recorded-do", profiles: ["restricted@1"] },
    projections: {}, capabilities: [], roles: {}, predecessor: null,
  }, presentation: { v: 1, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {} } }, fixedSigner(142));
  await lane.inside(state => {
    const store = new SqliteStore(archiveSql(state)), actual = store.scope()!;
    const job = { id: item, type: "installation", state: "active", refs: { membership: refs.membership, destination: refs.destination, scope: refs.application },
      values: { definition: legacy.package.semantic.entry, ...legacy.ids, publisher: legacy.package.release.manifest.publisher } } as unknown as Item;
    const room = { id: 0, type: "rules", state: "current", refs: { directory: refs.directory }, values: { membership: refs.membership.scope } } as unknown as Item;
    const source = { scope: () => ({ ...actual, kind: "rules", head: { ...actual.head, seq: item } }), item: () => job,
      page: () => ({ items: [room], more: false }),
      itemBytes: (id: number) => id === item ? utf8(canonicalize(job)).length : null,
      itemPositions: () => [{ id: 0, size: utf8(canonicalize(room)).length }],
      retainedSize: store.retainedSize.bind(store), retained: store.retained.bind(store) } as unknown as ProofStore;
    store.retain({ kind: "value", domain: APPLICATION_SEMANTIC_VALUE.domain, digest: legacy.ids.semantic, bytes: canonicalize(legacy.package.semantic) });
    store.retain({ kind: "value", domain: APPLICATION_RELEASE_VALUE.domain, digest: legacy.ids.release, bytes: canonicalize(legacy.package.release) });
    const answer = storedApplicationArchiveProof(source, "platform:rules@5", refs.directory, item);
    expect(typeof answer).toBe("string");
    if (typeof answer === "string") {
      expect(readApplicationArchiveProof(answer, { named: "platform:rules@5", rules: actual.at, directory: refs.directory, item })).toMatchObject({ v: 1, installation: { ids: legacy.ids } });
      expect(readApplicationArchiveProof(answer, { named: BASE_COHORT.rules, rules: actual.at, directory: refs.directory, item })).toBeNull();
    }
  });
});

test("archive proof refusals expose exactly one closed reason and no sender data", () => {
  for (const reason of ["installation-not-active", "retained-proof-missing", "metadata-limit", "malformed-or-unsupported"]) {
    expect(isApplicationArchiveProofRefusal({ reason })).toBe(true);
    expect(isApplicationArchiveProofRefusal({ reason, label: "sender" })).toBe(false);
    expect(isApplicationArchiveProofRefusal({ reason, payload: "proof" })).toBe(false);
  }
  for (const value of [null, "installation-not-active", {}, { reason: "unknown" }, { reason: 1 }, ["metadata-limit"]])
    expect(isApplicationArchiveProofRefusal(value)).toBe(false);
});
