/** Per-pass installed policy ownership. Retained proof is permission only
 * after immutable creation provenance and current publisher trust agree. */
import type { Bounds, Digest, PlatformDefinition, ScopeRef, Seed, SequenceRef } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isScopeRef, same, utf8 } from "@generalbusiness/dap-bytes";
import { applicationCapabilities, applicationAdmissionCohort } from "@generalbusiness/dap-platform";
import { ArchivePolicyStopped, ArchivePolicyPending, type ArchiveBudget } from "../../packages/scope/src/archive-budget.ts";
import type { ReviewedArchivePolicy } from "../../packages/scope/src/archive-inventory.ts";
import { forecastArchiveDeclarationValidation } from "../../packages/scope/src/archive-inventory-cost.ts";
import { forecastArchivePackageProofFixed, forecastArchivePackageProofReply, forecastArchivePolicyTables, forecastArchiveTrustCheck, forecastArchiveTrustParse } from "./archive-setup-cost.ts";
import { readApplicationTrust, type ApplicationTrust } from "../../packages/scope/src/applications/admission.ts";
import { APPLICATION_ARCHIVE_PROOF_BYTES, isApplicationArchiveProofRefusal, readApplicationArchiveProof, type ApplicationArchiveProof, type ApplicationArchiveProofRefusal } from "../../packages/scope/src/applications/archive-proof.ts";
import type { ApplicationBindings } from "../../packages/scope/src/applications/bindings.ts";
import type { OutsideGiven } from "../../packages/scope/src/given.ts";
import { namespace, type Binding } from "../../packages/scope/src/namespace.ts";
import { readNativeBirth } from "../../packages/scope/src/native-birth.ts";
import { isRoomRetiredStop, type RoomRetiredStop } from "../../packages/scope/src/room-retired.ts";
import { sqlJsonText as text, type Sql } from "../../packages/scope/src/sqlite.ts";
import { archiveInstallationIdentity, type ArchiveInstallationIdentity } from "./archive-identity.ts";
import { archivePackagePolicies } from "./archive-policy.ts";

export const APPLICATION_ARCHIVE_REVOKED = "application-policy-revoked";
type ProofReply = string | ApplicationArchiveProofRefusal | null | RoomRetiredStop;
type ProofPeer = { applicationArchiveProofBytes(directory: ScopeRef, item: number): Promise<ProofReply> };
type Identity = Pick<ArchiveInstallationIdentity, "directory" | "rules" | "rulesNamed" | "item">;

export function roomArchivePackages(_given: OutsideGiven, sql: Sql, binding: Binding, env: ApplicationBindings,
  policies: Map<Digest | PlatformDefinition, ReviewedArchivePolicy>, bounds: Bounds) {
  let active: { at: SequenceRef; seed: Seed } | null = null, activeBudget: ArchiveBudget | null = null;
  let truth: { setting: string | undefined; rows: readonly ApplicationTrust[] } | null = null;
  const native = new Map(policies), releases = new Map<Digest, string>(), prepared = new Set<string>(), owned = new Set<string>();
  const flights = new Map<string, Promise<ProofReply>>();
  const trusts = (budget: ArchiveBudget): readonly ApplicationTrust[] => {
    const setting = env.APPLICATION_TRUST;
    // The existing parser rejects larger strings before JSON admission.
    if (setting !== undefined && (typeof setting !== "string" || setting.length > 64 * 1024)) return [];
    const units = Math.max(setting?.length ?? 0, truth?.setting?.length ?? 0);
    budget.spend(forecastArchiveTrustCheck(units, 0, 0));
    if (truth && truth.setting === setting) return truth.rows;
    budget.spend(forecastArchiveTrustParse(setting?.length ?? 0));
    let rows: readonly ApplicationTrust[];
    try { rows = readApplicationTrust(setting); } catch { rows = []; }
    truth = { setting, rows }; return rows;
  };
  const current = () => {
    if (!activeBudget) return false;
    activeBudget.check();
    if (releases.size === 0) return true;
    const rows = trusts(activeBudget);
    activeBudget.spend(forecastArchiveTrustCheck(0, releases.size, rows.length));
    for (const [release, publisher] of releases) if (!rows.some(row => row.release === release && row.publisher === publisher)) return false;
    return true;
  };
  const trusted = (release: Digest, publisher: string | undefined, budget: ArchiveBudget) => {
    const rows = trusts(budget);
    budget.spend(forecastArchiveTrustCheck(0, 1, rows.length));
    return rows.some(row => row.release === release && (publisher === undefined || row.publisher === publisher));
  };
  const add = (proof: ApplicationArchiveProof, budget: ArchiveBudget) => {
    const release = proof.installation.ids.release;
    budget.spend({ inputWork: 4096 });
    if (proof.semantic.host.execution !== "recorded-do" || proof.semantic.host.profiles.some(profile => profile !== "restricted@1")
      || proof.semantic.capabilities.length > 0 && (proof.v !== 2 || !applicationCapabilities(proof.semantic))) throw new ArchivePolicyStopped("application-policy-unavailable");
    if (!trusted(release, proof.publisher, budget)) throw new ArchivePolicyStopped(APPLICATION_ARCHIVE_REVOKED);
    // Immutable signed strings expose their lengths without parsing. Each
    // fresh validation pays the original declaration work before it runs.
    for (const part of proof.semantic.definitions) budget.spend(forecastArchiveDeclarationValidation(part.bytes.length));
    budget.spend(forecastArchivePolicyTables(0, proof.semantic.definitions.length));
    const declared = archivePackagePolicies(proof.semantic.definitions);
    budget.check();
    if (!trusted(release, proof.publisher, budget)) throw new ArchivePolicyStopped(APPLICATION_ARCHIVE_REVOKED);
    for (const [pin, policy] of declared) policies.set(pin, policy);
    releases.set(release, proof.publisher);
  };
  const proof = async (identity: Identity, budget: ArchiveBudget): Promise<ApplicationArchiveProof | null> => {
    const held = budget.reserve({ nodes: 1, calls: 1, metadata: bounds.entryBytes, inputWork: bounds.entryBytes * 8 });
    const birth = readNativeBirth(await budget.wait(() => namespace(binding).births.read(identity.rules, Math.min(10_000, budget.remaining()), bounds.entryBytes)), identity.rules, bounds.entryBytes,
      bytes => { budget.settle(held, bytes); budget.spend({ inputWork: bytes * 32 }); });
    if (!birth || birth.birth.named !== identity.rulesNamed || birth.sequence.kind !== "rules") return null;
    budget.spend({ metadata: 512, inputWork: 1024 });
    const key = canonicalize([identity.rules, identity.directory, identity.item]);
    // A caller deadline cannot release an underlying namespace proof read.
    // A later pass refuses this flight until the actual task has settled.
    if (flights.has(key)) return budget.stop("unavailable");
    // Sender item and pin work does not shrink with the response length.
    budget.spend(forecastArchivePackageProofFixed());
    const reservation = budget.reserve(forecastArchivePackageProofReply());
    const directory = { ...identity.directory }, item = identity.item, rules = { ...identity.rules };
    const task = Promise.resolve().then(() => {
      budget.check();
      return (binding.get(binding.idFromName(rules.scope)) as unknown as ProofPeer).applicationArchiveProofBytes(directory, item);
    });
    flights.set(key, task);
    const release = () => { if (flights.get(key) === task) flights.delete(key); };
    void task.then(release, release);
    const raw = await budget.wait(() => task);
    if (isApplicationArchiveProofRefusal(raw)) {
      // A refusal keeps the full reserved read charge. Active installation
      // already retained its signed inputs; no archive repair owns them.
      if (raw.reason === "installation-not-active") throw new ArchivePolicyPending();
      throw new ArchivePolicyStopped("application-policy-unavailable", raw.reason);
    }
    if (isRoomRetiredStop(raw) || typeof raw !== "string" || raw.length > APPLICATION_ARCHIVE_PROOF_BYTES) return null;
    const bytes = utf8(raw).length;
    if (bytes > APPLICATION_ARCHIVE_PROOF_BYTES) return null;
    budget.settle(reservation, bytes);
    const checked = readApplicationArchiveProof(raw, { named: identity.rulesNamed, rules: identity.rules, directory: identity.directory, item: identity.item });
    if (!checked) return null;
    return checked;
  };
  const installed = async (at: ScopeRef, seed: Seed, budget: ArchiveBudget, birth?: { bytes: string; hash: Digest }) => {
    const identity = await archiveInstallationIdentity(at, seed, sql, binding, bounds, budget,
      birth ? { fact: { at, seq: 0, hash: birth.hash }, bytes: birth.bytes } : undefined);
    budget.check();
    if (!identity) return false;
    if (identity === "unpackaged") throw new ArchivePolicyStopped("application-policy-unavailable");
    if (!trusted(identity.ids.release, undefined, budget)) throw new ArchivePolicyStopped(APPLICATION_ARCHIVE_REVOKED);
    const checked = await proof(identity, budget);
    if (!checked || !same(checked.installation.scope, identity.root) || checked.installation.definition !== identity.definition
      || !same(checked.installation.ids, identity.ids) || !checked.semantic.definitions.some(part => part.id === seed.definition)) return false;
    add(checked, budget);
    budget.spend({ metadata: 512, inputWork: 4096 });
    owned.add(canonicalize(at));
    return true;
  };
  return {
    current,
    async prepare(at: SequenceRef, seed: Seed, budget: ArchiveBudget): Promise<{ readonly stop: string } | void> {
      budget.spend(forecastArchivePolicyTables(policies.size + releases.size + prepared.size + owned.size, native.size));
      active = { at: { ...at }, seed: { ...seed } }; activeBudget = budget; truth = null;
      policies.clear(); for (const [pin, policy] of native) policies.set(pin, policy);
      releases.clear(); prepared.clear(); owned.clear();
      if (isDigest(seed.definition) && !await installed(at, seed, budget)) throw new ArchivePolicyPending();
    },
    async source(at: ScopeRef, seed: Seed, birth: { bytes: string; hash: Digest }, budget: ArchiveBudget): Promise<boolean> {
      if (!isDigest(seed.definition)) return policies.has(seed.definition);
      budget.spend({ metadata: 512, inputWork: 4096 });
      // Equal declaration bytes in another release prove no installation of
      // THIS scope. Only its exact full-reference proof may be reused here.
      if (owned.has(canonicalize(at))) {
        if (!current()) throw new ArchivePolicyStopped(APPLICATION_ARCHIVE_REVOKED);
        return true;
      }
      return installed(at, seed, budget, birth);
    },
    /** Native Rules/Directory entries select their own installation proof;
     * there is no scan of other rooms or all trusted releases. */
    async candidate(seq: number, budget: ArchiveBudget): Promise<void> {
      if (!active || isDigest(active.seed.definition) || !["rules", "directory"].includes(active.seed.kind)) return;
      const { at, seed } = active;
      const position = budget.native(sql, () => ({ metadata: 256, inputWork: 0 })).exec("SELECT hash,size,typeof(bytes) AS type,octet_length(bytes) AS actual FROM entry WHERE seq=? LIMIT 1", seq).toArray()[0];
      const size = position?.["size"], hash = position?.["hash"];
      if (typeof size !== "number" || !Number.isSafeInteger(size) || size < 1 || size > bounds.entryBytes || !isDigest(hash)
        || position?.["type"] !== "text" || position["actual"] !== size) return budget.stop("unavailable");
      const identities: Identity[] = [];
      if (seed.kind === "rules") {
        const rooms = budget.native(sql, () => ({ metadata: 128, inputWork: 0 })).exec("SELECT id,octet_length(record) AS bytes FROM item WHERE type='rules' AND state='current' LIMIT 2").toArray();
        const roomSize = rooms[0]?.["bytes"], roomId = rooms[0]?.["id"];
        if (rooms.length !== 1 || typeof roomSize !== "number" || !Number.isSafeInteger(roomSize) || roomSize < 1 || typeof roomId !== "number") return budget.stop("unavailable");
        const room = budget.native(sql, () => ({ metadata: 256, inputWork: roomSize * 64 })).exec(`SELECT ${text("$.refs.directory.scope", 71, "record")} AS scope,${text("$.refs.directory.genesis", 71, "record")} AS genesis FROM item WHERE id=? AND octet_length(record)=? LIMIT 1`, roomId, roomSize).toArray()[0];
        const directory = { scope: room?.["scope"], genesis: room?.["genesis"] };
        if (!isScopeRef(directory)) return budget.stop("unavailable");
        const items = budget.native(sql, () => ({ metadata: (bounds.derivedEffects + 1) * 16, inputWork: size * 64 }))
          .exec("SELECT DISTINCT CASE WHEN typeof(json_extract(value,'$.item'))='integer' THEN json_extract(value,'$.item') ELSE NULL END AS item FROM entry,json_each(entry.bytes,'$.effects') WHERE entry.seq=? AND entry.hash=? AND entry.size=? AND typeof(entry.bytes)='text' AND octet_length(entry.bytes)=? LIMIT ?", seq, hash, size, size, bounds.derivedEffects + 1).toArray();
        if (items.length > bounds.derivedEffects) return budget.stop("limit");
        for (const effect of items) {
          if (typeof effect["item"] !== "number" || !Number.isSafeInteger(effect["item"]) || effect["item"] < 0) continue;
          const item = effect["item"];
          const key = `${at.scope}:${item}`;
          if (prepared.has(key)) continue;
          const job = budget.native(sql, () => ({ metadata: 16, inputWork: 0 })).exec("SELECT id FROM item WHERE id=? AND type='installation' AND state='active' LIMIT 1", item).toArray()[0];
          if (job?.["id"] === item) {
            identities.push({ directory, rules: at, rulesNamed: seed.definition, item }); prepared.add(key);
          }
        }
      } else {
        const input = budget.native(sql, () => ({ metadata: 2048, inputWork: size * 64 })).exec(`SELECT
          ${text("$.input.type", 16)} AS type,${text("$.input.decision", 16)} AS decision,
          ${text("$.input.message.class", 16)} AS class,${text("$.input.message.type", 16)} AS messageType,
          ${text("$.input.message.body.message", 64)} AS message,CASE WHEN typeof(json_extract(bytes,'$.input.message.body.fields.job'))='integer' THEN json_extract(bytes,'$.input.message.body.fields.job') ELSE NULL END AS job,
          ${text("$.input.from.at.scope", 71)} AS rulesScope,${text("$.input.from.at.genesis", 71)} AS rulesGenesis
          FROM entry WHERE seq=? AND hash=? AND size=? AND typeof(bytes)='text' AND octet_length(bytes)=? LIMIT 1`, seq, hash, size, size).toArray()[0];
        if (input?.["type"] === "delivery" && input["decision"] === "applied" && input["class"] === "request"
          && input["messageType"] === "tell" && input["message"] === "application-create") {
          const job = input["job"], rules = { scope: input["rulesScope"], genesis: input["rulesGenesis"] }, cohort = applicationAdmissionCohort(seed.definition);
          if (cohort && isScopeRef(rules) && typeof job === "number" && Number.isSafeInteger(job) && job >= 0)
            identities.push({ directory: at, rules, rulesNamed: cohort.rules, item: job });
        }
      }
      for (const identity of identities) {
        const checked = await proof(identity, budget);
        if (!checked) throw new ArchivePolicyPending();
        add(checked, budget);
      }
    },
  };
}
