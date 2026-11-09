---- MODULE Voice ----
EXTENDS Naturals
VARIABLES phase, marker, permit, speaks, proof, cleared
vars == <<phase, marker, permit, speaks, proof, cleared>>
Init == phase = "Armed" /\ marker = FALSE /\ permit = FALSE /\ speaks = 0 /\ proof = FALSE /\ cleared = FALSE
SaveStart == ~marker /\ marker'= TRUE /\ permit'= TRUE /\ phase'= "Audio marked" /\ UNCHANGED <<speaks, proof, cleared>>
Speak == permit /\ speaks < 2 /\ speaks'= speaks + 1 /\ permit'= FALSE /\ phase'= "Speaking" /\ UNCHANGED <<marker, proof, cleared>>
Interrupt == marker /\ ~proof /\ phase \in {"Audio marked", "Speaking"} /\ permit'= FALSE /\ phase'= "Audio uncertain" /\ UNCHANGED <<marker, speaks, proof, cleared>>
Complete == phase = "Speaking" /\ phase'= "Report unknown" /\ UNCHANGED <<marker, permit, speaks, proof, cleared>>
VerifyReport == phase = "Report unknown" /\ proof'= TRUE /\ phase'= "Report verified" /\ UNCHANGED <<marker, permit, speaks, cleared>>
Clear == proof /\ ~cleared /\ cleared'= TRUE /\ phase'= "Recorded" /\ UNCHANGED <<marker, permit, speaks, proof>>
Wait == phase \in {"Recorded", "Audio uncertain"} /\ UNCHANGED vars
Next == SaveStart \/ Speak \/ Interrupt \/ Complete \/ VerifyReport \/ Clear \/ Wait
NoReplay == speaks <= 1
ProofBeforeClear == cleared => proof
MarkBeforeSpeech == speaks > 0 => marker
====
