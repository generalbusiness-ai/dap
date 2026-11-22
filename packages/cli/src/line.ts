/**
 * A command line, read into one of the commands of `commands.ts`. It has
 * no state of a process, so a test runs the same lines as a person types.
 */

import { parseStrict } from "@generalbusiness/dap-bytes";
import { applicationInstallation, installApplication, upgradeApplication } from "./application-install.ts";
import { enrolAgentKey, enrolCheckerKey, enrolDeviceKey, invitePerson } from "./invitations.ts";
import { AGENT_KEY_LINK, CHECKER_KEY_LINK, DEVICE_KEY_LINK } from "@generalbusiness/dap-client";
import { issueWait } from "./issue-wait.ts";
import { act, acts, apps, claim, clone, edit, install, installPlanned, invite, inviteDevice, issueAssign, issueClose, issueComment, issueOpen, issues, items, join, log, merge, planInstall, propose, remote, show, status, verify, CREATION_INSTALL_COHORTS, type Context, type InstallCohort, type RegisterPolicy, type Outcome } from "./commands.ts";

export const USAGE = [
  "Usage:",
  `  dap install <base-url> --host none|artifacts|github.com [--namespace <name>] [--register-policy keys|open] [--cohort ${CREATION_INSTALL_COHORTS.join("|")}]`,
  `  dap install --plan <base-url> --host none|artifacts|github.com [--namespace <name>] [--register-policy keys|open] [--cohort ${CREATION_INSTALL_COHORTS.join("|")}]`,
  "  dap install --planned [--register-policy keys|open] [--cohort <saved-cohort>]",
  "  install --planned also recognizes historical cohort names from the retained plan.",
  "  dap install <git+https-uri> --release <release-id> --request <kept-key> [--role <default-role> ...] [--values <genesis-JSON>] [--owner <full-member-JSON>]",
  "  dap application <install-item>",
  "  dap application upgrade <install-item> <git+https-uri> --release <release-id> --request <kept-key> [--replace [--role <default-role> ...] [--values <genesis-JSON>]]",
  "  dap apps [--cursor <cursor>]",
  "  dap check [<directory>] [--config <relative-file>]",
  "  dap dev [<directory>] [--config <relative-file>] [--port <loopback-port>] [--scenario <listed-file>]",
  "  dap new <directory>",
  "  dap pack [<directory>] [--config <relative-file>] [--out <file>] [--publisher <existing-key-name>]",
  "  dap create <name> [--handle @you] [--branch main] [--again]",
  "  dap invite <@member> --role <role> [--hours 24] [--keep]",
  "  dap invite --check | --continue",
  "  dap invite <@member> --device [--hours 24]",
  "  dap join <link> [--check for an agent-key, checker-key or device-key invitation]",
  "  dap acts [<scope>]",
  "  dap act <kind> --on <scope> [--target <item>] [--set name=value ...] [--value <file> ...]",
  "  dap log <scope> [--limit n]",
  "  dap show <scope>:<seq>",
  "  dap items <scope> --query <canonical-item-query-JSON>",
  "  dap verify <scope>",
  "  dap verify --all",
  "  dap scope-index inventory --out FILE | sweep --manifest FILE | verify --manifest FILE | versions --manifest FILE (Node operator only)",
  "  dap scope-index applications --manifest FILE --out FILE (Node operator only)",
  "  dap status [<scope>] [--request <16-hex-id>]",
  "  dap remote",
  "  dap clone [<directory>] [--hours 1] [--archive]",
  "  dap edit <path> --file <local file> [--title <text>] [--closes <issue>]",
  "  dap propose <branch> [--title <text>]",
  "  dap merge <change> [--closes <issue>]",
  "  dap issue open --title <text> [--body <text>]",
  "  dap issue comment <issue> <text>",
  "  dap issue assign <issue> <@member>",
  "  dap issue close <issue>",
  "  dap issue wait <issue> <ask> [--hours 72]",
  "  dap issues",
  "  dap mcp [--generic | --generic=add] [--tools <definition>,...] [--http 127.0.0.1:<port>] [--scope <scope> --membership <scope>]",
  "A scope is a scope ID, or one of: register, directory, membership, rules, destination, inbox.",
  "An issue is its number, as dap issues lists it, or its lane's scope ID.",
].join("\n");

/** The flags that take no value. */
const SWITCHES: ReadonlySet<string> = new Set(["again", "all", "plan", "planned", "check", "keep", "continue", "archive", "device", "replace"]);

/** `dap mcp` reads its own options (`mcp.ts`): these four take the next token as their value. Its switches `--generic` and
 * `--generic=add`, and any option it refuses, take none. */
const MCP_VALUES: ReadonlySet<string> = new Set(["--tools", "--http", "--scope", "--membership"]);
/** The global switch of JSON output. It takes no value. */
export const JSON_SWITCH = "--json";

/**
 * The output mode of one command line, and the line without the JSON switch. One scan owns each token, as the command's own
 * parser does: a value-taking option consumes its next token, even `--json`, which then stays data; an unknown option
 * consumes what it consumes today. `--json` at an option position, before, between or after command words, selects JSON;
 * repetition is one selection. The scan reads no file and no environment.
 */
export function scanJson(argv: readonly string[]): { json: boolean; argv: string[] } {
  const kept: string[] = [];
  let json = false, i = 0;
  for (; argv[i] === JSON_SWITCH; i++) json = true;
  const mcp = argv[i] === "mcp";
  for (; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === JSON_SWITCH) { json = true; continue; }
    kept.push(arg);
    if (!arg.startsWith("--")) continue;
    const owns = mcp ? MCP_VALUES.has(arg) : !SWITCHES.has(arg.slice(2));
    if (owns && i + 1 < argv.length) kept.push(argv[++i]!);
  }
  return { json, argv: kept };
}

/** The positional words of a command line, without the values that options consume. */
function wordsOf(argv: readonly string[]): string[] {
  const words: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i]!.startsWith("--")) words.push(argv[i]!);
    else if (!SWITCHES.has(argv[i]!.slice(2))) i++;
  }
  return words;
}

/** The commands that `main.ts` dispatches by the first token, before or beside the command line of this module. */
const EARLY: readonly string[] = ["dev", "check", "new", "pack", "scope-index", "mcp"];
const ISSUE_WORDS: readonly string[] = ["open", "comment", "assign", "close", "wait"];

/**
 * The resolved command of the JSON envelope: only allowlisted command words, in the order of their dispatch. `claim` is
 * the canonical `create`. An unknown command is the empty array; no supplied word, path or secret becomes a label.
 */
export function commandWords(argv: readonly string[]): string[] {
  if (argv[0] !== undefined && EARLY.includes(argv[0])) return [argv[0]];
  const [name, sub] = wordsOf(argv);
  if (name === undefined || !Object.hasOwn(KNOWN, name)) return [];
  if (name === "claim") return ["create"];
  if (name === "issue") return sub !== undefined && ISSUE_WORDS.includes(sub) ? ["issue", sub] : ["issue"];
  if (name === "application" && sub === "upgrade") return ["application", "upgrade"];
  return [name];
}

/** The words of a command line: the positional ones, each `--name value`, and each switch; `--set` may be given more than once. */
export function parse(argv: readonly string[]): { words: string[]; flags: Map<string, string[]> } | null {
  const words: string[] = [];
  const flags = new Map<string, string[]>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith("--")) {
      words.push(arg);
      continue;
    }
    if (SWITCHES.has(arg.slice(2))) {
      flags.set(arg.slice(2), ["true"]);
      continue;
    }
    const value = argv[++i];
    if (value === undefined) return null;
    flags.set(arg.slice(2), [...(flags.get(arg.slice(2)) ?? []), value]);
  }
  return { words, flags };
}

const KNOWN: Record<string, readonly string[]> = {
  install: ["host", "namespace", "register-policy", "plan", "planned", "cohort", "release", "request", "role", "values", "owner"], application: ["release", "request", "replace", "role", "values"], apps: ["cursor"], create: ["handle", "branch", "again"], claim: ["handle", "branch", "again"], invite: ["role", "acts", "hours", "keep", "check", "continue", "device"], join: ["check"], acts: [], act: ["on", "target", "set", "value"], log: ["limit"], items: ["query"], show: [], verify: ["all"], status: ["request"], remote: [], clone: ["hours", "archive"], edit: ["file", "title", "closes"], propose: ["title"], merge: ["closes"], issue: ["title", "body", "hours"], issues: [],
};

/** Every command of the envelope: the early commands of `main.ts` and the commands of `KNOWN`, with `claim` as `create`. */
export const COMMANDS: readonly string[] = [...new Set([...EARLY, ...Object.keys(KNOWN)].map(word => word === "claim" ? "create" : word))];

/**
 * The commands with a JSON renderer: each builds a typed result or error on its Outcome. `execute` dispatches them through
 * this table, after the checks that every command shares.
 */
export const JSON_COMMANDS: Readonly<Record<string, (ctx: Context, first: string | undefined) => Promise<Outcome> | Outcome>> = {
  acts: (ctx, first) => acts(ctx, first),
  show: (ctx, first) => first === undefined ? { code: 2, lines: ["show needs an entry.", USAGE] } : show(ctx, first),
  remote: (ctx, first) => first === undefined ? remote(ctx) : { code: 2, lines: ["remote takes no argument.", USAGE] },
};

/**
 * The commands without a JSON renderer yet. With `--json`, each ends with usage/2 `no-json-output` before it reads
 * configuration or a file. Each later slice removes the commands it converts (CJ-2 to CJ-5). `mcp` and `dev` (`long-lived`)
 * and `scope-index` (`operator-command`) are not in this list: they have no JSON result in version 1, and keep their own codes.
 */
export const NO_JSON_OUTPUT: readonly string[] = ["install", "application", "apps", "check", "new", "pack", "create", "invite", "join",
  "act", "log", "items", "verify", "status", "clone", "edit", "propose", "merge", "issue", "issues"];
/** The commands that run until they are stopped, and the operator command, with their own JSON usage codes. */
export const JSON_LONG_LIVED: readonly string[] = ["mcp", "dev"];
export const JSON_OPERATOR: readonly string[] = ["scope-index"];

/** Runs one command line with the given context: the text adapter. Its Outcome has the code and lines, not the typed result. */
export async function command(ctx: Context, argv: readonly string[]): Promise<Outcome> {
  const { typed: _typed, ...outcome } = await execute(ctx, argv);
  return outcome;
}

/** Runs one command line with the given context, and keeps the typed result or error of the commands that have one. */
export async function execute(ctx: Context, argv: readonly string[]): Promise<Outcome> {
  const parsed = parse(argv);
  const [name, first, ...rest] = parsed?.words ?? [];
  if (!parsed || name === undefined || !(name in KNOWN)) return { code: 2, lines: [USAGE] };
  const unknown = [...parsed.flags.keys()].find((flag) => !KNOWN[name]!.includes(flag));
  if (name === "issue") return unknown !== undefined ? { code: 2, lines: [`issue takes no --${unknown}.`, USAGE] } : issue(ctx, first, rest, parsed.flags);
  if (name === "application" && first === "upgrade") return unknown !== undefined ? { code: 2, lines: [`application upgrade takes no --${unknown}.`, USAGE] } : applicationUpgrade(ctx, rest, parsed.flags);
  if (name === "application" && parsed.flags.size > 0) return { code: 2, lines: ["Only application upgrade takes flags.", USAGE] };
  if (unknown !== undefined || rest.length > 0) return { code: 2, lines: [unknown !== undefined ? `${name} takes no --${unknown}.` : `${name} takes one argument.`, USAGE] };
  const flag = (f: string) => parsed.flags.get(f)?.at(-1);
  const number = (f: string) => (flag(f) === undefined ? undefined : Number(flag(f)));
  const needs = (what: string): Outcome => ({ code: 2, lines: [`${name} needs ${what}.`, USAGE] });
  switch (name) {
    case "install": {
      if (first?.startsWith("git+")) {
        if (["host", "namespace", "plan", "planned", "cohort", "register-policy"].some(name => parsed.flags.has(name))
          || (parsed.flags.get("release")?.length ?? 0) !== 1 || (parsed.flags.get("request")?.length ?? 0) !== 1
          || (parsed.flags.get("values")?.length ?? 0) > 1 || (parsed.flags.get("owner")?.length ?? 0) > 1) return needs("an immutable Git URI, one --release and one --request, with application options only");
        let values: unknown = {}, owner: unknown;
        try { if (flag("values") !== undefined) values = parseStrict(flag("values")!); if (flag("owner") !== undefined) owner = parseStrict(flag("owner")!); }
        catch { return needs("valid JSON in --values and --owner"); }
        return installApplication(ctx, first, { release: flag("release")!, request: flag("request")!, roles: parsed.flags.get("role") ?? [], values, ...(owner === undefined ? {} : { owner }) });
      }
      if (["release", "request", "role", "values", "owner"].some(name => parsed.flags.has(name))) return needs("a git+https URI for application options");
      const cohorts = parsed.flags.get("cohort");
      if (cohorts && (cohorts.length !== 1 || (cohorts[0] !== "base" && cohorts[0] !== "upgrade" && cohorts[0] !== "own-agent" && cohorts[0] !== "failed-claim" && cohorts[0] !== "repository-binding" && cohorts[0] !== "separate-recovery" && cohorts[0] !== "commons" && cohorts[0] !== "unpublished" && cohorts[0] !== "file-publication" && cohorts[0] !== "application" && cohorts[0] !== "application-publication" && cohorts[0] !== "trusted-application" && cohorts[0] !== "declared-application" && cohorts[0] !== "device-application" && cohorts[0] !== "archive-application" && cohorts[0] !== "archive-declared-application" && cohorts[0] !== "archive-device-application" && cohorts[0] !== "archive-device-publication" && cohorts[0] !== "archive-certified-rules" && cohorts[0] !== "hardened-certified-rules" && cohorts[0] !== "invitation-key"))) return { code: 2, lines: ["--cohort needs one current creation family or the historical family of a retained plan.", USAGE] };

      const policies = parsed.flags.get("register-policy");
      if (policies && (policies.length !== 1 || (policies[0] !== "keys" && policies[0] !== "open"))) return { code: 2, lines: ["--register-policy takes exactly one value: keys or open.", USAGE] };
      const registerPolicy = policies?.[0] as RegisterPolicy | undefined;
      const cohort = cohorts?.[0] as InstallCohort | undefined;
      if ((parsed.flags.get("host")?.length ?? 0) > 1) return { code: 2, lines: ["Give --host once: none, artifacts or github.com.", USAGE] };
      const host = flag("host"), namespace = flag("namespace");
      const where = { ...(host !== undefined ? { host } : {}), ...((cohort || registerPolicy === "open" ? namespace !== undefined : !!namespace) ? { namespace: namespace! } : {}), ...(cohort ? { cohort } : {}), ...(registerPolicy ? { registerPolicy } : {}) };
      if (flag("planned")) return first !== undefined || flag("plan") || flag("host") !== undefined || flag("namespace") !== undefined ? { code: 2, lines: ["install --planned takes no base URL, host or namespace: the original plan holds them.", USAGE] } : installPlanned(ctx, { ...(cohort ? { cohort } : {}), ...(registerPolicy ? { registerPolicy } : {}) });
      if (first === undefined) return needs("a base URL");
      return flag("plan") ? planInstall(ctx, first, where) : install(ctx, first, where);
    }
    case "application": return first !== undefined && /^(0|[1-9][0-9]*)$/.test(first) && Number.isSafeInteger(Number(first)) ? applicationInstallation(ctx, Number(first)) : needs("a nonnegative install item");
    case "apps": return first !== undefined || (parsed.flags.get("cursor")?.length ?? 0) > 1 ? { code: 2, lines: ["apps takes no argument and at most one --cursor.", USAGE] } : apps(ctx, flag("cursor") ?? null);
    case "create":
    case "claim": {
      return first === undefined ? needs("a name") : claim(ctx, first, { ...(flag("handle") ? { handle: flag("handle")! } : {}), ...(flag("branch") ? { branch: flag("branch")! } : {}), ...(flag("again") ? { again: true } : {}) });
    }
    case "invite":
      if (flag("device") !== undefined) return flag("role") || flag("acts") !== undefined || flag("keep") !== undefined || flag("check") !== undefined || flag("continue") !== undefined ? { code: 2, lines: ["invite --device takes a member's handle and --hours only: a device key keeps the member's role.", USAGE] } : first === undefined ? needs("a member's handle") : inviteDevice(ctx, first, { ...(flag("hours") ? { hours: number("hours")! } : {}) });
      if (flag("check") !== undefined && flag("continue") !== undefined) return { code: 2, lines: ["invite takes --check or --continue, not both.", USAGE] };
      if (flag("check") !== undefined || flag("continue") !== undefined) return first !== undefined || flag("role") || flag("keep") !== undefined || flag("hours") !== undefined || flag("acts") !== undefined ? { code: 2, lines: ["invite --check and --continue take no handle, role, hours or acts: the retained invitation holds them.", USAGE] } : invitePerson(ctx, undefined, { mode: flag("check") !== undefined ? "check" : "continue" });
      if (flag("keep") !== undefined && flag("acts") !== undefined) return { code: 2, lines: ["invite --keep takes no --acts: a role's actions are the roster's.", USAGE] };
      if (flag("keep") !== undefined) return first === undefined ? needs("a member's handle") : invitePerson(ctx, first, { mode: "new", ...(flag("role") ? { role: flag("role")! } : {}), ...(flag("hours") ? { hours: number("hours")! } : {}) });
      return first === undefined ? needs("a member's handle") : invite(ctx, first, { ...(flag("role") ? { role: flag("role")! } : {}), ...(flag("acts") !== undefined ? { acts: flag("acts")! } : {}), ...(flag("hours") ? { hours: number("hours")! } : {}) });
    case "join": return first === undefined ? needs("a link") : flag("check") !== undefined ? first.startsWith(AGENT_KEY_LINK) ? enrolAgentKey(ctx, first, { mode: "check" }) : first.startsWith(CHECKER_KEY_LINK) ? enrolCheckerKey(ctx, first, { mode: "check" }) : first.startsWith(DEVICE_KEY_LINK) ? enrolDeviceKey(ctx, first, { mode: "check" }) : needs("an explicitly tagged agent-key invitation for --check") : join(ctx, first);
    case "acts": return JSON_COMMANDS["acts"]!(ctx, first);
    case "act":
      if (flag("target") !== undefined && (!/^(0|[1-9][0-9]*)$/.test(flag("target")!) || !Number.isSafeInteger(number("target")))) return { code: 2, lines: ["--target must be a nonnegative item number; a member handle is not accepted here. Nothing was signed or sent."] };
      return first === undefined ? needs("an act kind") : act(ctx, first, { ...(flag("on") ? { on: flag("on")! } : {}), ...(flag("target") ? { target: number("target")! } : {}), set: parsed.flags.get("set") ?? [], value: parsed.flags.get("value") ?? [] });
    case "log": return log(ctx, first, { ...(flag("limit") ? { limit: number("limit")! } : {}) });
    case "items": return first === undefined || flag("query") === undefined ? needs("a scope and --query JSON") : items(ctx, first, flag("query")!);
    case "show": return JSON_COMMANDS["show"]!(ctx, first);
    case "status": return (parsed.flags.get("request")?.length ?? 0) > 1 ? { code: 2, lines: ["status takes one --request value.", USAGE] } : status(ctx, first, flag("request"));
    case "remote": return JSON_COMMANDS["remote"]!(ctx, first);
    case "clone": return clone(ctx, first, { ...(flag("hours") ? { hours: number("hours")! } : {}), ...(flag("archive") !== undefined ? { archive: true } : {}) });
    case "edit": return first === undefined ? needs("a path in the repository") : edit(ctx, first, { ...(flag("file") !== undefined ? { file: flag("file")! } : {}), ...(flag("title") !== undefined ? { title: flag("title")! } : {}), ...(flag("closes") !== undefined ? { closes: flag("closes")! } : {}) });
    case "propose": return first === undefined ? needs("a local branch") : propose(ctx, first, { ...(flag("title") !== undefined ? { title: flag("title")! } : {}) });
    case "merge": return first === undefined ? needs("a change") : merge(ctx, first, { ...(flag("closes") !== undefined ? { closes: flag("closes")! } : {}) });
    case "issues": return first === undefined ? issues(ctx) : { code: 2, lines: ["issues takes no argument.", USAGE] };
    default: return verify(ctx, first, { ...(flag("all") ? { all: true } : {}) });
  }
}

/** `dap application upgrade <item> <uri>`: one --release and one --request. Only --replace takes --role and --values. */
function applicationUpgrade(ctx: Context, words: readonly string[], flags: Map<string, string[]>): Promise<Outcome> | Outcome {
  const wrong = (what: string): Outcome => ({ code: 2, lines: [what, USAGE] });
  const [item, uri] = words, replace = flags.has("replace");
  if (words.length !== 2 || !/^(0|[1-9][0-9]*)$/.test(item!) || !Number.isSafeInteger(Number(item)) || !uri!.startsWith("git+")
    || flags.get("release")?.length !== 1 || flags.get("request")?.length !== 1 || (flags.get("values")?.length ?? 0) > 1) return wrong("application upgrade needs an install item, an immutable Git URI, one --release and one --request.");
  if (!replace && (flags.has("role") || flags.has("values"))) return wrong("An in-place upgrade keeps the installation's grants: --role and --values need --replace.");
  let values: unknown;
  try { if (flags.has("values")) values = parseStrict(flags.get("values")![0]!); }
  catch { return wrong("application upgrade needs valid JSON in --values."); }
  return upgradeApplication(ctx, Number(item), uri!, { release: flags.get("release")![0]!, request: flags.get("request")![0]!, replace,
    ...(replace ? { roles: flags.get("role") ?? [], values: values ?? {} } : {}) });
}

/** `dap issue open|comment|assign|close`: the words after `issue`, and its flags. Only `open` takes flags. */
function issue(ctx: Context, sub: string | undefined, words: readonly string[], flags: Map<string, string[]>): Promise<Outcome> | Outcome {
  const wrong = (what: string): Outcome => ({ code: 2, lines: [what, USAGE] });
  const flag = (f: string) => flags.get(f)?.at(-1);
  if (sub === "wait") {
    if ([...flags.keys()].some(name => name !== "hours") || (flags.get("hours")?.length ?? 0) > 1 || words.length !== 2) return wrong("issue wait needs an issue and a question's item number, and takes only --hours.");
    return issueWait(ctx, words[0]!, words[1]!, flag("hours") !== undefined ? { hours: Number(flag("hours")) } : {});
  }
  if (sub !== "open" && flags.size > 0) return wrong("Only issue open and issue wait take flags.");
  switch (sub) {
    case "open": return words.length > 0 ? wrong("issue open takes no argument: give the title with --title.") : issueOpen(ctx, { ...(flag("title") !== undefined ? { title: flag("title")! } : {}), ...(flag("body") !== undefined ? { body: flag("body")! } : {}) });
    case "comment": return words.length === 2 ? issueComment(ctx, words[0]!, words[1]!) : wrong("issue comment needs an issue and a text.");
    case "assign": return words.length === 2 ? issueAssign(ctx, words[0]!, words[1]!) : wrong("issue assign needs an issue and a member's handle.");
    case "close": return words.length === 1 ? issueClose(ctx, words[0]!) : wrong("issue close needs an issue.");
    default: return wrong("issue takes one of: open, comment, assign, close, wait.");
  }
}
