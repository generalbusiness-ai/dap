/** U1, red (c): the host's APPLICATION_TRUST decides an in-place upgrade. Real Native judges of the `upgrade` family
 * in memory, the real application outside port with its trust list, real package signatures and local R2. The Git
 * object source is an in-memory fixture; no driver, Worker route or restart runs here. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { UPGRADE_COHORT as C } from "@generalbusiness/dap-platform";
import { counter, room, slots } from "../../platform/test/support-upgrade.ts";
import { applicationOutside } from "../src/applications/outside.ts";
import { ApplicationContentStore } from "../src/applications/content.ts";
import type { EffectRequest } from "../src/operations.ts";
import { applicationResolverFixture } from "./fixtures-native.ts";

test("red (c): the host refuses a release outside APPLICATION_TRUST and the item stays unchanged; a trusted release moves it in place", async () => {
  const { A, N, upgrade, outcome, first } = await room();
  const next = await counter("2", { page: "TkVYVA" });
  const trusted = await applicationResolverFixture("sha1", undefined, {}, undefined, first.packet), offered = await applicationResolverFixture("sha1", undefined, {}, undefined, next.packet);
  const fetchOf = (): EffectRequest => ({ scope: A.at, owner: C.rules, kind: "fetch-application", operation: `${A.head.seq}:0`, attempt: 1, origin: A.entries[A.head.seq]! });
  const host = (trust: typeof trusted.trust) => applicationOutside({ trust, bounds: PROPOSED_BOUNDS, store: new ApplicationContentStore(env.APPLICATION_CONTENT, trust, PROPOSED_BOUNDS), open: offered.open });
  try {
    // The trust list names Counter 1 only. The host refuses Counter 2 before it opens any source.
    expect(upgrade(next, { ...next.source, uri: offered.uri }).result).toBe("write");
    const before = slots(A.item(N)), refusedFetch = fetchOf();
    const refused = await host(trusted.trust).send(refusedFetch);
    expect(refused).toMatchObject({ result: "refused", evidence: { basis: "read", body: { uri: offered.uri, release: next.packet.ids.release, reason: "untrusted-release" } } });
    expect(offered.opened).toEqual([]);
    A.take(outcome(refusedFetch.operation, "refused", refused!.evidence.body));
    expect(slots(A.item(N))).toEqual(before);

    // Control: with Counter 2 in the trust list, the same host confirms it and the item moves in place.
    expect(upgrade(next, { ...next.source, uri: offered.uri }).result).toBe("write");
    const confirmedFetch = fetchOf();
    const confirmed = await host([...trusted.trust, ...offered.trust]).send(confirmedFetch);
    expect(confirmed).toMatchObject({ result: "confirmed" });
    A.take(outcome(confirmedFetch.operation, "confirmed", confirmed!.evidence.body));
    expect(slots(A.item(N))).toEqual({ ...before, uri: offered.uri, release: next.packet.ids.release, presentation: next.packet.ids.presentation });
  } finally { await env.APPLICATION_CONTENT.delete(offered.key); }
});
