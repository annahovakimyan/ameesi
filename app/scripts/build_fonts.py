"""Build Ameesi's fonts from Noto (SIL Open Font License 1.1).

React Native can't fall back between custom fonts glyph by glyph, and Noto Sans Armenian has no digits,
so each design-system family becomes one merged font:

  Ameesi Sans   Noto Sans (Latin incl. Azerbaijani letters, Cyrillic, digits) + Noto Sans Armenian, 400 and 600
  Ameesi Serif  Noto Serif + Noto Serif Armenian, 600 (display and title-lg only)
  Ameesi Glyphs Noto Sans Symbols + Symbols 2: planet, node, Chiron and sign glyphs, and ⓘ ⚠ ✓

Run from app/ after `npm install`:  pip install fonttools && python scripts/build_fonts.py
Output goes to assets/fonts/ (committed, with OFL.txt).
"""
from pathlib import Path

from fontTools import subset
from fontTools.merge import Merger
from fontTools.ttLib import TTFont

APP = Path(__file__).resolve().parent.parent
SRC = APP / "node_modules" / "@expo-google-fonts"
OUT = APP / "assets" / "fonts"

LATIN_CYRILLIC = ["U+0020-024F", "U+0300-036F", "U+0400-04FF", "U+2000-206F", "U+20A0-20CF", "U+2100-214F",
                  "U+2190-21FF", "U+2212", "U+FB00-FB06"]
ARMENIAN = ["U+0020", "U+0530-058F", "U+FB13-FB17"]
GLYPHS = "☉☽☿♀♂♃♄♅♆♇☊☋⚷♈♉♊♋♌♍♎♏♐♑♒♓ⓘ⚠✓︎ "


def subset_font(path: Path, unicodes=None, text=None) -> TTFont:
    font = TTFont(path)
    opts = subset.Options()
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.glyph_names = False
    s = subset.Subsetter(opts)
    s.populate(unicodes=subset.parse_unicodes(",".join(unicodes)) if unicodes else [], text=text or "")
    s.subset(font)
    return font


def merge(parts: list[TTFont], family: str, style: str, weight: int, out: Path) -> None:
    tmp = []
    for i, f in enumerate(parts):
        p = out.with_suffix(f".part{i}.ttf")
        f.save(p)
        tmp.append(str(p))
    merged = Merger().merge(tmp)
    for p in tmp:
        Path(p).unlink()
    name = merged["name"]
    full, ps = f"{family} {style}", f"{family.replace(' ', '')}-{style.replace(' ', '')}"
    for rec_id, value in {1: family, 2: "Regular" if style == "Regular" else style, 3: f"{ps};Ameesi build",
                          4: full, 6: ps, 16: family, 17: style}.items():
        name.setName(value, rec_id, 3, 1, 0x409)
        name.setName(value, rec_id, 1, 0, 0)
    name.setName("Built for Ameesi from Noto fonts by The Noto Project Authors, under the SIL Open Font License 1.1.",
                 10, 3, 1, 0x409)
    merged["OS/2"].usWeightClass = weight
    merged.save(out)
    print(f"{out.relative_to(APP)}: {out.stat().st_size // 1024} KB, {len(merged.getBestCmap())} characters")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for weight, style in ((400, "Regular"), (600, "SemiBold")):
        w = f"{weight}{style}"
        merge([subset_font(SRC / f"noto-sans/{w}/NotoSans_{w}.ttf", LATIN_CYRILLIC),
               subset_font(SRC / f"noto-sans-armenian/{w}/NotoSansArmenian_{w}.ttf", ARMENIAN)],
              "Ameesi Sans", style, weight, OUT / f"AmeesiSans-{style}.ttf")
    merge([subset_font(SRC / "noto-serif/600SemiBold/NotoSerif_600SemiBold.ttf", LATIN_CYRILLIC),
           subset_font(SRC / "noto-serif-armenian/600SemiBold/NotoSerifArmenian_600SemiBold.ttf", ARMENIAN)],
          "Ameesi Serif", "SemiBold", 600, OUT / "AmeesiSerif-SemiBold.ttf")
    merge([subset_font(SRC / "noto-sans-symbols/400Regular/NotoSansSymbols_400Regular.ttf", text=GLYPHS),
           subset_font(SRC / "noto-sans-symbols-2/400Regular/NotoSansSymbols2_400Regular.ttf", text="☉⚠✓")],
          "Ameesi Glyphs", "Regular", 400, OUT / "AmeesiGlyphs-Regular.ttf")
    (OUT / "OFL.txt").write_text((SRC / "noto-sans/LICENSE_FONT").read_text())


if __name__ == "__main__":
    main()
