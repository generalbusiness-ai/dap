import { commonsScreen } from "../src/commons.ts";
import type { CommonsView, CommonsNote } from "@generalbusiness/dap-client";
import { canonicalize, scopeIdOf, textDigest } from "@generalbusiness/dap-bytes";
import { afterEach, expect, test, vi } from "vitest";
import type { Answer } from "@generalbusiness/dap-contract";
import { Unreadable, type ChangeView, type NeedsYouView, type Room } from "../src/data.ts";
import { answerLine, changeCondition, changeScreen, failureScreen, issueScreen, whoLine, roomScreen, rulesScreen } from "../src/view.ts";
import type { ListState } from "../src/list-context.ts";

// A DOM-construction stand-in, not a browser. It witnesses the facts the view
// exposes and link destinations; responsive layout is checked by the recorder.
class Element {
  readonly children: (Element | string)[] = [];
  readonly attributes: Record<string, string> = {};
  readonly listeners = new Map<string, () => void>();
  constructor(readonly tagName: string) {}
  setAttribute(name: string, value: string) { this.attributes[name] = value; }
  append(...children: (Element | string)[]) { this.children.push(...children); }
  replaceChildren(...children: (Element | string)[]) { this.children.splice(0, this.children.length, ...children); }
  addEventListener(name: string, listener: () => void) { this.listeners.set(name, listener); }
  fire(name: string) { this.listeners.get(name)?.(); }
  getAttribute(name: string) { return this.attributes[name] ?? null; }
  get value() { return this.attributes["value"] ?? ""; }
  set value(value: string) { this.attributes["value"] = value; }
  querySelectorAll(tag: string) { return this.all(tag); }
  get textContent(): string { return this.children.map((c) => typeof c === "string" ? c : c.textContent).join(""); }
  all(tag: string): Element[] { return [...(this.tagName === tag ? [this] : []), ...this.children.flatMap((c) => typeof c === "string" ? [] : c.all(tag))]; }
}
const document = { createElement: (tag: string) => new Element(tag) };
afterEach(() => vi.unstubAllGlobals());
const room = { key: "ed25519:member", me: { handle: "@member", role: "controller" }, reader: {}, directory: "sc_directory", session: { service: "https://room.test" } } as unknown as Room;
const head = { seq: 42, hash: "sha256:recorded-head" };
const view = (over: Partial<ChangeView> = {}): ChangeView => ({
  scope: "sc_change", definition: "sha256:definition", head, number: 7, title: "Improve guide", body: null, state: "open", author: "@author",
  manifests: [{ id: 12, state: "current", integrator: "@author", authors: ["@author"], base: "base-full", integration: null, tree: null, complete: true, file: { path: "guide.md", digest: "sha256:full-file-digest", size: 48, page: "https://example.test/HEAD/guide.md" } }],
  reviews: [], requests: [], jobs: [], links: [], merges: [], rules: null, comments: [], ...over,
}) as ChangeView;
const merge = (over: Partial<ChangeView["merges"][number]> = {}): ChangeView["merges"][number] => ({ id: 15, state: "unknown", manifest: 12, reason: null, commit: null,
  publication: { id: 16, state: "unresolved", reason: null, operations: [{ id: "17:0", kind: "push", attempts: ["confirmed"] }] }, ...over });
const render = (change: ChangeView, last: Answer | null = null, kind?: string): Element => { vi.stubGlobal("document", document); return changeScreen(room, change, last, kind) as unknown as Element; };

test("list handlers restore query and filter through detail/back while literal query text remains an input value", () => {
  vi.stubGlobal("document", document);
  let kept: ListState = { query: "", filter: "open" };
  const lanes = { issues: [{ scope: "sc_issue", number: 12, kind: "issue", title: "<script>Guide</script>", state: "closed", draft: false }], changes: [] } as never;
  const show = () => roomScreen(room, lanes, "issue", { state: kept, changed: (next) => { kept = next; } }) as unknown as Element;
  const first = show();
  first.all("button").find((button) => button.attributes["data-filter"] === "closed")!.fire("click");
  const query = first.all("input")[0]!; query.value = "<script>Guide"; query.fire("input");
  const returned = show();
  expect(returned.all("input")[0]!.value).toBe("<script>Guide");
  expect(returned.all("button").find((button) => button.attributes["data-filter"] === "closed")!.attributes["aria-pressed"]).toBe("true");
  expect(returned.textContent).toContain("<script>Guide</script>");
  expect(returned.all("script")).toEqual([]);
  kept = { query: "", filter: "open" };
  expect(show().textContent).toContain("Clear the search or choose another filter to find an issue.");
});

test("one current condition follows the selected version, never an internally confirmed operation or an older version", () => {
  expect(changeCondition(view({ merges: [merge()] }))).toBe("Awaiting confirmation");
  expect(changeCondition(view(), { answer: "refused", reason: "unauthorized" } as never)).toBe("Open");
  expect(changeCondition(view({ merges: [merge({ state: "published", manifest: 11 })] }))).toBe("Open");
  const screen = render(view({ merges: [merge({ state: "published", commit: "exact-published-commit" })] }));
  expect(screen.all("span").filter((e) => e.attributes["class"]?.includes("condition")).map((e) => e.textContent)).toEqual(["Merged"]);
  expect(screen.textContent.match(/Merged/g)).toHaveLength(1);
  expect(screen.all("a").some((e) => e.attributes["href"] === "https://example.test/HEAD/guide.md")).toBe(false);
  expect(screen.textContent).toContain("Rendering this published version is not available yet.");
});

test("ordinary screens omit empty record panels while inspection preserves full subject, refusal and outside-operation evidence", () => {
  const screen = render(view({ merges: [merge({ state: "refused", reason: "rules-not-met:protected", publication: { id: 16, state: "not-reserved", reason: "authority-lost", operations: [{ id: "17:0", kind: "push", attempts: ["unknown", "refused"] }] } })] }));
  expect(screen.textContent).not.toContain("None.");
  expect(screen.all("h2").map((e) => e.textContent)).not.toContain("Review requests");
  expect(screen.all("h2").map((e) => e.textContent)).not.toContain("Comments (0)");
  const record = screen.all("details")[0]!;
  for (const evidence of ["sc_change", "sha256:definition", "sha256:recorded-head", "sha256:full-file-digest", "rules-not-met:protected", "authority-lost", "17:0", "unknown, refused"]) expect(record.textContent).toContain(evidence);
  expect(screen.all("span").find((e) => e.attributes["class"]?.includes("condition"))?.textContent).toBe("Needs review");
});

test("issue and rules keep their subject once and move authority detail into inspection", () => {
  vi.stubGlobal("document", document);
  const issue = issueScreen(room, { scope: "sc_issue", definition: "sha256:issue-definition", head, questions: [], decided: [], title: "<script>unsafe</script>", number: 5, body: null, state: "open", requester: "@author", assignees: [], conditions: [], comments: [], closeReason: null, createdAt: "2026-10-12T14:03:00Z", modifiedAt: "2026-10-12T14:05:00Z" } as never) as unknown as Element;
  expect(issue.all("h1")[0]!.textContent).toBe("<script>unsafe</script> #5");
  expect(issue.all("script")).toEqual([]);
  expect(issue.all("h2")).toEqual([]);
  expect(issue.all("time").map(node => node.attributes["datetime"])).toEqual(["2026-10-12T14:03:00Z", "2026-10-12T14:05:00Z"]);
  const expectedLocal = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short" }).format(new Date("2026-10-12T14:03:00Z"));
  expect(issue.all("time")[0]!.textContent).toBe(expectedLocal);
  expect(issue.textContent).toContain("Created:"); expect(issue.textContent).toContain("Modified:");
  for (const reading of [room, { ...room, reader: null, unsessioned: "sessions-unavailable" }]) {
    const identity = whoLine(reading) as unknown as Element;
    expect(identity.textContent).toContain("@member (controller)"); expect(identity.textContent).toContain(room.key);
    expect(identity.textContent).not.toContain("read session"); expect(identity.textContent).not.toContain("each read is signed");
  }
  expect(issue.all("details")[0]!.textContent).toContain("sha256:issue-definition");
  const rules = rulesScreen(room, { scope: "sc_rules", head, revision: 3, approvals: 1, ownerMayReview: false, singleControllerException: false, checks: [], labels: [], extents: [{ name: "protected", class: "rules", approvals: 1, approver: "rules.publish", checks: [], patterns: ["AGENTS.md"] }], definitions: [], controllers: ["@controller"] } as never) as unknown as Element;
  expect(rules.children.filter((child) => typeof child === "string" || child.tagName !== "details").map((child) => typeof child === "string" ? child : child.textContent).join("").match(/AGENTS.md/g)).toHaveLength(1);
  expect(rules.all("details")[0]!.textContent).toContain("rules.publish");
  const roomList = roomScreen(room, { issues: [], changes: [] }, "issue") as unknown as Element;
  const change = render(view());
  for (const screen of [roomList, issue, change, rules]) {
    const row = screen.all("div").filter(node => node.attributes["class"] === "toolbar-actions");
    expect(row).toHaveLength(1);
    expect(row[0]!.attributes["data-action-slot"]).toBe(screen === roomList ? "create" : "next");
  }
});

// A refused or unsettled comment is request evidence, not the lifecycle of a merge.
test("last comment outcomes do not become the change's current merge condition", () => {
  for (const answer of [
    { answer: "refused", reason: "dependency-unavailable" },
    { answer: "refused", reason: "guard-failed", name: "approvals-needed" },
    { answer: "unavailable", reason: "busy" },
  ] as Answer[]) {
    const screen = render(view(), answer, "comment");
    expect(screen.all("span").find((e) => e.attributes["class"]?.includes("condition"))?.textContent).toBe("Open");
    expect(screen.all("details")[0]!.textContent).not.toContain("The lane refused the merge");
  }
  expect(changeCondition(view(), { answer: "unavailable", reason: "busy" } as Answer, "merge")).toBe("Authority unavailable");
});

// Settled requirements are evidence, not another default-home panel.
test("merged requirements stay in inspection; active requirements use only the recorded file's matching extent", () => {
  const rules = { revision: 29, approvals: 1, ownerMayReview: false, checks: [], extents: [
    { name: "protected", patterns: ["AGENTS.md"], class: "authority", approvals: 1, approver: "rules.publish", checks: [] },
    { name: "content", patterns: [], class: "content", approvals: 1, approver: "change.review", checks: [] },
  ] };
  const routineText = (screen: Element) => screen.children.filter((child) => typeof child === "string" || child.tagName !== "details").map((child) => typeof child === "string" ? child : child.textContent).join("");
  const merged = render(view({ rules, merges: [merge({ state: "published" })] }));
  expect(routineText(merged)).not.toContain("Review requirements");
  expect(routineText(merged)).not.toContain("Not recorded");
  const record = merged.all("details")[0]!;
  for (const fact of ["protected", "content", "rules.publish", "change.review", "Lane-held rules update 29"]) expect(record.textContent).toContain(fact);
  const active = render(view({ rules }));
  expect(routineText(active)).toContain("content · 0 of 1 approvals recorded");
  expect(routineText(active)).not.toContain("protected");
  expect(routineText(render(view({ rules: { ...rules, extents: rules.extents.map((extent) => ({ ...extent, approvals: 0 })) } })))).not.toContain("Review requirements");
});

// Source is selected-version text from the verified projection, never HEAD or HTML.
test("source preview preserves the selected manifest identity and treats markup as text", () => {
  const current = view().manifests[0]!;
  const source = "<script>window.pwned = true</script>\n# Selected content";
  const selected = { ...current, file: { ...current.file!, content: source } };
  const older = { ...current, id: 11, state: "superseded", file: { ...current.file!, content: "Older content", digest: "sha256:older" } };
  const screen = render(view({ manifests: [older, selected] }));
  const preview = screen.all("details").find((node) => node.attributes["class"] === "source-preview")!;
  expect(preview.all("summary")[0]!.textContent).toBe("Preview source");
  expect(preview.textContent).toContain("Version 12 · guide.md");
  expect(preview.textContent).toContain("sha256:full-file-digest");
  expect(preview.all("pre")[0]!.textContent).toBe(source);
  expect(preview.textContent).not.toContain("Older content");
  expect(screen.all("script")).toEqual([]);
  expect(screen.all("a").some((node) => node.attributes["href"] === selected.file.page)).toBe(false);
  expect(render(view()).all("details").some((node) => node.attributes["class"] === "source-preview")).toBe(false);
  expect(render(view({ manifests: [{ ...selected, file: { ...selected.file, content: "" } }] })).all("pre")[0]!.textContent).toBe("");
});

test("published latest-page navigation is explicitly distinct from selected source preview", () => {
  const current = view().manifests[0]!;
  const selected = { ...current, file: { ...current.file!, path: "docs/a page.md", content: "Exact selected source" } };
  const screen = render(view({ manifests: [selected], merges: [merge({ state: "published" })] }));
  const page = screen.all("a").find((node) => node.textContent === "Open latest page")!;
  expect(page.attributes["href"]).toBe("https://room.test/site/sc_directory/HEAD/docs/a%20page.md");
  expect(screen.all("a").some((node) => node.textContent === "Open page")).toBe(false);
  const preview = screen.all("details").find((node) => node.attributes["class"] === "source-preview")!;
  expect(preview.textContent).toContain("Version 12 · docs/a page.md");
  expect(preview.all("pre")[0]!.textContent).toBe("Exact selected source");
  expect(render(view({ manifests: [selected] })).all("a").some((node) => node.textContent === "Open latest page")).toBe(false);
  expect(render(view({ manifests: [{ ...selected, file: { ...selected.file, path: "../outside.md" } }], merges: [merge({ state: "published" })] })).all("a").some((node) => node.textContent === "Open latest page")).toBe(false);
});

test("editable rules omit the routine readonly copy while preserving full authority in inspection", () => {
  vi.stubGlobal("document", document);
  const screen = rulesScreen(room, { scope: "sc_rules", head, revision: 29, approvals: 1, ownerMayReview: false, singleControllerException: false, checks: [{ name: "build", required: true }], labels: [], extents: [{ name: "protected", class: "authority", approvals: 1, approver: "rules.publish", checks: ["build"], patterns: ["AGENTS.md"] }], definitions: [], controllers: ["@controller"] } as never, true) as unknown as Element;
  expect(screen.children.filter((node) => typeof node !== "string" && node.tagName === "section")).toEqual([]);
  const record = screen.all("details")[0]!;
  for (const fact of ["29", "protected", "authority", "rules.publish", "AGENTS.md", "build"]) expect(record.textContent).toContain(fact);
});


test("verified invalid-path source exposes the editor mount independently of preview or published-link eligibility",()=>{
  const current=view().manifests[0]!;
  const selected={...current,file:{...current.file!,path:"../outside.md",content:"Exact retained original\r\n"}};
  const screen=render(view({manifests:[selected]}));
  expect(screen.all("div").filter(node=>node.attributes["data-action-slot"]==="edit")).toHaveLength(1);
  expect(screen.textContent).toContain("Choose a file path inside this room");
  expect(screen.all("details").some(node=>node.attributes["class"]==="source-preview")).toBe(false);
  expect(render(view({manifests:[{...selected,file:{...selected.file,content:null}}]})).all("div").filter(node=>node.attributes["data-action-slot"]==="edit")).toEqual([]);
});

// The receipt is retained in full; unknown observation and refusal never gain an acknowledgement.
test("dap acknowledgement requires an accepted receipt and a known observation", () => {
  vi.stubGlobal("document", document);
  const receipt = { fact: { at: { scope: "sc_exact", genesis: textDigest("TEST genesis 39") }, seq: 91, hash: "sha256:exact" }, definition: "sha256:definition", intent: "sha256:intent", effects: [], sends: [], epoch: 0 } as const;
  const acted: Parameters<typeof answerLine>[0] = { digest: "sha256:scripted" as never, service: "https://fake.test", directory: "sc_directory", membership: { scope: "sc_membership", genesis: textDigest("TEST genesis 40") }, key: "key_exact", kind: "comment", scope: "sc_exact", on: 7, before: { seq: 90, hash: "sha256:before" }, after: { seq: 91, hash: "sha256:exact" }, observation: null, answer: { answer: "accepted", receipt } };
  const accepted = answerLine(acted) as unknown as Element;
  for (const fact of ["sc_exact:91", textDigest("TEST genesis 39"), "sha256:exact"]) expect(accepted.textContent).toContain(fact);
  expect(accepted.all("p").at(-1)?.textContent).toBe("dap.");
  for (const changed of [
    { ...acted, observation: "The view could not be read." },
    { ...acted, answer: { answer: "refused", reason: "guard-failed" } },
    { ...acted, answer: { answer: "unavailable", reason: "busy" } },
    { ...acted, answer: { answer: "mismatch", reason: "different-intent" } },
  ]) expect((answerLine(changed as never) as unknown as Element).all("p").some((p) => p.textContent === "dap.")).toBe(false);
});

// Empty source is a complete-list fact; a search result never becomes first-room guidance.
test("an empty change list explains the first recorded source once in its list column while filtering keeps No matches", () => {
  vi.stubGlobal("document", document);
  try {
    const empty = roomScreen(room, { issues: [], changes: [] }, "change") as unknown as Element;
    const text = "Propose the first change from a connected device.";
    expect(empty.all("div").find(node => node.attributes["data-list"] !== undefined)?.all("p")[0]!.textContent).toBe(text);
    expect(empty.textContent.split(text)).toHaveLength(2);
    const emptyIssues = roomScreen(room, { issues: [], changes: [] }, "issue") as unknown as Element;
    expect(emptyIssues.textContent).toContain("Create the first issue when the room offers it.");
    expect(emptyIssues.all("a").some(link => link.textContent === "How to propose a change")).toBe(false);
    expect(empty.all("a").find(link => link.textContent === "How to propose a change")?.attributes["href"]).toBe("https://github.com/generalbusiness-ai/dap/blob/main/apps/room/docs/first-change.md");
    const changed = roomScreen(room, { issues: [], changes: [{ scope: "sc_change", number: 1, kind: "pr", title: "Recorded source", state: "merged", draft: false }] } as never, "change", { state: { filter: "open", query: "" }, changed: () => {} }) as unknown as Element;
    expect(changed.textContent).toContain("Clear the search or choose another filter to find a change.");
    expect(changed.textContent).not.toContain(text);
    expect(changed.all("a").some(link => link.textContent === "How to propose a change")).toBe(false);
  } finally { vi.unstubAllGlobals(); }
});

// A DOM/reading stand-in. Native signatures and the bounded actual journal
// reader have separate owners; no binary document or hosted proof is claimed.
test("Commons renders source lines and the member's marks without attributing them to the agent, and keeps content literal", () => {
  vi.stubGlobal("document", document);
  const scope = { scope: scopeIdOf({ v: 1, kind: "commons", definition: "platform:commons@1", creator: null, cause: textDigest("SCRIPTED Commons UI"), ordinal: 0 }), genesis: textDigest("TEST genesis 41") };
  const membership = scope, documentDigest = textDigest("<script>carrier</script>");
  const fact = (seq: number) => ({ at: scope, seq, hash: textDigest(`SCRIPTED note ${seq}`) });
  const note = (seq: number, body: string, person = "@agent"): CommonsNote => ({ fact: fact(seq), author: { membership, member: person as `@${string}` }, key: "key_" + "A".repeat(43) as CommonsNote["key"], time: "2030-01-01T00:00:00Z", textDigest: textDigest(body), text: body, media: "application/json", about: [{ document: documentDigest, fragment: "line=2,3" }] });
  const rows = Array.from({ length: 14 }, (_, n) => note(n + 2, JSON.stringify({ charge: n + 1, amount: n + 20 })));
  const mark = { ...note(16, "Ask about this", "@person"), media: "text/plain", about: [{ entry: rows[0]!.fact }] };
  const carrier = { ...note(1, "<script>carrier</script>"), media: "text/plain", about: [] };
  const view: CommonsView = { scope, head: { seq: 16, hash: fact(16).hash }, notes: [carrier, ...rows, mark], next: "200", authorLabels: { [canonicalize(rows[0]!.author)]: { handle: "@agent", kind: "agent" }, [canonicalize(mark.author)]: { handle: "@person", kind: "person" } }, complete: false, unreadable: ["Later notes are unreadable."] };
  const rendered = commonsScreen(view, { document: documentDigest }) as unknown as Element;
  expect(rendered.textContent).toContain("line=2,3"); expect(rendered.textContent).toContain("@person (person)"); expect(rendered.textContent).toContain("@agent (agent)");
  expect(rendered.textContent).toContain("Next history window"); expect(rendered.textContent).toContain("Incomplete reading"); expect(rendered.textContent).toContain("Later notes are unreadable.");
  expect(rendered.textContent).toContain("<script>carrier</script>"); expect(rendered.all("script")).toHaveLength(0);
  const table = rendered.all("table")[0]!;
  expect(table.all("tbody")[0]!.all("tr")).toHaveLength(14);
  const person = rendered.all("article").find(article => article.textContent.includes("Ask about this"))!;
  expect(person.textContent).toContain("@person"); expect(person.textContent).not.toContain("@agent");
  expect(rendered.all("a").every(link => link.getAttribute("href")?.startsWith("#/commons"))).toBe(true);
});

test("Commons prototype-named columns leave other rows missing and retain the note form slot", () => {
  vi.stubGlobal("document", document);
  const scope = { scope: scopeIdOf({ v: 1, kind: "commons", definition: "platform:commons@1", creator: null, cause: textDigest("SCRIPTED prototype columns"), ordinal: 0 }), genesis: textDigest("TEST genesis 42") };
  const notes: CommonsNote[] = ['{"toString":"literal","constructor":7}', '{"charge":25}'].map((text, n) => ({
    fact: { at: scope, seq: n + 1, hash: textDigest(`SCRIPTED prototype note ${n + 1}`) },
    author: null, key: "key_" + "A".repeat(43) as CommonsNote["key"], time: "2030-01-01T00:00:00Z",
    textDigest: textDigest(text), text, media: "application/json", about: [],
  }));
  let rendered: Element | undefined;
  expect(() => { rendered = commonsScreen({ scope, head: { seq: 2, hash: notes[1]!.fact.hash }, notes, complete: true, unreadable: [] }) as unknown as Element; }).not.toThrow();
  const table = rendered!.all("table")[0]!, headers = table.all("th").map(cell => cell.textContent), rows = table.all("tbody")[0]!.all("tr");
  const column = (name: string) => {
    expect(headers).toContain(name);
    return rows.map(row => row.all("td")[headers.indexOf(name)]!.textContent);
  };
  expect(column("toString")).toEqual(["literal", "Not supplied"]);
  expect(column("constructor")).toEqual(["7", "Not supplied"]);
  expect(column("charge")).toEqual(["Not supplied", "25"]);
  expect(rendered!.all("section").some(section => section.attributes["data-action-slot"] === "note" && section.attributes["aria-label"] === "Write a note")).toBe(true);
});

test("the failure screen says the cause and the next step of an open with no session; every other failure keeps its heading and words", () => {
  vi.stubGlobal("document", document);
  const refused = failureScreen(new Unreadable("Cannot read sc_directory: forbidden.", { why: "no-reply" })) as unknown as Element;
  expect(refused.all("h1")[0]!.textContent).toBe("This room did not open");
  expect(refused.all("p").map(line => line.textContent)).toEqual([
    "The service did not give a usable answer to this page's request for a read session. Reload this page to try again.",
    "Details: Cannot read sc_directory: forbidden. Session request: no-reply.",
    "Join another room",
  ]);
  const heldSession = failureScreen(new Unreadable("Cannot read sc_directory: forbidden.")) as unknown as Element;
  expect(heldSession.all("h1")[0]!.textContent).toBe("Observation unknown");
  expect(heldSession.all("p").map(line => line.textContent)).toEqual(["Cannot read sc_directory: forbidden.", "Join another room"]);
});

test("the issue screen lists a question with its text, its reasons and a slot for each answer; a request of a closed question stands alone", () => {
  vi.stubGlobal("document", document);
  const room = { me: { handle: "@ana", name: null, role: "admin", kind: "person", actions: [] }, directory: "sc_directory", membership: { scope: "sc_membership" } } as unknown as Room;
  const question = { ask: 4, question: "TEST which format?", body: "TEST keep CSV.", brief: "Brief sha256:b. Approval does not approve the Brief or conditions.",
    rows: [{ item: 5, needs: "Approve or request changes on question 4.", why: "Why it is yours: @una asked you by name.", lines: ["What settles it: an act.", "Rule: this lane's rule for an approval request."], exact: "Definition sha256:d, clause acts.request-approval." }],
    others: ["@una asked @vic to approve this question."], answers: [{ kind: "approve" as const, label: "Approve", on: "", typed: {} }] };
  const closed = { ask: -1, question: "", body: null, brief: null, rows: [{ item: 8, needs: "A request about question 7, which has closed.", why: "Why it is yours: @vic asked you by name.", lines: [], exact: "Definition sha256:d, clause acts.request-approval." }], others: [], answers: [] };
  const screen = issueScreen(room, { scope: "sc_issue", definition: "sha256:d", head, questions: [question, closed], decided: [], title: "TEST", number: 1, body: null, state: "open", requester: "@rita", assignees: [], conditions: [], comments: [], createdAt: null, modifiedAt: null } as never) as unknown as Element;
  const seen = screen.textContent;
  for (const words of ["Reading this item leaves it open. This list grants no permission.", "TEST which format?", "TEST keep CSV.", "Approval does not approve the Brief", "Approve or request changes on question 4.", "Why it is yours: @una asked you by name.", "What settles it: an act.", "Rule: this lane's rule for an approval request.", "@una asked @vic to approve this question.", "A request about question 7, which has closed."]) expect(seen, words).toContain(words);
  expect(screen.all("div").filter(node => node.getAttribute("data-question-answers") !== null).map(node => node.getAttribute("data-question-answers")), "ANSWERS: a slot for the live question only").toEqual(["4"]);
});

test("Needs you shows each row with its lane and its link, says what it left out with a link to reach it, and keeps decided questions", () => {
  vi.stubGlobal("document", document);
  const lane = { scope: "sc_one" as never, kind: "issue" as const, lane: "Issue 2: TEST the import" };
  const other = { scope: "sc_two" as never, kind: "change" as const, lane: "Change 3: TEST the fix" };
  const item = { ...lane, row: {} as never, item: 5, needs: "Approve or request changes on question 4.", why: "Why it is yours: @una asked you by name.", lines: ["What settles it: an act.", "Rule: this lane's rule for an approval request."], exact: "Definition sha256:d, clause acts.request-approval." };
  const base = { failed: null, items: [item, { ...item, ...other, item: 9, needs: "Merge change 3." }], omittedRows: 0, omittedLanes: 0, next: null, continued: false, lostPlace: false, unread: [], decided: [], older: [], decidedUnread: 0 };
  const list = (needs: Partial<NeedsYouView>) => (roomScreen(room, { issues: [], changes: [] }, "issue", undefined, { ...base, ...needs }) as unknown as Element).all("section")[0]!;
  const whole = list({});
  for (const words of ["Needs you", "Reading this item leaves it open.", "Issue 2: TEST the import", "Approve or request changes on question 4.", "Why it is yours: @una asked you by name.", "What settles it: an act.", "Rule: this lane's rule for an approval request.", "Merge change 3."]) expect(whole.textContent, words).toContain(words);
  expect(whole.all("a").map(link => link.getAttribute("href")), "EACH ROW OPENS ITS OWN LANE").toEqual(["#/issue/sc_one", "#/change/sc_two"]);
  expect(whole.textContent, "A WHOLE LIST says nothing about what it left out").not.toContain("leaves out");

  const ref = { scope: "sc_two", genesis: textDigest("TEST genesis 43") };
  const cut = list({ omittedLanes: 2, next: ref as never });
  expect(cut.textContent, "A CUT LIST says how many lanes it left out").toContain("This list leaves out 2 lanes. Read the lanes that follow");
  const nextHref = cut.all("a").at(-1)!.getAttribute("href")!;
  expect(JSON.parse(new URLSearchParams(nextHref.split("?")[1]).get("after")!), "THE LINK NAMES THE LANE to continue after").toEqual(ref);
  const last = list({ omittedLanes: 1, next: null, continued: true });
  expect(last.textContent, "THE LAST WINDOW: it says that no lane follows, and offers the first lanes").toContain("This list leaves out 1 lane. No lane follows this one. Read the first lanes");
  expect(last.all("a").at(-1)!.getAttribute("href")).toBe("#/");
  expect(list({ items: [], omittedRows: 3 }).textContent, "A CUT LIST says how many items it left out").toContain("This list leaves out 3 more items. Settle some of the items above, then read it again.");

  const unread = list({ unread: [{ ...other, ref: ref as never, reason: "unsupported-profile" }] });
  expect(unread.textContent, "AN UNREAD LANE is named and can be opened").toContain("This list could not read 1 lane, so it can leave out items there.");
  expect(unread.all("a").at(-1)!.textContent).toBe("Change 3: TEST the fix");
  expect(list({ items: [] }).textContent, "AN EMPTY WHOLE LIST speaks of the room").toContain("Nothing in this room needs you.");
  expect(list({ items: [], omittedLanes: 1, next: ref as never }).textContent, "AN EMPTY CUT LIST speaks only of what it read").toContain("Nothing in the lanes this list read needs you.");
  expect(list({ lostPlace: true }).textContent, "A BAD ADDRESS").toContain("This address names no lane, so this list starts at the first lane.");

  const failed = list({ failed: "TEST the reason", items: [] });
  expect(failed.textContent, "A FAILED LIST says so and shows no empty line").toContain("TEST the reason");
  expect(failed.textContent).not.toContain("Nothing in this room");

  const decided = list({ decided: [{ ...lane, ask: 4, line: "Decided question: TEST which? (entry 11)", question: "TEST which?", body: null, by: "@rita", at: "2026-11-01T12:00:00.000Z", comment: "TEST keep CSV" }], older: [{ ...other, count: 2 }], decidedUnread: 1 });
  for (const words of ["Decided question: TEST which? (entry 11)", "Decided by @rita on ", "Comment: TEST keep CSV", "This list leaves out 2 older decided questions of Change 3: TEST the fix. Open it to read them.", "This list could not read the decided questions of 1 lane."]) expect(decided.textContent, words).toContain(words);
});

test("the issue screen keeps a decided question with who decided, and leaves out what its read did not fetch", () => {
  vi.stubGlobal("document", document);
  const room = { me: { handle: "@ana", name: null, role: "admin", kind: "person", actions: [] }, directory: "sc_directory", membership: { scope: "sc_membership" } } as unknown as Room;
  const decided = [{ ask: 4, line: "Decided question: TEST which? (entry 11)", question: "TEST which?", body: "TEST keep CSV.", by: "@ana", at: "2026-11-01T12:00:00.000Z", comment: null }, { ask: 2, line: "Decided question: TEST older? (entry 3)", question: "TEST older?", body: null, by: null, at: null, comment: null }];
  const screen = issueScreen(room, { scope: "sc_issue", definition: "sha256:d", head, questions: [], decided, title: "TEST", number: 1, body: null, state: "open", requester: "@rita", assignees: [], conditions: [], comments: [], createdAt: null, modifiedAt: null, closeReason: null, requesterRef: null } as never) as unknown as Element;
  expect(screen.all("h2").map(node => node.textContent), "THE SECTION").toContain("Decided questions");
  for (const words of ["Decided question: TEST which? (entry 11)", "TEST keep CSV.", "Decided by @ana on ", "Decided question: TEST older? (entry 3)"]) expect(screen.textContent, words).toContain(words);
  expect(screen.textContent.match(/Decided by/g), "AN ENTRY NOT READ names nobody").toHaveLength(1);
});

// The shell moves a screen's first `details.inspection` into its record panel, so a row's own disclosure must not be one.
test("each row of what needs you keeps its exact rule in its own disclosure, and none of them is the screen's record", () => {
  vi.stubGlobal("document", document);
  const row = (id: number) => ({ scope: "sc_a", item: id, lane: "Issue 1: TEST", needs: `TEST ${id}`, why: "TEST why", lines: [], exact: `Definition sha256:${"a".repeat(64)}, clause acts.decide.`, row: {} });
  const needs = { items: [row(1), row(2)], decided: [], decidedUnread: 0, older: [], unread: [], omittedLanes: 0, omittedRows: 0, next: null, continued: false, lostPlace: false, failed: null } as unknown as NeedsYouView;
  const screen = roomScreen(room, { issues: [], changes: [] }, "issue", undefined, needs) as unknown as Element;
  const rows = screen.all("article").filter(one => one.getAttribute("data-needs-row") !== null);
  expect(rows.map(one => one.all("details").map(node => node.getAttribute("class"))), "EACH ROW holds its own disclosure").toEqual([["exact-rule"], ["exact-rule"]]);
  expect((screen.all("details").find(node => node.getAttribute("class") === "inspection")?.children[0] as Element | undefined)?.textContent, "THE SCREEN'S FIRST RECORD stays the room's").toBe("Inspect room record");
});
