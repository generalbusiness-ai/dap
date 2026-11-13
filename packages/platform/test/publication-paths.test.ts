import { expect, test } from "vitest";
import { DEVICE_COMMAND } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { PUBLICATION_PATHS, applicationCapabilities, prefixesOverlap, readPublicationPrefixes, withinPublicationPrefixes } from "../src/index.ts";

const declared = (prefixes: unknown) => readPublicationPrefixes({ prefixes });

test("a declaration admits one to eight ascending literal directory prefixes and nothing else", () => {
  expect(declared(["shelf/"])).toEqual(["shelf/"]);
  expect(declared(["a/", "docs/site/", "shelf/"])).toEqual(["a/", "docs/site/", "shelf/"]);
  expect(declared(Array.from({ length: 8 }, (_, n) => `p${n}/`))).toHaveLength(8);
  for (const prefixes of [
    [], Array.from({ length: 9 }, (_, n) => `p${n}/`), ["shelf"], ["/shelf/"], ["/"], [""], ["shelf//"], ["./shelf/"], ["shelf/../x/"],
    ["shelf/*/"], ["shelf?/"], [".git/"], ["x/.GIT/"], [".github/"], [".GitHub/workflows/"], [`${"a".repeat(256)}/`],
    ["b/", "a/"], ["a/", "a/"], ["a/", "a/b/"], ["a/", 7],
  ]) expect(declared(prefixes), JSON.stringify(prefixes)).toBeNull();
  expect(readPublicationPrefixes({ prefixes: ["a/"], extra: true })).toBeNull();
  expect(readPublicationPrefixes(["a/"])).toBeNull();
});

test("a path stands inside a prefix by whole path segments", () => {
  expect(withinPublicationPrefixes("shelf/book.md", ["shelf/"])).toBe(true);
  expect(withinPublicationPrefixes("shelf/a/b.md", ["shelf/"])).toBe(true);
  for (const path of ["shelf-other/book.md", "shelf", "shelf/", "shelf//book.md", "shelf/../AGENTS.md", "shelf/./b.md", "other/shelf/book.md", 3])
    expect(withinPublicationPrefixes(path, ["shelf/"]), String(path)).toBe(false);
  expect(prefixesOverlap(["shelf/"], ["shelf/old/"])).toBe(true);
  expect(prefixesOverlap(["shelf/"], ["shelf-old/"])).toBe(false);
});

const device = { name: DEVICE_COMMAND, bounds: { kinds: ["fan"], owners: 1 } };
const publication = { name: PUBLICATION_PATHS, bounds: { prefixes: ["shelf/"] } };
const root = { id: `sha256:${"1".repeat(64)}`, bytes: canonicalize({ capabilities: [{ name: "device-command", version: 1 }] }) as string } as const;
const plain = { id: `sha256:${"2".repeat(64)}`, bytes: canonicalize({ capabilities: [] }) as string } as const;

test("Rules 15 admits exactly four capability sets", () => {
  expect(applicationCapabilities({ capabilities: [], definitions: [plain] as never })).toEqual({ device: null, publication: null });
  expect(applicationCapabilities({ capabilities: [publication], definitions: [plain] as never })).toEqual({ device: null, publication: ["shelf/"] });
  expect(applicationCapabilities({ capabilities: [device], definitions: [root] as never })).toMatchObject({ device: { bounds: { kinds: ["fan"] } }, publication: null });
  expect(applicationCapabilities({ capabilities: [device, publication], definitions: [root] as never })).toMatchObject({ device: { definitions: [root.id] }, publication: ["shelf/"] });
  expect(applicationCapabilities({ capabilities: [publication, publication], definitions: [plain] as never })).toBeNull();
  expect(applicationCapabilities({ capabilities: [{ name: "hold@2", bounds: {} }], definitions: [plain] as never })).toBeNull();
  expect(applicationCapabilities({ capabilities: [{ ...publication, bounds: { prefixes: [".github/"] } }], definitions: [plain] as never })).toBeNull();
  expect(applicationCapabilities({ capabilities: [{ ...device, bounds: { kinds: ["fan"], owners: 2 } }, publication], definitions: [root] as never })).toBeNull();
});
