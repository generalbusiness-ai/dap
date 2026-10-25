# Share one paid archive row snapshot with adaptive planning

Request allocation: `ce0c956dfff242a87caeb7bd338077314cd09747`.

The local Room A-shaped reproduction confirmed sequence 147, then refused
148 with metadata used 2,846,036 plus finish quote 1,352,518: 4,250 over the
unchanged 4 MiB allowance. Its genuine native history has 37 published
commits through 146. Its entries and tree sizes differ from the hosted room;
this result does not establish the hosted refusal axis or a hosted fix.

Before adaptive planning, capacity deferral already serializes the checked
no-pending row and reserves its exact payload/wake comparisons. Adaptive
planning then separately reserves 32 KiB metadata and 256 KiB work solely
to serialize that same row for its byte length. The driver can now pass a
single-use row-owner snapshot instead of repeating that serialization.

Only the row owner's last parsed row under the same original budget is
eligible. Descriptor checks precede caller field access; canonical bytes
must still equal the owner's retained text. An independently parsed planning
row is frozen at every nested object. The opaque token binds that row, the
exact SQL port and original budget; copied, forged, reused or differently
bound tokens refuse. Missing tokens keep the original standalone path.
Older rows and rows created under another budget keep capacity persistence
without receiving a token. Large rows keep the original path when buying
custody would cost more than the duplicate serialization.

All new descriptor, clone, freeze, registry and byte-comparison work is
prepaid: fixed 4,096 metadata/work plus the existing snapshot and exact-row
comparison tariffs at the known row byte length. For length s, this adds
6s + 8,288 metadata and 24s + 8,192 work, replacing only the later adaptive
32,768/262,144 reservation. Actual capacity serialization, payload/wake CAS,
frontier validation, persistence cuts, entry bytes and all bounds remain.

The recorded preparation cost in native Mark.manifest can change. The public
v2 Git manifest excludes cost, so this alone does not change a fixed
selection's commit; a different adaptive cutoff can change the commit.
Pending rebuild follows the original exact manifest and its recorded work,
without applying today's planning optimization retroactively.

Existing witnesses are strengthened for token custody, mutation/accessor
refusal and standalone-tariff pending reconstruction. The existing local
shape witness retains bounded progress and exact remainder/drain checks;
its actual next cutoff must be measured. The installed lost-send/rebuild
witness continues to cover
the optimized driver's exact pending commit. All registrations and deadlines
are retained. These Source changes have not been compiled or executed;
actual seals, affected validation and the required review gate remain pending.
