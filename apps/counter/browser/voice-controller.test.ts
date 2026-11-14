// Fake-only custody witnesses: no browser speech, provider, microphone, Worker, or native scope.
// The fake custody view stands in for the `Custody` record under each slot key: its phase, signings, envelopes and reason.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { ScopeKind } from "@generalbusiness/dap-contract";
import { keyIdOfSecret, textDigest } from "@generalbusiness/dap-bytes";
import { scriptedSequence } from "@generalbusiness/dap-derive/scripted";
import { requestKey } from "@generalbusiness/dap-client";
import { COUNTING_COMMITMENTS_DEFINITION as COUNTING_DEFINITION } from "../commitments-pin.ts";
import { correctionRoom, createVoiceController, keptReport, terminalReport, unsentReport, validAudioStart, type ActorIdentity, type AudioStart, type Completion,
  type CustodyLock, type KeptReport, type PendingReport, type ReportCustody, type ReportOutcome, type SpeechPort, type TurnToken } from "./voice-controller.ts";

const secret = new Uint8Array(32).fill(61);
const reference = (kind: ScopeKind) => (scriptedSequence({v:1,kind,definition:COUNTING_DEFINITION,creator:null,cause:textDigest(`FAKE controller ${kind}`),ordinal:0},"2026-01-01T00:00:00Z",6).at);
const scope = reference("lane"), membership = reference("membership");
const identity: ActorIdentity = { origin: "https://example.invalid", deployment: "test-deployment", scope,
  definition: COUNTING_DEFINITION, membership, member: { membership, member: "@alice" }, publicKey: keyIdOfSecret(secret) };
const turn = (over: Partial<TurnToken> = {}): TurnToken => ({ ...identity, generation: 0, serial: 1, N: 1, expiresAt: 10_000, ...over });
const slot = (): KeptReport => ({ completion: { turn: turn(), voiceId: "fake", completedAt: 100 }, key: requestKey() });
const drain = (): Promise<void> => new Promise(resolve => setImmediate(resolve));
/** The voice slot (`saved`), the fake custody records by key, and the audio start. */
interface Held { saved: unknown; records: Record<string, ReportCustody>; lock: CustodyLock; start?: AudioStart | null }
function fixture(seed: { saved?: unknown; records?: Record<string, ReportCustody> } = {}, shared?: Held, playedTokenLimit?: number) {
  const calls: { text: string; voiceId: string; end(): void; error(): void; canceled: boolean }[] = [];
  /** The completion of each signing under custody. */
  const signed: Completion[] = [];
  const submitted: string[] = [];
  const reconciled: string[] = [];
  let lockTail = Promise.resolve();
  let nextLockGate: { entered():void; grant:Promise<void>; afterWork?():void } | null = null;
  const holdNextLock = (afterWork?:()=>void) => {
    let entered!:()=>void, release!:()=>void;
    const requested=new Promise<void>(resolve=>{entered=resolve;});
    const grant=new Promise<void>(resolve=>{release=resolve;});
    nextLockGate={entered,grant,...(afterWork?{afterWork}:{})};
    return{requested,release};
  };
  const audioOrder:string[]=[];
  const lock: CustodyLock = { run<T>(work: () => Promise<T>): Promise<T> {
    const gate=nextLockGate;nextLockGate=null;
    const run = gate ? lockTail.then(async()=>{
      gate.entered();await gate.grant;
      const value=await work();gate.afterWork?.();return value;
    }) : lockTail.then(work);
    lockTail = run.then(() => undefined, () => undefined);
    return run;
  } };
  const custody: Held = shared ?? { saved: seed.saved ?? null, records: seed.records ?? {}, lock };
  let result: ReportOutcome = { status: "recorded" };
  let failSave = false, failArchive = false;
  let owned = true;
  let clock = 100;
  let saveWait:Promise<void>|null=null,failStart=false,wrongStartRead=false;
  let duringSubmit: (() => void) | null = null;
  let duringReconcile: (() => void) | null = null;
  let roomReserved = true, obsolete = false;
  let audioObsoleteTurn:string|null=null;
  const archives: PendingReport[] = [];
  let retainRefusalProof = true;
  let refreshObservation: (() => void) | null = null;
  /** The slot as the store loads it: the kept report, with the outcome and the custody view of its key. */
  const load = (): PendingReport | null => {
    if (custody.saved === null) return null;
    const kept = custody.saved as KeptReport, held = custody.records[kept.key];
    return structuredClone({ ...kept, outcome: held?.phase === "refused" ? "refused" : "unknown", ...(held ? { custody: held } : {}) }) as PendingReport;
  };
  /** The phase that the scripted result leaves on a record that was sent. */
  const answered = (): ReportCustody["phase"] => result.status === "recorded" ? "accepted" : result.status === "refused" && retainRefusalProof ? "refused" : "unknown";
  const send = (key: string): void => {
    const phase = answered();
    custody.records[key] = { ...custody.records[key]!, phase, ...(phase === "refused" ? { reason: "revision-moved" } : {}) };
    if (phase !== "refused") delete (custody.records[key] as { reason?: string }).reason;
  };
  const speech: SpeechPort = {
    voices: () => [{ id: "fake", name: "Fake voice" }, { id: "second", name: "Second fake" }],
    play(text, voiceId, callbacks) {
      const call = { text, voiceId, ...callbacks, canceled: false };
      calls.push(call);audioOrder.push("play");
      return () => { call.canceled = true; call.end(); call.error(); };
    },
  };
  const controller = createVoiceController({ identity, speech, lock: custody.lock, now: () => clock,
    ...(playedTokenLimit === undefined ? {} : { playedTokenLimit }),
    current: () => owned,
    store: {
      load: async () => load(),
      loadStart:async()=>{if(custody.start)audioOrder.push("marker-readback");return custody.start&&wrongStartRead?{...custody.start,audioId:"x".repeat(22)}:custody.start??null;},
      saveStart:async marker=>{if(failStart)throw new Error("FAKE start save failed");assert.equal(custody.saved,null);assert.equal(custody.start??null,null);custody.start=structuredClone(marker);audioOrder.push("marker-saved");},
      archiveStart:async marker=>{assert.equal(JSON.stringify(marker.turn),audioObsoleteTurn);assert.deepEqual(custody.start,marker);custody.start=null;},
      save: async p => {if(saveWait)await saveWait; if (failSave) throw new Error("fake private storage failure");
        assert.equal(custody.records[p.key], undefined, "the slot names its key before anything is signed"); custody.saved = structuredClone(keptReport(p)); custody.start=null; },
      clear: async () => { custody.saved = null; },
      archive: async (p,confirmed) => { const held = load()!; assert.equal(terminalReport(held,confirmed),true); if(failArchive)throw new Error("FAKE archive quota full");
        assert.deepEqual(custody.saved,keptReport(p)); archives.push(held); custody.saved=null; },
    },
    reporter: {
      submit: async (report, correcting) => custody.lock.run(async () => {
        assert.equal((custody.saved as KeptReport | null)?.key, report.key, "the slot is saved before signing");
        const held = custody.records[report.key];
        assert.ok(!held || correcting && held.phase === "refused", "a key is signed again only to correct a refusal");
        signed.push(report.completion); submitted.push(report.key);
        custody.records[report.key] = { phase: "unknown", signings: (held?.signings ?? 0) + 1, envelopes: (held?.envelopes ?? 0) + 1 };
        duringSubmit?.(); send(report.key); return{...result,custody:load()!};
      }),
      resumeReady: p => unsentReport(p),
      resume: async report => custody.lock.run(async()=>{
        const held = custody.records[report.key];
        if (!held) { signed.push(report.completion); custody.records[report.key] = { phase: "prepared", signings: 1, envelopes: 1 }; }
        submitted.push(report.key); send(report.key); return{...result,custody:load()!};
      }),
      reconcile: async report => custody.lock.run(async () => {
        reconciled.push(report.key); duringReconcile?.();
        const held = custody.records[report.key];
        if (held && ["sent", "unknown"].includes(held.phase) && result.status === "recorded") custody.records[report.key] = { ...held, phase: "accepted" };
        return{...result,custody:load()!};
      }),
      obsolete: () => obsolete,
      audioObsolete:marker=>JSON.stringify(marker.turn)===audioObsoleteTurn,
      correctionReady: p => roomReserved && correctionRoom(p),
      refresh: async () => { refreshObservation?.(); },
    },
  });
  const observe = (t: TurnToken = turn()) => controller.observe({ fresh: true, authorized: true, turn: t });
  return { controller, observe, calls, signed, submitted, reconciled, custody, archives, holdNextLock, audioOrder, loaded: load,
    record: () => custody.records[(custody.saved as KeptReport).key],
    result: (r: ReportOutcome) => { result = r; }, saveFails: () => { failSave = true; }, archiveFails: () => { failArchive=true; },
    loseView: () => { owned = false; }, time: (n: number) => { clock = n; },
    waitSave:(p:Promise<void>)=>{saveWait=p;}, startSaveFails:()=>{failStart=true;}, startReadbackFails:()=>{wrongStartRead=true;},
    duringSubmit: (work: () => void) => { duringSubmit = work; },
    duringReconcile: (work: () => void) => { duringReconcile = work; },
    reserveRoom: (available: boolean) => { roomReserved = available; },
    obsolete: (value:boolean) => { obsolete=value; },
    audioObsolete:()=>{audioObsoleteTurn=custody.start?JSON.stringify(custody.start.turn):null;},
    retainRefusalProof: (retain: boolean) => { retainRefusalProof = retain; },
    refreshObservation: (refresh: () => void) => { refreshObservation = refresh; } };
}

test("Explicit Arm starts local speech once; duplicate end and snapshots cannot replay the same turn", async () => {
  const f = fixture(); await f.controller.ready; f.observe();
  assert.equal(f.calls.length, 0);
  assert.equal(f.controller.arm("missing"), false);
  assert.equal(f.controller.arm("fake"), true); await drain();
  f.controller.arm("fake"); await drain(); f.observe(); await drain(); assert.equal(f.calls.length, 1);
  f.calls[0]!.end(); f.calls[0]!.end(); f.calls[0]!.error(); await drain();
  assert.equal(f.submitted.length, 1); assert.equal(f.signed.length, 1);
  f.observe(); f.controller.arm("fake"); await drain(); assert.equal(f.calls.length, 1);
  assert.equal(f.controller.state().phase, "recorded");
});

test("Arm while paused or waiting retains the selected voice until a fresh own assignment", async () => {
  const f = fixture(); await f.controller.ready;
  f.controller.observe({ fresh: true, authorized: true });
  assert.equal(f.controller.arm("fake"), true); await drain(); assert.equal(f.calls.length, 0);
  f.controller.observe({ fresh: true, authorized: true }); assert.equal(f.calls.length, 0);
  f.observe(); await drain(); assert.equal(f.calls.length, 1);
});

test("Pause fences callbacks and retains uncertain audio until native resolution and a new explicit arm", async () => {
  const f = fixture(); await f.controller.ready; f.observe(); f.controller.arm("fake"); await drain();
  f.controller.invalidate(); assert.equal(f.calls[0]!.canceled, true);
  f.calls[0]!.end(); await drain(); assert.equal(f.submitted.length, 0);
  f.observe(turn({ serial: 2 })); await drain(); assert.equal(f.calls.length, 1);
  assert.ok(f.custody.start);f.audioObsolete();await f.controller.checkPending();assert.equal(f.custody.start,null);f.controller.arm("fake");await drain();assert.equal(f.calls.length,2);
  f.calls[0]!.end(); assert.equal(f.submitted.length, 0);
  f.calls[1]!.end(); await drain(); f.observe(turn({ serial: 3, N: 2 })); await drain();
  assert.deepEqual(f.calls.map(c => c.text), ["1", "1", "2"]);
  f.controller.disarm(); f.observe(turn({ serial: 4, N: 3 })); assert.equal(f.calls.length, 3);
});

test("Complete context binding rejects key, full scope, membership, deployment, member, definition and origin changes", async () => {
  const wrong: Partial<TurnToken>[] = [
    { publicKey: "key_other" }, { scope: { ...scope, genesis: `sha256:${"f".repeat(64)}` } },
    { scope: { ...scope, scope: membership.scope } }, { membership: { ...membership, genesis: `sha256:${"f".repeat(64)}` } },
    { deployment: "another-deployment" }, { member: { membership, member: "@bob" } },
    { definition: "sha256:other" }, { origin: "https://other.invalid" },
  ];
  for (const change of wrong) {
    const f = fixture(); await f.controller.ready; f.observe(); f.controller.arm("fake"); await drain();
    f.observe(turn(change)); f.calls[0]!.end(); await drain();
    assert.equal(f.calls[0]!.canceled, true); assert.equal(f.submitted.length, 0);
    assert.equal(f.controller.state().armed, false);
  }
});

test("Reset generation, serial and N changes fence late callbacks without replaying uncertain audio", async () => {
  for (const changed of [{ generation: 1 }, { serial: 2 }, { N: 2 }]) {
    const f = fixture(); await f.controller.ready; f.observe(); f.controller.arm("fake"); await drain();
    f.observe(turn(changed)); f.calls[0]!.end(); f.calls[0]!.error(); await drain();
    assert.equal(f.calls[0]!.canceled, true); assert.equal(f.submitted.length, 0);
    assert.equal(f.calls.length, 1);assert.ok(f.custody.start);
  }
});

test("Ordinary refresh holds a completion until a fresh exact token; forbidden or expired turns cancel it", async () => {
  const f = fixture(); await f.controller.ready; f.observe(); f.controller.arm("fake"); await drain();
  f.controller.observe({ fresh: false, authorized: true }); f.calls[0]!.end(); await drain();
  assert.equal(f.signed.length, 0); assert.equal(f.controller.state().phase, "completed");
  f.observe(); await drain(); assert.equal(f.submitted.length, 1);
  for (const forbidden of [true, false]) {
    const g = fixture(); await g.controller.ready; g.observe(); g.controller.arm("fake"); await drain();
    if (forbidden) g.controller.observe({ fresh: false, authorized: false });
    else { g.time(10_000); g.observe(); }
    g.calls[0]!.end(); await drain(); assert.equal(g.submitted.length, 0); assert.equal(g.calls[0]!.canceled, true);
  }
});

test("Private persistence failure signs and sends nothing", async () => {
  const f = fixture(); await f.controller.ready; f.observe(); f.controller.arm("fake"); await drain(); f.saveFails();
  f.calls[0]!.end(); await drain();
  assert.equal(f.signed.length, 0); assert.equal(f.submitted.length, 0);
  assert.equal(f.custody.saved, null); assert.equal(f.controller.state().phase, "blocked");
});

test("Unknown retains the slot and its custody key, fences signatures and playback, and observations cannot settle it", async () => {
  const f = fixture(); f.result({ status: "unknown" }); await f.controller.ready; f.observe(); f.controller.arm("fake"); await drain();
  f.calls[0]!.end(); await drain(); const exact = JSON.stringify(f.custody.saved), key = (f.custody.saved as KeptReport).key;
  f.observe(turn({ serial: 2, N: 2 })); f.controller.arm("fake"); await drain(); await f.controller.correctReport();
  await f.controller.checkPending();
  assert.equal(f.calls.length, 1); assert.equal(f.signed.length, 1); assert.equal(f.submitted.length, 1);
  assert.deepEqual(f.reconciled, [key]); assert.equal(JSON.stringify(f.custody.saved), exact);
  assert.deepEqual(f.record(), { phase: "unknown", signings: 1, envelopes: 1 });
  f.result({ status: "recorded" }); await f.controller.checkPending(); assert.equal(f.custody.saved, null);
});

test("Known refusal signs a corrected successor under the same key and completion without speech replay", async () => {
  const f = fixture(); f.result({ status: "refused", reason: "fake native refusal" }); await f.controller.ready;
  f.observe(); f.controller.arm("fake"); await drain(); f.calls[0]!.end(); await drain();
  const original = structuredClone(f.custody.saved); assert.equal(f.loaded()?.outcome, "refused");
  assert.deepEqual(f.record(), { phase: "refused", signings: 1, envelopes: 1, reason: "revision-moved" });
  await f.controller.correctReport(); assert.equal(f.signed.length, 1, "the pre-POST observation cannot authorize a correction");
  f.controller.observe({ fresh: false, authorized: true }); await f.controller.correctReport(); assert.equal(f.signed.length, 1);
  f.observe(); f.result({ status: "unknown" }); await f.controller.correctReport();
  assert.deepEqual(f.signed[1], f.signed[0]); assert.equal(f.calls.length, 1); assert.equal(f.submitted.length, 2);
  assert.deepEqual(f.custody.saved, original, "the correction keeps the slot and its key");
  assert.deepEqual(f.record(), { phase: "unknown", signings: 2, envelopes: 2 }, "the custody-owned unknown phase survives controller settlement");
});

test("Loaded pending custody must match the complete context and blocks replay after restart", async () => {
  const saved = slot(), records = { [saved.key]: { phase: "unknown" as const, signings: 1, envelopes: 1 } };
  const f = fixture({ saved, records }); await f.controller.ready; f.observe(); f.controller.arm("fake"); await drain();
  assert.equal(f.calls.length, 0); assert.equal(f.signed.length, 0);
  const wrong = fixture({ saved: { ...saved, completion: { ...saved.completion, turn: turn({ deployment: "other" }) } }, records });
  await wrong.controller.ready; wrong.observe(); assert.equal(wrong.controller.arm("fake"), false);
  await wrong.controller.checkPending(); assert.equal(wrong.reconciled.length, 0); assert.equal((wrong.custody.saved as KeptReport).key, saved.key);
  // A slot whose key custody cannot hold is malformed: nothing reads, signs or plays.
  const wrongKey = fixture({ saved: { ...saved, key: "" } }); await wrongKey.controller.ready; wrongKey.observe();
  await wrongKey.controller.checkPending(); await wrongKey.controller.resumePending();
  assert.deepEqual([wrongKey.reconciled.length, wrongKey.submitted.length, wrongKey.calls.length], [0, 0, 0]);
  assert.equal(wrongKey.controller.state().phase, "blocked");
});

test("An old controller cannot paint, sign, or report after losing the shared view", async () => {
  const f = fixture(); await f.controller.ready; f.observe(); const painted: string[] = [];
  f.controller.subscribe(s => painted.push(s.phase)); f.controller.arm("fake"); await drain(); const count = painted.length;
  f.loseView(); f.calls[0]!.end(); f.calls[0]!.error(); f.controller.invalidate(); f.observe(); await drain();
  assert.equal(painted.length, count); assert.equal(f.signed.length, 0); assert.equal(f.submitted.length, 0);
  f.controller.dispose(); assert.equal(f.calls[0]!.canceled, true);
});

test("A fresh next own assignment arriving during submit or reconciliation starts after custody work releases busy", async () => {
  for (const boundary of ["submit", "reconcile"] as const) {
    const f = fixture(); await f.controller.ready; f.observe(); f.controller.arm("fake"); await drain();
    const publishNext = () => {
      f.observe(turn({ serial: 2, N: 2 }));
      assert.equal(f.calls.length, 1, "pending report fences playback while the operation is busy");
    };
    if (boundary === "submit") f.duringSubmit(publishNext);
    else f.result({ status: "unknown" });
    f.calls[0]!.end(); await drain();
    if (boundary === "reconcile") {
      f.duringReconcile(publishNext); f.result({ status: "recorded" }); await f.controller.checkPending(); await drain();
    }
    assert.deepEqual(f.calls.map(c => c.text), ["1", "2"]);
    assert.equal(f.signed.length, 1, "the second speech has not completed or been reported");
  }
});

// Actual controller and retained report transitions; Reporter, custody and
// speech remain the fixture's labelled stand-ins, with no native/audio proof.
test("Verified fulfillment archive keeps the selected voice armed for a fresh next pledge without replaying the completed token", async () => {
  const f=fixture();await f.controller.ready;f.observe();
  assert.equal(f.controller.arm("second"),true);await drain();
  assert.equal(f.calls.length,1);const firstStart=structuredClone(f.custody.start);
  f.duringSubmit(()=>{
    // The scripted native observation has advanced while the verified reply
    // is still in flight. Archiving must not end this explicit local Join.
    f.obsolete(true);f.controller.observe({fresh:true,authorized:true});
  });
  f.calls[0]!.end();await drain();
  assert.equal(f.archives.length,1);const archived=f.archives[0]!;
  assert.equal(archived.custody?.phase,"accepted");
  assert.equal(terminalReport(archived,true),true);
  assert.deepEqual(archived.audioStart,firstStart);assert.equal(archived.key,f.submitted[0]);
  assert.equal(f.custody.saved,null);assert.equal(f.controller.state().armed,true);
  assert.equal(f.controller.state().voiceId,"second");assert.equal(f.calls.length,1);
  f.observe();await drain();assert.equal(f.calls.length,1,"the completed token remains in played-turn memory");
  const next=turn({serial:2,N:2});f.observe(next);await drain();
  f.observe(next);f.calls[0]!.end();f.calls[0]!.error();await drain();
  assert.deepEqual(f.calls.map(call=>[call.text,call.voiceId]),[["1","second"],["2","second"]]);
  assert.deepEqual([f.signed.length,f.submitted.length],[1,1],"late old callbacks cannot complete the next pledge");
  f.controller.dispose();
});

test("The played-token ceiling disarms new speech without discarding unresolved exact custody", async () => {
  const f = fixture({}, undefined, 2); await f.controller.ready; f.observe(); f.controller.arm("fake"); await drain();
  f.calls[0]!.end(); await drain(); f.observe(turn({ generation: 1, serial: 1 })); await drain();
  f.result({ status: "unknown" }); f.calls[1]!.end(); await drain();
  const exact = JSON.stringify(f.loaded());
  f.observe(turn({ generation: 2, serial: 1 })); await f.controller.checkPending();
  assert.equal(f.calls.length, 2); assert.equal(f.signed.length, 2);
  assert.equal(JSON.stringify(f.loaded()), exact, "capacity cannot drop an unknown attempt");
  f.result({ status: "recorded" }); await f.controller.checkPending();
  assert.equal(f.controller.state().phase, "blocked"); assert.equal(f.controller.state().armed, false);
  assert.equal(f.controller.arm("fake"), false); assert.equal(f.calls.length, 2);
});

test("Eight refused envelopes fill the record and prevent a ninth signature or speech replay", async () => {
  const f = fixture(); f.result({ status: "refused" }); await f.controller.ready;
  f.observe(); f.controller.arm("fake"); await drain(); f.calls[0]!.end(); await drain();
  const original = structuredClone(f.custody.saved);
  for (let attempt = 2; attempt <= 8; attempt++) {
    f.observe(); assert.equal(f.controller.state().correctionReady, true);
    await f.controller.correctReport();
  }
  const retained = JSON.stringify(f.loaded());
  f.observe(); assert.equal(f.controller.state().correctionReady, false);
  await f.controller.correctReport();
  assert.equal(f.signed.length, 8); assert.equal(f.submitted.length, 8); assert.equal(f.calls.length, 1);
  assert.deepEqual(f.record(), { phase: "refused", signings: 8, envelopes: 8, reason: "revision-moved" });
  assert.deepEqual(f.custody.saved, original);
  assert.equal(JSON.stringify(f.loaded()), retained);
});

test("Unavailable correction room blocks signing until room returns", async () => {
  const f = fixture(); f.result({ status: "refused" }); await f.controller.ready;
  f.observe(); f.controller.arm("fake"); await drain(); f.calls[0]!.end(); await drain();
  const retained = JSON.stringify(f.loaded());
  f.reserveRoom(false); f.observe(); assert.equal(f.controller.state().correctionReady, false);
  await f.controller.correctReport(); assert.equal(f.signed.length, 1);
  assert.equal(JSON.stringify(f.loaded()), retained); assert.equal(f.calls.length, 1);
  f.reserveRoom(true); f.observe(); assert.equal(f.controller.state().correctionReady, true);
  await f.controller.correctReport(); assert.equal(f.signed.length, 2); assert.equal(f.calls.length, 1);
});

test("A returned refused enum without a kept refusal and a retired slot shape stay unresolved", async () => {
  const f = fixture(); f.result({ status: "refused" }); f.retainRefusalProof(false);
  await f.controller.ready; f.observe(); f.controller.arm("fake"); await drain(); f.calls[0]!.end(); await drain();
  f.observe(); assert.equal(f.controller.state().pending, "unknown"); assert.equal(f.controller.state().correctionReady, false);
  await f.controller.correctReport(); assert.equal(f.signed.length, 1);
  // The retired journal slot named its envelope and outcome in the slot. The controller blocks it and signs nothing.
  const legacy = fixture({ saved: { completion: { turn: turn(), voiceId: "fake", completedAt: 100 }, envelope: {}, outcome: "refused" } });
  legacy.result({ status: "refused" }); await legacy.controller.ready; legacy.observe();
  await legacy.controller.checkPending(); await legacy.controller.correctReport();
  assert.equal(legacy.controller.state().pending, "unknown"); assert.equal(legacy.controller.state().correctionReady, false);
  assert.deepEqual([legacy.signed.length, legacy.reconciled.length, legacy.calls.length], [0, 0, 0]);
});

test("Refusal refresh runs after stale fencing even when CURRENT arrived before the reporter returned", async () => {
  const f = fixture(); f.result({ status: "refused" }); await f.controller.ready;
  let refreshes = 0;
  f.duringSubmit(() => f.observe());
  f.refreshObservation(() => { refreshes++; f.observe(); });
  f.observe(); f.controller.arm("fake"); await drain(); f.calls[0]!.end(); await drain();
  assert.equal(refreshes, 1); assert.equal(f.controller.state().correctionReady, true);
  f.result({ status: "unknown" }); await f.controller.correctReport();
  assert.equal(f.signed.length, 2); assert.equal(f.calls.length, 1);
});

test("A same-key handoff cannot reparent the report to another retained completion", async () => {
  const f = fixture(); await f.controller.ready; f.observe(); f.controller.arm("fake"); await drain();
  let submittedKey: string | null = null;
  f.duringSubmit(() => {
    const saved = f.custody.saved as KeptReport;
    submittedKey = saved.key;
    f.custody.saved = { ...saved, completion: { ...saved.completion,
      turn: { ...saved.completion.turn, generation: 1, serial: 2, N: 2 },
      voiceId: "second", completedAt: saved.completion.completedAt + 1 } };
  });
  f.calls[0]!.end(); await drain();
  assert.equal((f.custody.saved as KeptReport).key, submittedKey);
  assert.equal(f.controller.state().phase, "blocked");
  assert.ok(f.custody.saved, "the returned recorded enum cannot clear reparented custody");
  f.observe(turn({ generation: 1, serial: 2, N: 2 }));
  await f.controller.correctReport(); await f.controller.checkPending();
  assert.equal(f.signed.length, 1); assert.equal(f.calls.length, 1); assert.equal(f.reconciled.length, 0);
});

// The whole resolved history must remain intact; a stale turn is never corrected onto its successor.
test("Obsolete known refusal archives intact, while an active unknown record fences archive", async () => {
  const f=fixture();f.result({status:"refused"});await f.controller.ready;f.observe();f.controller.arm("fake"); await drain();f.calls[0]!.end();await drain();
  const original=f.loaded()!;
  f.obsolete(true);f.observe(turn({generation:1,serial:2,N:2}));await drain();
  assert.equal(terminalReport(original),true);assert.deepEqual(f.archives,[original]);assert.equal(f.custody.saved,null);assert.equal(f.calls.length,1);assert.equal(f.controller.state().armed,false);assert.equal(f.signed.length,1);
  const g=fixture();g.result({status:"unknown"});await g.controller.ready;g.observe();g.controller.arm("fake"); await drain();g.calls[0]!.end();await drain();
  const unknown=g.loaded()!;
  assert.equal(terminalReport(unknown),false);
  g.obsolete(true);g.observe(turn({generation:1,serial:2,N:2}));await drain();await g.controller.checkPending();
  assert.equal(g.archives.length,0);assert.deepEqual(g.loaded(),unknown);assert.equal(g.calls.length,1);assert.equal(g.signed.length,1);assert.notEqual(g.controller.state().pending,"refused");
});

test("Malformed restored custody never becomes a known terminal UI classification", async () => {
  const malformed = { ...slot(), custody: { phase: "refused", signings: 1, envelopes: 1, reason: "revision-moved", proof: "not a custody field" } };
  const restored=fixture({ saved: malformed });await restored.controller.ready;
  const diagnostic=restored.controller.state().message;assert.equal(restored.controller.state().phase,"blocked");
  restored.controller.observe({fresh:false,authorized:true});restored.controller.observe({fresh:true,authorized:true});restored.controller.invalidate();restored.controller.disarm();
  await restored.controller.checkPending();await restored.controller.correctReport();await restored.controller.resumePending();
  assert.equal(restored.controller.state().message,diagnostic);assert.equal(restored.controller.state().resumeReady,false);assert.deepEqual([restored.calls.length,restored.signed.length,restored.submitted.length],[0,0,0]);
  assert.equal(restored.controller.state().phase,"blocked");assert.equal(restored.controller.state().pending,"unknown");assert.equal(restored.controller.state().correctionReady,false);assert.equal(restored.reconciled.length,0);assert.deepEqual(restored.custody.saved,malformed);
});

test("Archive quota failure preserves intact terminal custody and does not unblock new speech",async()=>{
  const f=fixture();f.result({status:"refused"});await f.controller.ready;f.observe();f.controller.arm("fake"); await drain();f.calls[0]!.end();await drain();
  const original=f.loaded();f.archiveFails();f.obsolete(true);f.observe(turn({generation:1,serial:2,N:2}));await drain();
  assert.deepEqual(f.loaded(),original);assert.equal(f.archives.length,0);assert.equal(f.controller.state().phase,"blocked");assert.equal(f.controller.arm("fake"),false);assert.deepEqual([f.calls.length,f.signed.length,f.submitted.length],[1,1,1]);
});

test("Restored accepted phase without receipt confirmation remains unresolved and cannot clear or archive",async()=>{
  const saved=slot(),f=fixture({saved,records:{[saved.key]:{phase:"accepted",signings:1,envelopes:1}}});
  const before=f.loaded();
  f.result({status:"unknown"});await f.controller.ready;f.obsolete(true);f.observe(turn({generation:1,serial:2,N:2}));await drain();await f.controller.checkPending();
  assert.deepEqual(f.custody.saved,saved);assert.equal(f.archives.length,0);assert.equal(f.controller.state().pending,"unknown");assert.equal(f.calls.length,0);assert.equal(f.signed.length,0);
  f.result({status:"recorded"});await f.controller.checkPending();assert.equal(f.custody.saved,null);assert.deepEqual(f.archives,[before]);
});

test("Check is read-only; explicit Resume sends only the kept prepared original without signing or speech",async()=>{
  const saved=slot(),f=fixture({saved,records:{[saved.key]:{phase:"prepared",signings:1,envelopes:1}}});
  f.result({status:"unknown"});await f.controller.ready;f.observe();await f.controller.checkPending();
  assert.deepEqual(f.reconciled,[saved.key]);assert.deepEqual(f.submitted,[]);assert.equal(f.controller.state().resumeReady,true);
  await f.controller.resumePending();
  assert.deepEqual(f.submitted,[saved.key]);assert.equal(f.signed.length,0);assert.equal(f.calls.length,0);assert.equal(f.record()?.phase,"unknown");
  await f.controller.resumePending();assert.equal(f.submitted.length,1);
});


test("Durable audio start is retained before speech and an interrupted restart cannot replay it",async()=>{
  const f=fixture();await f.controller.ready;f.observe();f.controller.arm("fake");
  assert.equal(f.calls.length,0,"speech waits for committed marker/readback");await drain();
  assert.equal(f.calls.length,1);assert.ok(f.custody.start);assert.equal(f.custody.saved,null);
  const original=structuredClone(f.custody.start);f.controller.dispose();
  const restored=fixture({},f.custody);await restored.controller.ready;restored.observe();
  assert.equal(restored.controller.arm("fake"),false,"a retained audio start must block rearming after restart");await restored.controller.checkPending();
  assert.deepEqual(restored.custody.start,original);assert.deepEqual([restored.calls.length,restored.signed.length,restored.submitted.length],[0,0,0]);
  restored.audioObsolete();restored.observe(turn({serial:2}));await restored.controller.checkPending();
  assert.equal(restored.custody.start,null);assert.equal(restored.controller.state().armed,false);
  assert.equal(restored.controller.arm("fake"),true);await drain();assert.equal(restored.calls.length,1);
});


test("Disposal during the speaking notice retains the start without invoking playback",async()=>{
  const f=fixture();await f.controller.ready;f.observe();
  f.controller.subscribe(state=>{if(state.phase==="speaking")f.controller.dispose();});
  assert.equal(f.controller.arm("fake"),true);await drain();
  assert.equal(f.controller.state().phase,"disposed");
  assert.ok(f.custody.start,"the committed audio start remains uncertain after disposal");
  assert.deepEqual([f.calls.length,f.signed.length,f.submitted.length],[0,0,0]);
  const original=structuredClone(f.custody.start),restored=fixture({},f.custody);
  await restored.controller.ready;restored.observe();
  assert.equal(restored.controller.arm("fake"),false,"a retained audio start must block rearming after restart");
  assert.deepEqual(restored.custody.start,original);
});

test("Audio start failure and mismatched readback block sound; voice switch retains uncertainty; a slot saved during invalidation stays unsigned and checkable",async()=>{
  for(const failure of ["save","readback"] as const){const f=fixture();await f.controller.ready;f.observe();if(failure==="save")f.startSaveFails();else f.startReadbackFails();f.controller.arm("fake");await drain();assert.deepEqual([f.calls.length,f.signed.length,f.submitted.length],[0,0,0]);assert.equal(f.controller.state().phase,"blocked");}
  const changed=fixture();await changed.controller.ready;changed.observe();changed.controller.arm("fake");await drain();const start=structuredClone(changed.custody.start);
  assert.equal(changed.controller.arm("second"),false);assert.equal(changed.calls[0]!.canceled,true);assert.deepEqual(changed.custody.start,start);assert.equal(changed.controller.state().audioUncertain,true);assert.equal(changed.calls.length,1);
  // Invalidation while the slot is being saved: the slot keeps the completion and its key, and nothing is signed.
  const f=fixture();let release!:()=>void;f.waitSave(new Promise<void>(resolve=>{release=resolve;}));f.result({status:"unknown"});await f.controller.ready;f.observe();f.controller.arm("fake");await drain();f.calls[0]!.end();await drain();assert.equal(f.signed.length,0);assert.ok(f.custody.start);
  f.controller.invalidate();f.observe();release();await drain();assert.ok(f.custody.saved);assert.equal(f.custody.start,null);assert.equal(f.controller.state().pending,"unknown");assert.equal(f.controller.state().audioUncertain,undefined);assert.equal(f.submitted.length,0);
  const exact=structuredClone(f.custody.saved) as KeptReport;await f.controller.checkPending();assert.deepEqual(f.reconciled,[exact.key]);assert.deepEqual(f.custody.saved,exact);assert.deepEqual([f.calls.length,f.signed.length,f.submitted.length],[1,0,0]);
  assert.equal(f.controller.state().resumeReady,true,"a slot with no record is definitely unsent");
});


// Fake lock/store/speech only: no native scope, actual browser media or provider.
test("A stale pre-audio lock grant releases an unsent pledge; a fresh notice while busy starts it once after release",async()=>{
  const f=fixture();await f.controller.ready;
  const gate=f.holdNextLock(()=>{
    assert.equal(f.custody.start??null,null);
    assert.deepEqual([f.calls.length,f.signed.length,f.submitted.length],[0,0,0],"stale locked work has no custody/media/report effect");
    f.observe();
    assert.equal(f.calls.length,0,"fresh notice cannot start while the original lock remains busy");
  });
  f.observe();assert.equal(f.controller.arm("fake"),true);
  await gate.requested;assert.equal(f.custody.start??null,null);assert.equal(f.calls.length,0);
  f.controller.observe({fresh:false,authorized:true});gate.release();await drain();
  assert.ok(f.custody.start,"fresh exact never-played pledge recovers after a pre-write stale return");
  assert.equal(validAudioStart(f.custody.start,identity),true);
  assert.deepEqual(f.custody.start.turn,turn());
  assert.deepEqual(f.audioOrder,["marker-saved","marker-readback","play"]);
  assert.deepEqual(f.calls.map(c=>[c.text,c.voiceId]),[["1","fake"]]);
  assert.deepEqual([f.signed.length,f.submitted.length,f.reconciled.length],[0,0,0]);
  f.observe();f.observe();await drain();
  assert.deepEqual(f.audioOrder,["marker-saved","marker-readback","play"],"persisted audio is never replayed by duplicate notices");
  assert.equal(f.controller.state().phase,"speaking");f.controller.dispose();
});
