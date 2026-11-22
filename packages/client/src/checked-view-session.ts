/** E3 trusts only the unmodified checked answer that produced this Session. */
import { same } from "@generalbusiness/dap-bytes";
import type { SessionClaims } from "@generalbusiness/dap-contract";
import type { Session, SessionStanding } from "./session.ts";

const answers = new WeakMap<Session, { reader: string; claims: SessionClaims; standing: SessionStanding }>();

/** Called only at the requestSession answer boundary. */
export function recordViewSession(session: Session, standing: SessionStanding): void {
  answers.set(session, { reader: session.reader(), claims: structuredClone(session.claims), standing: structuredClone(standing) });
}

export function checkedViewSession(session: Session): boolean {
  const held = answers.get(session);
  if (!held) return false;
  try { return session.reader() === held.reader && same(session.claims, held.claims) && same(session.standing, held.standing); }
  catch { return false; }
}
