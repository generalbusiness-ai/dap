/** W1 operator witness over a separately provisioned Commons room. */
import { lstatSync } from "node:fs";
import { join } from "node:path";
import type { FactRef, KeyId, Read, Receipt, ScopeRef, Summary } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, intentDigest, isKeyId, isRecord, isScopeRef, parseStrict, same, takeBytes, textDigest, utf8, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { ScopeHandle, loadCommons, notesAbout, type Fetch } from "@generalbusiness/dap-client";
import { COMMONS_COHORT } from "@generalbusiness/dap-platform";
import { McpService, identityId, type CustodyRecord, type Identity, type ConfigPort } from "@generalbusiness/dap-mcp";
import { fileStore } from "../../packages/cli/src/files.ts";
import { storedSigner } from "../../packages/cli/src/store-signer.ts";
import { durableCustody, flushFile, noLinks } from "./custody.ts";
import { DOCUMENTS, DOCUMENT_DIGESTS, FIXTURE_DIGEST, STEPS, noteFor, noteKey, type Note } from "./documents.ts";

type Actor = "member" | "agent";
type Kind = "register" | "directory" | "membership" | "rules" | "destination" | "commons";
export interface Input {
  v: 1; service: string; source: { head: string; tree: string };
  deployment: { name: string; version: string };
  room: Record<Kind, ScopeRef>;
  member: { key: KeyId; handle: string }; agent: { key: KeyId; handle: string };
  fixture: string;
}
export interface NoteResult { state: "accepted" | "unknown" | "blocked" | "missing"; key: string; fact?: FactRef }
export class WitnessRefusal extends Error {
  constructor(readonly reason: string) { super(`W1 refused: ${reason}`); }
}
const need = (value: unknown, reason: string): void => { if (!value) throw new WitnessRefusal(reason); };
const equal = (a: unknown, b: unknown) => canonicalize(a) === canonicalize(b);
const closed = (value: unknown, keys: readonly string[]): value is Record<string, unknown> => isRecord(value) && equal(Object.keys(value).sort(), [...keys].sort());
const KINDS: Kind[] = ["register", "directory", "membership", "rules", "destination", "commons"];

export function inputOf(value: unknown): Input {
  need(closed(value, ["v", "service", "source", "deployment", "room", "member", "agent", "fixture"]), "input-shape");
  const input = value as Input;
  const url = new URL(input.service);
  need(input.v === 1 && url.protocol === "https:" && url.origin === input.service && input.fixture === FIXTURE_DIGEST, "input-service-or-fixture");
  need(closed(input.source, ["head", "tree"]) && /^[a-f0-9]{40}$/.test(input.source.head) && /^[a-f0-9]{40}$/.test(input.source.tree), "input-source");
  need(closed(input.deployment, ["name", "version"]) && input.deployment.name === "dap-commons" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(input.deployment.version), "input-deployment");
  need(closed(input.room, KINDS) && KINDS.every(kind => isScopeRef(input.room[kind]) && input.room[kind].kind === kind), "input-room");
  for (const name of ["member", "agent"] as const) need(closed(input[name], ["key", "handle"]) && isKeyId(input[name].key) && /^@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(input[name].handle), "input-actor");
  need(input.member.key !== input.agent.key && input.member.handle !== input.agent.handle, "distinct-actors");
  return parseStrict(canonicalize(input)) as Input;
}

/** Local identity/original check before any check or explicit continuation. */
function bound(record: CustodyRecord, identity: Identity, note: Note): void {
  const signed = record.envelope.signed, intent = signed.intent;
  need(equal(record.identity, identity) && verifySignedIntent(signed) && intent.actor === identity.signer && intent.idempotencyKey === identity.key && same(intent.to, identity.target), "original-identity");
  need(record.binding.pinned === "platform:commons@1" && intent.kind === "note" && intent.on === null && equal(intent.expected, {})
    && equal(intent.fields, { text: textDigest(note.body), media: note.media, about: note.about })
    && !record.standalone && record.envelope.creation === undefined
    && equal(record.envelope.beside, { texts: [note.body] }), "original-meaning");
}
export async function accepted(service: McpService, identity: Identity, note: Note): Promise<{ record: CustodyRecord; receipt: Receipt } | null> {
  const record = await service.custody.find(identity);
  if (!record) return null;
  bound(record, identity, note);
  if (record.phase !== "accepted") return null;
  const outcome = await service.custody.decided(identityId(identity), record), answer = outcome?.answer;
  if (!answer || answer.answer !== "accepted") return null;
  const receipt = answer.receipt;
  need(receipt.definition === record.binding.pinned && same(receipt.fact.at, identity.target)
    && receipt.intent === intentDigest(record.envelope.signed.intent), "receipt-binding");
  return { record, receipt };
}

/** Exactly one fixed note identity. Check cannot call act. Continue first
 * settles and can resend only the maintained engine's existing original. */
export async function requestNote(service: McpService, identity: Identity, note: Note, mode: "new" | "check" | "continue"): Promise<NoteResult> {
  need(["new", "check", "continue"].includes(mode) && utf8(note.body).length <= 65536, "note-mode-or-size");
  const original = await service.custody.find(identity);
  if (original) bound(original, identity, note);
  if (mode === "new") need(!original, "original-exists");
  else if (!original) return { state: "missing", key: identity.key };
  if (mode !== "new") {
    await service.call("settle", { target: (identity.target as ScopeRef).scope, idempotencyKey: identity.key });
    const found = await accepted(service, identity, note);
    if (found) return { state: "accepted", key: identity.key, fact: found.receipt.fact };
    const current = await service.custody.find(identity);
    if (!current || ["refused", "mismatch", "archived", "settled"].includes(current.phase)) return { state: "blocked", key: identity.key };
    if (mode === "check") return { state: "unknown", key: identity.key };
  }
  // Raw body is intentional: maintained MCP shaping hashes the detached
  // field and retains that exact body beside the signed intent.
  await service.call("act", { target: (identity.target as ScopeRef).scope, digest: "platform:commons@1", kind: "note",
    fields: { text: note.body, media: note.media, about: note.about }, idempotencyKey: identity.key });
  const found = await accepted(service, identity, note);
  if (found) return { state: "accepted", key: identity.key, fact: found.receipt.fact };
  const current = await service.custody.find(identity);
  return { state: current && ["refused", "mismatch", "archived", "settled"].includes(current.phase) ? "blocked" : "unknown", key: identity.key };
}

async function open(input: Input, home: string, who: Actor, fetch: Fetch) {
  noLinks(home);
  const st = lstatSync(home);
  need(st.isDirectory() && st.uid === process.getuid?.() && (st.mode & 0o777) === 0o700, "home-custody");
  noLinks(join(home, "config.json"));
  const configStat = lstatSync(join(home, "config.json"));
  need(configStat.isFile() && configStat.nlink === 1 && configStat.uid === process.getuid?.() && (configStat.mode & 0o777) === 0o600 && configStat.size <= 65536, "config-custody");
  const store = fileStore(home), config = await store.config();
  need(config && config.service === input.service && config.handle === input[who].handle && config.repository
    && same(config.repository.directory, input.room.directory) && same(config.repository.membership, input.room.membership)
    && config.repository.rules === input.room.rules.scope && config.repository.destination === input.room.destination.scope, "configured-room");
  if (!config) throw new WitnessRefusal("missing-config");
  noLinks(join(home, "keys", `${config.key}.key`));
  const keyStat = lstatSync(join(home, "keys", `${config.key}.key`));
  need(keyStat.isFile() && keyStat.nlink === 1 && keyStat.uid === process.getuid?.() && (keyStat.mode & 0o777) === 0o600 && keyStat.size <= 128, "key-custody");
  const signer = await storedSigner(store, config.key);
  need(signer?.key === input[who].key, "configured-key");
  if (!signer) throw new WitnessRefusal("missing-signer");
  const identity = (step: string): Identity => ({ service: input.service, membership: input.room.membership, signer: signer.key, target: input.room.commons, key: noteKey(step) });
  const base = durableCustody(join(home, "private", "mcp-custody"));
  const service = new McpService({ service: input.service, signer, fetch, mode: "generic", config: {
    read: async () => { need(equal(await store.config(), config), "configuration-changed"); return config; },
    addRoot: async () => { throw new WitnessRefusal("unexpected-config-write"); },
  } satisfies ConfigPort, custody: { ...base, write: async (id, record, options) => {
    need(record.identity.service === input.service && same(record.identity.membership, input.room.membership)
      && same(record.identity.target, input.room.commons) && record.identity.signer === signer.key, "dispatch-binding");
    await base.write(id, record, options);
  } } });
  const read = async <T>(work: (handle: ScopeHandle) => Promise<Read<T>>, at = input.room.commons): Promise<Read<T>> => service.reads.read(input.room.membership,
    (transport, reader) => work(new ScopeHandle(transport, at.scope, reader)));
  const handle = async (): Promise<ScopeHandle> => {
    const reader = await service.reads.reader(input.room.membership);
    need(reader, "member-session-required");
    return new ScopeHandle(service.reads.transport, input.room.commons.scope, reader);
  };
  const retainInput = async (create: boolean) => {
    const old = await store.private("bo1-w1-input"), body = canonicalize(input);
    if (old) need(new TextDecoder().decode(old) === body, "changed-private-input");
    else { need(create, "missing-private-input"); await store.keepPrivate("bo1-w1-input", utf8(body)); }
    flushFile(join(home, "private", "bo1-w1-input.data"));
  };
  return { service, identity, read, handle, retainInput };
}
type Open = Awaited<ReturnType<typeof open>>;
async function verifiedFact(actor: Open, step: string, note: Note): Promise<FactRef> {
  const found = await accepted(actor.service, actor.identity(step), note);
  need(found, "prior-note-not-accepted");
  if (!found) throw new WitnessRefusal("prior-note-not-accepted");
  const read = await (await actor.handle()).followReceipt(found.receipt);
  need(read.ok, "receipt-entry-unreadable");
  if (!read.ok) throw new WitnessRefusal("receipt-entry-unreadable");
  need(read.entry.input.type === "act" && equal(read.entry.input.signed, found.record.envelope.signed), "receipt-original-mismatch");
  const text = await actor.read(handle => handle.text(textDigest(note.body)));
  need(text.ok && text.value === note.body, "retained-body-mismatch");
  return found.receipt.fact;
}

async function preflight(input: Input, actors: Record<Actor, Open>): Promise<void> {
  const summaries = new Map<Kind, Summary>();
  for (const kind of KINDS) {
    const ref = input.room[kind], summary = await actors.member.read(handle => handle.summary(), ref);
    need(summary.ok && summary.complete && summary.next === undefined && same(summary.value.scope, ref)
      && summary.value.status === "active" && summary.value.definition === COMMONS_COHORT[kind], "room-pin-or-read");
    if (!summary.ok) throw new WitnessRefusal("room-pin-or-read");
    summaries.set(kind, summary.value);
    const birth = await actors.member.read(handle => handle.entry(0), ref);
    need(birth.ok && entryHash(birth.value.entry) === birth.value.hash && same(birth.value.entry.at, ref)
      && birth.value.entry.input.type === "genesis" && birth.value.entry.input.decision === "applied"
      && birth.value.entry.input.seed.definition === COMMONS_COHORT[kind]
      && same(birth.value.entry.input.seed.creator, kind === "register" ? null : kind === "directory" ? input.room.register : input.room.directory), "room-genesis");
  }
  const directory = summaries.get("directory")!, repository = directory.items.find(item => item.type === "repository");
  for (const kind of ["membership", "rules", "destination", "commons"] as const) need(same(repository?.refs[kind], input.room[kind]), "directory-sibling");
  const membership = summaries.get("membership")!, personRef = { membership: input.room.membership, member: input.member.handle };
  const roster = membership.items.find(item => item.type === "roster");
  for (const who of ["member", "agent"] as const) {
    const keys = membership.items.filter(item => item.type === "key" && item.state === "active" && item.values["id"] === input[who].key);
    need(keys.length === 1, "member-key");
    const member = membership.items.find(item => item.type === "member" && item.id === keys[0]?.refs["member"]);
    need(member?.state === "active" && member.values["handle"] === input[who].handle && member.values["kind"] === (who === "member" ? "person" : "agent")
      && same(member.parties["member"], { membership: input.room.membership, member: input[who].handle }), "member-kind-or-identity");
    need(who !== "agent" || member?.values["role"] === "agent" && same(member.parties["controller"], personRef), "agent-controller");
    need(who !== "member" || ["member", "maintainer", "admin"].includes(String(member?.values["role"])), "person-member-role");
    const actions = roster?.values[`${String(member?.values["role"])}Actions`];
    need(Array.isArray(actions) && actions.includes("commons.write"), "commons-write-standing");
    const visible = await actors[who].read(handle => handle.summary());
    need(visible.ok && same(visible.value.scope, input.room.commons), "actor-commons-read");
  }
}

/** One invocation admits one note at most. Source/deployment custody is the
 * operator's pinned input plus outer capture, not inferred from health. */
export async function runWitness(input: Input, homes: Record<Actor, string>, step: string, mode: "new" | "check" | "continue", supplied?: Fetch) {
  input = inputOf(input);
  need(["preflight", "verify", ...STEPS].includes(step), "unknown-step");
  let calls = 0, closed = false;
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 120_000);
  const fetch: Fetch = async (url, init) => {
    need(!closed && !controller.signal.aborted && ++calls <= 128 && new URL(url).origin === input.service, "request-bound");
    const send = supplied ?? globalThis.fetch as unknown as Fetch;
    const signal = init?.signal ? AbortSignal.any([controller.signal, init.signal as AbortSignal]) : controller.signal;
    return send(url, { ...init, signal: signal as never });
  };
  try {
    const health = await fetch(input.service + "/health");
    const healthBytes = health.body ? await takeBytes(health.body, 65536, controller.signal) : null;
    if (health.status !== 200 || !(healthBytes instanceof Uint8Array)) throw new WitnessRefusal("health-bound");
    const healthBody = new TextDecoder("utf-8", { fatal: true }).decode(healthBytes);
    const live: unknown = parseStrict(healthBody);
    need(isRecord(live) && live["deployment"] === input.deployment.name && live["version"] === input.deployment.version && live["sessions"] === "ok" && live["register"] === "ready", "health-mismatch");
    const actors = { member: await open(input, homes.member, "member", fetch), agent: await open(input, homes.agent, "agent", fetch) };
    await preflight(input, actors);
    if (step === "preflight") return { state: "preflight-verified", calls, fixture: FIXTURE_DIGEST };
    const facts = new Map<string, FactRef>(), notes = new Map<string, Note>();
    const limit = step === "verify" ? STEPS.length : STEPS.indexOf(step);
    for (const previous of STEPS.slice(0, limit)) {
      const note = noteFor(previous, facts); notes.set(previous, note);
      facts.set(previous, await verifiedFact(actors[note.actor], previous, note));
    }
    if (step === "verify") {
      const view = await loadCommons(await actors.member.handle(), input.room.commons);
      need(view.complete && !view.next && view.unreadable.length === 0 && view.notes.length === 23, "complete-23-note-reading");
      for (const name of STEPS) {
        const note = notes.get(name)!, actual = view.notes.find(value => same(value.fact, facts.get(name)));
        need(actual && actual.key === input[note.actor].key && same(actual.author, { membership: input.room.membership, member: input[note.actor].handle })
          && actual.text === note.body && actual.media === note.media && equal(actual.about, note.about), "note-author-or-content");
      }
      for (const document of ["bill", "statement"] as const) {
        const related = notesAbout(view, { document: DOCUMENT_DIGESTS[document] });
        need(related.length === 20 && related.filter(note => note.key === input.member.key).length === 4, "document-citation-graph");
      }
      return { state: "23-notes-verified", calls, notes: facts.size, fixture: FIXTURE_DIGEST, documents: DOCUMENT_DIGESTS,
        qualification: "Actual receipt/text/author/citation reads only. Hosted browser table and document rendering require their own retained observation. No File/Capture/upload or PDF/page claim." };
    }
    const note = noteFor(step, facts), actor = actors[note.actor];
    await actor.retainInput(mode === "new");
    const answer = await requestNote(actor.service, actor.identity(step), note, mode);
    if (answer.state === "accepted") need(same(await verifiedFact(actor, step, note), answer.fact), "accepted-fact-readback");
    return { ...answer, step, actor: note.actor, calls, textDigest: textDigest(note.body) };
  } finally {
    closed = true; controller.abort(); clearTimeout(timer);
    // No subscriptions or child processes exist. Abort is not proof of
    // physical HTTP drain; the outer operator capture owns process closure.
  }
}

export const witnessDescription = { steps: STEPS, fixture: FIXTURE_DIGEST, documents: DOCUMENT_DIGESTS,
  textBytes: Object.fromEntries(Object.entries(DOCUMENTS).map(([name, body]) => [name, utf8(body).length])) };
