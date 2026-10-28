/** Node-only operator listing. The command requests reads only; a deployed
 * host may still perform its existing maintenance when handling those reads. */
import { resolve } from "node:path";
import { Buffer } from "node:buffer";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, digestBytes, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { httpTransport, requestSession, signerSessionRequest, signedReads, type Fetch, type Signer } from "@generalbusiness/dap-client";
import type { Context, Outcome } from "./commands.ts";
import type { IndexFiles } from "./scope-index-command.ts";
import { INDEX_INVENTORY_BOUNDS, readIndexManifest, type IndexManifest } from "./scope-index-manifest.ts";
import { projectScopeApplications, type ApplicationListingError, type InstalledApplicationRow } from "./scope-index-applications.ts";
import { storedSigner } from "./store-signer.ts";
import type { Config } from "./store.ts";

const USAGE = "dap scope-index applications --manifest FILE --out FILE";
const QUALIFICATION = "Manifest kinds select Rules summary observations; other refs are marked not-applicable without a read. Saved genesis hashes were not reverified. At most one existing membership session is requested, with bounded host replay bookkeeping. The command requests no business mutation, registration, retry or pagination; existing host maintenance may still run.";
type CommandFailure = "configuration-unavailable" | "manifest-unavailable" | "manifest-invalid" | "signer-unavailable" | "session-unavailable" | "output-too-large" | "output-unavailable";
const TOO_LARGE = Symbol("output-too-large");
type RedirectFetch = (url: string, init?: Parameters<Fetch>[1] & { redirect: "error"; credentials: "omit" }) => ReturnType<Fetch>;
type NotApplicable = { readonly scope: ScopeRef; readonly status: "not-applicable" };

function noRedirects(send: RedirectFetch): Fetch {
  return async (url, init) => {
    const response = await send(url, { ...init, redirect: "error", credentials: "omit" });
    // Node's fetch rejects redirects before following them. Also reject a
    // supplied transport that returns a redirect response instead.
    if (response.status >= 300 && response.status < 400 || (response as { redirected?: unknown }).redirected === true) {
      try { if (response.body) void response.body.getReader().cancel().catch(() => undefined); } catch { /* Fixed refusal below. */ }
      throw Error("redirect-refused");
    }
    return response;
  };
}

/** Exact byte accounting precedes retention of each projected row. No
 * partial output is published if the complete report exceeds its bound. */
class Report {
  readonly #applications: string[] = [];
  readonly #errors: string[] = [];
  readonly #notApplicable: string[] = [];
  readonly #prefix: string;
  #bytes: number;
  constructor(manifestPath: string, manifestDigest: string) {
    this.#prefix = `{"manifestPath":${JSON.stringify(manifestPath)},"manifestDigest":${JSON.stringify(manifestDigest)},"applications":[`;
    this.#bytes = Buffer.byteLength(this.#prefix + '],"errors":[],"notApplicable":[]}\n');
    if (this.#bytes > INDEX_INVENTORY_BOUNDS.bytes) throw TOO_LARGE;
  }
  #append(destination: string[], row: InstalledApplicationRow | ApplicationListingError | NotApplicable): void {
    const text = JSON.stringify(row);
    const bytes = Buffer.byteLength(text) + (destination.length ? 1 : 0);
    if (bytes > INDEX_INVENTORY_BOUNDS.bytes - this.#bytes) throw TOO_LARGE;
    destination.push(text);
    this.#bytes += bytes;
  }
  add(applications: readonly InstalledApplicationRow[], errors: readonly ApplicationListingError[]): void {
    for (const row of applications) this.#append(this.#applications, row);
    for (const row of errors) this.#append(this.#errors, row);
  }
  get applications(): number { return this.#applications.length; }
  get errors(): number { return this.#errors.length; }
  get notApplicable(): number { return this.#notApplicable.length; }
  skip(scope: ScopeRef): void { this.#append(this.#notApplicable, { scope, status: "not-applicable" }); }
  bytes(): Uint8Array { return utf8(this.#prefix + this.#applications.join(",") + '],"errors":[' + this.#errors.join(",") + '],"notApplicable":[' + this.#notApplicable.join(",") + "]}\n"); }
}

export async function scopeIndexApplicationsCommand(ctx: Context, argv: readonly string[], files: IndexFiles): Promise<Outcome> {
  const [verb, manifestFlag, manifestFile, outFlag, outFile, ...extra] = argv;
  if (verb !== "applications" || manifestFlag !== "--manifest" || outFlag !== "--out" || !manifestFile || !outFile || extra.length
    || [manifestFile, outFile].some(path => path.includes("\0") || Buffer.byteLength(path) > 4096)) return { code: 2, lines: [USAGE] };

  let identity: { manifestPath: string; manifestDigest: string } | undefined;
  const fail = (error: CommandFailure): Outcome => ({ code: 1, lines: [JSON.stringify({ ...identity, error })] });
  let config: Config | null;
  try { config = await ctx.store.config(); } catch { return fail("configuration-unavailable"); }
  if (!config?.repository?.directory) return fail("configuration-unavailable");
  let saved: Uint8Array;
  try { saved = await files.read(manifestFile); } catch { return fail("manifest-unavailable"); }
  let manifest: IndexManifest;
  try {
    manifest = readIndexManifest(saved, config.service, config.repository.directory);
    identity = { manifestPath: resolve(manifestFile), manifestDigest: digestBytes(saved) };
  } catch { return fail("manifest-invalid"); }

  let signer: Signer | null;
  try { signer = await storedSigner(ctx.store, config.key); } catch { return fail("signer-unavailable"); }
  if (!signer) return fail("signer-unavailable");
  const send = ctx.fetch ?? (globalThis as { fetch?: Fetch }).fetch;
  if (!send) return fail("configuration-unavailable");
  const fetch = noRedirects(send);
  let reader: string | null = null;
  const membership = config.repository.membership;
  if (membership) {
    try {
      const now = ctx.now?.() ?? Date.now();
      const asked = await signerSessionRequest(membership, signer, timeOf(Math.floor(now / 1000) * 1000 + 60_000), b64url(crypto.getRandomValues(new Uint8Array(16))));
      const answer = await requestSession(manifest.service, membership.scope, asked, { fetch, seconds: 30 });
      if (answer.ok) reader = answer.session.reader();
      else if (answer.reason === "rate-limited") return { code: 1, lines: [JSON.stringify({ ...identity, error: "rate-limited", retryAfterSeconds: answer.retryAfterSeconds ?? null })] };
      // Other definite initial refusals select Signed authority before a read.
    } catch { return fail("session-unavailable"); }
  }
  const transport = signedReads(httpTransport(manifest.service, { fetch, bytes: 4 * 1024 * 1024, seconds: 30 }), signer, ctx.now ? { now: ctx.now } : {});
  const report = new Report(identity.manifestPath, identity.manifestDigest);
  try {
    for (const { at } of manifest.scopes) {
      // The validated manifest's kind selects relevance; no read rechecks it.
      if (at.kind !== "rules") { report.skip(at); continue; }
      try {
        const reply = await transport.summary(at.scope, reader);
        const result = projectScopeApplications(at, reply);
        report.add(result.applications, result.errors);
      } catch (error) {
        if (error === TOO_LARGE) throw error;
        report.add([], [{ scope: at, why: "unavailable" }]);
      }
    }
  } catch { return fail("output-too-large"); }
  try { await files.save(outFile, report.bytes()); }
  catch { return fail("output-unavailable"); }
  return { code: report.errors ? 1 : 0, lines: [JSON.stringify({ ...identity, status: report.errors ? "incomplete" : "complete", applications: report.applications, errors: report.errors, notApplicable: report.notApplicable }), QUALIFICATION] };
}
