import { isInvitationMembership, isInvitationRedemptionFields } from "@generalbusiness/dap-client";
/** One bounded origin-private enrollment slot; private signing keys live in IDB. */
import type { Answer, KeyId, Receipt } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, intentDigest, isHead, isKeyId, isReceipt, isScopeId, isScopeRef, isSignedIntentShape, keyIdOfSecret, unb64url, verifySignedIntent } from "@generalbusiness/dap-bytes";
import type { Fetch, Signer } from "@generalbusiness/dap-client";
import { pageKeyStore } from "./browser-key-store.ts";
import { closedCustodyRecord as closed, custodyKind } from "./custody.ts";
import { invitationTarget, prepareJoin, settleJoin, submitJoin, verifyJoinReceipt, type Place, type PreparedJoin, type Session } from "./data.ts";

export interface JoinStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface JoinLock { run<T>(work: () => Promise<T>): Promise<T> }
export interface JoinOptions { secret?: Uint8Array; fetch?: Fetch; now?: () => number; current?: () => boolean; lock?: JoinLock; keys?: ReturnType<typeof pageKeyStore> }
export interface OriginalJoin { status: "prepared" | "unknown" | "refused" | "verified"; key: KeyId; place: Place; handle: string }
export type JoinResult = (Omit<OriginalJoin, "status"> & { status: "unknown" | "refused" | "blocked"; reason: string; answer?: Answer }) | (Omit<OriginalJoin, "status"> & { status: "verified"; signer: Signer; answer: Extract<Answer, { answer: "accepted" }> });
interface PriorRefusal { prepared: PreparedJoin; refusal: Extract<Answer, { answer: "refused" }> }
interface RecordJoin { history?: PriorRefusal[]; v: 1 | 2; origin: string; secret?: string; publicKey?: KeyId; prepared: PreparedJoin; phase: OriginalJoin["status"]; receipt?: Receipt; refusal?: Extract<Answer, { answer: "refused" }> }
const MOST = 64 * 1024, MAX_REFUSALS = 8;
const error = () => new Error("The original private enrollment is unavailable or no longer current. Nothing was replaced.");
function decode(raw: string, origin: string): RecordJoin {
  let seed: Uint8Array | null = null;
  try {
    const row: unknown = JSON.parse(raw);
    if (!closed(row, ["v", "origin", "prepared", "phase"], ["secret", "publicKey", "receipt", "refusal", "history"]) || ![1, 2].includes(Number(row["v"])) || row["origin"] !== origin || !["prepared", "unknown", "refused", "verified"].includes(String(row["phase"]))) throw error();
    let key: KeyId;
    if (row["v"] === 1) {
      if (typeof row["secret"] !== "string" || row["publicKey"] !== undefined) throw error();
      seed = unb64url(row["secret"]);
      if (!seed || seed.length !== 32 || b64url(seed) !== row["secret"]) throw error();
      key = keyIdOfSecret(seed);
    } else {
      if (row["secret"] !== undefined || !isKeyId(row["publicKey"])) throw error();
      key = row["publicKey"];
    }
    const p = row["prepared"];
    if (!closed(p, ["place", "definition", "handle", "link", "signed"]) || !closed(p["place"], ["directory", "membership"]) || !isScopeId(p["place"]["directory"]) || !isScopeRef(p["place"]["membership"]) || p["place"]["membership"].kind !== "membership" || !isInvitationMembership(p["definition"]) || typeof p["handle"] !== "string" || !p["handle"] || typeof p["link"] !== "string" || !/^sha256:[0-9a-f]{64}$/.test(p["link"]) || !isSignedIntentShape(p["signed"]) || !verifySignedIntent(p["signed"]) || p["signed"].intent.actor !== key || p["signed"].intent.kind !== "join" || canonicalize(p["signed"].intent.to) !== canonicalize(p["place"]["membership"]) || Object.keys(p["signed"].intent.expected).length !== 0 || !isInvitationRedemptionFields(String(p["definition"]), p["signed"].intent.fields)) throw error();
    seed?.fill(0);
    if (row["receipt"] !== undefined && (!isReceipt(row["receipt"]) || row["receipt"].definition !== p["definition"] || row["receipt"].intent !== intentDigest(p["signed"].intent) || canonicalize(row["receipt"].fact.at) !== canonicalize(p["place"]["membership"]))) throw error();
    if (row["phase"] === "verified" && !row["receipt"]) throw error();
    if (row["refusal"] !== undefined && (!closed(row["refusal"], ["answer", "reason", "judgedAt"], ["name"]) || row["refusal"]["answer"] !== "refused" || typeof row["refusal"]["reason"] !== "string" || !isHead(row["refusal"]["judgedAt"]))) throw error();
    if (row["phase"] === "refused" && !row["refusal"]) throw error();
    if (row["history"] !== undefined) {
      if (!Array.isArray(row["history"]) || row["history"].length > MAX_REFUSALS) throw error();
      for (const prior of row["history"]) {
        if (!closed(prior, ["prepared", "refusal"])) throw error();
        // Each retained request must still verify under this same origin/key.
        // No nested history is admitted and no original signed bytes change.
        const bytes = canonicalize({ v: row["v"], origin, ...(row["v"] === 1 ? { secret: row["secret"] } : { publicKey: key }), prepared: prior["prepared"], phase: "refused", refusal: prior["refusal"] });
        read(origin, { getItem: () => bytes, setItem: () => { throw error(); } });
      }
    }
    return row as unknown as RecordJoin;
  } catch { throw error(); } finally { seed?.fill(0); }
}
function locked<T>(origin: string, options: JoinOptions, work: () => Promise<T>): Promise<T> {
  if (options.lock) return options.lock.run(work);
  const locks = (globalThis as unknown as { navigator?: { locks?: {
    request<T>(name: string, work: () => Promise<T>): Promise<T>;
  } } }).navigator?.locks;
  if (!locks) throw new Error("Private enrollment locking is unavailable. Nothing was submitted.");
  return locks.request(`artroom-page-enrollment:${origin}`, work);
}
function publicOf(row: RecordJoin): OriginalJoin {
  const seed = row.secret === undefined ? null : unb64url(row.secret)!;
  try { return { status: row.phase, key: row.publicKey ?? keyIdOfSecret(seed!), place: structuredClone(row.prepared.place), handle: row.prepared.handle }; }
  finally { seed?.fill(0); }
}
const custody = custodyKind<RecordJoin, OriginalJoin>({
  kind: "join", prefix: "artroom-page-enrollment", most: MOST, sameOrigin: true,
  unavailable: error, bindingOf: row => row.origin, decode, publicOf
});
const { read, write, current, originOf } = custody;
export function originalJoin(origin: string, storage: JoinStorage): OriginalJoin | null { return custody.original(origin, storage); }
/** Local-only first-load migration: no enrollment/check/transport is invoked. */
export async function migrateOriginalJoin(origin: string, storage: JoinStorage, options: JoinOptions = {}): Promise<void> {
  originOf(origin);
  await locked(origin, options, async () => { current(options); const row = read(origin, storage); if (row) await migrate(row, storage, options); });
}
async function sessionOf(row: RecordJoin, options: JoinOptions): Promise<Session> { return { service: row.origin, signer: await (options.keys ?? pageKeyStore()).load(publicOf(row).key), ...(options.fetch ? { fetch: options.fetch } : {}), ...(options.now ? { now: options.now } : {}) }; }
async function migrate(row: RecordJoin, storage: JoinStorage, options: JoinOptions): Promise<RecordJoin> {
  if (row.v === 2) return row;
  const expected = canonicalize(row);
  let saved: RecordJoin | undefined;
  await (options.keys ?? pageKeyStore()).migrate({ seed: row.secret!, current: () => options.current?.() !== false && canonicalize(read(row.origin, storage)) === expected, removeSecret: publicKey => {
    const { secret: _secret, ...rest } = row;
    saved = write({ ...rest, v: 2, publicKey }, storage, options);
  } });
  if (!saved) throw error(); return saved;
}
const unknown = (row: RecordJoin, reason: string): JoinResult => ({ ...publicOf(row), status: "unknown", reason });
async function checked(row: RecordJoin, storage: JoinStorage, options: JoinOptions): Promise<JoinResult> {
  current(options);
  row = await migrate(row, storage, options);
  if (row.phase === "refused") return { ...publicOf(row), status: "refused", reason: `Refused because ${row.refusal!.reason}.`, answer: row.refusal! };
  const session = await sessionOf(row, options);
  try {
    const receipt = await settleJoin(session, row.prepared); current(options);
    if (!receipt || !await verifyJoinReceipt(session, row.prepared, receipt)) return unknown(row, "The original enrollment remains unknown. No replacement was sent.");
    current(options);
    const saved = write({ ...row, phase: "verified", receipt }, storage, options);
    return { ...publicOf(saved), status: "verified", signer: session.signer!, answer: { answer: "accepted", receipt } };
  } catch { current(options); return unknown(row, "The original enrollment could not be checked. No replacement was sent."); }
}
export async function checkOriginal(origin: string, storage: JoinStorage, options: JoinOptions = {}): Promise<JoinResult | null> {
  originOf(origin);
  return locked(origin, options, async () => { current(options); const row = read(origin, storage); return row ? checked(row, storage, options) : null; });
}
export async function joinInvitation(origin: string, invitation: string, storage: JoinStorage, options: JoinOptions = {}): Promise<JoinResult> {
  originOf(origin);
  const target = invitationTarget(origin, invitation);
  return locked(origin, options, async () => {
    current(options);
    let row = read(origin, storage);
    if (row) row = await migrate(row, storage, options);
    // Only a terminal current slot may expose an archived terminal answer.
    // Unknown/prepared custody must remain the UI's unresolved original.
    if (row && (row.phase === "refused" || row.phase === "verified")) {
      const prior = row.history?.find(prior => prior.prepared.link === target.link);
      if (prior) return {
        ...publicOf(row), place: structuredClone(prior.prepared.place), handle: prior.prepared.handle,
        status: "refused", reason: `Refused because ${prior.refusal.reason}.`, answer: structuredClone(prior.refusal)
      };
    }
    if (row?.phase === "refused") {
      if (row.prepared.link === target.link) return checked(row, storage, options);
      if ((row.history?.length ?? 0) >= MAX_REFUSALS) throw new Error("Private enrollment refusal history is full. Nothing was replaced.");
      {
        const prepared = await prepareJoin(await sessionOf(row, options), invitation);
        current(options);
        const history = [...(row.history ?? []), { prepared: row.prepared, refusal: row.refusal! }];
        row = write({ v: 2, origin, publicKey: publicOf(row).key, prepared, phase: "prepared", history }, storage, options);
      }
    }
    if (row && row.phase !== "prepared" && row.phase !== "verified") return unknown(row, "The original enrollment is retained. Check its status before another invitation.");
    if (row && row.prepared.link !== target.link) {
      if (row.phase !== "verified") return { ...publicOf(row), status: "blocked", reason: "Another original enrollment is retained. Nothing was replaced." };
      const prior = await checked(row, storage, options);
      if (prior.status !== "verified") return prior;
      row = null;
    }
    if (row?.phase === "verified") return checked(row, storage, options);
    if (!row) {
      const keys = options.keys ?? pageKeyStore();
      const signer = options.secret ? await keys.migrate({ seed: b64url(options.secret), current: () => options.current?.() !== false && read(origin, storage) === null, removeSecret: () => {} }) : await keys.create();
      {
        const prepared = await prepareJoin({ service: origin, signer, ...(options.now ? { now: options.now } : {}) }, invitation);
        current(options);
        row = write({ v: 2, origin, publicKey: signer.key, prepared, phase: "prepared" }, storage, options);
      }
    }
    // Read back the complete key/envelope before marking dispatch ambiguous,
    // then read back that marker before the only allowed first submission.
    row = write({ ...row, phase: "unknown" }, storage, options);
    const session = await sessionOf(row, options);
    try {
      current(options);
      const answer = await submitJoin(session, row.prepared); current(options);
      if (answer.answer === "refused") {
        const saved = write({ ...row, phase: "refused", refusal: answer }, storage, options);
        return { ...publicOf(saved), status: "refused", reason: `Refused because ${answer.reason}.`, answer };
      }
      if (answer.answer !== "accepted") return unknown(row, "The original enrollment remains unknown. Check its original request; no replacement will be sent.");
      row = write({ ...row, receipt: answer.receipt }, storage, options);
      if (!await verifyJoinReceipt(session, row.prepared, answer.receipt)) return unknown(row, "The original accepted enrollment could not be verified. Check its status.");
      current(options);
      const saved = write({ ...row, phase: "verified" }, storage, options);
      return { ...publicOf(saved), status: "verified", signer: session.signer!, answer };
    } catch { return unknown(row, "The original enrollment remains unknown. Check its status; nothing was replaced."); }
  });
}
