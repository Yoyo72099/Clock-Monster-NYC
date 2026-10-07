/* Hand — turns clean SVG path data into hand-drawn lines.
   It samples a path, nudges every point sideways with smooth random noise, and redraws it as a
   Catmull-Rom curve. Called with different seeds it gives slightly different drawings of the
   same shape, which the monsters cycle through at ~1.3 fps so the lines "boil" like a pencil
   test animation. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  let probe = null;
  const cache = new Map();

  function getProbe() {
    if (!probe) {
      const s = document.createElementNS(NS, 'svg');
      s.setAttribute('width', '0'); s.setAttribute('height', '0');
      s.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden;pointer-events:none';
      probe = document.createElementNS(NS, 'path');
      s.appendChild(probe); document.body.appendChild(s);
    }
    return probe;
  }

  function rand(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function sample(d, step) {
    const key = step + '|' + d; let c = cache.get(key); if (c) return c;
    const p = getProbe(); p.setAttribute('d', d);
    const L = p.getTotalLength(); const closed = /z\s*$/i.test(d.trim());
    const n = Math.max(closed ? 6 : 2, Math.round(L / step)); const m = closed ? n : n + 1; const pts = [];
    for (let i = 0; i < m; i++) { const q = p.getPointAtLength((L * i) / n); pts.push([q.x, q.y]); }
    c = { pts, closed }; cache.set(key, c); return c;
  }

  const f1 = (n) => Math.round(n * 10) / 10;

  function wob(d, o) {
    o = o || {};
    const amp = o.amp == null ? 1.4 : o.amp; const step = o.step || 7; const rnd = rand(o.seed || 1);
    const { pts, closed } = sample(d, step); const n = pts.length;
    let off = pts.map(() => rnd() * 2 - 1);
    for (let k = 0; k < 2; k++) off = off.map((v, i) => (off[(i + n - 1) % n] + 2 * v + off[(i + 1) % n]) / 4);
    const gain = amp * 1.9;
    const P = pts.map((p, i) => {
      const a = pts[closed ? (i + n - 1) % n : Math.max(0, i - 1)]; const b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0]; let ty = b[1] - a[1]; const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
      return [p[0] - ty * off[i] * gain, p[1] + tx * off[i] * gain];
    });
    const at = (i) => (closed ? P[(i + n * 4) % n] : P[Math.max(0, Math.min(n - 1, i))]);
    let s = `M${f1(P[0][0])} ${f1(P[0][1])}`;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = at(i - 1); const p1 = at(i); const p2 = at(i + 1); const p3 = at(i + 2);
      s += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return closed ? s + 'Z' : s;
  }

  const circ = (x, y, r) => `M${x - r} ${y}A${r} ${r} 0 1 0 ${x + r} ${y}A${r} ${r} 0 1 0 ${x - r} ${y}Z`;
  const ell = (x, y, rx, ry) => `M${x - rx} ${y}A${rx} ${ry} 0 1 0 ${x + rx} ${y}A${rx} ${ry} 0 1 0 ${x - rx} ${y}Z`;

  /* ---- ready-made SVG strings ---- */
  let counter = 1;
  const seedOf = () => (counter = (Math.imul(counter, 1664525) + 1013904223) >>> 0);

  // an inked line. boil → 3 drawings, cycled discretely
  function line(d, o) {
    o = o || {};
    const c = o.c || '#34323A'; const w = o.w || 3; const amp = o.amp == null ? 1.4 : o.amp; const step = o.step || 7;
    const s = o.seed || seedOf();
    const attrs = `fill="${o.fill || 'none'}" stroke="${c}" stroke-width="${w}"${o.op != null && o.op < 1 ? ` opacity="${o.op}"` : ''}`;
    const d0 = wob(d, { amp, step, seed: s });
    if (!o.boil) return `<path d="${d0}" ${attrs}/>`;
    const d1 = wob(d, { amp, step, seed: s + 101 }); const d2 = wob(d, { amp, step, seed: s + 202 });
    return `<path d="${d0}" ${attrs}><animate attributeName="d" values="${d0};${d1};${d2};${d0}" dur="${(5 + (s % 30) / 8).toFixed(1)}s" begin="-${(s % 50) / 10}s" calcMode="spline" keyTimes="0;.33;.66;1" keySplines=".45 0 .55 1;.45 0 .55 1;.45 0 .55 1" repeatCount="indefinite"/></path>`;
  }
  // flat colour, deliberately a little off-register from its outline
  function flat(d, fill, o) {
    o = o || {};
    const tr = o.dx || o.dy ? ` transform="translate(${o.dx || 0} ${o.dy || 0})"` : '';
    return `<path d="${wob(d, { amp: o.amp == null ? 1.6 : o.amp, step: o.step || 7, seed: o.seed || seedOf() })}" fill="${fill}"${tr}/>`;
  }
  // flat fill + ink outline in one go
  function shape(d, fill, o) {
    o = o || {}; const off = o.off == null ? 2 : o.off;
    return flat(d, fill, { dx: off, dy: off * 0.8, amp: o.amp, step: o.step }) + line(d, { w: o.w || 3, amp: o.amp == null ? 1.2 : o.amp, step: o.step, c: o.c, boil: o.boil });
  }
  function reseed(n) { counter = (n >>> 0) || 1; }

  window.Hand = { wob, rand, circ, ell, line, flat, shape, reseed, seedOf };
})();
