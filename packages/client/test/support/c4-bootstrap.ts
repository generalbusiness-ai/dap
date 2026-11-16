/** C4 TEST bootstrap only. Native judges, signatures, deliveries and folds are
 * real. Register's host reply and Rules' fetch/admission policy replies remain
 * explicit local fixtures. This is no hosted installation or provider proof. */
import type { Digest, Entry, PlatformDefinition, RetainedInput } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, entryHash, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { actionOf, clockOf, inputTexts, judgeDelivery, judgeGenesis, membershipOf, validateDefinition, windowOf,
  type ActJudgment, type Draft, type Judgment, type PlatformRules } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { Ledger, T0, arriving, creation, fixtureSequence, keys, sent, type Context, type Over } from "@generalbusiness/dap-derive/testing";
import { emptyPackageComposition } from "@generalbusiness/dap-package-graph";
import { BASE_COHORT, ROLE_LISTS, platform } from "@generalbusiness/dap-platform";
import { packApplication2, readApplicationProjection } from "@generalbusiness/dap-platform/application-v2";
import { secretSigner } from "../../src/intent.ts";
import { repositoryAuthority } from "../../../scope/src/authority.ts";
import { production, type Authority } from "../../../scope/src/ports.ts";
import { valuesOf } from "../../../scope/src/core.ts";
import { InstallNode, installGraph } from "../../../platform/test/support-application-install.ts";
import { applicationAnnouncement } from "../../../platform/src/application-install-creation.ts";
import { lending } from "../../../../examples/lending/definition.ts";
import { lendingPackage } from "../../../../examples/lending/package.ts";
import { lendingRoles } from "../../../../examples/lending/roles.ts";
import { selection, selectionMetadata } from "./c4-selection.ts";

export interface CapturedRow { readonly entry: Entry; readonly hash: Digest; readonly bytes: string }
export interface CapturedNode {
  readonly ledger: Ledger;
  readonly named: Digest | PlatformDefinition;
  readonly platform: PlatformRules | null;
  readonly rows: readonly CapturedRow[];
  readonly retained: readonly RetainedInput[];
  readonly snapshot: string;
}
function written(judgment: Judgment | ActJudgment): Draft {
  if (judgment.result !== "write") throw new Error(`C4 bootstrap did not write: ${canonicalize(judgment)}`);
  return judgment.draft;
}
const same = (a: unknown, b: unknown): boolean => canonicalize(a) === canonicalize(b);
function requireSame(a: unknown, b: unknown, what: string): void {
  if (!same(a, b)) throw new Error(`C4 bootstrap mismatch: ${what}`);
}

/** Use the existing versioned state observer and authority implementation;
 * no grantOf/all-actions authority is passed to an act in this helper. */
function authority(node: InstallNode, membership: InstallNode): Authority {
  const defaults = production();
  return repositoryAuthority({ clock: { read: () => node.now }, random: defaults.random,
    genesis: () => { const birth = node.entries[0]?.entry.input; return birth?.type === "genesis" ? birth : null; },
    state: node.state,
    // This isolated bootstrap has no out-of-history compromised notice source.
    named: () => false,
    reader: { observe: async asked => platform(membership.named)?.observed?.(membership.state, asked) ?? null },
  });
}
async function act(node: InstallNode, port: Authority, kind: string, over: Over = {}, extra: Context = {}): Promise<Entry> {
  const row = node.definition.declared.acts[kind], scope = node.state.scope();
  if (!row || !scope?.kind) throw new Error("C4 bootstrap needs an actual named act and scope kind");
  const signed = node.intent(keys.rita, kind, over);
  const standing = await port.read({ scope: node.at, signed, action: actionOf(row, node.definition),
    grants: [], window: windowOf(node.definition, scope.kind, kind) }, PROPOSED_BOUNDS.fetchSeconds);
  if (standing === "limit") throw new Error("C4 bootstrap authority limit");
  const grants = standing?.held(node.state, clockOf(node.state, node.now)) ?? null;
  const judgment = node.submit(signed, { ...extra, platform: node.authority, grants,
    ...(standing?.membership === undefined ? {} : { membership: standing.membership }) });
  written(judgment);
  const sealed = node.entries.at(-1);
  if (!sealed) throw new Error("C4 bootstrap write produced no entry");
  standing?.sealed?.(sealed);
  return sealed.entry;
}

/** Existing fixed Lending entry, with its original returned reference name. */
export async function c4Bootstrap() {
  const { application, ...captured } = await bootstrap("lending");
  return { ...captured, lending: application };
}
/** Fixed small declaration only; callers cannot supply an application. */
export async function c4SelectionBootstrap() { return bootstrap("selection"); }

async function bootstrap(preset: "lending" | "selection") {
  // Explicit supported host. installGraph's historical default is git.example.
  // Its host outcome is a labelled fixture, never a fabricated Native Answer.
  const graph = installGraph(BASE_COHORT, undefined, "github.com");
  const { R, D, M, A, G, send } = graph;
  const native = [R, D, M, A, G];
  const materials = new Map<Ledger, RetainedInput[]>();
  const application = preset === "lending" ? lending : selection;
  const roles = preset === "lending" ? lendingRoles.roles : selectionMetadata.roles;
  const declaration = canonicalize(application), id = definitionDigest(application);
  const texts = new Map<string, string>([[textDigest(declaration), declaration]]);
  const capture = (node: Ledger) => {
    materials.set(node, []);
    const seal = node.seal.bind(node);
    node.seal = (draft, reading = node.now) => {
      const inputs = materials.get(node)!;
      inputs.push(...valuesOf(draft));
      const producer = draft.input.type === "delivery"
        ? native.find(source => same(source.at, draft.input.type === "delivery" ? draft.input.from.at : null))?.under
        : undefined;
      for (const digest of inputTexts(node.definition, draft.input, producer)) {
        const bytes = texts.get(digest);
        if (bytes === undefined) throw new Error("C4 bootstrap lacks actual detached text bytes");
        inputs.push({ kind: "text", digest, bytes: canonicalize(bytes) });
      }
      return seal(draft, reading);
    };
  };
  native.forEach(capture);

  // Seat and enroll the actual founder key through Membership's native marks
  // and actual production own-standing path before issuing any session.
  const memberAuthority = authority(M, M);
  const seated = await act(M, memberAuthority, "seat", { expected: { roster: M.item(0).revision } });
  const member = seated.effects.find(effect => effect.effect === "open" && effect.type === "member");
  if (!member || member.effect !== "open") throw new Error("C4 bootstrap did not seat its real member");
  await act(M, memberAuthority, "first-key", { fields: { member: member.item },
    expected: { roster: M.item(0).revision, member: M.item(member.item).revision } });

  const packet = await packetFor(preset, id, declaration);
  const fields = { definitionText0: textDigest(declaration),
    uri: `git+https://github.com/public-test/c4.git/@${"a".repeat(40)}/application.dap.json`,
    release: packet.ids.release, semantic: packet.ids.semantic,
    roles: Object.keys(roles).sort(), values: "{}" };
  const values = [canonicalize(packet.package.semantic), canonicalize(packet.package.release)];
  const size = (digest: string) => { const bytes = texts.get(digest); return bytes === undefined ? undefined : utf8(bytes).length; };
  await act(A, authority(A, M), "install-application", { fields }, { values, texts: size });
  const job = A.head.seq;
  // These two policy/host inputs are explicit bootstrap fixtures. Each is
  // admitted by the actual pinned outcome rules before any creation proceeds.
  const answer = { uri: fields.uri, ...packet.ids, publisher: packet.package.release.manifest.publisher,
    policy: textDigest("PUBLIC TEST C4 bootstrap admission policy") };
  const fetched = A.outcome(`${job}:0`, answer), admitted = A.outcome(`${fetched}:0`, answer);
  A.texts = size;
  send(D, A, admitted);
  const request = (node: Ledger) => {
    const next = node.last.sends.find(value => value.message.class === "request");
    if (!next) throw new Error("C4 bootstrap has no actual next recorded request");
    return next.n;
  };
  send(A, D, D.head.seq, request(D));
  send(D, A, A.head.seq, request(A));
  send(M, D, D.head.seq, request(D));
  send(A, M, M.head.seq, request(M));
  if (A.item(job).values["phase"] !== "creation") throw new Error("C4 bootstrap did not reach native creation");
  for (const action of roles.admin) {
    const actions = M.item(0).values[ROLE_LISTS.admin];
    if (!Array.isArray(actions) || !actions.includes(action)) throw new Error("C4 bootstrap lacks actual installed admin action");
  }
  send(D, A, A.head.seq, request(A));
  const create = D.last.sends.find(value => value.message.class === "request");
  if (!create) throw new Error("C4 bootstrap has no actual application create");
  const checked = validateDefinition(application, PROPOSED_BOUNDS, RULE_PROFILES);
  if (!checked.ok) throw new Error(preset === "lending" ? "C4 bootstrap Lending declaration did not validate" : "C4 bootstrap selection declaration did not validate");
  const app = new Ledger(checked.definition, application.name);
  capture(app);
  const nodes: Ledger[] = [...native, app];
  const facts = () => nodes.flatMap(node => node.entries.map(({ entry }, seq) => ({ fact: node.fact(seq), entry,
    under: node.under, bytes: canonicalize(entry), sequence: fixtureSequence(node) })));
  const { asked, source } = creation(D, D.head.seq, create.n, 40);
  const born = written(judgeGenesis(app.state, app.definition, asked, { clock: clockOf(app.state, T0),
    bounds: app.bounds, facts: facts(), prepared: [], source }));
  app.seal(born);
  if (app.last.input.type !== "genesis" || app.last.input.decision !== "applied") throw new Error(preset === "lending" ? "C4 bootstrap Lending birth refused" : "C4 bootstrap selection birth refused");
  requireSame(membershipOf(app.last.input, app.at), M.at, "recorded full membership");
  requireSame(app.item(0).parties["founder"], { membership: M.at, member: "@rita" }, "actual initialization opener");
  requireSame(app.item(0).refs["destination"], G.at, "actual injected destination");
  const result = sent(app, 0, 0);
  D.take(judgeDelivery(D.state, D.definition, result.delivered,
    { ...arriving(D, result.delivered, result.source, facts()), platform: D.authority }));
  const completed = D.head.seq, confirm = D.last.sends.find(value => value.message.class === "control");
  if (!confirm) throw new Error("C4 bootstrap has no actual confirmation");
  const confirmation = sent(D, completed, confirm.n);
  app.seal(written(judgeDelivery(app.state, app.definition, confirmation.delivered,
    arriving(app, confirmation.delivered, confirmation.source, facts()))));
  const notice = applicationAnnouncement(D.state, D.own, `${completed}:0`);
  if (!notice) throw new Error("C4 bootstrap has no actual completed-install announcement");
  const announced = D.outcome(`${completed}:0`, notice);
  send(A, D, announced, request(D));
  requireSame(A.item(job).state, "active", "completed installation");
  requireSame(A.item(job).refs["scope"], app.at, "completed installation target");

  const captured: CapturedNode[] = nodes.map(node => ({ ledger: node,
    named: node instanceof InstallNode ? node.named : node.definition.digest,
    platform: node instanceof InstallNode ? node.authority : null,
    rows: node.entries.map(({ entry, hash }) => {
      if (entryHash(entry) !== hash) throw new Error("C4 bootstrap entry hash mismatch");
      return { entry: structuredClone(entry), hash, bytes: canonicalize(entry) };
    }),
    retained: structuredClone(materials.get(node) ?? []), snapshot: node.state.snapshot(),
  }));
  return { captured, membership: M.at, application: app.at, destination: G.at, packet, job,
    actor: keys.rita, member: { membership: M.at, member: "@rita" as const }, declaration, id };
}

/** Only these two module-owned TEST presets can enter the native journey. */
async function packetFor(preset: "lending" | "selection", id: Digest, declaration: string) {
  if (preset === "lending") {
    // Same authored definition, host, roles and application capability metadata.
    // Only the TEST presentation is small; no browser build or public packet is exported.
    const capabilities = [{ name: "publication-paths@1", bounds: { prefixes: ["shelf/"] } }];
    requireSame(capabilities, lendingPackage.capabilities, "Lending application capabilities");
    requireSame(lendingPackage.roles, lendingRoles.roles, "Lending role metadata");
    return packApplication2({ name: lendingPackage.name, version: lendingPackage.version,
      semantic: { ...emptyPackageComposition(), v: 2, entry: id, definitions: [{ id, bytes: declaration }],
        host: lendingPackage.host, capabilities, roles: lendingPackage.roles, predecessor: lendingPackage.predecessor,
        connections: lendingPackage.connections.map(connection => ({ ...connection, from: id })),
        rights: lendingPackage.rights, exercises: lendingPackage.exercises, groups: lendingPackage.groups,
        order: lendingPackage.order, derivation: lendingPackage.derivation, parameters: lendingPackage.parameters,
        projections: Object.fromEntries(Object.entries(lendingPackage.projections).map(([name, projection]) =>
          [name, readApplicationProjection({ ...projection, definition: id })])),
      },
      presentation: { v: 2, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "QzQgVEVTVCBmaXh0dXJl" }],
        descriptions: {}, views: {}, resources: {} },
    }, secretSigner(new Uint8Array(32).fill(254)));
  }

  // Fixed TEST metadata: the codec requires projection coverage for every
  // definition. This one source binds the actual anchor schema; no test
  // projection read or new read route follows from carrying this metadata.
  return packApplication2({ name: selectionMetadata.name, version: selectionMetadata.version,
    semantic: { ...emptyPackageComposition(), v: 2, entry: id, definitions: [{ id, bytes: declaration }],
      host: selectionMetadata.host, capabilities: selectionMetadata.capabilities,
      roles: selectionMetadata.roles, predecessor: null,
      // The anchor's destination ref names a scope outside this package.
      connections: [{ from: id, item: "anchor", slot: "destination", to: "outside" }],
      projections: { state: readApplicationProjection({ v: 1, definition: id, revision: "revision",
        sources: { anchor: { item: "anchor", read: "one", states: ["open"], limit: 1, fields: {} } } }) },
    },
    presentation: { v: 2, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "QzQgVEVTVCBmaXh0dXJl" }],
      descriptions: {}, views: {}, resources: {} },
  }, secretSigner(new Uint8Array(32).fill(254)));
}
