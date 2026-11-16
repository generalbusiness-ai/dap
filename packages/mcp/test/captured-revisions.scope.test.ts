import { expect, test } from "vitest";
import type { Item, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, keyIdOfSecret } from "@generalbusiness/dap-bytes";
import { firstExtents } from "@generalbusiness/dap-platform";
import { identityId, meaningOf } from "@generalbusiness/dap-client";
import { mcpRoom, SERVICE, created } from "./fixtures-native.ts";

// Invariant: a revision captured before another act moves the item is signed unchanged and refused by the real scope;
// fresh captured revisions succeed, and custody re-reports each exact envelope without another signature or submission.
// Scope, rules, custody and MCP are real. The room helper labels its Git host, scheduler and clock stand-ins.
test("captured revisions survive signing, native refusal, movement and custody re-report", async () => {
  const room = mcpRoom();
  try {
    const rita = room.agent("rita", { mode: "add" });
    await created(room, rita);
    const fields = { approvals: 0, ownerMayReview: false, checks: [], labels: [], extents: firstExtents({ approvals: 0, checks: [] }) };
    const read = () => rita.ok("inspect", { scope: "rules" });
    const revision = (read: Record<string, unknown>) => (read["items"] as Item[]).find((item) => item.id === 0)!.revision;
    const displayed = await read();
    const at = { on: revision(displayed) };
    const ref = displayed["ref"] as ScopeRef;
    const record = async (key: string) => {
      const id = identityId({ service: SERVICE, membership: rita.config.repository!.membership, signer: keyIdOfSecret(rita.secret), target: ref, key });
      const kept = await rita.service.custody.store.read(id);
      expect(kept, key).not.toBeNull();
      return kept!;
    };

    // No `at`: keep the previous custody meaning bytes and use the revision read by the service.
    const moved = await rita.ok("rules.publish", { on: 0, fields, idempotencyKey: "move" });
    expect(moved["answer"]).toBe("accepted");
    const legacy = await record("move");
    expect(legacy.envelope.signed.intent.expected).toEqual(at);
    expect(legacy.meaning).toBe(meaningOf({ kind: "publish", on: 0, fields, texts: [], values: [], presented: {} }));

    const beforeMalformed = rita.signedIntents.length;
    for (const [i, malformed] of [null, [], { on: -1 }, { on: "1" }, { on: Number.MAX_SAFE_INTEGER + 1 }, {}, { on: at.on, extra: 0 }].entries()) {
      const result = await rita.call("rules.publish", { on: 0, fields, at: malformed, idempotencyKey: `malformed-${i}` });
      expect(result.isError).toBe(true);
      expect(result.structuredContent["error"]).toBe("shape");
      expect(result.structuredContent["message"]).toMatch(/field at(?:\.| )/);
    }
    expect(rita.signedIntents.length).toBe(beforeMalformed);

    const staleArgs = { on: 0, fields, at, idempotencyKey: "stale" };
    const stale = await rita.ok("rules.publish", staleArgs);
    expect([stale["answer"], stale["reason"]]).toEqual(["refused", "revision-moved"]);
    const staleRecord = await record("stale");
    expect(staleRecord.envelope.signed.intent.expected).toEqual(at);
    expect(rita.signedIntents.at(-1)!.expected).toEqual(at);
    expect(revision(await read())).toBeGreaterThan(at.on);

    // The generic tool exposes the same input and signs a genuinely fresh captured revision.
    const freshAt = { on: revision(await read()) };
    const actions = await rita.ok("actions", { scope: "rules" });
    const freshArgs = { target: "rules", kind: "publish", digest: actions["digest"], on: 0, fields, at: freshAt, idempotencyKey: "fresh" };
    const fresh = await rita.ok("act", freshArgs);
    expect(fresh["answer"]).toBe("accepted");
    const freshRecord = await record("fresh");
    expect(freshRecord.envelope.signed.intent.expected).toEqual(freshAt);
    expect(revision(await read())).toBeGreaterThan(freshAt.on);

    const signatures = rita.signedIntents.length;
    const submissions = () => rita.requests.filter((path) => path.startsWith("POST ") && path.endsWith(`/${ref.scope}/acts`)).length;
    const sent = submissions();
    expect(sent).toBeGreaterThan(0);
    expect((await rita.ok("rules.publish", staleArgs))["reason"]).toBe("revision-moved");
    expect((await rita.ok("act", freshArgs))["answer"]).toBe("accepted");
    expect((await rita.ok("settle", { target: "rules", idempotencyKey: "fresh" }))["answer"]).toBe("accepted");
    expect(rita.signedIntents.length).toBe(signatures);
    expect(submissions()).toBe(sent);
    expect(canonicalize((await record("fresh")).envelope)).toBe(canonicalize(freshRecord.envelope));
    expect(canonicalize((await record("stale")).envelope)).toBe(canonicalize(staleRecord.envelope));

    const conflict = await rita.call("act", { ...freshArgs, at: { on: revision(await read()) } });
    expect([conflict.isError, conflict.structuredContent["error"]]).toEqual([true, "custody"]);
    expect(conflict.structuredContent["message"]).toContain("conflicting");
    expect(rita.signedIntents.length).toBe(signatures);
  } finally { await room.done(); }
});

// Invariant: every refused act result holds `now`, the basis of a fresh read. An act with `after` and that `now` is the submit of
// the returned request: it signs the passed `at` unchanged, and stops with shape before any signature when the pair is
// wrong. A bare act stays a fresh act. A subject that moved again is refused by the real scope, with a new `now`: one race
// costs one submit. Scope, rules, custody and MCP are real; the room helper labels its stand-ins.
test("a refused act result holds now, and after with now signs the passed at", async () => {
  const room = mcpRoom();
  try {
    const rita = room.agent("rita", { mode: "add" });
    await created(room, rita);
    const fields = { approvals: 0, ownerMayReview: false, checks: [], labels: [], extents: firstExtents({ approvals: 0, checks: [] }) };
    const read = () => rita.ok("inspect", { scope: "rules" });
    const revision = (read: Record<string, unknown>) => (read["items"] as Item[]).find((item) => item.id === 0)!.revision;
    const displayed = await read(), ref = displayed["ref"] as ScopeRef, old = { on: revision(displayed) };
    expect((await rita.ok("rules.publish", { on: 0, fields, idempotencyKey: "move" }))["answer"]).toBe("accepted");
    const current = revision(await read());
    expect(current).toBeGreaterThan(old.on);

    const stale = await rita.ok("rules.publish", { on: 0, fields, at: old, idempotencyKey: "stale" });
    expect([stale["answer"], stale["reason"]]).toEqual(["refused", "revision-moved"]);
    const now = stale["now"] as Record<string, unknown>;
    expect(now).toMatchObject({ of: "stale", target: ref.scope, kind: "publish", primary: { item: 0, revision: current }, at: { on: current } });
    expect(typeof (now["head"] as { seq: unknown }).seq).toBe("number");
    expect(stale["lacks"]).toBeUndefined();
    // The settle result of the kept refused request holds the same basis. Nothing is stored for it.
    const settled = await rita.ok("settle", { target: "rules", idempotencyKey: "stale" });
    expect(settled["now"]).toMatchObject({ of: "stale", primary: { item: 0, revision: current }, at: { on: current } });

    // Every shape fault stops before a signature. The pair appears together, without `at`, under a new key.
    const signatures = rita.signedIntents.length;
    const faults: [string, Record<string, unknown>][] = [
      ["now", { after: "stale" }],
      ["after", { now }],
      ["at", { after: "stale", now, at: { on: current } }],
      ["idempotencyKey", { after: "stale", now, idempotencyKey: "stale" }],
      ["now.of", { after: "stale", now: { ...now, of: "other" } }],
      ["now.kind", { after: "stale", now: { ...now, kind: "other" } }],
      ["now.target", { after: "stale", now: { ...now, target: "other" } }],
      ["now.primary", { after: "stale", now: { ...now, primary: { item: 7, revision: current } } }],
      ["now.at", { after: "stale", now: { ...now, at: { on: current, extra: 1 } } }],
      ["now.extra", { after: "stale", now: { ...now, extra: 1 } }],
      ["now.head", { after: "stale", now: { ...now, head: null } }],
      ["after", { after: "nope", now: { ...now, of: "nope" } }],
      ["after", { after: "move", now: { ...now, of: "move" } }],
    ];
    for (const [i, [field, extra]] of faults.entries()) {
      const result = await rita.call("rules.publish", { on: 0, fields, idempotencyKey: `fault-${i}`, ...extra });
      expect([i, result.isError, result.structuredContent["error"]]).toEqual([i, true, "shape"]);
      expect([i, result.structuredContent["message"]]).toEqual([i, expect.stringContaining(`field ${field} `)]);
    }
    expect(rita.signedIntents.length).toBe(signatures);

    // The submit of the returned request signs the passed `at` unchanged, under a new key.
    const again = await rita.ok("rules.publish", { on: 0, fields, idempotencyKey: "again", after: "stale", now });
    expect(again["answer"]).toBe("accepted");
    expect(rita.signedIntents.at(-1)!.expected).toEqual({ on: current });
    expect(rita.signedIntents.length).toBe(signatures + 1);

    // A row that moved again after that view: the scope refuses the passed `at`, and the result holds a new now. The generic
    // act takes the same pair. One race costs one submit.
    const actions = await rita.ok("actions", { scope: "rules" });
    const generic = { target: "rules", kind: "publish", digest: actions["digest"], on: 0, fields };
    const raced = await rita.ok("act", { ...generic, idempotencyKey: "raced", after: "stale", now });
    expect([raced["answer"], raced["reason"]]).toEqual(["refused", "revision-moved"]);
    expect(rita.signedIntents.at(-1)!.expected).toEqual({ on: current });
    const next = raced["now"] as { of: string; at: { on: number } };
    expect(next.of).toBe("raced");
    expect(next.at.on).toBe(revision(await read()));
    expect(next.at.on).toBeGreaterThan(current);
    const retried = await rita.ok("act", { ...generic, idempotencyKey: "retried", after: "raced", now: next });
    expect(retried["answer"]).toBe("accepted");
    expect(rita.signedIntents.at(-1)!.expected).toEqual({ on: next.at.on });
    expect(rita.signedIntents.length).toBe(signatures + 3);

    // A bare act stays a fresh act: it reads the current revision and holds no draft.
    const beforeBare = revision(await read());
    const bare = await rita.ok("rules.publish", { on: 0, fields, idempotencyKey: "bare" });
    expect(bare["answer"]).toBe("accepted");
    expect(rita.signedIntents.at(-1)!.expected).toEqual({ on: beforeBare });
  } finally { await room.done(); }
});
