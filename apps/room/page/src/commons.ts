/** Commons presentation reads notes; it declares no view and grants no act. */
import type { ReferenceValue } from "@generalbusiness/dap-contract";
import { canonicalize, isReference, parseStrict } from "@generalbusiness/dap-bytes";
import { notesAbout, type CommonsNote, type CommonsView } from "@generalbusiness/dap-client";
import { h } from "./view.ts";
import { actionForm, type ActionContext, type Send } from "./actions.ts";
import type { Offered } from "./data.ts";

export function commonsSelection(encoded: string | null): ReferenceValue | null {
  if (encoded === null) return null;
  const value = parseStrict(decodeURIComponent(encoded));
  if (!isReference(value, 512)) throw Error("The selected reference is invalid.");
  return value;
}
export function commonsLink(reference: ReferenceValue): string { return `#/commons/${encodeURIComponent(canonicalize(reference))}`; }
const authorRef = (note: CommonsNote): string => note.author ? `${note.author.member} (${note.author.membership.scope}, ${note.author.membership.inc})` : "Native author unavailable";
const author = (view: CommonsView, note: CommonsNote): string => {
  const label = note.author ? view.authorLabels?.[canonicalize(note.author)] : undefined;
  return label ? `${label.handle} (${label.kind})` : authorRef(note);
};
const referenceText = (reference: ReferenceValue): string => `${"document" in reference ? `Document ${reference.document}` : `Entry ${reference.entry.seq} in ${reference.entry.at.scope}`} ${reference.fragment === undefined ? "" : `#${reference.fragment}`}`.trim();
const references = (note: CommonsNote): HTMLElement => h("ul", { class: "commons-references" }, note.about.map(reference => h("li", {}, h("a", { href: commonsLink(reference) }, referenceText(reference)))));
function rowData(note: CommonsNote): Record<string, unknown> | null {
  if (note.text === null || note.media.split(";")[0]!.trim().toLowerCase() !== "application/json") return null;
  try {
    const value = parseStrict(note.text);
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}
const cell = (value: unknown): string => value === undefined ? "Not supplied" : typeof value === "string" ? value : canonicalize(value);

export function commonsScreen(view: CommonsView, selected: ReferenceValue | null = null): HTMLElement {
  const notes = selected ? notesAbout(view, selected) : view.notes;
  const rows = notes.flatMap(note => { const data = rowData(note); return data ? [{ note, data }] : []; });
  const allColumns = [...new Set(rows.flatMap(row => Object.keys(row.data)))], columns = allColumns.slice(0, 32);
  const thread = h("section", { "aria-label": "Notes thread" }, h("h2", {}, "Thread"),
    notes.length === 0 ? h("p", {}, view.complete ? "No notes in this reading." : "No notes were available in this incomplete reading.") : null,
    notes.map(note => h("article", { class: "comment", "data-note": String(note.fact.seq) },
      h("h3", {}, h("a", { href: commonsLink({ entry: note.fact }) }, `Note ${note.fact.seq}`)),
      h("p", { class: "comment-author" }, author(view, note)),
      h("p", { class: "muted" }, `${authorRef(note)}. Signing key ${note.key}. ${note.media}. ${note.time}.`),
      h("pre", {}, note.text ?? "Text unavailable"), references(note))));
  const data = h("section", { "aria-label": "Notes table" }, h("h2", {}, "Data table"),
    h("p", {}, "Each JSON object note is one row. Other media stay in the thread. Columns are the author's data, not shared states."),
    allColumns.length > columns.length ? h("p", { role: "status" }, "This table shows the first 32 columns. Read each full note in the thread for the rest.") : null,
    rows.length ? h("div", { class: "table-scroll" }, h("table", { class: "record-table" },
      h("thead", {}, h("tr", {}, ["Note", "Author", "Sources", ...columns].map(column => h("th", { scope: "col" }, column)))),
      h("tbody", {}, rows.map(({ note, data: values }) => h("tr", {},
        h("td", {}, h("a", { href: commonsLink({ entry: note.fact }) }, String(note.fact.seq))), h("td", {}, author(view, note)), h("td", {}, references(note)), ...columns.map(column => h("td", {}, cell(values[column])))))))) : h("p", {}, "No readable JSON object notes in this window."));
  return h("main", { class: "screen", id: "page-main", tabindex: "-1" }, h("h1", {}, "Commons"),
    selected ? h("section", {}, h("p", {}, referenceText(selected)), h("p", {}, "This reading includes notes about the selected source and notes about those notes."), h("a", { href: "#/commons" }, "All notes")) : null,
    selected && "document" in selected ? h("section", { "aria-label": "Retained document" }, h("h2", {}, "Retained text document"),
      ...view.notes.filter(note => note.textDigest === selected.document && note.text !== null).map(note => h("article", {}, h("p", {}, `Carrier note ${note.fact.seq}; ${author(view, note)}; ${note.media}.`), h("pre", {}, note.text))),
      !view.notes.some(note => note.textDigest === selected.document && note.text !== null) ? h("p", { role: "status" }, "No verified same-room text carrier is available in this window. Another room or an unreadable source is not an absent document.") : null,
      h("p", {}, "These bytes came from this Commons note's retained text.")) : null,
    selected && "entry" in selected && canonicalize(selected.entry.at) !== canonicalize(view.scope) ? h("p", { role: "status" }, "The cited entry belongs to another scope. Its body was not read through this room.") : null,
    h("p", { role: "status" }, view.complete ? `Complete history at entry ${view.head.seq}.` : `Incomplete reading at entry ${view.head.seq}; missing notes or text may exist.`),
    ...view.unreadable.map(reason => h("p", { class: "answer", role: "status" }, reason)),
    h("p", {}, "Fragments identify places according to their media type. This reader shows them literally and neither resolves them nor runs content."),
    thread, data,
    view.next ? h("a", { href: `${selected ? commonsLink(selected) : "#/commons"}?cursor=${encodeURIComponent(view.next)}` }, "Next history window") : null,
    h("section", { "data-action-slot": "note", "aria-label": "Write a note" }));
}

/** Existing form/custody machinery signs the actual Commons note act. The
 * caller supplies fresh offered acts and the same room/member context. */
export function commonsNoteForm(note: Offered, send: Send, context: ActionContext, selected: ReferenceValue | null): HTMLElement {
  const form = actionForm(note, send, context, true);
  const media = form.querySelector<HTMLInputElement>('[name="field:media"]');
  if (media && media.value === "") media.value = "text/plain";
  const about = form.querySelector<HTMLTextAreaElement>('[name="field:about"]');
  if (about && about.value === "") about.value = canonicalize(selected ? [selected] : []);
  return h("div", {}, h("h2", {}, "Write a note"), h("p", {}, "You sign with your current member key. A citation does not approve, bind or grant access to its source."), form);
}
