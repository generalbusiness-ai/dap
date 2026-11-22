import { strict as assert } from "node:assert";
import { test } from "node:test";
import { attemptInvitation, clearInvitationFragment, invitationFragment } from "./invitation-fragment.ts";

test("the used fragment alone is removed", () => {
  const seen: string[] = [], location = { hash: "#artroom-invite:TEST", pathname: "/counter", search: "?mode=one" };
  const history = { state: { current: true }, replaceState: (data: unknown, _unused: string, url?: string | URL | null) => {
    assert.deepEqual(data, { current: true }); seen.push(String(url));
  } };
  const invitation = invitationFragment(location);
  assert.equal(invitation, "artroom-invite:TEST");
  assert.deepEqual(seen, []);
  clearInvitationFragment(location, history, invitation!);
  assert.deepEqual(seen, ["/counter?mode=one"]);
  clearInvitationFragment({ ...location, hash: "#section" }, history, invitation!);
  clearInvitationFragment({ ...location, hash: "#artroom-invite:NEW" }, history, invitation!);
  assert.deepEqual(seen, ["/counter?mode=one"]);
  assert.equal(invitation, "artroom-invite:TEST"); // retained for a retry after failure
  assert.equal(invitationFragment({ hash: "#section" }), null);
});

test("an enrollment leaves the fragment until failure settles", async () => {
  const seen: string[] = [], location = { hash: "#artroom-invite:TEST", pathname: "/counter", search: "?a=1" };
  const history = { state: { held: true }, replaceState: (_data: unknown, _unused: string, url?: string | URL | null) => { seen.push(String(url)); } };
  let finish!: (result: { device?: unknown }) => void;
  const pending = attemptInvitation(location, history, "artroom-invite:TEST", () => new Promise<{ device?: unknown }>(resolve => { finish = resolve; }));
  assert.deepEqual(seen, []);
  finish({}); await pending;
  assert.deepEqual(seen, ["/counter?a=1"]);
  await attemptInvitation(location, history, "artroom-invite:TEST", async () => ({ device: {} }));
  assert.equal(seen.length, 1);
  await assert.rejects(attemptInvitation({ ...location, hash: "#artroom-invite:NEW" }, history, "artroom-invite:TEST", async () => { throw new Error("refused"); }));
  assert.equal(seen.length, 1);
});
