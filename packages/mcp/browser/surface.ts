/** Trusted browser presentation integration, not a hostile-code boundary.
 * Package code receives a DOM root, native data and declared navigation. */
import type { ApplicationProjectionData } from "@generalbusiness/dap-contract";
import type { DeclaredSurface } from "../src/views/types.ts";

export interface SurfaceApi {
  readonly root: ShadowRoot;
  readonly signal: AbortSignal;
  onData(render: (data: ApplicationProjectionData) => void): void;
  open(name: string, items?: Readonly<Record<string, number>>): Promise<void>;
}
declare global { interface Window { dapSurface?: SurfaceApi } }
interface Panel {
  element: HTMLElement;
  controller: AbortController;
  render?: (data: ApplicationProjectionData) => void;
  last?: string;
  error?: Error;
}

export class SurfacePanels {
  readonly #panels = new Map<string, Panel>();
  show(surface: DeclaredSurface, data: ApplicationProjectionData,
    open: SurfaceApi["open"], current: () => boolean): HTMLElement {
    const key = JSON.stringify([surface.screen, surface.resource, surface.html]);
    let panel = this.#panels.get(key);
    if (!panel) {
      if (this.#panels.size >= 32) throw Error("This kit retains its maximum of 32 surface resources.");
      const documentOf = new DOMParser().parseFromString(surface.html, "text/html"), scripts = [...documentOf.querySelectorAll("script")];
      if (scripts.some(script => script.hasAttribute("src") || script.async || script.defer || !["", "text/javascript", "application/javascript"].includes(script.type))) throw Error("A declared surface needs self-contained classic inline scripts.");
      scripts.forEach(script => script.remove());
      const element = document.createElement("section"), root = element.attachShadow({ mode: "open" }), controller = new AbortController();
      element.className = "declared-surface";
      root.append(...[...documentOf.head.querySelectorAll("style"), ...documentOf.body.childNodes].map(node => document.importNode(node, true)));
      panel = { element, controller };
      this.#panels.set(key, panel);
      const retained = panel;
      const api: SurfaceApi = Object.freeze({ root, signal: controller.signal,
        onData(render: Panel["render"]) {
          if (typeof render !== "function") throw Error("A surface renderer must be a function.");
          if (retained.render) throw Error("A surface registers one data renderer.");
          retained.render = render;
        },
        async open(name: string, items?: Readonly<Record<string, number>>) {
          if (controller.signal.aborted || !current()) throw Error("This surface is no longer current.");
          if (!Object.hasOwn(surface.opens, name)) throw Error("This surface declares no such opening.");
          await open(name, items);
        },
      });
      let initializationError: Error | undefined;
      const failed = (event: ErrorEvent) => { initializationError = event.error instanceof Error ? event.error : Error(event.message); event.preventDefault(); };
      window.addEventListener("error", failed);
      let ownsSlot = false;
      try {
        if (Object.hasOwn(window, "dapSurface")) throw Error("The surface initialization slot is already occupied.");
        Object.defineProperty(window, "dapSurface", { value: api, configurable: true }); ownsSlot = true;
        for (const script of scripts) {
          const execute = document.createElement("script");
          execute.textContent = script.textContent;
          document.head.append(execute); execute.remove();
          if (initializationError) throw initializationError;
        }
      } catch (error) { controller.abort(); panel.error = error instanceof Error ? error : Error(String(error)); }
      finally { window.removeEventListener("error", failed); if (ownsSlot) delete window.dapSurface; }
    }
    if (panel.error) throw panel.error;
    const encoded = JSON.stringify(data);
    if (encoded !== panel.last) {
      panel.render?.(structuredClone(data));
      panel.last = encoded;
    }
    return panel.element;
  }
  close() {
    for (const panel of this.#panels.values()) panel.controller.abort();
    this.#panels.clear();
  }
}
