/** The transport refusal for a whole retired store; never durable Agent state. */
export type RetiredStoreStop = Readonly<{ stop: "retired" }>;
export const RETIRED_STORE_STOP: RetiredStoreStop = Object.freeze({ stop: "retired" });

/** Admit only the closed wire stop, without invoking an accessor. */
export function isRetiredStoreStop(value: unknown): value is RetiredStoreStop {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || Reflect.ownKeys(value).length !== 1) return false;
  const word = Object.getOwnPropertyDescriptor(value, "stop");
  return word !== undefined && "value" in word && word.enumerable === true && word.value === "retired";
}
