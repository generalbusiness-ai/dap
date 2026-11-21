# Refuse expired hosted controls before Agent reads

An expired, validly signed grant, connection control, bearer rotation, or
retirement now refuses before the Agent reads its row. Each route keeps its
normal binding and authority checks for current requests, and checks the
deadline again after authority reads. A missing Agent remains a 404 for a
current request.

Each operation reserves 4 KiB of the Agent's durable control budget before
it starts. The reservation covers its row and answer; an answer that exceeds
it costs more. Every distinct operation can add one durable control row.
Answer expiry removes the answer bytes, but the row and its remaining charge
stay. The row fences a freshly signed retry with the same operation ID: the
fingerprint excludes the signature and deadline, so a later deadline alone
cannot make that ID new. Pending reservations stay too. Deleting those rows
would change the at-most-once contract.

The Agent has a 16 MiB aggregate control budget, with the final 1 MiB reserved
for retirement. Answer expiry does not bound the number of durable rows over
the Agent's lifetime. Controller shares and safe release of retained row
charges remain open; this change does not alter either policy or the reserve.

The local SQLite witness signs each of the five operations, checks the exact
deadline, and counts Agent-row reads. It also checks that a current request
still reaches the missing-row 404. Its clock and outside authority are test
stand-ins; it makes no host or provider request.
