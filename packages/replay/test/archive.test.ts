// Judged in-memory fixture authority and owner/host replies remain stand-ins.
// This witnesses the portable adapter; local Git parsing has separate tests.
import { expect, test, vi } from "vitest";
import { PROPOSED_BOUNDS, type Digest, type FactRef, type PlatformDefinition, type Request, type ScopeId, type ScopeKind } from "@generalbusiness/dap-contract";
import { admitSequenceGenesis, canonicalize, entryHash, isEntry, isSeed, newGenesisNonce, scopeIdOf, utf8 } from "@generalbusiness/dap-bytes";
import { clockOf, isObject, judgeGenesis, judgeOutcome, type Rules } from "@generalbusiness/dap-derive";
import { keys, Ledger, T0 } from "@generalbusiness/dap-derive/testing";
import { platform as nativePlatform, repositoryName } from "@generalbusiness/dap-platform";
import { installing, registerSeed } from "../../platform/test/support-creation.ts";
import { checkedPlatformData, written } from "../../platform/test/fixtures.ts";
import { served } from "./world.ts";
import { ARCHIVE_HEAD_TRUST, ARCHIVE_SOURCE_TRUST, archiveSource, verifyArchive, type ArchiveData, type ArchiveReadPort, type ArchiveSourceOptions } from "../src/archive.ts";
import { MemorySource, type MemoryScope } from "../src/source.ts";
import { TRUSTS, verify } from "../src/verify.ts";
import { render } from "../src/report.ts";
import { declaredGenesisFixture, observingDeliveryFixture, outcomeSnapshotFixture, outcomeValueFixture, type ArchiveFixture } from "./archive-fixtures.ts";

function port(scopes: readonly MemoryScope[]): ArchiveReadPort {
  return { async open(id, work) {
    work.scope();
    const held = scopes.find(scope => scope.scope.scope === id);
    if (!held) return { ok: false, result: "not-found", reason: "absent fixture ref", location: { scope: id } };
    for (const input of [...held.entries, ...held.retained]) work.bytes(utf8(input.bytes).length);
    work.spend({ entries: held.entries.length });
    const genesis = JSON.parse(held.entries[0]!.bytes), definition = genesis.input.seed.definition;
    const declaration = held.retained.find(input => input.kind === "definition" && input.digest === definition);
    const name = definition.startsWith("platform:") ? definition.split("@")[0] : declaration ? JSON.parse(declaration.bytes).name : null;
    const last = held.entries.at(-1)!;
    const archive: ArchiveData = { ...held, name, head: { seq: last.seq, hash: last.hash }, format: "sha1", commit: "a".repeat(40) };
    return { ok: true, archive };
  } };
}
const source = (fixture: ArchiveFixture, options?: ArchiveSourceOptions) => archiveSource(port(fixture.scopes), options);
const receipt = (fixture: ArchiveFixture, seq = 0): FactRef => ({ at: fixture.scopes[0]!.scope, seq, hash: fixture.scopes[0]!.entries[seq]!.hash });

// Invariant: adaptation preserves the native result, why, coverage and anchors;
// only the location-specific trust wording changes.
test.each([
  ["declared genesis", declaredGenesisFixture], ["outcome value", outcomeValueFixture],
  ["outcome snapshot", outcomeSnapshotFixture], ["observing delivery", observingDeliveryFixture],
] as const)("preserves native verification and missing-input diagnoses for %s", async (_name, make) => {
  const fixture = make(), expected = await verify(new MemorySource(fixture.scopes), fixture.options);
  const got = await verifyArchive(source(fixture), fixture.options);
  expect(got.kind).toBe("verification"); if (got.kind !== "verification") return;
  expect({ ...got.verification, report: { ...got.verification.report, trusts: got.verification.report.trusts.map(trust => trust === ARCHIVE_SOURCE_TRUST ? TRUSTS.sources : trust) } }).toEqual(expected);
  expect(got.verification.report.anchors).toEqual([]);
  expect(got.read.scopes).toBe(fixture.scopes.length);
  const missing = { ...fixture, scopes: fixture.scopes.map(scope => ({ ...scope, retained: scope.retained.filter(input => input.digest !== fixture.required.digest) })) };
  const absent = await verifyArchive(source(missing), fixture.options);
  expect(absent.kind).toBe("verification"); if (absent.kind !== "verification") return;
  expect(absent.verification.report.result).toBe("incomplete");
  expect(JSON.stringify(absent.verification.why)).toContain(fixture.required.digest);
});

// Invariant: a receipt is checked only after integrity through the archive head.
test("checks receipt scope, incarnation, position and hash after the entire prefix", async () => {
  const fixture = outcomeValueFixture(), fact = receipt(fixture), options = { ...fixture.options, mode: "integrity" as const };
  for (const [asked, expected] of [
    [fact, "archived"],
    [{ ...fact, seq: fixture.options.head!.seq + 1 }, "behind"],
    [{ ...fact, hash: `sha256:${"0".repeat(64)}` }, "mismatch"],
    [{ ...fact, at: { ...fact.at, genesis: declaredGenesisFixture().scopes[0]!.scope.genesis } }, "mismatch"],
    [{ ...fact, at: { ...fact.at, scope: declaredGenesisFixture().options.scope } }, "mismatch"],
  ] as const) {
    const got = await verifyArchive(source(fixture), { ...options, receipt: { fact: asked } });
    expect(got.kind).toBe("verification"); if (got.kind !== "verification") continue;
    expect(got.receipt?.result).toBe(expected);
    expect(got.integrity?.report.coverage[0]?.through).toBe(fixture.options.head!.seq);
  }
  const broken = { ...fixture, scopes: fixture.scopes.map((scope, index) => index ? scope : { ...scope, entries: scope.entries.map(entry => entry.seq === 1 ? { ...entry, bytes: entry.bytes.replace('"seq":1', '"seq":7') } : entry) }) };
  const got = await verifyArchive(source(broken), { ...options, receipt: { fact } });
  expect(got.kind).toBe("verification"); if (got.kind !== "verification") return;
  expect(got.integrity?.report.result).toBe("mismatch");
  expect(got.receipt?.result).toBe("unverified");
});

// Invariant: unread archive failures invent no native target or coverage, and
// no internal expected-head value pretends to be an independent caller pin.
test("keeps archive failures and source-selected head trust explicit", async () => {
  const fixture = declaredGenesisFixture();
  const got = await verifyArchive(source(fixture), { ...fixture.options, head: undefined });
  expect(got.kind).toBe("verification"); if (got.kind !== "verification") return;
  expect(got.verification.report.trusts).toContain(ARCHIVE_HEAD_TRUST);
  expect(got.verification.report.trusts).not.toContain(TRUSTS.head);
  expect(got.verification.report.trusts).toContain(TRUSTS.clock);
  for (const result of ["mismatch", "refused", "unavailable", "timeout", "limit", "not-found"] as const) {
    const location = { scope: fixture.options.scope, path: "journal/v1/head.json" };
    const stopped = archiveSource({ open: async () => ({ ok: false, result, reason: "actual read failure", location }) });
    expect(await verifyArchive(stopped, fixture.options)).toMatchObject({ kind: "archive-failure", result, location });
    const failed = await verifyArchive(stopped, fixture.options);
    expect(failed).not.toHaveProperty("verification"); expect(failed).not.toHaveProperty("native"); expect(failed).not.toHaveProperty("archive");
  }
});

// Invariant: all scope reads share the original limits and a deadline outcome
// waits for already-started owned I/O to settle before returning.
test("shares traversal limits and drains an owned read after deadline", async () => {
  const fixture = observingDeliveryFixture();
  for (const limits of [{ scopes: 1 }, { entries: 1 }, { bytes: 1 }]) {
    expect(await verifyArchive(source(fixture, { limits }), fixture.options)).toMatchObject({ kind: "archive-failure", result: "limit" });
  }
  vi.useFakeTimers();
  try {
    let finish!: () => void, returned = false, settled = false;
    const running = new Promise<void>(resolve => { finish = resolve; });
    const stalled = archiveSource({ open: async (_scope: ScopeId) => { await running; return { ok: false, result: "unavailable", reason: "finished owned read", location: {} }; }, settle: async () => { await running; settled = true; } }, { seconds: 1 });
    const pending = verifyArchive(stalled, fixture.options).then(result => { returned = true; return result; });
    await vi.advanceTimersByTimeAsync(1000);
    expect(returned).toBe(false); expect(settled).toBe(false);
    finish();
    expect(await pending).toMatchObject({ kind: "archive-failure", result: "timeout" });
    expect(settled).toBe(true);
  } finally { vi.useRealTimers(); }
});

// Exact commit probes of the same history share its distinct-scope slot;
// every physical receipt read still spends from the original work budget.
test("floor commit probes share the already opened scope allowance", async () => {
  const fixture = declaredGenesisFixture(), native = port(fixture.scopes), scope = fixture.scopes[0]!;
  let reads = 0;
  native.floorReceipt = async (_scope, _commit, work) => {
    work.scope(); work.spend({ calls: 1 }); reads++;
    return { ok: true, scope: scope.scope, through: fixture.options.head! };
  };
  const archived = archiveSource(native, { limits: { scopes: 1 } });
  expect((await archived.page(scope.scope.scope, 0, { bytes: 4096, entries: 1 })).ok).toBe(true);
  for (const commit of ["b".repeat(40), "c".repeat(40)]) expect(await archived.floorReceipt(scope.scope.scope, commit, { bytes: 4096 })).toMatchObject({ ok: true, through: fixture.options.head });
  expect(reads).toBe(2);
});

// Real native Register/Directory judgments, retained canonical entries and
// portable offline replay. The repository-create reply and in-memory store
// are labelled fixtures; no native Worker, private source export or host runs.
test("exact caller anchors classify reviewed private Register copies without admitting unknown archive names", async () => {
  for (const pin of ["platform:register@17", "platform:register@18", "platform:register@19"] as const) {
    const native = nativePlatform(pin)!;
    const registerDefinition = checkedPlatformData(native.data), registerRules = { named: pin, rules: native.rules };
    const R = new Ledger(registerDefinition, "platform:register");
    const install = installing(keys.paul, "keys", [keys.rita.key]);
    const seed = registerSeed(install, { definition: pin });
    R.seal(written(judgeGenesis(R.state, registerDefinition,
      { name: scopeIdOf(seed), nonce: newGenesisNonce(new Uint8Array(16).fill(74)), seed, creation: install },
      { clock: clockOf(R.state, T0), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source: null, platform: registerRules })));
    const found = R.act(keys.rita, "found", { expected: { register: R.item(0).revision },
      fields: { branch: "main", founderHandle: "@rita", recoveryKey: keys.sam.key } }, { platform: registerRules, grants: [] });
    expect(found.result).toBe("write");
    const claim = R.fact(R.head.seq);
    // The real native selecting rule constructs the actual Directory seed.
    // Only this own host answer is scripted; no entry or source name is forged.
    R.seal(written(judgeOutcome(R.state, registerDefinition,
      { type: "outcome", operation: `${claim.seq}:0`, attempt: 1, result: "confirmed", evidence: { basis: "own-answer",
        body: { name: repositoryName(R.item(claim.seq).values["seed"] as Digest, 1), id: "TEST-private-register-repo" } } },
      { clock: clockOf(R.state, T0), bounds: PROPOSED_BOUNDS, platform: registerRules, own: R.own })));
    const sequence = admitSequenceGenesis(canonicalize(R.entries[0]!.entry), R.at, PROPOSED_BOUNDS.entryBytes);
    if (!sequence) throw Error("the actual Register genesis must admit its association");
    const creation = R.last.sends[0]!;
    if (!isSeed(creation.to)) return expect.fail("The native Register must emit an exact Directory seed");
    const directoryNative = nativePlatform(creation.to.definition)!;
    const directoryDefinition = checkedPlatformData(directoryNative.data), D = new Ledger(directoryDefinition, "platform:directory");
    D.seal(written(judgeGenesis(D.state, directoryDefinition,
      { name: scopeIdOf(creation.to), nonce: newGenesisNonce(new Uint8Array(16).fill(75)), to: creation.to, from: R.fact(R.head.seq), n: creation.n, message: creation.message as Request },
      { clock: clockOf(D.state, T0), bounds: PROPOSED_BOUNDS, prepared: [], own: D.own,
        facts: [{ fact: claim, entry: R.entries[claim.seq]!.entry, sequence, under: R.under }],
        source: { entry: R.last, sequence, under: R.under }, platform: { named: creation.to.definition as PlatformDefinition, rules: directoryNative.rules } })));
    const archived = served(D, [R, D]);
    // Stored clone copies carry no caller kind. The actual receiving entry,
    // exact anchor and finite exporter alias remain separate inputs.
    const retained = archived.retained.map(input => { const { under: _under, ...rest } = input; return rest; });
    const anchors = [...new Map([...D.last.uses.map(use => use.fact), R.fact(R.head.seq)].map(fact => [canonicalize(fact), fact])).values()];
    const base = port([{ ...archived, retained }]);
    const offline = (basis: PlatformDefinition = pin,
      privateReads: { scope: ScopeId; result: string }[] = [], includeRow = true) => archiveSource({ open: async (scope, work) => {
      const read = await base.open(scope, work);
      if (scope === R.at.scope && !read.ok) privateReads.push({ scope, result: read.result });
      return read.ok ? { ...read, archive: { ...read.archive, foreignSources: includeRow ? [{ at: R.at, pin: basis }] : [] } } : read;
    } });
    const options = { mode: "replay" as const, scope: D.at.scope, head: D.head, platform: nativePlatform, grants: "proven" as const,
      anchors: anchors.map(fact => ({ scope: fact.at.scope, seq: fact.seq, hash: fact.hash })) };
    const privateReads: { scope: ScopeId; result: string }[] = [];
    const verified = await verifyArchive(offline(pin, privateReads), options);
    const diagnostic = { pin, kind: verified.kind, ...(verified.kind === "verification"
      ? { result: verified.verification.report.result, why: verified.verification.why } : { result: verified.result, reason: verified.reason }) };
    expect(verified, JSON.stringify(diagnostic)).toMatchObject({ kind: "verification",
      verification: { report: { result: "consistent", anchors } } });
    if (verified.kind === "verification") expect(render(verified.verification.report)).toContain(TRUSTS.recordedKinds);
    expect(privateReads, JSON.stringify({ pin, privateReads })).toEqual([]);
    expect(await verifyArchive(offline(), { ...options, anchors: [] })).toMatchObject({ kind: "verification",
      verification: { report: { result: "missing-dependency", dependencies: { missing: expect.any(Array) } } } });
    const missing: { scope: ScopeId; result: string }[] = [];
    expect(await verifyArchive(offline(pin, missing, false), options)).toMatchObject({ kind: "verification", verification: { report: { result: "incomplete" } } });
    expect(missing).toEqual([]);
    // An actual retained name cannot substitute for this adapter's missing
    // alias row, nor can caller options replace its empty session map.
    const namedBase = port([archived]), namedReads: ScopeId[] = [];
    const missingAlias = archiveSource({ open: async (scope, work) => {
      if (scope === R.at.scope) namedReads.push(scope);
      const read = await namedBase.open(scope, work);
      return read.ok ? { ...read, archive: { ...read.archive, foreignSources: [] } } : read;
    } });
    expect(archived.retained.some(input => input.kind === "entry" && input.under === R.under)).toBe(true);
    expect(await verifyArchive(missingAlias, { ...options, archiveSourceRows: new Map([[D.at.scope, [{ at: R.at, pin }]]]) })).toMatchObject({
      kind: "verification", verification: { report: { result: "incomplete" } },
    });
    expect(namedReads).toEqual([]);
    // Missing/unknown aliases do not try a private open. A catalog kind
    // disagreement is a mismatch with the actual receiving entry's word.
    for (const basis of ["platform:register@21", "platform:membership@8"] as const) {
      const refused: { scope: ScopeId; result: string }[] = [];
      const bad = await verifyArchive(offline(basis, refused), options);
      expect(bad.kind === "verification" && bad.verification.report.result === "consistent").toBe(false);
      if (basis === "platform:membership@8") expect(bad).toMatchObject({ kind: "verification", verification: { report: { result: "mismatch" } } });
      expect(refused).toEqual([]);
    }
    // The rejected kind now belongs to actual canonical receiving bytes,
    // not a caller-supplied classification beside the anchor.
    if (D.last.seq !== 0 || D.last.input.type !== "genesis" || !D.last.input.source) throw Error("this Directory fixture has exactly its created genesis");
    for (const kind of ["membership", "directory"] as const satisfies readonly ScopeKind[]) {
      const entry = { ...D.last, input: { ...D.last.input, sourceKind: kind }, uses: D.last.uses.map(use => ({ ...use, kind })) };
      if (!isEntry(entry)) throw Error("the changed word remains a closed receiving entry");
      const bytes = canonicalize(entry), hash = entryHash(entry), refused: ScopeId[] = [];
      const changed = port([{ ...archived, scope: { ...D.at, genesis: hash }, entries: [{ seq: 0, hash, bytes }], retained }]);
      const conflicting = archiveSource({ open: async (scope, work) => {
        if (scope === R.at.scope) refused.push(scope);
        const read = await changed.open(scope, work);
        return read.ok ? { ...read, archive: { ...read.archive, foreignSources: [{ at: R.at, pin }] } } : read;
      } });
      const result = await verifyArchive(conflicting, { ...options, head: { seq: 0, hash } });
      expect(result).toMatchObject({ kind: "verification", verification: { report: { result: "mismatch" } } });
      if (result.kind === "verification") expect(result.verification.why).toContain("catalog kind contradicts");
      expect(refused).toEqual([]);
    }
    if (pin === "platform:register@19") {
      // Supplied-code fixture: delegate the real source rule, then append
      // the same unused outer member to both create messages. The lane
      // variant changes only the returned seed kind. No Native admission
      // or runtime version equivalence is asserted for this supplied code.
      const original = native.rules["create-directory"];
      if (!original || original.place !== "send") throw Error("the existing Register has its send rule");
      for (const kind of ["directory", "lane"] as const) {
        const rules: Rules = { ...native.rules, "create-directory": { ...original, run: (given: Parameters<typeof original.run>[0]) => {
          const sent = original.run(given);
          if (!sent || !isSeed(sent.to) || !isObject(sent.message.body)) throw Error("the source rule must return its actual create");
          return { ...sent, to: { ...sent.to, kind }, message: { ...sent.message,
            body: { ...sent.message.body, directory: given.resolved.at } } };
        } } };
        const P = new Ledger(registerDefinition, "platform:register"), supplied = { named: pin, rules };
        P.seal(written(judgeGenesis(P.state, registerDefinition,
          { name: scopeIdOf(seed), nonce: newGenesisNonce(new Uint8Array(16).fill(76)), seed, creation: install },
          { clock: clockOf(P.state, T0), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source: null, platform: supplied })));
        expect(P.act(keys.rita, "found", { expected: { register: P.item(0).revision },
          fields: { branch: "main", founderHandle: "@rita", recoveryKey: keys.sam.key } }, { platform: supplied, grants: [] }).result).toBe("write");
        const claim = P.fact(P.head.seq);
        P.seal(written(judgeOutcome(P.state, registerDefinition,
          { type: "outcome", operation: `${claim.seq}:0`, attempt: 1, result: "confirmed", evidence: { basis: "own-answer",
            body: { name: repositoryName(P.item(claim.seq).values["seed"] as Digest, 1), id: "TEST-extra-directory-member" } } },
          { clock: clockOf(P.state, T0), bounds: PROPOSED_BOUNDS, platform: supplied, own: P.own })));
        const token = admitSequenceGenesis(canonicalize(P.entries[0]!.entry), P.at, PROPOSED_BOUNDS.entryBytes), sent = P.last.sends[0]!;
        if (!token || !isSeed(sent.to) || sent.message.class !== "request") throw Error("the fixture source must have its original admitted Register birth and create request");
        const C = new Ledger(directoryDefinition, "platform:directory");
        C.seal(written(judgeGenesis(C.state, directoryDefinition,
          { name: scopeIdOf(sent.to), nonce: newGenesisNonce(new Uint8Array(16).fill(77)), to: sent.to, from: P.fact(P.head.seq), n: sent.n, message: sent.message },
          { clock: clockOf(C.state, T0), bounds: PROPOSED_BOUNDS, prepared: [], own: C.own,
            facts: [{ fact: claim, entry: P.entries[claim.seq]!.entry, sequence: token, under: P.under }],
            source: { entry: P.last, sequence: token, under: P.under }, platform: { named: sent.to.definition as PlatformDefinition, rules: directoryNative.rules } })));
        expect(C.last.input).toMatchObject({ type: "genesis", source: P.fact(P.head.seq), message: sent.message, seed: sent.to });
        const result = await verify(new MemorySource([served(P, [P, C]), served(C, [P, C])]), {
          mode: "replay", scope: C.at.scope, head: C.head, grants: "proven",
          platform: named => named === pin ? { ...native, rules } : nativePlatform(named),
        });
        expect(token.kind).toBe("register");
        if (kind === "lane") {
          expect(result.report.result).toBe("mismatch");
          expect(result.why).toBe("the sequence's verified genesis contradicts its fixed kind place");
        } else expect([result.report.result, result.why]).toEqual(["consistent", null]);
      }
    }
  }
});
