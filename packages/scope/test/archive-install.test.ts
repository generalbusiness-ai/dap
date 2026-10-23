/** Actual native room/authority/install/R2/judgments and SQLite. The Git
 * HTTP peer and hosting trust/configuration are explicit TEST fixtures.
 * This proves binding admission, not archive export or a live provider. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { isSeed, parseStrict, scopeIdOf } from "@generalbusiness/dap-bytes";
import { ARCHIVE_APPLICATION_COHORT as C, platform } from "@generalbusiness/dap-platform";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import { secretSigner, signedApplicationInstall } from "@generalbusiness/dap-client";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { applicationResolverFixture, applicationHttpPeer, sessionRoom, dispatchFixture, driveFixture, effectFixture, reader, applicationContentBindings } from "./fixtures-native.ts";
import { rita, routed } from "./repository.ts";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { archivePrefixMetadata } from "../src/archive-prefix.ts";
import { archivePrivacyMetadata } from "../src/archive-privacy.ts";

test("a native install requiring archive refuses an unbound room before grants, then succeeds after binding", async () => {
  const room = await sessionRoom(C.register), { life, R, D, children } = room;
  const [M, A, G] = children;
  if (!M || !A || !G) return expect.fail("the actual room siblings must exist");
  const f = await applicationResolverFixture("sha1", undefined, { member: ["counting.fulfill"] }, undefined, undefined, true);
  const peer = applicationHttpPeer(f), bindings = applicationContentBindings(env.APPLICATION_CONTENT, JSON.stringify(f.trust));
  try {
    const seatExpected = await life.wait(() => M.expected({ roster: 0 }));
    const seat = await life.wait(() => M.did(rita, "seat", { expected: seatExpected }));
    const keyExpected = await life.wait(() => M.expected({ roster: 0, member: seat }));
    await life.wait(() => M.did(rita, "first-key", { fields: { member: seat }, expected: keyExpected }));
    life.outside(D.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch));
    life.outside(A.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch));
    await life.wait(() => D.restart()); await life.wait(() => A.restart());
    const install = async () => {
      const envelope = await signedApplicationInstall(secretSigner(rita.secret), f.packet.bytes, { rules: await A.at(), uri: f.uri, release: f.packet.ids.release, roles: ["member"], values: { target: 7 } }, { now: life.now() });
      const answer = await life.wait(() => A.stub.submit(envelope.signed, [], envelope.beside));
      expect(answer).toMatchObject({ answer: "accepted" });
      if (answer.answer !== "accepted") return expect.fail("the install request must be recorded");
      await effectFixture([A], life.wait);
      await dispatchFixture([R, D, M, A, G], life.wait);
      return { job: answer.receipt.fact.seq, envelope };
    };
    const before = (await M.item(0)).values["memberActions"], original = await install(), refused = original.job;
    expect(await life.wait(() => (A.object as unknown as { items(reader: unknown, type: string): Promise<unknown> }).items(reader, "installation"))).toMatchObject({ ok: true, value: [{ id: refused, state: "refused", values: { reason: "archive-unavailable" } }] });
    expect((await M.item(0)).values["memberActions"]).toEqual(before);
    const creations = async () => (await D.entries()).flatMap(entry => entry.sends).filter(send => send.message.class === "request" && send.message.type === "create" && isSeed(send.to) && send.to.kind === "lane");
    expect(await creations()).toHaveLength(0);
    const expected = await life.wait(() => D.expected({ on: 0 }));
    await life.wait(() => D.did(rita, "bind-archive", { on: 0, expected, fields: { archive: "journal" } }));
    const head = (await A.summary()).at;
    expect(await life.wait(() => A.stub.submit(original.envelope.signed, [], original.envelope.beside))).toMatchObject({ answer: "accepted", receipt: { fact: { seq: refused } } });
    expect((await A.summary()).at).toEqual(head);
    const accepted = (await install()).job, made = await creations();
    expect(made).toHaveLength(1);
    const seed = made[0]!.to;
    if (!isSeed(seed)) return expect.fail("the application must have a native seed");
    const application = life.platform(scopeIdOf(seed));
    await driveFixture([R, D, M, A, G, application], life.wait);
    expect(await A.item(accepted)).toMatchObject({ state: "active" });
    const birth = (await application.entries())[0]!;
    expect(birth).toMatchObject({ input: { type: "genesis", decision: "applied" } });
    expect(birth.uses.length).toBeGreaterThan(0);
    // S2a's binding does not bypass the existing foreign-source cutoff.
    // This explicit TEST pin allowlist reaches metadata classification;
    // it is no reviewed policy certificate or permission to export bodies.
    const declared = validateDefinition(parseStrict(f.packet.package.semantic.definitions[0]!.bytes), PROPOSED_BOUNDS);
    if (!declared.ok) return expect.fail("the installed TEST application must have a valid declaration");
    const scope = await application.at(), through = (await application.summary()).at;
    const privacy = await life.wait(() => runInDurableObject(application.object, (_instance, state) => {
      const forbidden: string[] = [], budget = new ArchiveBudget();
      const sql = { exec(query: string, ...args: (string | number | null | ArrayBuffer)[]) {
        if (/SELECT (?:\*|bytes)|FROM retained_/.test(query)) { forbidden.push(query); throw new Error("archive body fetch blocked by witness"); }
        return state.storage.sql.exec(query, ...args);
      } };
      let reason = "admitted";
      try {
        const prefix = archivePrefixMetadata(sql, scope, through, PROPOSED_BOUNDS, budget, new Set([declared.definition.digest]));
        expect(prefix.positions[0]?.seq).toBe(0);
        archivePrivacyMetadata(sql, prefix, { named: declared.definition.digest, definition: declared.definition,
          owners: new Map(), records: new Map(), preparations: new Map() }, budget);
      } catch (error) { reason = (error as { reason?: string }).reason ?? String(error); }
      return { reason, forbidden };
    }));
    expect(privacy).toEqual({ reason: "unsupported-foreign-copy", forbidden: [] });
    for (const node of [A, D, application]) {
      const head = (await node.summary()).at;
      const replay = await life.wait(() => verify(httpSource("https://scopes.test", { reader, fetch: (url, init) => life.wait(() => routed(url, init)) }), { mode: "replay", platform, grants: "proven", scope: node.name, head }));
      expect([replay.report.result, replay.why]).toEqual(["consistent", null]);
    }
  } finally { life.release(); }
});
