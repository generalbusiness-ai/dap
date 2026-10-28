/** Optional operator configuration. An absent trust list admits no package. */
import type { PublicOriginBindings } from "../public-origin.ts";
export interface ApplicationBindings extends PublicOriginBindings {
  APPLICATION_CONTENT?: R2Bucket; APPLICATION_TRUST?: string;
  /** Exact nonsecret per-installation sandbox/room descriptors. */
  APPLICATION_SCREEN_HOSTS?: string;
}
