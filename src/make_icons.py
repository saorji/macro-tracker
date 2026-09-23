#!/usr/bin/env python3
"""Generate the app icons as PNGs, with no image-library dependency.

The icon is the app's own calorie ring: a partly-filled orange arc on a
near-black square. Full-bleed, because iOS applies its own rounded mask to
apple-touch-icon, and the ring sits inside the middle 80% so Android's
maskable crop can't clip it.

Run from the repo root (build.sh does this only when the PNGs are missing):
    python3 src/make_icons.py
"""
import math
import struct
import zlib

BG = (0x14, 0x17, 0x1F)        # --text, the app's near-black
TRACK = (0x32, 0x32, 0x36)     # dark-theme --border
ARC = (0xF0, 0x80, 0x3C)       # --cal
FILL = 0.72                    # how much of the ring is drawn
SS = 4                         # supersampling factor, for antialiasing


def render(size):
    """Return `size`x`size` RGB pixels, supersampled then box-filtered."""
    n = size * SS
    c = n / 2.0
    r_out = n * 0.34
    r_in = n * 0.255
    # the arc starts at 12 o'clock and runs clockwise, as the app's ring does
    sweep = FILL * 2 * math.pi

    hi = [[BG] * n for _ in range(n)]
    for y in range(n):
        dy = y + 0.5 - c
        row = hi[y]
        for x in range(n):
            dx = x + 0.5 - c
            d = math.hypot(dx, dy)
            if d < r_in or d > r_out:
                continue
            ang = math.atan2(dx, -dy)          # 0 at top, clockwise positive
            if ang < 0:
                ang += 2 * math.pi
            row[x] = ARC if ang <= sweep else TRACK

    # box-filter down to the target size
    out = bytearray()
    f = SS * SS
    for y in range(size):
        out.append(0)                          # PNG filter byte: none
        for x in range(size):
            r = g = b = 0
            for sy in range(y * SS, (y + 1) * SS):
                row = hi[sy]
                for sx in range(x * SS, (x + 1) * SS):
                    p = row[sx]
                    r += p[0]; g += p[1]; b += p[2]
            out += bytes((r // f, g // f, b // f))
    return bytes(out)


def write_png(path, size):
    raw = render(size)

    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))  # 8-bit RGB
    png += chunk(b'IDAT', zlib.compress(raw, 9))
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as fh:
        fh.write(png)
    print(f'wrote {path} ({size}x{size}, {len(png)} bytes)')


if __name__ == '__main__':
    for size, name in ((180, 'icon-180.png'), (192, 'icon-192.png'), (512, 'icon-512.png')):
        write_png(name, size)
