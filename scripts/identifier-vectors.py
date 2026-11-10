#!/usr/bin/env python3
"""Independent public TEST vectors; imports no dap code and never reads a key file.

Ed25519 arithmetic follows RFC 8032 section 6. Section 7.1's first three
known answers check this TEST-only signer before any output is written.
https://www.rfc-editor.org/rfc/rfc8032.html#section-6
This illustrative arithmetic is not a production signer or key-custody tool.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path

P = 2**255 - 19
L = 2**252 + 27742317777372353535851937790883648493
D = -121665 * pow(121666, P - 2, P) % P
I = pow(2, (P - 1) // 4, P)


def recover_x(y, sign):
    if y >= P:
        raise ValueError("Noncanonical TEST point")
    square = (y * y - 1) * pow(D * y * y + 1, P - 2, P) % P
    x = pow(square, (P + 3) // 8, P)
    if (x * x - square) % P:
        x = x * I % P
    if (x * x - square) % P or x == 0 and sign:
        raise ValueError("Invalid TEST point")
    return P - x if (x & 1) != sign else x


BASE_Y = 4 * pow(5, P - 2, P) % P
BASE_X = recover_x(BASE_Y, 0)
BASE = (BASE_X, BASE_Y, 1, BASE_X * BASE_Y % P)


def add(a, b):
    aa = (a[1] - a[0]) * (b[1] - b[0]) % P
    bb = (a[1] + a[0]) * (b[1] + b[0]) % P
    cc = 2 * a[3] * b[3] * D % P
    dd = 2 * a[2] * b[2] % P
    e, f, g, h = bb - aa, dd - cc, dd + cc, bb + aa
    return e * f % P, g * h % P, f * g % P, e * h % P


def multiply(scalar, point):
    result = (0, 1, 1, 0)
    while scalar:
        if scalar & 1:
            result = add(result, point)
        point = add(point, point)
        scalar >>= 1
    return result


def compress(point):
    inverse = pow(point[2], P - 2, P)
    x, y = point[0] * inverse % P, point[1] * inverse % P
    return (y | ((x & 1) << 255)).to_bytes(32, "little")


def expand(public_test_seed):
    if len(public_test_seed) != 32:
        raise ValueError("A public TEST seed has 32 bytes")
    hashed = hashlib.sha512(public_test_seed).digest()
    scalar = int.from_bytes(hashed[:32], "little") & ((1 << 254) - 8)
    return scalar | (1 << 254), hashed[32:]


def public_key(public_test_seed):
    scalar, _ = expand(public_test_seed)
    return compress(multiply(scalar, BASE))


def sign(public_test_seed, message):
    scalar, prefix = expand(public_test_seed)
    public = compress(multiply(scalar, BASE))
    nonce = int.from_bytes(hashlib.sha512(prefix + message).digest(), "little") % L
    r = compress(multiply(nonce, BASE))
    challenge = int.from_bytes(hashlib.sha512(r + public + message).digest(), "little") % L
    return r + ((nonce + challenge * scalar) % L).to_bytes(32, "little")


# Published RFC 8032 section 7.1 TEST material. These are not custody keys.
RFC_ANSWERS = [
    (
        "9d61b19deffd5a60ba844af492ec2cc4" "4449c5697b326919703bac031cae7f60",
        "", "d75a980182b10ab7d54bfed3c964073a" "0ee172f3daa62325af021a68f707511a",
        "e5564300c360ac729086e2cc806e828a" "84877f1eb8e5d974d873e06522490155"
        "5fb8821590a33bacc61e39701cf9b46b" "d25bf5f0595bbe24655141438e7a100b",
    ),
    (
        "4ccd089b28ff96da9db6c346ec114e0f" "5b8a319f35aba624da8cf6ed4fb8a6fb",
        "72", "3d4017c3e843895a92b70aa74d1b7ebc" "9c982ccf2ec4968cc0cd55f12af4660c",
        "92a009a9f0d4cab8720e820b5f642540" "a2b27b5416503f8fb3762223ebdb69da"
        "085ac1e43e15996e458f3613d0f11d8c" "387b2eaeb4302aeeb00d291612bb0c00",
    ),
    (
        "c5aa8df43f9f837bedb7442f31dcb7b1" "66d38535076f094b85ce3a2e0b4458f7",
        "af82", "fc51cd8e6218a1a38da47ed00230f058" "0816ed13ba3303ac5deb911548908025",
        "6291d657deec24024827e69c3abe01a3" "0ce548a284743a445e3680d7db5ac3ac"
        "18ff9b538d16f290ae67f760984dc659" "4a7c15e9716ed28dc027beceea1ec40a",
    ),
]


def check_signer():
    for seed, message, public, signature in RFC_ANSWERS:
        public_test_seed, raw = bytes.fromhex(seed), bytes.fromhex(message)
        if public_key(public_test_seed).hex() != public or sign(public_test_seed, raw).hex() != signature:
            raise ValueError("Independent RFC 8032 known answer failed")


def canonical(value):
    """Exact JCS for these ASCII-key, safe-integer fixtures, not general JCS."""
    def admitted(item):
        if item is None or isinstance(item, bool):
            return
        if isinstance(item, int) and abs(item) <= 2**53 - 1:
            return
        if isinstance(item, str):
            item.encode("utf-8", "strict")
            return
        if isinstance(item, list):
            for child in item:
                admitted(child)
            return
        if isinstance(item, dict):
            for key, child in item.items():
                if not isinstance(key, str) or not key.isascii():
                    raise ValueError("Fixture keys must be ASCII")
                admitted(child)
            return
        raise ValueError("Outside the independent fixture JSON domain")
    admitted(value)
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode("utf-8")


def b64url(value):
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def hashed(format_name, raw):
    if format_name == "dap1":
        return hashlib.sha256(b"artroom-entry-1\n" + raw).hexdigest()
    framed = b"commit " + str(len(raw)).encode("ascii") + b"\0" + raw
    return (hashlib.sha1 if format_name == "git" else hashlib.sha256)(framed).hexdigest()


def encoded(raw, binary=False):
    return {"encoding": "base64", "bytes": base64.b64encode(raw).decode("ascii")} if binary else {"encoding": "utf-8", "bytes": raw.decode("utf-8")}


def signed_intent(seed, kind, at):
    intent = {"actor": "key_" + b64url(public_key(seed)), "kind": kind, "at": at,
              "fields": {"label": "TEST public citation vectors"}, "expected": []}
    return {"intent": intent, "sig": b64url(sign(seed, b"artroom-intent-1\n" + canonical(intent)))}


def dap_sequence():
    public_test_seed = bytes.fromhex(RFC_ANSWERS[0][0])
    scope = "sc_" + "a" * 52
    genesis = {"seq": 0, "prev": None, "time": "2026-11-10T00:00:00Z",
               "input": {"type": "genesis", "nonce": base64.b32encode(bytes(16)).decode("ascii").lower().rstrip("="),
                         "seed": {"kind": "TEST-vector", "fields": {"label": "not a deployed room"}},
                         "founding": signed_intent(public_test_seed, "found", {"scope": scope, "genesis": None})},
               "uses": [], "effects": [], "sends": []}
    raws = [canonical(genesis)]
    genesis_digest = hashed("dap1", raws[0])
    for position, kind in [(1, "act"), (2, "preparation"), (3, "delivery")]:
        input_value = {"type": kind}
        if kind in ("act", "preparation"):
            input_value["signed"] = signed_intent(public_test_seed, "TEST-" + kind, {"scope": scope, "genesis": "sha256:" + genesis_digest})
        else:
            input_value["message"] = {"type": "tell", "fields": {"text": "unsigned TEST delivery"}}
        value = {"seq": position, "genesis": "sha256:" + genesis_digest, "prev": "sha256:" + hashed("dap1", raws[-1]),
                 "time": "2026-11-10T00:00:0%dZ" % position, "input": input_value, "uses": [], "effects": [], "sends": []}
        raws.append(canonical(value))
    other = json.loads(raws[0])
    other["input"]["nonce"] = base64.b32encode(bytes([1]) * 16).decode("ascii").lower().rstrip("=")
    other["input"]["founding"] = None
    return raws, canonical(other)


def git_sequence(format_name):
    algorithm = hashlib.sha1 if format_name == "git" else hashlib.sha256
    tree = algorithm(b"tree 0\0").hexdigest()
    def commit(parents, message, second):
        header = "tree " + tree + "\n" + "".join("parent " + p + "\n" for p in parents)
        header += "author Public TEST <test@example.invalid> 179426880%d +0000\n" % second
        header += "committer Public TEST <test@example.invalid> 179426880%d +0000\n\n" % second
        return (header + message + "\n").encode("utf-8")
    other = commit([], "TEST other genesis", 9)
    raws = [commit([], "TEST genesis", 0)]
    for position in range(1, 4):
        parents = [hashed(format_name, raws[-1])]
        if position == 2:
            parents.append(hashed(format_name, other))
        raws.append(commit(parents, "TEST event %d: caf\u00e9" % position, position))
    return raws, other


def cases_for(format_name, raws, other):
    digests = [hashed(format_name, raw) for raw in raws]
    genesis, other_digest = digests[0], hashed(format_name, other)
    level = 3 if format_name == "dap1" else 2
    sequence_id = "did:seq:%s:%s" % (format_name, genesis)
    def cite(position, event=None, root=None):
        return "did:seq:%s:%s/%d/%s" % (format_name, root or genesis, position, event or digests[position])
    def source(indices):
        return [{"digest": digests[i], **encoded(raws[i], i % 2 == 1)} for i in indices]
    cases = []
    def case(name, citation, event, predecessors, requested, result, reached, reason=None, anchors=None, depth=None, anchor=None, trusts=None):
        cases.append({"name": name, "citation": citation, "requested": requested, "event": event, "source": predecessors,
                      "anchors": anchors or [], "depth": depth,
                      "expect": {"citation": citation, "requested": requested, "result": result, "reached": reached, "reason": reason, "anchor": anchor, "trusts": trusts or []}})
    for position, raw in enumerate(raws):
        case("valid-event-%d" % position, cite(position), encoded(raw, position % 2 == 1), source(range(position)), level, "ok", level, anchor="genesis")
    case("bytes-only", cite(3), encoded(raws[3]), [], 0, "ok", 0)
    case("fields-only", cite(3), encoded(raws[3]), [], 1, "ok", 1)
    if format_name != "dap1":
        case("no-signature-profile", cite(3), encoded(raws[3]), source(range(3)), 3, "incomplete", 2, "profile", anchor="genesis")
    bad_syntax = [
        ("uppercase-digest", cite(3, digests[3].upper())),
        ("leading-zero-position", sequence_id + "/03/" + digests[3]),
        ("overflow-position", sequence_id + "/9007199254740992/" + digests[3]),
        ("fragment-not-event-path", sequence_id + "/3#" + digests[3]),
        ("trailing-newline", cite(3) + "\n"),
    ]
    for name, citation in bad_syntax:
        case(name, citation, encoded(raws[3]), source(range(3)), level, "invalid", None, "syntax")
    unknown = "did:seq:unknown:%s/3/%s" % (genesis, digests[3])
    case("unknown-format", unknown, encoded(raws[3]), source(range(3)), level, "incomplete", None, "format")
    changed = raws[3][:-1] + bytes([raws[3][-1] ^ 1])
    case("changed-cited-bytes", cite(3), encoded(changed), source(range(3)), level, "mismatch", None, "digest")
    if format_name == "dap1":
        wrong_position = json.loads(raws[3]); wrong_position["seq"] = 8
        raw = canonical(wrong_position)
        case("wrong-position", cite(3, hashed(format_name, raw)), encoded(raw), source(range(3)), level, "mismatch", 0, "position")
        foreign = json.loads(raws[3]); foreign["genesis"] = "sha256:" + other_digest
        raw = canonical(foreign)
        case("different-sequence", cite(3, hashed(format_name, raw)), encoded(raw), source(range(3)), level, "mismatch", 0, "sequence")
    else:
        case("wrong-position", cite(4, digests[3]), encoded(raws[3]), source(range(3)), level, "mismatch", 1, "position")
        case("different-genesis", cite(3, root=other_digest), encoded(raws[3]), source(range(3)), level, "mismatch", 1, "genesis")
    middle = source(range(3)); middle[2] = {"digest": digests[2], **encoded(raws[2] + b" ")}
    case("changed-middle-under-old-digest", cite(3), encoded(raws[3]), middle, level, "mismatch", 1, "digest")
    case("missing-middle", cite(3), encoded(raws[3]), source([0, 1]), level, "incomplete", 1, "unavailable")
    case("held-middle-is-not-anchor", cite(3), encoded(raws[3]), source([2]), level, "incomplete", 1, "unavailable")
    middle_anchor = cite(2)
    case("explicit-middle-anchor", cite(3), encoded(raws[3]), source([2]), level, "ok", level, anchors=[middle_anchor], anchor=middle_anchor, trusts=[middle_anchor])
    case("wrong-middle-anchor", cite(3), encoded(raws[3]), source(range(3)), level, "mismatch", 1, "anchor", anchors=[cite(2, other_digest)])
    case("foreign-anchor-ignored", cite(3), encoded(raws[3]), source(range(3)), level, "ok", level, anchors=[cite(2, root=other_digest)], anchor="genesis")
    case("short-depth", cite(3), encoded(raws[3]), source(range(3)), level, "incomplete", 1, "depth", depth=2)
    case("genesis-at-zero-depth", cite(0), encoded(raws[0]), [], level, "ok", level, depth=0, anchor="genesis")
    case("anchor-edge-needs-depth", cite(3), encoded(raws[3]), source([2]), level, "incomplete", 1, "depth", depth=0, anchors=[middle_anchor])
    case("missing-cited-event", cite(3), None, source(range(3)), level, "incomplete", None, "unavailable")
    if format_name == "dap1":
        changed_signature = json.loads(raws[2])
        sig = changed_signature["input"]["signed"]["sig"]
        raw_sig = base64.urlsafe_b64decode(sig + "==")
        changed_signature["input"]["signed"]["sig"] = b64url(bytes([raw_sig[0] ^ 1]) + raw_sig[1:])
        raw = canonical(changed_signature)
        case("changed-signature-correct-event-digest", cite(2, hashed(format_name, raw)), encoded(raw), source([0, 1]), 3, "mismatch", 2, "signature", anchor="genesis")
        unsigned = "did:seq:dap1:%s/0/%s" % (other_digest, other_digest)
        case("unsigned-founding-null", unsigned, encoded(other), [], 3, "ok", 3, anchor="genesis")
        malformed = b"not an entry"
        malformed_digest = hashed(format_name, malformed)
        case("well-hashed-malformed-entry", cite(3, malformed_digest), encoded(malformed), source(range(3)), level, "mismatch", 0, "position")
        no_prev = json.loads(raws[3]); no_prev.pop("prev")
        raw = canonical(no_prev)
        case("well-hashed-entry-missing-prev", cite(3, hashed(format_name, raw)), encoded(raw), source(range(3)), level, "mismatch", 1, "position")
        # The same malformed-entry rule must retain the cited level1 success.
        cites_malformed = json.loads(raws[3]); cites_malformed["prev"] = "sha256:" + malformed_digest
        raw = canonical(cites_malformed)
        case("well-hashed-malformed-predecessor", cite(3, hashed(format_name, raw)), encoded(raw), [{"digest": malformed_digest, **encoded(malformed)}], level, "mismatch", 1, "position")
    sequence = {"id": sequence_id, "events": [{"position": i, "digest": digests[i], **encoded(raw, i % 2 == 1)} for i, raw in enumerate(raws)]}
    return sequence, cases


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="new external output directory; never overwrite published vectors")
    args = parser.parse_args()
    if args.output.exists():
        parser.error("the output directory must not exist")
    check_signer()
    dap_raws, dap_other = dap_sequence()
    prepared = {"dap1": cases_for("dap1", dap_raws, dap_other)}
    for name in ["git", "git256"]:
        raws, other = git_sequence(name)
        prepared[name] = cases_for(name, raws, other)
    args.output.mkdir(mode=0o700)
    manifest = []
    for format_name, (sequence, cases) in prepared.items():
        directory = args.output / format_name
        directory.mkdir(mode=0o700)
        for name, value in [("sequence.json", sequence), ("cases.json", cases)]:
            path = directory / name
            raw = (json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode("utf-8")
            with path.open("xb") as stream:
                stream.write(raw)
            manifest.append({"path": str(path.relative_to(args.output)), "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)})
    print(json.dumps({"status": "produced", "independentRfc8032KnownAnswers": 3, "cases": {name: len(pair[1]) for name, pair in prepared.items()}, "files": manifest}, indent=2))


if __name__ == "__main__":
    main()
