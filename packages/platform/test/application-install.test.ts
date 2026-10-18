/** Native rules and judges in memory. Rulebook's registrar and membership
 * authority are fixtures; admission answers below are scripted, with no Git,
 * storage, retry driver, or hosted install running in this witness. */
import { expect, test } from "vitest";
import { canonicalize, definitionDigest } from "@generalbusiness/artroom-bytes";
import { packApplication } from "@generalbusiness/artroom-client/application";
import { secretSigner } from "@generalbusiness/artroom-client";
import { clockOf, judgeOutcome } from "@generalbusiness/dap-derive";
import { d, keys, membership } from "@generalbusiness/dap-derive/testing";
import { countingCommitments } from "../../../apps/counter/commitments.ts";
import { platform } from "../src/index.ts";
import { APPLICATION_INSTALL_RULES } from "../src/application-install.ts";
import { Rulebook } from "./support-rules.ts";

async function fixture() {
  const id = definitionDigest(countingCommitments);
  const packet = await packApplication({ name: "test.install", version: "1", semantic: {
    v: 1, entry: id, definitions: [{ id, bytes: canonicalize(countingCommitments) }],
    host: { execution: "recorded-do", profiles: ["restricted@1"] }, capabilities: [],
    roles: { member: ["counting.fulfill"] }, projections: {}, predecessor: null,
  }, presentation: { v: 1, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {} } }, secretSigner(new Uint8Array(32).fill(64)));
  const r = new Rulebook(true, membership.scope, APPLICATION_INSTALL_RULES);
  const fields = { uri: `git+https://git.example/test.git/@${"a".repeat(40)}/application.dap.json`, release: packet.ids.release,
    semantic: packet.ids.semantic, roles: ["member"], values: "{}" };
  const values = [canonicalize(packet.package.semantic), canonicalize(packet.package.release), canonicalize(countingCommitments)];
  const authority = { named: APPLICATION_INSTALL_RULES, rules: platform(APPLICATION_INSTALL_RULES)!.rules };
  const outcome = (seq: number, result: "confirmed" | "refused" | "unknown", body: unknown, basis: "read" | "own-answer" | "none" = "read") => {
    const judgment = judgeOutcome(r.state, r.definition, { type: "outcome", operation: `${seq}:0`, attempt: 1, result, evidence: { basis, body } },
      { clock: clockOf(r.state, r.now), bounds: r.bounds, platform: authority, own: r.own });
    if (judgment.result === "write") r.seal(judgment.draft);
    return judgment;
  };
  return { r, fields, values, packet, outcome };
}

// One signed install retains its checked proof and remains pending until an
// exact host read answer is judged; omission or wrong authority cannot open it.
test("install admission retains signed semantics, requires authority and exact answers, and refolds", async () => {
  const { r, fields, values, packet, outcome } = await fixture();
  expect(r.act(keys.rita, "install-application", { fields: fields as never }, { values, grants: [] })).toMatchObject({ result: "refused", reason: "unauthorized" });
  expect(r.act(keys.rita, "install-application", { fields: fields as never }, { values: values.slice(0, 2) })).toMatchObject({ result: "unavailable" });
  const written = r.act(keys.rita, "install-application", { fields: fields as never }, { values });
  expect(written.result).toBe("write");
  const seq = r.head.seq;
  expect(r.item(seq)).toMatchObject({ state: "pending", values: { phase: "admission", release: packet.ids.release, definition: packet.package.semantic.entry } });
  expect(r.state.operation(`${seq}:0`)).toMatchObject({ kind: "admit-application", owner: APPLICATION_INSTALL_RULES });
  expect(written.result === "write" ? written.draft.values : []).toHaveLength(3);
  const answer = { uri: fields.uri, ...packet.ids, publisher: packet.package.release.manifest.publisher, policy: d("c") };
  expect(outcome(seq, "unknown", { uri: fields.uri, release: fields.release }, "none").result).not.toBe("write");
  expect(outcome(seq, "confirmed", answer, "own-answer").result).not.toBe("write");
  expect(outcome(seq, "confirmed", { ...answer, release: d("d") }).result).not.toBe("write");
  expect(r.item(seq).values["phase"]).toBe("admission");
  expect(outcome(seq, "confirmed", answer).result).toBe("write");
  expect(r.item(seq)).toMatchObject({ state: "pending", values: { phase: "activation" } });
  expect(r.replay().snapshot()).toEqual(r.state.snapshot());
});

// A host refusal is recorded under the original install without applying a
// grant or creating a lane. Definitive retry policy is a separate continuation.
test("install rejects altered proof and records a bounded host refusal", async () => {
  const { r, fields, values, outcome } = await fixture();
  for (const over of [{ roles: ["member", "member"] }, { roles: ["admin"] }, { values: '{"opener":null}' }, { uri: "https://git.example/floating" }]) {
    expect(r.act(keys.rita, "install-application", { fields: { ...fields, ...over } as never }, { values })).toMatchObject({ result: "refused" });
  }
  expect(r.act(keys.rita, "install-application", { fields: fields as never }, { values: [values[0]!, values[1]!.replace('"version":"1"', '"version":"2"'), values[2]!] }).result).not.toBe("write");
  expect(r.act(keys.rita, "install-application", { fields: fields as never }, { values }).result).toBe("write");
  const seq = r.head.seq;
  expect(outcome(seq, "refused", { uri: fields.uri, release: fields.release, reason: "arbitrary-error" }).result).not.toBe("write");
  expect(outcome(seq, "refused", { uri: fields.uri, release: fields.release, reason: "unsupported-object-format" }).result).toBe("write");
  expect(r.item(seq)).toMatchObject({ state: "refused", values: { reason: "unsupported-object-format" } });
  expect(r.last.sends).toEqual([]);
  expect(r.replay().snapshot()).toEqual(r.state.snapshot());
});
