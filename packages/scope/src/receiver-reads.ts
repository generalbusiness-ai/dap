import { answersVersionQuestion, partitionPublicationOrigin, type PartitionCreation } from "@generalbusiness/dap-platform";
/** One receiver's read interpretation. The receiver's checked native birth
 * selects its policy, and all promotion proofs share that operation's budget. */
import type { DeclaredDefinition, Digest, Entry, FactRef, Input, PlatformDefinition, ScopeRef } from "@generalbusiness/dap-contract";
import { isPlatformDefinition, isScopeRef, scopeIdOf, type CheckedSequence } from "@generalbusiness/dap-bytes";

import { isEntryOf, isFactRef, isLocalId, isObject, same, sentBy, type ClassifiedRetainedUse, type Delivered, type RetainedResultOperand } from "@generalbusiness/dap-derive";
import { PartitionProofOperation, type PartitionProofPorts } from "./partition-proof.ts";
import type { Foreign, Ports, Resolver, SourceReadContext } from "./ports.ts";
import { receiverName } from "./receiver-facts.ts";

const positiveSource = (entry: Entry): boolean => entry.input.type !== "genesis" || entry.input.decision === "applied";

export class ReceiverReads implements Resolver {
  private constructor(readonly resolver: Resolver, readonly proof: PartitionProofOperation | null, readonly mode: "legacy" | "partition-v1", readonly at: ScopeRef | null = null) {}
  static async open(ports: PartitionProofPorts & { resolver: Resolver }, at: ScopeRef): Promise<ReceiverReads | null> {
    const proof = new PartitionProofOperation(ports), selected = await proof.receiver(at);
    return selected ? new ReceiverReads(ports.resolver, proof, selected.policy.mode, at) : null;
  }
  /** The local pin/genesis are read by Scope from its own admitted store.
   * A known older native pin, or a declaration without a directory locator,
   * cannot belong to this factory. Positive selection still needs full proof. */
  static async forReceiver(ports: Pick<Ports, "resolver" | "proofs" | "births">, at: ScopeRef, named: Digest | PlatformDefinition, birth: Extract<Input, { type: "genesis" }>): Promise<ReceiverReads | null> {
    // Scope admitted this genesis against its own full reference; the seed still names this scope and pin.
    if (birth.decision !== "applied" || birth.seed.definition !== named || scopeIdOf(birth.seed) !== at.scope) return null;
    const candidate = isPlatformDefinition(named)
      ? answersVersionQuestion(named, "partitionReceiverCandidate")
      : isObject(birth.message?.body) && isScopeRef(birth.message.body["directory"]);
    if (!candidate) return new ReceiverReads(ports.resolver, null, "legacy", at);
    if (!ports.births || !ports.proofs) return null;
    return ReceiverReads.open({ resolver: ports.resolver, births: ports.births, proofs: ports.proofs }, at);
  }
  static async probeCreation(ports: Pick<Ports, "resolver" | "proofs" | "births">, creation: PartitionCreation): Promise<{ operation?: PartitionProofOperation; source?: { entry: Entry; sequence: CheckedSequence } } | null> {
    const named = creation.seed.definition;
    const possible = isPlatformDefinition(named)
      ? answersVersionQuestion(named, "partitionCreationProbeCandidate")
      : isObject(creation.message.body) && isScopeRef(creation.message.body["directory"]);
    if (!possible) return {};
    if (!ports.births || !ports.proofs) return null;
    const operation = new PartitionProofOperation({ births: ports.births, proofs: ports.proofs });
    const candidate = await operation.creationCandidate(creation);
    if (candidate === null) return null;
    if (!candidate) return { operation };
    const source = await operation.raw(creation.source);
    return source ? { operation, source: { entry: source.entry, sequence: source.sequence } } : null;
  }
  static async forCreation(ports: Pick<Ports, "resolver" | "proofs" | "births">, creation: PartitionCreation, definition: DeclaredDefinition | PlatformDefinition, operation?: PartitionProofOperation): Promise<ReceiverReads | null> {
    const candidate = typeof definition === "string"
      ? answersVersionQuestion(definition, "partitionCreationCandidate")
      : isObject(creation.message.body) && isScopeRef(creation.message.body["directory"]);
    if (!candidate) return new ReceiverReads(ports.resolver, null, "legacy");
    if (!ports.births || !ports.proofs) return null;
    const proof = operation ?? new PartitionProofOperation({ births: ports.births, proofs: ports.proofs }), selected = await proof.bootstrap(creation, definition);
    return selected ? new ReceiverReads(ports.resolver, proof, selected.policy.mode) : null;
  }
  async publication(from: FactRef, root: ScopeRef, destination: ScopeRef, kind: "application" | "change"): Promise<boolean | null> {
    if (this.mode !== "partition-v1" || !this.proof) return null;
    const proof = await this.proof.lane(from);
    const result = proof ? partitionPublicationOrigin(from, root, destination, kind, proof.frames) : null;
    return this.proof.active() ? result : null;
  }
  /** The receiver's name for one retained fact: its stored producer in legacy mode, or the partition proof's receiver label. */
  async #interpret(fact: FactRef, producer: string | undefined): Promise<string | null> {
    if (this.mode === "legacy") return typeof producer === "string" ? producer : null;
    const selected = await this.proof?.source(fact);
    return selected && positiveSource(selected.source.entry) ? selected.under : null;
  }
  async read(fact: FactRef, context: SourceReadContext, origin: boolean): Promise<Foreign> {
    if (this.mode === "partition-v1") {
      const selected = await this.proof?.source(fact);
      return selected && positiveSource(selected.source.entry) ? receiverName({ entry: selected.source.entry, under: selected.producer, sequence: selected.source.sequence }, selected.under) : null;
    }
    const read = await this.resolver.read(fact, context, origin);
    return read !== null && "entry" in read && !isEntryOf(read.entry, fact, read.sequence) ? null : read;
  }
  /** A refused genesis is only negative evidence for its exact parent send.
   * It receives no semantic source label and cannot enter ordinary fact reads. */
  async result(delivered: Delivered, context: SourceReadContext): Promise<Foreign> {
    if (delivered.message.class !== "result") return null;
    if (this.mode === "legacy") return this.read(delivered.from, context, false);
    const selected = await this.proof?.source(delivered.from);
    if (!selected) return null;
    if (positiveSource(selected.source.entry)) return receiverName({ entry: selected.source.entry, under: selected.producer, sequence: selected.source.sequence }, selected.under);
    const born = selected.source.entry.input, message = delivered.message;
    if (born.type !== "genesis" || born.decision !== "refused" || !this.at || !isScopeRef(delivered.to) || !same(delivered.to, this.at)
      || !same(born.seed.creator, this.at) || !isFactRef(born.source) || !isObject(message.of) || !isFactRef(message.of.from) || !isLocalId(message.of.n) || !same(message.of.from, born.source) || message.of.n !== born.n
      || message.outcome !== "refused" || !sentBy(selected.source.entry, delivered)) return null;
    return receiverName({ entry: selected.source.entry, under: selected.producer, sequence: selected.source.sequence }, "");
  }
  /** A retained alias is checked metadata, never a receiver policy. Each use
   * derives its receiver name again; the retained use, its bytes and its stored
   * producer stay unchanged. Legacy reads name a use by its stored producer. A
   * partition receiver keeps its paid proof.source lookup (ruling 222a5b21). */
  async retained(uses: readonly ClassifiedRetainedUse[]): Promise<RetainedResultOperand[] | null> {
    const operands = await Promise.all(uses.map(async (classified): Promise<RetainedResultOperand | null> => {
      const under = await this.#interpret(classified.use.fact, classified.use.producer.name);
      return under === null ? null : { classified, under };
    }));
    return operands.every((operand): operand is RetainedResultOperand => operand !== null) ? operands : null;
  }
}
