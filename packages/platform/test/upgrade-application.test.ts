/** U1: `upgrade-application` under Rules 16 of the `upgrade` family, in memory. Real Native judges for Register 29,
 * Directory 28, Membership 14, Rules 16 and Destination 21, and for the Counter root. Host answers are labelled
 * fixtures, as in base-family.test.ts: no storage, network, driver or trust list runs here. The host's refusal of a
 * release outside APPLICATION_TRUST is shown in packages/scope/test/upgrade-application-host.test.ts. */
import { expect, test } from "vitest";
import { UPGRADE_COHORT as C, DIRECTORY_OF, SIBLINGS_OF, platform } from "../src/index.ts";
import { installGraph } from "./support-application-install.ts";
import { counter, room, slots } from "./support-upgrade.ts";

test("Register 29 creates Directory 28, and Directory 28 creates Rules 16 beside Membership 14 and Destination 21", () => {
  expect(DIRECTORY_OF[C.register]).toBe(C.directory);
  expect(SIBLINGS_OF[C.directory]).toEqual({ membership: C.membership, rules: C.rules, destination: C.destination });
  const { R, D, M, A, G } = installGraph(C, undefined, "artifacts");
  expect([R.named, D.named, M.named, A.named, G.named]).toEqual([C.register, C.directory, C.membership, C.rules, C.destination]);
  expect(Object.hasOwn(platform(C.rules)!.data.acts, "upgrade-application")).toBe(true);
});

test("an in-place upgrade changes only uri, release and presentation, and only at the host's confirmed fetch answer", async () => {
  const { A, N, upgrade, first } = await room();
  const next = await counter("2", { page: "TkVYVA" });
  expect(next.packet.ids.semantic).toBe(first.packet.ids.semantic);
  const before = slots(A.item(N));
  expect(upgrade(next, next.source).result).toBe("write");
  const act = A.head.seq;
  expect(A.state.item(act)).toBeNull();
  expect(slots(A.item(N))).toEqual(before);
  A.outcome(`${act}:0`, next.answer);
  expect(slots(A.item(N))).toEqual({ ...before, uri: next.source.uri, release: next.packet.ids.release, presentation: next.packet.ids.presentation });
  expect(A.replay().snapshot()).toEqual(A.state.snapshot());
});

test("red (a): a changed semantic identifier never upgrades in place; the act opens a pending successor that replaces N", async () => {
  const { A, N, upgrade, first } = await room();
  const changed = await counter("2", { member: ["counting.fulfill", "counting.participate"] });
  expect(changed.packet.ids.semantic).not.toBe(first.packet.ids.semantic);
  const before = slots(A.item(N));
  // The in-place shape of the changed release refuses, so a semantic change never moves N.
  expect(upgrade(changed, changed.source)).toMatchObject({ result: "refused", name: "invalid-application-package" });
  expect(slots(A.item(N))).toEqual(before);
  expect(upgrade(changed, changed.install).result).toBe("write");
  const successor = A.head.seq;
  expect(A.item(successor)).toMatchObject({ type: "installation", state: "pending", refs: { replaces: N }, values: { release: changed.packet.ids.release, semantic: changed.packet.ids.semantic } });
  // The successor's fetch answer advances the successor, never N.
  A.outcome(`${successor}:0`, changed.answer);
  expect(slots(A.item(N))).toEqual(before);
  expect(A.item(N).values["release"]).toBe(first.packet.ids.release);
});

test("red (b): a changed publisher refuses in both forms", async () => {
  const { A, N, upgrade, first } = await room();
  const inPlace = await counter("2", { page: "TkVYVA", key: 65 }), replace = await counter("3", { member: ["counting.fulfill", "counting.participate"], key: 65 });
  expect(inPlace.packet.ids.semantic).toBe(first.packet.ids.semantic);
  expect(replace.packet.ids.semantic).not.toBe(first.packet.ids.semantic);
  for (const [release, fields] of [[inPlace, inPlace.source], [replace, replace.install]] as const) {
    const judged = upgrade(release, fields);
    expect(judged, release.packet.ids.release).toMatchObject({ result: "refused", name: "application-publisher-changed" });
  }
  expect(A.item(N).values["release"]).toBe(first.packet.ids.release);
});

test("red (d): after a replace completes, at most one of N and its successor is active at every entry, and exactly one", async () => {
  const { A, N, upgrade, complete } = await room();
  const changed = await counter("2", { member: ["counting.fulfill", "counting.participate"] });
  const before = A.entries.length;
  expect(upgrade(changed, changed.install).result).toBe("write");
  const successor = A.head.seq;
  // A second upgrade of N waits for the pending successor.
  expect(upgrade(changed, changed.install)).toMatchObject({ result: "refused", name: "application-upgrade-pending" });
  const made = complete(successor, changed);
  expect([A.item(N).state, A.item(successor).state]).toEqual(["replaced", "active"]);
  for (let count = before; count <= A.entries.length; count++) {
    const state = A.replay(count), active = [N, successor].filter(id => state.item(id)?.state === "active");
    expect(active, `after entry ${count - 1}`).toEqual(count - 1 < made ? [N] : [successor]);
  }
});

test("a refused successor leaves N active", async () => {
  const { A, N, upgrade, outcome } = await room();
  const changed = await counter("2", { member: ["counting.fulfill", "counting.participate"] });
  expect(upgrade(changed, changed.install).result).toBe("write");
  const successor = A.head.seq;
  A.take(outcome(`${successor}:0`, "refused", { uri: changed.source.uri, release: changed.packet.ids.release, reason: "untrusted-release" }));
  expect([A.item(N).state, A.item(successor).state]).toEqual(["active", "refused"]);
});

test("red (e): an open in-place fetch of N refuses a second upgrade of N in both forms until its outcome, confirmed or refused", async () => {
  const { A, N, upgrade, outcome, first } = await room();
  const two = await counter("2", { page: "TkVYVA" }), three = await counter("3", { page: "VEhSRUU" });
  const changed = await counter("4", { member: ["counting.fulfill", "counting.participate"] });
  expect(three.packet.ids.semantic).toBe(first.packet.ids.semantic);
  // A refused outcome releases N.
  expect(upgrade(two, two.source).result).toBe("write");
  const refusedAct = A.head.seq;
  expect(A.item(N).refs["upgradeAt"]).toBe(refusedAct);
  expect(upgrade(three, three.source)).toMatchObject({ result: "refused", name: "application-upgrade-pending" });
  expect(upgrade(changed, changed.install)).toMatchObject({ result: "refused", name: "application-upgrade-pending" });
  A.take(outcome(`${refusedAct}:0`, "refused", { uri: two.source.uri, release: two.packet.ids.release, reason: "untrusted-release" }));
  expect(A.item(N).values["release"]).toBe(first.packet.ids.release);
  // A confirmed outcome releases N.
  expect(upgrade(two, two.source).result).toBe("write");
  const confirmedAct = A.head.seq;
  expect(upgrade(three, three.source)).toMatchObject({ result: "refused", name: "application-upgrade-pending" });
  expect(upgrade(changed, changed.install)).toMatchObject({ result: "refused", name: "application-upgrade-pending" });
  A.outcome(`${confirmedAct}:0`, two.answer);
  expect(A.item(N).values["release"]).toBe(two.packet.ids.release);
  expect(upgrade(three, three.source).result).toBe("write");
  expect(A.item(N).refs["upgradeAt"]).toBe(A.head.seq);
  expect(A.replay().snapshot()).toEqual(A.state.snapshot());
});
