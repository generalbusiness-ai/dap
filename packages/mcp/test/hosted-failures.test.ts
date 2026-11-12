import { expect, test } from "vitest";
import { agentRoleDecision } from "../src/oauth-access.ts";
import type { KeyId } from "@generalbusiness/dap-contract";
import { d, membership } from "@generalbusiness/dap-derive/testing";
import { hostedAgentIdentity, hostedRolePort, hostedRoleRead, type HostedActorRequest, type HostedActorRead, type HostedRoleRequest, type HostedRoleRead, BearerFailures, BEARER_FAILURE_KEYS } from "../src/hosted.ts";

const ip = (n: number): string => `198.18.${Math.floor(n / 256)}.${n % 256}`;

test("bearer failure capacity keeps active windows while an expired slot admits a new address", () => {
  const failures = new BearerFailures();
  for (let n = 0; n < 10; n++) expect(failures.check(ip(0), 1000, () => false)).toBe("unauthorized");
  for (let n = 1; n < BEARER_FAILURE_KEYS; n++) {
    expect(failures.check(ip(n), 1010, () => false)).toBe("unauthorized");
  }
  expect(failures.size).toBe(BEARER_FAILURE_KEYS);
  for (let n = 0; n < 3; n++) {
    expect(failures.check(ip(BEARER_FAILURE_KEYS + n), 1020, () => false), "new failures cannot evict an active window").toBe("limited");
    expect(failures.size).toBe(BEARER_FAILURE_KEYS);
    expect(failures.check(ip(0), 1020, () => expect.fail("a limited address reached bearer authentication"))).toBe("limited");
  }
  expect(failures.check(ip(BEARER_FAILURE_KEYS + 3), 1020, () => true), "capacity does not refuse an otherwise valid bearer").toBe("ok");
  expect(failures.size).toBe(BEARER_FAILURE_KEYS);

  // Only the oldest window has expired: the other addresses are still ten
  // milliseconds inside their original rolling minute.
  expect(failures.check(ip(BEARER_FAILURE_KEYS + 4), 61_000, () => false)).toBe("unauthorized");
  expect(failures.size).toBe(BEARER_FAILURE_KEYS);
  for (let n = 0; n < 9; n++) expect(failures.check(ip(1), 61_000, () => false)).toBe("unauthorized");
  expect(failures.check(ip(1), 61_000, () => expect.fail("an active address lost its earlier failure"))).toBe("limited");
  expect(failures.check(ip(0), 61_000, () => true)).toBe("ok");
});

test("bearer failures retain ten-per-minute, successful-call and UTF-8 address bounds", () => {
  const failures = new BearerFailures();
  for (let n = 0; n < 9; n++) {
    expect(failures.check(ip(1), 0, () => false)).toBe("unauthorized");
    expect(failures.check(ip(1), 0, () => true), "success does not clear earlier failures").toBe("ok");
  }
  expect(failures.check(ip(1), 0, () => false), "the tenth failure remains unauthorized").toBe("unauthorized");
  expect(failures.check(ip(1), 59_999, () => expect.fail("the minute has not expired"))).toBe("limited");
  expect(failures.check(ip(1), 60_000, () => true)).toBe("ok");

  expect(failures.check("a".repeat(64), 60_000, () => false)).toBe("unauthorized");
  expect(failures.check("é".repeat(32), 60_000, () => false), "64 UTF-8 bytes fit").toBe("unauthorized");
  const beforeOversize = failures.size;
  for (const address of ["a".repeat(65), "é".repeat(33)]) {
    expect(failures.check(address, 60_000, () => expect.fail("an overlong address reached bearer authentication"))).toBe("limited");
  }
  expect(failures.size).toBe(beforeOversize);
  const missing = new BearerFailures(), invalid = [null, "", "not-an-address", "192.0.2.999", "2001:db8:::1"];
  for (let n = 0; n < 10; n++) expect(missing.check(invalid[n % invalid.length]!, 60_000, () => false)).toBe("unauthorized");
  for (const address of invalid) expect(missing.check(address, 60_000, () => expect.fail("the existing addressless bucket was bypassed"))).toBe("limited");
});

test.each([
  ["link-local", ["fe80::1%en0", "FE80:0000:0000:0000:0000:0000:0000:0001%en9", "fe80::1"], "fe80::2%en0"],
  ["ULA", ["fd12:3456:789a::1%en0", "FD12:3456:789A:0000:0000:0000:0000:0001%en9", "fd12:3456:789a::1"], "fd12:3456:789a::2%en0"],
] as const)("bearer failures share %s aliases and zones while another local client remains independent", (_family, aliases, other) => {
  const failures = new BearerFailures();
  for (let n = 0; n < 10; n++) expect(failures.check(aliases[n % aliases.length]!, 0, () => false)).toBe("unauthorized");
  for (const address of aliases) {
    expect(failures.check(address, 0, () => expect.fail("a limited alias reached bearer authentication"))).toBe("limited");
  }
  expect(failures.check(other, 0, () => false), "a different local host has its own failure window").toBe("unauthorized");
  expect(failures.check(other, 0, () => true)).toBe("ok");
  expect(failures.size).toBe(2);
});

test.each([
  ["global IPv6 /64", "2001:db8:1234:5678::1", ["2001:db8:1234:5678::2", "2001:DB8:1234:5678:AAAA:BBBB:CCCC:DDDD%en0"], "2001:db8:1234:5679::1"],
  ["IPv4-mapped IPv6", "192.0.2.9", ["::ffff:192.0.2.9", "0000:0000:0000:0000:0000:FFFF:C000:0209"], "192.0.2.10"],
] as const)("bearer failures preserve shared %s windows before authentication", (_family, first, aliases, other) => {
  const failures = new BearerFailures();
  for (let n = 0; n < 10; n++) expect(failures.check(first, 0, () => false)).toBe("unauthorized");
  for (const address of aliases) expect(failures.check(address, 0, () => expect.fail("a limited address spelling reached bearer authentication"))).toBe("limited");
  expect(failures.check(other, 0, () => true)).toBe("ok");
  expect(failures.size).toBe(1);
});

/** Scripted RPC replies exercise the closed decoder; they prove no Native state or admission rule. */
test("hosted role facts retain inactive and missing subjects, reject malformed RPC replies, and own their copies", async () => {
  const key: KeyId = `key_${"A".repeat(43)}`;
  const request: HostedRoleRequest = { membership, agent: "@agent", agentKey: key, expectedController: "@owner", actor: null };
  const reply: Extract<HostedRoleRead, { status: "observed" }> = {
    status: "observed", of: { ...membership }, head: { seq: 3, hash: d("3") },
    agent: { member: "@agent", state: "active", role: "agent", activeKey: true, controller: "@owner", actions: ["issue.open"] },
    agentKey: { key, keyState: "active", member: "@agent", memberState: "active", controller: "@owner", actions: ["issue.open"] },
    controller: { member: "@owner", state: "active", role: "member", activeKey: false, controller: null, actions: ["issue.open"] },
    actor: null,
  };
  const identity = { agent: "TEST agent", op: "TEST op", state: "enrolled", membership, key, handle: "@agent" };
  const observedIdentity = { status: "observed", identity };
  const decodedIdentity = hostedAgentIdentity("TEST agent", observedIdentity);
  expect(decodedIdentity).toEqual(observedIdentity);
  if (decodedIdentity.status !== "observed") return expect.fail("valid Agent identity was unavailable");
  expect(decodedIdentity.identity.membership).not.toBe(identity.membership);
  expect(hostedAgentIdentity("TEST agent", { status: "absent", agent: "TEST agent" })).toEqual({ status: "absent", agent: "TEST agent" });
  expect(hostedAgentIdentity("TEST agent", { status: "unavailable" })).toEqual({ status: "unavailable" });
  for (const malformed of [null, { status: "observed", identity, agent: "TEST agent" }, { status: "absent", agent: "wrong target" }, { status: "absent", agent: "TEST agent", identity },
    ...[{ ...identity, configuration: "PRIVATE" }, { ...identity, seed: "PRIVATE" }, { ...identity, bearer: "PRIVATE" },
      { ...identity, agent: "wrong target" }, { ...identity, state: "unknown" }, { ...identity, key: null },
      { ...identity, op: "x".repeat(129) }, { ...identity, membership: { ...membership, kind: "lane" } },
    ].map(identity => ({ status: "observed", identity })),
  ]) expect(hostedAgentIdentity("TEST agent", malformed)).toEqual({ status: "unavailable" });
  const decoded = hostedRoleRead(request, reply);
  expect(decoded).toEqual(reply);
  if (decoded.status !== "observed") return expect.fail("valid facts were unavailable");
  expect(decoded.controller?.activeKey).toBe(false); // An active controller need not hold an active key.
  expect(agentRoleDecision(request, decoded)).toEqual({ status: "active" });
  const widerActions = ["issue.open", "change.check"];
  expect(agentRoleDecision(request, { ...decoded,
    agent: { ...decoded.agent, actions: widerActions }, agentKey: { ...reply.agentKey!, actions: widerActions },
  })).toEqual({ status: "inactive", reason: "role-subset" });
  expect(agentRoleDecision(request, { ...decoded, agentKey: null })).toEqual({ status: "inactive", reason: "agent-inactive" });
  expect(agentRoleDecision({ ...request, agentKey: null }, { ...decoded, agentKey: null })).toEqual({ status: "active" });
  expect(agentRoleDecision({ ...request, expectedController: "@another" }, decoded)).toEqual({ status: "inactive", reason: "controller-changed" });
  for (const [copy, original] of [[decoded.of, reply.of], [decoded.head, reply.head], [decoded.agent, reply.agent],
    [decoded.agent.actions, reply.agent.actions], [decoded.agentKey?.actions, reply.agentKey?.actions],
    [decoded.controller?.actions, reply.controller?.actions]]) expect(copy).not.toBe(original);
  expect(hostedRoleRead(request, { ...reply, agentKey: null })).toMatchObject({ status: "observed", agentKey: null });
  expect(hostedRoleRead({ ...request, agentKey: null }, { ...reply, agentKey: null })).toMatchObject({ status: "observed", agentKey: null });
  expect(hostedRoleRead(request, { ...reply, controller: { ...reply.controller, state: "removed" } })).toMatchObject({ status: "observed", controller: { state: "removed" } });
  const absent = { ...reply, agent: { member: "@agent", state: "unknown", role: null, activeKey: null, controller: null, actions: [] }, agentKey: null, controller: null };
  expect(hostedRoleRead(request, absent)).toMatchObject({ status: "observed", agent: { state: "unknown" } });
  const unavailable = { status: "unavailable" };
  for (const malformed of [null, { ...reply, authorized: true }, { ...reply, of: { ...membership, kind: "lane" } },
    { ...reply, head: { ...reply.head, seq: -1 } }, { ...reply, controller: null },
    { ...reply, agent: { ...reply.agent, role: "future-role" } },
    { ...reply, agent: { ...reply.agent, actions: ["issue.open", "issue.open"] } },
    { ...reply, agent: { ...reply.agent, actions: ["x".repeat(65)] } },
    { ...reply, agentKey: { ...reply.agentKey, keyState: "unknown" } },
    { ...reply, actor: reply.agentKey },
    { ...absent, agent: { ...absent.agent, activeKey: false } },
    { ...reply, agent: { ...reply.agent, member: "@other" } },
  ]) expect(hostedRoleRead(request, malformed)).toEqual(unavailable);
  expect(hostedRoleRead({ ...request, agentKey: null }, reply)).toEqual(unavailable);

  const actorRequest: HostedActorRequest = { membership, actor: key };
  const actorReply: Extract<HostedActorRead, { status: "observed" }> = {
    status: "observed", of: { ...membership }, head: { ...reply.head }, actor: { ...reply.agentKey!, actions: [...reply.agentKey!.actions] },
  };
  const actorRead = hostedRoleRead(actorRequest, actorReply);
  expect(actorRead).toEqual(actorReply);
  if (actorRead.status !== "observed" || actorRead.actor === null) return expect.fail("valid actor facts were unavailable");
  for (const [copy, original] of [[actorRead.of, actorReply.of], [actorRead.head, actorReply.head],
    [actorRead.actor, actorReply.actor], [actorRead.actor.actions, actorReply.actor!.actions]]) expect(copy).not.toBe(original);
  expect(Object.keys(actorRead).sort()).toEqual(["actor", "head", "of", "status"]);
  expect(hostedRoleRead(actorRequest, { ...actorReply, actor: null })).toEqual({ ...actorReply, actor: null });
  expect(hostedRoleRead(actorRequest, { ...actorReply, actor: { ...actorReply.actor!, keyState: "retired" } }))
    .toEqual({ ...actorReply, actor: { ...actorReply.actor!, keyState: "retired" } });
  for (const malformed of [null, reply, { ...actorReply, authorized: true }, { ...actorReply, roster: [] },
    { ...actorReply, of: { ...membership, kind: "lane" } }, { ...actorReply, head: { ...reply.head, seq: -1 } },
    { ...actorReply, actor: { ...actorReply.actor!, key: `key_${"B".repeat(43)}` } },
    { ...actorReply, actor: { ...actorReply.actor!, keyState: "unknown" } },
    { ...actorReply, actor: { ...actorReply.actor!, actions: ["issue.open", "issue.open"] } },
    { ...actorReply, actor: { ...actorReply.actor!, actions: Array.from({ length: 65 }, (_, i) => `action.${i}`) } },
    { ...actorReply, actor: { ...actorReply.actor!, actions: ["x".repeat(65)] } },
  ]) expect(hostedRoleRead(actorRequest, malformed)).toEqual(unavailable);
  expect(hostedRoleRead(request, actorReply)).toEqual(unavailable);
  let producerCalls = 0;
  const port = hostedRolePort(async asked => { producerCalls++; return "agent" in asked ? reply : actorReply; });
  const oldRead: HostedRoleRead = await port(request), onlyActor: HostedActorRead = await port(actorRequest);
  expect(oldRead).toEqual(reply);
  expect(onlyActor).toEqual(actorReply);
  expect(producerCalls).toBe(2);
});
