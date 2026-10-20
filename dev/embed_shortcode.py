#!/usr/bin/env python3
"""Build the WordPress [iframe] shortcode for the map, and check it.

A Mongabay post takes only the [iframe] shortcode: no script, no HTML block. So the frame's height is a CSS
formula in its style attribute. It works out the article column's width from the screen width (COL below), adds
the height the panel and footnote need at that width (dev/heights.json), and adds a target height for the map.

?fill=1 puts the page in embed mode: the panel sits above the map at any column width, the grid fills the frame
and the map row is the flexible one. So every spare pixel in the formula makes the map slightly taller instead
of showing as a gap under the footnote. That is what makes an over-estimate harmless here, and it is why the
formula is deliberately an upper envelope rather than a tight fit.

Re-measure after any copy or legend change: serve the repo root, move js/mapbox-token.js aside so no tiles load,
open /dev/measure.html, save its JSON over dev/heights.json, then run this script.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
URL = "https://map-usa-vs-isa.vercel.app/?fill=1"
TITLE = "US deep-sea mining applications and internationally managed areas in the CCZ (interactive map)"

# Mongabay's article column: `.ph--40 { padding: 0 clamp(20px, 1px + 5vw, 40px) }` inside a 780 px column.
COL = "min(780px, 100vw - 2 * clamp(20px, 1px + 5vw, 40px))"


def col(vw):
    return min(780, vw - 2 * min(40, max(20, 1 + 0.05 * vw)))


# EDIT: the map's own height in the embed. The CCZ view is about twice as wide as it is tall, so a little
# over half the column reads well; the clamp keeps it sane on phones and on the 780 px column.
MAP_RATIO = 0.55
MAP_MIN = 320
MAP_MAX = 440
MAP_CSS = f"clamp({MAP_MIN}px, {MAP_RATIO} * {COL}, {MAP_MAX}px)"


def map_h(c):
    return min(MAP_MAX, max(MAP_MIN, MAP_RATIO * c))


TYPE_SWITCH = 760     # style.css: above this the embed uses the desktop type sizes and taller legend rows
SCROLLBAR = 17        # Windows classic scrollbars: 100vw is this much wider than the real column
LATE_WRAP = 8         # px: allow a browser to re-wrap this much later (wider) than we measured
MARGIN = 6            # px of slack everywhere, so rounding never squeezes the map
MERGE_TOL = 45        # px of extra spare allowed when merging segments; spare only makes the map taller
STEEP = 100000        # turns a ramp into a step


def load():
    return {int(k): v for k, v in json.load(open(os.path.join(HERE, "heights.json"))).items()}


def needed_fn(h):
    """Height the panel and footnote need at column width c, taking the taller of the measurements around it
    and staying on the same side of the type switch."""
    def needed(c):
        ws = sorted(w for w in h if (w <= TYPE_SWITCH) == (c <= TYPE_SWITCH))
        if c <= ws[0]:
            return max(h[w] for w in ws)
        if c >= ws[-1]:
            return h[ws[-1]]
        lo = max(w for w in ws if w <= c)
        hi = min(w for w in ws if w >= c)
        return max(h[lo], h[hi])
    return needed


def late(needed, span=LATE_WRAP):
    """needed(), allowing for a re-wrap up to `span` px later (wider) than we measured."""
    def f(c):
        xs = [c - d * 0.5 for d in range(int(span * 2) + 1)]
        return max(needed(x) for x in xs if (x <= TYPE_SWITCH) == (c <= TYPE_SWITCH))
    return f


def fit(needed, lo, hi, step=0.5):
    """A chain of straight segments from lo to hi that never dips below needed()."""
    xs = [lo + i * step for i in range(int(round((hi - lo) / step)) + 1)]
    ys = [needed(x) for x in xs]
    pts = [(xs[0], ys[0])]
    pts += [(xs[i], ys[i]) for i in range(1, len(xs) - 1) if ys[i + 1] < ys[i]]
    pts.append((xs[-1], ys[-1]))

    def poly_spare(x):
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            if x0 <= x <= x1:
                return y0 + (y1 - y0) * (x - x0) / (x1 - x0) - needed(x)
        return 0

    def line_ok(a, b):
        (x0, y0), (x1, y1) = pts[a], pts[b]
        for x, y in zip(xs, ys):
            if x0 < x < x1:
                v = y0 + (y1 - y0) * (x - x0) / (x1 - x0)
                if v < y - 1e-9 or v - y > MERGE_TOL + poly_spare(x):
                    return False
        return True

    knots, i = [pts[0]], 0
    while i < len(pts) - 1:
        j = i + 1
        while j + 1 < len(pts) and line_ok(i, j + 1):
            j += 1
        knots.append(pts[j])
        i = j
    return knots


# The jump at the type switch is handled as one flat step, placed SCROLLBAR px early so a Windows column that
# the formula reads as wider than it is still gets the taller value. Above the step the formula stays at the
# tallest value in that region (735 px at a 762-768 px column), which over-estimates the 780 px column by a
# little; that over-estimate goes into the map.
def build(h):
    # Fit to the curve shifted by SCROLLBAR, so a Windows column that 100vw reads too wide still gets enough
    # height. The cost is a little spare on every other device, and spare only makes the map taller.
    needed = late(needed_fn(h), SCROLLBAR + LATE_WRAP)
    narrow = fit(needed, 276, TYPE_SWITCH - SCROLLBAR)
    wide_max = max(v for w, v in h.items() if w > TYPE_SWITCH)
    step_at = TYPE_SWITCH - SCROLLBAR
    return narrow, wide_max, step_at


def text_height(c, model):
    narrow, wide_max, step_at = model
    h = narrow[0][1] + MARGIN
    for (x0, y0), (x1, y1) in zip(narrow, narrow[1:]):
        h += (y1 - y0) / (x1 - x0) * min(max(c - x0, 0), x1 - x0)
    rise = wide_max + MARGIN - h if c >= step_at else 0
    return h + min(max((c - step_at) * STEEP, 0), max(rise, 0)) if c >= step_at else h


def css_height(model):
    narrow, wide_max, step_at = model
    end = narrow[-1][1] + MARGIN
    parts = [f"{narrow[0][1] + MARGIN}px + {MAP_CSS}"]
    for (x0, y0), (x1, y1) in zip(narrow, narrow[1:]):
        slope = round((y0 - y1) / (x1 - x0), 4)
        if slope:            # a flat segment contributes nothing; leaving it out shortens the shortcode
            parts.append(f"- {slope} * clamp(0px, {COL} - {x0:g}px, {x1 - x0:g}px)")
    parts.append(f"+ clamp(0px, ({COL} - {step_at:g}px) * {STEEP}, {wide_max + MARGIN - end:g}px)")
    return "calc(" + " ".join(parts) + ")"


def main():
    h = load()
    model = build(h)
    raw = late(needed_fn(h))          # what the page really needs at a given real column width
    narrow, wide_max, step_at = model
    print(f"narrow chain: {len(narrow) - 1} segment(s), {narrow[0][1]} -> {narrow[-1][1]} px; "
          f"step up to {wide_max} px at a {step_at} px column")

    # check the rounded slopes the browser will actually use, not the exact ones
    rounded = [narrow[0]]
    for (x0, y0), (x1, y1) in zip(narrow, narrow[1:]):
        rounded.append((x1, rounded[-1][1] - round((y0 - y1) / (x1 - x0), 4) * (x1 - x0)))
    checked = (rounded, wide_max, step_at)

    bands = [(320, 359, "small phones"), (360, 430, "phones"), (431, 714, "large phones, small tablets"),
             (715, 859, "tablets, small windows"), (860, 1600, "desktop")]
    worst = None
    print("\nframe height, and the extra px the map gets beyond its target")
    for lo, hi, label in bands:
        spare, frame = [], []
        for vw in range(lo, hi + 1):
            real = col(vw)                                  # the column the reader actually sees
            # the formula reads 100vw, which on Windows includes the scrollbar; COL still caps at 780
            for formula_col in (real, min(780, real + SCROLLBAR)):
                spare.append(text_height(formula_col, checked) - raw(real))
            frame.append(text_height(real, checked) + map_h(real))
        worst = min(spare) if worst is None else min(worst, min(spare))
        print(f"  {label:28s} {lo}-{hi}: frame {min(frame):4.0f}-{max(frame):4.0f} px, "
              f"map +{min(spare):5.1f} to +{max(spare):5.1f}")
    if worst < 0:
        print(f"\n  ! the formula is up to {-worst:.1f} px short somewhere")
        raise SystemExit(1)
    print(f"\n  tightest anywhere: +{worst:.1f} px — never short, so no gap and no inner scrollbar")

    style = f"display:block; width:100%; height:{css_height(model)}; margin:40px 0; border:0;"
    shortcode = f'[iframe src="{URL}" title="{TITLE}" style="{style}" scrolling="no" loading="lazy"][/iframe]'
    with open(os.path.join(ROOT, "embed-shortcode.txt"), "w", encoding="utf-8") as fh:
        fh.write(shortcode + "\n")
    print(f"\nwrote embed-shortcode.txt ({len(shortcode)} chars)")

    # A stand-in Mongabay article, to see the frame against real paragraphs. EMBED_URL=http://localhost:8772
    # points it at the local copy, which is the only way to check a change before it is deployed.
    src = os.environ.get("EMBED_URL", "").rstrip("/")
    src = f"{src}/?fill=1" if src else URL
    test = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CCZ map shortcode &middot; test page</title>
  <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400&display=swap" rel="stylesheet">
  <style>
    /* a stand-in for a Mongabay article: the theme's .ph--40 container and 780 px column, Public Sans 16/24 */
    body {{ margin: 0; background: #fff; color: #092f29; font: 16px/24px "Public Sans", sans-serif; }}
    .ph--40 {{ max-width: 1280px; margin: 0 auto; padding: 24px clamp(20px, 1px + 5vw, 40px); }}
    .inner {{ max-width: 780px; margin: 0 auto; }}
    .inner p {{ margin: 0 0 24px; }}
    .probe {{ background: #ffe9e6; }}
  </style>
</head>
<body>
  <div class="ph--40"><div class="inner">
    <p>The paragraph above the embed. The frame below is sized by the formula in its style attribute, with
      no script on the page.</p>
    <iframe src="{src}" title="{TITLE}"
      style="display:block; width:100%; height:{css_height(model)}; margin:40px 0; border:0;"
      scrolling="no" loading="lazy"></iframe>
    <p class="probe">The paragraph under the embed. Its top edge should sit 40 px below the footnote line
      inside the frame, with no white band in between.</p>
    <p>A second paragraph, so the spacing reads the way it would in a story.</p>
  </div></div>
</body>
</html>
"""
    with open(os.path.join(HERE, "shortcode-test.html"), "w", encoding="utf-8") as fh:
        fh.write(test)
    print("wrote dev/shortcode-test.html")
    return shortcode


if __name__ == "__main__":
    main()
