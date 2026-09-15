# dap — design and implementation notes

Project name for this phase: **dap**; system namespace `ai.generalbusiness.dap.`.

Dated notes (YYYY-MM-DD-title.md) to capture designs, implementation plans,
and discussion summaries.  Frontmatter "status" should be maintained.

Three notes, each owning one concern:

- [Evolving spaces](2026-09-14-evolving-spaces-design.md) — what the things
  are: referents, events, contexts, audiences, packages, authority, boundaries,
  invariants, precedents.
- [One series, many views](2026-09-14-one-series-many-views.md) — how many
  views share one order: the consistency property, a worked trace, the same
  property across applications, where authoring gets hard, the visibility spike.
- [Ordering](2026-09-14-ordering.md) — how a context gets, keeps, moves and
  hands over its order: trust and failure, the single-writer implementation,
  split/join protocols, the ordering spike.

Links into gitseq, atseq and noseq assume sibling checkouts beside this repository;
each cited note records the inspected commit.
