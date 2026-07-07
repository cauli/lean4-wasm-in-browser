#!/usr/bin/env python3
"""Patch the declared maximum of the imported env.memory in a wasm binary.

The Lean fork's build disabled ALLOW_MEMORY_GROWTH, which hard-caps the
module's imported shared memory at initial=max=256 pages (16MB). Lean needs
far more. The cap lives in the import section as LEB128 limits, so we can
rewrite it without rebuilding: bump max (and leave initial alone) and
re-emit the import section with a recomputed size.
"""
import sys

NEW_MAX_PAGES = 32768  # 2GB


def read_leb(buf, pos):
    result = 0
    shift = 0
    while True:
        b = buf[pos]
        pos += 1
        result |= (b & 0x7F) << shift
        if not (b & 0x80):
            return result, pos
        shift += 7


def write_leb(value):
    out = bytearray()
    while True:
        b = value & 0x7F
        value >>= 7
        if value:
            out.append(b | 0x80)
        else:
            out.append(b)
            return bytes(out)


def patch(data):
    assert data[:4] == b"\x00asm", "not a wasm file"
    pos = 8
    out = bytearray(data[:8])
    patched = False
    while pos < len(data):
        sec_id = data[pos]
        sec_size, body_start = read_leb(data, pos + 1)
        body_end = body_start + sec_size
        body = data[body_start:body_end]
        if sec_id == 2 and not patched:
            body = patch_import_section(bytes(body))
            patched = True
        out.append(sec_id)
        out += write_leb(len(body))
        out += body
        pos = body_end
    assert patched, "no import section found"
    return bytes(out)


def patch_import_section(body):
    count, p = read_leb(body, 0)
    out = bytearray(body[:p])
    for i in range(count):
        entry_start = p
        mlen, p = read_leb(body, p)
        modname = body[p:p + mlen]; p += mlen
        flen, p = read_leb(body, p)
        field = body[p:p + flen]; p += flen
        kind = body[p]; p += 1
        if kind == 0x00:  # func
            _, p = read_leb(body, p)
            out += body[entry_start:p]
        elif kind == 0x01:  # table
            p += 1  # elem type
            flags = body[p]; p += 1
            _, p = read_leb(body, p)
            if flags & 1:
                _, p = read_leb(body, p)
            out += body[entry_start:p]
        elif kind == 0x02:  # memory
            flags = body[p]; p += 1
            initial, p = read_leb(body, p)
            maximum = None
            if flags & 1:
                maximum, p = read_leb(body, p)
            if modname == b"env" and field == b"memory":
                print(f"found env.memory: flags={flags:#x} initial={initial} "
                      f"max={maximum} pages ({(maximum or 0) * 64 // 1024}MB)")
                out += body[entry_start:entry_start + mlen + flen +
                            len(write_leb(mlen)) + len(write_leb(flen)) + 1]
                out.append(flags | 1)
                out += write_leb(initial)
                out += write_leb(NEW_MAX_PAGES)
                print(f"patched to: initial={initial} max={NEW_MAX_PAGES} pages "
                      f"({NEW_MAX_PAGES * 64 // 1024}MB)")
            else:
                out += body[entry_start:p]
        elif kind == 0x03:  # global
            p += 2  # type + mutability
            out += body[entry_start:p]
        elif kind == 0x04:  # tag
            p += 1
            _, p = read_leb(body, p)
            out += body[entry_start:p]
        else:
            raise AssertionError(f"unknown import kind {kind:#x} at entry {i}")
    return bytes(out)


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    with open(src, "rb") as f:
        data = f.read()
    result = patch(data)
    with open(dst, "wb") as f:
        f.write(result)
    print(f"wrote {dst} ({len(result)} bytes, was {len(data)})")
