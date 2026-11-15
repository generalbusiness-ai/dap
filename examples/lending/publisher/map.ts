/** The five shelf-page writes. The declared definition admits the fields; the fold resolves their recorded paths. */
import type { Entry } from "@generalbusiness/dap-contract";
import type { JournalRow } from "./fold.ts";

export const PUBLICATION_MAP = Object.freeze({
  donate: Object.freeze({ path: "page", content: "content", opening: null } as const),
  borrow: Object.freeze({ path: "page", content: "content", opening: "on" } as const),
  return: Object.freeze({ path: "page", content: "content", opening: "on" } as const),
  cancel: Object.freeze({ path: "page", content: "content", opening: "on" } as const),
  publish: Object.freeze({ path: "page", content: "content", opening: "thing" } as const),
});
export type PublicationKind = keyof typeof PUBLICATION_MAP;

function act(entry: Entry) {
  return entry.input.type === "act" ? entry.input.signed.intent : null;
}
function kind(entry: Entry): PublicationKind | null {
  const name = act(entry)?.kind;
  return name !== undefined && Object.hasOwn(PUBLICATION_MAP, name) ? name as PublicationKind : null;
}

export const isPublication = (row: JournalRow): boolean => kind(row.entry) !== null;

/** The thing's ID is the position of the donate entry that opened it. */
export function openingOf(row: JournalRow): number | null {
  const named = kind(row.entry), intent = act(row.entry);
  if (named === null || intent === null) return null;
  const source = PUBLICATION_MAP[named].opening;
  const id = source === "on" ? intent.on : source === "thing" ? intent.fields["thing"] : null;
  return typeof id === "number" && Number.isSafeInteger(id) && id >= 0 ? id : null;
}

/** `opening` comes from the same journal. Missing source data is an incomplete read, not an unwritable path. */
export function publicationWrite(row: JournalRow, opening: JournalRow | null): { path: unknown; content: unknown } | null {
  const named = kind(row.entry), intent = act(row.entry);
  if (named === null || intent === null) return null;
  const map = PUBLICATION_MAP[named];
  const opened = opening === null ? null : act(opening.entry);
  return { path: map.opening === null ? intent.fields[map.path] : opened?.fields[map.path], content: intent.fields[map.content] };
}
