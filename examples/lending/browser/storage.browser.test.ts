/** Real IndexedDB/Web Locks/WebCrypto witness; transport and recorded answers are STAND-INs.
 * No native membership, deployed room, public pages or audio is proved here. */
import type { Receipt, ScopeKind, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, scopeIdOf, textDigest, timeOf, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { browserRequests, meaningOf, requestKey, signedIntent, type BrowserRequestPorts, type Envelope } from "@generalbusiness/dap-client";
import { LENDING_DEFINITION } from "../pin.ts";
import { lendingTarget, type LendingIdentity } from "./custody.ts";
import { deviceSigner, newDeviceKey } from "./join.ts";
import { browserLock, custody, remembered } from "./storage.ts";

// A reference names a scope ID and a genesis hash, and no kind. The seed kind only varies the stand-in scope ID.
const ref = (kind: ScopeKind): ScopeRef => ({ scope: scopeIdOf({ v: 1, kind, definition: LENDING_DEFINITION, creator: null, cause: textDigest("PUBLIC TEST browser storage " + kind), ordinal: 0 }), genesis: textDigest("PUBLIC TEST browser storage genesis " + kind) });
let sends = 0;
async function mounted() {
  return browserLock.run(async () => {
    let held = await remembered.load();
    if (!held) { held = { v: 1, device: await newDeviceKey() }; await remembered.save(held); }
    const membership = ref("membership");
    const identity: LendingIdentity = { origin: location.origin, deployment: "PUBLIC TEST storage", scope: ref("lane"), definition: LENDING_DEFINITION, membership, member: { membership, member: "@browser" }, publicKey: held.device.publicKey };
    return { held, identity };
  });
}
const hash = async (value: unknown) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalize(value))))).map(b => b.toString(16).padStart(2, "0")).join("");
const requests = (identity: LendingIdentity, ports: Partial<BrowserRequestPorts> = {}) => browserRequests(custody, lendingTarget(identity), {
  current: () => true, post: async () => { sends++; throw Error("STAND-IN lost reply"); }, settle: async () => null, recorded: async () => false, ...ports });
const kept = async (identity: LendingIdentity) => (await requests(identity).unresolved()).at(-1) ?? null;
export const storageWitness = {
  async mount() { const { held } = await mounted(); return { publicKey: held.device.publicKey, privateExtractable: held.device.pair.privateKey.extractable }; },
  async loseReply() {
    const { held, identity } = await mounted();
    return browserLock.run(async () => {
      if (await kept(identity)) throw Error("A request is already kept");
      const key = requestKey();
      const build = async () => ({ binding: { definition: "lending", kind: "donate", declaration: null, pinned: LENDING_DEFINITION },
        envelope: { signed: await signedIntent(deviceSigner(held.device), { to: identity.scope, kind: "donate", fields: { name: "PUBLIC TEST Sieve", description: "Fine mesh." } }, { idempotencyKey: key }), beside: {} } as Envelope });
      const result = await requests(identity).send(key, meaningOf({ kind: "donate", name: "PUBLIC TEST Sieve" }), build, { notAfter: timeOf(Date.now() + 60_000) });
      const record = (await requests(identity).find(key))!;
      return { status: result.status, phase: record.phase, envelopeHash: await hash(record.envelope), sends };
    });
  },
  async kept() { const { identity } = await mounted(); const request = await kept(identity); return request ? { phase: request.record.phase, envelopeHash: await hash(request.record.envelope), validSignature: verifySignedIntent(request.record.envelope.signed) } : null; },
  async check() {
    const { identity } = await mounted();
    return browserLock.run(async () => {
      const request = (await kept(identity))!;
      const result = await requests(identity, { post: async () => { sends++; throw Error("Check must not send"); } }).settle(request.key);
      return { status: result?.status, sends, envelopeHash: await hash((await requests(identity).find(request.key))!.envelope) };
    });
  },
  async continueOriginal(current = true) {
    const { identity } = await mounted();
    return browserLock.run(async () => {
      const request = (await kept(identity))!;
      const before = await hash(request.record.envelope);
      const ports: Partial<BrowserRequestPorts> = { current: () => current,
        post: async envelope => {
          if (await hash(envelope) !== before) throw Error("Replacement envelope");
          sends++;
          const receipt: Receipt = { fact: { at: identity.scope, seq: 1, hash: textDigest("PUBLIC TEST scripted acceptance") }, definition: identity.definition,
            intent: intentDigest(envelope.signed.intent), effects: [], sends: [], epoch: 0 };
          return { answer: "accepted", receipt };
        },
        recorded: async (_receipt, envelope) => verifySignedIntent(envelope.signed) && await hash(envelope) === before };
      const result = await requests(identity, ports).send(request.key, request.record.meaning, async () => { throw Error("A kept request is never signed again"); }, { notAfter: timeOf(Date.now() + 60_000) }).catch(() => ({ status: "unknown" as const }));
      return { status: result.status, sends, envelopeHash: await hash((await requests(identity).find(request.key))!.envelope) };
    });
  },
};
