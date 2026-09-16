import { descriptorId, type PackageDescriptor, type ModelSpec } from '../../src/descriptor.ts';
import { SCOPE_KINDS } from '../../src/scope-profile.ts';
import { SPINE } from '../../src/types.ts';
const base: Omit<PackageDescriptor,'id'> = {
  name:'com.example.scope-throw', module:import.meta.url,
  models:{ qaFault:{ id:'qaFault',config:{},init:()=>({}),fold:(state,event)=>{
    if ((event.payload as { failure?:string }).failure === 'fold') throw new Error('qa_handler_exception');
    return { state,effective:true };
  } } as ModelSpec },
  capabilities:[],
  kinds:{ [SCOPE_KINDS.exercise]:{
    kind:SCOPE_KINDS.exercise,schema:{},handlers:['qaFault'],audienceId:'qa-fault',
    audience:event=>{ if ((event.payload as { failure?:string }).failure === 'audience') throw new Error('qa_audience_exception'); return SPINE; },
    capability:SCOPE_KINDS.exercise,
  } },
};
export const scopeThrowPackage: PackageDescriptor = { ...base,id:descriptorId(base) };
