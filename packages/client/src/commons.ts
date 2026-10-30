/** Bounded readings of Commons entries. Citations grant no read authority. */
import type { Digest, FactRef, Head, KeyId, MemberRef, ReferenceValue, ScopeRef, Sealed, Summary } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, factRefOf, isDigest, isMemberRef, isReference, isScopeRef, same, utf8, verifySignedIntent } from "@generalbusiness/dap-bytes";
import type { ScopeHandle } from "./handle.ts";

export const COMMONS_READ_LIMITS = { pages: 2, entries: 400, textBytes: 1024 * 1024 } as const;
export interface CommonsNote {
  fact: FactRef; author: MemberRef | null; key: KeyId; time: string;
  textDigest: Digest; media: string; about: ReferenceValue[]; text: string | null;
}
export interface CommonsView {
  scope: ScopeRef; head: Head; notes: CommonsNote[];
  complete: boolean; next?: string; unreadable: string[];
  /** Current display labels only; immutable authors remain note.author. */
  authorLabels?: Record<string, { handle: string; kind: "person" | "agent" | "checker" }>;
}
/** Host preflight only. Older native directory versions remain unchanged. */
export function commonsInstallCheck(directory: Summary, requires: readonly string[] | undefined): { ok: true; commons: ScopeRef | null } | { ok: false; reason: "commons-missing" } {
  const repository = directory.items.find(item => item.type === "repository");
  const ref = repository?.refs["commons"];
  const commons = directory.status === "active" && isScopeRef(ref) && ref.kind === "commons" ? ref : null;
  return requires?.includes("commons") && commons === null ? { ok: false, reason: "commons-missing" } : { ok: true, commons };
}

/** Fragments stay outside the closed FactRef. No fragment interpretation or
 * current-member lookup changes the identity of a source or its author. */
export function commonsReferenceKey(reference: ReferenceValue, whole = false): string {
  return canonicalize({ ...("document" in reference ? { document: reference.document } : { entry: reference.entry }), ...(!whole && reference.fragment !== undefined ? { fragment: reference.fragment } : {}) });
}
export function notesAbout(view: CommonsView, reference: ReferenceValue): CommonsNote[] {
  const selected = new Set<string>(), result: CommonsNote[] = [];
  const matches = (about: ReferenceValue, target: ReferenceValue) => commonsReferenceKey(about, target.fragment === undefined) === commonsReferenceKey(target, target.fragment === undefined);
  const targets: ReferenceValue[] = [reference];
  // At most one visit per retained note. Cycles and repeated citations do not
  // grow a thread; this is only a reading of the bounded loaded window.
  for (let n = 0; n < targets.length; n++) for (const note of view.notes) {
    const key = commonsReferenceKey({ entry: note.fact });
    if (!selected.has(key) && note.about.some(about => matches(about, targets[n]!))) {
      selected.add(key); result.push(note); targets.push({ entry: note.fact });
    }
  }
  return result.sort((a, b) => a.fact.seq - b.fact.seq);
}

function noteOf(sealed: Sealed, scope: ScopeRef): Omit<CommonsNote, "text"> | null {
  const entry = sealed.entry, input = entry.input;
  if (!same(entry.at, scope) || entryHash(entry) !== sealed.hash) throw Error("Commons entry identity is unavailable.");
  if (input.type !== "act" || input.signed.intent.kind !== "note") return null;
  const fields = input.signed.intent.fields;
  if (!verifySignedIntent(input.signed) || !same(input.signed.intent.to, scope) || !isDigest(fields["text"]) || typeof fields["media"] !== "string" || utf8(fields["media"]).length > 255 || !Array.isArray(fields["about"]) || fields["about"].length > 64 || !fields["about"].every(reference => isReference(reference, 512))) throw Error("Commons note fields are unavailable.");
  const key = input.signed.intent.actor, grants = input.authority.filter(grant => grant.key === key);
  const author = grants.length === 1 && isMemberRef(grants[0]!.subject) ? grants[0]!.subject : null;
  return { fact: factRefOf(entry), key, author, time: entry.time, textDigest: fields["text"], media: fields["media"], about: JSON.parse(canonicalize(fields["about"])) as ReferenceValue[] };
}

/** A finite history window plus hash-checked detached texts. `complete` means
 * the whole history and all text in this window were read, from its start.
 * No referenced room or document is fetched through another member's rights. */
export async function loadCommons(handle: ScopeHandle, scope: ScopeRef, options: { cursor?: string } = {}): Promise<CommonsView> {
  const initial = await handle.summary();
  if (!initial.ok || !initial.complete || initial.next !== undefined || !same(initial.value.scope, scope) || initial.value.definition !== "platform:commons@1" || initial.value.status !== "active") throw Error("The exact active Commons could not be read.");
  const view: CommonsView = { scope, head: initial.at, notes: [], complete: false, unreadable: [] };
  let cursor = options.cursor, last = -1, previousHash: Digest | null = null, entries = 0, textBytes = 0, ended = false, firstHead: Head | null = null;
  for (let page = 0; page < COMMONS_READ_LIMITS.pages; page++) {
    let read: Awaited<ReturnType<ScopeHandle["history"]>>;
    try { read = await handle.history(cursor); } catch { view.unreadable.push("The history reply is unavailable."); break; }
    if (!read.ok) { view.unreadable.push(`The history read refused: ${read.reason}.`); break; }
    firstHead ??= read.at; view.head = firstHead;
    if (!same(firstHead, read.at)) { view.unreadable.push("The history changed during this window. Read it again."); break; }
    for (const sealed of read.value) {
      const entry = sealed.entry;
      if (++entries > COMMONS_READ_LIMITS.entries || entry.seq > firstHead.seq) { view.unreadable.push("The history window exceeds its selected head or allowance."); return view; }
      try {
        if (!same(entry.at, scope) || entryHash(entry) !== sealed.hash) throw Error();
      } catch { view.unreadable.push("A history entry hash or scope is unavailable."); return view; }
      if (last === -1 ? options.cursor === undefined && (entry.seq !== 0 || entry.prev !== null || entry.input.type !== "genesis") : entry.seq !== last + 1 || entry.prev !== previousHash) {
        view.unreadable.push("The history has a gap or lacks its genesis. Earlier or archived entries are not assumed."); return view;
      }
      last = entry.seq; previousHash = sealed.hash;
      let note: Omit<CommonsNote, "text"> | null;
      try { note = noteOf(sealed, scope); } catch { view.unreadable.push(`Entry ${last} could not be verified.`); continue; }
      if (!note) continue;
      let text: string | null = null;
      if (textBytes + 65536 > COMMONS_READ_LIMITS.textBytes) view.unreadable.push(`Text of entry ${last} exceeds this reading's text allowance.`);
      else {
        try {
          const digest = (sealed.entry.input as Extract<typeof sealed.entry.input, { type: "act" }>).signed.intent.fields["text"] as Digest;
          const body = await handle.text(digest);
          if (body.ok && utf8(body.value).length <= 65536) { text = body.value; textBytes += utf8(text).length; }
        } catch { /* A failed text read remains visibly unavailable. */ }
        if (text === null) view.unreadable.push(`Text of entry ${last} is unavailable.`);
      }
      if (note.author === null) view.unreadable.push(`The native author of entry ${last} is unavailable.`);
      view.notes.push({ ...note, text });
    }
    if (read.complete && read.next === undefined) {
      if (last !== firstHead.seq || previousHash !== firstHead.hash) view.unreadable.push("The history does not close at its stated head.");
      else ended = true;
      break;
    }
    if (read.next === undefined || read.next === cursor) { view.unreadable.push("The history continuation is unavailable."); break; }
    cursor = read.next;
    view.next = cursor;
  }
  if (!ended && view.unreadable.length === 0) view.unreadable.push("Earlier or later notes fall outside this bounded window.");
  if (ended) delete view.next;
  view.complete = ended && options.cursor === undefined && view.unreadable.length === 0;
  return view;
}

/** Labels from one actual membership summary; no controller becomes author.
 * Ambiguous, foreign or unavailable identities retain their full native ref. */
export function commonsAuthorLabels(view: CommonsView, membership: Summary): NonNullable<CommonsView["authorLabels"]> {
  const labels: NonNullable<CommonsView["authorLabels"]> = {};
  for (const note of view.notes) {
    if (!note.author || !same(note.author.membership, membership.scope)) continue;
    const matches = membership.items.filter(item => item.type === "member" && same(item.parties["member"], note.author));
    const item = matches.length === 1 ? matches[0] : undefined, kind = item?.values["kind"], handle = item?.values["handle"];
    if (handle === note.author.member && (kind === "person" || kind === "agent" || kind === "checker")) labels[canonicalize(note.author)] = { handle, kind };
  }
  return labels;
}
