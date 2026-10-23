import { scopeTextChange, scopeWholeTextChange, scopeLinkedTextChange, scopeTextBody as body, scopeTextBase as base } from "./definition-corpus-data.ts";
import { env } from "cloudflare:workers";
import { evictDurableObject, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { Digest, Entry, Seed } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, isEntry, isFactRef, parseStrict, scopeIdOf, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { localRetainedPlan, timeMs } from "@generalbusiness/dap-derive";
import { grantOf, variant } from "@generalbusiness/dap-derive/testing";
import { create, httpTransport, secretSigner, signedIntent } from "@generalbusiness/dap-client";
import { TRUSTS, httpSource, verify } from "@generalbusiness/dap-replay";
import { Node, creation, later, net, rita, routed, settle } from "./net.ts";
import { reader } from "./fixtures-native.ts";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { ArchiveGenesisFields } from "../src/archive-genesis-fields.ts";
import { ArchiveDeliveryFields } from "../src/archive-delivery-fields.ts";
import { ArchiveLocalReferences } from "../src/archive-local-references.ts";
import type { SqlValue } from "../src/sqlite.ts";

/**
 * A made-up definition with one detached text (section 6.2): a note whose
 * body is held beside the intent and named in it by digest. `strike`
 * redacts it. `copy` creates a scope under the same definition, with the
 * note's body in the creation message. `share` stores a peer lane in the
 * note and tells it the body, and the peer's handler opens a note with it.
 */

const notes = variant(base, scopeTextChange(body));
const source = httpSource("https://scopes.test", { fetch: routed });

test.each(["legacy", "whole-scope"] as const)("%s: a detached text over the real route: the entry holds its digest and the scope keeps its bytes; a text that is not the one named is bad-field; a redaction removes the bytes, and replay reports them as redacted", async cohort => {
  const under = cohort === "whole-scope" ? variant(notes.declared, scopeWholeTextChange()) : notes;
  net.hold = net.deaf = null;
  const signer = secretSigner(rita.secret);
  const now = timeMs(net.clock.now)!;
  const transport = httpTransport("https://scopes.test", { fetch: routed });
  const { answer, scope } = await create(transport, await signedIntent(signer, { to: null, kind: "found" }, { now }), under.declared, [], reader);
  if (answer.answer !== "accepted" || !scope) throw new Error(`not founded: ${JSON.stringify(answer)}`);
  const at = answer.receipt.fact.at;
  const grants = [grantOf(rita, at, ["write", "strike"])];
  const [first, second, third] = ["A first body.", "A second body, edited.", "Another note."];
  const [t1, t2, t3] = [textDigest(first), textDigest(second), textDigest(third)];
  const act = async (kind: string, fields: { body?: string }, texts: string[], on: number | null = null, expected: Record<string, number> = {}) =>
    scope.submit(await signedIntent(signer, { to: at, kind, on, expected, fields }, { now }), grants, { texts });

  // The intent names the text by digest, and the text travels beside it. The entry holds the digest only.
  const wrote = await act("write", { body: t1 }, [first]);
  if (wrote.answer !== "accepted") throw new Error(`not accepted: ${JSON.stringify(wrote)}`);
  const note = wrote.receipt.fact.seq;
  const entry = await scope.entry(note);
  expect(wrote.receipt.effects).toContainEqual({ effect: "value", item: note, slot: "body", value: t1 });
  expect(JSON.stringify(entry)).not.toContain(first);
  expect(await scope.text(t1)).toMatchObject({ ok: true, value: first });

  // A mismatch is `bad-field`, and writes nothing: another text than the digest names, no text at all, a text past the field's
  // `max`, and the text itself where its digest belongs.
  const long = "x".repeat(41);
  const refusals = [await act("write", { body: t2 }, [first]), await act("write", { body: t2 }, []), await act("write", { body: textDigest(long) }, [long]), await act("write", { body: second }, [second])];
  expect(refusals.map((refused) => [refused.answer, "reason" in refused && refused.reason])).toEqual(Array(4).fill(["refused", "bad-field"]));
  expect([(await scope.summary()), await scope.text(t2)]).toMatchObject([{ ok: true, at: { seq: note } }, { ok: false, reason: "not-found" }]);

  // An edit, then the redaction: its entry is the tombstone of every text the slot has held, and the bytes of each are removed.
  expect(await act("edit", { body: t2 }, [second], note, { on: 1 })).toMatchObject({ answer: "accepted" });
  const struck = await act("strike", {}, [], note, { on: 2 });
  if (struck.answer !== "accepted") throw new Error(`not accepted: ${JSON.stringify(struck)}`);
  expect(struck.receipt.effects).toEqual([{ effect: "state", item: note, state: "struck" }, { effect: "redact", item: note, slot: "body", texts: [t1, t2] }]);
  expect([await scope.text(t1), await scope.text(t2)]).toEqual([{ ok: false, reason: "not-found" }, { ok: false, reason: "not-found" }]);
  // The struck note keeps its digest.
  expect(await scope.items("note")).toMatchObject({ ok: true, value: [{ id: note, state: "struck", values: { body: t2 } }] });

  // Replay derives every entry again. The two texts are not missing: they are reported as redacted, with the tombstone.
  expect(await act("write", { body: t3 }, [third])).toMatchObject({ answer: "accepted" });
  const replayed = async () => verify(source, { mode: "replay", scope: at.scope, grants: "as-recorded" });
  if (cohort === "whole-scope") await evictDurableObject(env.NET.get(env.NET.idFromName(at.scope)));
  const { report, why } = await replayed();
  expect([report.result, why, report.redacted]).toEqual([cohort === "whole-scope" ? "incomplete" : "consistent", cohort === "whole-scope" ? "redacted size not retained" : null, [{ tombstone: struck.receipt.fact, item: note, slot: "body" }]]);
  expect(report.incompleteBytes).toEqual(cohort === "whole-scope" ? [{ scope: at, from: note, through: note + 1, reason: "redacted size not retained" }] : undefined);
  expect(report.trusts).toContain(TRUSTS.redacted);
  // The bytes of a text that no entry redacts are a retained input. With other bytes under its digest, or with none, the replay
  // claims nothing.
  const kept = (query: string, ...bindings: string[]) => runInDurableObject(env.NET.get(env.NET.idFromName(at.scope)), (_instance, state) => state.storage.sql.exec(query, ...bindings).toArray());
  await kept("UPDATE retained_input SET bytes = ? WHERE kind = 'text' AND digest = ?", JSON.stringify(first), t3);
  const altered = (await replayed()).report;
  await kept("DELETE FROM retained_input WHERE kind = 'text' AND digest = ?", t3);
  expect([altered, (await replayed()).report]).toMatchObject(Array(2).fill({ result: "incomplete", at: { seq: note + 3 } }));
});

test("a detached text in a creation message: the child reads the bytes from its creator and keeps them; when the creator has redacted the text first, the creation is not decided", async () => {
  net.hold = net.deaf = null;
  const rootBody = "A root body.", rootDigest = textDigest(rootBody);
  const { signed, name } = creation(notes, { body: rootDigest });
  const P = new Node(name, notes.declared);
  expect(await P.stub.create(signed, notes.declared, [], { texts: [rootBody] })).toMatchObject({ answer: "accepted" });
  // Both founding and delivered creation use the actual native genesis.
  // Only this test oracle reads the body; the projector returns scalars.
  const projectedBirth = async (node: Node, route: string, digest: Digest) => {
    const result = await runInDurableObject(node.object, (_instance, state) => {
      const row = state.storage.sql.exec<{ bytes: string; hash: Digest; size: number }>("SELECT bytes, hash, size FROM entry WHERE seq = 0 LIMIT 1").one();
      const entry = parseStrict(row.bytes); if (!isEntry(entry)) return expect.fail("The native genesis is required.");
      const expected = localRetainedPlan(notes, entry, row.hash, null, PROPOSED_BOUNDS).dependencies.filter(({ dependency }) => dependency.mode === "text");
      const cells: unknown[] = [], budget = new ArchiveBudget(), sql = { exec(query: string, ...args: SqlValue[]) {
        const rows = state.storage.sql.exec(query, ...args).toArray();
        for (const held of rows) cells.push(...Object.values(held));
        return { toArray: () => rows };
      } };
      const projector = new ArchiveGenesisFields(notes, budget, PROPOSED_BOUNDS), position = { seq: 0, hash: row.hash, bytes: row.size };
      const projected = projector.project(sql, entry.at, position), before = budget.admitted();
      const repeated = projector.project(sql, entry.at, position), after = budget.admitted();
      // Separate lower-bound refusal scenario, not a reset or continuation
      // of the positive projection budget. There is room for the old SQL
      // debits but not for the derived path/map allocation.
      const tight = new ArchiveBudget({ metadata: PROPOSED_BOUNDS.definitionBytes + 256 + 512 });
      const limited = new ArchiveGenesisFields(notes, tight, PROPOSED_BOUNDS);
      expect(() => limited.project(sql, entry.at, position)).toThrow("archive-limit");
      return { projected, expected, repeated, before, after, cells, tight: tight.admitted() };
    });
    expect(result.projected).toEqual(result.expected);
    expect(result.projected.map(plan => plan.dependency.mode === "text" ? plan.dependency.key : null)).toEqual([{ kind: "text", digest }]);
    expect(result.repeated).toEqual(result.projected);
    expect(result.after.calls).toBeGreaterThan(result.before.calls);
    expect(result.after.inputWork).toBeGreaterThan(result.before.inputWork);
    expect(result.tight.calls).toBe(1); // Fixed route only; no field query after allocation refusal.
    expect(new Set(result.cells.filter(cell => typeof cell === "string"))).toEqual(new Set([route, digest]));
  };
  await projectedBirth(P, "founding", rootDigest);
  const write = async (text: string) => {
    const answer = await P.stub.submit(await P.intent(rita, "write", { fields: { body: textDigest(text) } }), await P.grants(), { texts: [text] });
    if (answer.answer !== "accepted") throw new Error(`not accepted: ${JSON.stringify(answer)}`);
    return answer.receipt.fact.seq;
  };
  const child = async (seq: number) => new Node(scopeIdOf((await P.entries())[seq]!.sends[0]!.to as Seed), notes.declared);
  const genesis = (entries: readonly Entry[]) => entries[0]?.input;

  // The message carries the digest, and the child reads the text from P before its genesis turn. While P serves other bytes than
  // the digest names, the child records nothing.
  const shared = "A body that is copied.";
  const a = await write(shared);
  const serves = (text: string) => runInDurableObject(P.object, (_instance, state) => state.storage.sql.exec("UPDATE retained_input SET bytes = ? WHERE kind = 'text' AND digest = ?", JSON.stringify(text), textDigest(shared)).toArray());
  net.hold = () => true;
  const copied = await P.did(rita, "copy", { on: a, expected: { on: 1 } });
  const K = await child(copied.fact.seq);
  await serves("Another body.");
  net.hold = null;
  await later(1, P);
  expect(await K.stub.summary(reader)).toMatchObject({ ok: false });
  // With the bytes that the digest names, the child writes its genesis, and retains the text under that digest.
  await serves(shared);
  await later(2, P, K);
  expect(genesis(await K.entries())).toMatchObject({ type: "genesis", decision: "applied", message: { body: { fields: { body: textDigest(shared) } } } });
  await projectedBirth(K, "creation", textDigest(shared));
  expect(await (K.stub as unknown as { retained(reader: unknown, kind: string, digest: Digest): Promise<unknown> }).retained(reader, "text", textDigest(shared))).toMatchObject({ ok: true, value: { bytes: JSON.stringify(shared) } });
  expect((await verify(source, { mode: "replay", scope: K.name, grants: "as-recorded" })).report).toMatchObject({ result: "consistent", redacted: [] });
  // P answers for a text only to the receiver of a send that names it: the entry that wrote the note sent nothing.
  const asks = P.stub as unknown as { text(seq: number, digest: Digest): Promise<string | null> };
  expect([await asks.text(copied.fact.seq, textDigest(shared)), await asks.text(a, textDigest(shared))]).toEqual([JSON.stringify(shared), null]);

  // The send is held, and P redacts the text before it is delivered. The child cannot read the bytes, so it records nothing, and
  // P keeps the task. What ends such a task is not decided by the contract.
  const b = await write("A body that is struck first.");
  net.hold = () => true;
  const late = await P.did(rita, "copy", { on: b, expected: { on: 1 } });
  await P.did(rita, "strike", { on: b, expected: { on: 1 } });
  net.hold = null;
  await later(1, P);
  const L = await child(late.fact.seq);
  expect(await L.stub.summary(reader)).toMatchObject({ ok: false });
  const outboxId = (await P.outboxItems()).find((d) => d.outboxId === `${late.fact.seq}.0`)!;
  expect([outboxId.result, outboxId.diagnosis, outboxId.acknowledged, outboxId.attempts.at(-1)?.answer]).toEqual([null, null, null, "retry"]);
});

test("a repeat of a decided send is answered from the entry that recorded it, and writes nothing, after both scopes have redacted the text that the message carries", async () => {
  net.hold = net.deaf = null;
  const { signed, name } = creation(notes, {});
  const P = new Node(name, notes.declared);
  expect(await P.stub.create(signed, notes.declared)).toMatchObject({ answer: "accepted" });
  const text = "A body that is told.";
  const wrote = await P.stub.submit(await P.intent(rita, "write", { fields: { body: textDigest(text) } }), await P.grants(), { texts: [text] });
  if (wrote.answer !== "accepted") throw new Error(`not accepted: ${JSON.stringify(wrote)}`);
  // Two lanes, each with the note of its genesis. A stores B as the note's peer and tells it the body: B reads the text from A,
  // and its handler opens a note with it.
  const lane = async () => {
    const copied = await P.did(rita, "copy", { on: wrote.receipt.fact.seq, expected: { on: 1 } });
    return new Node(scopeIdOf((await P.entries())[copied.fact.seq]!.sends[0]!.to as Seed), notes.declared);
  };
  const [A, B] = [await lane(), await lane()];
  await settle(P, A, B);
  const shared = await A.did(rita, "share", { on: 0, expected: { on: 1 }, fields: { peer: await B.at() } });
  await settle(A, B);
  const told = (await B.sealed()).at(-1)!;
  expect(told.entry).toMatchObject({ input: { type: "delivery", from: shared.fact, decision: "applied" }, effects: [{ effect: "open" }, { effect: "value", slot: "body", value: textDigest(text) }] });
  // The actual retained source pins notes. A matching name and sender kind
  // alone cannot give a differently pinned sender's fields this meaning.
  const projected = await runInDurableObject(B.object, (_instance, state) => {
    const row = state.storage.sql.exec<{ size: number }>("SELECT size FROM entry WHERE seq = ? LIMIT 1", told.entry.seq).one();
    const all = localRetainedPlan(notes, told.entry, told.hash, null, PROPOSED_BOUNDS, "notes").dependencies;
    const expected = all.filter(({ dependency }) => dependency.mode === "text");
    const cells: unknown[] = [], budget = new ArchiveBudget(), sql = { exec(query: string, ...args: SqlValue[]) {
      const rows = state.storage.sql.exec(query, ...args).toArray();
      for (const held of rows) cells.push(...Object.values(held));
      return { toArray: () => rows };
    } };
    const projector = new ArchiveDeliveryFields(notes, budget, PROPOSED_BOUNDS), position = { seq: told.entry.seq, hash: told.hash, bytes: row.size };
    const correct = projector.project(sql, told.entry.at, position, shared.fact, "notes"), before = budget.admitted();
    const repeated = projector.project(sql, told.entry.at, position, shared.fact, "notes"), after = budget.admitted();
    const other = projector.project(sql, told.entry.at, position, shared.fact, "other");
    expect(() => projector.project(sql, told.entry.at, position, shared.fact)).toThrow("unsupported-foreign-copy");
    const fieldCells = [...cells];
    const references = new ArchiveLocalReferences({ named: notes.digest, definition: notes,
      owners: new Map(), records: new Map(), preparations: new Map() }, PROPOSED_BOUNDS, budget);
    const copy = told.entry.uses.find(use => canonicalize(use.fact) === canonicalize(shared.fact));
    if (!copy) return expect.fail("The native tell's retained source is required.");
    const size = state.storage.sql.exec<{ size: number }>("SELECT octet_length(bytes) AS size FROM retained_input WHERE kind = 'entry' AND digest = ?", copy.content).one().size;
    const senders: unknown[] = [];
    // STAND-IN for the whole-prefix foreign classifier's lookup port. All
    // returned metadata comes from this real peer, its exact definition and
    // B's actual retained copy. No foreign privacy/policy proof is supplied.
    const composed = references.read(sql, told.entry.at, { ...position, input: "delivery" }, { source(from) {
      senders.push(from);
      return canonicalize(from) === canonicalize(shared.fact)
        ? { fact: shared.fact, content: copy.content, bytes: size, pin: notes.digest, under: notes.declared.name } : null;
    } });
    return { correct, repeated, other, expected, before, after, cells: fieldCells, composed, all, senders };
  });
  expect(projected.correct).toEqual(projected.expected);
  expect(projected.composed).toEqual({ dependencies: projected.all, ancestrySnapshot: null });
  expect(projected.senders).toEqual([shared.fact]);
  expect(projected.correct.map(plan => plan.dependency.mode === "text" ? plan.dependency.key : null)).toEqual([{ kind: "text", digest: textDigest(text) }]);
  expect(projected.repeated).toEqual(projected.correct); expect(projected.other).toEqual([]);
  expect(projected.after.calls).toBeGreaterThan(projected.before.calls);
  expect(projected.after.inputWork).toBeGreaterThan(projected.before.inputWork);
  expect(new Set(projected.cells.filter(cell => typeof cell === "string"))).toEqual(new Set(["request", "tell", "noted", textDigest(text)]));
  expect(projected.cells).not.toContain(text);

  // Both redact the text, so neither holds its bytes. The same envelope again is still that send of that entry of A. B answers it
  // with the fact of the entry that decided it, as it answered the first delivery, and its head does not move.
  await A.did(rita, "strike", { on: 0, expected: { on: 2 } });
  await B.did(rita, "strike", { on: told.entry.seq, expected: { on: 1 } });
  const asks = A.stub as unknown as { text(seq: number, digest: Digest): Promise<string | null> };
  const keeps = B.stub as unknown as { retained(reader: unknown, kind: string, digest: Digest): Promise<unknown> };
  const head = (await B.summary()).at;
  expect([
    await asks.text(shared.fact.seq, textDigest(text)), await keeps.retained(reader, "text", textDigest(text)),
    await B.stub.deliver(await A.envelope(shared.fact.seq)),
    (await B.summary()).at,
  ]).toMatchObject([null, { ok: false }, { answer: "recorded", fact: { at: told.entry.at, seq: told.entry.seq, hash: told.hash } }, head]);
});

test("native related-text projection follows self and earlier owner items, and ignores another owner's item", async () => {
  net.hold = net.deaf = null;
  const linked = variant(notes.declared, scopeLinkedTextChange(body));
  const seedBody = "A copied starting body.";
  const { signed, name } = creation(linked, { body: textDigest(seedBody) }), P = new Node(name, linked.declared);
  expect(await P.stub.create(signed, linked.declared, [], { texts: [seedBody] })).toMatchObject({ answer: "accepted" });
  const copied = async () => {
    const receipt = await P.did(rita, "copy", { on: 0, expected: { on: 1 } });
    return new Node(scopeIdOf((await P.entries())[receipt.fact.seq]!.sends[0]!.to as Seed), linked.declared);
  };
  const A = await copied(), B = await copied(); await settle(P, A, B);
  let opened = -1;
  for (const [index, text] of ["A related body.", "A revised related body."].entries()) {
    const answer = await A.stub.submit(await A.intent(rita, index === 0 ? "relate-body" : "revise-link", {
      ...(index === 0 ? {} : { on: opened, expected: { on: 1 } }),
      fields: { body: textDigest(text), ...(index === 0 ? { peer: await B.at() } : {}) },
    }), await A.grants(), { texts: [text] });
    expect(answer.answer, JSON.stringify(answer)).toBe("accepted"); if (answer.answer !== "accepted") return;
    if (index === 0) opened = answer.receipt.fact.seq;
    await settle(A, B);
    const sealed = (await B.sealed()).at(-1)!, input = sealed.entry.input;
    if (input.type !== "delivery" || !("decision" in input) || input.message.class !== "request" || input.message.type !== "relate") return expect.fail("The actual relationship delivery is required.");
    const messageBody = input.message.body as Record<string, unknown>, item = messageBody["item"];
    expect(index === 0 ? item : isFactRef(item)).toEqual(index === 0 ? { self: true } : true);
    const result = await runInDurableObject(B.object, (_instance, state) => {
      const row = state.storage.sql.exec<{ bytes: string; size: number }>("SELECT bytes, size FROM entry WHERE seq = ? LIMIT 1", sealed.entry.seq).one();
      const expected = localRetainedPlan(linked, sealed.entry, sealed.hash, null, PROPOSED_BOUNDS, "notes").dependencies.filter(({ dependency }) => dependency.mode === "text");
      const cells: unknown[] = [], sql = { exec(query: string, ...args: SqlValue[]) {
        const rows = state.storage.sql.exec(query, ...args).toArray();
        for (const held of rows) cells.push(...Object.values(held));
        return { toArray: () => rows };
      } };
      const projector = new ArchiveDeliveryFields(linked, new ArchiveBudget(), PROPOSED_BOUNDS);
      const position = { seq: sealed.entry.seq, hash: sealed.hash, bytes: row.size };
      const projected = projector.project(sql, sealed.entry.at, position, input.from, "notes");
      let other: unknown = null;
      if (isFactRef(item)) {
        // Negative metadata probe only: alter an opaque body item's owner,
        // not an accepted native history. Restore its exact original bytes
        // and size before returning; no integrity/export claim is made.
        const bad: Entry = { ...sealed.entry, input: { ...input, message: { ...input.message, body: { ...messageBody, item: { ...item, at: { ...item.at, scope: B.name } } } } } };
        const bytes = canonicalize(bad), size = utf8(bytes).length;
        try {
          state.storage.sql.exec("UPDATE entry SET bytes = ?, size = ? WHERE seq = ?", bytes, size, sealed.entry.seq);
          other = projector.project(sql, sealed.entry.at, { ...position, bytes: size }, input.from, "notes");
        } finally { state.storage.sql.exec("UPDATE entry SET bytes = ?, size = ? WHERE seq = ?", row.bytes, row.size, sealed.entry.seq); }
      }
      return { projected, expected, other, cells };
    });
    expect(result.projected).toEqual(result.expected);
    expect(result.projected.map(plan => plan.dependency.mode === "text" ? plan.dependency.key : null)).toEqual([{ kind: "text", digest: textDigest(text) }]);
    expect(result.other).toEqual(index === 0 ? null : []);
    expect(new Set(result.cells.filter(cell => typeof cell === "string"))).toEqual(new Set(["request", "relate", "linked", textDigest(text)]));
    expect(result.cells).not.toContain(text);
  }
});
