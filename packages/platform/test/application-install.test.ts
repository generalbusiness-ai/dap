/** Native rules and judges in memory. Rulebook's registrar and membership
 * authority are fixtures; admission answers below are scripted, with no Git,
 * storage, retry driver, or hosted install running in this witness. */
import { expect, test } from "vitest";
import { canonicalize, definitionDigest, textDigest, utf8, keyIdOfSecret, sign } from "@generalbusiness/dap-bytes";
import { packApplication } from "@generalbusiness/dap-bytes/application";
import { clockOf, judgeOutcome, runnable, validateDefinition } from "@generalbusiness/dap-derive";
import { d, keys, membership } from "@generalbusiness/dap-derive/testing";
import { countingCommitments } from "../../../apps/counter/commitments.ts";
import { platform, TRUSTED_APPLICATION_COHORT, SIBLINGS_OF, DIRECTORY_OF } from "../src/index.ts";
import { APPLICATION_INSTALL_RULES } from "../src/application-install.ts";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { Rulebook } from "./fixtures-entry.ts";

async function fixture(requireArchive = false) {
  const id = definitionDigest(countingCommitments);
  const packet = await packApplication({ name: "test.install", version: "1", semantic: {
    v: 1, entry: id, definitions: [{ id, bytes: canonicalize(countingCommitments) }],
    host: { execution: "recorded-do", profiles: ["restricted@1"], ...(requireArchive ? { requires: ["archive"] as const } : {}) }, capabilities: [],
    roles: { member: ["counting.fulfill"] }, projections: {}, predecessor: null,
  }, presentation: { v: 1, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {} } }, { key: keyIdOfSecret(new Uint8Array(32).fill(64)), sign: bytes => sign(new Uint8Array(32).fill(64), bytes) });
  const declarationText = canonicalize(countingCommitments);
  const texts = (digest: string) => digest === textDigest(declarationText) ? utf8(declarationText).length : undefined;
  class TextRulebook extends Rulebook {
    override act(...[who, kind, over = {}, context = {}]: Parameters<Rulebook["act"]>) { return super.act(who, kind, over, { texts, ...context }); }
  }
  const r = new TextRulebook(true, membership.scope, APPLICATION_INSTALL_RULES);
  const fields = { definitionText0: textDigest(declarationText), uri: `git+https://git.example/test.git/@${"a".repeat(40)}/application.dap.json`, release: packet.ids.release,
    semantic: packet.ids.semantic, roles: ["member"], values: '{"target":7}' };
  const values = [canonicalize(packet.package.semantic), canonicalize(packet.package.release)];
  const authority = { named: APPLICATION_INSTALL_RULES, rules: platform(APPLICATION_INSTALL_RULES)!.rules };
  const outcome = (seq: number, result: "confirmed" | "refused" | "unknown", body: unknown, basis: "read" | "own-answer" | "none" = "read") => {
    const judgment = judgeOutcome(r.state, r.definition, { type: "outcome", operation: `${seq}:0`, attempt: 1, result, evidence: { basis, body } },
      { clock: clockOf(r.state, r.now), bounds: r.bounds, platform: authority, own: r.own });
    if (judgment.result === "write") r.seal(judgment.draft);
    return judgment;
  };
  return { r, fields, values, packet, texts, outcome };
}

// One signed install retains its checked proof and remains pending until an
// exact host read answer is judged; omission or wrong authority cannot open it.
test("install admission retains signed semantics, requires authority and exact answers, and refolds", async () => {
  const { r, fields, values, packet, outcome } = await fixture();
  expect(r.act(keys.rita, "install-application", { fields: fields as never }, { values, grants: [] })).toMatchObject({ result: "refused", reason: "unauthorized" });
  expect(r.act(keys.rita, "install-application", { fields: fields as never }, { values, texts: () => undefined })).toMatchObject({ result: "refused" });
  const written = r.act(keys.rita, "install-application", { fields: fields as never }, { values });
  expect(written.result).toBe("write");
  const seq = r.head.seq;
  expect(r.item(seq)).toMatchObject({ state: "pending", values: { phase: "fetch", release: packet.ids.release, definition: packet.package.semantic.entry } });
  expect(r.state.operation(`${seq}:0`)).toMatchObject({ kind: "fetch-application", owner: APPLICATION_INSTALL_RULES });
  expect(written.result === "write" ? written.draft.values : []).toHaveLength(2);
  const answer = { uri: fields.uri, ...packet.ids, publisher: packet.package.release.manifest.publisher, policy: d("c") };
  expect(outcome(seq, "unknown", { uri: fields.uri, release: fields.release }, "none").result).not.toBe("write");
  expect(outcome(seq, "confirmed", answer, "own-answer").result).not.toBe("write");
  expect(outcome(seq, "confirmed", { ...answer, release: d("d") }).result).not.toBe("write");
  expect(r.item(seq).values["phase"]).toBe("fetch");
  const accepted = outcome(seq, "confirmed", answer);
  expect(accepted.result, JSON.stringify(accepted)).toBe("write");
  expect(r.item(seq).values["phase"]).toBe("admission");
  const admission = r.head.seq;
  expect(outcome(admission, "confirmed", answer).result).toBe("write");
  expect(r.item(seq)).toMatchObject({ state: "pending", values: { phase: "activation" } });
  expect(r.state.page("definition", ["active"], null, 16).items).toMatchObject([{ values: { digest: packet.package.semantic.entry }, parties: { activator: keys.rita.member } }]);
  expect(r.act(keys.rita, "install-application", { fields: { ...fields, roles: [] } as never }, { values }).result).toBe("write");
  const second = r.head.seq;
  expect(outcome(second, "confirmed", answer).result).toBe("write");
  expect(outcome(r.head.seq, "confirmed", answer).result).toBe("write");
  expect(r.item(second).values["additions"]).toBe("{}");
  expect(r.state.page("definition", ["active"], null, 16).items).toHaveLength(1);
  expect(r.replay().snapshot()).toEqual(r.state.snapshot());
});

// A host refusal is recorded under the original install without applying a
// grant or creating a lane. Definitive retry policy is a separate continuation.
test("install rejects altered proof and records a bounded host refusal", async () => {
  const { r, fields, values, outcome } = await fixture();
  for (const over of [{ values: "{}" }, { roles: ["member", "member"] }, { roles: ["admin"] }, { values: '{"opener":null}' }, { uri: "https://git.example/floating" }]) {
    expect(r.act(keys.rita, "install-application", { fields: { ...fields, ...over } as never }, { values })).toMatchObject({ result: "refused" });
  }
  expect(r.act(keys.rita, "install-application", { fields: fields as never }, { values: [values[0]!, values[1]!.replace('"version":"1"', '"version":"2"')] }).result).not.toBe("write");
  expect(r.act(keys.rita, "install-application", { fields: fields as never }, { values }).result).toBe("write");
  const seq = r.head.seq;
  expect(outcome(seq, "refused", { uri: fields.uri, release: fields.release, reason: "arbitrary-error" }).result).not.toBe("write");
  expect(outcome(seq, "refused", { uri: fields.uri, release: fields.release, reason: "unsupported-object-format" }).result).toBe("write");
  expect(r.item(seq)).toMatchObject({ state: "refused", values: { reason: "unsupported-object-format" } });
  expect(r.last.sends).toEqual([]);
  expect(r.replay().snapshot()).toEqual(r.state.snapshot());
});


// The new route is opt-in and every selected native version must validate as
// a whole; no list of version names is evidence that a factory can run them.
test("trusted install cohort validates whole with the selected embedded rules", () => {
  const C = TRUSTED_APPLICATION_COHORT;
  expect(DIRECTORY_OF[C.register]).toBe(C.directory);
  expect(SIBLINGS_OF[C.directory]).toEqual({ membership: C.membership, rules: C.rules, destination: C.destination });
  for (const pin of Object.values(C)) {
    const supplied = platform(pin)!;
    const checked = validateDefinition(supplied.data, PROPOSED_BOUNDS, RULE_PROFILES, { platform: true });
    expect(checked.ok ? [] : checked.problems, pin).toEqual([]);
    if (checked.ok) expect(runnable(checked.definition, supplied.rules), pin).toBe(true);
  }
});

// Invariant: the original selected defaults reach this room's actual native
// Membership, preserve its existing actions, and only its full-ref answer
// advances the install. Definition custody is staged before grants leave.
test.each([false, true])("checked native grant route stages exact custody before preserving role actions (full=%s)", async full => {
  const { installGraph } = await import("./support-application-install.ts");
  const { A, D, M, send } = installGraph();
  const { packet, values, texts, fields: proofFields } = await fixture();
  const fields = { definitionText0: proofFields.definitionText0, uri: `git+https://git.example/test.git/@${"a".repeat(40)}/application.dap.json`, release: packet.ids.release, semantic: packet.ids.semantic, roles: ["member"], values: '{"target":7}' };
  const installer = { ...keys.rita, member: { membership: M.at, member: "@rita" as const } };
  if (full) expect(M.act(installer, "set-actions", { on: 0, expected: { on: M.item(0).revision }, fields: { role: "member", actions: Array.from({ length: 64 }, (_, index) => `test.action${index}`) } }, { membership: M.at }).result).toBe("write");
  expect(A.act(installer, "install-application", { fields }, { values, texts, membership: M.at }).result).toBe("write");
  const job = A.head.seq;
  const stored = A.outcome(`${job}:0`, { uri: fields.uri, ...packet.ids, publisher: packet.package.release.manifest.publisher, policy: d("c") });
  const accepted = A.outcome(`${stored}:0`, { uri: fields.uri, ...packet.ids, publisher: packet.package.release.manifest.publisher, policy: d("c") });
  A.texts = texts;
  send(D, A, accepted);
  const staged = D.head.seq;
  const contextSend = D.last.sends.find(send => send.message.class === "request")!;
  expect(A.item(job).values["phase"]).toBe("activation");
  expect(D.state.page("application-catalog", ["retained"], null, 16).items).toMatchObject([{ values: { definition: packet.package.semantic.entry } }]);
  send(A, D, staged, contextSend.n);
  expect(A.item(job).values["phase"]).toBe("grants");
  const grantRequest = A.last.sends.find(send => send.message.class === "request")!;
  send(D, A, A.head.seq, grantRequest.n);
  const forward = D.head.seq;
  const before = [...M.item(0).values["memberActions"] as string[]];
  const grantSend = D.last.sends.find(send => send.message.class === "request")!;
  send(M, D, forward, grantSend.n);
  const answered = M.head.seq;
  const answerSend = M.last.sends.find(send => send.message.class === "request")!;
  send(A, M, answered, answerSend.n);
  if (full) {
    expect(A.item(job)).toMatchObject({ state: "refused", values: { reason: "role-actions-full", phase: "grants" } });
    expect(M.item(0).values["memberActions"]).toEqual(before);
  } else {
    expect(A.item(job).values["phase"]).toBe("creation");
    expect(M.item(0).values["memberActions"]).toEqual([...before, "counting.fulfill"]);
  }
  expect(M.item(0).values["adminActions"]).not.toContain("counting.fulfill");
  expect(A.replay().snapshot()).toEqual(A.state.snapshot());
  expect(M.replay().snapshot()).toEqual(M.state.snapshot());
});

test.each([false, true])("an archive requirement checks the room binding before grants (bound=%s)", async bound => {
  const { installGraph } = await import("./support-application-install.ts");
  const { ARCHIVE_APPLICATION_COHORT } = await import("../src/index.ts");
  const { A, D, M, send } = installGraph(ARCHIVE_APPLICATION_COHORT);
  const { packet, values, texts, fields } = await fixture(true);
  const installer = { ...keys.rita, member: { membership: M.at, member: "@rita" as const } };
  if (bound) expect(D.act(installer, "bind-archive", { on: 0, expected: { on: D.item(0).revision }, fields: { archive: "journal" } }, { membership: M.at })).toMatchObject({ result: "write" });
  expect(A.act(installer, "install-application", { fields }, { values, texts, membership: M.at })).toMatchObject({ result: "write" });
  const job = A.head.seq, before = M.state.snapshot();
  const stored = A.outcome(`${job}:0`, { uri: fields.uri, ...packet.ids, publisher: packet.package.release.manifest.publisher, policy: d("c") });
  const accepted = A.outcome(`${stored}:0`, { uri: fields.uri, ...packet.ids, publisher: packet.package.release.manifest.publisher, policy: d("c") });
  A.texts = texts; send(D, A, accepted);
  expect(M.state.snapshot()).toEqual(before);
  if (bound) {
    expect(D.last.input).toMatchObject({ decision: "applied" });
    expect(D.state.page("application-catalog", ["retained"], null, 16).items).toHaveLength(1);
  } else {
    expect(D.last.input).toMatchObject({ decision: "refused", reason: { name: "archive-unavailable" } });
    expect(D.state.page("application-catalog", ["retained"], null, 16).items).toHaveLength(0);
    const deciding = D.head.seq, answer = D.last.sends.find(send => send.message.class === "result")!;
    send(A, D, deciding, answer.n);
    expect(A.item(job)).toMatchObject({ state: "refused", values: { reason: "archive-unavailable" } });
    expect(send(A, D, deciding, answer.n, false)).toMatchObject({ result: "repeat" });
  }
});


// A known local definition limit is a terminal recorded refusal, not an
// outcome that stays unjudged forever or emits a subordinate grant request.
test("a full active-definition catalog refuses activation without opening more work", async () => {
  const { r, fields, values, packet, outcome } = await fixture();
  for (let index = 0; index < 16; index++) {
    const declaration = JSON.parse(canonicalize(countingCommitments).replaceAll("counting-commitments", `capacity${index}`)) as typeof countingCommitments;
    const digest = definitionDigest(declaration);
    const activated = r.act(keys.rita, "activate", { fields: { digest, name: declaration.name } }, { values: [canonicalize(declaration)] });
    expect(activated.result, JSON.stringify(activated)).toBe("write");
  }
  expect(r.act(keys.rita, "install-application", { fields: fields as never }, { values }).result).toBe("write");
  const job = r.head.seq, body = { uri: fields.uri, ...packet.ids, publisher: packet.package.release.manifest.publisher, policy: d("c") };
  expect(outcome(job, "confirmed", body).result).toBe("write");
  expect(outcome(r.head.seq, "confirmed", body).result).toBe("write");
  expect(r.item(job)).toMatchObject({ state: "refused", values: { phase: "activation", reason: "definitions-full" } });
  expect(r.last.sends).toEqual([]);
  expect(r.state.page("definition", ["active"], null, 16).items).toHaveLength(16);
  expect(r.replay().snapshot()).toEqual(r.state.snapshot());
});
