/* Entries store. Day-based (New York time): each day starts with a hungry baby monster.
   - No config  → localStorage (this browser only)
   - dbUrl set  → Firebase Realtime Database REST API, so classmates share one monster.
   Seed entries are fake and generated in app.js; a "reclaim" on a seed is stored as an
   overlay record with id "seed-N". */
(function () {
  const remote = ((window.LTM_CONFIG || {}).dbUrl || '').replace(/\/+$/, '');
  const key = (day) => 'ltm.entries.' + day;

  function readLocal(day) {
    try { return JSON.parse(localStorage.getItem(key(day)) || '{}'); } catch (e) { return {}; }
  }
  function writeLocal(day, obj) {
    try { localStorage.setItem(key(day), JSON.stringify(obj)); } catch (e) { /* private mode */ }
    window.dispatchEvent(new Event('ltm-store'));
  }
  // never let a slow or blocked network hang the UI
  function net(url, init) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4000);
    return fetch(url, Object.assign({ signal: ctl.signal }, init)).finally(() => clearTimeout(t));
  }
  const toList = (obj) => Object.keys(obj || {}).map((id) => Object.assign({ id }, obj[id]));

  async function list(day) {
    if (!remote) return toList(readLocal(day));
    try {
      const r = await net(`${remote}/entries/${day}.json`);
      if (!r.ok) throw new Error(r.status);
      return toList(await r.json());
    } catch (e) { return toList(readLocal(day)); }
  }

  async function add(day, entry) {
    if (remote) {
      try {
        const r = await net(`${remote}/entries/${day}.json`, { method: 'POST', body: JSON.stringify(entry) });
        if (r.ok) return Object.assign({ id: (await r.json()).name }, entry);
      } catch (e) { /* fall through to local */ }
    }
    const id = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const all = readLocal(day); all[id] = entry; writeLocal(day, all);
    return Object.assign({ id }, entry);
  }

  async function reclaim(day, id, text) {
    const patch = { reclaim: { text, t: Date.now() } };
    if (remote) {
      try {
        const r = await net(`${remote}/entries/${day}/${id}.json`, { method: 'PATCH', body: JSON.stringify(patch) });
        if (r.ok) return;
      } catch (e) { /* fall through */ }
    }
    const all = readLocal(day); all[id] = Object.assign(all[id] || {}, patch); writeLocal(day, all);
  }

  window.Store = { list, add, reclaim, shared: !!remote };
})();
