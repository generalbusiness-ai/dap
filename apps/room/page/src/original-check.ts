/**
 * The button **Check original request** and the lines above it
 * (notes/2026-10-31-signed-requests-across-devices.md, section 5). The page
 * reads a member's open copies, and it makes no signature here. A session
 * renewal is the one exception: `fresh` signs for a new session when the
 * current one has ended, as every read of the page does.
 *
 * One press takes one path. The page reads the copy's bytes and verifies the
 * signature and the actor's member, and otherwise sends nothing. It asks the
 * scope to settle the request. If the scope holds no entry, the page sends the
 * same bytes once, and only past the margin. Before the margin it says when to
 * check again.
 */
import type { Answer, Digest, Head, Receipt, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, isMemberRef } from "@generalbusiness/dap-bytes";
import { originalRequest, sendableAt, type OriginalRow } from "@generalbusiness/dap-client";
import type { ScopeSending } from "./shell.ts";
import { actAssociation, copiesOf, endOriginal, fresh, handleOf, itemsOf, nowOf, renewLost, sessionLost, summaryOf, type Acted, type Room } from "./data.ts";
import { atDirectory, rememberRows, rowsLastRead } from "./open-requests.ts";

export { lockedScopes } from "./open-requests.ts";

export type OriginalCheck =
  /** The scope holds the act's entry, and the page verified it. The copy ended. */
  | { state: "landed"; receipt: Receipt; after: Head | null }
  /** The scope refused the request. The copy ended. */
  | { state: "refused"; reason: string; name?: string }
  | { state: "archived" }
  | { state: "mismatch"; reason: string }
  /** The scope holds no entry, and the margin has not passed. This press sent nothing. */
  | { state: "waiting"; until: number }
  /** No answer: the copy stays open. */
  | { state: "unknown" }
  /** No open copy has this digest. */
  | { state: "gone" }
  /** The copy does not verify, or another member signed it. This press sent nothing. */
  | { state: "unverified" };

/** The member's open copies. `failed` says that the read failed, and then `rows` holds what this page read last. */
export interface OpenOriginals { rows: readonly OriginalRow[]; failed: boolean }
/** What the page says when a read fails. */
export const ORIGINALS_UNREAD = "This page could not read your open requests, so it shows the ones it read last. Check your connection. Each new request reads them first, and it goes only when that read works. The page reads them again each time a view opens.";

/**
 * The member's open copies. A failed read is not an empty list: the page keeps
 * the last rows it read, so the lock and the button stay. A page on signed
 * reads keeps no copy, and it has none to read.
 */
export async function openOriginals(room: Room): Promise<OpenOriginals> {
  const memory = actAssociation(room, room.membership.scope);
  try {
    await renewLost(room);
    await fresh(room);
    if (!sessionLost(room)) {
      const listed = await copiesOf(room)?.list();
      if (!listed) return { rows: [], failed: false };
      if (listed.ok) { rememberRows(memory, listed.rows); return { rows: listed.rows, failed: false }; }
    }
  } catch { /* A lost reply is a failed read. */ }
  return { rows: rowsLastRead(memory) ?? [], failed: true };
}

/**
 * The fences of this page that an answer can lift: the page's own request at
 * the row's scope. An opening act can sit under the directory. Only `landed`
 * and `refused` settle a request. `gone` shows nothing, because a missing row
 * does not show that no act was sent. `mismatch` and `archived` are fences on
 * the send path too. Another key's answer lifts nothing here.
 */
export function settledAssociations(room: Pick<Room, "session" | "key" | "directory" | "directoryIndex" | "membership">, row: OriginalRow, check: OriginalCheck): readonly string[] {
  if (row.actor !== room.key || (check.state !== "landed" && check.state !== "refused")) return [];
  return [actAssociation(room, row.to.scope), ...(atDirectory(room, row.to) ? [actAssociation(room, room.directory)] : [])];
}

/** Lifts those fences, each only if it holds this row's request. An older row lifts no newer request's fence. */
export function liftFences(room: Pick<Room, "session" | "key" | "directory" | "directoryIndex" | "membership">, row: OriginalRow, check: OriginalCheck, lastActs: Map<string, Acted>, sending: Pick<ScopeSending, "get" | "answered">): void {
  for (const association of settledAssociations(room, row, check)) {
    if (lastActs.get(association)?.digest === row.digest) lastActs.delete(association);
    const fence = sending.get(association);
    if (fence?.state === "unknown" && fence.digest === row.digest) sending.answered(association);
  }
}

/** The key that signed belongs to this page's member. Every state of the key counts: a revoked key's request stays the member's. */
async function actorIsMine(room: Room, actor: string): Promise<boolean> {
  const handle = handleOf(room, room.membership.scope);
  const { summary, at } = await summaryOf(handle);
  const keys = await itemsOf(room, handle, summary, "key", at);
  const key = keys.find(item => item.values["id"] === actor);
  const mine = room.me?.ref?.member;
  const member = summary.items.find(item => item.type === "member" && isMemberRef(item.parties["member"]) && item.parties["member"].member === mine);
  return key !== undefined && member !== undefined && key.refs["member"] === member.id;
}

async function landed(room: Room, handle: ReturnType<typeof handleOf>, signed: SignedIntent, receipt: Receipt, digest: Digest): Promise<OriginalCheck> {
  const followed = await handle.followReceipt(receipt);
  if (!followed.ok || followed.entry.input.type !== "act" || canonicalize(followed.entry.input.signed) !== canonicalize(signed)) return { state: "unknown" };
  await endOriginal(room, digest);
  let after: Head | null = null;
  try { after = (await summaryOf(handle, receipt)).at; } catch { /* The answer stands. The next view reads the scope again. */ }
  return { state: "landed", receipt, after };
}

async function answered(room: Room, handle: ReturnType<typeof handleOf>, signed: SignedIntent, answer: Answer, digest: Digest): Promise<OriginalCheck> {
  switch (answer.answer) {
    case "accepted": return landed(room, handle, signed, answer.receipt, digest);
    case "refused": await endOriginal(room, digest); return { state: "refused", reason: answer.reason, ...(answer.name ? { name: answer.name } : {}) };
    case "archived": await endOriginal(room, digest); return { state: "archived" };
    case "mismatch": await endOriginal(room, digest); return { state: "mismatch", reason: answer.reason };
    case "unavailable": return { state: "unknown" };
  }
}

/** One press of the button. It signs no act, and it sends the same bytes at most once. */
export async function checkOriginalRequest(room: Room, digest: Digest): Promise<OriginalCheck> {
  try {
    await fresh(room);
    const copies = copiesOf(room);
    if (!copies) return { state: "unknown" };
    const read = await copies.read(digest);
    if (!read.ok) return read.reason === "not-found" ? { state: "gone" } : { state: "unknown" };
    const request = originalRequest(read.bytes, digest);
    if (!request || !await actorIsMine(room, request.signed.intent.actor)) return { state: "unverified" };
    const { signed, beside } = request;
    const handle = handleOf(room, signed.intent.to.scope);
    const settled = await handle.settle(signed);
    if (settled.ok) return await landed(room, handle, signed, settled.value, digest);
    if (settled.reason === "archived") { await endOriginal(room, digest); return { state: "archived" }; }
    if (settled.reason !== "not-found") return { state: "unknown" };
    const until = sendableAt(signed.intent.notAfter);
    if (nowOf(room.session) < until) return { state: "waiting", until };
    return await answered(room, handle, signed, await handle.submit(signed, [], beside), digest);
  } catch { return { state: "unknown" }; } // A lost reply leaves the copy open.
}

/** The sentence for one open copy. */
export function originalLine(row: OriginalRow, room: Pick<Room, "key" | "directory" | "directoryIndex" | "rules" | "membership" | "commons">, lanes: readonly { scope: string; number: number | null; kind: "issue" | "pr" | null }[]): string {
  const what = row.kind === "comment" ? "a comment" : row.kind === "open-issue" ? "a new issue" : row.kind === "open-pr" ? "a new change" : `the action ${row.kind}`;
  const lane = lanes.find(item => item.scope === row.to.scope);
  const where = lane?.number != null && lane.kind ? `on ${lane.kind === "pr" ? "change" : "issue"} ${lane.number}`
    : atDirectory(room, row.to) ? "in this room"
    : row.to.scope === room.rules ? "on the rules"
    : row.to.scope === room.membership.scope ? "on the member list"
    : row.to.scope === room.commons?.scope ? "in Commons"
    : `on ${row.to.scope}`;
  return `You sent ${what} ${where} from ${row.actor === room.key ? "this device" : "another device"}. It has no answer yet.`;
}

/** The sentence for the result of one press. */
export function checkAnswerLine(check: OriginalCheck): string {
  switch (check.state) {
    case "landed": return `The request landed: entry ${check.receipt.fact.seq}.`;
    case "refused": return `The scope refused the request: ${check.reason}${check.name ? ` (${check.name})` : ""}. No entry exists for it.`;
    case "archived": return "The scope is archived. Read the archive for this request's result.";
    case "mismatch": return `The scope holds another request under this key: ${check.reason}.`;
    case "waiting": return `The scope holds no entry for this request yet. This check sent nothing, and an earlier send of this request can still arrive. Do not send it again as a new request. Check again after ${new Date(check.until).toISOString()}.`;
    case "unknown": return "The scope gave no answer. The request stays open. Check again.";
    case "gone": return "This request has no open copy.";
    case "unverified": return "This copy does not verify as your request. This check sent nothing, and it cannot say whether an earlier send went. Read the scope before you send this request again.";
  }
}
