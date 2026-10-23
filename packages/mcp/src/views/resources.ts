import { canonicalize, digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import type { Digest } from "@generalbusiness/dap-contract";
import { sandboxDomain } from "./hosts.ts";

export const VIEW_KINDS = ["needs-you", "work", "decision", "change"] as const;
/** The built-in journeys and bounded names from a verified declaration. */
export type ViewKind = string;
export const APP_MIME = "text/html;profile=mcp-app";

export interface ResourcePolicy {
  csp?: { connectDomains?: string[]; resourceDomains?: string[]; frameDomains?: string[]; baseUriDomains?: string[] };
  permissions?: { camera?: Record<string, never>; microphone?: Record<string, never>; geolocation?: Record<string, never>; clipboardWrite?: Record<string, never> };
  prefersBorder?: boolean;
}
export interface PresentationResource {
  uri: string;
  name: string;
  description: string;
  text: string;
  digest: Digest;
  /** The package's policy, preserved when served. */
  ui: ResourcePolicy;
}
export interface PresentationPackage {
  /** One DNS label, or omitted to use the presentation digest. */
  domain?: string;
  resources: readonly PresentationResource[];
}

/** An immutable package snapshot. Serving checks actual bytes against the package's declared digest. */
export class ViewResources {
  readonly generation: Digest;
  readonly #resources: PresentationResource[];
  readonly #domain: string;
  constructor(presentation: PresentationPackage) {
    this.#resources = structuredClone([...presentation.resources]);
    const uris = new Set<string>();
    for (const resource of this.#resources) {
      if (!resource.uri.startsWith("ui://") || uris.has(resource.uri)) throw new Error("Presentation resources need distinct ui:// URIs.");
      uris.add(resource.uri);
      if (utf8(resource.text).length > 1024 * 1024) throw new Error("Presentation resource exceeds one MiB.");
    }
    this.generation = digestBytes(utf8(canonicalize({ domain: presentation.domain ?? null, resources: this.#resources.map(({ text: _text, ...metadata }) => metadata) })));
    this.#domain = sandboxDomain(presentation.domain, this.generation);
  }
  #metadata(resource: PresentationResource) {
    return { uri: resource.uri, name: resource.name, description: resource.description, mimeType: APP_MIME, _meta: { ui: { ...structuredClone(resource.ui), domain: this.#domain } } };
  }
  list() { return { resources: this.#resources.map((resource) => this.#metadata(resource)) }; }
  read(uri: string) {
    const resource = this.#resources.find((entry) => entry.uri === uri);
    if (!resource) throw new Error("No presentation resource has that URI.");
    if (digestBytes(utf8(resource.text)) !== resource.digest) throw new Error("Presentation resource bytes do not match the package digest.");
    const { uri: name, mimeType, _meta } = this.#metadata(resource);
    return { contents: [{ uri: name, mimeType, text: resource.text, _meta }] };
  }
}
