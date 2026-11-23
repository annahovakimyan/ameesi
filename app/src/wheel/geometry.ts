// Drawing maths for the chart wheel. Display only: every longitude comes from the server.

/** Screen angle (degrees, counter-clockwise from 3 o'clock) for an ecliptic longitude.
 *  The Ascendant sits at 9 o'clock; without one (unknown birth time), 0° Aries does. */
export function screenAngle(lon: number, ascLon: number | null): number {
  return 180 + lon - (ascLon ?? 0);
}

/** Point on a circle. SVG y grows downwards, hence the minus. */
export function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
}

const norm = (x: number) => ((x % 360) + 360) % 360;

/** Display longitudes so that glyphs at least `minSep` degrees apart don't overlap.
 *  Keeps order, centres each cluster on its true positions, and returns values in input order. */
export function spread(lons: number[], minSep: number): number[] {
  const n = lons.length;
  if (n < 2) return [...lons];
  const order = lons.map((l, i) => ({ l: norm(l), i })).sort((a, b) => a.l - b.l);

  // Start the walk after the largest gap so no cluster wraps around 0°.
  let start = 0;
  let largest = -1;
  for (let k = 0; k < n; k++) {
    const gap = norm(order[(k + 1) % n].l - order[k].l) || 360;
    if (gap > largest) {
      largest = gap;
      start = (k + 1) % n;
    }
  }
  const items = Array.from({ length: n }, (_, k) => order[(start + k) % n]);
  const base = items[0].l;
  const pos = items.map((it) => norm(it.l - base)); // unwrapped, ascending from 0

  // Merge neighbouring clusters until every gap is at least minSep.
  type Cluster = { first: number; count: number; centre: number };
  let clusters: Cluster[] = pos.map((p, k) => ({ first: k, count: 1, centre: p }));
  let merged = true;
  while (merged) {
    merged = false;
    for (let c = 0; c + 1 < clusters.length; c++) {
      const a = clusters[c], b = clusters[c + 1];
      const aEnd = a.centre + ((a.count - 1) * minSep) / 2;
      const bStart = b.centre - ((b.count - 1) * minSep) / 2;
      if (bStart - aEnd < minSep - 1e-9) {
        const count = a.count + b.count;
        const centre = pos.slice(a.first, a.first + count).reduce((s, x) => s + x, 0) / count;
        clusters.splice(c, 2, { first: a.first, count, centre });
        merged = true;
        break;
      }
    }
  }

  const out = new Array<number>(n);
  for (const c of clusters) {
    for (let k = 0; k < c.count; k++) {
      const display = c.centre + (k - (c.count - 1) / 2) * minSep;
      const item = items[c.first + k];
      out[item.i] = c.count === 1 ? item.l : norm(display + base); // lone points keep their exact place
    }
  }
  return out;
}
