/** The generic host interpreter for a verified declared presentation. It
 * runs no package code. Its ports are native reads, not application adapters. */
import type { ApplicationProjectionQuery, ApplicationProjectionRead, ApplicationProjectionRow, Digest, FieldValue } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/artroom-bytes";
import type { ApplicationInstallation } from "@generalbusiness/artroom-bytes/application";
import { applicationProjectionId, isApplicationJournalSource, readApplicationPackage2, type ApplicationView, type PackedApplication2 } from "@generalbusiness/artroom-bytes/application-v2";
import { admit, evaluate, RuleEvalError } from "@generalbusiness/dap-derive/rule";
import { ViewError } from "./session.ts";
import type { Card, CardAction, Projection, ViewQuery, ViewSource } from "./types.ts";
import { PRESENTATION } from "./generated.ts";

export interface DeclaredViewPort {
  /** The current active native install, read under the configured membership. */
  installation(): Promise<ApplicationInstallation | null>;
  projection(query: ApplicationProjectionQuery): Promise<ApplicationProjectionRead>;
  /** Current native role actions. Unknown standing returns no actions. */
  actions(): Promise<readonly string[]>;
}
const text = (value: unknown): string => value === null || value === undefined ? "" : typeof value === "string" ? value : canonicalize(value);
const input = (row: ApplicationProjectionRow): Record<string, FieldValue | null> => ({ ...row.fields, id: row.id, type: row.type, state: row.state, revision: row.revision, ...(row.entry ? { time: row.time! } : {}) });
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
    return view.kind === "record" || view.kind === "log" ? "item" as const : "summary" as const;
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
  async #read(query: ViewQuery) {
    const view = this.#view(query), install = await this.port.installation();
    if (!install || canonicalize(install.ids) !== canonicalize(this.packet.ids) || install.definition !== this.packet.package.semantic.entry) throw new ViewError("unavailable", "The exact declared package is not active in this installation.");
    const selection: ApplicationProjectionQuery = { v: 1, scope: install.scope, directory: install.directory, install: install.item, projection: view.projection, items: query.items ?? {} };
    const reply = await this.port.projection(selection);
    if (!reply.ok) throw new ViewError(reply.reason === "forbidden" ? "unavailable" : reply.reason === "stale" ? "stale" : "unavailable", `The declared projection refused: ${reply.reason}.`);
    const projection = this.packet.package.semantic.projections[view.projection]!;
    if (reply.value.projection !== applicationProjectionId(projection) || canonicalize(reply.value.scope) !== canonicalize(install.scope)) throw new ViewError("unavailable", "The read does not name this declared projection and scope.");
    const rows = reply.value.sources[view.item];
    if (!rows) throw new ViewError("unavailable", "The read omitted the declared item source.");
    if (rows.some(row => isApplicationJournalSource(projection.sources[view.item]!) !== !!row.entry)) throw new ViewError("unavailable", "The read confused journal entries with native items.");
    return { view, install, reply, rows };
  }
  async #allowed(view: ApplicationView, row: ApplicationProjectionRow): Promise<CardAction[]> {
    if (view.kind === "surface" || !view.acts.length) return [];
    const held = await this.port.actions(), actions: CardAction[] = [];
    for (const control of view.acts) {
      if (!held.includes(control.needs)) continue;
      let holds = false;
      try { holds = (await evaluate(control.when, input(row))).value === true; }
      catch (error) { if (!(error instanceof RuleEvalError)) throw error; }
      if (holds) actions.push({ id: control.act, label: control.label, purpose: "act", kind: control.act, args: {} });
    }
    return actions;
  }
  async read(query: ViewQuery): Promise<Projection> {
    const { view, install, reply, rows } = await this.#read(query);
    if (!rows.length) return { status: "empty", position: 0, count: 0, data: reply.value,
      fallback: view.kind === "log" ? "This declared log has no matching entries in its recent window." : "This declared view has no matching items." };
    if (!Number.isSafeInteger(query.position) || query.position < 0 || query.position >= rows.length) throw new ViewError("shape", "The declared view position is outside its complete projection.");
    const row = rows[query.position]!, values = input(row), waiting = Object.hasOwn(view.waiting, row.state) ? template(view.waiting[row.state]!, row, "") : "";
    const fallback = template(view.fallback, row, waiting), actions = await this.#allowed(view, row);
    for (const action of actions) action.args = { target: install.scope.scope, on: row.id, at: { on: row.revision }, digest: install.definition };
    const card: Card = {
      identity: { item: String(row.id), kind: row.entry ? "entry" : row.type, revision: String(row.revision), subject: { scope: install.scope.scope, ...(row.entry ? {} : { item: row.id }) }, at: row.entry ? {} : { on: row.revision } },
      title: view.kind === "surface" ? query.screen : text(values[view.title]), summary: view.kind === "surface" || view.summary === null ? "" : text(values[view.summary]),
      reasons: view.kind === "surface" ? [] : view.facts.map(name => `${name}: ${text(values[name])}`),
      projection: [{ scope: install.scope.scope, ...reply.value.at }], reviewIntended: [], unavailable: [], waitsOn: waiting ? [waiting] : [], settles: [], actions, fallback,
      declared: { kind: view.kind, source: view.item, context: template(view.context, row, waiting), actor: view.kind === "surface" || view.actor === null ? null : values[view.actor] ?? null,
        refresh: view.refresh, display: view.display, back: view.back, data: reply.value,
        ...(view.kind === "log" ? { log: rows.map(row => {
          if (!row.entry || !row.time) throw new ViewError("unavailable", "A log needs explicit sealed entry facts.");
          const values = input(row);
          return { entry: row.entry, time: row.time, title: text(values[view.title]), summary: view.summary === null ? "" : text(values[view.summary]), facts: view.facts.filter(name => name !== "time").map(name => `${name}: ${text(values[name])}`) };
        }) } : {}),
        ...(view.kind === "surface" ? { resource: view.resource, opens: view.opens } : {}) },
    };
    return { status: "ready", position: query.position, count: rows.length, card, fallback };
  }
  /** Called by the mounted-view host inside the custody build, immediately
   * before signing. Native expected revisions and grants still judge submit. */
  async admit(query: ViewQuery, card: Card, action: CardAction): Promise<void> {
    const { view, install, rows } = await this.#read(query);
    const row = rows.find(row => row.id === card.identity.subject.item);
    if (!row || card.identity.subject.scope !== install.scope.scope || canonicalize(card.declared?.data.scope ?? null) !== canonicalize(install.scope)
      || String(row.revision) !== card.identity.revision) throw new ViewError("stale", "The declared item changed. Refresh before acting; no new request was signed.");
    const actions = await this.#allowed(view, row);
    if (!actions.some(current => current.kind === action.kind && current.id === action.id)) throw new ViewError("stale", "This act is no longer offered under the current when and held actions; no new request was signed.");
  }
}
