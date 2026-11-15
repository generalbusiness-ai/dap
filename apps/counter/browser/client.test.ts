// Actual SDK/W1/signing/Custody over FAKE service/session/history and memory custody; no native admission or speech.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Entry, Item, MemberRef, Receipt, ScopeRef, Summary } from "@generalbusiness/dap-contract";
import type { ScopeKind } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, factRefOf, intentDigest, keyIdOfSecret, textDigest, timeOf } from "@generalbusiness/dap-bytes";
import { scriptedSequence } from "@generalbusiness/dap-derive/scripted";
import { Custody, memoryStore, meaningOf, requestKey, secretSigner, signedIntent, type CustodyRecord, type Fetch, type HeadStreamFetch, type Phase } from "@generalbusiness/dap-client";
import { COUNTING_COMMITMENTS_DEFINITION } from "../commitments-pin.ts";
import { assignedTurn, canCommit, countingView, proposal, type CountingView } from "./model.ts";
import { nativeGateway } from "./client.ts";
import { scriptedCounterProjection } from "./projection-fixture.ts";
import type { ActorIdentity } from "./voice-controller.ts";

/** Compiler-only examples. No test or fixture calls this function. */
export function checkProposalTypes(view: CountingView, actor: ActorIdentity): void {
  // @ts-expect-error Genesis does not name a command on an existing scope.
  proposal(view, actor, "establish");
  // @ts-expect-error Failure reasons come from the authored enum.
  proposal(view, actor, "fail", undefined, { reason: "not-a-failure" });
  // @ts-expect-error The participant field is an authored item ID.
  proposal(view, actor, "activate", undefined, { participant: "first" });
}

async function fixture(joined=true, proof?:{current():boolean;entry():Promise<boolean>}) {
  const secret=new Uint8Array(32).fill(51),definition=COUNTING_COMMITMENTS_DEFINITION;
  const ref=(kind:ScopeKind):ScopeRef=>(scriptedSequence({v:1,kind,definition,creator:null,cause:textDigest(`FAKE gateway ${kind}`),ordinal:0},"2026-01-01T00:00:00Z",8).at);
  const scope=ref("lane"),membership=ref("membership"),member={membership,member:"@ada" as const};
  const identity:ActorIdentity={origin:"https://gateway-fake.test",deployment:"FAKE gateway",scope,definition,membership,member,publicKey:keyIdOfSecret(secret)};
  const item=(type:string,id:number,state:string,values:Item["values"],parties:Item["parties"]):Item=>({type,id,state,revision:1,opened:null,values,parties,refs:{},attributed:[]});
  const summary:Summary={scope,status:"active",definition,time:new Date().toISOString(),counts:[],items:[item("configuration",0,"ready",{target:3},{controller:member}),item("board",1,"paused",{target:3,generation:0,serial:0,lastNumber:0,until:null},{controller:member,lastSpeaker:null}),...(joined?[item("participant",2,"active",{}, {agent:member})]:[])]};
  const head={seq:1,hash:textDigest("FAKE head")};let posts=0,settles=0,writes=0;
  let metadata="trusted",reply:"refused"|"lost"="refused",failPhase:Phase|undefined,failAfterWrite=false,settleAccepted=false,entry:Entry|undefined,receipt:Receipt|undefined;
  /** The phase of each custody write, in order. */
  const phases:Phase[]=[];
  const observations:{status:string;view?:unknown}[]=[];
  let queue=Promise.resolve();const lock={run:<T>(work:()=>Promise<T>):Promise<T>=>{const run=queue.then(work);queue=run.then(()=>undefined,()=>undefined);return run;}};
  // The memory store stands in for the browser store. A scripted failure refuses the write of one phase, or keeps a write and then fails.
  const store=memoryStore(),write=store.write;
  store.write=async(id,record,options)=>{writes++;if(record.phase===failPhase)throw new Error("FAKE custody commit failure");await write(id,record,options);phases.push(record.phase);if(failAfterWrite){failAfterWrite=false;throw new Error("FAKE write succeeded but acknowledgement failed");}};
  const records=()=>[...store.records.values()].map(text=>JSON.parse(text) as CustodyRecord);
  const fake:Fetch=async(url,init)=>{
    const path=new URL(url).pathname;
    if(path.endsWith("/sessions")){const request=JSON.parse(init?.body??"{}").request;return Response.json({ok:true,token:"FAKE token",session:{v:1,deployment:identity.deployment,membership,member:member.member,key:identity.publicKey,reads:["summary","entry"],ends:request.notAfter}});}
    if(path.endsWith("/application-projection"))return new Response(scriptedCounterProjection(new URL(url).searchParams.get("p")!,summary,head),{headers:{"content-type":"application/json"}});
    if(path.endsWith("/acts")){
      posts++;const submitted=JSON.parse(init?.body??"{}");
      const kept=records().find(r=>canonicalize(r.envelope.signed)===canonicalize(submitted.signed));
      assert.equal(kept?.phase,"sent","custody keeps the exact envelope as sent before POST");
      // Scripted accepted history can later contradict an untrusted or lost response. It is NOT native admission proof.
      if(metadata!=="trusted"||reply==="lost"){entry={v:1,genesis:scope.genesis,seq:2,prev:head.hash,time:new Date().toISOString(),clamped:false,epoch:0,input:{type:"act",signed:submitted.signed,authority:[],presented:{}},uses:[],prepared:[],effects:[],sends:[]};receipt={fact:factRefOf(entry,scope),definition,intent:intentDigest(submitted.signed.intent),effects:[],sends:[],epoch:0};}
      if(reply==="lost")throw new Error("FAKE lost response");return Response.json({answer:"refused",reason:"guard-failed",judgedAt:head},{status:422});
    }
    if(path.endsWith("/settle")){settles++;return settleAccepted&&receipt?Response.json({ok:true,at:{seq:receipt.fact.seq,hash:receipt.fact.hash},complete:true,value:receipt}):Response.json({ok:false,reason:"not-found"});}
    if(path.includes("/entries/")){
      if(proof&&!await proof.entry())return Response.json({ok:false,reason:"unavailable"},{status:503});
      return entry?Response.json({ok:true,at:{seq:entry.seq,hash:entryHash(entry)},complete:true,value:{entry,hash:entryHash(entry)}}):Response.json({ok:false,reason:"not-found"});
    }
    throw Error(`The FAKE Counter service does not provide this read: ${path}`);
  };
  const stream:HeadStreamFetch=async(url,init)=>{assert.equal(init.redirect,"error");return{status:200,url,redirected:false,headers:new Headers({"content-type":"application/x-ndjson"}),body:new ReadableStream<Uint8Array>({start(c){c.enqueue(new TextEncoder().encode(JSON.stringify({at:head})+"\n"));}})};};
  const connect=async()=>{
    const gateway=nativeGateway(identity,secretSigner(secret),{application:{scope,directory:ref("directory"),item:7,definition},current:()=>proof?.current()??true,lock,voiceStore:{load:async()=>null,save:async()=>{throw new Error("unused fake voice");},clear:async()=>{}},custody:store,fetch:fake,headFetch:stream,
      actFetch:async(url,init)=>{assert.equal(init.redirect,"error");const response=await fake(url,{...init,signal:init.signal as never});return{status:metadata==="wrong-status"?200:response.status,body:response.body,headers:new Headers({"content-type":metadata==="wrong-media"?"text/html":"application/json"}),url:metadata==="wrong-url"?url+"/different":url,redirected:metadata==="redirected"};}});
    try{await new Promise<void>((resolve,reject)=>gateway.observe((state,view)=>{observations.push({status:state.status,view});if(state.status==="current")resolve();else if(["error","forbidden","unsupported","unavailable","expired"].includes(state.status))reject(new Error(`Fake gateway setup ${state.status}: ${"reason"in state?state.reason:""}`));}));}
    catch(error){gateway.dispose();throw error;}return gateway;
  };
  /** Keep a prepared record at the Counter's target that is not a Counter command: its kind is outside COMMANDS. */
  const keepForeign=async()=>{const key=requestKey(),signer=secretSigner(secret);
    await new Custody(store,()=>timeOf(Date.now())).keep({service:identity.origin,membership,signer:identity.publicKey,target:scope,key},meaningOf({kind:"bogus"}),
      async()=>({binding:{definition:"counting",kind:"bogus",declaration:null,pinned:definition},envelope:{signed:await signedIntent(signer,{to:scope,kind:"bogus",fields:{}},{idempotencyKey:key}),beside:{}}}),timeOf(Date.now()+60_000));};
  return{identity,gateway:await connect(),connect,observations,counters:()=>({posts,settles,writes}),retained:()=>store.records.size?canonicalize([...store.records.entries()]):null,
    record:()=>records().at(-1)??null,phases,mode:(value:string)=>{metadata=value;},lose:()=>{reply="lost";},fail:(phase?:Phase)=>{failPhase=phase;},writeThenFail:()=>{failAfterWrite=true;},acceptSettlement:()=>{settleAccepted=true;},keepForeign};
}

test("FAKE valid SDK stream waits for a current Counter projection without forwarding transport readiness",async()=>{
  const f=await fixture();try{
    assert.deepEqual(f.observations.map(state=>state.status),["connecting","refreshing","current"]);
    assert.equal(f.observations[0]?.view,undefined);assert.equal(f.observations[1]?.view,undefined);
    const current=f.observations[2]?.view as {board?:{state?:string;lastNumber?:number}}|undefined;
    assert.equal(current?.board?.state,"paused");assert.equal(current?.board?.lastNumber,0);
    assert.deepEqual(f.counters(),{posts:0,settles:0,writes:0});
  }finally{f.gateway.dispose();}
});

test("FAKE correlated trusted first refusal keeps the judgment in custody and leaves no pending command",async()=>{
  const f=await fixture();try{
    await f.gateway.restoreCommand();assert.equal(f.gateway.pendingCommand(),null);
    const refused=await f.gateway.command("start");assert.equal(refused.status,"refused");assert.match(refused.reason??"",/guard-failed/);
    assert.equal(f.gateway.pendingCommand(),null);assert.equal(f.counters().posts,1);
    assert.deepEqual(f.phases,["prepared","sent","refused"]);assert.equal(f.record()?.phase,"refused");
  }finally{f.gateway.dispose();}
});

test("FAKE wrong-route first response stays unknown; later refusal/head cannot settle it, exact accepted history can",async()=>{
  const f=await fixture();try{
    f.mode("wrong-url");assert.equal((await f.gateway.command("start")).status,"unknown");
    const original=f.retained();assert.ok(original);assert.equal(f.record()?.phase,"unknown");
    f.mode("trusted");assert.equal((await f.gateway.command("start")).status,"unknown");
    assert.equal((await f.gateway.checkCommand())?.status,"unknown");assert.equal(f.retained(),original);assert.equal(f.counters().posts,1);
    f.acceptSettlement();assert.equal((await f.gateway.checkCommand())?.status,"recorded");assert.equal(f.record()?.phase,"accepted");
    assert.equal(f.gateway.pendingCommand(),null);assert.equal(f.counters().posts,1);
  }finally{f.gateway.dispose();}
});

test("FAKE a held receipt read cannot start its fallback GET after Counter loses the context",async()=>{
  for(const expires of [false,true]){
    let current=true,reads=0,entered!:()=>void,release!:()=>void;
    const arrived=new Promise<void>(resolve=>{entered=resolve;}),held=new Promise<void>(resolve=>{release=resolve;});
    const f=await fixture(true,{current:()=>current,entry:async()=>{reads++;if(reads===1){entered();await held;return false;}return true;}});
    try{
      f.lose();assert.equal((await f.gateway.command("start")).status,"unknown");
      const original=f.retained();f.acceptSettlement();
      const pending=f.gateway.checkCommand();
      const outcome=expires?assert.rejects(pending,/no longer current/):pending.then(result=>assert.equal(result?.status,"recorded"));
      await arrived;current=!expires;release();await outcome;
      assert.equal(reads,expires?1:2);assert.equal(f.counters().posts,1);
      assert.equal(f.record()?.phase,expires?"unknown":"accepted");
      if(expires)assert.equal(f.retained(),original);
    }finally{f.gateway.dispose();}
  }
});

test("FAKE Check command leaves prepared custody unchanged; concurrent explicit Resume sends the kept bytes once; a sent command never resends",async()=>{
  const f=await fixture();let next:Awaited<ReturnType<typeof f.connect>>|undefined,peer:Awaited<ReturnType<typeof f.connect>>|undefined;try{
    f.fail("sent");const kept=await f.gateway.command("start");assert.equal(kept.status,"blocked");assert.equal("definitelyUnsent" in kept,false);
    assert.equal(f.counters().posts,0);const original=f.record()!.envelope;assert.equal(f.record()?.phase,"prepared");
    f.gateway.dispose();f.fail();next=await f.connect();await next.restoreCommand();peer=await f.connect();await peer.restoreCommand();
    const prepared=f.retained();assert.equal((await next.checkCommand())?.status,"unknown");assert.equal((await peer.checkCommand())?.status,"unknown");
    assert.equal(f.retained(),prepared);assert.equal(f.counters().posts,0);assert.equal(next.commandResumeReady(),true);
    const results=await Promise.all([next.resumeCommand(),peer.resumeCommand()]);assert.deepEqual(results.map(r=>r?.status??null),["refused",null]);
    assert.equal(f.counters().posts,1);assert.equal(canonicalize(f.record()!.envelope),canonicalize(original));
  }finally{f.gateway.dispose();next?.dispose();peer?.dispose();}
  const lost=await fixture();let resumed:Awaited<ReturnType<typeof lost.connect>>|undefined;try{
    lost.lose();lost.fail("unknown");assert.equal((await lost.gateway.command("start")).status,"unknown");assert.equal(lost.record()?.phase,"sent");const original=lost.retained();
    lost.gateway.dispose();lost.fail();resumed=await lost.connect();await resumed.restoreCommand();assert.equal(resumed.commandResumeReady(),false);
    assert.equal((await resumed.checkCommand())?.status,"unknown");assert.equal(lost.retained(),original);assert.equal(lost.counters().posts,1);
    assert.equal((await resumed.resumeCommand())?.status,"blocked");assert.equal(lost.retained(),original);assert.equal(lost.counters().posts,1);
  }finally{lost.gateway.dispose();resumed?.dispose();}
});

test("FAKE an unkept refusal fences the next command; an unavailable local candidate never keeps or POSTs; a kept write that failed stays checkable",async()=>{
  const f=await fixture();try{
    f.fail("refused");assert.equal((await f.gateway.command("start")).status,"unknown");const original=f.retained();assert.ok(original);assert.equal(f.record()?.phase,"sent");
    assert.equal((await f.gateway.command("start")).status,"unknown");assert.equal(f.retained(),original);assert.equal(f.counters().posts,1);
  }finally{f.gateway.dispose();}
  const blocked=await fixture(false);try{
    const unsent=await blocked.gateway.command("activate");assert.equal(unsent.status,"blocked");assert.equal("definitelyUnsent" in unsent && unsent.definitelyUnsent,true);assert.equal(blocked.retained(),null);assert.deepEqual(blocked.counters(),{posts:0,settles:0,writes:0});
  }finally{blocked.gateway.dispose();}
  const written=await fixture();try{
    written.writeThenFail();const uncertain=await written.gateway.command("start");assert.equal(uncertain.status,"blocked");assert.equal("definitelyUnsent" in uncertain,false);
    const original=written.retained();assert.ok(original);assert.equal(written.gateway.pendingCommand(),"start");assert.equal(written.gateway.commandResumeReady(),true);
    assert.equal((await written.gateway.checkCommand())?.status,"unknown");assert.equal(written.retained(),original);
    assert.equal((await written.gateway.command("start")).status,"unknown");assert.equal(written.retained(),original);assert.deepEqual([written.counters().posts,written.counters().settles],[0,1]);
  }finally{written.gateway.dispose();}
});

// A kept record at the Counter's target that is not a Counter command stays in custody: nothing reads, sends or replaces it.
test("FAKE a kept record that is not a Counter command stays blocked without a read, a POST or a new command",async()=>{
  const f=await fixture();try{
    await f.keepForeign();const original=f.retained(),before=f.counters();assert.ok(original);
    await f.gateway.restoreCommand();assert.equal(f.gateway.pendingCommand(),"unknown");assert.equal(f.gateway.commandResumeReady(),false);
    assert.equal((await f.gateway.checkCommand())?.status,"blocked");assert.equal(f.gateway.pendingCommand(),"unknown");
    assert.equal((await f.gateway.resumeCommand())?.status,"blocked");assert.equal(f.gateway.pendingCommand(),"unknown");
    assert.equal((await f.gateway.command("start")).status,"unknown");
    assert.equal(f.retained(),original);assert.deepEqual(f.counters(),before);
  }finally{f.gateway.dispose();}
});

// Pure projection/proposal witness over authored summary data; not native authority or media evidence.
test("C1 claims use the complete active roster without assigning a speaker, and only the exact linked pledge can resolve",()=>{
  const definition=COUNTING_COMMITMENTS_DEFINITION;
  const scope:ScopeRef=scriptedSequence({v:1,kind:"lane",definition,creator:null,cause:textDigest("FAKE C1 model"),ordinal:0},"2026-01-01T00:00:00Z",8).at;
  const membership:ScopeRef=scriptedSequence({v:1,kind:"membership",definition,creator:null,cause:textDigest("FAKE C1 model"),ordinal:0},"2026-01-01T00:00:00Z",8).at;
  const ada={membership,member:"@ada" as const},bea={membership,member:"@bea" as const},cy={membership,member:"@cy" as const};
  const actor=(member:MemberRef):ActorIdentity=>({origin:"https://model-fake.test",deployment:"FAKE",scope,definition,membership,member,publicKey:keyIdOfSecret(new Uint8Array(32).fill(51))});
  const item=(type:string,id:number,state:string,values:Item["values"],parties:Item["parties"],refs:Item["refs"]={}):Item=>({type,id,state,revision:id+1,opened:null,values,parties,refs,attributed:[]});
  const configuration=item("configuration",0,"ready",{target:3},{controller:ada});
  const board=item("board",1,"open",{target:3,generation:2,serial:4,lastNumber:1,until:null},{controller:ada,lastSpeaker:ada},{pledge:null,lastFulfilledAt:10});
  // Inactive members fill the native live cap but do not belong to the active claim basis.
  const roster=[item("participant",2,"active",{},{agent:ada}),item("participant",3,"inactive",{},{agent:bea}),item("participant",5,"active",{},{agent:cy}),...Array.from({length:13},(_,i)=>item("participant",i+20,"inactive",{},{agent:{membership,member:`@guest${i}` as const}}))];
  const summary:Summary={scope,definition,status:"active",time:"2026-10-10T00:00:00Z",counts:[],items:[configuration,board,...roster]};
  const view=countingView(summary,scope);
  assert.equal(view.participants.length,16);
  const newcomer=actor({membership,member:"@new"});assert.throws(()=>proposal(view,newcomer,"participate"),/roster is full/);
  const removed=countingView({...summary,items:[configuration,board,...roster.map(p=>p.id===20?{...p,state:"removed"}:p)]},scope);
  assert.deepEqual(proposal(removed,newcomer,"participate"),{kind:"participate",on:null,fields:{},expected:{}});
  assert.equal(assignedTurn(view,actor(cy)),undefined);assert.equal(canCommit(view,actor(ada)),false);assert.equal(canCommit(view,actor(cy)),true);assert.equal(canCommit(view,actor(bea)),false);
  assert.deepEqual(proposal(view,actor(cy),"commit"),{kind:"commit",on:null,fields:{participant:5,generation:2,serial:5,n:2,basis:[{id:2,member:ada},{id:5,member:cy}]},expected:{board:2,participant:6}});
  // Once only Ada is active, the native anti-consecutive exception permits Ada again.
  const solo=countingView({...summary,items:[configuration,board,...roster.map(p=>p.id===5?{...p,state:"inactive"}:p)]},scope);
  assert.equal(canCommit(solo,actor(ada)),true);
  const deadline="2026-10-10T00:00:30Z",pledged=item("promise",11,"pledged",{generation:2,serial:5,n:2,basis:[{id:2,member:ada},{id:5,member:cy}],until:deadline},{agent:cy},{participant:5,admittedAt:11});
  const linked={...board,revision:7,values:{...board.values,serial:5,until:deadline},refs:{...board.refs,pledge:11}};
  const held=countingView({...summary,items:[configuration,linked,...roster,pledged]},scope),turn=assignedTurn(held,actor(cy))!;
  assert.deepEqual([held.board!.number,held.board!.speaker,held.board!.until],[2,cy,Date.parse(deadline)]);
  assert.equal(assignedTurn(held,actor(ada)),undefined);assert.equal(canCommit(held,actor(cy)),false);
  const completion={turn,voiceId:"FAKE",completedAt:Date.parse(summary.time)+100};
  assert.deepEqual(proposal(held,actor(cy),"fulfill",completion),{kind:"fulfill",on:11,fields:{generation:2,serial:5,n:2},expected:{on:12,board:7}});
  assert.throws(()=>proposal(held,actor(cy),"fulfill",{...completion,turn:{...turn,serial:4}}),/no longer current/);
  assert.throws(()=>proposal(held,actor(ada),"fulfill",completion),/does not own/);
  assert.deepEqual(proposal(held,actor(cy),"fail",completion,{reason:"speech-uncertain"}),{kind:"fail",on:11,fields:{generation:2,serial:5,n:2,reason:"speech-uncertain"},expected:{on:12,board:7}});
  assert.deepEqual(proposal(held,actor(ada),"cancel"),{kind:"cancel",on:11,fields:{generation:2,serial:5,n:2},expected:{on:12,board:7}});
  assert.throws(()=>proposal(held,actor(ada),"force-deactivate",undefined,{participant:5}),/live promise/);
  assert.deepEqual(proposal(held,actor(ada),"remove-participant",undefined,{participant:3}),{kind:"remove-participant",on:3,fields:{},expected:{on:4,configuration:1}});
  assert.throws(()=>countingView({...summary,items:[configuration,{...linked,refs:{pledge:12}},...roster,pledged]},scope),/invalid/);
  // The first timer entry clears the board before the promise timer settles; it assigns no speech.
  const expiring=countingView({...summary,items:[configuration,{...linked,state:"paused",values:{...linked.values,until:null},refs:{pledge:null}},...roster,pledged]},scope);
  assert.equal(expiring.pledge,null);assert.equal(expiring.pendingPromise!.id,11);assert.equal(assignedTurn(expiring,actor(cy)),undefined);
  assert.throws(()=>proposal(expiring,actor(ada),"start"),/Resolve the live promise/);
});
