"""Extract exact vector outlines from the level-1 mock exam PDF."""
import pymupdf, json, math, os
from shapely.geometry import Polygon, MultiPolygon, LineString
from shapely.ops import unary_union, linemerge
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

doc = pymupdf.open(r'D:/Users/nan/Downloads/一级模拟卷.pdf')

def path_rings(d):
    """Convert a PDF drawing to point rings (polylines)."""
    rings, cur = [], []
    for item in d['items']:
        if item[0] == 'l':
            a, b = item[1], item[2]
            if not cur: cur = [(a.x, a.y), (b.x, b.y)]
            elif math.dist(cur[-1], (a.x, a.y)) < 0.3: cur.append((b.x, b.y))
            else: rings.append(cur); cur = [(a.x, a.y), (b.x, b.y)]
        elif item[0] == 'c':
            p1, p2, p3, p4 = item[1], item[2], item[3], item[4]
            if not cur: cur = [(p1.x, p1.y)]
            elif math.dist(cur[-1], (p1.x, p1.y)) > 0.3: rings.append(cur); cur = [(p1.x, p1.y)]
            # approximate bezier by 12 points
            for i in range(1, 13):
                t = i / 12
                mt = 1 - t
                x = mt**3*p1.x + 3*mt*mt*t*p2.x + 3*mt*t*t*p3.x + t**3*p4.x
                y = mt**3*p1.y + 3*mt*mt*t*p2.y + 3*mt*t*t*p3.y + t**3*p4.y
                cur.append((x, y))
        elif item[0] == 're':
            r = item[1]
            rings.append([(r.x0, r.y0), (r.x1, r.y0), (r.x1, r.y1), (r.x0, r.y1), (r.x0, r.y0)])
    if cur: rings.append(cur)
    return rings

all_pages = []
for pno, page in enumerate(doc):
    figs = []
    for d in page.get_drawings():
        rings = path_rings(d)
        rings = [r for r in rings if len(r) >= 3]
        if not rings: continue
        figs.append({'rings': rings, 'fill': d.get('fill'), 'stroke': d.get('color')})
    all_pages.append(figs)
    print(f'page {pno}: {len(figs)} figure-paths')
    xs = [pt for f in figs for r in f['rings'] for pt in r]
    print('  x range', round(min(p[0] for p in xs)), round(max(p[0] for p in xs)), ' y range', round(min(p[1] for p in xs)), round(max(p[1] for p in xs)))

os.makedirs('.impeccable/exam', exist_ok=True)
for pno, figs in enumerate(all_pages):
    fig, ax = plt.subplots(figsize=(9, 13))
    for f in figs:
        for r in f['rings']:
            ax.plot([p[0] for p in r], [p[1] for p in r], 'k-', lw=0.7)
    ax.invert_yaxis(); ax.set_aspect('equal'); ax.set_title(f'page {pno}')
    fig.savefig(f'.impeccable/exam/page{pno}.png', dpi=110)
    plt.close(fig)
json.dump([[{'rings': f['rings']} for f in figs] for figs in all_pages], open(os.path.join(os.environ['TEMP'], 'exam-rings.json'), 'w'))
print('saved')
