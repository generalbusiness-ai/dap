/** Optional operator configuration. An absent trust list admits no package. */
export interface ApplicationBindings {
  APPLICATION_CONTENT?: R2Bucket; APPLICATION_TRUST?: string;
  /** Exact nonsecret per-installation sandbox/room descriptors. */
  APPLICATION_SCREEN_HOSTS?: string;
}
