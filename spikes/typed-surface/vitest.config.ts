import { defineConfig } from "vitest/config";

const source = (path: string): string => new URL(`../../packages/${path}`, import.meta.url).pathname;
export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  resolve: { alias: [
    { find: "@generalbusiness/dap-platform/membership-actions", replacement: source("platform/src/membership-actions.ts") },
    { find: "@generalbusiness/dap-platform/application-v2", replacement: source("platform/src/application-codec/application-v2.ts") },
    { find: "@generalbusiness/dap-platform/application", replacement: source("platform/src/application-codec/application.ts") },
    { find: /^@generalbusiness\/dap-platform$/, replacement: source("platform/src/index.ts") },
    { find: "@generalbusiness/dap-derive/testing", replacement: source("derive/test/fixtures.ts") },
    { find: "@generalbusiness/dap-derive/rule", replacement: source("derive/src/rule/index.ts") },
    { find: /^@generalbusiness\/dap-derive$/, replacement: source("derive/src/index.ts") },
    { find: /^@generalbusiness\/dap-bytes$/, replacement: source("bytes/src/index.ts") },
    { find: /^@generalbusiness\/dap-client$/, replacement: source("client/src/index.ts") },
    { find: "@generalbusiness/dap-contract", replacement: source("contract/src/index.ts") },
  ] },
  test: { include: ["*.test.ts"], environment: "node", pool: "threads" },
});
