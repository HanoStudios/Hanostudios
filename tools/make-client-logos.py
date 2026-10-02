#!/usr/bin/env python3
"""Turn the supplied client artwork in `Client Logos/` into the site's logo set.

Run from the repo root:   python3 tools/make-client-logos.py

Why this exists: the logos arrive in mixed formats, sizes and — critically —
mixed polarity. The client grid sits on Void Black, so any logo whose artwork
is dark is invisible there, and any logo delivered as a JPEG carries an opaque
white background that renders as a glaring white box. Measured on the supplied
files:

    Bybit             SVG, wordmark #15182A (near-black)   -> handled separately
    Kalshi            RGBA, avg luminance 162 (light)      -> keep as-is
    Algorand          RGBA, avg luminance 0 (pure black)   -> whiten
    Pudgy Penguins    RGBA, penguin on a pale disc         -> keep as-is
    Onara             RGBA, avg luminance 161 (light)      -> keep as-is
    Abstract          JPEG, LIGHT mark inside a DARK badge
                      sitting on a #F6F7FB page            -> dropbg

Modes:
    keep        passthrough; artwork is already light and already has alpha
    whiten      keep the alpha channel, force RGB to white. For art that is
                pure black on transparent, where alpha already IS the shape.
    dropbg      flood-fill transparency inwards from the image edges, for
                opaque sources (JPEG) that carry a flat page background.

                Note this is deliberately NOT a luminance threshold. Abstract
                is a light mark inside a dark badge on a light page: keying on
                brightness would delete the mark along with the page, and
                inverting (which an earlier revision did) turned the badge into
                a solid white blob with the mark knocked out of it. Only a
                flood from the border distinguishes "light and connected to the
                edge" (page) from "light but enclosed" (the actual logo).

Output is a tightly-cropped transparent PNG, scaled to fit within 440x120 but
NOT padded out to it. The placeholders were all wide wordmarks, so a fixed
440x120 canvas suited them; the real set mixes wide wordmarks (Kalshi,
Algorand) with square roundels (Onara, Abstract, Pudgy Penguins), and padding
a square mark into a 440x120 box leaves ~75% of the width empty. The CSS then
constrains by width AND height, so wordmarks hit the width cap and roundels
hit the height cap, and both land at the same optical weight.

Pure stdlib apart from macOS `sips`, which is only used to normalise the source
into a PNG and pre-downscale it (some sources are 4501x4501). No Pillow, no
ImageMagick, no new dependency — per CLAUDE.md.
"""

import os
import struct
import subprocess
import sys
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "Client Logos")
OUT = os.path.join(ROOT, "assets", "img", "clients")
TMP = "/tmp/hano-logo-build"

# Upper bound on the exported artwork. Roughly 2x the largest on-screen size,
# so the marks stay crisp on high-DPI screens without shipping needless bytes.
BOX_W, BOX_H = 440, 120

JOBS = [
    # (source file,               output name,             mode)
    ("Kalshi.png",                "kalshi.png",            "keep"),
    ("Algorand.png",              "algorand.png",          "whiten"),
    # v2 of the wordmark. An earlier wordmark set "PENGUINS" in dark navy,
    # which measured as near-black ink and half-vanished on Void Black; this
    # one sets it pale (measured 237 luminance), so the whole mark reads.
    ("Pudgy Penguin Wordmark v2.png", "pudgy-penguins.png", "keep"),
    ("Onara Wordmark.png",        "onara.png",             "keep"),
    # The green wordmark, which is what the Figma shows. `Abstract.jpg` in the
    # same folder is the older dark-badge icon (a light mark inside a dark
    # badge on a white page) — kept there for reference, not built.
    ("Abstract Wordmark.png",     "abstract.png",          "keep"),
    ("Humanity Protocol.png",     "humanity-protocol.png", "keep"),
    # Ships on a near-black square (#1E1E1E) that would read as a subtle panel
    # against Void Black, so the background is flooded away.
    ("Levels Socials.png",        "levels-socials.png",    "dropbg"),
    ("Virtune.png",               "virtune.png",           "keep"),
    # Supplied only as the white Figma export. The case study draws it in the
    # client's green, sampled off their own artwork (the "FUTURE OF DEFI" type).
    ("Smardex.png",               "smardex.png",           "tint:3CF8B0"),
]

# The client wall (frame 226) draws every mark in plain white, but the files
# above are also the work-card titles and case-study logos, which keep the
# clients' own colours. So the wall gets its own white set in clients/grid/,
# built from the same sources. A mode may be a tuple, applied in order.
GRID = "grid"
GRID_JOBS = [
    ("Kalshi.png",                    "kalshi.png",            "whiten"),
    ("Algorand.png",                  "algorand.png",          "whiten"),
    # Pale letters with dark outlines: whitening the alpha would fill the
    # outlines in and leave a blob, so this one is greyscaled instead.
    ("Pudgy Penguin Wordmark v2.png", "pudgy-penguins.png",    "mono"),
    ("Levels Socials.png",            "levels-socials.png",    ("dropbg", "whiten")),
    ("SWJ.png",                       "swj.png",               "keep"),
    ("PwC.png",                       "pwc.png",               "keep"),
    ("Unilever.png",                  "unilever.png",          "keep"),
    ("Garmin.png",                    "garmin.png",            "keep"),
    ("Black Bananas.png",             "black-bananas.png",     "keep"),
    ("Abstract Wordmark.png",         "abstract.png",          "whiten"),
    ("Smardex.png",                   "smardex.png",           "keep"),
    ("Humanity Protocol.png",         "humanity-protocol.png", "whiten"),
    ("Virtune.png",                   "virtune.png",           "whiten"),
    ("Onara Wordmark.png",            "onara.png",             "whiten"),
    ("Trayler.png",                   "trayler.png",           "keep"),
    # White banner with black lettering on it — the black is the type, keep it.
    ("Ben & Jerrys.png",              "ben-jerrys.png",        "keep"),
]
# SWJ, PwC, Unilever, Garmin, Black Bananas, Smardex, Trayler and Ben & Jerry's
# were exported from the Figma already white, so they only exist in the grid set.

# Vector marks for the wall: the colour copies with their one coloured fill
# swapped to white. (source in clients/, output in clients/grid/, from, to)
GRID_SVGS = [
    ("bybit.svg", "#F6A500", "#FFFFFF"),   # the orange "I"
    ("maxy.svg",  "#F26B21", "#FFFFFF"),
]

# Bybit and Maxy stay vector — see the README. Both needed a fill fixed for a
# dark ground: Bybit's wordmark was #15182A, and Maxy's paths declared no fill
# at all, which SVG renders as black. Neither is rebuilt by this script.


# ---------------------------------------------------------------- PNG decode

def read_png(path):
    """Decode a non-interlaced 8-bit PNG (RGB or RGBA) to (w, h, rgba bytearray)."""
    data = open(path, "rb").read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a PNG: %s" % path)

    idat = b""
    w = h = color = None
    i = 8
    while i < len(data):
        (length,) = struct.unpack(">I", data[i:i + 4])
        ctype = data[i + 4:i + 8]
        body = data[i + 8:i + 8 + length]
        if ctype == b"IHDR":
            w, h, depth, color, _, _, interlace = struct.unpack(">IIBBBBB", body)
            if depth != 8 or interlace != 0 or color not in (2, 6):
                raise ValueError(
                    "need 8-bit non-interlaced RGB/RGBA, got depth=%d color=%d interlace=%d"
                    % (depth, color, interlace))
        elif ctype == b"IDAT":
            idat += body
        elif ctype == b"IEND":
            break
        i += 12 + length

    ch = 3 if color == 2 else 4
    raw = zlib.decompress(idat)
    stride = w * ch
    out = bytearray()
    prev = bytearray(stride)
    p = 0
    for _ in range(h):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p + stride]); p += stride
        if f:
            for x in range(stride):
                a = line[x - ch] if x >= ch else 0
                b = prev[x]
                c = prev[x - ch] if x >= ch else 0
                if f == 1:
                    line[x] = (line[x] + a) & 255
                elif f == 2:
                    line[x] = (line[x] + b) & 255
                elif f == 3:
                    line[x] = (line[x] + (a + b) // 2) & 255
                elif f == 4:
                    pa = a + b - c
                    da, db, dc = abs(pa - a), abs(pa - b), abs(pa - c)
                    pr = a if (da <= db and da <= dc) else (b if db <= dc else c)
                    line[x] = (line[x] + pr) & 255
        out += line
        prev = line

    if ch == 4:
        return w, h, out
    rgba = bytearray(w * h * 4)
    for i in range(w * h):
        rgba[i * 4:i * 4 + 3] = out[i * 3:i * 3 + 3]
        rgba[i * 4 + 3] = 255
    return w, h, rgba


def write_png(path, w, h, px):
    raw = bytearray()
    stride = w * 4
    for y in range(h):
        raw.append(0)
        raw += px[y * stride:(y + 1) * stride]

    def chunk(tag, body):
        return (struct.pack(">I", len(body)) + tag + body
                + struct.pack(">I", zlib.crc32(tag + body) & 0xFFFFFFFF))

    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
           + chunk(b"IEND", b""))
    open(path, "wb").write(png)


# ------------------------------------------------------------------ pipeline

def drop_background(w, h, px, tol=38):
    """Make the flat page background transparent by flooding in from the border.

    Only pixels that are BOTH close to the sampled corner colour AND reachable
    from an edge without crossing the artwork are cleared, so an enclosed mark
    of the same brightness as the page survives.
    """
    def at(x, y):
        o = (y * w + x) * 4
        return px[o], px[o + 1], px[o + 2]

    # Sample the four corners; the page colour is whatever they agree on.
    corners = [at(1, 1), at(w - 2, 1), at(1, h - 2), at(w - 2, h - 2)]
    br = sum(c[0] for c in corners) // 4
    bg = sum(c[1] for c in corners) // 4
    bb = sum(c[2] for c in corners) // 4

    seen = bytearray(w * h)
    stack = []
    for x in range(w):
        stack.append((x, 0)); stack.append((x, h - 1))
    for y in range(h):
        stack.append((0, y)); stack.append((w - 1, y))

    out = bytearray(px)
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        idx = y * w + x
        if seen[idx]:
            continue
        o = idx * 4
        if (abs(px[o] - br) + abs(px[o + 1] - bg) + abs(px[o + 2] - bb)) > tol:
            continue
        seen[idx] = 1
        out[o + 3] = 0
        stack.append((x + 1, y)); stack.append((x - 1, y))
        stack.append((x, y + 1)); stack.append((x, y - 1))
    return out


def recolour(w, h, px, mode):
    """Apply the polarity fix. See module docstring."""
    if isinstance(mode, tuple):
        for m in mode:
            px = recolour(w, h, px, m)
        return px
    if mode == "mono":
        # Greyscale, then stretch so anything mid-grey or lighter reads as white
        # and dark detail stays dark.
        out = bytearray(px)
        for i in range(0, len(out), 4):
            g = (out[i] * 3 + out[i + 1] * 6 + out[i + 2]) // 10
            g = max(0, min(255, (g - 50) * 255 // 90))
            out[i] = out[i + 1] = out[i + 2] = g
        return out
    if mode.startswith("tint:"):
        # Keep the alpha (the shape), paint every pixel one flat colour.
        hx = mode[5:]
        r, g, b = int(hx[0:2], 16), int(hx[2:4], 16), int(hx[4:6], 16)
        out = bytearray(px)
        for i in range(0, len(out), 4):
            out[i], out[i + 1], out[i + 2] = r, g, b
        return out
    if mode == "keep":
        return px
    if mode == "dropbg":
        return drop_background(w, h, px)
    if mode == "whiten":
        out = bytearray(px)
        for i in range(0, len(out), 4):
            out[i] = out[i + 1] = out[i + 2] = 255
        return out
    raise ValueError("unknown mode: %s" % mode)


def trim(w, h, px, thresh=8):
    """Crop fully-transparent margins so every logo is scaled by its ink, not
    by whatever padding happened to be baked into the file."""
    x0, y0, x1, y1 = w, h, -1, -1
    for y in range(h):
        row = y * w * 4
        for x in range(w):
            if px[row + x * 4 + 3] > thresh:
                if x < x0: x0 = x
                if x > x1: x1 = x
                if y < y0: y0 = y
                if y > y1: y1 = y
    if x1 < 0:
        return w, h, px
    nw, nh = x1 - x0 + 1, y1 - y0 + 1
    out = bytearray(nw * nh * 4)
    for y in range(nh):
        s = ((y + y0) * w + x0) * 4
        out[y * nw * 4:(y + 1) * nw * 4] = px[s:s + nw * 4]
    return nw, nh, out


def resize(w, h, px, tw, th):
    """Area-average downscale in premultiplied space, so transparent pixels
    can't bleed their (meaningless) colour into the edges."""
    out = bytearray(tw * th * 4)
    for ty in range(th):
        sy0 = ty * h // th
        sy1 = max(sy0 + 1, (ty + 1) * h // th)
        for tx in range(tw):
            sx0 = tx * w // tw
            sx1 = max(sx0 + 1, (tx + 1) * w // tw)
            r = g = b = a = n = 0
            for sy in range(sy0, sy1):
                base = sy * w * 4
                for sx in range(sx0, sx1):
                    o = base + sx * 4
                    al = px[o + 3]
                    r += px[o] * al; g += px[o + 1] * al; b += px[o + 2] * al
                    a += al; n += 1
            o = (ty * tw + tx) * 4
            if a:
                out[o] = min(255, r // a)
                out[o + 1] = min(255, g // a)
                out[o + 2] = min(255, b // a)
            out[o + 3] = a // n if n else 0
    return out


def build(src_name, out_name, mode, sub=""):
    src = os.path.join(SRC, src_name)
    if not os.path.exists(src):
        print("  MISSING  %s" % src_name)
        return False

    os.makedirs(TMP, exist_ok=True)
    norm = os.path.join(TMP, sub + out_name.replace(".png", "") + "-src.png")
    # sips normalises format and pre-downscales; some sources are 4501px square
    # and decoding those in pure Python is needlessly slow.
    subprocess.run(["sips", "-s", "format", "png", "-Z", "1000", src, "--out", norm],
                   check=True, capture_output=True)

    w, h, px = read_png(norm)
    px = recolour(w, h, px, mode)
    w, h, px = trim(w, h, px)

    # Contain within the bound, preserving aspect. No padding to a fixed
    # canvas — the export IS the artwork, so CSS can size it honestly.
    scale = min(BOX_W / w, BOX_H / h, 1.0)
    tw, th = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
    art = resize(w, h, px, tw, th) if (tw, th) != (w, h) else px

    write_png(os.path.join(OUT, sub, out_name), tw, th, art)
    print("  %-22s %4dx%-4d -> %3dx%-3d  (%s)" % (os.path.join(sub, out_name), w, h, tw, th, mode))
    return True


def main():
    if not os.path.isdir(SRC):
        sys.exit("no 'Client Logos/' directory at repo root")
    os.makedirs(OUT, exist_ok=True)
    print("building client logos into assets/img/clients/")
    ok = sum(build(*j) for j in JOBS)
    print("%d/%d written" % (ok, len(JOBS)))

    print("building the white client-wall set into assets/img/clients/grid/")
    os.makedirs(os.path.join(OUT, GRID), exist_ok=True)
    ok = sum(build(*j, sub=GRID) for j in GRID_JOBS)
    for name, frm, to in GRID_SVGS:
        svg = open(os.path.join(OUT, name)).read()
        if frm not in svg:
            sys.exit("%s no longer contains %s — check the fill by hand" % (name, frm))
        open(os.path.join(OUT, GRID, name), "w").write(svg.replace(frm, to))
        print("  %-22s %s -> %s" % (os.path.join(GRID, name), frm, to))
        ok += 1
    print("%d/%d written" % (ok, len(GRID_JOBS) + len(GRID_SVGS)))


if __name__ == "__main__":
    main()
