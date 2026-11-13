import { describe, expect, test } from "vitest";
import type { Entry, KeyId, Observation, ObservationRequest, ObservationUse, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url } from "@generalbusiness/dap-bytes";
import { WINDOWS, agrees } from "@generalbusiness/dap-derive";
import { d, membership } from "@generalbusiness/dap-derive/testing";
import { observing } from "../src/authority.ts";
import type { Asked, Standing } from "../src/ports.ts";
import { HOLD, at, definition, create, rita, una, type Lane } from "./fixtures-native.ts";

const actions = Object.values(definition.declared.acts).map((a) => a.grant);
const UNAVAILABLE = { answer: "unavailable", reason: "authority-unavailable" };

/**
 * A scripted membership for that scope: a stand-in for the membership scope
 * (`MembershipScript` of test support). It answers every key of the fixture
 * set as an active member that holds every action in that scope, at `head`,
 * with the members of `over` in place of those. `reads` counts the reads
 * that reached it. While `silent`, it gives no answer.
 */
function scripted(s: Lane) {
  const m = { reads: 0, silent: false, head: 40, over: {} as Record<KeyId, Partial<Omit<Observation, "at">>> };
  s.c.membership = {
    at: membership,
    answers: (asked): Omit<Observation, "at"> | null => {
      // The read of this scope asks the standing of one key, and no other form of the request.
      if (!("key" in asked)) return null;
      // The scopes of this test record their membership reference with its incarnation, so the read states it.
      const { key } = asked;
      const of = asked.of as ScopeRef;
      m.reads++;
      const who = [rita, una].find((actor) => actor.key === key);
      if (m.silent || !who) return null;
      return {
        of, head: { seq: m.head, hash: d("4") }, key, keyState: "active", member: who.member.member, memberState: "active", role: "member", actions, within: { membership: of },
        controller: null, controllerActive: null, notAfter: null, definition: "platform:membership@1", ...m.over[key],
      };
    },
  };
  return m;
}

/** The freshness proof that each entry from `seq` on retains in its grant, or null for an entry that is no act and no preparation. */
const proofs = async (s: Lane, seq: number): Promise<(ObservationUse | null)[]> => (await s.entries(seq)).map((entry) => (entry.input.type === "act" || entry.input.type === "preparation" ? entry.input.authority[0]!.fresh : null));
const remark = (text: string) => ({ on: 0, fields: { text } });

describe("the observation read, with a scripted membership, a stand-in (authority note, sections 3.3 and 3.12; section 16.1)", () => {
  test("an observation admits inside its window and is reused there; at its window it is outside, and with membership silent the act is not judged and uses no key; a ten-second kind is read for its one commit, an act or a step of a capability (a scripted step, a stand-in); after a restart nothing read is used", async () => {
    const s = await create();
    const m = scripted(s);

    // Read 1 of the run, begun when the scope's clock read the start. The entry retains the whole observation, in a grant built from it.
    const first = await s.did(rita, "remark", remark("one"));
    const [one] = await proofs(s, 1);
    expect(one).toMatchObject({ observation: { of: membership, head: { seq: 40 }, key: rita.key, member: "@rita", at: at(0) }, read: { n: 1 }, use: "fresh", prior: null });
    const run = one!.read.run;
    const grant = ((await s.entries(1))[0]!.input as Extract<Entry["input"], { type: "act" }>).authority[0]!;
    expect([agrees(grant), grant.subject, grant.principal]).toEqual([true, rita.member, null]);

    // One second inside the window: the same read serves, with no new read, and the entry names the entry that retains it.
    s.c.clock.now = at(299);
    await s.did(rita, "remark", remark("two"));
    expect([await proofs(s, 2), m.reads]).toEqual([[{ ...one, use: "reused", prior: { seq: 1, hash: first.fact.hash } }], 1]);

    // At the window the observation is outside it. It is read again, and membership does not answer: the act is not judged.
    s.c.clock.now = at(300);
    m.silent = true;
    const late = s.intent(rita, "remark", remark("three"));
    expect([await s.submit(late), (await s.head()).seq, m.reads]).toEqual([UNAVAILABLE, 2, 2]);
    // Nothing was written and the key was not used: with an answer, the same signed intent is accepted, on the third read of the run.
    m.silent = false;
    expect(await s.submit(late)).toMatchObject({ answer: "accepted", receipt: { fact: { seq: 3 } } });
    expect(await proofs(s, 3)).toMatchObject([{ observation: { at: at(300) }, read: { run, n: 3 }, use: "fresh", prior: null }]);

    // A commitment for una, on rita's held observation, each on a later reading.
    s.c.clock.now = at(301);
    const commitment = (await s.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } })).fact.seq;
    s.c.clock.now = at(302);
    await s.did(rita, "assign", { on: commitment, expected: { on: 1 }, fields: { performer: una.member } });
    expect(m.reads).toBe(3);

    // A ten-second kind: una holds an observation that is one second old, and taking a hold still reads for its own commit.
    s.c.clock.now = at(303);
    const held = await s.did(una, "remark", remark("four"));
    s.c.clock.now = at(304);
    await s.did(una, "take-hold", { fields: { commitment }, expected: { commitment: 2 } });
    // That read served its one commit. Una's next ordinary act reuses the observation of the remark, and reads nothing.
    s.c.clock.now = at(305);
    await s.did(una, "remark", remark("five"));
    expect([await proofs(s, 6), m.reads]).toMatchObject([[
      { observation: { key: una.key, at: at(303) }, read: { run, n: 4 }, use: "fresh" },
      { observation: { key: una.key, at: at(304) }, read: { run, n: 5 }, use: "fresh", prior: null },
      { observation: { key: una.key, at: at(303) }, read: { run, n: 4 }, use: "reused", prior: { seq: 6, hash: held.fact.hash } },
    ], 5]);

    // A step of a capability is judged on a ten-second observation too (section 6.11; authority note, section 5.7). The step here is
    // scripted, a stand-in that derives nothing: it shows how a step's grant is read and judged, and nothing about a real step. Una
    // holds an observation that is three seconds old. The step still reads for its own commit, and with membership silent it is not
    // judged and nothing is written. With an answer the preparation entry retains the grant of that read, `fresh`.
    s.c.capability = { steps: { "hold@1:instance": { action: definition.declared.acts["take-hold"]!.grant, window: WINDOWS.once } } };
    s.c.clock.now = at(306);
    const step = s.intent(una, "take-hold");
    m.silent = true;
    expect([await s.stub.prepare(step, [], "hold@1", "instance"), (await s.head()).seq, m.reads]).toEqual([UNAVAILABLE, 8, 6]);
    m.silent = false;
    expect(await s.stub.prepare(step, [], "hold@1", "instance")).toMatchObject({ answer: "accepted", receipt: { fact: { seq: 9 } } });
    const [prepared] = await s.entries(9);
    expect([prepared!.input.type, await proofs(s, 9), m.reads]).toMatchObject(["preparation", [{ observation: { key: una.key, at: at(306) }, read: { run, n: 7 }, use: "fresh", prior: null }], 7]);

    // A restart. Una's observation was four seconds old, inside its window, and the new run holds none: with membership silent the
    // act is not judged. With an answer it is read again, in another run: its read 2, after the one that got no answer.
    await s.restart();
    s.c.clock.now = at(307);
    m.silent = true;
    const after = s.intent(una, "remark", remark("six"));
    expect([await s.submit(after), (await s.head()).seq]).toEqual([UNAVAILABLE, 9]);
    m.silent = false;
    expect(await s.submit(after)).toMatchObject({ answer: "accepted", receipt: { fact: { seq: 10 } } });
    const [again] = await proofs(s, 10);
    expect([again, again!.read.run === run]).toMatchObject([{ observation: { at: at(307) }, read: { n: 2 }, use: "fresh", prior: null }, false]);
  });

  test("the order of heads holds across a restart: the folded state holds the highest head that an entry retained for a key and for its member, and a read that is answered from a lower head is discarded in the commit, in a new run too", async () => {
    const s = await create();
    const m = scripted(s);
    // Entry 1 retains rita's key at head 44 of membership. The fold keeps that head for the key and for its member.
    m.head = 44;
    await s.did(rita, "remark", remark("at 44"));
    const kept = () => s.inside((state) => state.storage.sql.exec("SELECT value FROM folded WHERE kind = 'observed' ORDER BY key").toArray().map((row) => JSON.parse(row["value"] as string) as { subject: string; seq: number }).map(({ subject, seq }) => [subject, seq] as const));
    expect(new Map(await kept())).toEqual(new Map<string, number>([["@rita", 44], [rita.key, 44]]));

    // A restart: the new run holds no observation and no memory of the head. The scripted membership, a stand-in, now answers from
    // head 40, as a read that an older replica served would. The commit finds the lower head in the folded state: the observation
    // is discarded, the act is not judged, and nothing is written on head 40 (the contract's witness 18.40, case 5).
    await s.restart();
    s.c.clock.now = at(1);
    m.head = 40;
    const lower = s.intent(rita, "remark", remark("at 40"));
    expect([await s.submit(lower), (await s.head()).seq, m.reads]).toEqual([UNAVAILABLE, 1, 2]);
    // An observation of a key is also of its member. Another key of rita's member, read at head 40, is discarded as well.
    m.over[una.key] = { member: "@rita" };
    expect([await s.submit(s.intent(una, "remark", remark("another key of that member"))), (await s.head()).seq]).toEqual([UNAVAILABLE, 1]);
    // A read from the head that was retained, or from a later one, is judged: heads do not go back, and they need not move.
    m.head = 44;
    expect(await s.submit(lower)).toMatchObject({ answer: "accepted", receipt: { fact: { seq: 2 } } });
    m.head = 45;
    s.c.clock.now = at(2);
    await s.did(una, "remark", remark("at 45"));
    expect(new Map(await kept())).toEqual(new Map<string, number>([["@rita", 45], [rita.key, 44], [una.key, 45]]));
  });

  test("a revocation that one read has seen takes effect at once: the held observation that shows the key active is discarded, and the revoked answer stays for the run, whatever its window", async () => {
    const s = await create();
    const m = scripted(s);
    const commitment = (await s.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } })).fact.seq;
    s.c.clock.now = at(1);
    await s.did(rita, "assign", { on: commitment, expected: { on: 1 }, fields: { performer: una.member } });
    s.c.clock.now = at(2);
    await s.did(una, "remark", remark("before"));
    expect(m.reads).toBe(2);

    // Membership records that una's key is retired. Nothing is sent to this scope.
    m.over[una.key] = { keyState: "retired" };
    m.head = 44;
    // The stated grace: an ordinary act inside the window is admitted on the observation that the scope holds.
    s.c.clock.now = at(3);
    expect(await s.act(una, "remark", remark("grace"))).toMatchObject({ answer: "accepted", receipt: { fact: { seq: 4 } } });
    const head = await s.head();
    const refused = { answer: "refused", reason: "unauthorized", judgedAt: head };

    // A ten-second kind reads for its commit, and sees the revocation.
    s.c.clock.now = at(4);
    expect([await s.act(una, "take-hold", { fields: { commitment }, expected: { commitment: 2 } }), m.reads]).toEqual([refused, 3]);
    // From that read on the held observation is not used, though it is three seconds old: an ordinary act is refused, with no read.
    s.c.clock.now = at(5);
    expect([await s.act(una, "remark", remark("after")), m.reads]).toEqual([refused, 3]);
    // Long past every window, and with membership answering as it did before the revocation: the revoked answer is still the one used.
    m.over = {};
    m.head = 40;
    s.c.clock.now = at(400);
    expect([await s.act(una, "remark", remark("later")), m.reads, await s.head()]).toEqual([refused, 3, head]);
    // Another key is judged on its own observation.
    expect(await s.act(rita, "remark", remark("rita"))).toMatchObject({ answer: "accepted", receipt: { fact: { seq: 5 } } });
  });

  test("the clock table: an act judges time, so a clock that is behind stops it, and its observation is read again before a retry; a checkpoint and a timed entry read no observation, and are written with membership silent", async () => {
    const s = await create();
    const m = scripted(s);
    s.c.clock.now = at(100);
    const commitment = (await s.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } })).fact.seq;
    s.c.clock.now = at(101);
    await s.did(rita, "assign", { on: commitment, expected: { on: 1 }, fields: { performer: una.member } });
    s.c.clock.now = at(102);
    await s.did(una, "take-hold", { fields: { commitment }, expected: { commitment: 2 } });
    expect(m.reads).toBe(2);

    // The clock reads earlier than the previous entry's time. The act is answered `clock-behind`, and nothing is written.
    s.c.clock.now = at(90);
    const behind = s.intent(rita, "remark", remark("behind"));
    expect([await s.submit(behind), (await s.head()).seq]).toEqual([{ answer: "unavailable", reason: "clock-behind" }, 3]);
    // On a later reading the same intent is judged on an observation that was read again, and not on one from before.
    s.c.clock.now = at(103);
    expect(await s.submit(behind)).toMatchObject({ answer: "accepted", receipt: { fact: { seq: 4 } } });
    expect([await proofs(s, 4), m.reads]).toMatchObject([[{ observation: { at: at(103) }, read: { n: 4 }, use: "fresh", prior: null }], 4]);

    // Membership is silent from here on. A checkpoint judges no time and reads no observation: it is written clamped on a clock that is behind.
    m.silent = true;
    s.c.clock.now = at(95);
    expect(await s.stub.checkpoint()).toMatchObject({ answer: "written", fact: { seq: 5 } });
    // The hold's end is a timed entry. It judges time and no grant: it is written at its deadline, and never clamped.
    s.c.clock.now = at(102 + HOLD);
    await s.alarm();
    expect([(await s.entries(1)).map((entry) => [entry.input.type, entry.clamped]), await s.count("hold", "ended"), m.reads])
      .toEqual([[["act", false], ["act", false], ["act", false], ["act", false], ["checkpoint", true], ["timed", false]], 1, 4]);
    // An act still needs a grant. Rita's observation is past its window and cannot be read again: the act is not judged.
    expect([await s.act(rita, "remark", remark("silent")), (await s.head()).seq]).toEqual([UNAVAILABLE, 6]);
  });
});

// The order of two things that race: the destination's read of membership, and the notice that lands during that read. The commit
// asks for the notice, so the read that began first does not win. The reader is a STAND-IN that the test answers by hand. It shows
// the observing scope's side, and nothing about membership or a delivery.
describe("a compromised notice that lands during the read, with a scripted reader, a stand-in", () => {
  test("the commit of `read-token` is refused on the answer that shows the key active; another act of the key, and another key, are judged as before", async () => {
    const reading = { reading: at(0), behind: false, asOf: at(0) };
    const view = { observed: () => null } as unknown as Parameters<Standing["held"]>[0];
    const named = new Set<KeyId>();
    const answers: ((answer: unknown) => void)[] = [];
    const port = observing({ clock: { read: () => at(0) }, random: { bytes: (n) => new Uint8Array(n) }, membership: () => membership, reader: { observe: () => new Promise((resolve) => answers.push(resolve)) }, named: (key) => named.has(key) });
    const active = (who: typeof una) => ({ of: membership, head: { seq: 40, hash: d("4") }, key: who.key, keyState: "active", member: who.member.member, memberState: "active", role: "member", actions, within: { membership }, controller: null, controllerActive: null, notAfter: null, definition: "platform:membership@1" });
    const asked = (who: typeof una, kind: string) => ({ scope: { scope: membership.scope, genesis: membership.genesis }, grants: [], action: actions[0]!, window: WINDOWS.ordinary, signed: { intent: { actor: who.key, kind } } }) as unknown as Asked;
    const held = async (who: typeof una, kind: string, name: boolean) => {
      const read = port.read(asked(who, kind), 5);
      if (name) named.add(una.key);
      answers.shift()?.(active(who));
      const result = await read;
      if (result === null || result === "limit") return expect.fail("the two-key witness must obtain standing");
      return result.held(view, reading);
    };
    expect(await held(una, "read-token", true)).toEqual([]);
    named.clear();
    expect(await held(rita, "read-token", false)).toMatchObject([{ current: true }]);
    named.add(una.key);
    expect(await held(rita, "read-token", false)).toMatchObject([{ current: true }]);
    expect(await held(una, "evidence-recover-timeout", false)).toMatchObject([{ current: true }]);
  });
});


// Actual authority-port cache below signature admission. Synthetic key IDs and
// scripted Membership replies are stand-ins, not proof of a signed Native act.
const cacheKey = (number: number): KeyId => {
  const bytes = new Uint8Array(32);
  new DataView(bytes.buffer).setUint32(0, number);
  return `key_${b64url(bytes)}` as KeyId;
};
const cacheAsk = (number: number, once = false): Asked => ({ scope: { ...membership, kind: "destination" }, grants: [],
  action: actions[0]!, window: once ? WINDOWS.once : WINDOWS.ordinary,
  signed: { intent: { actor: cacheKey(number), kind: "read-token" } } }) as unknown as Asked;
const cacheAnswer = (key: KeyId, keyState: Observation["keyState"] = "active", seq = 40): Omit<Observation, "at"> => ({
  of: membership, head: { seq, hash: d("4") }, key, keyState,
  member: "@rita", memberState: "active", role: "member", actions, within: { membership },
  controller: null, controllerActive: null, notAfter: null, definition: "platform:membership@1",
});
const cacheView = { observed: () => null } as unknown as Parameters<Standing["held"]>[0];
const cacheReading = { reading: at(0), behind: false, asOf: at(0) };
const currentCacheStanding = (answer: Standing | "limit" | null): Standing => {
  if (answer === null || answer === "limit") return expect.fail(`Expected current standing, got ${answer}`);
  expect(answer.held(cacheView, cacheReading)).toMatchObject([{ current: true }]);
  return answer;
};

test("an authority run charges only 4096 keys with standing, reserves concurrent arrivals after their read, keeps old keys usable and resets in a new run", async () => {
  let reads = 0, delayed = false;
  const waiting: { key: KeyId; resolve(answer: unknown): void }[] = [];
  const config = { clock: { read: () => at(0) }, random: { bytes: (n: number) => new Uint8Array(n) }, membership: () => membership,
    reader: { observe: async (request: ObservationRequest) => {
      if (!("key" in request)) return null;
      reads++;
      return delayed ? new Promise(resolve => waiting.push({ key: request.key, resolve })) : cacheAnswer(request.key);
    } } };
  const port = observing(config);
  for (let number = 0; number < 4095; number++) currentCacheStanding(await port.read(cacheAsk(number, number % 3 === 1), 5));
  expect(port.cacheCounts().admitted).toBe(4095);
  delayed = true;
  const first = port.read(cacheAsk(4095, true), 5), second = port.read(cacheAsk(4096), 5);
  expect(waiting).toHaveLength(2);
  waiting[1]!.resolve(cacheAnswer(waiting[1]!.key));
  currentCacheStanding(await second);
  waiting[0]!.resolve(cacheAnswer(waiting[0]!.key));
  expect(await first).toBe("limit");
  expect(port.cacheCounts()).toEqual({ admitted: 4096, kept: 2731, retained: 0, denied: 0 });
  delayed = false;
  const before = reads;
  currentCacheStanding(await port.read(cacheAsk(0), 5)); expect(reads).toBe(before);
  currentCacheStanding(await port.read(cacheAsk(1, true), 5)); expect(reads).toBe(before + 1);
  expect(await port.read(cacheAsk(4097), 5)).toBe("limit"); expect(reads).toBe(before + 2);
  currentCacheStanding(await observing(config).read(cacheAsk(4097), 5));
});

test("more than 4096 unknown or unanswered signer reads do not charge a run or prevent a newly joined member's standing", async () => {
  let joined = false, readNumber = 0;
  const port = observing({ clock: { read: () => at(0) }, random: { bytes: n => new Uint8Array(n) }, membership: () => membership,
    reader: { observe: async (request: ObservationRequest) => {
      if (!("key" in request)) return null;
      if (request.key === cacheKey(5000) && joined) return { ...cacheAnswer(request.key), member: "@newcomer" };
      if (readNumber++ % 3 === 0) return null;
      if (readNumber % 3 === 0) throw Error("scripted unavailable Membership");
      return cacheAnswer(request.key, "unknown");
    } } });
  for (let number = 0; number < 4100; number++) {
    const answer = await port.read(cacheAsk(number, number % 2 === 1), 5);
    if (answer !== null && answer !== "limit") expect(answer.held(cacheView, cacheReading)).toEqual([]);
  }
  // Check the new member before memory diagnostics: today's counting control
  // must fail on the newcomer receiving limit, not on an intermediate size.
  const afterFlood = port.cacheCounts();
  joined = true;
  const newcomer = currentCacheStanding(await port.read(cacheAsk(5000), 5));
  expect(newcomer.held(cacheView, cacheReading)).toMatchObject([{ grant: { subject: { member: "@newcomer" } } }]);
  expect(afterFlood).toEqual({ admitted: 0, kept: 0, retained: 0, denied: 0 });
  expect(port.cacheCounts()).toEqual({ admitted: 1, kept: 1, retained: 0, denied: 0 });
});

test("evicting a never-admitted revoked key invalidates its older in-flight active answer and reads Membership again", async () => {
  let first = true, keyReads = 0;
  let release: ((answer: unknown) => void) | undefined;
  const port = observing({ clock: { read: () => at(0) }, random: { bytes: n => new Uint8Array(n) }, membership: () => membership,
    reader: { observe: async (request: ObservationRequest) => {
      if (!("key" in request)) return null;
      if (request.key === cacheKey(5000)) return cacheAnswer(request.key);
      if (request.key === cacheKey(0)) {
        keyReads++;
        if (first) { first = false; return new Promise(resolve => { release = resolve; }); }
      }
      return cacheAnswer(request.key, "retired", 50);
    } } });
  const pending = port.read(cacheAsk(0), 5);
  const refused = await port.read(cacheAsk(0), 5);
  expect(refused === null || refused === "limit" ? refused : refused.held(cacheView, cacheReading)).toEqual([]);
  const admitted = currentCacheStanding(await port.read(cacheAsk(5000), 5));
  for (let number = 1; number <= 4096; number++) await port.read(cacheAsk(number), 5);
  expect(port.cacheCounts()).toEqual({ admitted: 1, kept: 1, retained: 0, denied: 4096 });
  release!(cacheAnswer(cacheKey(0)));
  const old = await pending;
  const held = old === null || old === "limit" ? old : old.held(cacheView, cacheReading);
  expect(held).toBeNull();
  expect(admitted.held(cacheView, cacheReading)).toMatchObject([{ current: true }]);
  const fresh = await port.read(cacheAsk(0), 5);
  expect(fresh === null || fresh === "limit" ? fresh : fresh.held(cacheView, cacheReading)).toBeNull();
  expect(keyReads).toBe(3);
  const remembered = await port.read(cacheAsk(0), 5);
  expect(remembered === null || remembered === "limit" ? remembered : remembered.held(cacheView, cacheReading)).toEqual([]);
  expect(keyReads).toBe(3);
  currentCacheStanding(await port.read(cacheAsk(5000), 5));
  expect(port.cacheCounts()).toEqual({ admitted: 1, kept: 1, retained: 0, denied: 4096 });
});
