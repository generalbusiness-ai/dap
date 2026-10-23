/** Pure display resolution; membership reads below are explicit in-memory answers. */
import { expect, test } from "vitest";
import type { ApplicationProjectionData, Item, ItemQueryRead, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isMemberRef, itemQueryArgument, itemQueryDigest, readItemQueryParameter } from "@generalbusiness/dap-bytes";
import type { ApplicationReadProjection } from "@generalbusiness/dap-bytes/application-v2";
import { projectionMemberFacts, projectionMembers } from "../src/views/members.ts";
import type { MembershipDisplaySnapshot } from "../src/views/member-types.ts";
import { memberText } from "../src/views/member-text.ts";
import { readMembershipDisplay } from "../src/views/member-reads.ts";
import type { Reads } from "../src/reads.ts";
import { fixedSigner } from "./fixtures.ts";

const membership: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "membership" };
const at = { seq: 200, hash: `sha256:${"a".repeat(64)}` as const };
const ref = (member: `@${string}`): MemberRef => ({ membership, member });
const item = (who: MemberRef, kind = "person", state = "active", controller: MemberRef | null = null): Item => ({
  id: 3, type: "member", state, revision: 2, opened: at.hash, parties: { member: who, controller }, refs: {},
  values: { handle: who.member, kind, role: kind === "person" ? "member" : kind }, attributed: [],
});
const roster: Item = { id: 0, type: "roster", state: "open", revision: 1, opened: at.hash, parties: {}, refs: {},
  values: { memberActions: ["room.read"], agentActions: ["grow.probe"] }, attributed: [] };

// Invariant: the display's two bounded selections never contend for the
// native object's single query slot. This transport is an in-memory stand-in,
// not Native storage or authentication evidence.
test("member display sequences its bounded queries and preserves member and optional-roster errors", async () => {
  const signer = fixedSigner(31), calls: string[] = [], problem = new Error("scripted query failure");
  let release!: () => void, started!: () => void, busy = false;
  let fail: "member" | "roster" | null = null;
  const held = new Promise<void>(resolve => { release = resolve; });
  const entered = new Promise<void>(resolve => { started = resolve; });
  const rosterAt = { seq: at.seq + 1, hash: `sha256:${"b".repeat(64)}` as const };
  const reads = {
    signer,
    session: async () => ({ claims: { key: signer.key, membership }, reader: () => "scripted session" }),
    transport: { queryItems: async (_scope: string, _reader: unknown, encoded: string): Promise<ItemQueryRead> => {
      const query = readItemQueryParameter(encoded);
      if (!query) throw new Error("The display must issue a valid bounded query");
      calls.push(query.type);
      if (busy) return { ok: false, reason: "unavailable" };
      busy = true;
      try {
        if (query.type === fail) throw problem;
        if (query.type === "member") { started(); await held; }
        return { ok: true, at: query.type === "member" ? at : rosterAt, value: { v: 1, scope: membership, query: itemQueryDigest(query)!, argument: itemQueryArgument(query)!,
          items: query.type === "member" ? [item(ref("@prober"), "agent")] : [roster] }, complete: true };
      } finally { busy = false; }
    } },
  } as unknown as Reads;
  const pending = readMembershipDisplay(reads, membership);
  await entered;
  const whileHeld = [...calls];
  release();
  const displayed = await pending;
  expect(whileHeld).toEqual(["member"]);
  expect(calls).toEqual(["member", "roster"]);
  expect(displayed?.roster).toEqual({ item: roster, at: rosterAt });
  expect(displayed?.at).toEqual(at);
  fail = "member";
  await expect(readMembershipDisplay(reads, membership)).rejects.toBe(problem);
  fail = "roster";
  const optional = await readMembershipDisplay(reads, membership);
  expect(optional?.members).toEqual(displayed?.members);
  expect(optional?.roster).toBeUndefined();
});
const declaration: ApplicationReadProjection = { v: 1, definition: at.hash, revision: "revision", sources: {
  benches: { item: "bench", read: "many", states: ["open"], limit: 100, fields: {
    prober: { from: { kind: "party", name: "prober" }, of: { type: "member" }, nullable: true },
    lastProber: { from: { kind: "fact-signer", name: "lastProbe" }, of: { type: "member" }, nullable: true },
    arbitrary: { from: { kind: "value", name: "arbitrary" }, of: { type: "member" }, nullable: true },
  } },
  events: { read: "entries", acts: ["probe"], window: 100, limit: 100, latestBy: null, fields: {
    signer: { from: { kind: "signer", name: "member" }, of: { type: "member" }, nullable: true },
  } },
} };
const data = (members: MemberRef[]): ApplicationProjectionData => ({ v: 1, projection: at.hash, scope: membership, at,
  sources: { benches: members.map((prober, id) => ({ id, type: "bench", state: "open", revision: 1, fields: { prober, arbitrary: ref("@ignored") } })),
    events: [{ id: 19, type: "probe", state: "entry", revision: 0, fields: { signer: members[0]! } }] } });

// Invariant: typed party/signer references share one full-reference identity,
// and only matching recorded membership data supplies names and standing.
test("party and signer resolve once with controller evidence; arbitrary values never cause a read", async () => {
  const agent = ref("@prober"), owner = ref("@maya"); let reads = 0;
  const snapshot: MembershipDisplaySnapshot = { scope: membership, at, members: [item(agent, "agent", "active", owner), { ...item(owner), id: 4 }], roster: { item: roster, at } };
  const table = await projectionMembers(declaration, data([agent, agent]), async () => { reads++; return snapshot; });
  expect(reads).toBe(1); expect(table.overflow).toBe(0);
  expect(Object.keys(table.records)).toEqual([canonicalize(agent), canonicalize(owner)]);
  expect(table.records[canonicalize(agent)]).toMatchObject({ identity: { handle: "@prober", kind: "agent" }, controller: owner,
    standing: { state: "active", role: "agent", actions: ["grow.probe"] }, opened: { seq: 3, hash: at.hash } });
  expect(memberText(agent, table)).toBe("@prober (agent · controlled by @maya · role agent)");
  const onlyFact = { ...data([]), sources: {
    benches: [{ id: 2, type: "bench", state: "open", revision: 1, fields: { prober: null, lastProber: agent } }], events: [],
  } };
  expect((await projectionMembers(declaration, onlyFact, async () => snapshot)).records[canonicalize(agent)]?.controller).toEqual(owner);
  expect(projectionMemberFacts(declaration.sources["benches"]!, ["lastProber"], { lastProber: agent })).toEqual({ 0: { label: "lastProber", refs: [agent] } });
  const other = { ...agent, membership: { ...membership, inc: `in_${"b".repeat(25)}a` as const } };
  expect(isMemberRef(other)).toBe(true);
  const unknown = await projectionMembers(declaration, data([other]), async () => snapshot);
  expect(unknown.records[canonicalize(other)]?.identity).toBeNull();
  expect(memberText(other, unknown)).toBe(`Member unavailable (${canonicalize(other)}); eligibility unknown`);
});

// Invariant: the table and its lookups never silently exceed 32 distinct
// references, even when an agent introduces a controller at the boundary.
test("32 primary references retain a visible distinct overflow and do not expand controllers beyond the bound", async () => {
  const refs = Array.from({ length: 35 }, (_, i) => ref(`@member${i}`)); let reads = 0;
  const table = await projectionMembers(declaration, data([...refs, refs[34]!]), async () => {
    reads++; return { scope: membership, at, members: refs.map((who, i) => ({ ...item(who, i ? "person" : "agent", "active", i ? null : ref("@controller")), id: i + 2 })) };
  });
  expect(reads).toBe(1); expect(Object.keys(table.records)).toHaveLength(32); expect(table.overflow).toBe(4);
  expect(table.records[canonicalize(refs[32]!)]).toBeUndefined();
  expect(table.records[canonicalize(ref("@controller"))]).toBeUndefined();
});

// Invariant: identity survives missing standing evidence, and a failed read
// or a different membership head never turns into an eligible member.
test("removed and lapsed stay explicit; refused reads and different-head actions stay unknown", async () => {
  const removed = ref("@removed"), lapsed = ref("@lapsed"), active = ref("@active");
  const table = await projectionMembers(declaration, data([removed, lapsed, active]), async () => ({ scope: membership, at,
    members: [item(removed, "person", "removed"), item(lapsed, "person", "lapsed"), item(active)], roster: { item: roster, at: { ...at, seq: 201 } } }));
  expect(table.records[canonicalize(removed)]?.standing).toMatchObject({ state: "removed", actions: [] });
  expect(table.records[canonicalize(lapsed)]?.standing).toMatchObject({ state: "lapsed", actions: [] });
  expect(memberText(lapsed, table)).toBe("@lapsed (person · invitation lapsed · role member)");
  expect(table.records[canonicalize(active)]).toMatchObject({ identity: { handle: "@active" }, standing: { actions: null } });
  const refused = await projectionMembers(declaration, data([active]), async () => { throw Error("scripted unavailable membership read"); });
  expect(refused.records[canonicalize(active)]).toMatchObject({ identity: null, standing: null, opened: null });
});
