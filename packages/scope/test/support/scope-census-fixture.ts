/** TEST host configuration/files only; Register births, index owner, SQL,
 * signatures, membership and routed reads use the actual Native code. */
import { env } from "cloudflare:workers";
import { b64url, entryHash } from "@generalbusiness/dap-bytes";
import { invitationIssueFields, invitationRedemptionFields, secretSigner, signedReader, signerSessionRequest, requestSession, type Fetch } from "@generalbusiness/dap-client";
import { ARCHIVE_DEVICE_APPLICATION_COHORT as C } from "@generalbusiness/dap-platform";
import { route } from "../../src/worker.ts";
import type { FactRef } from "@generalbusiness/dap-contract";
import type { ProofBody } from "../../src/proof-bytes.ts";
import { SCOPE_INDEX_NAME, type ScopeIndexPort, type ScopeRegistration } from "../../src/scope-index.ts";
import { scopeCensusTestSettings } from "../worker.ts";
import { beginSessionFixture } from "../session-settings.ts";
import { rita, una } from "../repository.ts";
import { soon } from "../net.ts";
import { nativeFixtureLifetime, dispatchFixture } from "./native-fixture-lifetime.ts";
import { sessionRepository } from "./session-room.ts";

export async function scopeCensusFixture(options: { members?: boolean; registerOnly?: boolean; readLimit?: number; addressLimit?: number; proofRead?: () => void } = {}) {
  const owner = beginSessionFixture({ secret: "TEST scope census session secret", sessions: false, inspector: null });
  const life = nativeFixtureLifetime(owner, { required: false });
  const indexName = `TEST-census-${crypto.randomUUID()}`;
  try {
    // Native births and ordinary reads keep the owned scripted clock. The
    // census standing check independently uses the real host clock.
    const first = await sessionRepository(life, C.register), other = await sessionRepository(life, C.register);
    const register = await life.wait(() => first.R.at()), root = await life.wait(() => first.D.at());
    const membership = await life.wait(() => first.children[0]!.at());
    // Optional TEST spy forwards the exact proof RPC to the real Native
    // object. It changes no proof bytes, authorization, owner, or counter.
    const proofScopes = options.proofRead === undefined ? env.PLATFORM : {
      idFromName: (name: string) => env.PLATFORM.idFromName(name),
      get: (id: DurableObjectId) => ({ proofSource: (fact: FactRef, maxBytes: number, milliseconds: number) => {
        options.proofRead!();
        const target = env.PLATFORM.get(id) as unknown as { proofSource(fact: FactRef, maxBytes: number, milliseconds: number): Promise<ProofBody | null> };
        return target.proofSource(fact, maxBytes, milliseconds);
      } }),
    } as unknown as DurableObjectNamespace;
    const settings = {
      REGISTER_SCOPE: register.scope,
      ARTIFACTS_CONFIG: options.registerOnly ? undefined : JSON.stringify({ registerScope: register.scope, namespace: "TEST-census", host: "artifacts.example", maxBytes: 10485760, credentialIdentity: "adapter-attempt" }),
      SCOPES: proofScopes, SCOPE_INDEX_MODE: "enforce",
      ...(options.readLimit === undefined ? {} : { SERVING_READ_KEY_PER_MINUTE: String(options.readLimit) }),
      ...(options.addressLimit === undefined ? {} : { SERVING_READ_ADDRESS_PER_MINUTE: String(options.addressLimit) }),
    };
    scopeCensusTestSettings.set(indexName, settings);
    life.cleanup(() => { scopeCensusTestSettings.delete(indexName); });
    const id = env.SCOPE_INDEX.idFromName(indexName), stub = env.SCOPE_INDEX.get(id);
    const index = stub as unknown as ScopeIndexPort;
    const binding = { idFromName(name: string) {
      if (name !== SCOPE_INDEX_NAME) throw Error("TEST unexpected census owner"); return id;
    }, get(selected: DurableObjectId) {
      if (selected.toString() !== id.toString()) throw Error("TEST unexpected census owner"); return stub;
    } };
    const environment = { ...settings, SCOPE_INDEX: binding };
    const nodes = [first.R, first.D, ...first.children, other.R, other.D, ...other.children];
    const rows: ScopeRegistration[] = [];
    for (const node of nodes) {
      const at = await life.wait(() => node.at()), genesis = (await life.wait(() => node.entries()))[0]!;
      const row = { at, genesis: entryHash(genesis) };
      if (!await index.register(row)) throw Error("TEST native census registration failed");
      rows.push(row);
    }
    rows.sort((a, b) => a.at.scope < b.at.scope ? -1 : a.at.scope > b.at.scope ? 1 : 0);
    const service = "https://census.test";
    const fetch: Fetch = async (url, init) => {
      // Node's redirect/credentials controls have no authority in this TEST
      // in-process bridge; only Request's supported wire fields are forwarded.
      const request = new Request(url, { ...(init?.method ? { method: init.method } : {}), ...(init?.headers ? { headers: init.headers } : {}), ...(init?.body ? { body: init.body } : {}) });
      const response = await life.wait(() => route(request, env.PLATFORM, environment));
      return { status: response.status, body: response.body };
    };
    const request = async (reader: string | null, after = "", limit = 100, address: string | null = null) => {
      const headers: Record<string, string> = reader === null ? {} : { authorization: reader };
      return life.wait(() => route(new Request(`${service}/v1/scope-index/census?cursor=${encodeURIComponent(after)}&limit=${limit}`, { headers }), env.PLATFORM, environment, address));
    };
    const operator = secretSigner(rita.secret), member = secretSigner(una.secret);
    const reading = (after = "", target = register.scope) => signedReader(operator, target, "census", after);
    if (options.members) {
      const M = first.children[0]!;
      const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
      await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
      const ownerInbox = await life.wait(() => M.created(seat));
      await dispatchFixture([first.R, first.D, ...first.children, ownerInbox], life.wait);
      const secret = b64url(crypto.getRandomValues(new Uint8Array(32)));
      const invitation = await life.wait(() => M.did(rita, "invite-member", { fields: {
        handle: "@census-member", role: "member", ...invitationIssueFields(C.membership, secret), inviteEnds: soon(60),
      } }));
      const joined = await life.wait(() => M.did(una, "join", { fields: invitationRedemptionFields(C.membership, membership, invitation, una.key, secret) }));
      const inbox = await life.wait(() => M.created(joined));
      await dispatchFixture([...nodes, ownerInbox, inbox], life.wait);
      for (const node of [ownerInbox, inbox]) {
        const at = await life.wait(() => node.at()), genesis = (await life.wait(() => node.entries()))[0]!;
        const row = { at, genesis: entryHash(genesis) };
        if (!await index.register(row)) throw Error("TEST inbox registration failed");
        rows.push(row); nodes.push(node);
      }
      rows.sort((a, b) => a.at.scope < b.at.scope ? -1 : a.at.scope > b.at.scope ? 1 : 0);
      const memberState = await life.wait(() => M.stub.observe({ of: membership, key: una.key }));
      if (!memberState || typeof memberState !== "object" || !("keyState" in memberState) || memberState.keyState !== "active") throw Error("TEST member must be native and active");
    }
    const memberSession = async () => {
      const asked = await signerSessionRequest(membership, member, soon(60), b64url(crypto.getRandomValues(new Uint8Array(16))));
      const got = await requestSession(service, membership.scope, asked, { fetch });
      if (!got.ok) throw Error("TEST native member session refused");
      return got.session.reader();
    };
    return { life, ...first, other, register, root, membership, rows, nodes, id, stub, index, settings, environment,
      service, fetch, request, reading, operator, member, memberSession,
      config: { v: 1 as const, service, key: "TEST-census-operator", register, repository: {
        directory: root, membership, rules: (await life.wait(() => first.children[1]!.at())).scope,
        destination: (await life.wait(() => first.children[2]!.at())).scope,
      } },
    };
  } catch (error) { life.release(); throw error; }
}
