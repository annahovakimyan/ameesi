import { FONTS, textStyle } from "../theme";

test("each design-system style uses its merged font file, with no separate weight", () => {
  expect(textStyle("display").fontFamily).toBe("AmeesiSerif-SemiBold");
  expect(textStyle("titleLg").fontFamily).toBe("AmeesiSerif-SemiBold");
  expect(textStyle("title").fontFamily).toBe("AmeesiSans-SemiBold");
  expect(textStyle("label").fontFamily).toBe("AmeesiSans-SemiBold");
  expect(textStyle("body").fontFamily).toBe("AmeesiSans-Regular");
  expect(textStyle("caption").fontFamily).toBe("AmeesiSans-Regular");
  expect(textStyle("glyph").fontFamily).toBe("AmeesiGlyphs-Regular");
  expect(textStyle("glyphLg").fontFamily).toBe("AmeesiGlyphs-Regular");
  expect(textStyle("body").fontWeight).toBeUndefined();
  expect(textStyle("body").fontSize).toBe(16); // sizes still come from tokens
});

test("every font a style uses is registered", () => {
  for (const v of ["display", "titleLg", "title", "headline", "body", "bodySm", "label", "caption", "overline", "glyph", "glyphLg"] as const) {
    expect(Object.keys(FONTS)).toContain(textStyle(v).fontFamily);
  }
});
