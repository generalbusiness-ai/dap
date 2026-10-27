/** Genuine native repository cohort and bounded native reads; host, clock
 * and setup/read authority are sessionRoom's labelled fixture stand-ins.
 * This resolves a target only; it admits no room to archive export. */
import { env } from "cloudflare:workers";
import { ARCHIVE_APPLICATION_COHORT as C, ARCHIVE_DEVICE_APPLICATION_COHORT as DC, ARCHIVE_DEVICE_PUBLICATION_COHORT as PC } from "@generalbusiness/dap-platform";
import { expect, test } from "vitest";
import { ITEM_QUERY_BOUNDS, type ScopeRef, type Seed } from "@generalbusiness/dap-contract";
import { canonicalize, encodeItemQueryParameter, entryHash, itemQueryArgument, itemQueryDigest, newIncarnation, parseStrict, readItemQueryParameter, scopeIdOf, utf8 } from "@generalbusiness/dap-bytes";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { archiveReplayAnchors } from "../src/archive-anchors.ts";
import { fixtureArchiveTarget, fixtureArchiveTargetIn, type FixtureArchiveTargetReads } from "../src/archive-target.ts";
import { namespace } from "../src/namespace.ts";
import type { NativeItemQuery } from "../src/item-queries.ts";
import { mintSession, readerOf } from "../src/sessions.ts";
import { sessionRoom, sessionRepository } from "./fixtures-native.ts";
import { rita } from "./repository.ts";

test.each([["archive", C], ["device/archive", DC], ["device/publication/archive", PC]] as const)("native creator chain and fixed directory/destination records resolve the same single archive repository (%s)", async (_label, C) => {
  const room = await sessionRoom(C.register);
  try {
    const reader = readerOf(mintSession(room.sessions, { ...room.claims, reads: ["summary", "items"] }));
    const resolver = fixtureArchiveTargetIn(env.PLATFORM, { fixture: "archive-target-reader", value: reader });
    const directory = await room.D.at(), genesis = (await room.D.entries())[0]!;
    if (genesis.input.type !== "genesis") return expect.fail("native directory birth missing");
    const expected = (await room.D.item(0)).values["repository"];
    expect(await resolver.resolve(directory, genesis.input.seed, new ArchiveBudget())).toBeNull();
    expect(await resolver.discover(directory, genesis.input.seed, new ArchiveBudget())).toBeNull();
    const membership = room.children[0]!;
    // This fixture's manually minted read token enrolls no acting key.
    // Enroll the founder through the actual native Membership acts.
    const seat = await membership.did(rita, "seat", { expected: await membership.expected({ roster: 0 }) });
    await membership.did(rita, "first-key", { fields: { member: seat }, expected: await membership.expected({ roster: 0, member: seat }) });
    expect(await membership.stub.observe({ of: await membership.at(), key: rita.key })).toMatchObject({ keyState: "active", role: "admin", actions: expect.arrayContaining(["directory.archive"]) });
    await room.D.did(rita, "bind-archive", { on: 0, expected: { on: (await room.D.item(0)).revision }, fields: { archive: "journal" } });
    const head = (await room.D.summary()).at;
    expect(await resolver.resolve(directory, genesis.input.seed, new ArchiveBudget())).toEqual(expected);
    const discovered = await resolver.discover(directory, genesis.input.seed, new ArchiveBudget());
    if (C === DC || C === PC) {
      expect(discovered?.repository).toEqual(expected);
      expect(discovered?.scopes.map(scope => ({ kind: scope.at.kind, named: scope.named, via: scope.via }))).toEqual([
        { kind: "directory", named: C.directory, via: "self" },
        { kind: "rules", named: C.rules, via: "rules" },
        { kind: "destination", named: C.destination, via: "destination" },
      ]);
      expect(discovered?.scopes.slice(1).map(scope => scope.from)).toEqual([directory, directory]);
      const claim = genesis.input.source;
      if (!claim) return expect.fail("native directory must retain its actual founding claim");
      expect(claim.at).toEqual(await room.R.at());
      // Classification of an already selected genuine root reference only;
      // this neither exports the Register nor proves a complete archive pass.
      expect(archiveReplayAnchors({ at: directory, objects: [{ foreign: { fact: claim, pin: C.register } }] }, [directory], new ArchiveBudget())).toEqual([claim]);
      expect(() => archiveReplayAnchors({ at: directory, objects: [{ foreign: { fact: claim, pin: "platform:register@21" } }] }, [directory], new ArchiveBudget())).toThrow("unsupported-foreign-copy");
    } else expect(discovered).toBeNull();
    const child = room.children[0]!, childBirth = (await child.entries())[0]!;
    if (childBirth.input.type !== "genesis") return expect.fail("native child birth missing");
    expect(await resolver.resolve(await child.at(), childBirth.input.seed, new ArchiveBudget())).toEqual(expected);
    // Resolving the existing target never grants a Membership journal.
    expect(await resolver.discover(await child.at(), childBirth.input.seed, new ArchiveBudget())).toBeNull();
    expect((await room.D.summary()).at).toEqual(head);
    expect(await resolver.resolve({ ...directory, inc: newIncarnation(new Uint8Array(16).fill(12)) }, genesis.input.seed, new ArchiveBudget())).toBeNull();
    const unowned = (await room.R.entries())[0]!;
    if (unowned.input.type !== "genesis") return expect.fail("native register birth missing");
    expect(await resolver.resolve(await room.R.at(), unowned.input.seed, new ArchiveBudget())).toBeNull();
  } finally { room.life.release(); }
});

// Corrupt the scripted proof/reply boundary after genuine native reads. A
// missing/ambiguous/different target is unavailable, with no summary fallback.
test.each([["archive", C], ["device/archive", DC], ["device/publication/archive", PC]] as const)("a claim-bound archive target refuses truncated or mismatched records and spends the original budget before RPC (%s)", async (_label, C) => {
  const room = await sessionRoom(C.register, "journal");
  try {
    const reader = readerOf(mintSession(room.sessions, { ...room.claims, reads: ["summary", "items"] }));
    const directory = await room.D.at(), opening = (await room.D.entries())[0]!;
    if (opening.input.type !== "genesis") return expect.fail("native directory birth missing");
    const seed: Seed = opening.input.seed;
    const births = namespace(env.PLATFORM).births, destination = await room.children[2]!.at();
    const originalBirth = await births.read(destination, 10_000, 256 * 1024);
    if (!originalBirth) return expect.fail("native destination birth missing");
    // A labelled corrupt-source specimen, not an actual mixed native birth.
    // Rebind every proof identity so ordinary birth validation still passes;
    // only the exact Directory/Destination cohort pairing may reject it.
    const mixedEntry = parseStrict(originalBirth.proof.bytes) as any;
    const mixedPin = C === PC ? DC.destination : PC.destination;
    mixedEntry.input.seed.definition = mixedPin;
    const mixedDestination = { ...destination, scope: scopeIdOf(mixedEntry.input.seed) };
    mixedEntry.at = mixedDestination;
    const mixedBirth = { ...originalBirth, named: mixedPin,
      proof: { fact: { at: mixedDestination, seq: 0, hash: entryHash(mixedEntry) }, bytes: canonicalize(mixedEntry) } };
    let calls = 0, fault = "";
    const reads: FixtureArchiveTargetReads = { fixture: "archive-target-reads", births: { read: (at, milliseconds, maxBytes) =>
      fault === "cohort" && at.scope === mixedDestination.scope ? Promise.resolve(mixedBirth) : births.read(at, milliseconds, maxBytes) },
      query: async (at, encoded) => {
        calls++;
        const mixed = fault === "cohort" && at.scope === mixedDestination.scope;
        const query = readItemQueryParameter(encoded);
        if (!query) return expect.fail("target must send a valid bounded item query");
        const source = mixed ? destination : at;
        const sourceQuery = mixed ? encodeItemQueryParameter({ ...query, scope: destination }) : encoded;
        if (!sourceQuery) return expect.fail("source query missing");
        const result = await (env.PLATFORM.get(env.PLATFORM.idFromName(source.scope)) as unknown as { queryItems(encoded: string, reader: unknown): Promise<NativeItemQuery> }).queryItems(sourceQuery, reader);
        if (!result.ok) return result;
        const body = parseStrict(result.serialized) as any;
        if (fault === "cohort" && at.kind === "directory") body.value.items[0].refs.destination = mixedDestination;
        if (mixed) { body.value.scope = at; body.value.query = itemQueryDigest(query); body.value.argument = itemQueryArgument(query); }
        if (fault === "truncated") body.complete = false;
        if (fault === "missing") body.value.items = [];
        if (fault === "ambiguous") body.value.items.push({ ...body.value.items[0], id: body.value.items[0].id + 1 });
        if (fault === "repository" && at.kind === "destination") body.value.items[0].values.repository.id = "different-repository";
        if (fault === "directory" && at.kind === "destination") body.value.items[0].refs.directory.inc = newIncarnation(new Uint8Array(16).fill(2));
        if (fault === "rules" && at.kind === "directory") body.value.items[0].refs.rules.inc = newIncarnation(new Uint8Array(16).fill(3));
        if (fault === "oversized") return { ok: true, serialized: "x".repeat(256 * 1024 + 1) };
        return { ok: true, serialized: canonicalize(body) };
      },
    };
    const resolver = fixtureArchiveTarget(reads);
    expect(await resolver.resolve(directory, seed, new ArchiveBudget())).toEqual((await room.D.item(0)).values["repository"]);
    for (fault of ["truncated", "missing", "ambiguous", "repository", "directory", "oversized"]) expect(await resolver.resolve(directory, seed, new ArchiveBudget())).toBeNull();
    if (C === DC || C === PC) {
      for (fault of ["truncated", "missing", "ambiguous", "repository", "directory", "oversized"]) expect(await resolver.discover(directory, seed, new ArchiveBudget())).toBeNull();
      fault = "rules";
      expect(await resolver.resolve(directory, seed, new ArchiveBudget())).toEqual((await room.D.item(0)).values["repository"]);
      expect(await resolver.discover(directory, seed, new ArchiveBudget())).toBeNull();
      fault = "cohort";
      // Legacy repository lookup deliberately does not select producer
      // cohorts. It proves the other scripted proof/query fences passed.
      expect(await resolver.resolve(directory, seed, new ArchiveBudget())).toEqual((await room.D.item(0)).values["repository"]);
      expect(await resolver.discover(directory, seed, new ArchiveBudget())).toBeNull();
    }
    const before = calls;
    await expect(resolver.resolve(directory, seed, new ArchiveBudget({ calls: 0 }))).rejects.toThrow("archive-limit");
    await expect(resolver.discover(directory, seed, new ArchiveBudget({ calls: 0 }))).rejects.toThrow("archive-limit");
    expect(calls).toBe(before);
  } finally { room.life.release(); }
});


test("one locate reuses only its identical checked Rules birth and keeps final fences", async () => {
  const room = await sessionRoom(DC.register, "journal");
  try {
    const other = await sessionRepository(room.life, DC.register, "journal"), legacy = await sessionRepository(room.life, C.register, "journal");
    const reader = readerOf(mintSession(room.sessions, { ...room.claims, reads: ["summary", "items"] }));
    const rules = room.rules, directory = room.directory, destination = await room.children[2]!.at();
    const opening = (await room.children[1]!.entries())[0]!;
    if (opening.input.type !== "genesis") return expect.fail("actual applied Rules birth required");
    const otherRules = await other.children[1]!.at(), legacyRules = await legacy.children[1]!.at();
    expect((await other.children[1]!.entries())[0]).toMatchObject({ input: { seed: { definition: DC.rules, creator: await other.D.at() } } });
    expect((await legacy.children[1]!.entries())[0]).toMatchObject({ input: { seed: { definition: C.rules } } });
    expect(C.rules).not.toBe(DC.rules);
    const births = namespace(env.PLATFORM).births;
    let requested: ScopeRef[] = [], itemReads = 0, substitute: ScopeRef | null = null, firstFails = false;
    let birthBytes: (number | null)[] = [], itemBytes: (number | null)[] = [];
    const reads: FixtureArchiveTargetReads = { fixture: "archive-target-reads", births: { read: async (at, milliseconds, maxBytes) => {
      requested.push({ ...at });
      if (firstFails && requested.length === 1) { birthBytes.push(null); return null; }
      // A second availability observation would fail; the adopted contract
      // allows the first checked immutable result to suffice in this call.
      if (requested.filter(ref => canonicalize(ref) === canonicalize(rules)).length > 1) throw Error("second Rules transport unavailable");
      const reply = await births.read(at, milliseconds, maxBytes);
      birthBytes.push(reply ? utf8(reply.proof.bytes).length : null);
      return reply;
    } }, query: async (at, encoded) => {
      itemReads++;
      const result = await (env.PLATFORM.get(env.PLATFORM.idFromName(at.scope)) as unknown as { queryItems(encoded: string, reader: unknown): Promise<NativeItemQuery> }).queryItems(encoded, reader);
      if (!result.ok || at.kind !== "directory" || !substitute) {
        itemBytes.push(result.ok ? utf8(result.serialized).length : null);
        return result;
      }
      const body = parseStrict(result.serialized) as any;
      body.value.items[0].refs.rules = { ...substitute };
      const serialized = canonicalize(body); itemBytes.push(utf8(serialized).length);
      return { ok: true, serialized };
    } };
    const resolver = fixtureArchiveTarget(reads);
    const run = async (replacement: ScopeRef | null = null) => {
      requested = []; itemReads = 0; birthBytes = []; itemBytes = []; substitute = replacement;
      const budget = new ArchiveBudget(), result = await resolver.discover(rules, opening.input.type === "genesis" ? opening.input.seed : expect.fail("genesis required"), budget);
      return { result, cost: budget.admitted(), reservations: budget.reservationCosts(), requested: [...requested], itemReads,
        birthBytes: [...birthBytes], itemBytes: [...itemBytes] };
    };
    const resolved = await run();
    expect(resolved.result?.repository).toEqual((await room.D.item(0)).values["repository"]);
    expect(resolved.requested).toEqual([rules, directory, destination]); expect(resolved.itemReads).toBe(2);
    const B = 256 * 1024, P = ITEM_QUERY_BOUNDS.payloadBytes;
    expect(resolved.birthBytes).toHaveLength(3); expect(resolved.itemBytes).toHaveLength(2);
    for (const size of [...resolved.birthBytes, ...resolved.itemBytes]) expect(size).toBeGreaterThan(0);
    const actualBirthBytes = resolved.birthBytes.reduce<number>((sum, size) => sum + size!, 0);
    const actualItemBytes = resolved.itemBytes.reduce<number>((sum, size) => sum + size!, 0);
    expect(resolved.cost).toEqual({ entries: 0, attempts: 0, nodes: 3, calls: 5,
      // Three distinct checked births and two serialized replies settle to
      // their actual UTF8 sizes. Full-ref copies/comparisons stay charged.
      metadata: actualBirthBytes + actualItemBytes + 6 * 512,
      inputWork: actualBirthBytes * 8 + actualItemBytes * 4 + 8 * 1024 });
    expect(resolved.reservations).toEqual({ metadataReserved: 3 * B + 2 * P + 6 * 512,
      metadataSettled: resolved.cost.metadata, unsettledMetadata: 0, settlementRefusal: "none" });
    expect(resolved.result?.publicScopes).toEqual([rules, directory, destination]);
    // These full-ref coherence fences refuse before a substituted birth read.
    for (const replacement of [{ ...rules, inc: newIncarnation(new Uint8Array(16).fill(37)) }, { ...rules, kind: "directory" as const }]) {
      const refused = await run(replacement);
      expect(refused.result).toBeNull(); expect(refused.requested).toEqual([rules, directory, destination]);
    }
    // Distinct actual births cannot reuse the initial proof: both are read.
    // One has the wrong creator; the independently shipped legacy one also
    // has the wrong Rules version. Exact named/creator fences still refuse.
    for (const replacement of [otherRules, legacyRules]) {
      const refused = await run(replacement);
      expect(refused.result).toBeNull(); expect(refused.requested).toEqual([rules, directory, destination, replacement]);
    }
    // A separate invocation must make its first actual read again.
    firstFails = true;
    const missing = await run(); expect(missing.result).toBeNull(); expect(missing.requested).toEqual([rules]); expect(missing.itemReads).toBe(0);
    expect(missing.birthBytes).toEqual([null]); expect(missing.itemBytes).toEqual([]);
    expect(missing.cost).toEqual({ entries: 0, attempts: 0, nodes: 1, calls: 1, metadata: B, inputWork: B * 8 });
    expect(missing.reservations).toEqual({ metadataReserved: B, metadataSettled: B, unsettledMetadata: B, settlementRefusal: "none" });
    firstFails = false; requested = []; itemReads = 0; substitute = null;
    await expect(resolver.discover(rules, opening.input.seed, new ArchiveBudget({ calls: 0 }))).rejects.toThrow("archive-limit");
    expect(requested).toEqual([]); expect(itemReads).toBe(0);
  } finally { room.life.release(); }
});
