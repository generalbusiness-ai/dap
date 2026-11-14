/** Test-only child protocol. All scope exchange stays on the parent's in-memory port. */
import type { MemberRef, ScopeApi, ScopeRef } from "@generalbusiness/dap-contract";
import type { BuiltPublication } from "./fold.ts";
import type { PublicationResult, PublisherOptions, Repository } from "./publisher.ts";

export const SCOPE_METHODS = ["create", "submit", "prepare", "settle", "summary", "items", "queryItems", "applicationProjection", "history", "entry", "outbox", "outboxItem", "log", "retained"] as const satisfies readonly (keyof ScopeApi)[];
export type ScopeMethod = typeof SCOPE_METHODS[number];
export type PublicationStage = Parameters<NonNullable<PublisherOptions["stage"]>>[0];

export interface ProcessConfig {
  /** Public TEST bytes supplied by the owning test, never a file or a member home. */
  seed: number[];
  target: ScopeRef;
  member: MemberRef;
  service: string;
  repository: Repository;
  bare: string;
  work: string;
  custody: string;
  now: number;
}

export type ParentMessage = { kind: "start"; config: ProcessConfig }
  | { kind: "reply"; id: number; value: unknown; error?: never }
  | { kind: "reply"; id: number; error: "fixed failure"; value?: never }
  | { kind: "resume"; id: number };

export type ChildMessage = { kind: "ready" }
  | { kind: "call"; id: number; method: ScopeMethod; args: readonly unknown[] }
  | { kind: "signed" }
  | { kind: "stage"; id: number; name: PublicationStage; publication?: BuiltPublication }
  | { kind: "result"; result: PublicationResult }
  | { kind: "error"; message: "fixed" };
