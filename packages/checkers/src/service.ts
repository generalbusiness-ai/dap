/**
 * The checker service (authority note, section 3.11; I3 plan, step 25): one
 * delivery of one notice, from the origin read to the submitted result. It
 * is a separate service with its own key, and it is not a scope. It writes
 * no entry: it reads scopes, asks one lane for one step, and submits signed
 * acts, as any member's client does.
 *
 * **The order of one delivery**, and what each step may cause:
 *
 * 1. *The origin read.* The service reads the job's entry and its manifest's
 *    entry from the lane, the lane's pinned definition, and the rules
 *    scope's item for that definition (`job.ts`). Not a job: nothing is run
 *    and nothing is signed.
 * 2. *The record of the run.* One write that creates the job's record only
 *    if it is absent (`store.ts`). A delivery that does not create it starts
 *    no runner. While the delivery that made the record is at work in this
 *    process, it waits. Otherwise it looks for the end of the run that the
 *    record names, in the runner's own record.
 * 3. *The configuration.* Fetched from the rules scope by the job's digest,
 *    and read only when the bytes hash to it (`configuration.ts`).
 *    Otherwise no run: `check-error`, `configuration-unavailable`.
 * 4. *The read origin.* Manifest-list jobs use their signed, job-bound
 *    reservation snapshot and its verified overlay. Successor jobs use their
 *    actual native stage admission and immutable overlay. Neither needs a minted
 *    read token. Legacy jobs ask the lane for `job-read`, using the retained
 *    signed request. The minted token's plaintext goes only to the runner's
 *    gateway. With no token, a legacy runner cannot start.
 * 5. *The run.* One runner, for this job alone. Its input is `RunAsk`: the
 *    run's name, the job as read, and the configuration. No key, no token
 *    and no member of a notice is in it.
 * 6. *The judgment.* `judge` maps what the runner returned to what is
 *    signed (`outcome.ts`). What the runner returned is data.
 * 7. *The outcome is kept*, durably, with the record of what ran, before
 *    anything is signed.
 * 8. *The signature*, by the checker's key, in this process, outside the
 *    runner (`signing.ts`).
 * 9. *The submit.* Admitted: the record is closed. Refused for now, such as
 *    during a merge, or not answered: the outcome stays kept, and a later
 *    delivery submits it again. The computation is not run again.
 *
 * **A late result.** The service signs and submits an outcome whenever it
 * has one, also after the job's deadline: the deadline ended the lane's
 * waiting and proved nothing about the run. The lane decides what the answer
 * does (section 6.3). On a job that is `timed-out` and that no retry has
 * superseded, the first authentic answer decides the job, and its entry
 * becomes the job's deciding entry. On a job that is already decided it is
 * history only. On a superseded job the lane admits nothing that decides,
 * and the service stops submitting once it reads that state.
 *
 * **A lost run.** When the run's end cannot be found, because this process
 * or the runner's own record was lost, the service signs `check-error`,
 * `run-lost`, and still starts no second run. A job whose record was made
 * and whose runner never started has no run: that is also `run-lost`. A
 * retry is a new job. `run-lost` does not show that the run stopped, or
 * that its read token is no longer in use.
 *
 * **A checker that the rules do not name** gets nothing. At the rules scope
 * a `publish` that names a member who is not an active member with the role
 * `checker` is refused `not-a-checker`, so no rules name such a member
 * (`packages/platform/src/rules-scope.ts`). At the lane, a signer without
 * `change.check` is refused `unauthorized`; a signer who holds it and is not
 * the checker that the lane's copy of the rules names for that check is
 * refused the read token, and its `check` or `check-error` is refused
 * `not-the-checker`. Nothing is recorded for any of them.
 */

import type { ReservationSnapshot, Answer, Digest, PlatformDefinition, ScopeRef, Sealed, SignedIntent } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, evidenceBindingDigest, isRecord, parseStrict, timeMs, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { verifyOwnedCheckoutSnapshot, type StageSnapshot } from "@generalbusiness/dap-git";
import { readConfiguration, type Configuration } from "./configuration.ts";
import { verifyReservationObjects } from "./reservation-snapshot.ts";
import { manifestOf, originOf, type Job, type NotAJob, type Notice } from "./job.ts";
import { stageOriginOf, type EvidenceDefinitions, type StageSnapshotRead } from "./stage-origin.ts";
import { judge, provenanceOf, readReport, type Details, type Outcome } from "./outcome.ts";
import { JOB_READ, signJobRead, signResult, type ResultSigner } from "./signing.ts";
import type { JobRecord, Outcomes } from "./store.ts";

/**
 * The service's side of the scope namespace. Each read is the service's own
 * read of a scope, with its read session. A read that cannot be made
 * rejects: unreadable is never reported as absent.
 *
 * The rules scope is the one that the service is configured with, for the
 * one repository that its key is a checker of (section 5.5, "One key for
 * one member"; I3 deltas, entry EW15). No notice and no lane names it.
 */
export interface Scopes {
  /** The successor's actual native admission and immutable objects, through the same signed job-read boundary. */
  stageSnapshot?: StageSnapshotRead;
  reservationSnapshot?(lane: ScopeRef, signed: SignedIntent): Promise<ReservationSnapshot | { refused: "reservation-stage-missing" | "reservation-stage-mismatch" } | null>;
  /** The lane's entry at that position, with the hash that the lane serves for it. Null: the lane has none. */
  entry(lane: ScopeRef, seq: number): Promise<Sealed | null>;
  /** The definition that the lane pins. */
  pinned(lane: ScopeRef): Promise<Digest | PlatformDefinition | null>;
  /** The rules scope's item for a definition's digest: its name and its state. Null: it holds none. */
  activated(definition: Digest): Promise<{ name: string; state: string } | null>;
  /** The bytes that the rules scope retains under a configuration's digest, as canonical JSON text. Null: it retains none. */
  configuration(digest: Digest): Promise<string | null>;
  /** The job's state now, and the revision of each item that the act names: what the signed result states as `expected`. Null: the lane holds no such job. */
  standing(lane: ScopeRef, job: number, act: Outcome["act"]): Promise<{ state: string; expected: Record<string, number> } | null>;
  /** Ask the lane for one step of a capability. */
  prepare(lane: ScopeRef, signed: SignedIntent, capability: string, step: string): Promise<Answer>;
  /** Submit one signed act to the lane. */
  submit(lane: ScopeRef, signed: SignedIntent): Promise<Answer>;
}

/**
 * The input of one run: everything a runner is given. The run's name, the
 * job as the service read it from the lane, and the configuration that
 * hashed to the job's digest. It holds no key, no token and nothing that a
 * notice carried.
 */
export interface RunAsk { run: string; job: Job; configuration: Configuration }

/**
 * The runner's side: one container for one run, started from the
 * configuration's image with exactly the configuration's variables, with no
 * network but its gateway (`sandbox.ts`). The separate Node entry supplies
 * the production container adapter; test support retains its labelled stand-in.
 */
export interface Runner {
  /** Start one runner for the run, and resolve with what it returned at its end. The value is data: `judge` reads it. Rejects, or never resolves, when the runner or this call is lost. */
  run(ask: RunAsk): Promise<unknown>;
  /** The runner's own record: `running`, its end, or null. When expectedJob
   * is supplied, refuse another request's run before returning its report. */
  find(run: string, expectedJob?: Job): Promise<unknown | null>;
}

/** A run name belongs to another request. Recovery must not reuse its report. */
export class RunIdentityRefusal extends Error {
  constructor() { super("The checker run belongs to another request; its result was not reused."); }
}

export interface ServiceOptions {
  /** Exact commissioned successor lane digests; absent keeps legacy origins only. */
  evidenceDefinitions?: EvidenceDefinitions;
  signer: ResultSigner;
  scopes: Scopes;
  runner: Runner;
  outcomes: Outcomes;
  /** The service's clock, in milliseconds, for the `notAfter` of what it signs. */
  clock: () => number;
  /** Random bytes, for a run's name and an intent's idempotency key. */
  random: (length: number) => Uint8Array;
  /** Told each step that failed, by fixed words only. Never an error's text, an output or a credential. */
  log?: (event: { step: string; event: string }) => void;
}

/** What one delivery did. */
export type Delivered =
  /** Nothing was run and nothing was signed: the notice names no job, or a read could not be made, or the job's record is closed. */
  | { did: "nothing"; why: NotAJob | "unreadable" | "closed" }
  /** Another delivery's run of this job is in progress. This one started no runner. */
  | { did: "waiting" }
  /** An outcome is kept and was submitted. `ran`: this delivery started the job's one runner. */
  | { did: "submitted"; outcome: Outcome; ran: boolean; lane: "admitted" | "kept" | "superseded" };

export const RUNNING = "running";

const flightOf = (job: Job): string => `${job.fact.at.scope}/${job.fact.at.inc}/${job.fact.seq}/${job.fact.hash}`;

export class CheckerService {
  readonly #o: ServiceOptions;
  /**
   * The jobs whose one run this process started and has not concluded, by
   * the job's fact. In memory only. A delivery that finds its job here
   * waits: the delivery that made the record is still at work, in this
   * process, between the record and the run's end. A restart empties it.
   * Then the record alone says that a run started, and the runner's own
   * record says what became of it.
   */
  readonly #flying = new Set<string>();
  constructor(options: ServiceOptions) { this.#o = options; }

  #log(step: string, event: string): void { this.#o.log?.({ step, event }); }
  #signing() { return { now: this.#o.clock(), nonce: this.#o.random(16) }; }

  /** One notice of one job. It never rejects for what a scope, a runner or a notice did: each failure is a fixed word in the log. */
  async deliver(notice: Notice): Promise<Delivered> {
    // 1. The origin read: the service's own reads, and nothing of the notice but what to read.
    let job: Job;
    let stageSnapshot: StageSnapshot | undefined;
    // A notice that is not in form names nothing to read.
    const form = originOf(notice, { entry: null, pinned: null, activated: null, manifest: null });
    if ("not" in form && form.not === "bad-notice") return { did: "nothing", why: "bad-notice" };
    try {
      const { scopes } = this.#o;
      const entry = await scopes.entry(notice.lane, notice.job.seq);
      const at = manifestOf(entry, notice.job);
      const pinned = await scopes.pinned(notice.lane);
      const activated = typeof pinned === "string" && pinned.startsWith("sha256:") ? await scopes.activated(pinned as Digest) : null;
      const successor = entry?.entry.effects.some(effect => effect.effect === "value" && effect.item === notice.job.seq && effect.slot === "binding") ?? false;
      if (successor) {
        const previous = await this.#o.outcomes.get(notice.job);
        if (previous?.state === "admitted" || previous?.state === "superseded") return { did: "nothing", why: "closed" };
        if (previous && !previous.stageSnapshot) return { did: "nothing", why: "stage-origin-mismatch" };
        // The exact stored signature goes first, as in legacy recovery. An
        // accepted historical receipt does not need a new admission or signer.
        if (previous?.state === "kept" && previous.outcome && previous.signed && previous.stageSnapshot && verifySignedIntent(previous.signed)) {
          const cached = stageOriginOf(notice, { entry, pinned, activated }, previous.stageSnapshot, previous.signed.intent.actor, this.#o.evidenceDefinitions);
          const fields = previous.signed.intent.fields;
          if ("job" in cached && cached.job.evidence && previous.signed.intent.kind === previous.outcome.act
            && (previous.outcome.act === "check" ? fields["outcome"] === previous.outcome.outcome : fields["reason"] === previous.outcome.reason)
            && canonicalize(previous.signed.intent.to) === canonicalize(notice.lane)
            && canonicalize(fields["jobFact"]) === canonicalize(notice.job) && fields["tree"] === cached.job.tree && fields["configuration"] === cached.job.configuration
            && fields["bindingDigest"] === evidenceBindingDigest(cached.job.evidence) && (await scopes.submit(notice.lane, previous.signed)).answer === "accepted") {
            await this.#o.outcomes.close(notice.job, "admitted");
            return { did: "submitted", outcome: previous.outcome, ran: false, lane: "admitted" };
          }
        }
        if (!scopes.stageSnapshot) return { did: "nothing", why: "stage-origin-mismatch" };
        const asked = await signJobRead(this.#o.signer, { lane: notice.lane, fact: notice.job }, this.#signing());
        const answer = await scopes.stageSnapshot(notice.lane, asked);
        if (!answer) return { did: "nothing", why: "stage-origin-mismatch" };
        if ("refused" in answer) return { did: "nothing", why: answer.refused };
        const origin = stageOriginOf(notice, { entry, pinned, activated }, answer, this.#o.signer.key, this.#o.evidenceDefinitions);
        if ("not" in origin) return { did: "nothing", why: origin.not };
        if (!origin.job.overlay || !await verifyOwnedCheckoutSnapshot(origin.job.overlay)) return { did: "nothing", why: "stage-origin-mismatch" };
        if (previous?.stageSnapshot && stageIdentity(previous.stageSnapshot) !== stageIdentity(answer)) return { did: "nothing", why: "stage-origin-mismatch" };
        job = origin.job;
        const proof = { v: answer.v, destination: answer.destination, job: answer.job, admission: answer.admission, binding: answer.binding,
          sources: answer.sources, base: answer.base, commit: answer.commit, tree: answer.tree };
        stageSnapshot = { ...(parseStrict(canonicalize(proof)) as Omit<StageSnapshot, "objects">), objects: origin.job.overlay.objects };
      } else {
        const manifest = at === null ? null : await scopes.entry(notice.lane, at);
        const listManifest = manifest?.entry.input.type === "act" && Array.isArray(manifest.entry.input.signed.intent.fields["files"]);
        const previous = listManifest ? await this.#o.outcomes.get(notice.job) : null;
        if (previous?.state === "admitted" || previous?.state === "superseded") return { did: "nothing", why: "closed" };
        let reservation: ReservationSnapshot | null = previous?.reservation ?? null;
        if (listManifest && !reservation && scopes.reservationSnapshot) {
          const asked = await signJobRead(this.#o.signer, { lane: notice.lane, fact: notice.job }, this.#signing());
          const answer = await scopes.reservationSnapshot(notice.lane, asked);
          if (answer && "refused" in answer) return { did: "nothing", why: answer.refused };
          reservation = answer;
        }
        if (listManifest && (!reservation || !await verifyReservationObjects(reservation))) return { did: "nothing", why: "no-manifest" };
        const origin = originOf(notice, { ...(reservation ? { reservation } : {}), entry, pinned, activated, manifest });
        if ("not" in origin) return { did: "nothing", why: origin.not };
        job = origin.job;
      }
    } catch {
      this.#log("origin", "unreadable");
      return { did: "nothing", why: "unreadable" };
    }

    // 2. The record of the run: one write that creates it only if it is absent.
    const { outcomes } = this.#o;
    let record = await outcomes.get(job.fact);
    if (record === null) {
      // A native waiting deadline permits late settlement of an existing
      // fenced run; it does not commission a fresh execution after expiry.
      if (job.evidence && this.#o.clock() >= timeMs(job.deadline)!) return { did: "nothing", why: "job-deadline-passed" };
      const run = b64url(this.#o.random(16));
      const asked = await signJobRead(this.#o.signer, job, this.#signing());
      if (job.evidence && this.#o.clock() >= timeMs(job.deadline)!) return { did: "nothing", why: "job-deadline-passed" };
      if (await outcomes.start(job.fact, run, asked, job.snapshot, stageSnapshot)) {
        // Nothing waits between the write that made the record and this mark.
        const key = flightOf(job);
        this.#flying.add(key);
        try {
          return await this.#first(job, run, asked);
        } finally {
          this.#flying.delete(key);
        }
      }
      record = await outcomes.get(job.fact);
      if (record === null) return { did: "nothing", why: "unreadable" };
    }
    // A record exists. This delivery starts no runner, whatever follows.
    if (record.state === "admitted" || record.state === "superseded") return { did: "nothing", why: "closed" };
    if (record.state === "started") {
      // The delivery that made the record is at work in this process: its run has not ended, or has not begun.
      if (this.#flying.has(flightOf(job))) return { did: "waiting" };
      let matched: unknown;
      try {
        matched = await this.#o.runner.find(record.run, job);
      } catch (error) {
        if (error instanceof RunIdentityRefusal) {
          this.#log("find", "identity-refused"); matched = null;
        } else {
          // The runner's record could not be read now. That is not "no record": nothing is concluded.
          this.#log("find", "unreadable");
          return { did: "waiting" };
        }
      }
      if (matched === RUNNING) return { did: "waiting" };
      // The run's end as its own record has it, or no record at all: `run-lost`. No second run in either case.
      await this.#conclude(job, record.run, await this.#configuration(job), matched);
    }
    return this.#submit(job, false);
  }

  /** The configuration that hashes to the job's digest, fetched from the rules scope, or null. */
  async #configuration(job: Job): Promise<Configuration | null> {
    try {
      return readConfiguration(await this.#o.scopes.configuration(job.configuration), job.configuration);
    } catch {
      this.#log("configuration", "unreadable");
      return null;
    }
  }

  /** Steps 3 to 9, for the delivery that made the job's record. */
  async #first(job: Job, run: string, asked: SignedIntent): Promise<Delivered> {
    const configuration = await this.#configuration(job);
    if (job.evidence && !await this.#currentStage(job, (await this.#o.outcomes.get(job.fact))?.stageSnapshot)) return { did: "waiting" };
    let report: unknown = null;
    let ran = false;
    if (configuration !== null) {
      // 4. Legacy runs require the read token; snapshot runs use their verified overlay.
      // Without the required legacy token no runner starts, leaving `run-lost`.
      let token: Answer | null = null;
      try {
        token = job.overlay || job.snapshot ? null : await this.#o.scopes.prepare(job.lane, asked, JOB_READ.capability, JOB_READ.step);
      } catch {
        this.#log("job-read", "no-answer");
      }
      // The lane's answer is read as data: a value that is no answer is no token, and the log holds one of four fixed words.
      const answered = isRecord(token) ? token["answer"] : null;
      if ((job.overlay || job.snapshot || answered === "accepted") && (!job.evidence || this.#o.clock() < timeMs(job.deadline)!)) {
        ran = true;
        try {
          // 5. The one run of this job.
          report = await this.#o.runner.run({ run, job, configuration });
        } catch (error) {
          // A lost reply is not a missing execution record. Look up this
          // exact run once; recovery never calls run a second time.
          if (error instanceof RunIdentityRefusal) {
            this.#log("run", "identity-refused"); report = null;
          } else {
            this.#log("run", "lost");
            try { report = await this.#o.runner.find(run, job); }
            catch (finding) {
              if (finding instanceof RunIdentityRefusal) { this.#log("find", "identity-refused"); report = null; }
              else { this.#log("find", "unreadable"); return { did: "waiting" }; }
            }
          }
          if (report === RUNNING) return { did: "waiting" };
        }
      } else if (token !== null) this.#log("job-read", answered === "refused" || answered === "unavailable" || answered === "mismatch" ? answered : "no-answer");
    }
    await this.#conclude(job, run, configuration, report);
    return this.#submit(job, ran);
  }

  /**
   * Steps 6 and 7: the outcome of the run, kept with the record of what ran. An outcome that is already kept is not replaced.
   *
   * The report is read once, into a value that canonical bytes can hold (`readReport`), and the judgment and the record of what ran
   * are both made from that one reading. A report that is not in form is `report-malformed`, with a record of what ran that repeats
   * nothing of it. So nothing that a runner returned can fail between the record of the run and the kept outcome, at the run's own
   * delivery or at a later one that finds the same report: the outcome is kept and signed, and no second run starts.
   */
  async #conclude(job: Job, run: string, configuration: Configuration | null, report: unknown): Promise<void> {
    const lost = report === null || report === undefined;
    const read = lost ? null : readReport(report);
    const outcome: Outcome = configuration === null ? { act: "check-error", reason: "configuration-unavailable" } : lost ? { act: "check-error", reason: "run-lost" } : judge(configuration, read);
    const details: Details | null = configuration === null ? null : { provenance: provenanceOf(job, configuration, read, run) };
    await this.#o.outcomes.keep(job.fact, outcome, details);
  }

  /** Steps 8 and 9, for the outcome that the store keeps. */
  async #submit(job: Job, ran: boolean): Promise<Delivered> {
    const { outcomes, scopes } = this.#o;
    const record = await outcomes.get(job.fact);
    if (record === null || record.outcome === null || record.state === "started") return { did: "nothing", why: "unreadable" };
    const done = (lane: "admitted" | "kept" | "superseded"): Delivered => ({ did: "submitted", outcome: record.outcome!, ran, lane });
    if (record.state !== "kept") return done(record.state);
    try {
      if (job.evidence && !await this.#currentStage(job, record.stageSnapshot)) return done("kept");
      // The exact bytes that were submitted before, first: a lane that admitted them answers with their receipt and writes nothing.
      if (record.signed !== null && (await scopes.submit(job.lane, record.signed)).answer === "accepted") return (await outcomes.close(job.fact, "admitted"), done("admitted"));
      const standing = await scopes.standing(job.lane, job.fact.seq, record.outcome.act);
      if (standing === null) return done("kept");
      if (standing.state === "superseded") return (await outcomes.close(job.fact, "superseded"), done("superseded"));
      if (job.evidence && !await this.#currentStage(job, record.stageSnapshot)) return done("kept");
      const signed = await signResult(this.#o.signer, job, record.outcome, record.details, standing.expected, this.#signing());
      // Noted before it is sent, so that a lost answer is asked again with the same bytes.
      if (!(await outcomes.signed(job.fact, signed))) return done("kept");
      const answer = await scopes.submit(job.lane, signed);
      if (answer.answer === "accepted") return (await outcomes.close(job.fact, "admitted"), done("admitted"));
      this.#log("submit", answer.answer === "refused" ? `refused ${answer.reason}` : answer.answer);
    } catch {
      this.#log("submit", "no-answer");
    }
    return done("kept");
  }

  /** After execution awaits, re-read the same admission with this actual signer; never rotate/re-sign an old fence. */
  async #currentStage(job: Job, saved: StageSnapshot | undefined): Promise<boolean> {
    const { scopes } = this.#o;
    if (!saved || !scopes.stageSnapshot) return false;
    const entry = await scopes.entry(job.lane, job.fact.seq), pinned = await scopes.pinned(job.lane);
    const activated = typeof pinned === "string" && pinned.startsWith("sha256:") ? await scopes.activated(pinned as Digest) : null;
    const asked = await signJobRead(this.#o.signer, job, this.#signing());
    const answer = await scopes.stageSnapshot(job.lane, asked);
    if (!answer || "refused" in answer || stageIdentity(answer) !== stageIdentity(saved)) return false;
    const origin = stageOriginOf({ lane: job.lane, job: job.fact, name: job.name, tree: job.tree }, { entry, pinned, activated }, answer, this.#o.signer.key, this.#o.evidenceDefinitions);
    return "job" in origin && canonicalize({ ...origin.job, overlay: null }) === canonicalize({ ...job, overlay: null });
  }
}

const stageIdentity = (snapshot: StageSnapshot): string => canonicalize({ binding: snapshot.binding, destination: snapshot.destination,
  job: { at: snapshot.job.entry.at, seq: snapshot.job.entry.seq, hash: snapshot.job.hash },
  admission: { at: snapshot.admission.entry.at, seq: snapshot.admission.entry.seq, hash: snapshot.admission.hash },
  commit: snapshot.commit, tree: snapshot.tree, base: snapshot.base });

export type { JobRecord };
