import { editEvidence } from "../src/retained-editor-state.ts";
import { expect, test, vi } from "vitest";
import { ScopeHandle } from "@generalbusiness/dap-client";
import { canonicalize, intentDigest, takeBytes, utf8 } from "@generalbusiness/dap-bytes";
import { BASE_COHORT } from "@generalbusiness/dap-platform";
import { act, copiesOf, joinRoom, listLanes, loadChange, openRoom, placeOf } from "../src/data.ts";
import { checkEditRequest, continueEdit, prepareEdit } from "../src/retained-editor-data.ts";
import { demo } from "./support/demo.ts";

// Real native directory/membership/change/rules and HTTP reads/signing. STAND-INS: Git host and scheduler from demo.
// Invariant: a member can create a NEW corrected one-file proposal, retaining the old manifest; unknown replies stop next steps.
test("retained text creates a new member proposal with exact bytes and original history; lost accepted opening has no second signature (STAND-IN Git/scheduler)", async () => {
  const d = await demo();
  try {
    const sourceRun = await d.run(d.rita, "edit", "README.md", "--file", "readme.md", "--title", "Editor source");
    expect(sourceRun.code, sourceRun.lines.join("\n")).toBe(0);
    const secret = crypto.getRandomValues(new Uint8Array(32)); expect((await joinRoom(d.as(secret), d.link)).answer.answer).toBe("accepted");
    const room = await openRoom(d.as(secret), placeOf(JSON.stringify(d.config))!);
    const row = (await listLanes(room)).changes.find(r => r.title === "Editor source")!;
    const source = await loadChange(room, row.scope); const original = source.manifests[0]!;
    const draft = { title: "Member correction", path: "docs/correct.md", content: "\ufeff# café\r\n" };
    const options = { current: () => true, pause: d.pause };
    const destination = await d.G.stub.summary(room.reader!.reader());
    expect(destination.ok).toBe(true);
    if (!destination.ok) throw new Error(destination.reason);
    expect(destination.value.definition).toBe(BASE_COHORT.destination);
    const publishedBefore = destination.value.items.find((item) => item.type === "branch")!.values["head"];
    const prepared = await prepareEdit(room, source, original.id, draft, options).then(task => ({ state: "prepared" as const, task }), error => ({ state: "refused" as const, reason: String(error) }));
    expect(prepared.state).toBe("prepared");
    if (prepared.state !== "prepared") throw new Error(prepared.reason);
    const task = prepared.task;
    await continueEdit(room, task, options);
    expect(task.stage.state, task.message).toBe("recorded");
    expect(editEvidence(task.stage).lane).not.toBe(source.scope);
    expect(task.stage.steps.map(s => [s.kind, s.attempted, s.answer?.answer, s.receiptVerified])).toEqual([["open-pr",true,"accepted",true],["ask-rules",true,"accepted",true],["propose-file",true,"accepted",true]]);
    const file = task.stage.steps[2]!.signed.intent.fields;
    expect(file).toMatchObject({ base: task.base, path: draft.path, content: draft.content, size: utf8(draft.content).length });
    const corrected = await loadChange(room, editEvidence(task.stage).lane!);
    const afterProposal = await d.G.stub.summary(room.reader!.reader());
    expect(afterProposal.ok && afterProposal.value.items.find((item) => item.type === "branch")!.values["head"]).toEqual(publishedBefore);
    expect(corrected.state).toBe("open"); expect(corrected.merges).toEqual([]); expect(corrected.manifests[0]!.file?.content).toBe(draft.content);
    expect(corrected.body).toContain(source.scope);
    expect((await loadChange(room, source.scope)).manifests[0]).toEqual(original);
    const rewrite = await act(room, editEvidence(task.stage).lane!, "propose-file", { fields: file });
    expect(rewrite.answer).toMatchObject({ answer: "refused", name: "one-version" });
    const merge = await act(room, editEvidence(task.stage).lane!, "merge", { fields: { manifest: corrected.manifests[0]!.id, reports: [] } });
    expect(merge.answer).toMatchObject({ answer: "refused", reason: "unauthorized" });

    let mutationPosts = 0;
    const lost = { ...room, session: { ...room.session, fetch: (async (url: string, init?: Parameters<typeof d.fetch>[1]) => {
      const reply = await d.fetch(url, init);
      if (init?.method === "POST" && new URL(url).pathname.endsWith("/acts")) { mutationPosts++; throw new Error("Lost accepted answer"); }
      return reply;
    }) as typeof d.fetch } };
    const unknown = await prepareEdit(lost, source, original.id, { ...draft, title: "Lost opening" }, options);
    await continueEdit(lost, unknown, options);
    expect(unknown.stage.state).toBe("unknown"); expect(unknown.stage.steps).toHaveLength(1); expect(unknown.stage.steps[0]!.attempted).toBe(true);
    const envelope = JSON.stringify(unknown.stage.steps[0]!.signed);
    await continueEdit(lost, unknown, options);
    expect(mutationPosts).toBe(1); expect(JSON.stringify(unknown.stage.steps[0]!.signed)).toBe(envelope);
    await checkEditRequest(room, unknown, options);
    expect(unknown.stage.state).toBe("waiting-lane");
    await continueEdit(room, unknown, options);
    expect(unknown.stage.state, unknown.message).toBe("recorded");
    expect(JSON.stringify(unknown.stage.steps[0]!.signed)).toBe(envelope);
  } finally { d.done(); }
}, 180_000);

// Invariant: invalid input and changed context/base cannot cause a new mutation, including after an accepted opening.
test("invalid target and stale context/base send nothing new; an invalid old proposal is corrected in a new lane (STAND-IN Git/scheduler)", async () => {
  const d = await demo();
  try {
    const bad = await d.run(d.paul, "edit", "../outside.md", "--file", "readme.md", "--title", "Invalid source");
    expect(bad.code).toBe(1);
    const room = await openRoom(d.as(await d.secretOf(d.paul)), placeOf(JSON.stringify(d.config))!);
    const oldRow = (await listLanes(room)).changes.find(r => r.title === "Invalid source")!;
    const old = await loadChange(room, oldRow.scope);
    expect(old.manifests[0]!.file?.path).toBe("../outside.md");
    let posts = 0;
    const watched = { ...room, session: { ...room.session, fetch: (async (url: string, init?: Parameters<typeof d.fetch>[1]) => { if (init?.method === "POST" && new URL(url).pathname.endsWith("/acts")) posts++; return d.fetch(url, init); }) as typeof d.fetch } };
    const options = { current: () => true, pause: d.pause };
    await expect(prepareEdit(watched, old, old.manifests[0]!.id, { title: "Bad", path: "../bad.md", content: "x" }, options)).rejects.toThrow("relative path");
    expect(posts).toBe(0);
    const corrected = await prepareEdit(watched, old, old.manifests[0]!.id, { title: "Correct path", path: "inside.md", content: "# corrected\n" }, options);
    await continueEdit(watched, corrected, options);
    expect(corrected.stage.state, corrected.message).toBe("recorded");
    expect((await loadChange(room, old.scope)).manifests[0]!.file?.path).toBe("../outside.md");

    const mutable = { title: "Captured draft", path: "capture.md", content: "original bytes" };
    const preparing = prepareEdit(room, old, old.manifests[0]!.id, mutable, options);
    mutable.content = "changed during reads";
    const captured = await preparing;
    expect(captured.draft.content).toBe("original bytes");

    let same = true;
    const stopped = await prepareEdit(watched, old, old.manifests[0]!.id, { title: "Context guard", path: "context.md", content: "x" }, { current: () => same });
    const before = posts; same = false;
    await continueEdit(watched, stopped, { current: () => same });
    expect(stopped.stage.state).toBe("stopped"); expect(stopped.stage.steps).toEqual([]); expect(posts).toBe(before);

    let current = true; let triggered = false; let crossed = 0;
    const raceRoom = { ...room, session: { ...room.session, fetch: (async (url: string, init?: Parameters<typeof d.fetch>[1]) => {
      const reply = await d.fetch(url, init);
      if (init?.method === "POST" && new URL(url).pathname.endsWith("/acts")) crossed++;
      if (!triggered && race.stage.steps.length > 0 && !race.stage.steps[0]!.attempted && new URL(url).pathname.includes(room.destination)) { triggered = true; current = false; }
      return reply;
    }) as typeof d.fetch } };
    const race = await prepareEdit(room, old, old.manifests[0]!.id, { title: "Pre-POST context guard", path: "race.md", content: "x" }, options);
    await continueEdit(raceRoom, race, { current: () => current, pause: d.pause });
    expect(triggered).toBe(true); expect(crossed).toBe(0); expect(race.stage.steps[0]!.attempted).toBe(false); expect(race.stage.state).toBe("stopped");

    let reIncPosts = 0;
    const reincarnated = await prepareEdit(room, old, old.manifests[0]!.id, { title: "Directory identity guard", path: "inc.md", content: "x" }, options);
    const changedDirectory = { ...room, session: { ...room.session, fetch: (async (url: string, init?: Parameters<typeof d.fetch>[1]) => {
      const reply = await d.fetch(url, init);
      if (init?.method === "POST" && new URL(url).pathname.endsWith("/acts")) reIncPosts++;
      if (reIncPosts > 0 && new URL(url).pathname.endsWith(`/${room.directory}`)) {
        const bytes = reply.body ? await takeBytes(reply.body, 256 * 1024, AbortSignal.timeout(30_000)) : null;
        if (!(bytes instanceof Uint8Array)) return reply;
        const read = JSON.parse(new TextDecoder().decode(bytes));
        if (read.ok) read.value.scope.genesis = d.config.repository!.membership.genesis;
        return new Response(JSON.stringify(read));
      }
      return reply;
    }) as typeof d.fetch } };
    await continueEdit(changedDirectory, reincarnated, options);
    expect(reIncPosts).toBe(1); expect(reincarnated.stage.state).toBe("stopped"); expect(reincarnated.message).toContain("directory incarnation");
    expect(reincarnated.stage.steps[0]!.answer?.answer).toBe("accepted");

    const moved = await prepareEdit(watched, old, old.manifests[0]!.id, { title: "Moved base", path: "moved.md", content: "x" }, options);
    const published = await d.run(d.rita, "edit", "README.md", "--file", "readme.md", "--title", "Move base before editor submit");
    expect(published.code, published.lines.join("\n")).toBe(0);
    const beforeMoved = posts;
    await continueEdit(watched, moved, options);
    expect(moved.stage.state).toBe("stopped"); expect(moved.stage.steps).toEqual([]); expect(posts).toBe(beforeMoved);
  } finally { d.done(); }
}, 180_000);

// Invariant: the editor's step reads the member's open requests before it keeps, as a press of the page does. A failed read sends nothing.
test("a failed list read stops the editor's step before its keep (STAND-IN Git/scheduler)", async () => {
  const d = await demo();
  try {
    expect((await d.run(d.paul, "edit", "unread-list.md", "--file", "readme.md", "--title", "Unread list")).code).toBe(0);
    const room = await openRoom(d.as(await d.secretOf(d.paul)), placeOf(JSON.stringify(d.config))!);
    const oldRow = (await listLanes(room)).changes.find(r => r.title === "Unread list")!;
    const old = await loadChange(room, oldRow.scope);
    const task = await prepareEdit(room, old, old.manifests[0]!.id, { title: "After a failed read", path: "unread-list.md", content: "x" }, { current: () => true, pause: d.pause });
    let kept = 0, sent = 0, down = true;
    const failing = { ...room, session: { ...room.session, fetch: (async (url: string, init?: Parameters<typeof d.fetch>[1]) => {
      const path = new URL(url).pathname;
      if (down && (init?.method ?? "GET") === "GET" && path.endsWith("/originals")) throw new Error("no reply to the list");
      if (init?.method === "POST" && path.endsWith("/originals")) kept++;
      if (init?.method === "POST" && path.endsWith("/acts")) sent++;
      return d.fetch(url, init);
    }) as typeof d.fetch } };
    await continueEdit(failing, task, { current: () => true, pause: d.pause });
    expect([kept, sent]).toEqual([0, 0]);
    expect(task.stage.steps).toEqual([]);
    expect(task.stage.state).toBe("prepared");
    expect(task.message).toBe("This page could not read your open requests, so it cannot tell whether an earlier request here has an answer. This press sent nothing. Press again when your connection returns. The next press reads them first.");
    // The way forward: the route returns, and the same button signs the step and sends it.
    down = false;
    await continueEdit(failing, task, { current: () => true, pause: d.pause });
    expect(task.stage.steps[0]).toMatchObject({ kind: "open-pr", attempted: true, answer: { answer: "accepted" } });
    expect(sent).toBeGreaterThan(0);
  } finally { d.done(); }
}, 180_000);

// Invariant: a copy reads "You sent", and a press past the margin sends its bytes. A stop after the keep leaves no such row.
test("a room change after the editor's keep ends the copy and sends nothing (STAND-IN Git/scheduler)", async () => {
  const d = await demo();
  try {
    expect((await d.run(d.paul, "edit", "after-keep.md", "--file", "readme.md", "--title", "After the keep")).code).toBe(0);
    const room = await openRoom(d.as(await d.secretOf(d.paul)), placeOf(JSON.stringify(d.config))!);
    const oldRow = (await listLanes(room)).changes.find(r => r.title === "After the keep")!;
    const old = await loadChange(room, oldRow.scope);
    const task = await prepareEdit(room, old, old.manifests[0]!.id, { title: "Changed during the keep", path: "after-keep.md", content: "x" }, { current: () => true, pause: d.pause });
    let current = true, kept = 0, sent = 0;
    const raced = { ...room, session: { ...room.session, fetch: (async (url: string, init?: Parameters<typeof d.fetch>[1]) => {
      const reply = await d.fetch(url, init);
      const path = new URL(url).pathname;
      if (init?.method === "POST" && path.endsWith("/acts")) sent++;
      if (init?.method === "POST" && path.endsWith("/originals") && reply.status === 204) { kept++; current = false; } // The room changes during the keep.
      return reply;
    }) as typeof d.fetch } };
    await continueEdit(raced, task, { current: () => current, pause: d.pause });
    expect(kept).toBe(1);
    expect(sent).toBe(0);
    expect(task.stage.steps[0]!.attempted).toBe(false);
    expect(task.stage.state).toBe("stopped");
    const listed = await copiesOf(room)!.list();
    expect(listed).toEqual({ ok: true, rows: [] });
  } finally { d.done(); }
});

// Native editor setup and opening. STAND-INS: Git/scheduler from demo, then one explicit reply fault.
// Invariant: a later refusal preserves earlier work; acceptance without a verified receipt stays unknown under its original association.
test.each([{ article: "a", mode: "refused" }, { article: "an", mode: "unverified" }] as const)("$article $mode later editor step retains the earlier receipt and original request without another send (reply fault; Git/scheduler stand-ins)", async ({ mode }) => {
  const d = await demo();
  let restoreSubmit: (() => void) | undefined, restoreFollow: (() => void) | undefined;
  try {
    expect((await d.run(d.rita, "edit", "README.md", "--file", "readme.md", "--title", "Later step source")).code).toBe(0);
    const room = await openRoom(d.as(await d.secretOf(d.paul)), placeOf(JSON.stringify(d.config))!);
    const row = (await listLanes(room)).changes.find(value => value.title === "Later step source")!;
    const source = await loadChange(room, row.scope), original = source.manifests[0]!;
    const options = { current: () => true, pause: d.pause };
    const task = await prepareEdit(room, source, original.id, { title: "Later step outcome", path: "later.md", content: "kept draft\n" }, options);
    const submit = ScopeHandle.prototype.submit, follow = ScopeHandle.prototype.followReceipt;
    let sent = 0, blockReceipt = true;
    let affectedIntent: ReturnType<typeof intentDigest> | undefined;
    const submitted = vi.spyOn(ScopeHandle.prototype, "submit").mockImplementation(async function (this: ScopeHandle, signed, grants, beside) {
      sent++;
      if (signed.intent.kind === "ask-rules") {
        affectedIntent = intentDigest(signed.intent);
        if (mode === "refused") {
          const opened = task.stage.steps[0]!.answer;
          expect(opened?.answer).toBe("accepted");
          if (opened?.answer !== "accepted") return expect.fail("The fault follows a real accepted opening");
          return { answer: "refused", reason: "guard-failed", name: "TEST-later-refusal", judgedAt: { seq: opened.receipt.fact.seq, hash: opened.receipt.fact.hash } };
        }
      }
      return submit.call(this, signed, grants, beside);
    });
    restoreSubmit = () => submitted.mockRestore();
    const followed = vi.spyOn(ScopeHandle.prototype, "followReceipt").mockImplementation(async function (this: ScopeHandle, receipt) {
      if (mode === "unverified" && blockReceipt && receipt.intent === affectedIntent) return { ok: false, reason: "hash-mismatch" };
      return follow.call(this, receipt);
    });
    restoreFollow = () => followed.mockRestore();
    await continueEdit(room, task, options);
    expect(task.stage.state, task.message).toBe(mode === "refused" ? "refused" : "unknown");
    expect(task.stage.steps.map(step => step.kind)).toEqual(["open-pr", "ask-rules"]);
    expect(task.stage.steps[0]).toMatchObject({ attempted: true, answer: { answer: "accepted" }, receiptVerified: true });
    expect(task.stage.steps[1]!.attempted).toBe(true);
    expect(task.stage.steps[1]!.answer?.answer).toBe(mode === "refused" ? "refused" : "accepted");
    expect(task.stage.steps[1]!.receiptVerified).not.toBe(true);
    const envelopes = task.stage.steps.map(step => canonicalize(step.signed)), before = sent;
    await continueEdit(room, task, options);
    expect(sent).toBe(before);
    expect(task.stage.steps.map(step => canonicalize(step.signed))).toEqual(envelopes);
    if (mode === "refused") {
      expect(task.message).toContain("Earlier accepted steps remain recorded");
      expect(editEvidence(task.stage).version).toBeUndefined();
      return;
    }
    await checkEditRequest({ ...room, directory: source.scope }, task, options);
    expect(task.stage.state).toBe("unknown");
    expect(task.message).toBe("Check this task using its original room/key context.");
    expect(sent).toBe(before);
    blockReceipt = false;
    await checkEditRequest(room, task, options);
    expect(task.stage.state, task.message).toBe("waiting-rules");
    expect(sent).toBe(before);
    expect(task.stage.steps[1]!.receiptVerified).toBe(true);
    await continueEdit(room, task, options);
    expect(task.stage.state, task.message).toBe("recorded");
    expect(task.stage.steps.slice(0, 2).map(step => canonicalize(step.signed))).toEqual(envelopes);
    expect(task.stage.steps.map(step => step.kind)).toEqual(["open-pr", "ask-rules", "propose-file"]);
  } finally { restoreFollow?.(); restoreSubmit?.(); d.done(); }
}, 180_000);
