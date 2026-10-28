/** Service-only SCRIPTED scope/admission/runner boundary. These constructed
 * proof shapes establish no Native authority and run no container. */
import { expect, test } from "vitest";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { digest, report } from "./support.ts";
import { stageService } from "./support/stage-service.ts";

test("a successor's accepted reply loss retries only the exact stored signed bytes, with no fresh admission or runner", async () => {
  const fixture = stageService(); fixture.loseReply();
  expect(await fixture.service.deliver(fixture.notice)).toMatchObject({ did: "submitted", ran: true, lane: "kept", outcome: { act: "check", outcome: "passed" } });
  const record = await fixture.outcomes.get(fixture.jobFact), before = fixture.key.signed.length, reads = fixture.stageReads();
  expect(record?.state).toBe("kept"); expect(record?.stageSnapshot?.admission.hash).toBe(fixture.snapshot.admission.hash);
  expect(record?.signed).not.toBeNull();
  fixture.withdraw(); // A decided historical receipt needs no new source eligibility assertion.
  expect(await fixture.service.deliver(fixture.notice)).toMatchObject({ did: "submitted", ran: false, lane: "admitted" });
  expect(fixture.runner.asked).toHaveLength(1); expect(fixture.key.signed).toHaveLength(before); expect(fixture.stageReads()).toBe(reads);
  expect(fixture.submitted.map(canonicalize)).toEqual([canonicalize(record!.signed), canonicalize(record!.signed)]);
});

test("expiry refuses a fresh execution but an already fenced running successor can recover and settle late under current source standing", async () => {
  const wrongPin = stageService(); wrongPin.scopes.pinned = async () => digest("f");
  expect(await wrongPin.service.deliver(wrongPin.notice)).toEqual({ did: "nothing", why: "stage-origin-mismatch" });
  expect(wrongPin.runner.asked).toEqual([]);
  const fresh = stageService(); fresh.expire();
  expect(await fresh.service.deliver(fresh.notice)).toEqual({ did: "nothing", why: "job-deadline-passed" });
  expect(fresh.runner.asked).toEqual([]); expect(await fresh.outcomes.get(fresh.jobFact)).toBeNull();

  const running = stageService();
  running.runner.run = async ask => { running.runner.asked.push(ask); running.runner.records.set(ask.run, "running"); throw Error("TEST running reply lost"); };
  expect(await running.service.deliver(running.notice)).toEqual({ did: "waiting" });
  const asked = running.runner.asked[0]!; running.expire(); running.runner.records.set(asked.run, report());
  expect(await running.service.deliver(running.notice)).toMatchObject({ did: "submitted", lane: "admitted", ran: false, outcome: { act: "check", outcome: "passed" } });
  expect(running.runner.asked).toHaveLength(1); expect(running.runner.looked).toEqual([asked.run, asked.run]);

  const rotated = stageService();
  rotated.runner.run = async ask => { rotated.runner.asked.push(ask); rotated.runner.records.set(ask.run, "running"); throw Error("TEST running reply lost"); };
  expect(await rotated.service.deliver(rotated.notice)).toEqual({ did: "waiting" });
  rotated.expire(); rotated.withdraw();
  expect(await rotated.service.deliver(rotated.notice)).toEqual({ did: "nothing", why: "wrong-source" });
  expect(rotated.runner.asked).toHaveLength(1); expect(rotated.submitted).toEqual([]);
});

test("configuration delay across the native waiting deadline cannot start the first physical run", async () => {
  const fixture = stageService(), original = fixture.scopes.configuration;
  fixture.scopes.configuration = async digest => { const config = await original(digest); fixture.expire(); return config; };
  expect(await fixture.service.deliver(fixture.notice)).toMatchObject({ did: "submitted", ran: false, outcome: { act: "check-error", reason: "run-lost" } });
  expect(fixture.runner.asked).toEqual([]);
});
