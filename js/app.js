/* Lost Time Monster — app logic (vanilla JS, hash routes: #/ #/report #/wall #/dress) */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const M = window.Monster;
  const CAP = 1500; const CAPK = '';            // minutes it takes to fill (and burst) one monster
  const DAILY = 450;            // fake baseline: ~30% of a monster by midnight — the rest has to be fed by real people
  const MOODS = ["It's still hungry.", 'Nom nom. Still peckish.', "Pretty content, actually.", "It's thrilled. Keep going?", "It can't hold much more…"];
  const CHIPS = [
    ['train', 'Train delay'], ['coffee', 'Coffee line'], ['phone', 'Doomscrolling'], ['umbrella', 'Rain'],
    ['card', "Card won't swipe"], ['pizza', 'Waiting on food'], ['bagel', 'Wrong way / lost'], ['hourglass', 'Other'],
  ];

  /* ---------- fake-but-plausible seed data (minute of day, minutes lost, icon, text) ---------- */
  const SEEDS = [
    [372, 14, 'train', 'L train delay at Bedford'], [405, 8, 'train', 'Waiting for the F at 14th St'],
    [430, 6, 'coffee', 'Coffee line on 3rd Ave'], [465, 19, 'train', 'Stuck in the tunnel past DeKalb'],
    [505, 11, 'phone', 'Scrolling in bed. Just five more minutes'], [540, 7, 'card', 'MetroCard wouldn’t swipe'],
    [585, 23, 'hourglass', 'Meeting that could have been an email'], [640, 5, 'bagel', 'Walked the wrong way out of the station'],
    [705, 15, 'pizza', 'Slice line, 12:40pm'], [760, 10, 'phone', 'Doomscrolling at my desk'],
    [835, 26, 'train', 'Express train running local'], [905, 13, 'umbrella', 'Rain. No umbrella. Waiting under scaffolding'],
    [985, 9, 'coffee', 'Oat milk shortage, apparently'], [1045, 31, 'train', 'Signal problems, Port Authority'],
    [1090, 12, 'bagel', 'Lost in Port Authority'], [1135, 18, 'phone', 'Scrolling in line at the bodega'],
    [1190, 8, 'hourglass', 'Waiting for takeout'], [1255, 21, 'train', 'Stuck on the 6 train'],
    [1310, 14, 'phone', 'Scrolling in bed'], [1385, 17, 'phone', 'One more video'],
  ];

  /* ---------- time helpers (day = New York day) ---------- */
  function nyNow() {
    const p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
    return { day: `${p.year}-${p.month}-${p.day}`, min: (+p.hour) * 60 + (+p.minute) + (+p.second) / 60 };
  }
  const fmtTime = (ms) => new Date(ms).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
  const fmtTod = (m) => { const h = Math.floor(m / 60); return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  function localPhase() { const h = new Date().getHours(); return h >= 5 && h < 9 ? 'dawn' : h >= 9 && h < 17 ? 'day' : h >= 17 && h < 21 ? 'dusk' : 'night'; }
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const seeded = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* cumulative commute-shaped curve: share of the day's lost minutes elapsed at minute m */
  const CUM = (function () {
    const peaks = [[510, 70, 0.30], [750, 90, 0.14], [1080, 90, 0.36], [1320, 110, 0.20]];
    const w = []; let sum = 0;
    for (let m = 0; m < 1440; m++) {
      let v = 0.00002; peaks.forEach((p) => { v += p[2] * Math.exp(-0.5 * Math.pow((m - p[0]) / p[1], 2)) / p[1]; });
      w.push(v); sum += v;
    }
    const out = [0]; let acc = 0; w.forEach((v) => { acc += v / sum; out.push(acc); });
    return out;
  }());
  function baseline(day, min) {
    const mult = 0.9 + (hash(day) % 2000) / 10000;       // each day a bit different: 0.9–1.1
    const i = Math.min(1439, Math.floor(min)); const fr = min - i;
    return DAILY * mult * (CUM[i] + (CUM[i + 1] - CUM[i]) * fr);
  }

  /* ---------- state ---------- */
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };
  const state = {
    cfg: M.normalize(ls.get('ltm.cfg', null)),
    uid: ls.get('ltm.uid', null) || (function () { const u = Math.random().toString(36).slice(2, 10); ls.set('ltm.uid', u); return u; }()),
    day: nyNow().day, stored: [], total: 0, f: 0, cycle: 0,
    override: null, exploding: false, phase: 'day', mins: 10, chip: null, stage: 0,
  };
  const saveCfg = () => ls.set('ltm.cfg', state.cfg);
  const stageOf = (f) => (f < 0.15 ? 0 : f < 0.4 ? 1 : f < 0.65 ? 2 : f < 0.85 ? 3 : 4);

  function mergedEntries() {
    const now = nyNow(); const overlay = {}; const users = [];
    state.stored.forEach((e) => { if (String(e.id).indexOf('seed-') === 0) overlay[e.id] = e; else if (e.minutes) users.push(e); });
    const seeds = SEEDS.map((s, i) => {
      const id = 'seed-' + i; const o = overlay[id] || {};
      const rng = seeded(hash(id));
      return { id, minutes: s[1], icon: s[2], text: s[3], tod: s[0], seed: true, m: M.random(rng), reclaim: o.reclaim };
    }).filter((s) => s.tod <= now.min);
    return seeds.concat(users);
  }
  function computeTotal() {
    const now = nyNow();
    if (now.day !== state.day) { state.day = now.day; refresh(); }
    const all = mergedEntries(); let t = baseline(now.day, now.min);
    all.forEach((e) => { if (!e.seed) t += e.minutes; if (e.reclaim) t -= e.minutes; });
    return Math.max(0, t);
  }
  async function refresh() { state.stored = await Store.list(state.day); tick(); if (currentView() === 'wall') renderWall(); }

  /* ---------- theme ---------- */
  function applyPhase() {
    const p = state.cfg.phase === 'auto' ? localPhase() : state.cfg.phase;
    if (p !== state.phase || !document.documentElement.dataset.phase) {
      state.phase = p; document.documentElement.dataset.phase = p;
      const m = document.querySelector('meta[name=theme-color]');
      if (m) m.content = { dawn: '#F5B993', day: '#ECEAE3', dusk: '#A58FD0', night: '#2B2A28' }[p];
    }
  }

  /* ---------- monster drawing helpers ---------- */
  const keys = new WeakMap();
  function drawMon(el, cfg, o) {
    const k = JSON.stringify([cfg, o.stage, o.mouth, state.phase]);
    if (keys.get(el) === k) return el.querySelector('.mon');
    keys.set(el, k);
    el.innerHTML = M.render(cfg, { stage: o.stage, mouth: o.mouth, phase: state.phase });
    return el.querySelector('.mon');
  }

  /* ---------- home ---------- */
  let shown = 0; let target = 0; let raf = 0;
  function setCount(n) { target = n; if (!raf) raf = requestAnimationFrame(stepCount); }
  function stepCount() {
    shown += (target - shown) * 0.12;
    if (Math.abs(target - shown) < 0.6) shown = target;
    $('#count').textContent = Math.round(shown).toLocaleString('en-US');
    raf = shown === target ? 0 : requestAnimationFrame(stepCount);
  }

  // the monster rests in the space above the counter; only when it grows does it spill over it
  function fitStage() {
    const pan = $('.panel'); const st = $('.stage'); if (!pan || !st || !pan.offsetHeight) return;
    st.style.bottom = Math.max(160, pan.offsetHeight - 14) + 'px';
  }
  function tick() {
    fitStage();
    applyPhase();
    let total = computeTotal(); let f; let cycle;
    if (state.override != null) { f = state.override; cycle = state.cycle; total = state.override * CAP; } else { cycle = Math.floor(total / CAP); f = (total % CAP) / CAP; }
    state.total = total; state.f = f;
    const seen = ls.get('ltm.cycle.' + state.day, null);
    if (state.override == null) {
      if (seen == null) ls.set('ltm.cycle.' + state.day, cycle);
      else if (cycle > seen && currentView() === 'home' && !state.exploding) { ls.set('ltm.cycle.' + state.day, cycle); explode(); return; }
      else if (cycle > seen) { /* will explode when they next open home */ }
      state.cycle = cycle;
    }
    if (state.exploding) return;
    const stage = stageOf(f); state.stage = stage;
    setCount(total);
    $('#moodLine').textContent = MOODS[stage];
    $('#title').style.setProperty('--tf', Math.max(0, 1 - f * 1.5).toFixed(2));
    const wrap = $('#homeMon');
    const svg = drawMon(wrap, state.cfg, { stage });
    // grow until the body touches the screen edges, then keep growing taller: squeezed
    const grow = 0.85 + 2.15 * Math.pow(f, 1.3); const cap = Math.min(386 / M.BODIES[state.cfg.body].w, 2.7);
    const sx = Math.min(grow, cap); const sy = grow + 0.35 * (grow - sx);
    wrap.style.setProperty('--sx', sx.toFixed(3)); wrap.style.setProperty('--sy', sy.toFixed(3));
    const packed = stage >= 3 && grow >= cap * 0.97;
    $('#phone').classList.toggle('packed', packed); svg.classList.toggle('packed', packed);
    svg.classList.toggle('shake', stage === 4);
    if (stage === 4) { const k = (f - 0.85) / 0.15; svg.style.setProperty('--shake', (1.5 + k * 4).toFixed(1) + 'px'); svg.style.setProperty('--shake-speed', (0.7 - k * 0.25).toFixed(2) + 's'); }
    if (currentView() === 'report' && !feeding) drawMon($('#reportMon'), state.cfg, { stage, mouth: 'open' });
  }

  let bandKey = '';
  function buildBand() {
    const list = mergedEntries().filter((e) => !e.reclaim).sort((a, b) => (b.t || 0) - (a.t || 0) || b.tod - a.tod).slice(0, 12);
    const key = list.map((e) => e.id).join(',') + CAPK; if (key === bandKey) return; bandKey = key;
    const one = list.map((e) => `<span>${e.minutes} min · ${esc(e.text)}</span><i>✦</i>`).join('') || '<span>Nothing lost yet today</span><i>✦</i>';
    $('#bandIn').innerHTML = one + one;
  }

  /* ---------- explosion ---------- */
  function explode() {
    state.exploding = true;
    const phone = $('#phone'); phone.classList.add('popped'); const wrap = $('#homeMon');
    const svg = wrap.querySelector('.mon'); if (svg) { svg.classList.add('shake'); svg.style.setProperty('--shake', '8px'); svg.style.setProperty('--shake-speed', '.3s'); }
    wrap.style.setProperty('--sx', '3.4'); wrap.style.setProperty('--sy', '3.6'); phone.classList.remove('packed');
    setTimeout(() => {
      const flash = document.createElement('div'); flash.className = 'flash'; phone.appendChild(flash);
      flash.animate([{ opacity: 0 }, { opacity: 0.95 }, { opacity: 0 }], { duration: 650, easing: 'ease-out' }).onfinish = () => flash.remove();
      wrap.style.visibility = 'hidden';
      const r = phone.getBoundingClientRect(); const cx = r.width / 2; const cy = r.height * 0.46;
      const col = state.cfg.color;
      for (let i = 0; i < 34; i++) {
        const d = document.createElement('div'); d.className = 'frag'; const sz = 22 + Math.random() * 44;
        const kind = i % 4;
        d.innerHTML = kind === 0 ? Icons.icon(Icons.NAMES[i % Icons.NAMES.length], sz)
          : kind === 1 ? `<svg width="${sz}" height="${sz}" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="${col}" stroke="#34323A" stroke-width="3"/><path d="M20 20V9M20 20l8 4" stroke="#34323A" stroke-width="3" stroke-linecap="round"/></svg>`
          : kind === 2 ? `<svg width="${sz}" height="${sz}" viewBox="0 0 40 40"><path d="M6 34L34 6" stroke="#34323A" stroke-width="5" stroke-linecap="round"/><path d="M6 34L34 6" stroke="${col}" stroke-width="2" stroke-linecap="round"/></svg>`
          : `<span style="font-weight:800;font-size:${sz * 0.5}px;color:#111;background:#FFE14D;padding:0 4px">${1 + Math.floor(Math.random() * 30)} min</span>`;
        phone.appendChild(d);
        const ang = Math.random() * Math.PI * 2; const dist = 160 + Math.random() * 360; const rot = (Math.random() - 0.5) * 900;
        const x1 = cx + Math.cos(ang) * dist; const y1 = cy + Math.sin(ang) * dist;
        d.animate([
          { transform: `translate(${cx}px,${cy}px) rotate(0) scale(.3)`, opacity: 1 },
          { transform: `translate(${x1}px,${y1}px) rotate(${rot}deg) scale(1)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${x1 + (Math.random() - 0.5) * 40}px,${y1 + 220}px) rotate(${rot * 1.4}deg) scale(.9)`, opacity: 0 },
        ], { duration: 2200 + Math.random() * 800, easing: 'cubic-bezier(.15,.7,.3,1)' }).onfinish = () => d.remove();
      }
      $('#boomText').textContent = `${CAP.toLocaleString('en-US')} minutes burst back into the city. Your clock is in pieces.`;
      $('#boom').hidden = false;
    }, 1100);
  }
  function hatch() {
    $('#boom').hidden = true; state.exploding = false; $('#phone').classList.remove('popped');
    if (state.override != null || demoBoom) { demoBoom = false; if (state.override != null || $('#demo').hidden === false) { state.override = 0.03; const o = $('#dOn'); if (o) { o.checked = true; $('#dF').value = 3; } } }
    const wrap = $('#homeMon'); wrap.style.visibility = ''; wrap.style.transition = 'none';
    keys.delete(wrap); tick();
    const svg = wrap.querySelector('.mon'); if (svg) svg.classList.add('hatch');
    requestAnimationFrame(() => { wrap.style.transition = ''; });
  }

  /* ---------- report ---------- */
  let feeding = false; let demoBoom = false;
  function buildChips() {
    $('#chips').innerHTML = CHIPS.map((c, i) => `<button type="button" class="chip" data-i="${i}"><span class="box"><b>X</b></span>${esc(c[1])}</button>`).join('');
  }
  function setMins(n) { state.mins = Math.max(1, Math.min(240, n)); $('#minOut').textContent = state.mins; }
  function openReport() {
    feeding = false; $('#done').hidden = true; $('#feedBtn').disabled = false;
    $('#reportForm').reset(); state.chip = null; setMins(10);
    document.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
    drawMon($('#reportMon'), state.cfg, { stage: state.stage, mouth: 'open' });
  }
  async function submitReport(ev, fromPt) {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (feeding) return;
    const text = $('#reasonInput').value.trim(); if (!text) return;
    feeding = true; $('#feedBtn').disabled = true;
    const icon = state.chip != null ? CHIPS[state.chip][0] : 'hourglass';
    const mcfg = Object.assign({}, state.cfg); delete mcfg.sleep; delete mcfg.phase;
    const minutes = state.mins;
    // 1. the thing flies into the mouth
    const wrap = $('#reportMon'); const svg = wrap.querySelector('.mon');
    const [mx, my] = M.mouthPoint(state.cfg); const pt = svg.createSVGPoint(); pt.x = mx; pt.y = my;
    const to = pt.matrixTransform(svg.getScreenCTM());
    const fb = $('#feedBtn').getBoundingClientRect();
    const from = fromPt ? { left: fromPt.x, top: fromPt.y - 22, width: 0 } : fb;
   
    const fly = document.createElement('div'); fly.className = 'flying'; fly.innerHTML = Icons.icon(icon, 44); document.body.appendChild(fly);
    const anim = fly.animate([
      { transform: `translate(${from.left + from.width / 2 - 22}px,${from.top}px) scale(1.2) rotate(0)` },
      { transform: `translate(${to.x - 22}px,${to.y - 22}px) scale(.5) rotate(540deg)`, opacity: 0.9 },
    ], { duration: 650, easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'forwards' });
    const saved = Store.add(state.day, { minutes, text, icon, t: Date.now(), uid: state.uid, m: mcfg });
    await anim.finished; fly.remove();
    // 2. chomp, chomp, chomp
    svg.classList.add('chomp'); await new Promise((r) => setTimeout(r, 700));
    await saved; state.stored = await Store.list(state.day);
    tick();
    drawMon(wrap, state.cfg, { stage: Math.max(2, state.stage) });
    $('#doneBig').textContent = 'NOM.'; $('#formNo').textContent = String(state.stored.filter((x) => x.minutes).length + 1).padStart(4, '0');
    $('#doneSmall').textContent = `${minutes} minute${minutes === 1 ? '' : 's'} eaten. The city is at ${Math.round(state.total).toLocaleString('en-US')} today.`;
    $('#done').hidden = false; feeding = false;
  }

  /* ---------- wall ---------- */
  const PAPERS = [['#FFF07A', '#E3D25A'], ['#FFC2D6', '#E9A3BB'], ['#C6E6F3', '#A4CCDD'], ['#FBFAF4', '#DEDCD2', 'lined'], ['#DDF1B0', '#BFD68F'], ['#DCC8A6', '#C1AA85']];
  function renderWall() {
    const mod = (e) => (e.seed ? e.tod : (function () { const p = new Date(e.t).toLocaleTimeString('en-GB', { timeZone: 'America/New_York', hour12: false }).split(':'); return (+p[0]) * 60 + (+p[1]); }()));
    const all = mergedEntries().sort((a, b) => mod(b) - mod(a)).slice(0, 80); // newest first
    const yours = all.filter((e) => e.uid === state.uid); const others = all.filter((e) => e.uid !== state.uid);
    let n = 0;
    const note = (e) => {
      const mine = e.uid === state.uid; const got = e.reclaim; const i = n++; const [face, fold, kind] = PAPERS[(hash(String(e.id)) + i) % PAPERS.length];
      const rot = [-1.4, 1.1, -0.8, 1.8, -1.8, 0.9][i % 6]; const when = e.seed ? fmtTod(e.tod) : fmtTime(e.t);
      return `<li class="card${got ? ' got' : ''}${mine ? ' mine' : ''}${kind ? ' lined' : ''}" data-id="${esc(e.id)}" style="--face:${face};--fold:${fold};--rot:rotate(${rot}deg)${i % 2 ? ' translateY(10px)' : ''}">
        <i class="strip"></i>${mine ? '<i class="tape"></i>' : ''}
        <span class="min">${e.minutes} min</span><span class="what">${esc(e.text)}</span>
        ${got && mine ? `<span class="wish"><span>→ ${esc(got.text)}</span></span>` : ''}
        <span class="when">${when}</span>
        ${got ? '' : `<span class="status">${mine ? 'TAP TO TAKE IT BACK →' : 'STILL LOST'}</span>`}
        <i class="fold"></i>${got ? '<span class="stamp">RECLAIMED</span>' : ''}
      </li>`;
    };
    const group = (title, noteText, list, emptyText) => `<section class="wgroup"><header><h3>${title}</h3><span>${noteText}</span></header>
      <ul class="cards">${list.length ? list.map(note).join('') : `<li class="empty">${emptyText}</li>`}</ul></section>`;
    const got = others.filter((e) => e.reclaim).length;
    $('#wallGroups').innerHTML = group('YOURS', `${yours.length} note${yours.length === 1 ? '' : 's'}`, yours, 'Nothing lost yet. Feed the monster to pin one up.')
      + group('EVERYONE ELSE', `${got} of ${others.length} reclaimed`, others, 'Nothing lost yet today. Suspiciously quiet.');
  }
  let takeId = null;
  function onWallClick(ev) {
    const li = ev.target.closest('.card'); if (!li || li.classList.contains('got') || !li.classList.contains('mine')) return;
    takeId = li.dataset.id; const e = mergedEntries().find((x) => x.id === takeId); if (!e || e.uid !== state.uid) return;
    $('#takeTitle').textContent = `${e.minutes} min · ${e.text}`;
    $('#takeWhen').textContent = 'Today · ' + (e.seed ? fmtTod(e.tod) : fmtTime(e.t));
    $('#takeInput').value = ''; $('#take').hidden = false; setTimeout(() => $('#takeInput').focus(), 50);
  }
  async function submitTake(ev) {
    ev.preventDefault(); const text = $('#takeInput').value.trim(); if (!text || !takeId) return;
    await Store.reclaim(state.day, takeId, text); takeId = null; $('#take').hidden = true;
    state.stored = await Store.list(state.day);
    tick(); renderWall(); toast('Got it back. The monster shrank.');
  }

  /* ---------- dress up ---------- */
  const GROUPS = [
    ['body', 'Clock shape'], ['color', 'Color'], ['eyes', 'Eyes'], ['teeth', 'Teeth'], ['arms', 'Arms'], ['feet', 'Feet'], ['tail', 'Tail'],
    ['hat', 'Hat'], ['face', 'Glasses'], ['extra', 'Extra'], ['sleep', 'Pajamas'], ['phase', 'Time of day'],
  ];
  const LABEL = { buck: 'Buck teeth', cone: 'Traffic cone', googly: 'Googly', auto: 'Auto', on: 'Always', off: 'Never', face: 'Glasses', none: 'None', glasses: 'Round', shades: 'Shades' };
  let dressStage = 2;
  function buildDress() {
    $('#groups').innerHTML = GROUPS.map(([k, label]) => {
      const opts = M.OPTIONS[k].map((v) => {
        const on = state.cfg[k] === v ? ' on' : '';
        if (k === 'body') return `<button class="opt body${on}" data-k="${k}" data-v="${v}" aria-label="${esc(M.BODIES[v].label)}">${M.render({ body: v, color: state.cfg.color, arms: 'none', feet: 'none', eyes: 'dots', teeth: 'none' }, { stage: 2, plain: true })}</button>`;
        if (k === 'color') return `<button class="opt sw${on}" data-k="${k}" data-v="${v}" style="background:${v}" aria-label="${v}"></button>`;
        return `<button class="opt${on}" data-k="${k}" data-v="${v}">${esc(LABEL[v] || v)}</button>`;
      }).join('');
      return `<div class="group"><h3>${label}</h3><div class="opts">${opts}</div></div>`;
    }).join('');
  }
  function drawDress() {
    drawMon($('#dressMon'), state.cfg, { stage: dressStage });
    const B = M.BODIES[state.cfg.body]; $('#dressSrc').innerHTML = `<b>${esc(B.label)}</b>${B.from ? ' · after the ' + esc(B.from) : ''}`;
  }
  function setOpt(k, v) {
    state.cfg[k] = v; saveCfg(); applyPhase(); drawDress(); tick();
    document.querySelectorAll(`.opt[data-k="${k}"]`).forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    if (k === 'color') document.querySelectorAll('.opt.body').forEach((b) => { b.innerHTML = M.render({ body: b.dataset.v, color: v, arms: 'none', feet: 'none', eyes: 'dots', teeth: 'none' }, { stage: 2, plain: true }); });
  }

  /* ---------- router ---------- */
  const VIEWS = ['home', 'report', 'wall', 'dress'];
  const currentView = () => { const h = (location.hash.replace(/^#\/?/, '') || 'home'); return VIEWS.indexOf(h) >= 0 ? h : 'home'; };
  function route() {
    const v = currentView();
    VIEWS.forEach((n) => $('#v-' + n).classList.toggle('on', n === v));
    $('#phone').classList.toggle('sub', v !== 'home');
    if (v === 'report') openReport();
    if (v === 'wall') { refresh(); renderWall(); }
    if (v === 'dress') { buildDress(); drawDress(); }
    if (v === 'home') tick();
  }

  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }

  /* New York skyline as loose ink line-work: water towers, a stepped spire, fire escapes */
  function buildSkyline() {
    const rng = seeded(21); const W = Hand.wob; let x = -6; let h = ''; let i = 0; let sd = 5;
    const ln = (d, amp, extra) => `<path d="${W(d, { amp, step: 9, seed: sd++ })}" stroke-width="1.6" ${extra || ''}/>`;
    while (x < 470) {
      const w = 26 + Math.floor(rng() * 24); const ht = 40 + Math.floor(rng() * 62); const y = 150 - ht;
      const body = `M${x} 152V${y}H${x + w}V152`;
      h += `<path d="${W(`M${x} 152V${y}H${x + w}V152Z`, { amp: 1.1, step: 9, seed: sd++ })}" fill="currentColor" fill-opacity=".1" stroke="none"/>` + ln(body, 1.1);
      for (let r = 0; r < Math.floor(ht / 16); r++) h += ln(`M${x + 6} ${y + 10 + r * 14}h${w - 12}`, 0.4, 'stroke-dasharray="3 5" opacity=".6"');
      const cx = x + w / 2;
      if (i % 5 === 2) { // water tower
        h += ln(`M${cx - 7} ${y}l-1 -9M${cx + 7} ${y}l1 -9`, 0.4) + ln(`M${cx - 10} ${y - 10}V${y - 26}H${cx + 10}V${y - 10}Z`, 0.6) + ln(`M${cx - 11} ${y - 26}L${cx} ${y - 35}L${cx + 11} ${y - 26}`, 0.4);
      } else if (i % 7 === 4) { // stepped spire
        h += ln(`M${cx - w * 0.34} ${y}V${y - 16}H${cx + w * 0.34}V${y}`, 0.6) + ln(`M${cx - w * 0.18} ${y - 16}V${y - 30}H${cx + w * 0.18}V${y - 16}`, 0.5) + ln(`M${cx} ${y - 30}V${y - 54}`, 0.4);
      } else if (i % 6 === 1) { // fire escape
        h += ln(`M${x + 3} ${y + 12}l${w - 6} 10l${-(w - 6)} 10l${w - 6} 10l${-(w - 6)} 10`, 0.5);
      }
      x += w + 2; i++;
    }
    $('#skyline').innerHTML = h;
  }

  /* eyes follow the finger / pointer; when nobody is touching, they wander */
  let lastMove = 0;
  function lookAt(px, py) {
    document.querySelectorAll('.view.on .mon').forEach((svg) => {
      const r = svg.getBoundingClientRect(); if (!r.width) return;
      const dx = px - (r.left + r.width / 2); const dy = py - (r.top + r.height * 0.45);
      const d = Math.hypot(dx, dy) || 1; const m = Math.min(1, d / 160);
      svg.style.setProperty('--lx', ((dx / d) * 3.8 * m).toFixed(2)); svg.style.setProperty('--ly', ((dy / d) * 3.8 * m).toFixed(2));
    });
  }
  function jiggle(ev) {
    const svg = ev.currentTarget.querySelector('.mon'); if (!svg) return;
    svg.classList.remove('jig'); void svg.getBoundingClientRect(); svg.classList.add('jig');
    setTimeout(() => svg.classList.remove('jig'), 750);
  }

  /* ---------- demo panel (?demo=1) ---------- */
  function buildDemo() {
    const d = $('#demo'); d.hidden = false;
    d.innerHTML = `<label><input type="checkbox" id="dOn"> override fullness</label><input type="range" id="dF" min="0" max="100" value="50"><select id="dP"><option>auto</option><option>dawn</option><option>day</option><option>dusk</option><option>night</option></select><button id="dBoom" type="button">Boom</button>`;
    const upd = () => { state.override = $('#dOn').checked ? $('#dF').value / 100 : null; tick(); };
    $('#dOn').onchange = upd; $('#dF').oninput = () => { $('#dOn').checked = true; upd(); };
    $('#dP').onchange = (e) => { state.cfg.phase = e.target.value; applyPhase(); tick(); };
    $('#dBoom').onclick = () => { if (!state.exploding) { demoBoom = true; location.hash = '#/'; setTimeout(explode, 60); } };
  }

  /* ---------- wire up ---------- */
  function init() {
    buildSkyline(); buildChips();
    $('#sharedNote').textContent = Store.shared ? 'Entries are shared with everyone using this link.' : 'Entries are saved in this browser only.';
    $('#chips').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      const i = +b.dataset.i; const input = $('#reasonInput');
      const prev = state.chip != null ? CHIPS[state.chip][1] : null;
      state.chip = i; document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === b));
      if (!input.value || input.value === prev) input.value = CHIPS[i][1];
    });
    $('#minMinus').onclick = () => setMins(state.mins - (state.mins > 30 ? 5 : state.mins > 10 ? 2 : 1));
    $('#minPlus').onclick = () => setMins(state.mins + (state.mins >= 30 ? 5 : state.mins >= 10 ? 2 : 1));
    $('#reportForm').addEventListener('submit', submitReport);
    $('#again').onclick = openReport;
    $('#wallGroups').addEventListener('click', onWallClick);
    $('#takeForm').addEventListener('submit', submitTake);
    $('#takeCancel').onclick = () => { $('#take').hidden = true; };
    $('#take').addEventListener('click', (e) => { if (e.target.id === 'take') $('#take').hidden = true; });
    ['#homeMon', '#reportMon', '#dressMon'].forEach((q) => $(q).addEventListener('click', jiggle));
    window.addEventListener('pointermove', (e) => { lastMove = Date.now(); lookAt(e.clientX, e.clientY); }, { passive: true });
    setInterval(() => { if (Date.now() - lastMove > 3000) lookAt(Math.random() * innerWidth, Math.random() * innerHeight * 0.8); }, 2600);
    $('#aboutBtn').onclick = () => { $('#about').hidden = false; };
    $('#aboutClose').onclick = () => { $('#about').hidden = true; };
    $('#about').addEventListener('click', (e) => { if (e.target.id === 'about') $('#about').hidden = true; });
    $('#hatch').onclick = hatch;
    $('#groups').addEventListener('click', (e) => { const b = e.target.closest('.opt'); if (b) setOpt(b.dataset.k, b.dataset.v); });
    $('#moodRange').oninput = (e) => { dressStage = +e.target.value; drawDress(); };
    $('#dice').onclick = () => {
      const r = M.random(); const keep = { sleep: state.cfg.sleep, phase: state.cfg.phase };
      state.cfg = M.normalize(Object.assign(r, keep)); saveCfg(); buildDress(); drawDress(); tick();
    };
    window.addEventListener('hashchange', route);
    window.addEventListener('resize', fitStage); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitStage);
    window.addEventListener('ltm-store', () => { Store.list(state.day).then((l) => { state.stored = l; tick(); }); });
    window.addEventListener('storage', () => refresh());
    if (/[?&]demo/.test(location.search)) buildDemo();
    refresh().catch((e) => { console.error(e); }).then(() => { route(); buildBand(); });
    setInterval(tick, 2000);
    setInterval(buildBand, 6000);
    setInterval(() => { if (Store.shared) refresh(); }, 10000);
  }
  init();
}());
