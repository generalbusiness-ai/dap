/** Card-owned DOM only. Retained native controls and opaque surface hosts never leave their connected parent. */
const keys = new WeakMap<Node, string>();
const opaque = new WeakMap<Node, { element: HTMLElement; key: string }>();
type Activation = (event: MouseEvent) => void;
type Capture = () => Activation;
const captures = new WeakMap<HTMLElement, Capture>();
type Press = { kind: "pointer"; id: number; activate: Activation };
type ActivationKey = "Enter" | " ";
type KeyGesture = { state: "active"; key: ActivationKey; activate: Activation | null; completed: boolean; released?: KeyboardEvent }
  | { state: "cancelled"; key: ActivationKey; repeat?: KeyboardEvent };
interface Control { element: HTMLElement; capture: Capture; press?: Press; keyboard?: KeyGesture }
const controls = new WeakMap<HTMLElement, Control>();
const pointers = new Map<number, Control>();
const keyOwners = new Set<Control>();
let watchingKeys = false;

export function keyed<T extends Node>(element: T, key: string): T { keys.set(element, key); return element; }
/** A placeholder owns no live children. Constructing the next tree cannot reparent the cached host. */
export function retained(element: HTMLElement, key: string): Comment {
  const placeholder = document.createComment("retained surface");
  opaque.set(placeholder, { element, key }); return placeholder;
}
/** One live native handler reads its updated binding; a started gesture retains the earlier binding. */
export function bindControl(element: HTMLButtonElement | HTMLAnchorElement, key: string, capture: Capture): void {
  keyed(element, key); captures.set(element, capture);
}
function forgetKey(control: Control): void {
  delete control.keyboard; keyOwners.delete(control);
  if (watchingKeys && keyOwners.size === 0) {
    window.removeEventListener("keyup", keyReleased); window.removeEventListener("blur", cancelKeys); watchingKeys = false;
  }
}
function ownKey(control: Control, gesture: KeyGesture): void {
  control.keyboard = gesture; keyOwners.add(control);
  if (!watchingKeys) {
    window.addEventListener("keyup", keyReleased); window.addEventListener("blur", cancelKeys); watchingKeys = true;
  }
}
function cancelKey(control: Control): void {
  const key = control.keyboard;
  if (key) control.keyboard = { state: "cancelled", key: key.key };
}
function cancelKeys(): void { for (const control of keyOwners) cancelKey(control); }
function keyReleased(event: KeyboardEvent): void {
  for (const control of [...keyOwners]) {
    const key = control.keyboard;
    if (!key || event.key !== key.key) continue;
    if (key.state === "cancelled" || key.completed || key.key === "Enter" || disabled(control.element)
      || !control.element.isConnected || !event.composedPath().includes(control.element) || event.defaultPrevented) forgetKey(control);
    else key.released = event; // Space's native click follows this release; retain the first capture until that click.
  }
}
function clear(control: Control): void {
  forgetKey(control);
  if (control.press?.kind === "pointer" && pointers.get(control.press.id) === control) pointers.delete(control.press.id);
  delete control.press;
}
function disabled(element: HTMLElement): boolean { return element instanceof HTMLButtonElement && element.disabled; }
/** Private event-lifecycle seam shared with the scripted binding owner; not a package export. */
export function updateControlBinding(element: HTMLElement, desired: HTMLElement): void {
  const capture = captures.get(desired);
  if (!capture) return;
  const current = controls.get(element);
  if (current) { current.capture = capture; return; }
  const control: Control = { element, capture }; controls.set(element, control);
  element.addEventListener("pointerdown", event => {
    if (event.button !== 0 || disabled(element)) return;
    clear(control);
    const prior = pointers.get(event.pointerId); if (prior) clear(prior);
    control.press = { kind: "pointer", id: event.pointerId, activate: control.capture() };
    pointers.set(event.pointerId, control);
  });
  element.addEventListener("keydown", event => {
    if ((event.key !== "Enter" && event.key !== " ") || disabled(element)) return;
    const held = control.keyboard;
    if (held?.state === "active" && !held.released) return; // A repeated start cannot recapture a newer Card.
    if (event.repeat) {
      // A cancelled or missed start grants no new gesture, including Enter's immediate repeat click.
      ownKey(control, { state: "cancelled", key: event.key, ...(event.key === "Enter" ? { repeat: event } : {}) });
      return;
    }
    forgetKey(control);
    ownKey(control, { state: "active", key: event.key, activate: control.capture(), completed: false });
  });
  element.addEventListener("blur", () => cancelKey(control));
  element.addEventListener("click", event => {
    if (!element.isConnected || disabled(element)) { clear(control); return; }
    const key = control.keyboard;
    if (event.detail === 0 && key) {
      if (key.state === "cancelled") {
        const repeat = key.repeat; delete key.repeat;
        if (repeat && !repeat.defaultPrevented) return;
        forgetKey(control); control.capture()(event); return; // No active gesture: an assistive click uses the current binding.
      }
      if (key.released?.defaultPrevented) { forgetKey(control); control.capture()(event); return; }
      if (key.completed || !key.activate) return; // Enter repeats stay native clicks, but invoke no second application action.
      const activate = key.activate; key.activate = null; key.completed = true;
      if (key.released) forgetKey(control);
      activate(event); return;
    }
    const activate = event.detail > 0 && control.press ? control.press.activate : control.capture();
    clear(control); activate(event);
  });
}
window.addEventListener("pointerup", event => {
  const control = pointers.get(event.pointerId);
  if (control && (disabled(control.element) || !event.composedPath().includes(control.element))) clear(control);
});
window.addEventListener("pointercancel", event => { const control = pointers.get(event.pointerId); if (control) clear(control); });
function retire(node: Node): void {
  if (node instanceof HTMLElement) { const control = controls.get(node); if (control) clear(control); }
  for (const child of node.childNodes) retire(child);
}
export function retireControls(root: Node): void { retire(root); }
function compatible(a: Node, b: Node): boolean {
  return a.nodeType === b.nodeType && (!(a instanceof Element) || b instanceof Element && a.localName === b.localName && a.namespaceURI === b.namespaceURI);
}
function attributes(element: Element, desired: Element): void {
  for (const old of [...element.attributes]) if (!desired.hasAttribute(old.name)) element.removeAttribute(old.name);
  for (const next of [...desired.attributes]) if (element.getAttribute(next.name) !== next.value) element.setAttribute(next.name, next.value);
}
function fresh(node: Node, parent: Node): () => Node {
  const reference = opaque.get(node);
  if (reference) {
    if (reference.element.isConnected && reference.element.parentNode !== parent) throw Error("A retained surface cannot move to another parent.");
    return () => { keys.set(reference.element, reference.key); return reference.element; };
  }
  if (node.isConnected) throw Error("The next Card tree must not contain a live child.");
  const children = [...node.childNodes].map(child => ({ child, materialize: fresh(child, node) }));
  return () => {
    for (const entry of children) {
      const value = entry.materialize(); if (value !== entry.child) node.replaceChild(value, entry.child);
    }
    if (node instanceof HTMLElement) updateControlBinding(node, node);
    return node;
  };
}
function plan(parent: Node, wanted: readonly Node[]): () => void {
  const old = [...parent.childNodes], used = new Set<Node>();
  const rows = wanted.map(template => {
    const reference = opaque.get(template), next = reference?.element ?? template;
    const key = reference?.key ?? keys.get(template);
    if (reference && next.isConnected && next.parentNode !== parent) throw Error("A retained surface cannot move to another parent.");
    const current = old.find(candidate => !used.has(candidate) && (reference ? candidate === next : keys.get(candidate) === key && compatible(candidate, next) && (key !== undefined || !(candidate instanceof Element) || next instanceof Element && candidate.getAttribute("class") === next.getAttribute("class"))));
    if (current) used.add(current);
    const apply = current && !reference ? patch(current, next) : null;
    const materialize = current ? null : fresh(template, parent);
    return { current, apply, materialize, key };
  });
  const positions = rows.flatMap(row => row.current ? [old.indexOf(row.current)] : []);
  if (positions.some((position, index) => index > 0 && position < positions[index - 1]!)) throw Error("The Card changed the order of retained controls.");
  return () => {
    let cursor = parent.firstChild;
    for (const row of rows) {
      while (cursor && cursor !== row.current && !used.has(cursor)) {
        const removed = cursor; cursor = cursor.nextSibling; retire(removed); parent.removeChild(removed);
      }
      if (row.current) {
        row.apply?.(); cursor = row.current.nextSibling;
      } else {
        const inserted = row.materialize!();
        if (row.key !== undefined) keys.set(inserted, row.key);
        parent.insertBefore(inserted, cursor);
      }
    }
    while (cursor) { const removed = cursor; cursor = cursor.nextSibling; retire(removed); parent.removeChild(removed); }
  };
}
function patch(current: Node, desired: Node): () => void {
  if (current instanceof Element && desired instanceof Element) {
    const children = plan(current, [...desired.childNodes]);
    return () => { attributes(current, desired); if (current instanceof HTMLElement && desired instanceof HTMLElement) updateControlBinding(current, desired); children(); };
  }
  return () => { if (current.nodeValue !== desired.nodeValue) current.nodeValue = desired.nodeValue; };
}
/** Build the complete plan before touching the live tree. There is no detach/reinsert fallback. */
export function reconcile(root: HTMLElement, desired: DocumentFragment): void { plan(root, [...desired.childNodes])(); }
