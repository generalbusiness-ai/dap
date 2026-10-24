# Application install trust before fetch

R10 binds MCP `install_application` to the operator's exact release,
publisher, and Git hostname. The shared `APPLICATION_TRUST` parser lives in
the client application module and is re-exported by Scope admission, so
native hosting and MCP use one schema without a dependency cycle.

MCP retains actual-target standing and tool selection before package work.
After bounded install input validation, it checks release and host before
opening any transport, then checks again after custody waits before building
a new envelope. The existing immutable URI grammar, SHA-1-only public host,
manual redirects, 4 MiB package bound and transport deadlines remain.
Three existing client signed-install builders accept an optional expected
publisher and compare the already-decoded manifest before signing. Existing
callers remain compatible; no second package decode is added.

The native resolver also checks the host row before its existing source-open
boundary. Content and screen readers share the new schema. This does not
implement R11 refusal of acts under a later revoked release, change retained
native authority, or add a new install route.

All configured two-field trust rows must be migrated to the exact
`{release,publisher,host}` schema before deployment. Absent lists stay closed;
old or malformed lists fail as a whole. Grow's existing row gains only
`github.com`. Local `dap mcp` and `dap install` need the same policy in their process environment
to install packages. The planner owns settings review and deployment with
`--keep-vars`; no binding or package dependency is added.

Source witnesses are prepared but unrun. One MCP Node case uses the actual
dispatch, custody and HTTPS Git opener with scripted room answers and an
outbound response stand-in: untrusted releases and wrong hosts send no
package request, a changed policy across the custody wait is rechecked,
and a trusted host's redirect is refused without a second request. Existing
client signing and native install-custody witnesses retain full package
integrity, publisher and native submission checks. Fixture trust rows gain
explicit TEST hosts; no membership or native authority is fabricated by the
new check.

Affected compilers, whole-file tests, actual maintained source seals, a
single host-check negative control, the ordinary gate and exact-head review
remain pending. The control baseline is null until the healthy affected run
is naturally closed and accepted. No runtime, parser, compiler, test,
control, dependency setup, commit, or deployment was performed during
source preparation. Base: R9 `ba8c3d121bf691336e645bbc6e3c164ab0608363`.
