import { expect, test, vi } from "vitest";
import { scriptedPageKeys } from "./scripted-page-key-store.ts";

// Actual Main + changeScreen/editor mount. Data/DOM stand-ins show the
// integration boundary only; native correction remains editor-list1.scope.
test("Main mounts a new corrected-proposal control for verified invalid-path text and keeps publication/review unavailable", async () => {
  vi.resetModules();
  vi.doMock('../src/browser-key-store.ts',async()=>({...await vi.importActual<typeof import('../src/browser-key-store.ts')>('../src/browser-key-store.ts'),pageKeyStore:scriptedPageKeys}));
  vi.doMock('../src/page-key-migration.ts',()=>({migratePageOperations:async()=>{}}));
  let rendered!: () => void;
  const done = new Promise<void>(resolve => { rendered = resolve; });
  let activeRender: Promise<void> | null = null;
  class Element {
    attrs: Record<string,string> = {}; children:(Element|string)[]=[]; handlers=new Map<string,()=>void>();
    constructor(readonly tag:string){} setAttribute(n:string,v:string){this.attrs[n]=v;} getAttribute(n:string){return this.attrs[n]??null;} removeAttribute(n:string){delete this.attrs[n];} hasAttribute(n:string){return Object.hasOwn(this.attrs,n);}
    append(...c:(Element|string)[]){this.children.push(...c);} prepend(...c:(Element|string)[]){this.children.unshift(...c);} replaceChildren(...c:(Element|string)[]){
      this.children=c;
      // Opening is an intermediate publication before room/change reads.
      // Any other publication, including a terminal failure, releases the
      // waiter so the original editor/security assertions decide the result.
      if(this===root&&!this.all().some(e=>e.tag==='h1'&&e.textContent==='Opening your room'))rendered();
    }
    addEventListener(n:string,f:()=>void){this.handlers.set(n,f);} focus(){}
    all():Element[]{return[this,...this.children.flatMap(c=>typeof c==='string'?[]:c.all())];}
    querySelector(selector:string){const slot=/^\[data-action-slot="([^"]+)"\]$/.exec(selector)?.[1];return slot?this.all().find(e=>e.attrs['data-action-slot']===slot)??null:null;}
    querySelectorAll(){return[];} get value(){return this.attrs['value']??'';} set value(v:string){this.attrs['value']=v;} get textContent():string{return this.children.map(c=>typeof c==='string'?c:c.textContent).join(' ');}
  }
  const root=new Element('div');
  const place={directory:'directory',membership:{scope:'membership',kind:'membership',inc:'one'}};
  const room={session:{service:'https://page.test',secret:new Uint8Array(32)},...place,rules:'rules',destination:'destination',key:'key',me:{handle:'@member',role:'member',actions:['change.open','change.propose']},reader:{}};
  const change={scope:'invalid-change',definition:'definition',head:{seq:1,hash:'head'},number:7,title:'Invalid original',body:null,state:'open',author:'@member',currentManifest:12,manifests:[{id:12,state:'current',integrator:'@member',authors:['@member'],base:'a'.repeat(40),integration:null,tree:null,complete:true,file:{path:'../outside.md',digest:'digest',size:8,page:'not-a-preview',content:'original\r\n'}}],reviews:[],requests:[],jobs:[],links:[],merges:[],rules:null,comments:[]};
  vi.doMock('@generalbusiness/dap-bytes',async()=>({...await vi.importActual<typeof import('@generalbusiness/dap-bytes')>('@generalbusiness/dap-bytes'),b64url:()=> 'device',unb64url:()=>new Uint8Array(32),keyIdOfSecret:()=> 'key',isKeyId:()=>true}));
  vi.doMock('../src/data.ts',()=>({sessionKey:()=> 'key',Unreadable:class Unreadable extends Error{},act:vi.fn(),actAssociation:()=> 'context',actsOn:async(_room:unknown,scope:string)=>({acts:scope==='directory'?[{kind:'open-issue',step:'open',on:'lane',line:'Open',fields:[{name:'definition',type:'digest',required:true,choices:[{label:'Issue',value:'one'}]},{name:'title',type:'text',required:true},{name:'conditions',type:'list',required:true},{name:'custom',type:'text',required:true}]}]:[],hidden:0}),fieldValue:vi.fn(),initializationStillCurrent: async () => true, roomInitialization: async () => ({ state: "configured" }), openRoom:async()=>room,listLanes:async()=>({issues:[],changes:[]}),siteAddress:()=>'/site/HEAD/',placeOf:vi.fn(),joinRoom:vi.fn(),joinAssociation:vi.fn(),enrollmentAssociation:vi.fn(),loadChange:async()=>change,loadIssue:vi.fn(),loadRules:vi.fn()}));
  const editor=vi.fn(()=>{const e=new Element('button');e.append('Create corrected proposal');return e;});
  vi.doMock('../src/retained-editor.ts',()=>({retainedEditor:editor}));
  vi.doMock('../src/claim.ts',()=>({allowedClaim:vi.fn(),claimRoom:vi.fn(),claimStatus:vi.fn()}));
  vi.stubGlobal('document',{getElementById:()=>root,createElementNS:(_namespace:string,tag:string)=>new Element(tag),createElement:(tag:string)=>new Element(tag)});
  const location={origin:'https://page.test',hash:'#/change/invalid-change'};vi.stubGlobal('location',location);
  vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({place,publicKey:'key'}),setItem:vi.fn()});
  let redraw!:()=>void;vi.stubGlobal('window',{addEventListener:(_name:string,handler:()=>void)=>{redraw=handler;}});
  try {
    await import('../src/main.ts'); activeRender=done; await activeRender;
    expect(editor).toHaveBeenCalledTimes(1);expect(editor.mock.calls[0]?.slice(0,2)).toEqual([room,change]);
    expect(root.textContent).toContain('Create corrected proposal');
    expect(root.all().filter(e=>e.attrs['data-action-slot']==='edit')).toHaveLength(1);
    expect(root.all().some(e=>e.tag==='a'&&e.textContent==='Open latest page')).toBe(false);
    let finished!:()=>void;const listDone=new Promise<void>(resolve=>{finished=resolve;});rendered=finished;
    activeRender=listDone;location.hash='#/';redraw();await activeRender;
    expect(root.textContent).toContain('Create issue is unavailable');
    // The actual panel retains the native action for the custom declaration.
    expect(root.all().some(e=>e.tag==='form'&&e.attrs['data-act']==='open-issue')).toBe(true);
    expect(root.all().some(e=>e.attrs['name']==='field:custom')).toBe(true);

  } finally {
    // Retain the scripted globals until the requested terminal publication;
    // do not turn an early assertion into an unowned draw continuation.
    try { await activeRender; }
    finally { vi.unstubAllGlobals();vi.doUnmock('../src/data.ts');vi.doUnmock('../src/retained-editor.ts');vi.doUnmock('../src/claim.ts');vi.doUnmock('@generalbusiness/dap-bytes');vi.doUnmock('../src/browser-key-store.ts');vi.doUnmock('../src/page-key-migration.ts');vi.resetModules(); }
  }
});
