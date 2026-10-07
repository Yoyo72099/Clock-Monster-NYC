/* Lost Time Monster — character system.
   A monster = a body silhouette (a NYC public-clock shape) + swappable parts, all drawn by
   js/hand.js so every line is wobbly and "boils" like a hand-animated drawing. Colour is flat and
   is a halftone dot pattern sitting slightly off its thick ink outline (misregistered photocopy), on a torn pink backing.
   Limbs, eyes and tails animate with SMIL. To add a new clock silhouette, add an entry to BODIES. */
(function () {
  const H = window.Hand;
  const INK = '#111111';
  const SCLERA = '#FFFFFF';
  const MOUTH = '#111111';
  const TONGUE = '#FF4F9A';
  const BLUSH = '#FF4F9A';
  const OCHRE = '#FFE14D';

  /* ---- colour helpers ---- */
  const rgb = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16)); };
  const hex = (a) => '#' + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = rgb(a); const B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); };
  const shade = (c, k) => (k >= 0 ? mix(c, '#1d1b22', k) : mix(c, '#ffffff', -k));
  const sq = (n) => n * n;
  const r1 = (n) => Math.round(n * 10) / 10;
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  /* ---- Body silhouettes -------------------------------------------------
     shapes: path data, drawn in order (later shapes cover earlier ones); nofill → outline only
     half(y): half-width of the body at height y (used to attach limbs)
     face:    [x, y, scale]   hat: [x, y of top]   arm: y of arm attach
     foot:    [y of bottom, dx]   tick: {c:[x,y], r}   w: widest width   bb: bounding box */
  /* Real NYC public clocks, redrawn as characters (see the reference photos):
       diamond  – lozenge clock with a crocketed stone frame on a church wall
       street   – cast-iron street clock: round rim, acorn finial, fluted column
       mercury  – Grand Central's dial under a winged Mercury
       pedestal – ornate lobby clock: statue and eagle on a flared cabinet
       brick    – brick tower clock with four stone blocks at 12/3/6/9
     plus two playful extras. A shape is drawn flat + inked; `f` picks its fill (col/dark/light/deep/cream),
     `line` = ink only, `dial` = the pale clock face (drawn on top, the monster's face sits on it),
     `top` = draw above the shading, `sway` = rotate gently (wings). */
  const CREAM = '#FAF9F5';
  function scallop(pts, n, bump, c) {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    pts.forEach((A, i) => {
      const B2 = pts[(i + 1) % pts.length]; const ex = B2[0] - A[0]; const ey = B2[1] - A[1]; const len = Math.hypot(ex, ey);
      let nx = -ey / len; let ny = ex / len; const mx = (A[0] + B2[0]) / 2 - c[0]; const my = (A[1] + B2[1]) / 2 - c[1];
      if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
      for (let k = 0; k < n; k++) {
        const p0 = [A[0] + (ex * k) / n, A[1] + (ey * k) / n]; const p1 = [A[0] + (ex * (k + 1)) / n, A[1] + (ey * (k + 1)) / n];
        d += `Q${r1((p0[0] + p1[0]) / 2 + nx * bump * 2)} ${r1((p0[1] + p1[1]) / 2 + ny * bump * 2)} ${r1(p1[0])} ${r1(p1[1])}`;
      }
    });
    return d + 'Z';
  }
  const mirrorX = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${200 - x} ${y}`);

  const BODIES = {
    diamond: {
      label: 'Diamond', from: '', w: 170, bb: [16, 20, 184, 196], face: [100, 108, 0.82], hat: [100, 22], arm: 128, foot: [190, 14],
      tick: { c: [100, 108], r: 49 },
      shapes: [
        { d: scallop([[100, 20], [184, 108], [100, 196], [16, 108]], 7, 6, [100, 108]) },
        { d: H.circ(100, 108, 61), f: 'dark' },
        { d: H.circ(100, 108, 54), f: 'cream', dial: 1 },
        { d: H.circ(100, 42, 6), line: 1, w: 2.4, top: 1 }, { d: H.circ(100, 174, 6), line: 1, w: 2.4, top: 1 },
      ],
      half: (y) => Math.max(0, 82 * (1 - Math.abs(y - 108) / 88)) + 5,
    },
    street: {
      label: 'Fifth Ave', from: 'Fifth Avenue Building clock', w: 132, bb: [34, 4, 166, 200], face: [100, 86, 0.86], hat: [100, 5], arm: 92, foot: [198, 30],
      tick: { c: [100, 86], r: 45 },
      shapes: [
        { d: 'M88 30Q92 8 100 4Q108 8 112 30Z', f: 'dark' },
        { d: 'M86 130H114L118 188H82Z' }, { d: 'M68 128H132V142H68Z', f: 'dark' }, { d: 'M64 186H136V200H64Z', f: 'dark' },
        { d: H.circ(100, 86, 66) }, { d: H.circ(100, 86, 60), f: 'dark' },
        { d: H.circ(100, 86, 52), f: 'cream', dial: 1 },
        { d: 'M90 148V184', line: 1, w: 1.6, top: 1 }, { d: 'M95 148V184', line: 1, w: 1.6, top: 1 }, { d: 'M100 148V184', line: 1, w: 1.6, top: 1 }, { d: 'M105 148V184', line: 1, w: 1.6, top: 1 }, { d: 'M110 148V184', line: 1, w: 1.6, top: 1 },
        { d: H.circ(80, 135, 4), line: 1, w: 2, top: 1 }, { d: H.circ(120, 135, 4), line: 1, w: 2, top: 1 },
      ],
      half: (y) => (y <= 142 ? Math.sqrt(Math.max(0, sq(66) - sq(y - 86))) : y <= 188 ? 18 : 34),
    },
    mercury: {
      label: 'Mercury', from: 'Grand Central Terminal, “Glory of Commerce”', w: 160, bb: [22, 38, 178, 192], face: [100, 130, 0.85], hat: [100, 40], arm: 150, foot: [192, 34],
      tick: { c: [100, 130], r: 44 },
      shapes: [
        { d: 'M92 80Q54 36 24 52Q52 60 84 94Z', f: 'dark', sway: [92, 82, -7] }, { d: mirrorX('M92 80Q54 36 24 52Q52 60 84 94Z'), f: 'dark', sway: [108, 82, 7] },
        { d: 'M22 192V152Q24 82 100 74Q176 82 178 152V192Z' },
        { d: H.circ(100, 130, 58), f: 'dark' }, { d: H.circ(100, 130, 50), f: 'cream', dial: 1 },
        { d: H.circ(100, 54, 7), line: 1, w: 2.6, top: 1 }, { d: 'M100 61V76M100 66L84 52M100 66L116 54M116 54V38', line: 1, w: 2.6, top: 1 },
      ],
      half: (y) => (y < 152 ? 78 * Math.sqrt(Math.max(0, 1 - sq((152 - y) / 78))) : 78),
    },
    pedestal: {
      label: 'Pedestal', from: '', w: 116, bb: [56, 10, 144, 200], face: [100, 98, 0.6], hat: [100, 10], arm: 100, foot: [196, 24],
      tick: { c: [100, 98], r: 28 },
      shapes: [
        { d: 'M100 48Q78 34 56 42Q78 46 94 56Z', f: 'dark', sway: [96, 50, -8] }, { d: 'M100 48Q122 34 144 42Q122 46 106 56Z', f: 'dark', sway: [104, 50, 8] },
        { d: 'M62 66Q70 46 100 40Q130 46 138 66Z', f: 'dark' },
        { d: 'M64 64H136L144 76V122L136 134H64L56 122V76Z' }, { d: 'M56 134H144L130 160H70Z', f: 'light' },
        { d: 'M72 160H128V188H72Z' }, { d: 'M58 188H142V200H58Z', f: 'dark' },
        { d: H.circ(100, 98, 38), f: 'dark' }, { d: H.circ(100, 98, 32), f: 'cream', dial: 1 },
        { d: H.circ(100, 16, 5), line: 1, w: 2.4, top: 1 }, { d: 'M100 40V22M100 30L110 16M100 30L92 36', line: 1, w: 2.4, top: 1 }, { d: H.circ(100, 174, 9), line: 1, w: 2.4, top: 1 },
      ],
      half: (y) => (y < 64 ? Math.max(0, (y - 40) * 1.5) : y <= 134 ? 44 : y <= 160 ? 44 - (y - 134) * 0.6 : y <= 188 ? 28 : 42),
    },
    brick: {
      label: 'Brick', from: '', w: 176, bb: [12, 20, 188, 200], face: [100, 110, 0.88], hat: [100, 22], arm: 110, foot: [200, 28],
      tick: { c: [100, 110], r: 46 },
      shapes: [
        { d: 'M88 20H112V58H88Z', f: 'light' }, { d: 'M88 162H112V200H88Z', f: 'light' }, { d: 'M150 98H188V122H150Z', f: 'light' }, { d: 'M12 98H50V122H12Z', f: 'light' },
        { d: H.circ(100, 110, 64), f: 'dark' }, { d: H.circ(100, 110, 58) }, { d: H.circ(100, 110, 52), f: 'cream', dial: 1 },
      ],
      half: (y) => (Math.abs(y - 110) <= 12 ? 88 : Math.sqrt(Math.max(0, sq(64) - sq(y - 110)))),
    },
    tower: {
      label: 'Clock Tower', from: 'Jefferson Market Library tower', w: 112, bb: [44, 6, 156, 198], face: [100, 112, 0.66], hat: [100, 6], arm: 118, foot: [196, 26],
      tick: { c: [100, 112], r: 27 },
      shapes: [
        { d: 'M95 24L100 6L105 24Z', f: 'dark' }, { d: 'M60 64L100 22L140 64Z', f: 'dark' }, { d: 'M56 64H144V80H56Z', f: 'light' },
        { d: 'M62 80H138V150H62Z' }, { d: 'M56 150H144L152 190H48Z', f: 'light' }, { d: 'M42 190H158V200H42Z', f: 'dark' },
        { d: H.circ(100, 112, 37), f: 'dark' }, { d: H.circ(100, 112, 32), f: 'cream', dial: 1 },
        { d: 'M64 100Q64 76 100 76Q136 76 136 100', line: 1, w: 2.4, top: 1 },
        { d: 'M62 166L80 176L98 166L116 176L134 166L146 172', line: 1, w: 1.8, top: 1 }, { d: 'M50 184Q100 176 150 184', line: 1, w: 2, top: 1 },
      ],
      half: (y) => (y < 64 ? Math.max(0, (y - 22) * 0.95) : y <= 80 ? 44 : y <= 150 ? 38 : y <= 190 ? 38 + (y - 150) * 0.25 : 58),
    },
    kiosk: {
      label: 'Info Kiosk', from: 'Top of the Rock information kiosk', w: 172, bb: [14, 16, 186, 198], face: [100, 66, 0.7], hat: [100, 18], arm: 162, foot: [198, 36],
      tick: { c: [100, 66], r: 31 },
      shapes: [
        { d: 'M42 116V72', line: 1, w: 3 }, { d: 'M42 72L68 80L42 90Z', f: 'light' }, { d: 'M158 116V72', line: 1, w: 3 }, { d: mirrorX('M42 72L68 80L42 90Z'), f: 'light' },
        { d: 'M34 132H166V198H34Z' },
        { d: 'M12 122Q12 106 40 104H160Q188 106 188 122Q188 134 170 136H30Q12 134 12 122Z', f: 'dark' },
        { d: H.circ(100, 66, 50), f: 'dark' }, { d: H.circ(100, 66, 44), f: 'light' }, { d: H.circ(100, 66, 36), f: 'cream', dial: 1 },
        { d: 'M26 114H74M126 114H174', line: 1, w: 1.8, top: 1 }, { d: 'M62 152H138V188H62Z', line: 1, w: 2.4, top: 1 },
      ],
      half: (y) => (y < 104 ? Math.sqrt(Math.max(0, sq(50) - sq(y - 66))) : y <= 136 ? 86 : 66),
    },
    round: {
      label: 'Pocket', from: '', w: 144, bb: [28, 38, 172, 182], face: [100, 110, 1], hat: [100, 38], arm: 112, foot: [178, 30],
      tick: { c: [100, 110], r: 59 },
      shapes: [{ d: H.circ(100, 110, 72) }],
      half: (y) => Math.sqrt(Math.max(0, sq(72) - sq(y - 110))),
    },
  };

  // Morandi: terracotta, sage, dusty blue, mustard, mauve, oat, slate-teal, rose
  const PALETTE = ['#111111', '#E0207A', '#FFB000', '#2F9BE0', '#7DBA3C', '#B65BD9', '#C79A5A', '#D42A1E'];

  const OPTIONS = {
    body: Object.keys(BODIES),
    color: PALETTE,
    eyes: ['pair', 'cyclops', 'three', 'dots', 'tall', 'googly'],
    teeth: ['none', 'fangs', 'zigzag', 'buck'],
    arms: ['none', 'stubby', 'noodle', 'many'],
    feet: ['none', 'boots', 'legs'],
    tail: ['none', 'pendulum', 'cord'],
    hat: ['none', 'nightcap', 'crown', 'antenna', 'sprout', 'party', 'pigeon', 'cone'],
    face: ['none', 'glasses', 'shades'],
    extra: ['none', 'bowtie', 'medal'],
    sleep: ['auto', 'on', 'off'],
    phase: ['auto', 'dawn', 'day', 'dusk', 'night'],
  };

  const DEFAULT = {
    body: 'diamond', color: '#111111', eyes: 'pair', teeth: 'none', arms: 'stubby', feet: 'boots',
    tail: 'pendulum', hat: 'none', face: 'none', extra: 'none', sleep: 'auto', phase: 'auto',
  };

  function normalize(c) {
    const out = Object.assign({}, DEFAULT, c || {});
    Object.keys(OPTIONS).forEach((k) => { if (OPTIONS[k].indexOf(out[k]) < 0 && k !== 'color') out[k] = DEFAULT[k]; });
    if (typeof out.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(out.color)) out.color = DEFAULT.color;
    return out;
  }

  /* ---- little drawing helpers (all hand-drawn) ---- */
  const ln = (d, o) => H.line(d, o);
  const pc = (d, fill, o) => H.shape(d, fill, o);        // flat colour + ink outline, off-register
  const circ = H.circ;

  /* ---- Face parts ------------------------------------------------------ */
  function eyeSet(style) {
    switch (style) {
      case 'cyclops': return [{ x: 0, y: -6, r: 22 }];
      case 'three': return [{ x: -30, y: -2, r: 10 }, { x: 0, y: -16, r: 11 }, { x: 30, y: -2, r: 10 }];
      case 'dots': return [{ x: -22, y: -6, r: 6, dot: 1 }, { x: 22, y: -6, r: 6, dot: 1 }];
      case 'googly': return [{ x: -22, y: -8, r: 14, googly: 1 }, { x: 24, y: -6, r: 10, googly: 1, alt: 1 }];
      case 'tall': return [{ x: -22, y: -22, r: 12, stalk: [-12, 4] }, { x: 22, y: -22, r: 12, stalk: [12, 4] }];
      default: return [{ x: -24, y: -8, r: 12 }, { x: 24, y: -8, r: 12 }];
    }
  }

  function spiral(R) {
    let d = ''; const turns = 2.6 * Math.PI * 2;
    for (let t = 0.3; t <= turns; t += 0.25) {
      const rad = (R * t) / turns;
      d += (d ? 'L' : 'M') + r1(Math.cos(t) * rad) + ' ' + r1(Math.sin(t) * rad);
    }
    return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3"><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1.4s" repeatCount="indefinite"/></path>`;
  }

  // brows in the eye's local coordinates (eye centre = 0,0)
  function brows(e, stage, k) {
    const r = e.r; const o = { w: 3.4, amp: 0.5, step: 5 };
    if (stage === 0) {
      if (k === 0) return ln(`M${-r} ${-r - 2}L0 ${-r - 10}L${r} ${-r - 2}`, o);
      return ln(`M${k * r} ${-r - 1}L${r1(-k * r * 0.9)} ${-r - 10}`, o);
    }
    if (stage === 3) return ln(`M${-r} ${-r - 5}Q0 ${-r - 13} ${r} ${-r - 5}`, o);
    return '';
  }

  function blink(inner, delay) {
    return `<g>${inner}<animateTransform attributeName="transform" type="scale" values="1 1;1 1;1 .08;1 1" keyTimes="0;.93;.965;1" dur="4.6s" begin="${delay}s" repeatCount="indefinite"/></g>`;
  }

  // googly eyes: the pupil is a loose bead that swings around the bottom of the eye
  function googlyEye(e) {
    const R = e.r; const pr = R * 0.5; const D = R - pr - 1.5; let vals = '';
    [-55, -28, 0, 28, 55, 28, 0, -28, -55].forEach((a) => { const t = (a * Math.PI) / 180; vals += `${r1(Math.sin(t) * D)} ${r1(Math.cos(t) * D)};`; });
    const body = H.flat(circ(0, 0, R), SCLERA, { dx: 1.2, dy: 1, amp: 0.7, step: 5 }) + ln(circ(0, 0, R), { w: 3.2, amp: 0.7, step: 5, boil: 1 });
    const bead = `<g><circle r="${r1(pr)}" fill="${INK}"/><circle cx="${r1(-pr * 0.35)}" cy="${r1(-pr * 0.35)}" r="${r1(pr * 0.28)}" fill="${SCLERA}"/><animateTransform attributeName="transform" type="translate" values="${vals.slice(0, -1)}" dur="${e.alt ? 1.3 : 1.8}s" repeatCount="indefinite"/></g>`;
    return `<g transform="translate(${e.x} ${e.y})">${body}${bead}</g>`;
  }

  function drawEye(e, stage, sleepy, lid, delay) {
    if (e.googly) return googlyEye(e);
    const r = e.r; const k = Math.sign(e.x) || 0; let inner = '';
    if (e.dot) {
      if (sleepy) inner = ln('M-8 0Q0 7 8 0', { w: 4.5, amp: 0.5, step: 4 });
      else if (stage >= 2) inner = ln('M-8 3Q0 -9 8 3', { w: 4.5, amp: 0.5, step: 4 });
      else inner = `<g class="pupil">${H.flat(circ(0, 0, r), INK, { amp: 0.6, step: 4 })}</g>`;
      return `<g transform="translate(${e.x} ${e.y})">${blink(inner, delay)}${sleepy ? '' : brows(e, stage, k)}</g>`;
    }
    inner += H.flat(circ(0, 0, r), SCLERA, { dx: 1.2, dy: 1, amp: 0.7, step: 5 }) + ln(circ(0, 0, r), { w: 3.2, amp: 0.7, step: 5, boil: 1 });
    if (stage === 4) inner += `<g class="pupil">${spiral(r * 0.78)}</g>`;
    else {
      const pr = [0.36, 0.46, 0.52, 0.62][stage] * r; const dy = stage === 0 ? 0.16 * r : 0;
      inner += `<g class="pupil">${H.flat(circ(0, r1(dy), r1(pr)), INK, { amp: 0.5, step: 4 })}`
        + (stage >= 2 ? `<circle cx="${r1(-pr * 0.35)}" cy="${r1(dy - pr * 0.35)}" r="${r1(pr * 0.28)}" fill="${SCLERA}"/>` : '') + '</g>';
    }
    if (sleepy) inner += `<path d="M${-r} 0A${r} ${r} 0 0 1 ${r} 0Z" fill="${lid}" stroke="${INK}" stroke-width="3.2"/>`;
    return `<g transform="translate(${e.x} ${e.y})">${blink(inner, delay)}${sleepy ? '' : brows(e, stage, k)}</g>`;
  }

  function teethRow(x0, x1, y, dir, n) {
    let s = ''; const step = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const a = x0 + i * step;
      s += pc(`M${r1(a)} ${y}L${r1(a + step / 2)} ${y + dir * 9}L${r1(a + step)} ${y}Z`, SCLERA, { w: 2, amp: 0.3, step: 5, off: 1 });
    }
    return s;
  }

  function mouthShape(stage, teeth, open) {
    const cheeks = (rr) => H.flat(circ(-40, 16, rr), BLUSH, { amp: 0.8, step: 5 }) + H.flat(circ(40, 16, rr), BLUSH, { amp: 0.8, step: 5 });
    const line = (d) => ln(d, { w: 4.2, amp: 0.7, step: 5 });
    const buck = (y, h) => pc(`M-8 ${y}h8v${h}h-8Z`, SCLERA, { w: 2, amp: 0.2, step: 5, off: 1 }) + pc(`M0 ${y}h8v${h}h-8Z`, SCLERA, { w: 2, amp: 0.2, step: 5, off: 1 });
    const fang = (x, y) => pc(`M${x} ${y}l3.5 8 3.5-8Z`, SCLERA, { w: 2, amp: 0.2, step: 5, off: 1 });
    if (open) {
      return pc('M-42 4Q0 -6 42 4L42 28Q38 74 0 74Q-38 74 -42 28Z', MOUTH, { w: 4, amp: 1, off: 2 })
        + H.flat('M-20 62A20 10 0 1 0 20 62A20 10 0 1 0 -20 62Z', TONGUE, { amp: 0.8 })
        + (teeth === 'none' ? '' : teeth === 'buck' ? buck(0, 13) : teethRow(-36, 36, 6, 1, 6) + teethRow(-26, 26, 70, -1, 4));
    }
    if (stage === 0) return line('M-14 32Q0 21 14 32') + (teeth === 'fangs' ? fang(-7, 28) : teeth === 'buck' ? buck(26, 8) : '');
    if (stage === 1) return line('M-14 24Q0 35 14 24') + (teeth === 'fangs' ? fang(-11, 29) + fang(5, 29) : teeth === 'buck' ? buck(29, 9) : '');
    if (stage === 2) return cheeks(7) + line('M-22 22Q0 43 22 22') + (teeth === 'fangs' ? fang(-15, 31) + fang(8, 31) : teeth === 'buck' ? buck(33, 10) : '');
    const big = stage === 4;
    if (big) {
      // about to burst: a wide flat-topped "D" grin with a pink tongue, cheeks blushing at the corners
      return cheeks(10) + pc('M-38 12Q0 22 38 12Q34 48 0 48Q-34 48 -38 12Z', MOUTH, { w: 4, amp: 1, off: 2 })
        + H.flat(H.ell(0, 40, 13, 7), TONGUE, { amp: 0.6 }) + (teeth === 'buck' ? buck(18, 11) : teeth === 'zigzag' ? teethRow(-30, 30, 17, 1, 6) : teeth === 'fangs' ? fang(-28, 16) + fang(20, 16) : '');
    }
    const w = 30; const h = 52;
    const row = teeth === 'buck' ? buck(20, 11) : teeth === 'zigzag' ? teethRow(-w + 4, w - 4, 16, 1, 6) : (teeth === 'fangs' ? fang(-w + 10, 17) + fang(w - 18, 17) : '');
    return cheeks(7) + pc(`M-${w} 14Q0 26 ${w} 14Q${w - 4} ${h} 0 ${h}Q-${w - 4} ${h} -${w} 14Z`, MOUTH, { w: 4, amp: 1, off: 2 })
      + H.flat(`M-12 ${h - 9}A12 7 0 1 0 12 ${h - 9}A12 7 0 1 0 -12 ${h - 9}Z`, TONGUE, { amp: 0.7 }) + row;
  }

  // chewing: the mouth squashes open/closed about its top edge
  function mouth(stage, teeth, open) {
    const m = mouthShape(stage, teeth, open);
    if (!open && stage < 3) return m;
    const dur = open ? 0.8 : (stage === 4 ? 0.75 : 1.4); const to = open ? 0.84 : 0.9;
    return `<g transform="translate(0 18)"><g><animateTransform attributeName="transform" type="scale" values="1 1;1 ${to};1 1" dur="${dur}s" repeatCount="indefinite"/><g transform="translate(0 -18)">${m}</g></g></g>`;
  }

  function star(x, y, s) {
    return `<path class="spark" d="M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z" fill="#FFE14D" stroke="${INK}" stroke-width="2"/>`;
  }

  /* ---- Hats / accessories ---------------------------------------------- */
  function hat(kind) {
    const o = { w: 3.4, amp: 0.9, step: 6 };
    switch (kind) {
      case 'nightcap': return pc('M-36 10Q-32 -36 12 -42Q38 -46 52 -28Q32 -22 34 10Z', '#FF4F9A', o) + pc('M-38 2H38V16H-38Z', SCLERA, { w: 3.4, amp: 0.8, step: 6 }) + pc(circ(52, -28, 9), SCLERA, { w: 3, amp: 0.5, step: 5 }) + ln('M-14 -14l6 6M6 -24l6 6', { c: SCLERA, w: 3.4, amp: 0.3 });
      case 'crown': return pc('M-28 8L-32 -24L-14 -8L0 -30L14 -8L32 -24L28 8Z', '#FFE14D', o) + H.flat(circ(0, -2, 4), '#FF4F9A', { amp: 0.3, step: 4 });
      case 'antenna': return ln('M0 8V-26', { w: 3.6, amp: 1 }) + pc(circ(0, -34, 9), '#FF4F9A', { w: 3.4, amp: 0.6, step: 5 });
      case 'sprout': return ln('M0 8Q0 -14 0 -22', { w: 3.6, amp: 0.8 }) + pc('M0 -20Q-30 -30 -34 -50Q-4 -52 0 -20Z', '#DDF1B0', { w: 3, amp: 0.7, step: 6 }) + pc('M0 -20Q30 -26 36 -44Q6 -48 0 -20Z', '#DDF1B0', { w: 3, amp: 0.7, step: 6 });
      case 'party': return pc('M-24 10L0 -46L24 10Z', '#FFE14D', o) + ln('M-14 -12L14 -12M-19 -1L19 -1', { c: '#FF4F9A', w: 4, amp: 0.4 }) + pc(circ(0, -48, 7), '#FF4F9A', { w: 3, amp: 0.4, step: 5 });
      case 'pigeon': return ln('M0 8L-6 5L6 2L-6 -1L6 -4L-6 -7L0 -10', { w: 3, amp: 0.4, step: 5 })
        + `<g transform="translate(0 -12) scale(1.3)"><g>${pc('M-13 -13L-27 -22L-24 -9Z', '#C9CED6', { w: 2.6, amp: 0.4, step: 5, off: 1 })}${pc(H.ell(0, -12, 15, 9), '#C9CED6', { w: 3, amp: 0.6, step: 5, off: 1.2 })}${ln('M-8 -14Q0 -22 10 -12', { w: 2.2, amp: 0.4, step: 5 })}${pc(circ(13, -24, 6.5), '#C9CED6', { w: 3, amp: 0.4, step: 5, off: 1 })}${pc('M18 -25L27 -23L18 -21Z', '#FFE14D', { w: 2, amp: 0.2, step: 5, off: 0.8 })}<circle cx="15" cy="-25.5" r="1.5" fill="${INK}"/>${ln('M-3 -3V0M4 -3V0', { w: 2.4, amp: 0.2 })}<animateTransform attributeName="transform" type="rotate" values="0 2 -2;14 2 -2;0 2 -2;0 2 -2;11 2 -2;0 2 -2;0 2 -2" keyTimes="0;.1;.2;.5;.6;.7;1" dur="3s" repeatCount="indefinite"/></g></g>`;
      case 'cone': return pc('M-14 6L-6 -34L6 -34L14 6Z', '#FF8A1F', { w: 3.4, amp: 0.5, step: 6, off: 1.2 }) + pc('M-10.6 -9L-8.4 -19L8.4 -19L10.6 -9Z', '#FFFFFF', { w: 2.4, amp: 0.3, step: 6, off: 0.8 }) + pc('M-23 6H23V13H-23Z', INK, { w: 3, amp: 0.5, step: 6, off: 1 });
      default: return '';
    }
  }

  function glasses(kind, eyes) {
    if (kind === 'none') return '';
    let s = '';
    eyes.forEach((e) => {
      const r = e.r + 6;
      if (kind === 'glasses') s += ln(circ(e.x, e.y, r), { w: 3.6, amp: 0.7, step: 5 }) + `<path d="${H.wob(circ(e.x, e.y, r), { amp: 0.7, step: 5, seed: 5 })}" fill="#fff" fill-opacity=".18"/>`;
      else s += H.flat(circ(e.x, e.y, r), INK, { amp: 0.7, step: 5 }) + `<path d="M${e.x - r * 0.5} ${e.y - r * 0.25}l${r * 0.4} -${r * 0.3}" stroke="${SCLERA}" stroke-width="2.5" opacity=".7"/>`;
    });
    if (eyes.length >= 2) {
      const a = eyes[0]; const b = eyes[eyes.length - 1];
      s += ln(`M${a.x + a.r + 6} ${a.y}L${b.x - b.r - 6} ${b.y}`, { w: 3.6, amp: 0.4 });
    }
    return s;
  }

  /* ---- Public: render ---------------------------------------------------
     opts: stage 0..4 (mood), mouth:'open' to gape, phase for time-of-day */
  let uidN = 0;
  function render(cfgIn, opts) {
    const cfg = normalize(cfgIn); opts = opts || {};
    const id = 'm' + (++uidN);
    const B = BODIES[cfg.body]; const col = cfg.color;
    H.reseed(hash(cfg.body + col + cfg.arms + cfg.feet + cfg.tail));
    const stage = Math.max(0, Math.min(4, opts.stage == null ? 2 : opts.stage));
    const night = opts.phase === 'night';
    const pj = cfg.sleep === 'on' || (cfg.sleep === 'auto' && night);
    const sleepy = night && stage <= 2 && !opts.mouth;
    const [fx, fy, fs] = B.face;
    const [bx0, by0, bx1, by1] = B.bb;
    const limb = INK;
    const amp = [3, 4, 6, 9, 12][stage]; const dur = [3.8, 3.2, 2.8, 1.9, 1.3][stage];
    const rr = H.rand(hash(cfg.body + col) + 9);

    const solid = B.shapes.filter((s) => !s.line && !s.dial);
    const defs = `<clipPath id="c${id}">${solid.map((s) => `<path d="${s.d}"/>`).join('')}</clipPath>`
      + `<pattern id="h${id}" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#FFFFFF"/><circle cx="3" cy="3" r="1.9" fill="${col}"/></pattern>`;
    const FILL = { col: `url(#h${id})`, dark: INK, light: '#FFFFFF', deep: INK, cream: CREAM };
    const dialShape = B.shapes.find((s) => s.dial);

    const hose = (d) => { const sd = H.seedOf(); return H.line(d, { c: INK, w: 12.5, amp: 1.1, step: 9, seed: sd }) + H.line(d, { c: limb, w: 7.5, amp: 1.1, step: 9, seed: sd }); };
    const handAt = (x, y, r) => pc(circ(r1(x), r1(y), r), OCHRE, { w: 3, amp: 0.7, step: 5, off: 1.2 });
    const wave = (g, x, y, a, d, begin) => `<g>${g}<animateTransform attributeName="transform" type="rotate" values="${-a} ${r1(x)} ${y};${a} ${r1(x)} ${y};${-a} ${r1(x)} ${y}" dur="${d}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1"/></g>`;
    let behind = '';

    // tail: pendulum or power cord (with plug), hanging out from under the body
    if (cfg.tail === 'pendulum') {
      const py = B.foot[0] - 16;
      const a = stage === 4 ? 16 : stage === 3 ? 14 : 10; const d = stage === 4 ? 1.5 : 2.6;
      behind += wave(ln(`M100 ${py}V${py + 40}`, { w: 3.2, amp: 0.8 }) + pc(circ(100, py + 50, 12), '#FFE14D', { w: 3.2, amp: 0.8, step: 5 }), 100, py, a, d, 0);
    } else if (cfg.tail === 'cord') {
      const y0 = B.foot[0] - 26; const x0 = 100 + B.half(y0) - 8;
      behind += wave(ln(`M${r1(x0)} ${y0}C${r1(x0 + 34)} ${y0 + 4} ${r1(x0 + 6)} ${y0 + 34} ${r1(x0 + 40)} ${y0 + 42}`, { w: 3.4, amp: 0.8 })
        + `<g transform="translate(${r1(x0 + 40)} ${y0 + 42}) rotate(-28)">${pc('M-4 -6H11V6H-4Z', '#FFFFFF', { w: 2.6, amp: 0.4, step: 5, off: 1 })}${ln('M11 -3h6M11 3h6', { w: 2.6, amp: 0.2 })}</g>`, x0, y0, stage >= 3 ? 9 : 6, stage >= 3 ? 1.6 : 3, 0);
    }

    // limbs + feet are drawn behind the body
    if (cfg.arms !== 'none') {
      const ay = B.arm;
      [-1, 1].forEach((sg) => {
        const x0 = 100 + sg * (B.half(ay) - 6); const bg = sg < 0 ? 0 : -dur / 2;
        if (cfg.arms === 'stubby') {
          const x1 = x0 + sg * 28; const y1 = ay - 14;
          behind += wave(hose(`M${r1(x0)} ${ay}L${r1(x1)} ${y1}`) + handAt(x1, y1, 10), x0, ay, amp, dur, bg);
        } else if (cfg.arms === 'noodle') {
          behind += wave(hose(`M${r1(x0)} ${ay}C${r1(x0 + sg * 44)} ${ay + 12} ${r1(x0 + sg * 6)} ${ay - 44} ${r1(x0 + sg * 34)} ${ay - 66}`) + handAt(x0 + sg * 34, ay - 66, 10), x0, ay, amp, dur, bg);
        } else {
          [-44, -22, 0, 22, 44].forEach((o, i) => {
            const y = ay + o; const h = B.half(y);
            if (h < 14) return;
            const xs = 100 + sg * (h - 6); const x1 = xs + sg * (18 + (i % 2) * 6); const y1 = y - 6;
            behind += wave(hose(`M${r1(xs)} ${y}L${r1(x1)} ${r1(y1)}`) + handAt(x1, y1, 7), xs, y, amp * 0.8, dur * (0.8 + i * 0.1), -i * 0.2);
          });
        }
      });
    }
    if (cfg.feet !== 'none') {
      const fy2 = B.foot[0]; const dx = B.foot[1];
      [-1, 1].forEach((sg) => {
        if (cfg.feet === 'boots') behind += pc(H.ell(100 + sg * dx, fy2 + 3, 17, 11), OCHRE, { w: 3, amp: 0.9, step: 6, off: 1.5 });
        else behind += hose(`M${100 + sg * dx} ${fy2 - 12}L${100 + sg * dx} ${fy2 + 14}`) + pc(H.ell(100 + sg * (dx + 6), fy2 + 20, 16, 8), OCHRE, { w: 3, amp: 0.8, step: 6, off: 1.5 });
      });
    }

    // body: flat colour (off-register) + slowly drifting ink outline + a loose second pencil line
    const drawShape = (sh) => {
      let o = '';
      if (sh.line) o = ln(sh.d, { w: sh.w || 2.6, amp: 0.9, boil: 1 });
      else {
        o += H.flat(sh.d, FILL[sh.f || 'col'], { dx: sh.dial ? 3 : 5, dy: sh.dial ? 2.4 : 4, amp: 1.2 });
        o += ln(sh.d, { w: sh.w || (sh.dial ? 3.2 : 5.5), amp: 1.4, boil: 1 });
      }
      if (sh.sway) { const [px, py, ang] = sh.sway; o = `<g>${o}<animateTransform attributeName="transform" type="rotate" values="0 ${px} ${py};${ang} ${px} ${py};0 ${px} ${py}" dur="${r1(dur * 1.4)}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1"/></g>`; }
      return o;
    };
    let body = '';
    if (!opts.plain) {
      // torn pink paper behind the body
      const [tx0, ty0, tx1, ty1] = B.bb; const tcx = (tx0 + tx1) / 2; const tcy = (ty0 + ty1) / 2; const trx = (tx1 - tx0) / 2; const try2 = (ty1 - ty0) / 2; let pts = '';
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + (rr() - 0.5) * 0.2; const k = i % 2 ? 1.12 + rr() * 0.1 : 1.0 + rr() * 0.06; pts += `${r1(tcx + Math.cos(a) * trx * k + 4)},${r1(tcy + Math.sin(a) * try2 * k + 6)} `; }
      body += `<polygon points="${pts}" fill="#FF4F9A"/>`;
    }
    // hard ink offset shadow under the solid shapes
    B.shapes.filter((x) => !x.line && !x.dial).forEach((x) => { body += `<g transform="translate(7 8)" opacity=".16">${H.flat(x.d, '#000', { amp: 1.2 })}</g>`; });
    B.shapes.filter((x) => !x.top && !x.dial).forEach((x) => { body += drawShape(x); });

    if (pj) {
      let y0 = fy + 40 * fs + 4;
      if (dialShape) { const m = /A(\d+)/.exec(dialShape.d); y0 = Math.max(y0, B.face[1] + (m ? +m[1] : 40) + 4); }
      let st = `<rect x="-10" y="${r1(y0)}" width="220" height="220" fill="#FFFFFF"/>`;
      for (let x = -4; x < 210; x += 17) st += ln(`M${x} ${r1(y0)}V${r1(y0 + 150)}`, { c: '#FF4F9A', w: 7, amp: 1.1, step: 12 });
      st += ln(`M-10 ${r1(y0)}H210`, { w: 3, amp: 1 });
      body += `<g clip-path="url(#c${id})">${st}</g>`;
    }
    B.shapes.filter((x) => x.top || x.dial).forEach((x) => { body += drawShape(x); });

    if (B.tick) {
      const [cx, cy] = B.tick.c;
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6; const r2 = B.tick.r; const r0 = r2 - (i % 3 === 0 ? 10 : 5);
        body += ln(`M${r1(cx + Math.sin(a) * r0)} ${r1(cy - Math.cos(a) * r0)}L${r1(cx + Math.sin(a) * r2)} ${r1(cy - Math.cos(a) * r2)}`, { w: 2.8, amp: 0.5, step: 6, op: 0.4 });
      }
    }

    // face
    const eyes = eyeSet(cfg.eyes).map((e) => (stage === 4 && !e.googly ? Object.assign({}, e, { r: e.r * 1.3 }) : e));
    let face = '';
    eyes.forEach((e) => { if (e.stalk) face += ln(`M${e.stalk[0]} ${e.stalk[1]}L${e.x} ${r1(e.y + e.r * 0.5)}`, { w: 4, amp: 0.6 }); });
    const delay = (uidN % 5) * 0.6;
    eyes.forEach((e) => { face += drawEye(e, opts.mouth ? 3 : stage, sleepy, dialShape ? CREAM : col, delay); });
    face += mouth(stage, cfg.teeth, opts.mouth === 'open');
    face += glasses(cfg.face, eyes);
    if (stage === 4 && !opts.mouth) face += `<path class="sweat" d="M52 -22q-8 14 0 18q8 -4 0 -18Z" fill="#B5CBD6" stroke="${INK}" stroke-width="2.5"/>`
      + `<path d="M-62 4q-8 14 0 28M62 4q8 14 0 28M-70 2q-8 18 0 34M70 2q8 18 0 34" fill="none" stroke="${INK}" stroke-width="2.6" opacity=".4"/>`;
    let front = `<g transform="translate(${fx} ${fy}) scale(${fs})">${face}</g>`;

    // extras
    if (cfg.extra === 'bowtie') front += `<g transform="translate(${fx} ${r1(fy + 54 * fs)})">${pc('M0 0L-22 -12V12ZM0 0L22 -12V12Z', '#FF4F9A', { w: 3.2, amp: 0.6, step: 6, off: 1.5 })}${pc(circ(0, 0, 5), SCLERA, { w: 2.6, amp: 0.3, step: 4, off: 0.6 })}</g>`;
    if (cfg.extra === 'medal') front += `<g transform="translate(${fx + 36} ${r1(fy + 50 * fs)})">${ln('M-8 -22L-3 -4M8 -22L3 -4', { w: 3.6, amp: 0.4 })}${pc(circ(0, 0, 12), '#FFE14D', { w: 3.2, amp: 0.6, step: 5, off: 1 })}<path d="M0 -6L2 -1H7L3 2L4.5 7L0 4L-4.5 7L-3 2L-7 -1H-2Z" fill="#B86F5C"/></g>`;

    if (!opts.plain) front += `<rect x="${r1(bx0 + (bx1 - bx0) * 0.04)}" y="${r1(by0 + (by1 - by0) * 0.1)}" width="64" height="18" fill="#FFEFA8" opacity=".85" transform="rotate(-30 ${r1(bx0 + (bx1 - bx0) * 0.04 + 32)} ${r1(by0 + (by1 - by0) * 0.1 + 9)})"/>`;
    const hk = (pj && cfg.hat === 'none') ? 'nightcap' : cfg.hat;
    front += `<g transform="translate(${B.hat[0]} ${B.hat[1] + 4})">${hat(hk)}</g>`;

    if (stage === 3 && !opts.mouth) front += star(B.hat[0] - 78, B.hat[1] + 24, 9) + star(B.hat[0] + 80, B.hat[1] + 12, 11) + star(B.hat[0] + 70, B.hat[1] + 62, 7);
    if (sleepy && stage <= 1) front += `<g class="zz" font-family="'EB Garamond', Georgia, serif" font-style="italic" font-weight="600" fill="${INK}"><text x="${B.hat[0] + 60}" y="${B.hat[1] - 4}" font-size="26">Z</text><text x="${B.hat[0] + 84}" y="${B.hat[1] - 22}" font-size="18">z</text></g>`;

    return `<svg class="mon" viewBox="-30 -44 260 292" xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" role="img" aria-label="Lost time monster"><defs>${defs}</defs><g class="mon-body">${behind}${body}${front}</g></svg>`;
  }

  /* where the mouth is, in svg coordinates (for flying things into it) */
  function mouthPoint(cfgIn) {
    const B = BODIES[normalize(cfgIn).body];
    return [B.face[0], B.face[1] + 32 * B.face[2]];
  }

  function random(rng) {
    rng = rng || Math.random;
    const pick = (a) => a[Math.floor(rng() * a.length)];
    const c = {};
    Object.keys(OPTIONS).forEach((k) => { if (k !== 'sleep' && k !== 'phase') c[k] = pick(OPTIONS[k]); });
    c.sleep = 'auto'; c.phase = 'auto';
    return c;
  }

  window.Monster = { render, mouthPoint, random, normalize, BODIES, OPTIONS, DEFAULT, PALETTE };
})();
