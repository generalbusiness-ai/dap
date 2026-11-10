/** Shared command targets and local inputs. */
import type { DefinitionShape } from "./browser-helpers.ts";
import type { Context } from "./command-context.ts";
import { failed, handleOf, readTransportOf, stopCommand, summaryOf, usage } from "./command-support.ts";
import type { Config } from "./store.ts";
import { canonicalize, definitionDigest, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { activeDirectory, declaredHandle, ScopeHandle } from "@generalbusiness/dap-client";
import type { DeclaredDefinition, Digest, PlatformDefinition, ScopeId, ScopeRef, Summary } from "@generalbusiness/dap-contract";
import { answersVersionQuestion, platform } from "@generalbusiness/dap-platform";

export const short = (text: string): string => (text.length > 16 ? `${text.slice(0, 12)}...` : text);

export const directoryReader = (ctx: Context, config: Config, reader: string | null) => ({
  summary: async (scope: ScopeId) => (await handleOf(ctx, config, scope, reader)).summary(),
  query: async (scope: ScopeId, query: import("@generalbusiness/dap-contract").ItemQuery) => (await handleOf(ctx, config, scope, reader)).queryItems(query),
});

/** Read the opening target by its exact cohort pin. Recovery stays explicit:
 * this read signs no open-partition, seal or replacement lane request. */
export async function openingDirectory(ctx: Context, config: Config, reader: string | null): Promise<{ D: ScopeHandle; summary: Summary; target: ScopeRef }> {
  const repository = config.repository!;
  let target = repository.directory;
  let D = await handleOf(ctx, config, repository.directory.scope, reader);
  let summary = await summaryOf(D);
  if (answersVersionQuestion(summary.definition, "cliTargetsPartitionRootDirectory")) {
    const selected = await activeDirectory(directoryReader(ctx, config, reader), repository.directory, repository.membership);
    if (!selected.ref) return stopCommand(failed(`Cannot open work: ${selected.reason}. Inspect the directory and its pending partition; no mutation was submitted.`));
    target = selected.ref;
    D = await handleOf(ctx, config, selected.ref.scope, reader);
    summary = await summaryOf(D);
    if (canonicalize(summary.scope) !== canonicalize(selected.ref) || !answersVersionQuestion(summary.definition, "cliOpeningPartitionDirectory")) return stopCommand(failed("The opening partition changed. No mutation was submitted."));
  }
  return { D, summary, target };
}

/** A scope by the name `claim` or `join` gave it, or by its ID. */
export function scopeNamed(config: Config, named: string | undefined): ScopeId {
  const r = config.repository;
  const names: Record<string, ScopeId | undefined> = {
    register: config.register?.scope, directory: r?.directory.scope, membership: r?.membership.scope, rules: r?.rules, destination: r?.destination, inbox: r?.inbox,
  };
  const name = named ?? "directory";
  if (/^sc_[a-z2-7]+$/.test(name)) return name as ScopeId;
  return names[name] ?? stopCommand(usage(`No scope named ${name} is known here. Name one of: ${Object.keys(names).filter((n) => names[n]).join(", ") || "none yet"}; or give a scope ID.`));
}

/** The definition a scope pins: a platform one from the platform package, a declared one as the scope retains it. */
export async function definitionOf(handle: ScopeHandle, summary: Summary): Promise<{ shape: DefinitionShape; declared: DeclaredDefinition | null; named: Digest | PlatformDefinition }> {
  const named = summary.definition;
  const supplied = platform(named);
  if (supplied) return { shape: supplied.data as unknown as DefinitionShape, declared: null, named };
  const read = await handle.definition();
  if (!read.ok) return stopCommand(failed(`Cannot read the definition of ${handle.scope}: ${read.reason}.`));
  return { shape: read.value as unknown as DefinitionShape, declared: read.value, named };
}

/** A lane's summary once it is `active`; a stop once its genesis is refused, which no wait changes. */
export const laneActive = async (handle: ScopeHandle, opened: string): Promise<Summary | null> => {
  const read = await handle.summary();
  if (read.ok && read.value.status === "refused") return stopCommand(failed(`The lane ${handle.scope} refused its creation by ${opened}; nothing else was written there.`));
  return read.ok && read.value.status === "active" ? read.value : null;
};

/** A local file's bytes, or a stop: the command cannot run without them. */
export async function fileOf(ctx: Context, path: string): Promise<Uint8Array> {
  const bytes = ctx.read ? await ctx.read(path) : null;
  return bytes ?? stopCommand(usage(`Cannot read the file ${path}.`));
}

/** The text that is exactly these bytes, as UTF-8 with any byte order mark kept, or a stop: a change carries a file as a text. */
export function textOf(bytes: Uint8Array, path: string): string {
  let text: string | null = null;
  try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); } catch { /* not UTF-8 */ }
  if (text === null || utf8(text).length !== bytes.length) return stopCommand(usage(`${path} is not UTF-8 text: a change carries a file as a text.`));
  return text;
}

/** The lane definition of that name that the rules scope holds active, and its canonical bytes, which the rules scope retains. The latest activation wins. */
export async function activeDefinition(ctx: Context, config: Config, reader: string | null, name: "change" | "issue"): Promise<{ digest: Digest; bytes: string; declared: DeclaredDefinition }> {
  const repository = config.repository!;
  const R = await handleOf(ctx, config, repository.rules, reader);
  const active = (await summaryOf(R)).items.filter((item) => item.type === "definition" && item.state === "active" && item.values["name"] === name).sort((a, b) => b.id - a.id)[0];
  const digest = active?.values["digest"] as Digest | undefined;
  if (!digest) return stopCommand(failed(`The rules scope ${repository.rules} holds no ${name} definition active. An admin activates one: dap act activate --on rules --set digest=<digest> --set name=${name} --value <definition file>.`));
  const transport = await readTransportOf(ctx, config, reader);
  // A value in the domain of a definition is kept as a definition (`core.ts`), and read by that kind.
  const kept = await transport.retained(repository.rules, reader, "definition", digest);
  if (!kept.ok) return stopCommand(failed(`Cannot read the ${name} definition ${digest} from the rules scope: ${kept.reason}.`));
  try {
    const declared = parseStrict(kept.value.bytes) as DeclaredDefinition;
    if (definitionDigest(declared) === digest) return { digest, bytes: kept.value.bytes, declared };
  } catch { /* not a definition */ }
  return stopCommand(failed(`The rules scope's bytes for ${digest} are not that definition.`));
}

/** A declared handle on a lane: the lane must run exactly the definition given. */
export async function laneOf(ctx: Context, config: Config, lane: ScopeId, reader: string | null, declared: DeclaredDefinition) {
  const typed = await declaredHandle(await handleOf(ctx, config, lane, reader), declared);
  return typed.ok ? typed.handle : stopCommand(failed(`Cannot act on ${lane}: ${typed.reason}.`));
}
