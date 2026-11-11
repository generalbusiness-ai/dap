# Exact7177 source excerpts

These excerpts support a source argument. No implementation or validation ran.

## packages/scope/src/reads.ts:117–148

```text
117:       if (!this.#signed) return no("forbidden");
118:       // A read that a signed read cannot name has no argument here, and no request names it: it is refused by the check.
119:       const checked = checkSignedRead(this.#signed.observe ? { ...this.#signed, phase: read === "summary" ? "final-summary" : "final-read" } : this.#signed, this.#store, reader as string, read, arg ?? "");
120:       if (!("key" in checked)) return no(checked.refused === false ? "forbidden" : checked.refused);
121:       limit = checked;
122:     } else {
123:       const allowed = this.#readers.allows(reader, read);
124:       if (allowed !== true) {
125:         const chained = allowed === false ? (this.#readers.chained?.(reader, read) ?? false) : allowed;
126:         if (typeof chained !== "object") return no(chained === false ? "forbidden" : chained);
127:         const claim = this.#signed?.chains?.claimOf(chained.membership.scope) ?? null;
128:         if (claim === null) return no("forbidden");
129:         // Lead ca8ad1cf: a created membership's authenticated session reads
130:         // the whole register history, without the signed-entry window.
131:         limit = { whole: true };
132:       }
133:     }
134:     const scope = this.#store.scope();
135:     const pinned = this.#pinned();
136:     return scope && pinned ? { scope, pinned, limit } : no("not-found");
137:   }
138:   /**
139:    * Whether a reader with that limit may have this stored entry: every reader but a limited one; a limited one, the genesis, and a
140:    * signed read's key its own entries and those whose chain leads to one of them at `since` or later; a session at a register, the
141:    * whole history. An entry whose root is not found yet is no causally limited reader's.
142:    */
143:   #mine(limit: Limit | null, row: Stored): boolean {
144:     if (limit === null || limit.whole) return true;
145:     const entry = JSON.parse(row.bytes) as Entry;
146:     const root = this.#signed?.chains?.at(row.seq);
147:     if ("key" in limit) return (limit.scoped && (row.seq === 0 || signerOf(entry) === limit.key)) || leads(root, limit.key, limit.since);
148:     return false;
```

## packages/scope/src/reads.ts:225–240

```text
225:   summary(reader: unknown): Read<Summary> {
226:     const open = this.#defined(reader, "summary", "summary");
227:     if (!("scope" in open)) return open;
228:     const { scope, pinned, definition } = open;
229:     const items: Item[] = [];
230:     const counts: [string, string, number][] = [];
231:     let complete = true;
232:     for (const [name, type] of Object.entries(definition.declared.items).sort(([a], [b]) => byteOrder(a, b))) {
233:       const states = Object.keys(type.states).sort(byteOrder);
234:       for (const state of states) counts.push([name, state, this.#store.count(name, state)]);
235:       const live = this.#store.page(name, states.filter((s) => !own(type.states, s)!.final), null, type.max);
236:       items.push(...live.items);
237:       if (live.more) complete = false;
238:     }
239:     items.sort((a, b) => a.id - b.id);
240:     // Projection only: no timed judgment, write, alarm or provider call.
```

## packages/scope/src/reads.ts:253–254

```text
253:     }
254:     return { ok: true, at: scope.head, value: { scope: scope.at, status: scope.status, definition: pinned.named, time: scope.time, items, counts, ...(reservationExpiry === undefined ? {} : { reservationExpiry }) }, complete };
```

## packages/scope/src/reads.ts:282–292

```text
282:   /** A page of the history from the entry the cursor names, or from the genesis: at most the bound's entries and bytes, and at least one entry. */
283:   history(reader: unknown, cursor?: Cursor): Read<readonly Sealed[]> {
284:     const open = this.#open(reader, "history", cursor ?? "0");
285:     if (!("scope" in open)) return open;
286:     if (open.limit && "key" in open.limit && !open.limit.scoped && !this.#signed?.chains?.has(open.limit.key, open.limit.since)) return no("forbidden");
287:     const from = position(cursor, 0);
288:     if (from === undefined || from === null) return no("not-found");
289:     const floor = this.#store.floor?.();
290:     if (floor && from < floor.floor) return { ok: false, reason: "archived", archived: { floor: floor.floor, ...floor.receipt }, next: String(floor.floor) };
291:     const { rows, more } = this.#page(from);
292:     return { ok: true, at: open.scope.head, value: rows.filter((row) => this.#mine(open.limit, row)).map((row) => ({ entry: JSON.parse(row.bytes) as Entry, hash: row.hash })), complete: !more, ...(more ? { next: String(from + rows.length) } : {}) };
```

## packages/scope/src/reads.ts:335–345

```text
335:   entry(reader: unknown, seq: number): Read<Sealed> {
336:     const open = this.#open(reader, "entry", String(seq));
337:     if (!("scope" in open)) return open;
338:     const archived = archivedPosition(this.#store, seq);
339:     if (archived) return { ok: false, reason: "archived", archived };
340:     const row = Number.isSafeInteger(seq) ? this.#store.stored(seq) : null;
341:     if (!row) return no(open.limit && "key" in open.limit && !open.limit.scoped ? "forbidden" : "not-found");
342:     if (!this.#mine(open.limit, row)) return no("forbidden");
343:     if (row.size > this.#bounds.entryBytes) return no("too-large");
344:     return { ok: true, at: open.scope.head, value: { entry: JSON.parse(row.bytes) as Entry, hash: row.hash }, complete: true };
345:   }
```

## packages/contract/src/read.ts:16–33

```text
16: /** A minimum journal position in one exact scope incarnation. A full head also requires its recorded hash. */
17: export interface ReadMinimum { readonly at: ScopeRef; readonly head: number | Head }
18: 
19: /** The authorized scope remained below the minimum when its bounded wait ended. */
20: export interface BehindRead { ok: false; reason: "behind"; current: FactRef }
21: 
22: export type Read<T> =
23:   | BehindRead
24:   | { ok: false; reason: "archived"; archived: Archived; fact?: FactRef; next?: Cursor }
25:   | { ok: true; at: { seq: number; hash: Digest }; value: T; complete: boolean; next?: Cursor }
26:   | { ok: false; reason: Exclude<ReadRefusal, "archived" | "behind">; detail?: FactRef | ScopeRef };
27: 
28: /** Settlement of one signed intent: one receipt or `not-found` (section 4.2). */
29: export type Settlement = Read<Receipt> & {
30:   /** Register26 alone projects the state of this exact accepted found. No item values or read permission. */
31:   readonly claim?: { readonly fact: FactRef; readonly state: "pending" | "failed" | "active" };
32: };
33: 
```

## packages/contract/src/read.ts:78–89

```text
78: export interface Summary {
79:   scope: ScopeRef; status: Status; definition: Digest | PlatformDefinition; time: Timestamp;
80:   items: readonly Item[];                                                    // live, by ID
81:   /** Destination@3 write-free expiry at this read's head. `time` is the
82:    * current clock, distinct from the last sealed entry's Summary.time.
83:    * Behind or unavailable clock reports no expired IDs. */
84:   reservationExpiry?: { clock: "available"; time: Timestamp; expired: readonly number[] } | { clock: "unavailable" };
85:   counts: readonly (readonly [type: string, state: string, n: number])[];    // every type and state of the definition, by type, then state
86: }
87: 
88: /** A sealed entry and its hash. The hash is not part of the entry's bytes (section 4.1). */
89: export interface Sealed { entry: Entry; hash: Digest }
```

## packages/client/src/handle.ts:9–14

```text
9:  * **Retrying.** `submit` answers with the scope's `Answer`. When no answer
10:  * could be read, it rejects with `TransportError`: the act may or may not
11:  * have been recorded. After that, and after an `unavailable` answer, the
12:  * caller submits the SAME signed intent again. If the first was accepted,
13:  * the retry returns the same receipt. `settle` returns that receipt at any
14:  * later time, for the exact signed intent.
```

## packages/client/src/handle.ts:42–60

```text
42: /** A receipt keeps its full scope incarnation and exact entry hash. */
43: function minimum(value?: ReadMinimum | Receipt): ReadMinimum | undefined {
44:   if (value === undefined) return undefined;
45:   const checked = readMinimum(isReceipt(value) ? { at: value.fact.at, head: { seq: value.fact.seq, hash: value.fact.hash } } : value);
46:   if (!checked) throw new TransportError("invalid read minimum");
47:   return checked;
48: }
49: 
50: /** A transport cannot silently strip a minimum and return older state. */
51: function reached(at: Head, required?: ReadMinimum): void {
52:   if (!required) return;
53:   const seq = typeof required.head === "number" ? required.head : required.head.seq;
54:   if (at.seq < seq || typeof required.head !== "number" && at.seq === seq && at.hash !== required.head.hash)
55:     throw new TransportError("the reply does not reach the read minimum");
56: }
57: function checkedRead<T>(reply: Read<T>, required?: ReadMinimum): Read<T> {
58:   if (reply.ok) reached(reply.at, required);
59:   return reply;
60: }
```

## packages/client/src/handle.ts:85–94

```text
85:   // The reads of section 9.1. Each is a statement about `at`; a page with `next` is read on with that cursor.
86: 
87:   async summary(atLeast?: ReadMinimum | Receipt): Promise<Read<Summary>> {
88:     const required = minimum(atLeast);
89:     return checkedRead(await this.#transport.summary(this.scope, this.#reader, required), required);
90:   }
91:   /** A page of the retained final items of one type. */
92:   async items(type: string, cursor?: Cursor, atLeast?: ReadMinimum | Receipt): Promise<Read<readonly Item[]>> {
93:     const required = minimum(atLeast);
94:     return checkedRead(await this.#transport.items(this.scope, this.#reader, type, cursor, required), required);
```

## packages/client/src/handle.ts:125–132

```text
125:   async history(cursor?: Cursor, atLeast?: ReadMinimum | Receipt): Promise<Read<readonly Sealed[]>> {
126:     const required = minimum(atLeast);
127:     return checkedRead(await this.#transport.history(this.scope, this.#reader, cursor, required), required);
128:   }
129:   async entry(seq: number, atLeast?: ReadMinimum | Receipt): Promise<Read<Sealed>> {
130:     const required = minimum(atLeast);
131:     return checkedRead(await this.#transport.entry(this.scope, this.#reader, seq, required), required);
132:   }
```

## packages/client/src/intent.ts:57–66

```text
57: }
58: 
59: export interface Signing {
60:   /** The signing time, in milliseconds. The default is the runtime's clock. */
61:   now?: number;
62:   /** How long the intent stays admissible. The default is five minutes. */
63:   lifetimeSeconds?: number;
64:   /** The scope's intent lifetime bound. The default is the contract's proposed bound. */
65:   maxLifetimeSeconds?: number;
66:   /** Only to sign again an intent whose key the caller kept. The default is a fresh key. */
```

## packages/client/src/intent.ts:87–97

```text
87:  */
88: export async function signedIntent(signer: Signer, asked: Asked, signing: Signing = {}): Promise<SignedIntent> {
89:   const bound = signing.maxLifetimeSeconds ?? PROPOSED_BOUNDS.intentLifetimeSeconds;
90:   const lifetime = signing.lifetimeSeconds ?? Math.min(DEFAULT_LIFETIME_SECONDS, bound);
91:   if (!(lifetime > 0 && lifetime <= bound)) throw new RangeError(`an intent lives more than 0 and at most ${bound} seconds`);
92:   const bytes = canonicalBytes({
93:     v: 1, to: asked.to, actor: signer.key, kind: asked.kind, on: asked.on ?? null, expected: asked.expected ?? {}, fields: asked.fields ?? {},
94:     idempotencyKey: signing.idempotencyKey ?? newIdempotencyKey(), notAfter: timestamp((signing.now ?? Date.now()) + lifetime * 1000),
95:   } satisfies Intent);
96:   const intent = parseStrictBytes(bytes) as Intent;
97:   return { intent, sig: await signer.sign(domainBytes(DOMAINS.intent, intent)) };
```

## packages/derive/src/judge.ts:212–229

```text
212:   if (!verifySignedIntent(signed) || !isIntent(signed.intent)) return refused("bad-intent", "not a signed intent");
213:   const intent = signed.intent;
214: 
215:   // Addressing (section 2.1).
216:   if (!intent.to || !same(intent.to, scope.at)) return refused("misaddressed", "to");
217: 
218:   // Section 4.2: the key belongs to the first sealed intent of this actor, for the life of the scope. So the exact retry
219:   // of an accepted intent is answered with its entry at any time, also after its `notAfter`.
220:   const digest = intentDigest(intent);
221:   const earlier = view.accepted(intent.actor, intent.idempotencyKey);
222:   if (earlier) return earlier.intent === digest ? { result: "accepted-before", seq: earlier.seq } : { result: "mismatch", reason: "idempotency-mismatch" };
223: 
224:   // Lifetime (sections 2.1 and 4.2). An intent stops being admissible at its `notAfter`.
225:   const asOf = timeMs(clock.asOf)!;
226:   const notAfter = timeMs(intent.notAfter)!;
227:   if (asOf >= notAfter) return refused("expired", "notAfter");
228:   if (notAfter - asOf > bounds.intentLifetimeSeconds * 1000) return refused("bad-intent", "notAfter is further ahead than an intent may live");
229: 
```

## packages/derive/src/judge.ts:282–307

```text
282:   if (act.step === "open" || act.on === null) {
283:     if (intent.on !== null) return refused("bad-intent", "this act names no item in `on`");
284:   } else {
285:     const item = intent.on === null ? null : view.item(intent.on);
286:     if (item?.type !== act.on) return refused("no-item", `on names no ${act.on}`);
287:     subjects.set("on", item);
288:     if (act.step === "transition") expects.push("on");
289:   }
290:   // An `also` name is unbound when its field is absent, its slot is empty or its type has no item yet. It is then no subject, and
291:   // `expected` has no key for it. A transition's primary item exists before the entry, so a `via` may read its slots.
292:   // Check 8: a name of `also` that a mark selects is resolved by the mark's rule, which gives one item or none. The signer named
293:   // no item, so such a name has no key in `expected`. The rule on aliases holds for it.
294:   const also = alsoItems(view, definition, act.also, fields, act.step === "transition" ? (subjects.get("on") ?? null) : null, undefined, (mark, bound) => selectedBy({ ...g, subjects: bound }, mark));
295:   if (!also.ok) return refused("no-item", also.detail);
296:   for (const [name, item] of also.items) {
297:     subjects.set(`also.${name}`, item);
298:     if (!also.marked.has(name)) expects.push(name);
299:   }
300:   // No aliases: each subject is one distinct item, so its expected revision is checked once and it rises once.
301:   if (new Set([...subjects.values()].map((i) => i.id)).size !== subjects.size) return refused("alias", "two names resolve to one item");
302:   if (Object.keys(intent.expected).length !== expects.length || expects.some((k) => !Object.hasOwn(intent.expected, k))) return refused("bad-intent", `expected has one key for each of: ${expects.join(", ")}`);
303:   for (const key of expects) {
304:     const item = subjects.get(key === "on" ? "on" : `also.${key}`)!;
305:     if (own(intent.expected, key) !== item.revision) return refused("revision-moved", `${key} is at revision ${item.revision}`);
306:   }
307:   // Section 6.3: an item in a final state refuses every transition. Comments are still allowed.
```

## packages/derive/src/fold.ts:59–66

```text
59:   const scope = writer.scope();
60:   const input = entry.input;
61:   if (input.type === "genesis" ? scope !== null || entry.seq !== 0 || entry.prev !== null : scope === null || entry.seq !== scope.head.seq + 1 || entry.prev !== scope.head.hash) {
62:     throw new FoldError(`entry ${entry.seq} does not follow the head`);
63:   }
64:   if (definition.standing) {
65:     try { checkStandingEntry(writer, definition, entry.effects, entry.seq); }
66:     catch (error) { if (error instanceof StandingError) throw new FoldError(`entry ${entry.seq}: ${error.message}`); throw error; }
```

## packages/derive/src/fold.ts:117–124

```text
117:       case "state": case "party": case "list": case "ref": case "value": case "hold": {
118:         const item = changeItem(touch(effect.item), effect, definition, signer);
119:         now.set(effect.item, item);
120:         // Section 6.6: the scope keeps, for a slot that holds a detached text, each digest the slot has held, so that a redaction
121:         // can list them. The bytes are a retained input, which the fold does not keep.
122:         const of = effect.effect === "value" ? own(own(definition.declared.items, item.type)?.values, effect.slot)?.of : undefined;
123:         if (effect.effect === "value" && of?.type === "text" && of.detached && typeof effect.value === "string") {
124:           const held = writer.texts(effect.item, effect.slot);
```

## packages/derive/src/fold.ts:168–173

```text
168: 
169:   for (const [id, item] of now) {
170:     const was = before.get(id) ?? null;
171:     // Section 6.3: an existing item that one entry changes rises by one, once, however many effects touch it.
172:     writer.putItem(was ? { ...item, revision: was.revision + 1 } : item);
173:     updateItemDuties(writer, definition, entry, was, writer.item(id)!, itemSettlement);
```

## packages/scope/src/turn.ts:11–18

```text
11:  * One input at a time (step 2): a queue admits one input to the drain and
12:  * the snapshot, and one to a commit. A Durable Object lets another request
13:  * in wherever one waits, and a turn waits in one place only: the
14:  * evaluation of its rules (step 5), which may take as long as its time
15:  * limit. That wait is outside the queue. If another input commits
16:  * meanwhile, the head check of step 6.2 stops this one and it starts again
17:  * from step 3. An input with no rule to evaluate never waits, so its drain,
18:  * snapshot and commit are one section.
```

## packages/scope/src/turn.ts:321–342

```text
321:   /** Step 6 for the waiting input, in one transaction. `stopped`: nothing was written, and the turn goes back to step 3. */
322:   #commit<A>(definition: ValidDefinition, waiting: Waiting<A>, turn: Counts, attempt: Attempt): End<A> | "stopped" {
323:     let full: (() => A) | null = null;
324:     try {
325:       return this.#telling(() => this.#store.transaction((): End<A> | "stopped" => this.#judged(definition, waiting, turn, attempt, (answer) => { full = answer; })));
326:     } catch (error) {
327:       // The entry would have left an admitted task no room to settle. The transaction wrote nothing.
328:       if (error instanceof Full && full) return { end: "answer", answer: (full as () => A)() };
329:       if (error instanceof StandingError || error instanceof AmountError) return { end: "unavailable" };
330:       throw error;
331:     }
332:   }
333: 
334:   #judged<A>(definition: ValidDefinition, waiting: Waiting<A>, turn: Counts, attempt: Attempt, refuse: (full: () => A) => void): End<A> | "stopped" {
335:     {
336:       const clock = clockOf(this.#store, this.#ports.clock.read());    // 6.1: the one reading
337:       turn.last = clock;
338:       const head = this.#store.scope()?.head ?? null;
339:       if (head?.seq !== attempt.head?.seq || head?.hash !== attempt.head?.hash) return "stopped";   // 6.2
340:       const verdict = waiting.judge(this.#store, clock, attempt.prepared);   // 6.3 and 6.4
341:       if (verdict.verdict === "stop") return "stopped";
342:       if (verdict.verdict === "answer") return { end: "answer", answer: verdict.answer };
```

## packages/platform/src/destination-v14.ts:41–47

```text
41: // Each signed request admits room for its own certificate operation, as read-token does.
42: const certificateAct:PlatformData['acts'][string]={step:'transition',on:'branch',grant:'rules.publish',
43:   adds:{operations:{[RULES_CERTIFICATE_KIND]:1}},also:{},
44:   fields:{proposal:{type:'digest',required:true,value:RULES_POLICY_VALUE_V11},directoryBirth:birthField('platform:directory'),
45:     rulesBirth:birthField('platform:rules'),membershipBirth:birthField('platform:membership')},
46:   guards:[{state:['ready']},{code:'rules-certificate-request-v14',row:'R7'}],
47:   effects:[{code:'rules-certificate-open-v14',row:'R7'}],sends:[],attention:[]};
```

## packages/platform/src/destination-v14.ts:64–73

```text
64:   'rules-certificate-request-v14':{place:'guard',refusals:['rules-certificate-unavailable'],run:given=>{
65:     // Standard native grant/key/member checks still precede this sibling proof.
66:     return bindingAt(given)&&checkedPolicy(given,given.resolved.fields['proposal'])?{holds:true}:refuse;
67:   }},
68:   'rules-certificate-open-v14':{place:'effect',most:3,run:given=>{
69:     const held=bindingAt(given);if(!held)throw Error('checked certificate binding missing');
70:     // Serialization cast follows closed bounded native snapshot validation.
71:     return [{effect:'value',item:held.item.id,slot:'rulesCertificateRequest',value:held.binding as unknown as FieldValue},
72:       {effect:'operation',k:0,owner:'platform:destination@14',kind:RULES_CERTIFICATE_KIND,attempts:1,for:held.item.id},
73:       {effect:'attempt',operation:{k:0},attempt:1,result:'opened',selected:null}] satisfies readonly RuleEffect[];
```

## packages/platform/src/destination-v14.ts:80–87

```text
80:     holds:(given,operation)=>{
81:       if(given.input.type!=='outcome'||given.input.result!=='confirmed'||!evidence(given.input.evidence.body))return false;
82:       const opened=rulesCertificateOpening(given.own,operation,given.resolved.at),scope=given.state.scope();
83:       if(!opened||!scope||!same(scope.head,{seq:opened.started.seq,hash:opened.started.hash})
84:         ||operation.for===undefined||!rulesCertificateBranchMatches(given.state,opened.binding,operation.for))return false;
85:       const request=given.own(opened.started.seq);if(request?.entry.input.type!=='act')return false;
86:       const family=rulesCertificateFamily(given,'rules',request.entry.input.signed.intent.fields);
87:       if(!family||!same(opened.binding.rules,family.rules.fact.at))return false;
```

## packages/platform/src/rules-scope.ts:203–218

```text
203:     // `publish`: an act. Grant `rules.publish`. It sets the rule values from the fields, each of which but the declaration is
204:     // required: every `publish` states the rules whole. The revision of the rules is this entry's position. No update is sent to
205:     // any lane (G11): a lane asks, by `rules-wanted`.
206:     publish: {
207:       step: "transition", on: "rules", grant: "rules.publish",
208:       also: {},
209:       fields: {
210:         approvals: { ...APPROVALS, required: true },
211:         ownerMayReview: { type: "bool", required: true },
212:         checks: { ...CHECKS, required: true },
213:         labels: { ...LABELS, required: true },
214:         extents: { ...EXTENT_LIST, required: true },
215:         // Optional, with the default false: a `publish` that does not state the declaration withdraws it. That fails closed.
216:         singleControllerException: { type: "bool", required: false, default: false },
217:       },
218:       observes: [{ of: "member", from: { each: { field: "checks" }, as: "k", value: { element: "k.checker" } }, max: 32, window: 300, use: "reuse" }],
```

## packages/platform/src/rules-scope-v11.ts:22–37

```text
22: function publication(given:RuleGiven) {
23:   if(!given.resolved.signer)return {ok:false as const,reason:'rules-certificate-unavailable' as const};
24:   const candidate=completePolicy(given);if(!candidate.ok)return candidate;
25:   const proposal=given.resolved.fields['proposal'],proof=given.resolved.fields['proof'];
26:   if(!isDigest(proposal)||!isDigest(proof)||candidate.digest!==proposal)return {ok:false as const,reason:'invalid-policy' as const};
27:   const placed=given.placed('proposal'),tree=given.placed('proof');
28:   if(placed===undefined||tree===undefined)return {ok:false as const,reason:'extent-tree-unavailable' as const};
29:   const owned=rulesPolicyProposalV11(placed);
30:   if(!owned.ok||owned.digest!==proposal||!same(owned.policy,candidate.policy)||!bounded(owned.policy,RULES_POLICY_VALUE_V11.max))return {ok:false as const,reason:'invalid-policy' as const};
31:   const certificate=rulesPublishedCertificate(given,proposal,proof);
32:   if(!certificate)return {ok:false as const,reason:'rules-certificate-unavailable' as const};
33:   const checked=verifyRulesTree(canonicalize(tree),proof,certificate.binding,rulesPolicyPatternsV11(owned.policy));
34:   if(!checked.ok)return checked;
35:   const envelope={configured:true,policy:owned.policy,proposal,certificate:certificate.provenance};
36:   if(!bounded(envelope,RULES_EXTENTS_VALUE_V11.max))return {ok:false as const,reason:'invalid-policy' as const};
37:   return {ok:true as const,policy:owned.policy,proposal,certificate:certificate.provenance};
```

## packages/platform/src/rules-scope-v11.ts:51–57

```text
51:     publish:{...oldPublish,fields:{...oldPublish.fields,extents:{...extentsType,required:true},
52:       singleControllerException:exceptionField,allowZeroApprovals:{type:'bool',required:false},
53:       proposal:{type:'digest',required:true,value:RULES_POLICY_VALUE_V11},proof:{type:'digest',required:true,value:RULES_TREE_PROOF},
54:       certificateRequest:birthField('platform:destination','certify-rules-tree'),certificate:birthField('platform:destination','certify-rules-tree'),
55:       directoryBirth:birthField('platform:directory','establish'),destinationBirth:birthField('platform:destination','establish'),membershipBirth:birthField('platform:membership','establish')},
56:       guards:[...oldPublish.guards.filter(guard=>!('code'in guard&&guard.code==='extents-hold')),{code:'q11-certified-policy',row:'R7'}],
57:       effects:[{code:'q11-publish-policy',row:'R7'},{ref:{slot:'published',from:'self'}}]},
```

## packages/platform/src/rules-scope-v11.ts:86–93

```text
86:   'q11-publish-policy':{place:'effect',most:10,run:given=>{
87:     const result=publication(given),item=rulesOf(given.state);if(!result.ok||!item)throw Error('checked Q11 publication missing');
88:     const p=result.policy;
89:     return [
90:       ...Object.entries({approvals:p.approvals,ownerMayReview:p.ownerMayReview,checks:p.checks,labels:p.labels,extents:p.extents,
91:         singleControllerException:p.singleControllerException===true,configured:true,policy:p,proposal:result.proposal,certificate:result.certificate})
92:         .map(([slot,value]):RuleEffect=>({effect:'value',item:item.id,slot,value:value as FieldValue})),
93:     ];
```

## packages/platform/src/rules-certificate.ts:91–124

```text
91: export function rulesPublishedCertificate(given:RuleGiven,proposal:Digest,proof:Digest):
92:   {binding:RulesTreeBinding;provenance:RulesCertificateProvenanceV11}|null {
93:   try {
94:     const family=rulesCertificateFamily(given,'destination');
95:     const request=given.resolved.fields['certificateRequest'],certificate=given.resolved.fields['certificate'];
96:     if(!family||!isFactRef(request)||!isFactRef(certificate)||!same(request.at,family.destination.fact.at)||!same(certificate.at,request.at))return null;
97:     const opening=find(given,request),answer=find(given,certificate);
98:     if(!opening||!answer||opening.under!=='platform:destination'||answer.under!=='platform:destination'
99:       ||!isEntryOf(opening.entry,request)||!isEntryOf(answer.entry,certificate)||opening.entry.input.type!=='act'
100:       ||opening.entry.input.signed.intent.kind!==RULES_CERTIFICATE_KIND||answer.entry.input.type!=='outcome')return null;
101:     const input=answer.entry.input,op=`${request.seq}:0`;
102:     if(input.owner!=='platform:destination@14'||input.kind!==RULES_CERTIFICATE_KIND||input.operation!==op||input.attempt!==1
103:       ||input.result!=='confirmed'||input.evidence.basis!=='own-answer'||answer.entry.seq!==request.seq+1||answer.entry.prev!==request.hash
104:       ||!exact(input.evidence.body,['proposal','proof','started'])||input.evidence.body['proposal']!==proposal||input.evidence.body['proof']!==proof
105:       ||!same(input.evidence.body['started'],request))return null;
106:     const selected=answer.entry.effects.filter(e=>e.effect==='attempt');
107:     if(selected.length!==1||!selected.some(e=>e.effect==='attempt'&&e.operation===op&&e.attempt===1&&e.result==='confirmed'&&e.selected===true))return null;
108:     const openingEffect=opening.entry.effects.find(e=>e.effect==='operation'&&e.k===0);
109:     if(!openingEffect||openingEffect.effect!=='operation'||typeof openingEffect.for!=='number')return null;
110:     const operation:Operation={id:op as Operation['id'],owner:'platform:destination@14',kind:RULES_CERTIFICATE_KIND,most:1,for:openingEffect.for,
111:       attempts:[{attempt:1,opened:request.seq,outcomes:[]}],selected:null};
112:     const captured=rulesCertificateOpening(seq=>seq===request.seq?{entry:opening.entry,hash:request.hash}:null,operation,request.at);
113:     if(!captured||!same(captured.binding.rules,given.resolved.at)||captured.binding.proposal!==proposal
114:       ||!same(captured.binding.repository,family.destination.fields['repository'])
115:       ||captured.binding.ref!==`refs/heads/${family.destination.fields['branch']}`)return null;
116:     // All candidate birth refs in the opening must be exactly the same real
117:     // siblings that this reciprocal publication just authenticated.
118:     const fields=opening.entry.input.signed.intent.fields;
119:     if(!same(fields['directoryBirth'],family.directory.fact)||!same(fields['membershipBirth'],family.membership.fact)
120:       ||!same(fields['rulesBirth'],family.rules.fact))return null;
121:     return {binding:captured.binding,provenance:{request,certificate,proof,commit:captured.binding.commit}};
122:   }catch{return null;}
123: }
```
