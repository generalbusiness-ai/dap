/** Scope inspection and direct signed commands. */
import { applicationList } from "./application-list.ts";
import { describe, expectedOf, heldActs, type Standing, valueOf } from "./browser-helpers.ts";
import type { Context, Outcome } from "./command-context.ts";
import { answered, configOf, done, failed, handleOf, managedReadsOf, readerOf, readTransportOf, REGISTER_FULL, run, sessionOf, signerOf, signing, Stop, stopCommand, summaryOf, usage } from "./command-support.ts";
import { definitionOf, fileOf, scopeNamed, short, textOf } from "./command-targets.ts";
import { statusReport } from "./status-report.ts";
import { canonicalize, readItemQuery } from "@generalbusiness/dap-bytes";
import { declaredHandle, type Session, signedIntent, type Transport } from "@generalbusiness/dap-client";
import type { Entry, FieldValue, Item, KeyId, ScopeId, ScopeRef } from "@generalbusiness/dap-contract";
import { platform, type Role, ROLE_LISTS } from "@generalbusiness/dap-platform";

/** Node operator adapter. Constructing it reads local configuration only;
 * authentication starts lazily, after a manifest's local validation. */
export async function scopeIndexAccess(ctx: Context): Promise<{ service: string; root: ScopeRef; reads: import("./scope-index-manifest.ts").IndexReads }> {
  const config = await configOf(ctx);
  const root = config.repository?.directory;
  if (!root) throw Error("No configured room Directory for scope inventory");
  let transport: Promise<Transport> | undefined;
  const connection = () => transport ??= (async () => {
    const reader = await readerOf(ctx, config);
    const base = await readTransportOf(ctx, config, reader);
    // Preserve the existing session-first authorization. A session refusal
    // may be read again by this caller's key, never with elevated authority.
    const signed = await readTransportOf(ctx, config, null);
    return { ...base,
      entry: async (scope: ScopeId, _reader: unknown, seq: number) => {
        const got = await base.entry(scope, reader, seq);
        return !got.ok && got.reason === "forbidden" && reader !== null ? signed.entry(scope, null, seq) : got;
      },
      history: async (scope: ScopeId, _reader: unknown, cursor?: string) => {
        const got = await base.history(scope, reader, cursor);
        return !got.ok && got.reason === "forbidden" && reader !== null ? signed.history(scope, null, cursor) : got;
      },
    };
  })();
  return { service: config.service, root: { ...root }, reads: {
    entry: async (scope, seq) => (await connection()).entry(scope, null, seq),
    history: async (scope, cursor) => (await connection()).history(scope, null, cursor),
  } };
}

/** The caller's role and the actions it holds, as membership's summary has them now; null when the key is no active member's. */
export function standing(items: readonly Item[], key: KeyId): Standing | null {
  const own = items.find((item) => item.type === "key" && item.state === "active" && item.values["id"] === key);
  const member = own && items.find((item) => item.type === "member" && item.id === own.refs["member"] && item.state === "active");
  const roster = items.find((item) => item.type === "roster");
  const role = member?.values["role"] as Role | undefined;
  if (!member || !roster || !role) return null;
  return { role, actions: (roster.values[ROLE_LISTS[role]] as readonly string[] | null) ?? [], handle: String(member.values["handle"]) };
}

/**
 * `dap acts [<scope>]`: the acts of the scope's definition that the
 * caller's role holds now, and those a rule decides, each with its fields.
 * What the scope will answer still depends on its guards and its state.
 */
export function acts(ctx: Context, named?: string): Promise<Outcome> {
  return run(async () => {
    const config = await configOf(ctx);
    const scope = scopeNamed(config, named);
    const reader = await readerOf(ctx, config);
    const handle = await handleOf(ctx, config, scope, reader);
    const { shape, named: definition } = await definitionOf(handle, await summaryOf(handle));
    const key = (await signerOf(ctx, config)).key;
    const held = config.repository ? standing((await summaryOf(await handleOf(ctx, config, config.repository.membership.scope, reader))).items, key) : null;
    const { acts: listed, hidden } = heldActs(shape, held);
    const shown = listed.map(([kind, act]) => `  ${describe(kind, act)}`);
    const who = held ? `${held.handle} (${held.role})` : `key ${key}, which is no active member's`;
    return done(`Acts on ${scope} (${definition}) for ${who}:`, ...shown, ...(hidden > 0 ? [`Not shown: ${hidden} that need an action your role does not hold.`] : []));
  });
}

/**
 * `dap act <kind> --on <scope> [--target <item>] [--set name=value ...]`:
 * one act. A declared definition's act goes through the client's declared
 * handle, which checks each field's shape before it signs; a platform
 * definition's is signed as given. The scope judges both.
 */
export function act(ctx: Context, kind: string, options: { on?: string; target?: number; set?: readonly string[]; value?: readonly string[] } = {}): Promise<Outcome> {
  return run(async () => {
    if (options.target !== undefined && (!Number.isSafeInteger(options.target) || options.target < 0)) return usage("--target must be a nonnegative item number; a member handle is not accepted here. Nothing was signed or sent.");
    const config = await configOf(ctx);
    // A value beside the intent, for a field that names one by its digest, such as the bytes of a definition that `activate` or
    // `open-issue` names: each file's text, as it is. The scope reads it only at a place that its definition states.
    const values: string[] = [];
    for (const path of options.value ?? []) values.push(textOf(await fileOf(ctx, path), path));
    const scope = scopeNamed(config, options.on);
    const signer = await signerOf(ctx, config);
    const handle = await handleOf(ctx, config, scope);
    const summary = await summaryOf(handle);
    const { shape, declared } = await definitionOf(handle, summary);
    const declaration = shape.acts[kind];
    if (!declaration || kind === shape.genesis) return usage(`${kind} is not an act of ${shape.name}. Run: dap acts ${options.on ?? ""}`.trim());
    const fields: Record<string, FieldValue> = {};
    for (const pair of options.set ?? []) {
      const at = pair.indexOf("=");
      if (at < 1) return usage(`--set takes name=value, not ${pair}.`);
      const name = pair.slice(0, at);
      fields[name] = valueOf(config, declaration.fields[name], pair.slice(at + 1));
    }
    const target = options.target ?? null;
    const expected = expectedOf(declaration, summary.items, target, fields);
    if (declared) {
      const typed = await declaredHandle(handle, declared);
      if (!typed.ok) return failed(`Cannot act on ${scope}: ${typed.reason}.`);
      const { signed, beside } = await typed.handle.intent(signer, kind as never, { on: target, fields, expected } as never, signing(ctx));
      return answered(scope, await typed.handle.submit(signed, [], { ...beside, ...(values.length > 0 ? { values } : {}) }), "Took effect");
    }
    const signed = await signedIntent(signer, { to: summary.scope, kind, on: target, fields, expected }, signing(ctx));
    return answered(scope, await handle.submit(signed, [], values.length > 0 ? { values } : {}), "Took effect", kind === "found" && platform(summary.definition)?.data.name === "platform:register" ? REGISTER_FULL : undefined);
  });
}

/** One explicit bounded query page; no discovery scan or per-item detail reads. */
export function apps(ctx: Context, cursor: string | null = null): Promise<Outcome> {
  return run(async () => {
    const config = await configOf(ctx);
    if (!config.repository) return usage("Select a room before listing its applications.");
    const reader = await readerOf(ctx, config);
    return applicationList(await readTransportOf(ctx, config, reader), reader, config.repository.directory, cursor);
  });
}

/** One explicit bounded query page; no discovery scan or per-item detail reads. */
export function items(ctx: Context, named: string, raw: string): Promise<Outcome> {
  return run(async () => {
    const query = readItemQuery(raw);
    if (!query) return usage("--query needs canonical item-query JSON (at most 8192 UTF-8 bytes).");
    const config = await configOf(ctx), scope = scopeNamed(config, named);
    if (query.scope.scope !== scope) return usage("The query must name the selected scope's full reference.");
    const reader = await readerOf(ctx, config), handle = await handleOf(ctx, config, scope, reader);
    const page = await handle.queryItems(query);
    if (!page.ok) return failed(`Item query refused: ${page.reason}. Coverage is incomplete.`);
    return done(`Items of ${scope} at ${page.at.seq} (${page.at.hash}); selected suffix ${page.complete ? "complete" : "incomplete"}.`,
      ...page.value.items.map(item => canonicalize(item)), ...(page.next === undefined ? [] : [`Next cursor: ${page.next}`]));
  });
}

/** One entry in one line: where, when, what and by which key. */
function entryLine(scope: ScopeId, entry: Entry): string {
  const input = entry.input;
  const what = input.type === "act" ? `act ${input.signed.intent.kind} by ${short(input.signed.intent.actor)}`
    : input.type === "genesis" ? `genesis ${input.kind}`
    : input.type === "delivery" ? `delivery ${"type" in input.message ? input.message.type : input.message.class} from ${input.sourceKind}:${input.from.seq}`
    : input.type;
  return `${scope}:${entry.seq}  ${entry.time}  ${what}; ${entry.effects.length} effects, ${entry.sends.length} sends`;
}

/** `dap log <scope> [--limit n]`: the last entries of the scope's history, oldest first. */
export function log(ctx: Context, named: string | undefined, options: { limit?: number } = {}): Promise<Outcome> {
  return run(async () => {
    const config = await configOf(ctx);
    const scope = scopeNamed(config, named);
    const handle = await handleOf(ctx, config, scope);
    const entries: Entry[] = [];
    for (let cursor: string | undefined, pages = 0; pages < 1000; pages++) {
      const page = await handle.history(cursor);
      if (!page.ok) return failed(`Cannot read the history of ${scope}: ${page.reason}.`);
      entries.push(...page.value.map((sealed) => sealed.entry));
      if (page.next === undefined) break;
      cursor = page.next;
    }
    const limit = options.limit ?? 20;
    return done(...entries.slice(-limit).map((entry) => entryLine(scope, entry)), `${entries.length} entries in all.`);
  });
}

/** `dap show <scope>:<seq>`: one entry, with its hash computed by the client from the entry's bytes. */
export function show(ctx: Context, named: string): Promise<Outcome> {
  return run(async () => {
    const config = await configOf(ctx);
    const match = /^(.+):(\d+)$/.exec(named) ?? stopCommand(usage("Name an entry as <scope>:<seq>, as log prints it."));
    const scope = scopeNamed(config, match[1]);
    const handle = await handleOf(ctx, config, scope);
    const read = await handle.entry(Number(match[2]));
    if (!read.ok) return failed(`Cannot read entry ${named}: ${read.reason}.`);
    const { entry, hash } = read.value;
    const input = entry.input;
    const detail = input.type === "act" ? `Fields: ${JSON.stringify(input.signed.intent.fields)}. Grants recorded: ${input.authority.length}.` : `Effects: ${JSON.stringify(entry.effects)}.`;
    return done(`${entryLine(scope, entry)}; hash ${hash}.`, detail);
  });
}

/** Current operational observations through the caller's session. */
export function status(ctx: Context, named?: string, request?: string): Promise<Outcome> {
  return run(async () => {
    if (request !== undefined && !/^[0-9a-f]{16}$/.test(request)) return usage("--request needs exactly 16 lowercase hexadecimal characters.");
    const config = await configOf(ctx);
    if (!config.repository) return usage("No room is known here. Run dap create or dap join first.");
    let session: Session | null;
    try { session = await sessionOf(ctx, config); }
    catch (error) { if (error instanceof Stop) throw error; return failed("Status unknown: no session answer."); }
    if (!session) return failed("Status unknown: a current room session is unavailable.");
    const repository = config.repository;
    const scopes = named === undefined ? [
      ...(config.register ? [{ kind: "register", scope: config.register.scope }] : []),
      { kind: "directory", scope: repository.directory.scope }, { kind: "membership", scope: repository.membership.scope },
      { kind: "rules", scope: repository.rules }, { kind: "destination", scope: repository.destination },
      ...(repository.inbox ? [{ kind: "inbox", scope: repository.inbox }] : []),
    ] : [{ kind: named, scope: scopeNamed(config, named) }];
    const admin = session.claims.reads.includes("incidents") && session.claims.reads.includes("waiting");
    return done(...await statusReport((await managedReadsOf(ctx, config)).transport, session.reader(), scopes, admin, request, named === undefined));
  });
}
