/** The bindings of the test worker (wrangler.test.jsonc). */
declare namespace Cloudflare {
  interface Env {
    SCOPES: DurableObjectNamespace;
    SCOPE_INDEX: DurableObjectNamespace;
    SERVING_INDEX: DurableObjectNamespace;
    STARTUP_INDEX: DurableObjectNamespace;
    SERVING_API: Fetcher;
    /** Actual sandbox service sharing the small-limit fixed serving owner. */
    SERVING_SCREEN_API: Fetcher;
    /** Local emulator only; no provider bucket is used by tests. */
    APPLICATION_CONTENT: R2Bucket;
    METRIC_CONTROL: DurableObjectNamespace;
    AS_DEPLOYED: DurableObjectNamespace;
    CREATION_VERSIONS: DurableObjectNamespace;
    NET: DurableObjectNamespace;
    PLATFORM: DurableObjectNamespace;
    /** The hosted MCP endpoint's namespaces, over PLATFORM (test/worker.ts). */
    REGISTRIES: DurableObjectNamespace;
    AGENTS: DurableObjectNamespace;
    /** The test Worker's NetService binding forwards the production ScopeApi. */
    API: Fetcher;
    /** The test PlatformService binding forwards ScopeApi over PLATFORM. */
    PLATFORM_API: Fetcher;
    /** Separate entrypoint used only by the parentless admission witness. */
    CREATION_API: Fetcher;
    /** Production application sandbox RPC over PLATFORM, with a fixed TEST locator. */
    SCREEN_API: Fetcher;
  }
}
