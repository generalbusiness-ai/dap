import { expect, test } from "vitest";
import type { ScopeKind } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, intentDigest, newIncarnation, scopeIdOf, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { AGENT_KEY_LINK, INVITATION_LINK, agentKeyInvitationOf, invitationOf, secretSigner, signedIntent, wellFormedInvitation, type InvitationLink, type InvitedRepository } from "@generalbusiness/dap-client";
import { LINK, linkOf } from "../src/commands.ts";
import { command } from "../src/line.ts";
import { memoryStore } from "../src/store.ts";
import { PERSON_INVITATION, PERSON_INVITATION_CASES, PERSON_SERVICE } from "../../client/test/support/person-invitation-table.ts";
import type { Store } from "../src/store.ts";

// Invariant: the client's invitation parser, which the MCP server's join uses, reads every link as `artroom join` reads it, and
// refuses what it refuses; its shape check accepts exactly the references `artroom join` accepts.
test("person-link parity uses the actual pending CLI entry and fresh discovery is CLI only", async () => {
  expect(INVITATION_LINK).toBe(LINK);
  const id = (kind: ScopeKind) => scopeIdOf({ v: 1, kind, definition: "platform:directory@3", creator: null, cause: textDigest(kind), ordinal: 0 });
  const inc = (n: number) => newIncarnation(new Uint8Array(16).fill(n));
  const repository: InvitedRepository = { directory: { scope: id("directory"), inc: inc(1), kind: "directory" }, membership: { scope: id("membership"), inc: inc(2), kind: "membership" }, rules: id("rules"), destination: id("destination") };
  const link: InvitationLink = { v: 1, service: "https://scopes.test", repository, invitation: 5, secret: "s".repeat(43), handle: "@una", definition: "platform:membership@2" };
  const text = (value: unknown) => `${LINK}${b64url(utf8(JSON.stringify(value)))}`;
  const cases = [text(link), text({ ...link, definition: undefined }), text({ ...link, v: 2 }), text({ ...link, invitation: 1.5 }), text({ ...link, secret: 7 }), `${LINK}not-base64!`, "https://not-a-link", text(null)];
  for (const c of cases) expect(invitationOf(c), c.slice(0, 40)).toEqual(linkOf(c));
  // Public config supplies the expected service. Invalid endpoints must not read a signing key or private request.
  let storeCalls = 0, fetchCalls = 0;
  const touched = async (): Promise<never> => { storeCalls++; throw Error("Signing store must not be read or written"); };
  const store: Store = { config: async () => null, save: touched, secret: touched, keep: touched, private: touched, keepPrivate: touched };
  const ctx = { store, fetch: async () => { fetchCalls++; throw Error("No transport before URL validation"); } };
  const invalid = ["not a URL", "http://scopes.test", "http://localhost:7781", "http://127.example.test", "https://user:pass@scopes.test", "https://scopes.test?x=1", "https://scopes.test#x", "https://scopes.test?", "https://scopes.test#"];
  const agent = { v: 1, kind: "agent-key", service: link.service, repository, definition: "platform:membership@2", handle: "@helper", controller: { membership: repository.membership, member: "@founder" }, member: { at: repository.membership, seq: 4, hash: textDigest("SCRIPTED member") }, invitation: { at: repository.membership, seq: 6, hash: textDigest("SCRIPTED invitation") }, secret: b64url(new Uint8Array(32).fill(12)), expected: { on: 1, member: 5 } };
  const tagged = (service: string) => AGENT_KEY_LINK + b64url(utf8(JSON.stringify({ ...agent, service })));
  for (const service of invalid) {
    expect(await command(ctx, ["join", text({ ...link, service })]), service).toMatchObject({ code: 2, lines: ["That invitation link has invalid repository references."] });
    expect(await command(ctx, ["join", tagged(service)]), service).toMatchObject({ code: 1, lines: ["The original agent enrollment is unavailable or unverified. Nothing was replaced."] });
  }
  // A person link must reject unusable proof input before touching private custody, just as an agent link does.
  const seed = b64url(new Uint8Array(32));
  for (const definition of ["platform:membership@6", "platform:membership@7", "platform:membership@8"]) {
  for (const secret of ["not-a-seed", b64url(new Uint8Array(31)), seed.slice(0, -1) + "B", seed + "="]) {
    expect(await command(ctx, ["join", text({ ...link, definition, secret })])).toMatchObject({ code: 2 });
  }
  expect(await command(ctx, ["join", text({ ...link, definition, secret: seed, invitation: 1_000_000_001 })])).toMatchObject({ code: 2 });
  expect(wellFormedInvitation({ ...link, definition, secret: seed })).toBe(true);
  }
  expect([storeCalls, fetchCalls]).toEqual([0, 0]);
  for (const service of ["https://scopes.test", "https://scopes.test/base/", "https://scopes.test:8443", "http://127.0.0.1:7781", "http://127.2.3.4", "http://[::1]:7781"]) {
    expect(wellFormedInvitation({ ...link, service }), service).toBe(true);
    // Tagged key links retain their stricter canonical-origin requirement.
    expect(agentKeyInvitationOf(tagged(service)) !== null, service).toBe(new URL(service).origin === service);
  }
  expect(wellFormedInvitation(invitationOf(text(link))!)).toBe(true);
  expect(wellFormedInvitation(invitationOf(text({ ...link, repository: { ...repository, membership: { ...repository.membership, kind: "lane" } } }))!)).toBe(false);
  expect(wellFormedInvitation(invitationOf(text({ ...link, invitation: 0 }))!)).toBe(false);

  // Five rows reach the actual pending command. The sixth exercises fresh CLI discovery only.
  // Every fixture uses TEST memory custody. The scripted refusal proves dispatch, not membership acceptance.
  const now = Date.parse("2099-01-01T00:00:00Z");
  const seedBytes = new Uint8Array(32).fill(44), signer = secretSigner(seedBytes);
  for (const row of PERSON_INVITATION_CASES) {
    const inner = memoryStore();
    let posts = 0, privateReads = 0, secretReads = 0, writes = 0;
    const original = await signedIntent(signer, {
      to: PERSON_INVITATION.repository.membership, kind: "join", expected: {},
      fields: { invitation: PERSON_INVITATION.invitation, secret: PERSON_INVITATION.secret },
    }, { now, idempotencyKey: "TEST person parity" });
    const originalBytes = utf8(JSON.stringify(original));
    if (row.surface === "all") {
      await inner.keep("device", seedBytes);
      await inner.keepPrivate("TEST-person-join", originalBytes);
      await inner.save({ v: 1, service: PERSON_SERVICE, key: "device", join: {
        request: "TEST-person-join", intent: intentDigest(original.intent),
        link: textDigest(canonicalize(row.normalized ?? PERSON_INVITATION)), repository: PERSON_INVITATION.repository, handle: PERSON_INVITATION.handle,
      } });
    }
    const before = await inner.config();
    const traced: Store = { ...inner,
      secret: async name => { secretReads++; return inner.secret(name); },
      private: async name => { privateReads++; return inner.private(name); },
      save: async value => { writes++; await inner.save(value); },
      keep: async (name, value) => { writes++; await inner.keep(name, value); },
      keepPrivate: async (name, value) => { writes++; await inner.keepPrivate(name, value); },
    };
    const said = await command({ store: traced, now: () => now, fetch: async (url, init) => {
      posts++;
      expect(url, row.name).toBe(`${PERSON_SERVICE}/v1/scopes/${PERSON_INVITATION.repository.membership.scope}/acts`);
      if (row.surface === "all") expect(JSON.parse(init!.body!).signed, row.name).toEqual(original);
      return Response.json({ answer: "refused", reason: "guard-failed", judgedAt: { seq: 0, hash: textDigest("TEST parity refusal") } });
    } }, ["join", row.text]);
    expect(posts === 1, row.name).toBe(row.admitted);
    if (row.admitted) {
      expect(said.code, row.name).toBe(1);
      expect(said.lines.join(" "), row.name).toContain("guard-failed");
      if (row.surface === "all") {
        expect([secretReads, privateReads, writes], row.name).toEqual([1, 1, 0]);
        expect(await inner.private("TEST-person-join"), row.name).toEqual(originalBytes);
        if (row.name === "valid") {
          // An old slash-bearing pending service is retained but does not match after JP1. No migration signs a replacement.
          await inner.save({ ...before!, service: PERSON_SERVICE + "/" });
          posts = privateReads = secretReads = writes = 0;
          const stopped = await command({ store: traced, now: () => now, fetch: async () => { posts++; throw Error("No send for old pending context"); } }, ["join", row.text]);
          expect(stopped.code).toBe(1);
          expect(stopped.lines.join(" ")).toContain("does not match the pending join");
          expect([posts, privateReads, secretReads, writes]).toEqual([0, 0, 0, 0]);
          expect((await inner.config())?.service).toBe(PERSON_SERVICE + "/");
          expect(await inner.private("TEST-person-join")).toEqual(originalBytes);
        }
      } else {
        expect((await inner.config())?.service, row.name).toBe(PERSON_SERVICE);
        expect((await inner.config())?.join?.link, row.name).toBe(textDigest(canonicalize(PERSON_INVITATION)));
      }
    } else {
      expect([secretReads, privateReads, writes], row.name).toEqual([0, 0, 0]);
      expect(await inner.config(), row.name).toEqual(before);
    }
  }
});
