/** Local H1 smoke over the production CLI and the actual served Worker.
 * PHASE=plan BASE=http://127.0.0.1:9876 DAP_HOME=<private directory> node scripts/celld-smoke.mjs
 * Pin its public register ID, supply SESSION_SECRET privately, then PHASE=run.
 * Set CELLD_LOCAL_NO_PROXY=1 only for a loopback HTTP listener with no proxy.
 * Invitations, signatures, session readers and signing keys never enter output.
 */
import { createRequire } from "node:module";
import { mkdir, lstat } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = fileURLToPath(new URL("../", import.meta.url));
const cliRequire = createRequire(new URL("../packages/cli/bin/dap.js", import.meta.url));
let modules;
async function cli() {
  return modules ??= (async () => {
    // Use the CLI's own pinned loader. This neither fetches nor installs a tool.
    const { tsImport } = await import(pathToFileURL(cliRequire.resolve("tsx/esm/api")).href);
    const line = await tsImport(new URL("../packages/cli/src/line.ts", import.meta.url).href, import.meta.url);
    const files = await tsImport(new URL("../packages/cli/src/files.ts", import.meta.url).href, import.meta.url);
    const helpers = await tsImport(new URL("../packages/cli/src/browser-helpers.ts", import.meta.url).href, import.meta.url);
    return { command: line.command, fileStore: files.fileStore, linkOf: helpers.linkOf, LINK: helpers.LINK };
  })();
}

export class CelldSmokeError extends Error {
  constructor(stage) { super(`celld smoke failed: ${stage}; retain the private DAP_HOME for inspection`); this.stage = stage; }
}
const fail = stage => { throw new CelldSmokeError(stage); };
const loopback = hostname => hostname === "[::1]" || /^127(?:\.(?:0|[1-9][0-9]{0,2})){3}$/.test(hostname);

export function smokeSettings({ phase, base, home, localAddress }) {
  if (phase !== "plan" && phase !== "run") fail("phase");
  let url;
  try { url = new URL(base); } catch { fail("base"); }
  if (typeof base !== "string" || base.length > 2048 || url.origin !== base || url.username || url.password
    || !(url.protocol === "https:" || url.protocol === "http:" && loopback(url.hostname))) fail("base");
  if (typeof home !== "string" || !isAbsolute(home) || resolve(home) === root || home.length > 4096) fail("home");
  if (localAddress !== undefined && (!(localAddress === "127.0.0.1" || localAddress === "::1")
    || url.protocol !== "http:" || !loopback(url.hostname))) fail("local-address");
  return { phase, base, home: resolve(home), ...(localAddress === undefined ? {} : { localAddress }) };
}

async function privateHome(home) {
  await mkdir(home, { recursive: true, mode: 0o700 });
  const stat = await lstat(home);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0
    || process.getuid && stat.uid !== process.getuid()) fail("home-permissions");
}

/** This is an actual HTTP port, also used by the owned TLS proxy witness.
 * The optional fetch parameter carries that driver's local CA trust only. */
export async function contextForCelldSmoke({ base, home, localAddress, fetch: fetchPort = globalThis.fetch }) {
  const settings = smokeSettings({ phase: "run", base, home, localAddress });
  await privateHome(settings.home);
  const { fileStore } = await cli();
  const fetch = async (url, init = {}) => {
    if (new URL(url).origin !== settings.base) fail("request-origin");
    const headers = new Headers(init.headers);
    if (localAddress !== undefined) headers.set("cf-connecting-ip", localAddress);
    const timeout = AbortSignal.timeout(30_000);
    return fetchPort(url, { ...init, headers, redirect: "error", credentials: "omit",
      signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout });
  };
  // Declare custody of this exact origin-bound injected transport. The CLI
  // still verifies its retained install and the service's original receipt.
  return { store: fileStore(settings.home), now: Date.now, fetch,
    trustedCreationService: { service: settings.base, fetch } };
}

const command = async (ctx, args, stage) => {
  const result = await (await cli()).command(ctx, args);
  if (result.code !== 0) fail(stage); // Never echo arbitrary or secret-bearing CLI lines.
  return result;
};
const scope = value => typeof value === "string" && /^sc_[a-z2-7]{52}$/.test(value);
const ref = (value, kind) => value && typeof value === "object" && value.kind === kind && scope(value.scope)
  && typeof value.inc === "string" && /^in_[a-z2-7]{26}$/.test(value.inc);
const publicRef = value => ({ scope: value.scope, inc: value.inc, kind: value.kind });
const planIsOurs = (config, base) => config?.v === 1 && config.service === base && config.plan?.service === base
  && config.plan.definition === "platform:register@21" && scope(config.plan.register)
  && config.plan.founding?.intent?.fields?.host === "none" && config.plan.founding.intent.fields.namespace === "";

async function health(ctx, base) {
  // The production health probe caches readiness for five seconds. Wait for
  // its actual result, bounded independently from CLI mutation handling.
  for (let attempt = 0; attempt < 12; attempt++) {
    const response = await ctx.fetch(`${base}/health`, { method: "GET" });
    let value;
    const reader = response.body?.getReader();
    let text = "", bytes = 0;
    try {
      if (!reader) fail("health-body");
      const decoder = new TextDecoder("utf-8", { fatal: true });
      for (;;) {
        const part = await reader.read();
        if (part.done) { text += decoder.decode(); break; }
        bytes += part.value.byteLength;
        if (bytes > 16 * 1024) fail("health-body");
        text += decoder.decode(part.value, { stream: true });
      }
      value = JSON.parse(text);
    } finally { await reader?.cancel().catch(() => {}); }
    if (response.status === 200 && value?.sessions === "ok" && value.register === "ready") return { status: 200, sessions: "ok", register: "ready" };
    if (response.status !== 503) fail("health");
    if (attempt < 11) await delay(1000);
  }
  fail("health");
}

async function smoke(options) {
  const settings = smokeSettings(options), { phase, base, home, localAddress } = settings;
  const ctx = await contextForCelldSmoke({ base, home, localAddress, ...(options.fetch ? { fetch: options.fetch } : {}) });
  if (phase === "plan") {
    await command(ctx, ["install", "--plan", base, "--host", "none"], "plan");
    const config = await ctx.store.config();
    if (!planIsOurs(config, base)) fail("plan-identity");
    return { version: 1, phase, register: config.plan.register, definition: config.plan.definition };
  }
  const before = await ctx.store.config();
  if (!planIsOurs(before, base)) fail("retained-plan");
  // A failed smoke can leave an acknowledged act without a local completion
  // marker. Never turn a second smoke invocation into fresh replacement acts.
  if (await ctx.store.private("celld-smoke-run-started")) fail("run-already-started");
  await ctx.store.keepPrivate("celld-smoke-run-started", new Uint8Array([1]));
  if (!before.register) await command(ctx, ["install", "--planned"], "install");
  const installed = await ctx.store.config();
  if (!planIsOurs(installed, base) || !ref(installed.register, "register") || installed.register.scope !== before.plan.register) fail("install-identity");
  await command(ctx, ["verify", "register"], "verify-register");
  if (!installed.repository) await command(ctx, ["create", "TEST celld public-origin room", "--handle", "@owner"], "create");
  const created = await ctx.store.config(), repository = created?.repository;
  if (!ref(repository?.directory, "directory") || !ref(repository?.membership, "membership")
    || !scope(repository.rules) || !scope(repository.destination) || !scope(repository.inbox) || created.handle !== "@owner") fail("room-identity");
  let invitation = await ctx.store.private("celld-smoke-invitation");
  if (!invitation) {
    const current = await ctx.store.config();
    const invited = await command(ctx, current.invitationIssue ? ["invite", "--continue"] : ["invite", "@member", "--role", "member", "--keep"], "invite");
    const { LINK, linkOf } = await cli();
    const links = invited.lines.flatMap(line => { const at = line.indexOf(LINK); return at < 0 ? [] : [line.slice(at)]; });
    if (links.length !== 1) fail("invitation-link");
    const link = linkOf(links[0]);
    if (link?.service !== base || link.handle !== "@member" || link.repository.membership.scope !== repository.membership.scope) fail("invitation-identity");
    invitation = new TextEncoder().encode(links[0]);
    await ctx.store.keepPrivate("celld-smoke-invitation", invitation);
  }
  const member = await contextForCelldSmoke({ base, home: join(home, "member"), localAddress, ...(options.fetch ? { fetch: options.fetch } : {}) });
  const memberConfig = await member.store.config();
  if (!memberConfig?.repository) await command(member, ["join", new TextDecoder("utf-8", { fatal: true }).decode(invitation)], "join");
  const joined = await member.store.config();
  if (joined?.service !== base || joined.handle !== "@member" || joined.repository?.membership?.scope !== repository.membership.scope) fail("join-identity");
  await command(member, ["status", "membership"], "member-read");
  const verified = await command(ctx, ["verify", "--all"], "verify-all");
  const expected = [
    ["register", installed.register.scope], ["directory", repository.directory.scope],
    ["membership", repository.membership.scope], ["rules", repository.rules],
    ["destination", repository.destination], ["inbox", repository.inbox],
  ].map(([kind, id]) => `${kind} ${id}`).sort();
  const actual = verified.lines.flatMap(line => {
    const match = /^(register|directory|membership|rules|destination|inbox) (sc_[a-z2-7]{52}), entry [0-9]+: consistent\.$/.exec(line);
    return match ? [`${match[1]} ${match[2]}`] : [];
  }).sort();
  if (verified.lines.at(-1) !== "All consistent: 6 scopes." || actual.length !== 6
    || new Set(actual).size !== 6 || actual.some((identity, index) => identity !== expected[index])) fail("verify-coverage");
  return { version: 1, phase, register: publicRef(installed.register), directory: publicRef(repository.directory),
    membership: publicRef(repository.membership), rules: repository.rules, destination: repository.destination,
    health: await health(ctx, base), verifiedScopes: 6 };
}

export async function runCelldSmoke(options) {
  try { return await smoke(options); }
  catch (error) { if (error instanceof CelldSmokeError) throw error; fail("operation"); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) fail("arguments");
    const report = await runCelldSmoke({ phase: process.env.PHASE, base: process.env.BASE, home: process.env.DAP_HOME,
      ...(process.env.CELLD_LOCAL_NO_PROXY === "1" ? { localAddress: "127.0.0.1" } : {}) });
    process.stdout.write(JSON.stringify(report) + "\n");
  } catch (error) {
    process.stderr.write((error instanceof CelldSmokeError ? error.message : "celld smoke failed; retain the private DAP_HOME for inspection") + "\n");
    process.exitCode = 1;
  }
}
