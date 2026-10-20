/** Genuine native repository cohort and bounded native reads; host, clock
 * and setup/read authority are sessionRoom's labelled fixture stand-ins.
 * This resolves a target only; it admits no room to archive export. */
import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import type { Seed } from "@generalbusiness/dap-contract";
import { canonicalize, newIncarnation, parseStrict } from "@generalbusiness/artroom-bytes";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { fixtureArchiveTarget, fixtureArchiveTargetIn, type FixtureArchiveTargetReads } from "../src/archive-target.ts";
import { namespace } from "../src/namespace.ts";
import type { NativeItemQuery } from "../src/item-queries.ts";
import { mintSession, readerOf } from "../src/sessions.ts";
import { sessionRoom } from "./fixtures-native.ts";

test("native creator chain and fixed directory/destination records resolve the same single archive repository", async () => {
  const room = await sessionRoom();
  try {
    const reader = readerOf(mintSession(room.sessions, { ...room.claims, reads: ["summary", "items"] }));
    const resolver = fixtureArchiveTargetIn(env.PLATFORM, { fixture: "archive-target-reader", value: reader });
    const directory = await room.D.at(), genesis = (await room.D.entries())[0]!;
    if (genesis.input.type !== "genesis") return expect.fail("native directory birth missing");
    const expected = (await room.D.item(0)).values["repository"];
    const head = (await room.D.summary()).at;
    expect(await resolver.resolve(directory, genesis.input.seed, new ArchiveBudget())).toEqual(expected);
    const child = room.children[0]!, childBirth = (await child.entries())[0]!;
    if (childBirth.input.type !== "genesis") return expect.fail("native child birth missing");
    expect(await resolver.resolve(await child.at(), childBirth.input.seed, new ArchiveBudget())).toEqual(expected);
    expect((await room.D.summary()).at).toEqual(head);
    expect(await resolver.resolve({ ...directory, inc: newIncarnation(new Uint8Array(16).fill(12)) }, genesis.input.seed, new ArchiveBudget())).toBeNull();
    const unowned = (await room.R.entries())[0]!;
    if (unowned.input.type !== "genesis") return expect.fail("native register birth missing");
    expect(await resolver.resolve(await room.R.at(), unowned.input.seed, new ArchiveBudget())).toBeNull();
  } finally { room.life.release(); }
});

// Corrupt only the scripted reply boundary after genuine native reads. A
// missing/ambiguous/different target is unavailable, with no summary fallback.
test("target resolution refuses truncated or mismatched records and spends the original budget before RPC", async () => {
  const room = await sessionRoom();
  try {
    const reader = readerOf(mintSession(room.sessions, { ...room.claims, reads: ["summary", "items"] }));
    const directory = await room.D.at(), opening = (await room.D.entries())[0]!;
    if (opening.input.type !== "genesis") return expect.fail("native directory birth missing");
    const seed: Seed = opening.input.seed;
    let calls = 0, fault = "";
    const reads: FixtureArchiveTargetReads = { fixture: "archive-target-reads", births: namespace(env.PLATFORM).births,
      query: async (at, encoded) => {
        calls++;
        const result = await (env.PLATFORM.get(env.PLATFORM.idFromName(at.scope)) as unknown as { queryItems(encoded: string, reader: unknown): Promise<NativeItemQuery> }).queryItems(encoded, reader);
        if (!result.ok) return result;
        const body = parseStrict(result.serialized) as any;
        if (fault === "truncated") body.complete = false;
        if (fault === "missing") body.value.items = [];
        if (fault === "ambiguous") body.value.items.push({ ...body.value.items[0], id: body.value.items[0].id + 1 });
        if (fault === "repository" && at.kind === "destination") body.value.items[0].values.repository.id = "different-repository";
        if (fault === "directory" && at.kind === "destination") body.value.items[0].refs.directory.inc = newIncarnation(new Uint8Array(16).fill(2));
        if (fault === "oversized") return { ok: true, serialized: "x".repeat(256 * 1024 + 1) };
        return { ok: true, serialized: canonicalize(body) };
      },
    };
    const resolver = fixtureArchiveTarget(reads);
    for (fault of ["truncated", "missing", "ambiguous", "repository", "directory", "oversized"]) expect(await resolver.resolve(directory, seed, new ArchiveBudget())).toBeNull();
    const before = calls;
    await expect(resolver.resolve(directory, seed, new ArchiveBudget({ calls: 0 }))).rejects.toThrow("archive-limit");
    expect(calls).toBe(before);
  } finally { room.life.release(); }
});
