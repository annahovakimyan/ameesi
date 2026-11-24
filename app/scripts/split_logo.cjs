// Run first: node scripts/split_logo.cjs ../design/logo   (then node scripts/build_logo.mjs)
// Reads design/logo/source/*.svg (from "Logo Versions/01") and writes lockup, emblem, sun-gold and sun-white SVGs.
// Derive lockup, emblem and sun-only SVGs from the two brand sources, using real path bounding boxes.
const { chromium } = require("playwright"); const fs = require("fs");
const [,, dir] = process.argv;
const color = fs.readFileSync(`${dir}/source/ameesi-square-color-midnight.svg`, "utf8");
const black = fs.readFileSync(`${dir}/source/ameesi-emblem-black-transparent.svg`, "utf8");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const boxes = async (svg) => { await p.setContent(svg); return p.evaluate(() =>
    [...document.querySelectorAll("path,rect,circle")].map((el) => { const bb = el.getBBox();
      return { html: el.outerHTML, x: bb.x, y: bb.y, w: bb.width, h: bb.height, tag: el.tagName }; })); };
  const wrap = (els, pad = 2) => {
    const x0 = Math.min(...els.map((e) => e.x)) - pad, y0 = Math.min(...els.map((e) => e.y)) - pad;
    const x1 = Math.max(...els.map((e) => e.x + e.w)) + pad, y1 = Math.max(...els.map((e) => e.y + e.h)) + pad;
    const f = (n) => +n.toFixed(2);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(x0)} ${f(y0)} ${f(x1 - x0)} ${f(y1 - y0)}" fill="none">`
      + els.map((e) => e.html.replace(/ xmlns="[^"]*"/, "")).join("") + "</svg>";
  };
  const c = (await boxes(color)).filter((e) => e.tag !== "rect");
  // Wordmark: the cream shapes below the emblem's bottom dot (the lowest non-cream shape).
  const emblemBottom = Math.max(...c.filter((e) => !/F8E7CC/i.test(e.html)).map((e) => e.y + e.h));
  const emblem = c.filter((e) => e.y < emblemBottom);
  const sunOnly = (els) => {
    // The sun with its rays is the largest shape; the face pieces are small shapes near its centre.
    // The ring (four quarter arcs), its dots, the star and the side dots are left out.
    const sun = els.reduce((a, e) => (e.w * e.h > a.w * a.h ? e : a));
    const cx = sun.x + sun.w / 2, cy = sun.y + sun.h / 2, R = sun.w / 2;
    return els.filter((e) => e === sun || (e.w < R * 0.8 && Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < R * 0.45));
  };
  fs.writeFileSync(`${dir}/lockup.svg`, wrap(c) + "\n");
  fs.writeFileSync(`${dir}/emblem.svg`, wrap(emblem) + "\n");
  fs.writeFileSync(`${dir}/sun-gold.svg`, wrap(sunOnly(emblem)) + "\n");
  const k = await boxes(black);
  fs.writeFileSync(`${dir}/sun-white.svg`, wrap(sunOnly(k)).replace(/fill="black"/g, 'fill="#FFFFFF"') + "\n");
  console.log({ all: c.length, emblem: emblem.length, sun: sunOnly(emblem).length, sunWhite: sunOnly(k).length });
  await b.close();
})();
