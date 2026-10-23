/** Real membership, HTTP routes and authenticated sessions in PLATFORM.
 * The shared fixture's Git host/scheduler remain their labelled stand-ins. */
import { expect, test } from "vitest";
import type { MemberRef } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { readMembershipDisplay } from "../src/views/member-reads.ts";
import { mcpRoom } from "./support/room.ts";
import { created, step } from "./support/story.ts";
import { reader } from "../../scope/test/support.ts";

// Invariant: bounded display reads preserve actual final member states and
// controller facts, while a foreign incarnation or unjoined key reads none.
test("native member display reads include removed agents and refuse foreign or unjoined session context", async () => {
  const room = mcpRoom();
  try {
    const rita = room.agent("rita", { mode: "generic" });
    await created(room, rita, "generic");
    const membership = rita.config.repository!.membership;
    const controller: MemberRef = { membership, member: "@rita" };
    const added = await step(rita, "generic", { tool: "member.add", scope: "membership", kind: "add-member" }, {
      fields: { handle: "@probe-agent", kind: "agent", controller }, idempotencyKey: "member-display-agent",
    });
    expect(added["answer"]).toBe("accepted");
    const on = (added["fact"] as { seq: number }).seq;
    const signed = rita.signedIntents.length, requests = rita.requests.length;
    const active = await readMembershipDisplay(rita.service.reads, membership);
    expect(active?.scope).toEqual(membership);
    const agent = active?.members.find(item => item.id === on);
    expect(agent).toMatchObject({ type: "member", state: "active", values: { handle: "@probe-agent", kind: "agent" }, parties: { controller } });
    expect(active?.roster).toBeDefined();
    // Each bounded read names its own native head; background deliveries may
    // advance the membership between them. Neither head may be relabelled.
    expect(active!.roster!.at.seq).toBeGreaterThanOrEqual(active!.at.seq);
    for (const at of [active!.at, active!.roster!.at]) {
      const entry = await room.platform(membership.scope).stub.entry(reader, at.seq);
      expect(entry.ok && entry.value.hash).toBe(at.hash);
    }
    expect(rita.requests.slice(requests).filter(request => request.startsWith("GET "))).toHaveLength(2);
    expect(rita.signedIntents).toHaveLength(signed);
    const removed = await step(rita, "generic", { tool: "member.remove", scope: "membership", kind: "remove-member" }, {
      on, idempotencyKey: "member-display-remove",
    });
    expect(removed["answer"]).toBe("accepted");
    const final = await readMembershipDisplay(rita.service.reads, membership);
    expect(final?.members.find(item => item.id === on)).toMatchObject({ state: "removed", parties: { controller } });
    expect(final?.at.seq).toBeGreaterThan(active!.at.seq);
    const foreign = { ...membership, inc: `in_${"b".repeat(25)}a` as const };
    const beforeForeign = rita.requests.length;
    expect(canonicalize(foreign)).not.toBe(canonicalize(membership));
    expect(await readMembershipDisplay(rita.service.reads, foreign)).toBeNull();
    expect(rita.requests).toHaveLength(beforeForeign);
    const stranger = room.agent("unjoined", { mode: "generic" });
    expect(await readMembershipDisplay(stranger.service.reads, membership)).toBeNull();
    expect(stranger.signedIntents).toEqual([]);
    expect(stranger.requests.some(request => request.startsWith("GET "))).toBe(false);
  } finally { room.done(); }
});
