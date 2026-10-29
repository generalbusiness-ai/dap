/** Public immutable checkout data, independent of a live reservation or credential. */
export interface OwnedCheckoutSnapshot {
  base: string;
  commit: string;
  tree: string;
  objects: readonly { id: string; type: "blob" | "tree" | "commit"; data: Uint8Array }[];
}
