// The reader that a ScopeHandle was built with, kept out of the root entry's reach of the Replica.
import type { Session } from "./session.ts";

const readers = new WeakMap<object, (session: Session) => boolean>();

/** ScopeHandle registers the actual constructor reader. No token leaves this closure. */
export function registerScopeReader(handle: object, reader: unknown): void {
  readers.set(handle, session => typeof reader === "string" && reader === session.reader());
}
export function scopeUsesSession(handle: object, session: Session): boolean {
  return readers.get(handle)?.(session) === true;
}
