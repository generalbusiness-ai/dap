import { descriptorId, type PackageDescriptor, type ModelSpec } from '../../src/descriptor.ts';
import { SCOPE_KINDS } from '../../src/scope-profile.ts';
import { SPINE } from '../../src/types.ts';
const base: Omit<PackageDescriptor,'id'> = {
  name:'com.example.scope-deny', module:import.meta.url,
  models:{ qaGuard:{ id:'qaGuard', config:{}, init:()=>({}), fold:state=>({ state,effective:false,reason:'qa_guard_refusal' }) } as ModelSpec },
  capabilities:[],
  kinds:{ [SCOPE_KINDS.exercise]:{ kind:SCOPE_KINDS.exercise,schema:{},handlers:['qaGuard'],audienceId:'spine',audience:()=>SPINE,capability:SCOPE_KINDS.exercise } },
};
export const scopeDenyPackage: PackageDescriptor = { ...base,id:descriptorId(base) };
