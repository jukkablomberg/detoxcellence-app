#!/usr/bin/env python3
"""Store and app imagery for Detoxcellence, DERIVED from one mark — never drawn by hand per size.

The mark is the site's own: the "❋" (U+274B) that leads the wordmark in every header and footer of detoxcellence.com
(`<span class="mark">❋</span> Detoxcellence`, build.js NAV/foot), inked sage. It is rendered here from the DejaVu Sans
glyph (the VM's font that carries U+274B), not redrawn. Tokens are DESIGN.md § App: sage #5C7B74 / link #46615B,
ground #FFFFFF (dark #111513). PROVISIONAL until Jukka approves the app icon — the logo stays his word (MANDATE v2).

  assets/icon.png                     1024×1024 opaque — white mark on the link sage (Play master + iOS; R11)
  assets/adaptive-icon-foreground.png 1024×1024 white mark inside the 66/108 safe zone, transparent
  assets/adaptive-icon-background.png 1024×1024 flat link sage
  assets/adaptive-icon-monochrome.png 1024×1024 white mark on transparent (themed icons)
  assets/splash-mark.png              1024×1024 sage mark inside the centred 2/3 circle, transparent (APP-STANDARD § 1.2)
  assets/notification-icon.png        96×96 white mark on transparent (Android small icon)
  assets/feature-graphic.png          1024×500 Play feature graphic: mark + wordmark on the link sage
  store/play-store-icon-512.png       512×512 copy of the icon

  python3 scripts/store-assets.py
"""
import pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
A = ROOT / "assets"
GLYPH_FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
LEAGUE = str(A / "fonts/LeagueGothic-Regular.ttf")
SAGE, LINK, WHITE = (92, 123, 116), (70, 97, 91), (255, 255, 255)
MARK = "❋"
SS = 4  # supersampling


def mark(size, frac, colour, ground=None):
    """The glyph centred, its ink box `frac` of the canvas, on `ground` (None = transparent)."""
    big = size * SS
    im = Image.new("RGBA", (big, big), ground + (255,) if ground else (0, 0, 0, 0))
    # find the font size whose ink box is frac * canvas
    f = ImageFont.truetype(GLYPH_FONT, 100)
    l, t, r, b = f.getbbox(MARK)
    pt = int(100 * frac * big / max(r - l, b - t))
    f = ImageFont.truetype(GLYPH_FONT, pt)
    l, t, r, b = f.getbbox(MARK)
    d = ImageDraw.Draw(im)
    d.text(((big - (r - l)) / 2 - l, (big - (b - t)) / 2 - t), MARK, font=f, fill=colour + (255,))
    return im.resize((size, size), Image.LANCZOS)


def save(im, rel, opaque=False):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    (im.convert("RGB") if opaque else im).save(p, optimize=True)
    print("wrote", rel, im.size)


icon = mark(1024, 0.56, WHITE, LINK)
save(icon, "assets/icon.png", opaque=True)
save(icon.resize((512, 512), Image.LANCZOS), "store/play-store-icon-512.png", opaque=True)
save(mark(1024, 0.40, WHITE), "assets/adaptive-icon-foreground.png")          # 0.40 < 66/108 ≈ 0.61 safe zone
save(Image.new("RGB", (1024, 1024), LINK), "assets/adaptive-icon-background.png", opaque=True)
save(mark(1024, 0.40, WHITE), "assets/adaptive-icon-monochrome.png")
save(mark(1024, 0.44, SAGE), "assets/splash-mark.png")                        # inside the centred 2/3 circle
save(mark(96, 0.80, WHITE), "assets/notification-icon.png")

# feature graphic: mark + wordmark (League Gothic, the site's display face), white on link sage
fg = Image.new("RGB", (1024 * SS, 500 * SS), LINK)
m = mark(200, 0.9, WHITE).resize((200 * SS, 200 * SS), Image.LANCZOS)
fg.paste(m, (90 * SS, 150 * SS), m)
d = ImageDraw.Draw(fg)
pt = 150 * SS
while ImageFont.truetype(LEAGUE, pt).getlength("DETOXCELLENCE") > 600 * SS:  # fit the wordmark between the mark and a 60 px margin
    pt -= SS
lg = ImageFont.truetype(LEAGUE, pt)
d.text((330 * SS, 250 * SS), "DETOXCELLENCE", font=lg, fill=WHITE, anchor="lm")
save(fg.resize((1024, 500), Image.LANCZOS), "assets/feature-graphic.png", opaque=True)
