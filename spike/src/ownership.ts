// Cooperative ownership of a backend's serving fold. The lease is kept private
// by Journal and Context; closing a facade never revives its old write access.
import type { Backend } from './append.ts';
export interface BackendLease {
  assertActive(): void;
  invalidate(): void;
  release(): void;
}
const owners = new WeakMap<Backend, BackendLease>();
export function acquireBackend(backend: Backend): BackendLease {
  if (owners.has(backend)) throw new Error('Journal: backend already has a live facade');
  let active = true;
  const lease: BackendLease = {
    assertActive() {
      if (!active || owners.get(backend) !== lease) throw new Error('Context: owning facade is closed or inactive');
    },
    invalidate() { active = false; },
    release() { active = false; if (owners.get(backend) === lease) owners.delete(backend); },
  };
  owners.set(backend, lease);
  return lease;
}
export function assertBackendAccess(backend: Backend, lease?: BackendLease): void {
  if (lease) {
    lease.assertActive();
    if (owners.get(backend) !== lease) throw new Error('Context: invalid backend ownership');
  } else if (owners.has(backend)) throw new Error('Context: backend is owned by a live Journal facade');
}
