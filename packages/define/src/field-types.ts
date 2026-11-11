/** A document or entry citation with an opaque UTF-8 fragment byte bound. */
export const reference = <const M extends number>(fragment: M) =>
  ({ type: "reference", fragment }) as const;
