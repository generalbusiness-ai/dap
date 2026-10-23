/** Local package commands run under Node; they do not contact a room. */
import { resolve } from "node:path";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { ApplicationPackageValidationError } from "@generalbusiness/dap-bytes/application-v2";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { validatePackage, type PackageValidationFinding } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { ApplicationPackageError, secretSigner } from "@generalbusiness/dap-client";
import type { Outcome } from "./commands.ts";
import type { Store } from "./store.ts";
import { parse } from "./line.ts";
import { ApplicationSourceError, packDirectory, prepareApplicationDirectory, readApplicationScenario } from "./application-files.ts";
import { ApplicationScenarioError, runApplicationScenario } from "./application-scenarios.ts";
import { newApplicationDirectory } from "./application-new.ts";

export const PACK_USAGE = "dap pack [<directory>] [--config <relative-file>] [--out <file>] [--publisher <existing-key-name>]";
export const CHECK_USAGE = "dap check [<directory>] [--config <relative-file>]";
export const NEW_USAGE = "dap new <directory>";
/** Keep each finding on one physical line, even for native names containing
 * control characters or table separators. These are evidence rows, not HTML. */
const cell = (value: string): string => JSON.stringify(value).slice(1, -1).replaceAll("|", "\\|").replace(/[\u007f-\u009f\u2028\u2029]/g, character => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`);
function findingRows(findings: readonly PackageValidationFinding[]): string[] {
  return findings.length ? ["Definition | Row | Check | Severity | Reason | Message", ...findings.map(finding => [finding.definition ?? "package", finding.row, finding.check, finding.severity, finding.reason, finding.message].map(cell).join(" | "))] : [];
}
/** Local files only. A new application needs no config or operator key. */
export async function newCommand(argv: readonly string[], cwd = process.cwd()): Promise<Outcome> {
  if (argv.length !== 2 || argv[0] !== "new" || !argv[1] || argv[1].startsWith("--")) return { code: 2, lines: [NEW_USAGE] };
  try {
    const directory = await newApplicationDirectory(resolve(cwd, argv[1]));
    return { code: 0, lines: [`Application: ${directory}`, "Next: run dap check in that directory.", "Scenario authority uses public TEST actors. The browser starter joins no room."] };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return { code: 1, lines: ["The application directory already exists; choose a new directory."] };
    return { code: 1, lines: ["Could not create the application. Use a new lowercase directory name under an existing writable parent; partial files may remain."] };
  }
}
/** Uses only public TEST publisher/actor keys, never a config directory or an
 * operator key. It prepares bytes in memory and writes no package output. */
export async function checkCommand(argv: readonly string[], cwd = process.cwd()): Promise<Outcome> {
  const parsed = parse(argv);
  if (!parsed || parsed.words[0] !== "check" || parsed.words.length > 2 || [...parsed.flags].some(([name, values]) => name !== "config" || values.length !== 1 || !values[0] || values[0].startsWith("--"))) return { code: 2, lines: [CHECK_USAGE] };
  try {
    const prepared = await prepareApplicationDirectory(resolve(cwd, parsed.words[1] ?? "."), secretSigner(new Uint8Array(32).fill(254)), { ...(parsed.flags.has("config") ? { config: parsed.flags.get("config")![0]! } : {}) });
    const validation = prepared.packet.package.semantic.v === 2 ? validatePackage(prepared.packet.bytes, PROPOSED_BOUNDS, RULE_PROFILES) : null;
    if (validation && !validation.ok) return { code: 1, lines: ["Package validation refused.", ...findingRows(validation.findings), ...(validation.kind === "codec" && !validation.findings.length ? [`Package codec: ${validation.reason}.`] : [])] };
    if (prepared.scenarios.length === 0) return { code: 1, lines: ["No local scenarios are listed in the application config. Check requires at least one scenario and native replay."] };
    const lines = [`Semantic: ${prepared.packet.ids.semantic}`, `Presentation: ${prepared.packet.ids.presentation}`,
      `Native definitions: ${prepared.packet.package.semantic.definitions.length} validated.`, "Local authority: explicit scripted TEST grants; replay trusts authority as recorded."];
    if (validation?.kind === "graph") {
      lines.push(...findingRows(validation.findings));
      const projected = validation.report.projected, show = (value: number | string | null) => value === null ? "unproved" : `at most ${value}`;
      if (projected) lines.push(`Successful creation paths: ${show(projected.successfulCreation.entryCeiling)} entries; ${show(projected.successfulCreation.itemKeyCeiling)} item keys.`,
        "Creation-path counts exclude failures, repeated inputs, timed work and outside scopes; admission is checked per scope.",
        `Live items across this install: ${show(projected.liveItems.acrossInstall)}. Lifetime entries: ${show(projected.lifetime.entries)}; lifetime item keys: ${show(projected.lifetime.itemKeys)}.`);
    }
    for (const path of prepared.scenarios) {
      const result = await runApplicationScenario(prepared.packet, await readApplicationScenario(prepared.root, path));
      lines.push(result.capabilityGrant
        ? `Local definition: ${result.definition}; scripted parent creation proof with explicit replay anchor, then actual Core/SQLite child genesis. This is not a native install.`
        : `Local root definition: ${result.definition}; scripted directory fixture, without child transport.`);
      lines.push(`Scenario ${result.name}: ${result.steps} steps passed; native replay consistent through ${result.replay.report.target.seq}.`);
      if (result.projectionChecks) lines.push(`Declared projection checks: ${result.projectionChecks} passed at native journal heads.`);
      if (result.ownerRecords.length) lines.push(`Non-native scenario-owner records: ${result.ownerRecords.length}; outside the journal and native replay claim.`);
      if (result.capabilityGrant) lines.push(`Scripted device owner: ${canonicalize(result.capabilityGrant.owner)}. Replay anchors: ${canonicalize(result.capabilityGrant.anchors)}. Genuine native issuance witness: ${result.capabilityGrant.nativeIssuanceWitness}.`);
      if (result.preparations) lines.push(`Native owner preparations in the journal: ${result.preparations}.`);
    }
    const requested = prepared.packet.package.semantic.capabilities;
    lines.push(`Declared capability requirements: ${requested.length ? requested.map(capability => capability.name).join(", ") : "none"}.`);
    for (const capability of requested) lines.push(`Requested ${capability.name} bounds: ${canonicalize(capability.bounds)}`);
    lines.push("Local external effects are disabled; this check does not admit a package or audit screen code.");
    return { code: 0, lines };
  } catch (error) {
    if (error instanceof ApplicationPackageValidationError) return { code: 1, lines: ["Package validation refused.", ...findingRows(error.findings)] };
    if (error instanceof ApplicationSourceError || error instanceof ApplicationPackageError || error instanceof ApplicationScenarioError) return { code: 1, lines: [error.message] };
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR" || code === "ELOOP" || code === "EACCES" || code === "EPERM") return { code: 1, lines: ["An application source or scenario file is missing, inaccessible or a symlink."] };
    return { code: 1, lines: ["Could not check the local application."] };
  }
}

export async function packCommand(store: Store, argv: readonly string[], cwd = process.cwd()): Promise<Outcome> {
  const parsed = parse(argv);
  if (!parsed || parsed.words[0] !== "pack" || parsed.words.length > 2 || [...parsed.flags].some(([name, values]) => !["out", "publisher", "config"].includes(name) || values.length !== 1 || values[0] === "" || values[0]!.startsWith("--"))) return { code: 2, lines: [PACK_USAGE] };
  const keyName = parsed.flags.get("publisher")?.[0] ?? "operator";
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(keyName)) return { code: 2, lines: ["Choose an existing publisher key by name.", PACK_USAGE] };
  const directory = resolve(cwd, parsed.words[1] ?? ".");
  const output = resolve(cwd, parsed.flags.get("out")?.[0] ?? resolve(directory, "application.dap.json"));
  let secret: Uint8Array | null = null;
  try {
    const stored = store.signer ? null : await store.secret(keyName);
    secret = stored === null ? null : new Uint8Array(stored);
    const signer = store.signer ? await store.signer(keyName) : secret ? secretSigner(secret) : null;
    if (signer === null) return { code: 1, lines: [`No existing publisher key named ${keyName}. Pack does not create a key.`] };
    const packed = await packDirectory(directory, output, signer, { ...(parsed.flags.has("config") ? { config: parsed.flags.get("config")![0]! } : {}) });
    return { code: 0, lines: [`Package: ${output}`, `Semantic: ${packed.ids.semantic}`, `Presentation: ${packed.ids.presentation}`, `Release: ${packed.ids.release}`, `Publisher: ${packed.package.release.manifest.publisher}`] };
  } catch (error) {
    if (error instanceof ApplicationPackageValidationError) return { code: 1, lines: ["Package validation refused.", ...findingRows(error.findings)] };
    if (error instanceof ApplicationSourceError || error instanceof ApplicationPackageError) return { code: 1, lines: [error.message] };
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EEXIST") return { code: 1, lines: ["Output already exists; choose a new --out file."] };
    if (code === "ENOENT" || code === "ENOTDIR" || code === "ELOOP" || code === "EACCES" || code === "EPERM") return { code: 1, lines: ["An application source or output directory is missing, inaccessible or a symlink."] };
    // Do not echo unknown key-store errors: implementations may contain secrets.
    return { code: 1, lines: ["Could not pack the application."] };
  } finally { secret?.fill(0); }
}
