import { expect, test } from "vitest";
import type { Item, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, keyIdOfSecret } from "@generalbusiness/dap-bytes";
import { firstExtents } from "@generalbusiness/dap-platform";
import { identityId, meaningOf } from "../src/index.ts";
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
