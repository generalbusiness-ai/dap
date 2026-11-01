import { canonicalize, digestBytes, isDigest, utf8 } from "@generalbusiness/dap-bytes";
import type { Digest } from "@generalbusiness/dap-contract";
import type { ViewResources } from "./views/resources.ts";

export const PACKAGE_BRIEF_URI = "dap://package/brief";
export interface PackageBrief { readonly bytes: Uint8Array; readonly digest: Digest }

/** One fixed operator-supplied data resource, separate from executable UI resources. */
export class PackageResources {
  readonly generation: Digest;
  readonly #brief: { text: string; digest: Digest } | null;
  constructor(readonly views: ViewResources, brief?: PackageBrief) {
    this.#brief = null;
    if (brief) {
      if (!(brief.bytes instanceof Uint8Array) || brief.bytes.length > 65536 || !isDigest(brief.digest)) throw Error("Invalid package Brief bytes or digest.");
      const bytes = brief.bytes.slice();
      const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes), encoded = utf8(text);
      if (encoded.length !== bytes.length || encoded.some((byte, index) => byte !== bytes[index]) || digestBytes(bytes) !== brief.digest) throw Error("Package Brief bytes do not match their raw UTF-8 digest.");
      this.#brief = { text, digest: brief.digest };
    }
    this.generation = this.#brief ? digestBytes(utf8(canonicalize({ views: views.generation, brief: this.#brief.digest }))) : views.generation;
  }
  #metadata() { return { uri: PACKAGE_BRIEF_URI, name: "package-brief", description: "The fixed package Brief, as raw UTF-8 text.", mimeType: "text/plain" as const }; }
  list() { return { resources: [...this.views.list().resources, ...(this.#brief ? [this.#metadata()] : [])] }; }
  read(uri: string): ReturnType<ViewResources["read"]> | { contents: { uri: string; mimeType: "text/plain"; text: string; _meta?: never }[] } {
    if (uri !== PACKAGE_BRIEF_URI) return this.views.read(uri);
    if (!this.#brief) throw Error("No package Brief is configured.");
    return { contents: [{ uri, mimeType: "text/plain", text: this.#brief.text }] };
  }
}
