import type { MemberRef } from "@generalbusiness/dap-contract";
import { canonicalize, isMemberRef } from "@generalbusiness/dap-bytes";
import type { MemberTable } from "../src/views/member-types.ts";
import { memberDescription } from "../src/views/member-text.ts";

// One stylesheet for the host and every declared surface shadow root. The
// host supplies tokens/fonts; no resource or membership operation is made.
const styles = `
.declared-members{display:flex;flex-direction:column;gap:6px;margin-block:8px}
.dap-member{display:inline-flex;align-items:center;gap:10px;max-inline-size:100%;min-block-size:44px;vertical-align:middle;font:inherit;color:inherit;text-align:start}
.dap-member-words{display:grid;gap:2px;min-inline-size:0;overflow-wrap:anywhere;white-space:normal}
.dap-member-handle{font-weight:600}.dap-member-description{font-size:.85em;line-height:1.5;color:var(--color-text-secondary,var(--card-muted,#656565))}
.dap-member-mark{position:relative;display:inline-grid;place-items:center;flex:0 0 32px;inline-size:32px;block-size:32px;font:600 12px/1 var(--font-sans,system-ui,sans-serif);color:var(--color-background-primary,#fff);isolation:isolate}
.dap-member-mark::before{content:"";position:absolute;inset:0;border:1px solid var(--color-text-primary,#3f3023);background:var(--color-text-primary,#3f3023);z-index:-1}
.dap-member-person::before{border-radius:50%}.dap-member-checker{color:inherit}.dap-member-checker::before{inset:4px;background:transparent;transform:rotate(45deg)}
.dap-member-invited{color:inherit}.dap-member-invited::before{background:transparent}.dap-member-removed,.dap-member-lapsed{opacity:.65}
:root[data-theme=dark]{--dap-member-removal:#e9a29f}
.dap-member-removed-word{color:var(--color-text-danger,var(--dap-member-removal,#8e3c40))}.dap-member-reference{font-size:.8em;white-space:normal;overflow-wrap:anywhere}
`;
export function memberStyleElement(): HTMLStyleElement {
  const style = document.createElement("style");
  style.dataset["dapMembers"] = "";
  style.textContent = styles;
  return style;
}
export function memberElement(ref: MemberRef, table?: MemberTable): HTMLElement {
  if (!isMemberRef(ref)) throw Error("A member element needs a full member reference.");
  const element = document.createElement("span"); element.className = "dap-member";
  const member = table?.records[canonicalize(ref)], words = document.createElement("span"); words.className = "dap-member-words";
  if (!member?.identity) {
    const label = document.createElement("strong"), raw = document.createElement("code");
    label.textContent = "Member unavailable"; raw.textContent = canonicalize(ref); raw.className = "dap-member-reference";
    const unknown = document.createElement("span"); unknown.textContent = "eligibility unknown"; unknown.className = "dap-member-description";
    words.append(label, raw, unknown); element.append(words); return element;
  }
  const mark = document.createElement("span"), handle = document.createElement("span"), description = document.createElement("span");
  mark.className = `dap-member-mark dap-member-${member.identity.kind}${member.standing ? ` dap-member-${member.standing.state}` : ""}`;
  const segments = member.identity.handle.replace(/^@/, "").split("-").filter(Boolean);
  mark.textContent = (segments.length > 1 ? segments.slice(0, 2).map(segment => segment[0]).join("") : (segments[0] ?? "").slice(0, 2)).toUpperCase();
  mark.setAttribute("aria-hidden", "true");
  handle.className = "dap-member-handle"; handle.textContent = member.identity.handle;
  description.className = "dap-member-description";
  for (const [index, part] of memberDescription(member, table).split(" · ").entries()) {
    if (index) description.append(document.createTextNode(" · "));
    if (part === "removed") {
      const state = document.createElement("span"); state.className = "dap-member-removed-word"; state.textContent = part; description.append(state);
    } else description.append(document.createTextNode(part));
  }
  words.append(handle, description); element.append(mark, words);
  return element;
}
