/** The generic host interpreter for a verified declared presentation. It
 * runs no package code. Its ports are native reads, not application adapters. */
import type { ApplicationProjectionData, ApplicationProjectionQuery, ApplicationProjectionRead, ApplicationProjectionRow, Digest, FieldValue, ScopeRef } from "@generalbusiness/dap-contract";
import { applicationItemSnapshot } from "@generalbusiness/artroom-client";
import { canonicalize, parseStrict, unb64url } from "@generalbusiness/artroom-bytes";
import type { ApplicationInstallation } from "@generalbusiness/artroom-bytes/application";
import { applicationProjectionId, isApplicationJournalSource, readApplicationPackage2, type ApplicationView, type PackedApplication2 } from "@generalbusiness/artroom-bytes/application-v2";
import { admit, evaluate, RuleEvalError } from "@generalbusiness/dap-derive/rule";
import { ViewError } from "./session.ts";
import type { Card, CardAction, DeclaredSurface, Projection, ViewQuery, ViewSource } from "./types.ts";
import { PRESENTATION } from "./generated.ts";
import type { DefinitionLike } from "../describe.ts";
import { effectiveFields, expectedOf } from "../shape.ts";

export interface DeclaredViewPort {
  /** The current active native install, read under the configured membership. */
  installation(): Promise<ApplicationInstallation | null>;
  projection(query: ApplicationProjectionQuery): Promise<ApplicationProjectionRead>;
  /** Current native role actions. Unknown standing returns no actions. */
  actions(): Promise<readonly string[]>;
}
const text = (value: unknown): string => value === null || value === undefined ? "" : typeof value === "string" ? value : canonicalize(value);
const input = (row: ApplicationProjectionRow): Record<string, FieldValue | null> => ({ ...row.fields, id: row.id, type: row.type, state: row.state, revision: row.revision, ...(row.entry ? { time: row.time!, on: row.on! } : {}) });
const template = (source: string, row: ApplicationProjectionRow, waiting: string): string => {
  const values = { ...input(row), waiting };
  return source.replace(/\{([^{}]+)\}/g, (_whole, key: string) => text(Object.hasOwn(values, key) ? values[key as keyof typeof values] : null));
};
export class DeclaredViewSource implements ViewSource {
  readonly declared = true;
  readonly packet: PackedApplication2;
  get screens() { return Object.keys(this.packet.package.presentation.views).map(name => ({ name, resource: `ui://dap/declared/${name}` })); }
  get presentation() {
    return { resources: this.screens.map(({ name, resource }) => ({ ...PRESENTATION.resources[0]!, uri: resource, name,
      description: `Declared ${this.packet.package.presentation.views[name]!.kind} view. Private data is read separately through app-only tools.` })) };
  }
  initialPage(screen: string) {
    const view = this.#view({ screen, page: "summary", position: 0 });
    return view.kind === "record" || view.kind === "log" || view.kind === "surface" ? "item" as const : "summary" as const;
  }
  constructor(bytes: Uint8Array, release: Digest, readonly port: DeclaredViewPort) {
    this.packet = readApplicationPackage2(bytes, release, { bytes: 4 * 1024 * 1024 });
    for (const view of Object.values(this.packet.package.presentation.views)) for (const control of view.acts) admit(control.when);
  }
  #view(query: ViewQuery): ApplicationView {
    const views = this.packet.package.presentation.views;
    if (!Object.hasOwn(views, query.screen)) throw new ViewError("shape", "This package declares no such view.");
    return views[query.screen]!;
  }
  #backScope(view: ApplicationView, selected: ScopeRef, root: ScopeRef): ScopeRef {
    const projections = this.packet.package.semantic.projections;
    const target = view.back ? this.packet.package.presentation.views[view.back]! : null;
    return target && projections[target.projection]!.definition === this.packet.package.semantic.entry
      && projections[target.projection]!.definition !== projections[view.projection]!.definition ? root : selected;
  }
  #surface(screen: string, view: ApplicationView, backScope: ScopeRef): DeclaredSurface | undefined {
    if (view.kind !== "surface") return undefined;
    const path = this.packet.package.presentation.resources[view.resource]!;
    const asset = this.packet.package.presentation.assets.find(asset => asset.path === path)!;
    const bytes = unb64url(asset.bytes);
    if (!bytes) throw new ViewError("unavailable", "The declared surface bytes are unavailable.");
    return { screen, resource: view.resource, html: new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes),
      opens: view.opens, refresh: view.refresh, display: view.display, back: view.back, backScope };
  }
  async #read(query: ViewQuery) {
    const view = this.#view(query), install = await this.port.installation();
    if (!install || canonicalize(install.ids) !== canonicalize(this.packet.ids) || install.definition !== this.packet.package.semantic.entry) throw new ViewError("unavailable", "The exact declared package is not active in this installation.");
    const selection: ApplicationProjectionQuery = { v: 1, scope: query.scope ?? install.scope, directory: install.directory, install: install.item, projection: view.projection, items: query.items ?? {} };
    const reply = await this.port.projection(selection);
    if (!reply.ok) throw new ViewError(reply.reason === "forbidden" ? "unavailable" : reply.reason === "stale" ? "stale" : "unavailable", `The declared projection refused: ${reply.reason}.`);
    const projection = this.packet.package.semantic.projections[view.projection]!;
    if (reply.value.projection !== applicationProjectionId(projection) || canonicalize(reply.value.scope) !== canonicalize(selection.scope)) throw new ViewError("unavailable", "The read does not name this declared projection and scope.");
    const rows = reply.value.sources[view.item];
    if (!rows) throw new ViewError("unavailable", "The read omitted the declared item source.");
    if (rows.some(row => isApplicationJournalSource(projection.sources[view.item]!) !== !!row.entry)) throw new ViewError("unavailable", "The read confused journal entries with native items.");
    return { view, root: install.scope, scope: selection.scope, definition: projection.definition, reply, rows };
  }
  /** Only selected native item metadata and ref slots resolve subjects. This
   * is not an Item read and supplies no opened/attributed or review claim. */
  #expected(view: ApplicationView, act: string, row: ApplicationProjectionRow, data: ApplicationProjectionData): Record<string, number> | null {
    const projection = this.packet.package.semantic.projections[view.projection]!;
    const part = this.packet.package.semantic.definitions.find(part => part.id === projection.definition)!;
    const definition = parseStrict(part.bytes) as DefinitionLike, declaration = definition.acts[act]!;
    const items = applicationItemSnapshot(projection, data).items;
    const expected = expectedOf(declaration, items, row.id, effectiveFields(declaration, {}, data.scope));
    // An absent secondary row is not permission to sign an incomplete set.
    const names = Object.entries(declaration.also).filter(([, rule]) => rule["code"] === undefined).map(([name]) => name);
    if (declaration.step === "transition") names.push("on");
    return names.every(name => Object.hasOwn(expected, name)) ? expected : null;
  }
  async #allowed(view: ApplicationView, row: ApplicationProjectionRow, data: ApplicationProjectionData, scope: ScopeRef, definition: Digest): Promise<CardAction[]> {
    if (view.kind === "surface" || !view.acts.length) return [];
    const held = await this.port.actions(), actions: CardAction[] = [];
    for (const control of view.acts) {
      if (!held.includes(control.needs)) continue;
      let holds = false;
      try { holds = (await evaluate(control.when, input(row))).value === true; }
      catch (error) { if (!(error instanceof RuleEvalError)) throw error; }
      const at = holds ? this.#expected(view, control.act, row, data) : null;
      if (at !== null) actions.push({ id: control.act, label: control.label, purpose: "act", kind: control.act,
        args: { target: scope.scope, on: row.id, at, digest: definition } });
    }
    return actions;
  }
  async read(query: ViewQuery): Promise<Projection> {
    const { view, root, scope, definition, reply, rows } = await this.#read(query);
    const backScope = this.#backScope(view, scope, root), surface = this.#surface(query.screen, view, backScope);
    if (!rows.length) return { status: "empty", position: 0, count: 0, data: reply.value,
      ...(surface ? { surface } : {}),
      fallback: view.kind === "log" ? "This declared log has no matching entries in its recent window." : "This declared view has no matching items." };
    if (!Number.isSafeInteger(query.position) || query.position < 0 || query.position >= rows.length) throw new ViewError("shape", "The declared view position is outside its complete projection.");
    const row = rows[query.position]!, values = input(row), waiting = Object.hasOwn(view.waiting, row.state) ? template(view.waiting[row.state]!, row, "") : "";
    const fallback = template(view.fallback, row, waiting), actions = await this.#allowed(view, row, reply.value, scope, definition);
    const card: Card = {
      identity: surface ? { item: scope.scope, kind: "scope", revision: String(reply.value.at.seq), subject: { scope: scope.scope }, at: {} }
        : { item: String(row.id), kind: row.entry ? "entry" : row.type, revision: String(row.revision), subject: { scope: scope.scope, ...(row.entry ? {} : { item: row.id }) }, at: row.entry ? {} : { on: row.revision } },
      title: view.kind === "surface" ? query.screen : text(values[view.title]), summary: view.kind === "surface" || view.summary === null ? "" : text(values[view.summary]),
      reasons: view.kind === "surface" ? [] : view.facts.map(name => `${name}: ${text(values[name])}`),
      projection: [{ scope: scope.scope, ...reply.value.at }], reviewIntended: [], unavailable: [], waitsOn: waiting ? [waiting] : [], settles: [], actions, fallback,
      declared: { kind: view.kind, source: view.item, context: template(view.context, row, waiting), actor: view.kind === "surface" || view.actor === null ? null : values[view.actor] ?? null,
        refresh: view.refresh, display: view.display, back: view.back, backScope, data: reply.value,
        ...(view.kind === "log" ? { log: rows.map(row => {
          if (!row.entry || !row.time) throw new ViewError("unavailable", "A log needs explicit sealed entry facts.");
          const values = input(row);
          return { entry: row.entry, time: row.time, title: text(values[view.title]), summary: view.summary === null ? "" : text(values[view.summary]), facts: view.facts.filter(name => name !== "time").map(name => `${name}: ${text(values[name])}`) };
        }) } : {}),
        ...(surface ? { resource: surface.resource, opens: surface.opens, surface } : {}) },
    };
    return { status: "ready", position: query.position, count: rows.length, card, fallback };
  }
  /** Called by the mounted-view host inside the custody build, immediately
   * before signing. Native expected revisions and grants still judge submit. */
  async admit(query: ViewQuery, card: Card, action: CardAction): Promise<void> {
    const { view, scope, definition, reply, rows } = await this.#read(query);
    const row = rows.find(row => row.id === card.identity.subject.item);
    if (!row || card.identity.subject.scope !== scope.scope || canonicalize(card.declared?.data.scope ?? null) !== canonicalize(scope)
      || String(row.revision) !== card.identity.revision) throw new ViewError("stale", "The declared item changed. Refresh before acting; no new request was signed.");
    const actions = await this.#allowed(view, row, reply.value, scope, definition);
    if (!actions.some(current => current.kind === action.kind && current.id === action.id && canonicalize(current.args) === canonicalize(action.args))) throw new ViewError("stale", "This act or one of its subjects changed under the current when and held actions; no new request was signed.");
  }
}
