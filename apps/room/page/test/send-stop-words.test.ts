import { expect, test, vi } from "vitest";
import { digestBytes, keyIdOfSecret, newIncarnation, scopeIdOf } from "@generalbusiness/dap-bytes";
import { workbenchFixtures } from "./workbench-fixture.ts";

// Invariant: a stop on the send path speaks of this press. A reload in an outage leaves no lock, so an earlier press can have no known outcome.
// The real `send` of main.ts runs over a minimal DOM and a scripted data boundary. No browser, native scope or transport runs. The list read fails, as in that outage.
test("a changed room or key stops the send, and the words speak of this press", ({ onTestFinished }) => workbenchFixtures.run(onTestFinished, async fixture => {
  const gate = () => { let resolve!: () => void; const promise = new Promise<void>((done) => { resolve = done; }); return { promise, resolve }; };
  let rendered = gate();
  class Element {
    children: (Element | string)[] = [];
    attrs: Record<string, string> = {};
    parent: Element | null = null;
    handlers = new Map<string, (event: { preventDefault(): void }) => void>();
    constructor(readonly tag: string) {}
    setAttribute(name: string, value: string) { this.attrs[name] = value; }
    append(...children: (Element | string)[]) { for (const child of children) { if (child instanceof Element) { child.remove(); child.parent = this; } this.children.push(child); } }
    prepend(...children: (Element | string)[]) { for (const child of [...children].reverse()) { if (child instanceof Element) { child.remove(); child.parent = this; } this.children.unshift(child); } }
    replaceChildren(...children: (Element | string)[]) { for (const child of this.children) if (child instanceof Element) child.parent = null; this.children = []; this.append(...children); if (this === root && (this.all().some(node => node.attrs["class"] === "rail") || this.all().some(node => node.tag === "h1" && node.textContent !== "Opening your room"))) rendered.resolve(); }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null; }
    addEventListener(name: string, handler: (event: { preventDefault(): void }) => void) { this.handlers.set(name, handler); }
    focus() {}
    showModal() { this.setAttribute("open", ""); }
    close() { this.removeAttribute("open"); }
    contains(node: Element) { return this.all().includes(node); }
    removeAttribute(name: string) { delete this.attrs[name]; }
    hasAttribute(name: string) { return Object.hasOwn(this.attrs, name); }
    querySelector(selector: string) { return this.querySelectorAll(selector)[0] ?? null; }
    getAttribute(name: string) { return this.attrs[name] ?? null; }
    all(): Element[] { return [this, ...this.children.flatMap(child => typeof child === "string" ? [] : child.all())]; }
    matches(selector: string): boolean {
      const part = /^([a-z-]+)?(?:\[([^=\]]+)(?:="([^"]*)")?\])?$/.exec(selector);
      if (!part) return selector.startsWith(".") && (this.attrs["class"] ?? "").split(/\s+/).includes(selector.slice(1));
      return (!part[1] || this.tag === part[1]) && (!part[2] || this.hasAttribute(part[2]) && (part[3] === undefined || this.getAttribute(part[2]) === part[3]));
    }
    querySelectorAll(selector: string) {
      return this.all().slice(1).filter(node => selector.split(",").some(choice => {
        const [ancestor, descendant] = choice.trim().split(/\s+/, 2);
        if (!descendant) return node.matches(ancestor!);
        if (!node.matches(descendant)) return false;
        for (let parent = node.parent; parent; parent = parent.parent) if (parent.matches(ancestor!)) return true;
        return false;
      }));
    }
    set textContent(value: string) { this.children = [value]; }
    get textContent(): string { return this.children.map((child) => typeof child === "string" ? child : child.textContent).join(" "); }
  }
  const root = new Element("div"), body = new Element("body"); body.append(root);
  const main = () => { const host = new Element("main"); const slot = new Element("div"); slot.setAttribute("data-action-slot", "create"); host.append(slot); return host; };
  const digest = digestBytes(new Uint8Array([5, 4, 3, 7]));
  const membership = { scope: scopeIdOf({ v: 1, kind: "membership", definition: digest, creator: null, cause: digest, ordinal: 0 }), kind: "membership", inc: newIncarnation(new Uint8Array(16).fill(55)) };
  const key = keyIdOfSecret(new Uint8Array(32).fill(41)), otherKey = keyIdOfSecret(new Uint8Array(32).fill(42));
  const forbidden = vi.fn(async () => { throw new Error("Unexpected UI key operation"); });
  const kept = { place: { directory: "directory", membership }, publicKey: key };
  let context = kept;
  const changeContext = () => { context = { ...kept, publicKey: otherKey }; };
  const room = { session: { service: "https://page.test", signer: { key, sign: forbidden } }, ...kept.place, rules: "rules", key, me: { handle: "@reader", role: "member", actions: [], ref: { membership, member: "@reader" } } };
  let send!: (kind: string, on: string, fields: Record<string, string>, accepted?: () => void, beforeSign?: () => Promise<void>) => unknown;
  let stop: "submitting" | "stopping" = "submitting";
  const dataAct = vi.fn(async (...args: unknown[]) => {
    changeContext();
    if (stop === "submitting") (args[5] as (digest: string) => void)("digest"); else (args[6] as () => void)();
  });
  const outcomes: string[] = [];
  const list = vi.fn(async () => { throw new Error("no reply to the list"); });
  vi.doMock("../src/browser-key-store.ts", () => ({ pageKeyStore: () => ({ load: async (asked: string) => ({ key: asked, sign: forbidden }), create: forbidden, migrate: forbidden, saveSettings: forbidden }) }));
  vi.doMock("@generalbusiness/dap-bytes", async () => ({ ...await vi.importActual<typeof import("@generalbusiness/dap-bytes")>("@generalbusiness/dap-bytes"), b64url: () => "device", unb64url: () => new Uint8Array(32), keyIdOfSecret: () => "key", isScopeRef: (value: unknown) => !!value && typeof value === "object" && "kind" in value }));
  vi.doMock("../src/tasks.ts", async () => ({ ...await vi.importActual<typeof import("../src/tasks.ts")>("../src/tasks.ts"), issueDialogOutcome: (_context: string, _state: string, message: string) => { outcomes.push(message); } }));
  vi.doMock("../src/data.ts", async () => {
    const { sessionKey, Unreadable } = await vi.importActual<typeof import("../src/data.ts")>("../src/data.ts");
    return { sessionKey, Unreadable, act: dataAct, actAssociation: (_room: unknown, scope: string) => `room/member/${scope}`, actsOn: async () => ({ acts: [{ kind: "comment", fields: [] }], hidden: 0 }), fieldValue: (_room: unknown, _type: unknown, value: string) => value,
      renewLost: async () => {}, fresh: async () => {}, sessionLost: () => false, copiesOf: () => ({ list }),
      initializationStillCurrent: async () => true, roomInitialization: async () => ({ state: "configured" }), openRoom: async (session: import("../src/data.ts").Session) => ({ ...room, session, key: context.publicKey, directory: context.place.directory, membership: context.place.membership, name: "Recorded room" }), loadNeedsYou: async () => undefined, listLanes: async () => ({ issues: [], changes: [] }), siteAddress: () => "/site/", placeOf: () => null, joinRoom: vi.fn(), loadChange: vi.fn(), loadIssue: vi.fn(), loadRules: vi.fn() };
  });
  vi.doMock("../src/view.ts", async () => {
    const { failureScreen } = await vi.importActual<typeof import("../src/view.ts")>("../src/view.ts");
    return { whoLine: () => new Element("p"), icon: () => new Element("svg"), failureScreen, roomScreen: () => main(), issueScreen: () => main(), changeScreen: () => main(), rulesScreen: () => main(), answerLine: () => new Element("p"), nonacceptedAnswerText: vi.fn(),
      h: (tag: string, attrs: Record<string, string> = {}, ...children: unknown[]) => { const el = new Element(tag); el.attrs = attrs; el.append(...children.flat().filter((child) => child !== null && child !== false && child !== undefined) as (Element | string)[]); return el; },
      actsPanel: (_offered: unknown, callback: typeof send) => { send = callback; return new Element("section"); } };
  });
  vi.stubGlobal("document", { body, getElementById: () => root, createElement: (tag: string) => new Element(tag) });
  vi.stubGlobal("location", { origin: "https://page.test", hash: "#/" });
  vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(context) });
  vi.stubGlobal("window", { addEventListener: () => {} });
  vi.stubGlobal("alert", vi.fn());
  try {
    await fixture.load(() => import("../src/main.ts"));
    await fixture.wait(() => rendered.promise);
    expect(list).toHaveBeenCalled(); // The read failed, so no lock stands, and the press goes on to these stops.
    const press = async (beforeSign?: () => Promise<void>) => { outcomes.length = 0; context = kept; await fixture.wait(async () => send("comment", "", {}, undefined, beforeSign)); return [...outcomes]; };
    expect(await press(async () => { changeContext(); })).toEqual(["The room or key changed before signing. This press sent nothing."]);
    expect(dataAct).not.toHaveBeenCalled();
    stop = "submitting";
    expect(await press()).toEqual(["The room or key changed before submission. This press sent nothing."]);
    stop = "stopping";
    expect(await press()).toEqual(["The room or key changed before submission. This press sent nothing."]);
    expect(dataAct).toHaveBeenCalledTimes(2);
  } finally {
    await fixture.retire();
    vi.unstubAllGlobals();
    for (const path of ["../src/browser-key-store.ts", "../src/data.ts", "../src/view.ts", "../src/tasks.ts", "@generalbusiness/dap-bytes"]) vi.doUnmock(path);
    vi.resetModules();
  }
  expect(forbidden).not.toHaveBeenCalled();
}));
