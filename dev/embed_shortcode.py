#!/usr/bin/env python3
"""Build the full-bleed WordPress [iframe] shortcode for the map, and check it.

The frame spans the browser, not the story column. Mongabay's own custom-story layout uses the same recipe
(`.single-custom-story .wp-block-cover { width:100vw; position:relative; left:50%; margin-left:-50vw }`), the
article wrappers have no clipping, and the theme's `body { overflow-x: hidden }` absorbs the overflow, so no
horizontal scrollbar appears.

Height comes from a CSS formula in the shortcode's style, because a post can carry no script:
  - up to a 820 px browser the page is stacked (panel, map, footnote), and the height follows the measured
    panel + footnote height plus a target map height;
  - above that the map and panel sit side by side, the panel is a fixed 400 px column, and its own content
    height sets the frame height for every width.
?fill=1 makes the page fill the frame with the map row flexible, so spare pixels go into the map rather than
into a gap under the footnote.

Full bleed also removes the usual scrollbar trap: the formula's 100vw and the frame's width are the same
quantity, so there is no band of widths where they disagree.

Re-measure after any copy or legend change: serve the repo root, move js/mapbox-token.js aside so no tiles
load, open /dev/measure-fullbleed.html, and update dev/heights.json from its MEASURED object.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
URL = "https://map-usa-vs-isa.vercel.app/?fill=1"
TITLE = "US deep-sea mining applications and internationally managed areas in the CCZ (interactive map)"

VW = "100vw"
TWO_COLUMN = 820      # css/style.css: above this the panel sits beside the map
LATE_WRAP = 8         # px: allow a browser to re-wrap this much later (wider) than we measured
MARGIN = 6            # px of slack, so rounding never squeezes the map
MERGE_TOL = 45        # px of extra spare allowed when merging segments; spare only makes the map taller
STEEP = 100000        # turns a ramp into a step

# EDIT: the map's own height while the page is stacked. Spare frame height is added to this, so it is a
# floor rather than a target.
MAP_CSS = f"clamp(320px, 0.55 * {VW}, 440px)"


def map_h(w):
    return min(440, max(320, 0.55 * w))


def load():
    d = json.load(open(os.path.join(HERE, "heights.json")))
    panel400 = d["panel_content_at_400"]
    stacked = {int(k): v for k, v in d.items() if k.isdigit()}
    return stacked, panel400


def needed_fn(h):
    def needed(w):
        ws = sorted(h)
        if w <= ws[0]:
            return max(h.values())
        if w >= ws[-1]:
            return h[ws[-1]]
        lo = max(x for x in ws if x <= w)
        hi = min(x for x in ws if x >= w)
        return max(h[lo], h[hi])
    return needed


def late(needed):
    def f(w):
        return max(needed(w - d * 0.5) for d in range(LATE_WRAP * 2 + 1))
    return f


def fit(needed, lo, hi, step=0.5):
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


def build(stacked, panel400):
    chain = fit(late(needed_fn(stacked)), 280, TWO_COLUMN - 2)
    wide = panel400 + MARGIN                      # the two-column height: the panel's own content
    return chain, wide


def height(w, model):
    """What the formula resolves to at a browser width of w px."""
    chain, wide = model
    h = chain[0][1] + MARGIN + map_h(w)
    for (x0, y0), (x1, y1) in zip(chain, chain[1:]):
        h += (y1 - y0) / (x1 - x0) * min(max(w - x0, 0), x1 - x0)
    return wide if w > TWO_COLUMN else h


def css_height(model):
    chain, wide = model
    stacked_end = chain[-1][1] + MARGIN + map_h(TWO_COLUMN)
    parts = [f"{chain[0][1] + MARGIN}px + {MAP_CSS}"]
    for (x0, y0), (x1, y1) in zip(chain, chain[1:]):
        slope = round((y0 - y1) / (x1 - x0), 4)
        if slope:
            parts.append(f"- {slope} * clamp(0px, {VW} - {x0:g}px, {x1 - x0:g}px)")
    # one step down at the layout switch; 100vw and the frame's width are the same number, so it is exact
    parts.append(f"- clamp(0px, ({VW} - {TWO_COLUMN}px) * {STEEP}, {stacked_end - wide:g}px)")
    return "calc(" + " ".join(parts) + ")"


FULL_BLEED = ("display:block; position:relative; left:50%; width:100vw; max-width:100vw; "
              "margin-left:-50vw; margin-right:-50vw;")


def main():
    stacked, panel400 = load()
    model = build(stacked, panel400)
    raw = late(needed_fn(stacked))
    chain, wide = model
    print(f"stacked chain: {len(chain) - 1} segment(s), {chain[0][1]} -> {chain[-1][1]} px of text; "
          f"two-column height {wide} px from {TWO_COLUMN + 1} px")

    rounded = [chain[0]]
    for (x0, y0), (x1, y1) in zip(chain, chain[1:]):
        rounded.append((x1, rounded[-1][1] - round((y0 - y1) / (x1 - x0), 4) * (x1 - x0)))
    checked = (rounded, wide)

    bands = [(320, 430, "phones"), (431, 820, "large phones, tablets"),
             (821, 1279, "small windows, laptops"), (1280, 2560, "desktop")]
    worst = None
    print("\nframe height, and the extra px the map gets beyond its floor")
    for lo, hi, label in bands:
        spare, frame = [], []
        for w in range(lo, hi + 1):
            h = height(w, checked)
            frame.append(h)
            spare.append(h - (raw(w) + map_h(w)) if w <= TWO_COLUMN else h - panel400)
        worst = min(spare) if worst is None else min(worst, min(spare))
        print(f"  {label:24s} {lo}-{hi}: frame {min(frame):4.0f}-{max(frame):4.0f} px, "
              f"map +{min(spare):5.1f} to +{max(spare):5.1f}")
    if worst < 0:
        print(f"\n  ! the formula is up to {-worst:.1f} px short somewhere")
        raise SystemExit(1)
    print(f"\n  tightest anywhere: +{worst:.1f} px — never short, so no gap and no inner scrollbar")

    style = f"{FULL_BLEED} height:{css_height(model)}; margin-top:40px; margin-bottom:40px; border:0;"
    shortcode = f'[iframe src="{URL}" title="{TITLE}" style="{style}" scrolling="no" loading="lazy"][/iframe]'
    with open(os.path.join(ROOT, "embed-shortcode.txt"), "w", encoding="utf-8") as fh:
        fh.write(shortcode + "\n")
    print(f"\nwrote embed-shortcode.txt ({len(shortcode)} chars)")

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
    /* a stand-in for a Mongabay article, with the theme's real wrappers: body hides sideways overflow,
       .container is capped at 1280 px and centred, .inner is the 780 px text column */
    html {{ box-sizing: border-box; }}            /* the theme sets this, and it changes where .inner sits */
    *, *::before, *::after {{ box-sizing: inherit; }}
    html, body {{ width: 100%; }}
    body {{ margin: 0; background: #fff; color: #092f29; font: 16px/24px "Public Sans", sans-serif;
            overflow-x: hidden; }}
    .container {{ width: 100%; max-width: 1280px; margin: 0 auto; }}
    .ph--40 {{ padding-left: clamp(20px, 5vw + 1px, 40px); padding-right: clamp(20px, 5vw + 1px, 40px); }}
    .inner {{ width: 100%; max-width: 780px; margin: 0 auto; }}
    .inner p {{ margin: 0 0 24px; }}
    .probe {{ background: #ffe9e6; }}
  </style>
</head>
<body>
  <div class="container ph--40"><div class="inner">
    <p>The paragraph above the embed. The frame below breaks out of this column to the full width of the
      browser, and its height comes from the formula in its style attribute, with no script on the page.</p>
    <iframe src="{src}" title="{TITLE}"
      style="{FULL_BLEED} height:{css_height(model)}; margin-top:40px; margin-bottom:40px; border:0;"
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


if __name__ == "__main__":
    main()
