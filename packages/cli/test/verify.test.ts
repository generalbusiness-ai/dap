import { expect, test } from "vitest";
import type { Entry, ScopeRef, Seed, SequenceEntry } from "@generalbusiness/dap-contract";
import { b64url, entryHash, newGenesisNonce, scopeIdOf, textDigest } from "@generalbusiness/dap-bytes";
import type { Fetch } from "@generalbusiness/dap-client";
import { command, memoryStore } from "../src/index.ts";

// Invariant: `verify --all` cannot report a whole-room result when creation discovery exhausts its page bound with a cursor left.
// STAND-IN service: typed summary/history replies and hand-made entries which no scope judged. The command and its bounded,
// signed-read HTTP transport are real. This witnesses discovery coverage, not admission, authorization or historical replay.
test("verify --all refuses incomplete room discovery at its page bound and retains the exact final cursor, after following earlier cursors", async () => {
  const seed: Seed = { v: 1, kind: "directory", definition: "platform:directory@2", creator: null, cause: textDigest("fixture directory"), ordinal: 0 };
  const directory: ScopeRef = { scope: scopeIdOf(seed), genesis: textDigest("TEST genesis 1") };
  const membership: ScopeRef = { scope: scopeIdOf({ ...seed, kind: "membership" }), genesis: textDigest("TEST membership genesis") };
  const time = "2099-01-01T00:00:00Z";
  const entries: Entry[] = [0, 1, 2].map((seq): SequenceEntry => ({ v: 1, genesis: directory.genesis, seq: seq + 1, prev: textDigest(`previous ${seq}`), time, clamped: false, epoch: 0, input: { type: "checkpoint", through: 0, state: textDigest("fixture state") }, uses: [], prepared: [], effects: [], sends: [] }));
  const head = { seq: 3, hash: entryHash(entries[2]!) };
  for (const limit of [1, 2]) {
    const store = memoryStore();
    await store.keep("device", new Uint8Array(32).fill(2));
    await store.save({ v: 2, service: "https://service.test", key: "device", repository: { directory, membership, rules: directory.scope, destination: directory.scope } });
    const cursors: (string | null)[] = [];
    const fetch: Fetch = async (url, init) => {
      const address = new URL(url);
      let body: unknown;
      if (address.pathname.endsWith("/sessions")) body = { ok: false, reason: "sessions-unavailable" };
      else if (address.pathname === `/v1/scopes/${directory.scope}`) body = { ok: true, at: head, complete: true, value: { scope: directory, status: "active", definition: seed.definition, time, items: [], counts: [] } };
      else if (address.pathname === `/v1/scopes/${directory.scope}/history`) {
        expect(init?.headers?.["authorization"]).toMatch(/^Signed /);
        const cursor = address.searchParams.get("cursor");
        cursors.push(cursor);
        const seq = cursor === null ? 0 : Number(cursor);
        body = { ok: true, at: head, complete: false, value: [{ entry: entries[seq], hash: entryHash(entries[seq]!) }], next: String(seq + 1) };
      } else throw new Error(`Unexpected read after incomplete discovery: ${address.pathname}`);
      return new Response(JSON.stringify(body)) as never;
    };
    const outcome = await command({ store, fetch, historyPages: limit, now: () => Date.parse(time) }, ["verify", "--all"]);
    expect(outcome).toEqual({ code: 1, lines: [`Incomplete: room discovery for ${directory.scope} reached ${limit} history pages; next cursor "${limit}". The whole room was not verified.`] });
    expect(cursors).toEqual(limit === 1 ? [null] : [null, "1"]);
  }
});

// Actual native judgments in memory; HTTP/session/discovery metadata are
// explicit STAND-INs. This is dependency replay, not a Native room proof.
import type { Digest, Request, RetainedInput, ScopeId } from "@generalbusiness/dap-contract";
import { canonicalize, timeMs } from "@generalbusiness/dap-bytes";
import { clockOf, judgeDelivery, judgeGenesis, useOf } from "@generalbusiness/dap-derive";
import { Ledger, fixtureSequence, later } from "@generalbusiness/dap-derive/testing";
import { repositoryName } from "@generalbusiness/dap-platform";
import { MemorySource, type MemoryScope } from "@generalbusiness/dap-replay";
import { Register, registerDefinition, registerPlatform, directoryDefinition, directoryPlatform, rita } from "../../platform/test/support-creation.ts";
import { written } from "../../platform/test/fixtures.ts";

function broadRegister() {
  const R = new Register(), children: Ledger[] = [];
  for (let n = 0; n < 65; n++) {
    expect(R.create(rita, {}, `wide-${n}`).result).toBe("write");
    const claim = R.fact(R.head.seq);
    const name = repositoryName(R.item(claim.seq).values["seed"] as Digest, 1);
    written(R.outcome(`${claim.seq}:0`, 1, "confirmed", { name, id: `TEST-repository-${n}` }));
    const sent = R.last, from = R.fact(sent.seq);
    const { to: seed, message } = sent.sends[0] as { to: Seed; message: Request };
    const D = new Ledger(directoryDefinition, "platform:directory");
    D.seal(written(judgeGenesis(D.state, directoryDefinition, { name: scopeIdOf(seed), nonce: newGenesisNonce(new Uint8Array(16).fill(8)), to: seed, from, n: 0, message },
      { clock: clockOf(D.state, D.now), bounds: D.bounds, prepared: [], own: D.own, platform: directoryPlatform, facts: [{ fact: claim, entry: R.entries[claim.seq]!.entry, under: R.under, sequence: fixtureSequence(R) }], source: { entry: sent, under: R.under, sequence: fixtureSequence(R) } })));
    const result = D.last.sends[0]!;
    R.seal(written(judgeDelivery(R.state, registerDefinition, { to: result.to, from: D.fact(0), n: 0, message: result.message },
      { clock: clockOf(R.state, R.now), bounds: R.bounds, facts: [], prepared: [], own: R.own, source: { entry: D.last, under: D.under, sequence: fixtureSequence(D) }, origin: sent, platform: registerPlatform })));
    children.push(D);
  }
  const all = [R, ...children];
  const scopes: MemoryScope[] = all.map(ledger => {
    const retained: RetainedInput[] = [{ kind: "definition", digest: ledger.definition.digest, bytes: canonicalize(ledger.definition.declared) }];
    for (const { entry } of ledger.entries) for (const use of entry.uses) {
      const source = all.find(other => other.at.scope === use.fact.at.scope)!;
      retained.push({ kind: "entry", digest: use.content, bytes: canonicalize(source.entries[use.fact.seq]!.entry), under: source.definition.declared.name });
    }
    return { scope: ledger.at, entries: ledger.entries.map(({ entry, hash }) => ({ seq: entry.seq, hash, bytes: canonicalize(entry) })), retained };
  });
  return { R, children, scopes, memory: new MemorySource(scopes, 32) };
}

async function broadContext(wide: Pick<ReturnType<typeof broadRegister>, "R" | "children" | "memory">, discovery: "empty" | "wide", progress: string[], refusal?: "forbidden" | "unavailable", refused?: (scope: ScopeId) => boolean, ownAt = 0) {
  const { R, children, memory } = wide, D = children[ownAt]!;
  const store = memoryStore(); await store.keep("device", rita.secret);
  await store.save({ v: 2, service: "https://service.test", key: "device", repository: { directory: D.at, membership: { ...D.at, genesis: textDigest("TEST membership genesis") }, rules: D.at.scope, destination: D.at.scope } });
  const logs = new Set<ScopeId>(), histories: ScopeId[] = [], logPages = new Map<string, number>();
  let elapsed = 0;
  const fetch: Fetch = async (url, init) => {
    const address = new URL(url), parts = address.pathname.split("/").map(decodeURIComponent), scope = parts[3] as ScopeId;
    if (address.pathname.endsWith("/sessions")) {
      if (!refusal) return Response.json({ ok: false, reason: "sessions-unavailable" }, { status: 503 });
      const request = JSON.parse(init!.body!).request;
      return Response.json({ ok: true, token: b64url(new Uint8Array(32).fill(7)), session: { v: 1, deployment: "SCRIPTED session", membership: { ...D.at, genesis: textDigest("TEST membership genesis") }, member: "@rita", key: request.actor, reads: ["summary", "entry", "history", "log", "retained"], ends: request.notAfter } });
    }
    expect(init?.headers?.["authorization"]).toMatch(refusal ? /^(Session|Signed) / : /^Signed /);
    if (address.pathname === `/v1/scopes/${D.at.scope}`) return Response.json({ ok: true, at: D.head, complete: true, value: { scope: D.at, status: "active", definition: "platform:directory@2", time: D.now, counts: [], items: [{ id: 0, revision: 1, type: "repository", state: "ready", opened: textDigest("SCRIPTED discovery"), attributed: [], parties: {}, values: {}, refs: { register: R.at } }] } });
    if (parts[4] === "history") {
      histories.push(scope);
      // Discovery-only metadata deliberately differs from the replay journals.
      // Its separate test exercises graph breadth; replay below uses judged bytes.
      const sources = discovery === "wide" && scope === D.at.scope ? R.entries.filter(({ entry }) => entry.sends.some(send => "creator" in send.to)) : [];
      const value = sources.map(({ entry }) => { const changed: Entry = entry.input.type === "genesis" ? entry : { ...later(entry), genesis: D.at.genesis }; return { entry: changed, hash: entryHash(changed) }; });
      if (discovery === "wide" && scope === children.at(-1)!.at.scope) elapsed = 100_000;
      return Response.json({ ok: true, at: D.head, complete: true, value });
    }
    if (parts[4] === "log") {
      logs.add(scope);
      const page = `${scope}:${address.searchParams.get("cursor") ?? "0"}`;
      logPages.set(page, (logPages.get(page) ?? 0) + 1);
      if (refusal && (refused ? refused(scope) : scope === D.at.scope)) return Response.json({ ok: false, reason: refusal }, { status: refusal === "forbidden" ? 403 : 503 });
      const got = await memory.page(scope, Number(address.searchParams.get("cursor") ?? 0), { entries: 32, bytes: 4 * 1024 * 1024 });
      return Response.json(got.ok ? { ok: true, at: got.page.head, complete: got.page.next === null, value: { scope: got.page.scope, entries: got.page.entries }, ...(got.page.next === null ? {} : { next: String(got.page.next) }) } : got);
    }
    if (parts[4] === "retained") {
      const got = await memory.retained(scope, parts[5] as RetainedInput["kind"], parts[6] as Digest, { bytes: 4 * 1024 * 1024 });
      return Response.json(got.ok ? { ok: true, at: R.head, complete: true, value: got.input } : got);
    }
    throw Error(`Unexpected SCRIPTED read: ${address.pathname}`);
  };
  return { ctx: { store, fetch, now: () => timeMs(R.now)!, verify: { progress: (line: string) => progress.push(line), ...(discovery === "wide" ? { limits: { milliseconds: 100_000 }, monotonicNow: () => elapsed } : {}) } }, logs, histories, logPages };
}

test("verify --all discovers more than 64 scopes and reports the exact elapsed-budget stop after progress", async () => {
  const wide = broadRegister(), progress: string[] = [];
  const { ctx, histories, logs } = await broadContext(wide, "wide", progress);
  const outcome = await command(ctx, ["verify", "--all"]);
  expect(new Set(histories).size).toBe(65); // The selected Directory is one of the 65 genuine seeds.
  expect(histories).toContain(wide.children.at(-1)!.at.scope);
  expect(outcome.code).toBe(1);
  expect(outcome.lines.join("\n")).toContain(`Stopped at discovery, scope ${wide.children.at(-1)!.at.scope}`);
  expect(outcome.lines.join("\n")).toContain("verification time");
  expect(outcome.lines.join("\n")).not.toContain("All consistent");
  expect(progress.length).toBeGreaterThan(64);
  expect(logs.size).toBe(0);
});

test("verify --all replays a Register with 65 sibling dependencies under CLI work budgets rather than replay's default 64 scopes", async () => {
  const wide = broadRegister(), progress: string[] = [];
  const { ctx, logs, logPages } = await broadContext(wide, "empty", progress);
  const outcome = await command(ctx, ["verify", "--all"]);
  expect(outcome.code, outcome.lines.join("\n")).toBe(0);
  expect(outcome.lines).toContain(`register ${wide.R.at.scope}, entry ${wide.R.head.seq}: consistent.`);
  expect(logs).toEqual(new Set([wide.R.at.scope, ...wide.children.map(child => child.at.scope)]));
  // Following the Directory root must reuse the Register proof and its
  // other 64 children. A requested-root head refresh may reread Directory 0.
  for (const child of wide.children.slice(1)) expect(logPages.get(`${child.at.scope}:0`)).toBe(1);
  expect(outcome.lines.filter(line => line.startsWith("Shared room proof:"))).toHaveLength(1);
  // A row that covers entry 0 states the kind that its genesis names (ruling 4393b366 T3(a)).
  expect(outcome.lines).toContain(`Shared coverage: ${wide.R.at.scope}, genesis ${wide.R.at.genesis}, kind register, entries 0 to ${wide.R.head.seq}; proving root ${wide.R.at.scope}.`);
  // Only two top-level targets were selected by the SCRIPTED discovery;
  // the 65 sibling proofs are actual judged journal dependencies, not 65 targets.
  expect(outcome.lines.at(-1)).toBe("All consistent: 2 scopes.");
});

// Session refusal is SCRIPTED; this exercises the actual budgeted command
// and preserves its response-header metadata, not a Native quota window.
test("verify --all reports a session rate window without Signed fallback or an incomplete replay finding", async () => {
  const seed: Seed = { v: 1, kind: "directory", definition: "platform:directory@2", creator: null, cause: textDigest("rate fixture"), ordinal: 0 };
  const directory: ScopeRef = { scope: scopeIdOf(seed), genesis: textDigest("TEST genesis 2") };
  const membership: ScopeRef = { scope: scopeIdOf({ ...seed, kind: "membership" }), genesis: textDigest("TEST membership genesis") };
  const store = memoryStore(); await store.keep("device", new Uint8Array(32).fill(2));
  await store.save({ v: 2, service: "https://rate.test", key: "device", repository: { directory, membership, rules: directory.scope, destination: directory.scope } });
  let sessions = 0, reads = 0;
  const fetch: Fetch = async url => {
    if (new URL(url).pathname.endsWith("/sessions")) { sessions++; return Response.json({ ok: false, reason: "rate-limited" }, { status: 429, headers: { "retry-after": "17" } }); }
    reads++; throw Error("A session rate refusal must not choose a Signed read");
  };
  const outcome = await command({ store, fetch, now: () => Date.parse("2099-01-01T00:00:00Z") }, ["verify", "--all"]);
  expect(outcome.code).toBe(1);
  expect(outcome.lines.join("\n")).toContain("rate-limited");
  expect(outcome.lines.join("\n")).toContain("17 seconds");
  expect(outcome.lines.join("\n")).not.toMatch(/incomplete|All consistent/);
  expect([sessions, reads]).toEqual([1, 0]);
});

// Both denial replies and the Session itself are SCRIPTED. All /log and
// retained bytes outside the refused page remain the actual judged fixture.
test("only an actual Session-forbidden Directory genesis matching the replay's needed fact is reported not proven", async () => {
  const wide = broadRegister(), needed = wide.children[0]!.at.scope;
  const qualified = `not proven: needs ${needed} entries 0 to 0, not readable by this session`;
  const result = wide.R.entries.find(({ entry }) => entry.input.type === "delivery" && entry.input.message.class === "result" && entry.input.from.at.scope === needed)!;
  for (const refusal of ["forbidden", "unavailable"] as const) {
    const { ctx } = await broadContext(wide, "empty", [], refusal);
    const outcome = await command(ctx, ["verify", "--all"]);
    expect(outcome.code).toBe(1);
    const register = outcome.lines.find(line => line.startsWith(`register ${wide.R.at.scope},`))!;
    if (refusal === "forbidden") {
      expect(register).toBe(`register ${wide.R.at.scope}, entry ${wide.R.head.seq}: ${qualified}.`);
      expect(outcome.lines).toContain(`Proof dependency: Register creation result ${wide.R.at.scope}:${result.entry.seq}.`);
      expect(register).not.toMatch(/incomplete|consistent/);
      const standalone = await command(ctx, ["verify", wide.R.at.scope]);
      expect(standalone.code).toBe(1);
      expect(standalone.lines[0]).toBe(`Result: ${qualified}.`);
    } else {
      expect(register).toBe(`register ${wide.R.at.scope}, entry ${wide.R.head.seq}: missing-dependency.`);
      expect(outcome.lines.join("\n")).not.toContain("not readable by this session");
    }
    expect(outcome.lines.at(-1)).not.toMatch(/^All consistent/);
  }
});

// Each room's directory admits only its own members. The refusal of other rooms' directories is SCRIPTED, and the journals are judged bytes.
const otherRoomsRefused = (wide: ReturnType<typeof broadRegister>) => {
  const own = wide.children[0]!.at.scope, others = new Set(wide.children.map(child => child.at.scope).filter(scope => scope !== own));
  return { own, others, refused: (scope: ScopeId) => others.has(scope) };
};

test("a second room verifies its own room: other rooms' creation results stand on the service's word, and the report says what that result covers", async () => {
  const wide = broadRegister(), { refused, others } = otherRoomsRefused(wide);
  const { ctx } = await broadContext(wide, "empty", [], "forbidden", refused);
  const outcome = await command(ctx, ["verify", wide.R.at.scope]);
  expect(outcome.code, outcome.lines.slice(0, 6).join("\n")).toBe(0);
  expect(outcome.lines[0]).toBe("Result: consistent, for the mode, target, coverage and trusts stated below.");
  expect(outcome.lines[1], "WHAT IT COVERS: the second line says what stands on the service's word").toBe("This result covers the scopes under Coverage, replayed from their first entries. It does not cover other rooms on this register: 64 of their creation results stand on the service's word, because this reader cannot read their directories.");
  expect(outcome.lines, "THE ANCHORS have their own heading").toContain("Anchors, other rooms' creation results, taken on the service's word:");
  expect(outcome.lines.join("\n"), "THE TRUST is stated").toContain("other rooms' creation results: that each entry listed under Anchors is the first entry of another room's directory, as the service says.");
  const heading = outcome.lines.indexOf("Anchors, other rooms' creation results, taken on the service's word:");
  const anchors = outcome.lines.slice(heading + 1, heading + 65);
  expect(anchors.every(line => line.startsWith("  - entry 0 of ")), anchors.slice(0, 2).join("\n")).toBe(true);
  expect(anchors.every(line => [...others].some(scope => line.includes(scope))), "EVERY ANCHOR is another room's").toBe(true);
  expect(anchors.some(line => line.includes(wide.children[0]!.at.scope)), "THE OWN DIRECTORY is no anchor").toBe(false);

  const all = await command(ctx, ["verify", "--all"]);
  expect(all.code, all.lines.slice(-6).join("\n")).toBe(0);
  expect(all.lines.at(-1), "--all: the last line says the same").toBe("All consistent: 2 scopes, and 64 creation results of other rooms on the service's word.");
  expect(all.lines[0]).toContain("It does not cover other rooms on this register: 64 of their creation results");
});

test("the first room of a register reads as a full replay: no line about other rooms", async () => {
  const wide = broadRegister();
  const { ctx } = await broadContext(wide, "empty", []);
  const outcome = await command(ctx, ["verify", wide.R.at.scope]);
  expect(outcome.code).toBe(0);
  expect(outcome.lines.join("\n")).not.toContain("other rooms");
  expect(outcome.lines).toContain("Anchors: none.");
});

/** A server's forged register: a change to one entry, each later entry sealed again, so the chain holds. */
function forged(wide: ReturnType<typeof broadRegister>, change: (entry: Entry) => Entry | null, retained: RetainedInput[] = []) {
  let prev: Digest | null = null, seq = 0;
  const entries: MemoryScope["entries"] = [];
  for (const { entry } of wide.R.entries) {
    const next = change(entry);
    if (!next) continue;
    const moved: Entry = next.input.type === "genesis" ? next : { ...later(next), seq, prev };
    const hash = entryHash(moved);
    entries.push({ seq, hash, bytes: canonicalize(moved) }); prev = hash; seq++;
  }
  const scopes = wide.scopes.map(scope => scope.scope.scope === wide.R.at.scope ? { ...scope, entries, retained: [...scope.retained, ...retained] } : scope);
  return { R: wide.R, children: wide.children, memory: new MemorySource(scopes, 32) };
}

// The own room is the second room here, so the first room's request is already sealed when the forged result arrives.
test("a server that relabels this room's own result as another room's fails the proof", async () => {
  const wide = broadRegister(), ownAt = 1, own = wide.children[ownAt]!, theirs = wide.children[0]!;
  const refused = (scope: ScopeId) => scope !== own.at.scope && wide.children.some(child => child.at.scope === scope);
  const results = (scope: ScopeId) => wide.R.entries.find(({ entry }) => entry.input.type === "delivery" && entry.input.message.class === "result" && entry.input.from.at.scope === scope)!.entry;
  const ownResult = results(own.at.scope), theirResult = results(theirs.at.scope);
  const relabelUses = (from: unknown, use: unknown) => (entry: Entry) => entry.seq === ownResult.seq ? { ...entry, input: { ...entry.input, from }, uses: [use] } as Entry : entry;
  const relabel = (fields: (input: { from: unknown; message: { of: unknown } }) => object) => (entry: Entry) => entry.seq === ownResult.seq ? { ...entry, input: { ...entry.input, ...fields(entry.input as never) } } as Entry : entry;
  // The strongest form: an invented entry, named as the last room's first entry and retained for the reader, with that room's real result removed from the end. Only that room's readers could compare the hash.
  const last = wide.children.at(-1)!, lastResult = results(last.at.scope);
  const invented: Entry = own.entries[0]!.entry; // Its own genesis, named as the last room's.
  const inventedFact = { at: last.at, seq: 0, hash: entryHash(invented) }, inventedUse = useOf(inventedFact, invented, "directory");
  const inventedCopy: RetainedInput = { kind: "entry", digest: inventedUse.content, bytes: canonicalize(invented), under: own.definition.declared.name };
  const variants: Record<string, [(entry: Entry) => Entry | null, string, RetainedInput[]?]> = {
    "an invented source entry": [(entry: Entry) => entry.seq === lastResult.seq ? null : relabelUses(inventedFact, inventedUse)(entry), "Result: mismatch: the history is not consistent.", [inventedCopy]],
    "the source alone": [relabel(() => ({ from: theirs.fact(0) })), `Result: not proven: needs ${theirs.at.scope} entries 0 to 0, not readable by this session.`],
    "the source and the request": [relabel(input => ({ from: theirs.fact(0), message: { ...input.message, of: (theirResult.input as { message: { of: unknown } }).message.of } })), "Result: mismatch: the history is not consistent."],
    "a whole copy of their result": [(entry: Entry) => entry.seq === ownResult.seq ? { ...entry, input: theirResult.input, uses: theirResult.uses } as Entry : entry, "Result: mismatch: the history is not consistent."],
  };
  for (const [name, [change, words, retained]] of Object.entries(variants)) {
    const { ctx } = await broadContext(forged(wide, change, retained), "empty", [], "forbidden", refused, ownAt);
    const outcome = await command(ctx, ["verify", wide.R.at.scope]);
    expect(outcome.code, `${name}: ${outcome.lines.slice(0, 5).join(" | ")}`).toBe(1);
    expect(outcome.lines[0], name).toBe(words);
    expect(outcome.lines.join("\n"), name).not.toContain("on the service's word, because");
  }
});
