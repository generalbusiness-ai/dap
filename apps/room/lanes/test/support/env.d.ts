/** The bindings of the test Worker (wrangler.test.jsonc). */
declare namespace Cloudflare {
  interface Env {
    NET: DurableObjectNamespace;
    /** Actual fixed lookup/registration and serving owner, bound by this test Worker. */
    SCOPE_INDEX: DurableObjectNamespace;
    /** The deployed class with the production authority, for the scenarios on a room (`room.ts`). */
    PLATFORM: DurableObjectNamespace;
    /** Local emulator only: both the canonical Scope and standalone lanes
     * test Workers bind this application-content bucket. */
    APPLICATION_CONTENT: R2Bucket;
    /** Typed only: the scope package's test support names it, which `room.ts` reaches through that package's `repository.ts`. This Worker binds none, and no lane test reads it. */
    SCOPES: DurableObjectNamespace;
    /** The test Worker's own `NetService` entrypoint, as a service binding: the contract's `ScopeApi`. */
    API: Fetcher;
  }
}
