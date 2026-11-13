"""Generate self-contained PNG app icons with Python's standard library."""
from pathlib import Path
import math
import struct
import zlib

OUT = Path(__file__).resolve().parents[1] / 'public' / 'icons'
OUT.mkdir(parents=True, exist_ok=True)

def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)

def line_distance(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)

def icon(size, filename):
    segments = [(20, 22, 44, 22), (44, 22, 35, 40), (35, 40, 35, 46), (35, 46, 29, 46), (29, 46, 29, 40), (29, 40, 20, 22)]
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            px, py = (x + .5) * 64 / size, (y + .5) * 64 / size
            distance = min(line_distance(px, py, *s) for s in segments)
            if distance < 1.15:
                color = (246, 236, 218)
            elif line_distance(px, py, 26, 28, 38, 28) < 1.2:
                color = (201, 150, 105)
            else:
                color = (53, 41, 33)
            row.extend(color)
        rows.append(bytes(row))
    header = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    (OUT / filename).write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) + chunk(b'IDAT', zlib.compress(b''.join(rows), 9)) + chunk(b'IEND', b''))

icon(192, 'icon-192.png')
icon(512, 'icon-512.png')
icon(512, 'maskable-512.png')
print('Generated 192px, 512px and maskable app icons.')
