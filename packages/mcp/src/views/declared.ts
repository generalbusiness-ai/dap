/** The generic host interpreter for a verified declared presentation. It
 * runs no package code. Its ports are native reads, not application adapters. */
import type { ApplicationProjectionData, ApplicationProjectionQuery, ApplicationProjectionRead, ApplicationProjectionRow, Digest, FieldValue, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import { applicationItemSnapshot } from "@generalbusiness/dap-client";
import { canonicalize, isLocalId, isMemberRef, parseStrict, unb64url } from "@generalbusiness/dap-bytes";
import type { ApplicationInstallation } from "@generalbusiness/dap-bytes/application";
import { applicationProjectionId, applicationViewFactField, isApplicationJournalSource, readPublishedApplicationPackage2, type ApplicationView, type ApplicationViewAct, type PublishedPackedApplication2 } from "@generalbusiness/dap-bytes/application-v2";
import { admit, evaluate, RuleEvalError } from "@generalbusiness/dap-derive/rule";
import { ViewError } from "./session.ts";
import type { Card, CardAction, DeclaredSurface, Projection, ViewQuery, ViewSource } from "./types.ts";
import { PRESENTATION } from "./generated.ts";
import type { DefinitionLike } from "../describe.ts";
import { effectiveFields, expectedOf } from "../shape.ts";
import { formatInteger } from "./numbers.ts";
import { formatFact } from "./facts.ts";
import { orderedViewRows } from "./ordering.ts";
import { decodeViewParameters } from "@generalbusiness/dap-bytes/application-v2";
import { projectionMemberFacts, projectionMembers } from "./members.ts";
import type { MemberTable, MembershipDisplayRead } from "./member-types.ts";
import { memberValueText } from "./member-text.ts";

const controlId = (view: ApplicationView, control: ApplicationViewAct, index: number) => view.acts.filter(choice => choice.act === control.act).length > 1 ? `${control.act}:${index}` : control.act;

export interface DeclaredViewPort {
  /** Host wall clock for display ages only; never native admission. */
  now?(): number;
  /** The current active native install, read under the configured membership. */
  installation(): Promise<ApplicationInstallation | null>;
  projection(query: ApplicationProjectionQuery): Promise<ApplicationProjectionRead>;
  /** Current native role actions. Unknown standing returns no actions. */
  actions(): Promise<readonly string[]>;
  /** Authenticated bounded display reads only; never native authority. */
  members?: MembershipDisplayRead;
  /** Authenticated native member and current grants; never caller arguments.
   * Unavailable identity must not select a member's carousel. */
  viewer?(): Promise<{ member: MemberRef; grants: readonly string[] } | null>;
}
const displayText = (value: unknown): string => value === null || value === undefined ? "" : typeof value === "string" ? value : canonicalize(value);
const input = (row: ApplicationProjectionRow): Record<string, FieldValue | null> => ({ ...row.fields, id: row.id, type: row.type, state: row.state, revision: row.revision, ...(row.entry ? { time: row.time!, on: row.on! } : {}) });
const template = (source: string, row: ApplicationProjectionRow, waiting: string, members?: MemberTable): string => {
  const values = { ...input(row), waiting };
  return source.replace(/\{([^{}]+)\}/g, (_whole, key: string) => {
    const value = Object.hasOwn(values, key) ? values[key as keyof typeof values] : null;
    return memberValueText(value, members) ?? displayText(value);
  });
};
export class DeclaredViewSource implements ViewSource {
  readonly declared = true;
  readonly packet: PublishedPackedApplication2;
  get inputActs() {
    return Object.entries(this.packet.package.presentation.views).flatMap(([screen, view]) => view.acts.flatMap((control, index) =>
      control.parameters ? [{ screen, id: controlId(view, control, index), label: control.label, parameters: control.parameters }] : []));
  }
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
    this.packet = readPublishedApplicationPackage2(bytes, release, { bytes: 4 * 1024 * 1024 });
    for (const view of Object.values(this.packet.package.presentation.views)) {
      if (view.kind !== "surface" && view.for) admit(view.for);
      for (const control of view.acts) admit(control.when);
    }
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
  async #projection(selection: ApplicationProjectionQuery) {
    const reply = await this.port.projection(selection);
    if (!reply.ok) throw new ViewError(reply.reason === "stale" ? "stale" : "unavailable", `The declared projection refused: ${reply.reason}.`);
    const projection = this.packet.package.semantic.projections[selection.projection]!;
    if (reply.value.projection !== applicationProjectionId(projection) || canonicalize(reply.value.scope) !== canonicalize(selection.scope)) throw new ViewError("unavailable", "The read does not name this declared projection and scope.");
    return reply;
  }
  async #read(query: ViewQuery) {
    const view = this.#view(query), install = await this.port.installation();
    if (!install || canonicalize(install.ids) !== canonicalize(this.packet.ids) || install.definition !== this.packet.package.semantic.entry) throw new ViewError("unavailable", "The exact declared package is not active in this installation.");
    const selection: ApplicationProjectionQuery = { v: 1, scope: query.scope ?? install.scope, directory: install.directory, install: install.item, projection: view.projection, items: query.items ?? {} };
    const reply = await this.#projection(selection);
    const projection = this.packet.package.semantic.projections[view.projection]!;
    const nativeRows = reply.value.sources[view.item];
    if (!nativeRows) throw new ViewError("unavailable", "The read omitted the declared item source.");
    let rows = view.kind !== "surface" && view.order ? orderedViewRows(nativeRows, view.order) : nativeRows;
    if (rows.some(row => isApplicationJournalSource(projection.sources[view.item]!) !== !!row.entry)) throw new ViewError("unavailable", "The read confused journal entries with native items.");
    const routed = view.kind === "carousel" && !!view.for;
    const unknown = new Set<number>();
    const points = [{ scope: selection.scope.scope, ...reply.value.at }];
    if (view.kind === "carousel" && view.for) {
      const viewer = await this.port.viewer?.();
      if (!viewer || !isMemberRef(viewer.member) || canonicalize(viewer.member.membership) !== canonicalize(install.membership)
        || !Array.isArray(viewer.grants) || viewer.grants.some(grant => typeof grant !== "string")) throw new ViewError("unavailable", "Your member identity is unavailable. Refresh before opening this queue.");
      const reads: Record<string, ApplicationProjectionData> = {};
      for (const [name, read] of Object.entries(view.reads ?? {})) {
        const related = await this.#projection({ v: 1, scope: install.scope, directory: install.directory, install: install.item, projection: read.projection, items: {} });
        reads[name] = related.value;
        points.push({ scope: related.value.scope.scope, ...related.value.at });
      }
      const selected: ApplicationProjectionRow[] = [];
      for (const row of rows) {
        let result: unknown;
        try { result = (await evaluate(view.for, { viewer, item: input(row), scope: reply.value.scope, reads })).value; }
        catch (error) {
          if (!(error instanceof RuleEvalError)) throw error;
          result = null;
        }
        if (result !== true && result !== false) unknown.add(row.id);
        if (result !== false) selected.push(row);
      }
      rows = selected;
    }
    return { view, root: install.scope, scope: selection.scope, definition: projection.definition, reply, rows, routed, points, unknown };
  }
  /** Only selected native item metadata and ref slots resolve subjects. This
   * is not an Item read and supplies no opened/attributed or review claim. */
  #expected(view: ApplicationView, control: ApplicationViewAct, row: ApplicationProjectionRow, data: ApplicationProjectionData): Record<string, number> | null {
    const projection = this.packet.package.semantic.projections[view.projection]!;
    const part = this.packet.package.semantic.definitions.find(part => part.id === projection.definition)!;
    const definition = parseStrict(part.bytes) as DefinitionLike, declaration = definition.acts[control.act]!;
    const items = applicationItemSnapshot(projection, data).items;
    const expected = expectedOf(declaration, items, row.id, effectiveFields(declaration, control.args ?? {}, data.scope));
    // An absent secondary row is not permission to sign an incomplete set.
    const names = Object.entries(declaration.also).filter(([, rule]) => rule["code"] === undefined).map(([name]) => name);
    if (declaration.step === "transition") names.push("on");
    return names.every(name => Object.hasOwn(expected, name)) ? expected : null;
  }
  async #allowed(view: ApplicationView, row: ApplicationProjectionRow, data: ApplicationProjectionData, scope: ScopeRef, definition: Digest): Promise<CardAction[]> {
    if (view.kind === "surface" || !view.acts.length) return [];
    const held = await this.port.actions(), actions: CardAction[] = [];
    for (const [index, control] of view.acts.entries()) {
      if (!held.includes(control.needs)) continue;
      let holds = false;
      try { holds = (await evaluate(control.when, input(row))).value === true; }
      catch (error) { if (!(error instanceof RuleEvalError)) throw error; }
      const at = holds ? this.#expected(view, control, row, data) : null;
      if (at !== null) actions.push({ id: controlId(view, control, index), label: control.label, purpose: "act", kind: control.act, ...(control.parameters ? { parameters: control.parameters } : {}),
        args: { target: scope.scope, on: row.id, at, digest: definition, ...(control.args ? { fields: control.args } : {}) } });
    }
    return actions;
  }
  #series(view: ApplicationView, row: ApplicationProjectionRow, data: ApplicationProjectionData): NonNullable<Card["declared"]>["series"] {
    if (view.kind === "surface" || !view.series) return undefined;
    const series = view.series, projection = this.packet.package.semantic.projections[view.projection]!;
    const source = projection.sources[series.source]!;
    if (!isApplicationJournalSource(source)) throw new ViewError("unavailable", "The series needs its declared journal source.");
    const rows = data.sources[series.source];
    if (!rows) throw new ViewError("unavailable", "The series journal source is unavailable.");
    const samples = rows.filter(point => point.on === row.id).slice(-series.last).map(point => {
      const value = point.fields[series.field];
      if (!point.entry || !point.time || typeof value !== "number" || !Number.isSafeInteger(value)) throw new ViewError("unavailable", "A series needs explicit native integer samples and source times.");
      return { value, time: point.time, entry: point.entry };
    });
    const window = source.window;
    let fallback = `${series.label}: no recorded samples in the last ${window} native entries.`;
    if (samples.length) {
      const latest = samples.at(-1)!, lowest = samples.reduce((a, b) => b.value < a.value ? b : a), highest = samples.reduce((a, b) => b.value > a.value ? b : a);
      const seriesText = (sample: typeof latest) => `${formatInteger(sample.value, series.scale, series.unit)} at ${sample.time}`;
      fallback = `${series.label}: ${samples.length} recorded samples in the last ${window} native entries. Latest ${seriesText(latest)}; lowest ${seriesText(lowest)}; highest ${seriesText(highest)}.`;
    }
    return { label: series.label, scale: series.scale, unit: series.unit, window, samples, fallback };
  }
  async read(query: ViewQuery): Promise<Projection> {
    const { view, root, scope, definition, reply, rows, routed, points, unknown } = await this.#read(query);
    const declaration = this.packet.package.semantic.projections[view.projection]!;
    const backScope = this.#backScope(view, scope, root), surface = this.#surface(query.screen, view, backScope);
    const navigation = view.back ? { back: { screen: view.back, scope: backScope } } : {};
    if (!rows.length) return { status: "empty", position: 0, count: 0, scope, points, refresh: view.refresh, ...navigation, ...(!routed ? { data: reply.value } : {}),
      members: await projectionMembers(declaration, routed ? { ...reply.value, sources: {} } : reply.value, this.port.members),
      ...(surface ? { surface } : {}),
      fallback: view.kind === "log" ? "This declared log has no matching entries in its recent window." : "This declared view has no matching items." };
    const position = routed && query.refresh === true && Number.isSafeInteger(query.position) && query.position >= rows.length ? 0 : query.position;
    if (!Number.isSafeInteger(position) || position < 0 || position >= rows.length) throw new ViewError("shape", "The declared view position is outside its complete projection.");
    const row = rows[position]!;
    if (unknown.has(row.id)) {
      const fallback = "The available evidence does not establish whether this item is for you. Refresh after the evidence is updated.";
      const card: Card = {
        identity: { item: String(row.id), kind: row.type, revision: String(row.revision), subject: { scope: scope.scope, item: row.id }, at: { on: row.revision } },
        title: "Assignment unavailable", summary: `Item ${row.id}: the available evidence does not establish whether this is for you.`, reasons: [],
        projection: points, reviewIntended: [], unavailable: [], waitsOn: [fallback], settles: [], actions: [], fallback,
        declared: { kind: view.kind, source: view.item, context: fallback, actor: null, refresh: view.refresh, display: view.display,
          back: view.back, backScope, scope, routed: true, data: reply.value },
      };
      return { status: "unavailable", position, count: rows.length, scope, points, refresh: view.refresh, ...navigation, card, fallback };
    }
    const values = input(row);
    // A routed card resolves only the row it actually discloses. Other
    // source rows and rejected assignments never become an identity table.
    const members = await projectionMembers(declaration, routed ? { ...reply.value, sources: { [view.item]: [row] } } : reply.value, this.port.members);
    const waiting = Object.hasOwn(view.waiting, row.state) ? template(view.waiting[row.state]!, row, "", members) : "";
    const fallback = template(view.fallback, row, waiting, members), actions = await this.#allowed(view, row, reply.value, scope, definition);
    const now = this.port.now?.() ?? Date.now();
    const series = this.#series(view, row, reply.value);
    const card: Card = {
      identity: surface ? { item: scope.scope, kind: "scope", revision: String(reply.value.at.seq), subject: { scope: scope.scope }, at: {} }
        : { item: String(row.id), kind: row.entry ? "entry" : row.type, revision: String(row.revision), subject: { scope: scope.scope, ...(row.entry ? {} : { item: row.id }) }, at: row.entry ? {} : { on: row.revision } },
      title: view.kind === "surface" ? query.screen : memberValueText(values[view.title], members) ?? displayText(values[view.title]), summary: view.kind === "surface" || view.summary === null ? "" : memberValueText(values[view.summary], members) ?? displayText(values[view.summary]),
      reasons: view.kind === "surface" ? [] : view.facts.map(fact => formatFact(fact, values, now, members)),
      projection: points, reviewIntended: [], unavailable: [], waitsOn: waiting ? [waiting] : [], settles: [], actions, fallback,
      declared: { kind: view.kind, source: view.item, context: template(view.context, row, waiting, members), actor: view.kind === "surface" || view.actor === null ? null : values[view.actor] ?? null,
        ...(view.kind !== "surface" ? { memberFacts: projectionMemberFacts(declaration.sources[view.item]!, view.facts, values) } : {}),
        refresh: view.refresh, display: view.display, back: view.back, backScope, scope, ...(routed ? { routed: true } : {}), data: reply.value,
        ...(series ? { series } : {}),
        ...(view.kind !== "surface" && view.links ? { links: view.links.flatMap(link => {
          const id = row.fields[link.field];
          if (id === null || id === undefined) return [];
          if (!isLocalId(id)) throw new ViewError("unavailable", "The linked native item reference is invalid.");
          return [{ label: link.label, screen: link.view, items: { [this.packet.package.presentation.views[link.view]!.item]: id } }];
        }) } : {}),
        ...(view.kind === "log" ? { log: rows.map(row => {
          if (!row.entry || !row.time) throw new ViewError("unavailable", "A log needs explicit sealed entry facts.");
          const values = input(row);
          const facts = view.facts.filter(fact => applicationViewFactField(fact) !== "time");
          return { entry: row.entry, time: row.time, title: memberValueText(values[view.title], members) ?? displayText(values[view.title]), summary: view.summary === null ? "" : memberValueText(values[view.summary], members) ?? displayText(values[view.summary]),
            facts: facts.map(fact => formatFact(fact, values, now, members)), memberFacts: projectionMemberFacts(declaration.sources[view.item]!, facts, values) };
        }) } : {}),
        ...(surface ? { resource: surface.resource, opens: surface.opens, surface } : {}) },
    };
    return { status: "ready", position, count: rows.length, scope, points, refresh: view.refresh, ...navigation, card, fallback, members };
  }
  /** Called by the mounted-view host inside the custody build, immediately
   * before signing. Native expected revisions and grants still judge submit. */
  async admit(query: ViewQuery, card: Card, action: CardAction): Promise<void> {
    const { view, scope, definition, reply, rows, unknown } = await this.#read(query);
    const row = rows.find(row => row.id === card.identity.subject.item);
    if (row && unknown.has(row.id)) throw new ViewError("unavailable", "The available evidence does not establish whether this item is for you. No request was signed.");
    if (!row || card.identity.subject.scope !== scope.scope || canonicalize(card.declared?.data.scope ?? null) !== canonicalize(scope)
      || String(row.revision) !== card.identity.revision) throw new ViewError("stale", "The declared item changed. Refresh before acting; no new request was signed.");
    const actions = await this.#allowed(view, row, reply.value, scope, definition);
    const matches = actions.some(current => {
      if (current.kind !== action.kind || current.id !== action.id) return false;
      let args = current.args;
      if (current.parameters) {
        let fields;
        try { fields = decodeViewParameters(current.parameters, action.parameterInput); }
        catch { return false; }
        args = { ...args, fields: { ...(args["fields"] as Record<string, FieldValue> | undefined), ...fields } };
      }
      return canonicalize(args) === canonicalize(action.args);
    });
    if (!matches) throw new ViewError("stale", "This act or one of its subjects changed under the current when and held actions; no new request was signed.");
  }
}
