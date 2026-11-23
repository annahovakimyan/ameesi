import { polar, screenAngle, spread } from "../wheel/geometry";

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);
const circDiff = (a: number, b: number) => {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return Math.min(d, 360 - d);
};

describe("screenAngle and polar", () => {
  test("the Ascendant sits at 9 o'clock", () => {
    const p = polar(100, 100, 50, screenAngle(212, 212));
    close(p.x, 50);
    close(p.y, 100);
  });

  test("longitude increases counter-clockwise: Asc + 90° is at the bottom (IC side)", () => {
    const p = polar(100, 100, 50, screenAngle(302, 212));
    close(p.x, 100);
    close(p.y, 150);
  });

  test("Asc + 180° (Descendant) is at 3 o'clock, Asc + 270° at the top", () => {
    const d = polar(100, 100, 50, screenAngle(32, 212));
    close(d.x, 150);
    close(d.y, 100);
    const top = polar(100, 100, 50, screenAngle(122, 212));
    close(top.y, 50);
  });

  test("with no Ascendant (unknown time), 0° Aries is at 9 o'clock", () => {
    const p = polar(100, 100, 50, screenAngle(0, null));
    close(p.x, 50);
  });
});

describe("spread", () => {
  test("leaves well-separated points alone", () => {
    expect(spread([10, 100, 200], 8)).toEqual([10, 100, 200]);
  });

  test("pushes a tight cluster apart around its centre", () => {
    const out = spread([100, 101, 102], 8);
    expect(circDiff(out[1], out[0])).toBeGreaterThanOrEqual(8 - 1e-6);
    expect(circDiff(out[2], out[1])).toBeGreaterThanOrEqual(8 - 1e-6);
    close((out[0] + out[1] + out[2]) / 3, 101); // centred
    expect(out[0] < out[1] && out[1] < out[2]).toBe(true); // order kept
  });

  test("works across 0° Aries and keeps input order", () => {
    const out = spread([359, 1, 180], 8);
    expect(circDiff(out[0], out[1])).toBeGreaterThanOrEqual(8 - 1e-6);
    expect(out[2]).toBe(180);
    expect(out.every((x) => x >= 0 && x < 360)).toBe(true);
  });

  test("13 bodies packed together all get room", () => {
    const lons = Array.from({ length: 13 }, (_, i) => 50 + i * 0.5);
    const out = [...spread(lons, 8)].sort((a, b) => a - b);
    for (let i = 1; i < out.length; i++) expect(out[i] - out[i - 1]).toBeGreaterThanOrEqual(8 - 1e-3);
  });
});
