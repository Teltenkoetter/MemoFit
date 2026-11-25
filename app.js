'use strict';
// MemoFit · ruhiger Intervall-Begleiter. Vanilla JS, Daten nur auf dem Gerät (IndexedDB).

// ── Kleine Helfer ───────────────────────────────────────
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const kopie = o => JSON.parse(JSON.stringify(o));
const zahl = (v, f = 0) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : f; };
const ganz = (v, f = 0, min = 0) => Math.max(min, Math.round(zahl(v, f)));
const komma = n => String(Math.round(n * 100) / 100).replace('.', ',');
function sek(s) { s = Math.max(0, Math.round(s)); return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s); }
function sekText(s) { s = Math.round(s); if (s < 60) return `${s} s`; const m = Math.floor(s / 60), r = s % 60; return r ? `${m}:${String(r).padStart(2, '0')} min` : `${m} min`; }
// Videozeit: 72.5 → „1:12,5“ und zurück
function zeitFmt(s) { if (s == null) return ''; const m = Math.floor(s / 60), r = Math.round((s - m * 60) * 10) / 10; return `${m}:${String(Math.floor(r)).padStart(2, '0')}${r % 1 ? ',' + Math.round((r % 1) * 10) : ''}`; }
function zeitLesen(t) {
  t = String(t ?? '').trim().replace(',', '.'); if (!t) return null;
  const teile = t.split(':'); const n = teile.length === 2 ? +teile[0] * 60 + +teile[1] : +teile[0];
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : null;
}
const mbText = b => (b / 1048576).toLocaleString('de-DE', { maximumFractionDigits: b < 10485760 ? 1 : 0 }) + ' MB';
function kgText(ue) {
  if (!ue || ue.kg == null) return '';
  return (ue.anzahl === 2 ? '2 × ' : '') + komma(ue.kg) + ' kg';
}

// Liniensymbole für die Hilfe (Stil wie MemoMe)
const HZ = {
  browser: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5S14.6 18.1 12 20.5M12 3.5C9.4 5.9 8.2 8.7 8.2 12s1.2 6.1 3.8 8.5"/>',
  installieren: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M12 8v6M9 11h6"/>',
  geraet: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  update: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>',
  start: '<circle cx="12" cy="12" r="8.5"/><path d="M10 8.5l5 3.5-5 3.5Z"/>',
  dauer: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  fertig: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  pause: '<circle cx="12" cy="12" r="8.5"/><path d="M10 9v6M14 9v6"/>',
  tippen: '<circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="12" r="7.5"/>',
  kann: '<circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2" stroke-dasharray="2 2"/>',
  seiten: '<path d="M12 4v16"/><path d="M8 9l-3 3 3 3M16 9l3 3-3 3"/>',
  umdrehen: '<rect x="5" y="4" width="14" height="16" rx="2.5"/><path d="M9 12h6M13 10l2 2-2 2"/>',
  gewicht: '<path d="M3 9.5v5M6 7.5v9M18 7.5v9M21 9.5v5M6 12h12"/>',
  wischen: '<path d="M4 12h16"/><path d="M8 8l-4 4 4 4M16 8l4 4-4 4"/>',
  halt: '<path d="M9 6v12M15 6v12"/>',
  drehen: '<rect x="3" y="7" width="18" height="10" rx="2.5"/><path d="M17.5 12h.01"/>',
  plaene: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  werte: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  uebung: '<circle cx="12" cy="5.5" r="2"/><path d="M12 8v6l-3 6M12 14l3 6M7 11h10"/>',
  mehrfach: '<rect x="3.5" y="7" width="12" height="13" rx="2"/><path d="M8.5 7V5a1.5 1.5 0 0 1 1.5-1.5h8.5A1.5 1.5 0 0 1 20 5v10a1.5 1.5 0 0 1-1.5 1.5h-3"/>',
  sortieren: '<path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4"/>',
  loeschen: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
  zahnrad: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  ton: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  speicher: '<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>',
  sichern: '<path d="M12 3.5v10.5"/><path d="M8 10l4 4 4-4"/><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
  laden: '<path d="M12 14V3.5"/><path d="M8 7.5l4-4 4 4"/><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
  bibliothek: '<path d="M5 4v16M9.5 4v16"/><path d="M14 4.5l4.5 15"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3"/>',
  schnitt: '<circle cx="6" cy="6.5" r="2.5"/><circle cx="6" cy="17.5" r="2.5"/><path d="M8.2 7.8L20 16M8.2 16.2L20 8"/>',
  werkzeug: '<path d="M14.5 4a5 5 0 0 0-4.3 7.2L4 17.4V20h2.6l6.2-6.2A5 5 0 0 0 20 9.5l-2.8 1.1-2-2L16.3 5.8A5 5 0 0 0 14.5 4Z"/>',
};
const svg = (p, sw = 1.7) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICON = {
  play: svg('<path d="M8 5.5l11 6.5-11 6.5Z"/>', 2),
  pause: svg('<path d="M9 6v12M15 6v12"/>', 2.4),
  vor: svg('<path d="M9 5l7 7-7 7"/>', 2.2),
  zurueck: svg('<path d="M15 5l-7 7 7 7"/>', 2.2),
};

// ── Speicherung (IndexedDB) ─────────────────────────────
// kv: der Zustand als JSON · videos: die Clips als eigene Blobs (nie im normalen Backup)
const DB_NAME = 'memofit', STORE = 'kv', VIDEOS = 'videos';
let dbP = null;
function db() {
  if (!dbP) dbP = new Promise((ok, fehler) => {
    const r = indexedDB.open(DB_NAME, 2);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      if (!d.objectStoreNames.contains(VIDEOS)) d.createObjectStore(VIDEOS);
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fehler(r.error);
  });
  return dbP;
}
async function laden() {
  try {
    const d = await db();
    return await new Promise(ok => { const r = d.transaction(STORE).objectStore(STORE).get('zustand'); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null); });
  } catch { return null; }
}
const idb = (store, modus, f) => db().then(d => new Promise((ok, fehler) => {
  const tx = d.transaction(store, modus), r = f(tx.objectStore(store));
  tx.oncomplete = () => ok(r?.result); tx.onerror = () => fehler(tx.error); tx.onabort = () => fehler(tx.error);
}));
const videoLaden = id => idb(VIDEOS, 'readonly', st => st.get(id)).then(v => v?.blob || null).catch(() => null);
const videoSpeichern = (id, blob) => idb(VIDEOS, 'readwrite', st => st.put({ blob, typ: blob.type }, id));
const videoEntsorgen = id => idb(VIDEOS, 'readwrite', st => st.delete(id)).catch(() => {});
const videoSchluessel = () => idb(VIDEOS, 'readonly', st => st.getAllKeys()).catch(() => []);
let speicherTimer = null;
function speichern() {
  clearTimeout(speicherTimer);
  speicherTimer = setTimeout(async () => {
    try { const d = await db(); d.transaction(STORE, 'readwrite').objectStore(STORE).put(kopie(S), 'zustand'); } catch {}
  }, 150);
}

// ── Zustand ─────────────────────────────────────────────
const W_WARMUP = { modus: 'zeit', zeit: 30, wdh: 12, wdhBis: null, saetze: 3, kann: true, pSatz: 15, pUebung: 30 };
const W_HAUPT  = { modus: 'wdh', zeit: 40, wdh: 12, wdhBis: 15, saetze: 4, kann: true, pSatz: 60, pUebung: 90 };
const EINST = { auto: true, vorlauf: 5, wechsel: 5, toene: true, karte: 'vorn', videoTon: 'erst' };

function leer() { return { version: 1, plaene: [], uebungen: {}, einst: { ...EINST }, verlauf: [] }; }
let S = leer();

function neueUebung(name, hinweis = '', extra = {}) {
  const ue = { id: uid(), name, hinweis, seiten: false, kg: null, anzahl: 1, schritt: 2.5, ...extra };
  S.uebungen[ue.id] = ue;
  return ue;
}
// Neutraler, erfundener Beispielplan (keine echten Pläne im Upload)
function beispielplan() {
  const it = (ue, w) => ({ id: uid(), ue: ue.id, w: { ...w } });
  const warm = { ...W_WARMUP, saetze: 2, kann: false }, haupt = { ...W_HAUPT, saetze: 3, wdh: 10, wdhBis: 12 };
  return {
    id: uid(), name: 'Beispiel', bloecke: [
      { id: uid(), name: 'Warm-up', items: [
        it(neueUebung('Hampelmann', 'locker, Arme ganz nach oben'), warm),
        it(neueUebung('Armkreisen', 'große Kreise, erst vorwärts, dann rückwärts'), warm),
      ] },
      { id: uid(), name: 'Hauptteil', items: [
        it(neueUebung('Ausfallschritt', 'Knie über dem Fuß, Oberkörper aufrecht', { seiten: true }), haupt),
        it(neueUebung('Rudern mit Band', 'Schultern weg von den Ohren', { kg: 4, anzahl: 2, schritt: 1 }), haupt),
        it(neueUebung('Unterarmstütz', 'Bauch fest, kein Hohlkreuz'), { ...haupt, modus: 'zeit', zeit: 30, wdhBis: null }),
      ] },
    ],
  };
}
function zustandAus(z) {
  const n = leer();
  n.plaene = Array.isArray(z.plaene) ? z.plaene : [];
  n.plaene.forEach(p => (p.bloecke || []).forEach(b => {
    (b.items || []).forEach(it => { if (!it.w) it.w = { ...W_HAUPT, ...(b.w || {}), ...(it.eigen || {}) }; delete it.eigen; });
    delete b.w;
  }));
  n.uebungen = z.uebungen && typeof z.uebungen === 'object' ? z.uebungen : {};
  n.einst = { ...EINST, ...(z.einst || {}) };
  n.verlauf = Array.isArray(z.verlauf) ? z.verlauf : [];
  return n;
}
// Beim Start aufräumen: Plan-Einträge ohne Übung entfernen. Übungen ohne Plan bleiben in der Bibliothek.
function aufraeumen() {
  S.plaene.forEach(p => p.bloecke.forEach(b => { b.items = b.items.filter(i => S.uebungen[i.ue]); }));
  // Clips ohne Übung entfernen
  const clips = new Set(Object.values(S.uebungen).map(u => u.video?.id).filter(Boolean));
  videoSchluessel().then(keys => keys.forEach(k => { if (!clips.has(k)) videoEntsorgen(k); }));
}

// ── Werte, Ablauf, Dauer ────────────────────────────────
// Werte gehören zur Übung im Plan (dieselbe Übung kann in zwei Plänen anders laufen)
const werte = (b, it) => ({ ...W_HAUPT, ...(it.w || {}) });
const werteKurz = w => werteText(w).split(' · Pause')[0];
// Vorschlag für eine neue Übung: die Werte der Übung davor
function werteVorschlag(p, bi) {
  for (let k = bi; k >= 0; k--) { const last = p.bloecke[k].items.at(-1); if (last) return { ...werte(p.bloecke[k], last) }; }
  return { ...(bi === 0 ? W_WARMUP : W_HAUPT) };
}
function werteText(w) {
  const n = w.saetze;
  const last = w.modus === 'zeit' ? `${sekText(w.zeit)}` : `${w.wdh}${w.wdhBis && w.wdhBis > w.wdh ? '–' + w.wdhBis : ''} ×`;
  const s = n === 1 ? '1 Satz' : (w.kann ? `${n - 1}–${n} Sätze` : `${n} Sätze`);
  return `${last} · ${s} · Pause ${sekText(w.pSatz)} · vor nächster ${sekText(w.pUebung)}`;
}
function planUebungen(plan) {
  const out = [];
  plan.bloecke.forEach(b => b.items.forEach(it => { const ue = S.uebungen[it.ue]; if (ue) out.push({ b, it, ue, w: werte(b, it) }); }));
  return out;
}
function ablauf(plan) {
  const ues = planUebungen(plan), out = [];
  ues.forEach((x, ui) => {
    const n = Math.max(1, x.w.saetze | 0);
    for (let s = 1; s <= n; s++) {
      const kann = !!x.w.kann && n > 1 && s === n;
      if (s > 1) out.push({ typ: 'pause', dauer: x.w.pSatz, ui, kannNaechster: kann });
      const seiten = x.ue.seiten ? ['re', 'li'] : [null];
      seiten.forEach((seite, si) => {
        if (si > 0) out.push({ typ: 'wechsel', dauer: S.einst.wechsel, ui });
        out.push({ typ: 'arbeit', ui, satz: s, saetze: n, seite, kann, ersteSeite: si === 0 });
      });
    }
    if (ui < ues.length - 1) out.push({ typ: 'pause', dauer: x.w.pUebung, ui, uebungsPause: true });
  });
  if (S.einst.vorlauf > 0 && out.length) out.unshift({ typ: 'bereit', dauer: S.einst.vorlauf, ui: 0 });
  return { ues, out };
}
function dauerMin(plan) {
  const { ues, out } = ablauf(plan);
  let s = 0;
  for (const st of out) {
    if (st.typ !== 'arbeit') s += st.dauer;
    else { const w = ues[st.ui].w; s += w.modus === 'zeit' ? w.zeit : Math.round(((w.wdh + (w.wdhBis || w.wdh)) / 2) * 3.5); }
  }
  return Math.max(1, Math.round(s / 60));
}
const anzahlUe = plan => planUebungen(plan).length;
const ueAnz = plan => { const n = anzahlUe(plan); return n === 1 ? "1 Übung" : `${n} Übungen`; };
const seitenText = s => s === 're' ? 'rechts' : s === 'li' ? 'links' : '';

// ── Ansichten ───────────────────────────────────────────
let ansicht = 'start', vorEinst = 'start', aktPlanId = null, plaeneSort = false, planSort = false;
function zeige(v) {
  if (v === 'einst' && ansicht !== 'einst') vorEinst = ansicht;
  if (v !== 'plan') planSort = false;
  if (v !== 'plaene') plaeneSort = false;
  ansicht = v;
  ['start', 'plaene', 'bib', 'plan', 'einst'].forEach(n => $('#view-' + n).classList.toggle('hidden', n !== v));
  const navZiel = v === 'plan' || v === 'bib' ? 'plaene' : v;
  if (v === 'plaene' || v === 'bib') S.einst.planTab = v;
  $$('.plan-tabs button').forEach(b => b.classList.toggle('an', b.dataset.wert === v));
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === navZiel));
  $('#btn-einstellungen').classList.toggle('an', v === 'einst');
  if (v === 'start') renderStart();
  if (v === 'plaene') renderPlaene();
  if (v === 'bib') { $('#bib-suche').value = ''; renderBib(); }
  if (v === 'plan') renderPlan();
  if (v === 'einst') renderEinst();
  window.scrollTo(0, 0);
}

function renderStart() {
  const el = $('#start-liste');
  const plaene = S.plaene.filter(p => anzahlUe(p) > 0);
  if (!plaene.length) {
    el.innerHTML = `<p class="leer-text">${S.plaene.length ? 'Deine Pläne haben noch keine Übungen.' : 'Noch kein Plan.'}</p>
      <button class="btn-secondary" type="button" data-a="zu-plaenen">${S.plaene.length ? 'Übungen eintragen' : 'Ersten Plan anlegen'}</button>`;
    return;
  }
  el.innerHTML = plaene.map(p => `
    <button class="plan-karte" type="button" data-plan="${p.id}">
      <div>
        <div class="pk-name">${esc(p.name)}</div>
        <div class="pk-bloecke">${p.bloecke.filter(b => b.items.length).map(b => esc(b.name)).join(' · ')}</div>
        <div class="pk-dauer">${ueAnz(p)} · ca. ${dauerMin(p)} min</div>
      </div>
      <span class="pk-start" aria-hidden="true">${ICON.play}</span>
    </button>`).join('');
}

function renderPlaene() {
  const el = $('#plaene-liste');
  $('#btn-plaene-sort').classList.toggle('an', plaeneSort);
  $('#btn-plaene-sort').classList.toggle('hidden', S.plaene.length < 2);
  if (!S.plaene.length) { el.innerHTML = '<p class="zeile-leer">Noch kein Plan.</p>'; return; }
  el.innerHTML = S.plaene.map((p, i) => {
    const info = `${p.bloecke.length} ${p.bloecke.length === 1 ? 'Block' : 'Blöcke'} · ${ueAnz(p)}${anzahlUe(p) ? ' · ca. ' + dauerMin(p) + ' min' : ''}`;
    if (plaeneSort) return `<div class="zeile sortieren"><div><div class="nm">${esc(p.name)}</div><div class="info">${info}</div></div>
      <div class="sort-pfeile"><button type="button" data-plan-hoch="${i}" ${i === 0 ? 'disabled' : ''} aria-label="nach oben">↑</button><button type="button" data-plan-runter="${i}" ${i === S.plaene.length - 1 ? 'disabled' : ''} aria-label="nach unten">↓</button></div></div>`;
    return `<button class="zeile" type="button" data-plan-edit="${p.id}"><div><div class="nm">${esc(p.name)}</div><div class="info">${info}</div></div><span class="pfeil">›</span></button>`;
  }).join('');
}

// ── Bibliothek: alle Übungen, unabhängig vom Plan ──
let clipKeys = null;   // welche Videos auf diesem Gerät liegen (für „Video fehlt“)
async function renderBib() {
  const el = $('#bib-liste'), q = $('#bib-suche').value.trim().toLowerCase();
  const alle = Object.values(S.uebungen).sort(sortName);
  $('#bib-anzahl').textContent = alle.length === 1 ? '1 Übung' : `${alle.length} Übungen`;
  const liste = q ? alle.filter(u => u.name.toLowerCase().includes(q) || (u.hinweis || '').toLowerCase().includes(q)) : alle;
  if (!clipKeys) videoSchluessel().then(k => { clipKeys = new Set(k); if (ansicht === 'bib') renderBib(); });
  if (!alle.length) { el.innerHTML = '<p class="zeile-leer">Noch keine Übung. Übungen entstehen in den Plänen oder hier.</p>'; return; }
  if (!liste.length) { el.innerHTML = '<p class="zeile-leer">Nichts gefunden.</p>'; return; }
  el.innerHTML = liste.map(u => {
    const pl = plaeneMit(u.id, null);
    const fehlt = u.video && clipKeys && !clipKeys.has(u.video.id);
    const teile = [];
    if (u.video) teile.push(fehlt ? 'Video fehlt' : 'Video');
    if (u.seiten) teile.push('re/li');
    if (u.kg != null) teile.push(kgText(u));
    teile.push(pl.length ? pl.join(', ') : 'in keinem Plan');
    return `<button class="zeile" type="button" data-bib="${u.id}"><div><div class="nm">${esc(u.name)}${fehlt ? '<span class="marke warm">Video neu wählen</span>' : ''}</div><div class="info">${esc(teile.join(' · '))}</div></div><span class="pfeil">›</span></button>`;
  }).join('');
}

const aktPlan = () => S.plaene.find(p => p.id === aktPlanId);
function renderPlan() {
  const p = aktPlan();
  if (!p) { zeige('plaene'); return; }
  $('#plan-name').textContent = p.name;
  $('#plan-info').textContent = anzahlUe(p) ? `${ueAnz(p)} · ca. ${dauerMin(p)} min` : 'Noch keine Übungen';
  $('#plan-sort').classList.toggle('an', planSort);
  $('#plan-sort-hinweis').classList.toggle('hidden', !planSort);
  const el = $('#plan-bloecke');
  el.innerHTML = p.bloecke.map((b, bi) => {
    const items = b.items.map((it, ii) => {
      const ue = S.uebungen[it.ue]; if (!ue) return '';
      const w = werte(b, it);
      const teile = [];
      teile.push(werteKurz(w));
      if (ue.seiten) teile.push('re/li');
      if (ue.kg != null) teile.push(kgText(ue));
      if (ue.video) teile.push('Video');
      if (ue.hinweis) teile.push(ue.hinweis);
      const info = teile.length ? `<div class="info">${esc(teile.join(' · '))}</div>` : '';
      const erstes = bi === 0 && ii === 0, letztes = bi === p.bloecke.length - 1 && ii === b.items.length - 1;
      if (planSort) return `<div class="zeile sortieren"><div><div class="nm">${esc(ue.name)}</div></div>
        <div class="sort-pfeile"><button type="button" data-ue-hoch="${bi}.${ii}" ${erstes ? 'disabled' : ''} aria-label="nach oben">↑</button><button type="button" data-ue-runter="${bi}.${ii}" ${letztes ? 'disabled' : ''} aria-label="nach unten">↓</button></div></div>`;
      return `<button class="zeile" type="button" data-ue-edit="${bi}.${ii}"><div><div class="nm">${esc(ue.name)}</div>${info}</div><span class="pfeil">›</span></button>`;
    }).join('');
    const kopf = planSort
      ? `<div class="card-header"><div class="block-kopf-knopf"><div class="bn ohne-stift">${esc(b.name)}</div></div>
          <div class="sort-pfeile"><button type="button" data-block-hoch="${bi}" ${bi === 0 ? 'disabled' : ''} aria-label="Block nach oben">↑</button><button type="button" data-block-runter="${bi}" ${bi === p.bloecke.length - 1 ? 'disabled' : ''} aria-label="Block nach unten">↓</button></div></div>`
      : `<div class="card-header"><button class="block-kopf-knopf" type="button" data-block-edit="${bi}"><div class="bn">${esc(b.name)}</div></button></div>`;
    return `<div class="card block-karte">${kopf}
      <div class="zeilen">${items || '<p class="zeile-leer">Noch keine Übung.</p>'}</div>
      ${planSort ? '' : `<button class="btn-plus" type="button" data-ue-neu="${bi}">+ Übung</button>`}</div>`;
  }).join('') || '<p class="leer-text">Noch kein Block.</p>';
}

// Werte-Formular (Block und eigene Werte einer Übung)
function werteFormular(w) {
  return `
    <div class="form-group"><label>Art</label>
      <div class="seg" id="w-modus"><button type="button" data-wert="zeit" class="${w.modus === 'zeit' ? 'an' : ''}">Zeit</button><button type="button" data-wert="wdh" class="${w.modus === 'wdh' ? 'an' : ''}">Wiederholungen</button></div></div>
    <div class="form-group ${w.modus === 'zeit' ? '' : 'hidden'}" id="w-zeit-g"><label for="w-zeit">Arbeitszeit (Sekunden)</label><input type="number" inputmode="numeric" id="w-zeit" value="${w.zeit}" min="5"></div>
    <div class="form-reihe ${w.modus === 'wdh' ? '' : 'hidden'}" id="w-wdh-g">
      <div class="form-group"><label for="w-wdh">Wiederholungen</label><input type="number" inputmode="numeric" id="w-wdh" value="${w.wdh}" min="1"></div>
      <div class="form-group"><label for="w-bis">bis (optional)</label><input type="number" inputmode="numeric" id="w-bis" value="${w.wdhBis ?? ''}" placeholder="–"></div>
    </div>
    <div class="form-group"><label for="w-saetze">Sätze</label><input type="number" inputmode="numeric" id="w-saetze" value="${w.saetze}" min="1" max="10"></div>
    <label class="schalter-zeile" for="w-kann"><input type="checkbox" id="w-kann" ${w.kann ? 'checked' : ''}><span>Letzter Satz freiwillig<small>z. B. „2–3 Sätze“: In der Pause davor fragt die App „Noch einer?“</small></span></label>
    <div class="form-reihe" style="margin-top:0.6rem">
      <div class="form-group"><label for="w-psatz">Pause zw. Sätzen (s)</label><input type="number" inputmode="numeric" id="w-psatz" value="${w.pSatz}" min="0"></div>
      <div class="form-group"><label for="w-pue">vor nächster Übung (s)</label><input type="number" inputmode="numeric" id="w-pue" value="${w.pUebung}" min="0"></div>
    </div>`;
}
function werteFormularVerbinden() {
  $$('#w-modus button').forEach(btn => btn.onclick = () => {
    $$('#w-modus button').forEach(x => x.classList.toggle('an', x === btn));
    $('#w-zeit-g').classList.toggle('hidden', btn.dataset.wert !== 'zeit');
    $('#w-wdh-g').classList.toggle('hidden', btn.dataset.wert !== 'wdh');
  });
}
function werteLesen() {
  const wdh = ganz($('#w-wdh').value, 12, 1);
  const bis = $('#w-bis').value.trim() === '' ? null : ganz($('#w-bis').value, 0, 1);
  return {
    modus: $('#w-modus .an')?.dataset.wert || 'zeit',
    zeit: ganz($('#w-zeit').value, 30, 3), wdh, wdhBis: bis && bis > wdh ? bis : null,
    saetze: Math.min(10, ganz($('#w-saetze').value, 3, 1)), kann: $('#w-kann').checked,
    pSatz: ganz($('#w-psatz').value, 15), pUebung: ganz($('#w-pue').value, 30),
  };
}

// ── Sheets: Plan, Block, Übung ──────────────────────────
function planNameSheet(neu) {
  const p = aktPlan();
  sheet(neu ? 'Neuer Plan' : 'Plan umbenennen', `
    <div class="form-group"><label for="pn">Name</label><input type="text" id="pn" value="${esc(neu ? '' : p.name)}" placeholder="z. B. Tag 1" autocomplete="off"></div>
    <button class="btn-primary" id="pn-ok" type="button">Speichern</button>`);
  const ok = () => { p.name = $('#pn').value.trim() || p.name || 'Plan'; speichern(); sheetZu(); renderPlan(); };
  $('#pn-ok').onclick = ok;
  $('#pn').onkeydown = e => { if (e.key === 'Enter') ok(); };
  setTimeout(() => $('#pn')?.focus(), 250);
}

function blockSheet(bi) {
  const p = aktPlan(), neu = bi == null;
  const b = neu ? { id: uid(), name: '', items: [] } : p.bloecke[bi];
  sheet(neu ? 'Neuer Block' : 'Block', `
    <div class="form-group"><label for="b-name">Name</label><input type="text" id="b-name" value="${esc(b.name)}" placeholder="z. B. Hauptteil C" autocomplete="off"></div>
    <p class="card-text">Ein Block fasst Übungen zusammen, etwa Warm-up oder Hauptteil. Zeit, Wiederholungen, Sätze und Pausen stehen bei jeder Übung.</p>
    <div class="btn-reihe">
      <button class="btn-primary" id="b-ok" type="button">Speichern</button>
      ${neu ? '' : '<button class="btn-leise" id="b-weg" type="button">Block entfernen</button>'}
    </div>`);
  $('#b-ok').onclick = () => {
    b.name = $('#b-name').value.trim() || b.name || 'Block';
    if (neu) p.bloecke.push(b);
    speichern(); sheetZu(); renderPlan();
  };
  if (!neu) $('#b-weg').onclick = () => {
    const weg = p.bloecke.splice(bi, 1)[0];
    speichern(); sheetZu(); renderPlan();
    toast(`${weg.name} entfernt`, () => { p.bloecke.splice(bi, 0, weg); speichern(); renderPlan(); });
  };
}

function plaeneMit(ueId, ausser) {
  return S.plaene.filter(p => p.id !== ausser && p.bloecke.some(b => b.items.some(i => i.ue === ueId))).map(p => p.name);
}
const sortName = (a, c) => a.name.localeCompare(c.name, 'de');
// bi = null: aus der Bibliothek (bibId = Übung oder null für neu), sonst aus einem Block
function uebungSheet(bi, ii, bibId = null) {
  const bib = bi == null;
  const p = bib ? null : aktPlan(), b = bib ? null : p.bloecke[bi], neu = bib ? !bibId : ii == null;
  const it = bib ? null : (neu ? { id: uid(), ue: null, w: null } : b.items[ii]);
  let ue = neu ? { name: '', hinweis: '', seiten: false, kg: null, anzahl: 1, schritt: 2.5 } : S.uebungen[bib ? bibId : it.ue];
  let gewaehlt = neu ? null : ue.id;   // vorhandene Übung aus der Bibliothek
  const w = bib ? null : (neu ? werteVorschlag(p, bi) : werte(b, it));
  const vorhanden = bib ? [] : Object.values(S.uebungen).filter(u => !b.items.some(i => i.ue === u.id)).sort(sortName);
  const andere = neu ? [] : plaeneMit(ue.id, bib ? null : p.id);
  const auchText = l => bib ? (l.length ? `Steht in: ${l.join(', ')}. Änderungen gelten dort mit.` : 'Steht in keinem Plan.') : (l.length ? `Auch in: ${l.join(', ')}. Name, Hinweis und Gewicht gelten dort mit.` : '');
  sheet(neu ? 'Neue Übung' : 'Übung', `
    ${neu && vorhanden.length ? `<div class="form-group"><label>Aus der Bibliothek</label>
      ${vorhanden.length > 8 ? '<input type="search" id="u-suche" placeholder="Suchen" autocomplete="off" class="u-suche">' : ''}
      <div class="vorschlaege" id="u-vorh">${vorhanden.map(u => `<button type="button" class="btn-klein" data-vorh="${u.id}" data-nm="${esc(u.name.toLowerCase())}">${esc(u.name)}</button>`).join('')}</div>
      <p class="form-hinweis">Antippen übernimmt die Übung mit Hinweis, Gewicht und Video. Oder unten neu eintragen.</p></div>` : ''}
    <p class="card-text ${auchText(andere) ? '' : 'hidden'}" id="u-auch">${esc(auchText(andere))}</p>
    <div class="form-group"><label for="u-name">Name</label><input type="text" id="u-name" value="${esc(ue.name)}" placeholder="z. B. Gobletsquat" autocomplete="off"></div>
    <div class="form-group"><label for="u-hinweis">Hinweis</label><textarea id="u-hinweis" rows="2" placeholder="z. B. Fersen erhöht, so tief wie möglich">${esc(ue.hinweis)}</textarea></div>
    ${bib ? '' : `<div class="modal-divider"></div>
    <div class="form-group"><label>In diesem Plan</label></div>
    ${werteFormular(w)}`}
    <div class="modal-divider"></div>
    <label class="schalter-zeile" for="u-seiten"><input type="checkbox" id="u-seiten" ${ue.seiten ? 'checked' : ''}><span>Seiten re/li<small>Erst rechts, kurz „Seite wechseln“, dann links</small></span></label>
    <div class="form-reihe" style="margin-top:0.6rem">
      <div class="form-group"><label for="u-kg">Gewicht (kg)</label><input type="text" inputmode="decimal" id="u-kg" value="${ue.kg != null ? komma(ue.kg) : ''}" placeholder="ohne"></div>
      <div class="form-group u-mitkg"><label for="u-schritt">Ändern um</label><select id="u-schritt">${[0.5, 1, 1.25, 2, 2.5, 5].map(s => `<option value="${s}" ${s === ue.schritt ? 'selected' : ''}>${komma(s)} kg</option>`).join('')}</select></div>
    </div>
    <p class="form-hinweis u-mitkg">Im Training das Gewicht antippen: + und − ändern es um diesen Wert.</p>
    <label class="schalter-zeile u-mitkg" for="u-zwei"><input type="checkbox" id="u-zwei" ${ue.anzahl === 2 ? 'checked' : ''}><span>2 × (je Hand)<small>z. B. „2 × 5 kg“</small></span></label>
    <div class="modal-divider"></div>
    <div class="form-group"><label>Video</label><div id="u-video"></div>
      <input type="file" id="u-datei" accept="video/*" hidden></div>
    <div class="btn-reihe">
      <button class="btn-primary" id="u-ok" type="button">Speichern</button>
      ${neu ? '' : bib ? '<button class="btn-leise" id="u-del" type="button">Übung löschen</button>' : '<button class="btn-leise" id="u-weg" type="button">Aus dem Block entfernen</button>'}
    </div>`);
  if (!bib) werteFormularVerbinden();
  // Schritt und 2 × nur zeigen, wenn ein Gewicht eingetragen ist
  const kgSicht = () => $$('#sheet .u-mitkg').forEach(el => el.classList.toggle('hidden', $('#u-kg').value.trim() === ''));
  $('#u-kg').oninput = kgSicht; kgSicht();
  // ── Video: wählen, Ausschnitt setzen ──
  let vs = null, probe = false;
  const vsAus = v => { if (vs?.url && vs.neu) URL.revokeObjectURL(vs.url); vs = v ? { ...v } : null; if (vs && !vs.neu) vsLaden(); videoBereich(); };
  async function vsLaden() {
    const v = vs, blob = await videoLaden(v.id);
    if (vs !== v) return;
    if (blob) v.url = URL.createObjectURL(blob); else v.fehlt = true;
    videoBereich();
  }
  function vInfo() {
    const el = $('#v-info'); if (!el || !vs) return;
    $('#u-video [data-v="ganz"]')?.classList.toggle('an', !vs.start && vs.ende == null);
    const bis = vs.ende ?? vs.dauer;
    el.textContent = [bis != null ? `Ausschnitt ${sekText(Math.max(0, bis - (vs.start || 0)))}` : '', vs.dauer ? `Video ${zeitFmt(vs.dauer)}` : '', vs.groesse ? mbText(vs.groesse) : ''].filter(Boolean).join(' · ');
  }
  function videoBereich() {
    const el = $('#u-video'); if (!el) return;
    if (!vs) {
      el.innerHTML = `<button class="btn-secondary" type="button" data-v="waehlen">Video wählen</button>
        <p class="form-hinweis">Aus Fotos oder iCloud Drive. Das Video bleibt nur auf diesem Gerät. Tipp: in 1080p filmen oder in Fotos kürzen.</p>`;
      return;
    }
    if (vs.fehlt) {
      el.innerHTML = `<p class="card-text">Das Video ist nicht auf diesem Gerät, etwa nach dem Laden einer Sicherung${vs.name ? ` (${esc(vs.name)})` : ''}. Bitte neu wählen.</p>
        <div class="chip-reihe links"><button class="btn-klein" type="button" data-v="waehlen">Video wählen</button><button class="btn-klein" type="button" data-v="weg">Video entfernen</button></div>`;
      return;
    }
    if (!vs.url) { el.innerHTML = '<p class="form-hinweis">Video wird geladen …</p>'; return; }
    el.innerHTML = `<video id="u-vid" class="u-vid" src="${vs.url}" playsinline controls preload="metadata"></video>
      <div class="form-reihe v-reihe">
        <div class="form-group"><label for="v-start">Start</label><div class="v-feld"><input type="text" inputmode="decimal" id="v-start" value="${zeitFmt(vs.start || 0)}"><button class="btn-klein" type="button" data-v="start">hier</button></div></div>
        <div class="form-group"><label for="v-ende">Ende</label><div class="v-feld"><input type="text" inputmode="decimal" id="v-ende" value="${zeitFmt(vs.ende)}" placeholder="Schluss"><button class="btn-klein" type="button" data-v="ende">hier</button></div></div>
      </div>
      <p class="form-hinweis" id="v-info"></p>
      <div class="chip-reihe links">
        <button class="btn-klein" type="button" data-v="probe">Ausschnitt abspielen</button>
        <button class="btn-klein" type="button" data-v="ganz">ganzes Video</button>
        <button class="btn-klein" type="button" data-v="waehlen">anderes Video</button>
        <button class="btn-klein" type="button" data-v="weg">entfernen</button>
      </div>
      <p class="form-hinweis">Video bis zur Stelle abspielen und „hier“ tippen. Im Training läuft nur der Ausschnitt, im Loop.</p>`;
    const v = $('#u-vid');
    v.addEventListener('loadedmetadata', () => { vs.dauer = Math.round(v.duration * 10) / 10; if (vs.start) v.currentTime = vs.start; vInfo(); });
    v.addEventListener('timeupdate', () => { if (probe && vs.ende != null && v.currentTime >= vs.ende) v.currentTime = vs.start || 0; });
    $('#v-start').onchange = () => { const t = zeitLesen($('#v-start').value); vs.start = t ?? 0; if (vs.ende != null && vs.ende <= vs.start) vs.ende = null; $('#v-start').value = zeitFmt(vs.start); $('#v-ende').value = zeitFmt(vs.ende); vInfo(); };
    $('#v-ende').onchange = () => { const t = zeitLesen($('#v-ende').value); vs.ende = t != null && t > (vs.start || 0) ? t : null; $('#v-ende').value = zeitFmt(vs.ende); vInfo(); };
    vInfo();
  }
  $('#u-video').addEventListener('click', e => {
    const a = e.target.closest('[data-v]')?.dataset.v; if (!a) return;
    const v = $('#u-vid');
    if (a === 'waehlen') $('#u-datei').click();
    if (a === 'weg') vsAus(null);
    if (a === 'ganz') { vs.start = 0; vs.ende = null; videoBereich(); }
    if (a === 'start' && v) { vs.start = Math.round(v.currentTime * 10) / 10; if (vs.ende != null && vs.ende <= vs.start) vs.ende = null; $('#v-start').value = zeitFmt(vs.start); $('#v-ende').value = zeitFmt(vs.ende); vInfo(); }
    if (a === 'ende' && v) { const t = Math.round(v.currentTime * 10) / 10; if (t > (vs.start || 0) + 0.5) { vs.ende = t; probe = false; v.pause(); $('#v-ende').value = zeitFmt(t); vInfo(); } else toast('Das Ende muss nach dem Start liegen'); }
    if (a === 'probe' && v) { probe = true; v.currentTime = vs.start || 0; v.play().catch(() => {}); }
  });
  $('#u-datei').onchange = e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    vsAus({ neu: true, blob: f, url: URL.createObjectURL(f), start: 0, ende: null, dauer: null, name: f.name, groesse: f.size });
    if (f.size > 200 * 1048576) toast(`Großes Video (${mbText(f.size)}). Kürzen spart Platz.`);
  };
  vsAus(ue.video || null);
  $$('#u-vorh [data-vorh]').forEach(btn => btn.onclick = () => {
    const an = gewaehlt !== btn.dataset.vorh;
    $$('#u-vorh [data-vorh]').forEach(x => x.classList.toggle('an', an && x === btn));
    gewaehlt = an ? btn.dataset.vorh : null;
    const u = an ? S.uebungen[gewaehlt] : { name: '', hinweis: '', seiten: false, kg: null, anzahl: 1, schritt: 2.5 };
    $('#u-name').value = u.name; $('#u-hinweis').value = u.hinweis; $('#u-seiten').checked = u.seiten;
    $('#u-kg').value = u.kg != null ? komma(u.kg) : ''; $('#u-zwei').checked = u.anzahl === 2; $('#u-schritt').value = String(u.schritt); kgSicht();
    vsAus(u.video || null);
    const auch = an ? plaeneMit(gewaehlt, null) : [];
    $('#u-auch').classList.toggle('hidden', !auch.length);
    $('#u-auch').textContent = auchText(auch);
  });
  const suche = $('#u-suche');
  if (suche) suche.oninput = () => {
    const q = suche.value.trim().toLowerCase();
    $$('#u-vorh [data-vorh]').forEach(x => x.classList.toggle('hidden', !!q && !x.dataset.nm.includes(q)));
  };
  $('#u-ok').onclick = async () => {
    const name = $('#u-name').value.trim();
    if (!name) { $('#u-name').focus(); toast('Bitte einen Namen eintragen'); return; }
    // Video zuerst sichern: erst wenn der Clip gespeichert ist, zeigt die Übung darauf
    let video = null;
    const knopf = $('#u-ok');
    if (vs?.neu) {
      const id = uid();
      knopf.disabled = true; knopf.textContent = 'Video wird gespeichert …';
      try { await videoSpeichern(id, vs.blob); }
      catch { knopf.disabled = false; knopf.textContent = 'Speichern'; toast('Video ließ sich nicht speichern. Speicher voll?'); return; }
      navigator.storage?.persist?.().catch(() => {});
      video = { id, start: vs.start || 0, ende: vs.ende ?? null, dauer: vs.dauer ?? null, name: vs.name || '', groesse: vs.groesse || 0 };
    } else if (vs?.id) video = { id: vs.id, start: vs.start || 0, ende: vs.ende ?? null, dauer: vs.dauer ?? null, name: vs.name || '', groesse: vs.groesse || 0 };
    const altId = gewaehlt ? S.uebungen[gewaehlt]?.video?.id : null;
    if (altId && altId !== video?.id) videoEntsorgen(altId);
    if (vs?.url) URL.revokeObjectURL(vs.url);
    const kgRoh = $('#u-kg').value.trim();
    const daten = {
      name, hinweis: $('#u-hinweis').value.trim(), seiten: $('#u-seiten').checked,
      kg: kgRoh === '' ? null : Math.max(0, zahl(kgRoh, 0)), anzahl: $('#u-zwei').checked ? 2 : 1, schritt: zahl($('#u-schritt').value, 2.5),
      video,
    };
    if (gewaehlt) Object.assign(S.uebungen[gewaehlt], daten);
    else { gewaehlt = neueUebung(name).id; Object.assign(S.uebungen[gewaehlt], daten); }
    if (!bib) {
      it.ue = gewaehlt;
      it.w = werteLesen();
      if (neu) b.items.push(it);
    }
    clipKeys = null;
    speichern(); sheetZu(); bib ? renderBib() : renderPlan();
    toast(neu ? (bib ? `${name} angelegt` : `${name} hinzugefügt`) : 'Gespeichert');
  };
  if (bib && !neu) $('#u-del').onclick = () => {
    const l = plaeneMit(ue.id, null);
    const weg = () => {
      // merken, wo sie stand, für „Rückgängig“
      const stellen = [];
      S.plaene.forEach(pl => pl.bloecke.forEach(bl => bl.items.forEach((x, k) => { if (x.ue === ue.id) stellen.push([bl, k, x]); })));
      stellen.slice().reverse().forEach(([bl, k]) => bl.items.splice(k, 1));
      delete S.uebungen[ue.id];
      speichern(); renderBib();
      toast(`${ue.name} gelöscht`, () => { S.uebungen[ue.id] = ue; stellen.forEach(([bl, k, x]) => bl.items.splice(k, 0, x)); speichern(); renderBib(); });
    };
    if (!l.length) { sheetZu(); weg(); return; }
    bestaetigen(`${ue.name} löschen?`, `Die Übung steht in ${esc(l.join(', '))} und wird dort entfernt.`, 'Löschen', weg);
  };
  if (!bib && !neu) $('#u-weg').onclick = () => {
    b.items.splice(ii, 1);
    speichern(); sheetZu(); renderPlan();
    toast(`${ue.name} entfernt`, () => { b.items.splice(ii, 0, it); speichern(); renderPlan(); });
  };
  if (neu && !vorhanden.length) setTimeout(() => $('#u-name')?.focus(), 250);
}

function bestaetigen(titel, text, jaText, ja, neinText = 'Abbrechen', nein) {
  sheet(titel, `<p class="card-text">${text}</p><div class="btn-reihe"><button class="btn-primary" id="ja" type="button">${jaText}</button><button class="btn-leise" id="nein" type="button">${neinText}</button></div>`);
  $('#ja').onclick = () => { sheetZu(); ja(); };
  $('#nein').onclick = () => { sheetZu(); nein?.(); };
}

// ── Einstellungen ───────────────────────────────────────
function segSetzen(id, wert) { $$(`#${id} button`).forEach(b => b.classList.toggle('an', b.dataset.wert === String(wert))); }
async function renderEinst() {
  segSetzen('e-auto', S.einst.auto ? 1 : 0);
  segSetzen('e-vorlauf', S.einst.vorlauf);
  segSetzen('e-wechsel', S.einst.wechsel);
  segSetzen('e-toene', S.einst.toene ? 1 : 0);
  segSetzen('e-videoton', S.einst.videoTon);
  const t = $('#speicher-text');
  try {
    const est = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
    const dauerhaft = navigator.storage?.persisted ? await navigator.storage.persisted() : false;
    const mb = b => (b / 1048576).toLocaleString('de-DE', { maximumFractionDigits: b < 10485760 ? 1 : 0 });
    const clips = Object.values(S.uebungen).filter(u => u.video), clipMb = clips.reduce((a, u) => a + (u.video.groesse || 0), 0);
    t.textContent = (est ? `Belegt: ${mb(est.usage || 0)} MB von etwa ${mb(est.quota || 0)} MB. ` : '') +
      (clips.length ? `Davon ${clips.length} ${clips.length === 1 ? 'Video' : 'Videos'} mit etwa ${mb(clipMb)} MB. ` : '') +
      (dauerhaft ? 'Dauerhaft gespeichert: Der Browser räumt MemoFit nicht von selbst auf.' : 'Noch nicht dauerhaft gespeichert. Am besten die App vom Home-Bildschirm nutzen und unten anfragen.');
    $('#btn-persist').classList.toggle('hidden', !!dauerhaft || !navigator.storage?.persist);
  } catch { t.textContent = 'Speicherangaben sind in diesem Browser nicht verfügbar.'; }
}
function einstVerbinden() {
  const seg = (id, f) => $$(`#${id} button`).forEach(b => b.onclick = () => { f(b.dataset.wert); speichern(); renderEinst(); });
  seg('e-auto', v => S.einst.auto = v === '1');
  seg('e-videoton', v => S.einst.videoTon = v);
  seg('e-vorlauf', v => S.einst.vorlauf = +v);
  seg('e-wechsel', v => S.einst.wechsel = +v);
  seg('e-toene', v => { S.einst.toene = v === '1'; if (S.einst.toene) { audioAn(); ton('los'); } });
  $('#btn-tontest').onclick = () => { audioAn(); ton('tick'); setTimeout(() => ton('tick'), 1000); setTimeout(() => ton('tick'), 2000); setTimeout(() => ton('los'), 3000); if (!S.einst.toene) toast('Töne sind aus'); };
  $('#btn-persist').onclick = async () => {
    const ok = await navigator.storage.persist().catch(() => false);
    toast(ok ? 'Dauerhaft gespeichert' : 'Der Browser hat abgelehnt. Vom Home-Bildschirm aus klappt es meist.');
    renderEinst();
  };
  $('#btn-export').onclick = () => {
    const d = new Date(), tag = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const blob = new Blob([JSON.stringify({ app: 'MemoFit', ...kopie(S) }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `memofit-sicherung-${tag}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Sicherung erstellt');
  };
  $('#btn-import').onclick = () => $('#import-datei').click();
  $('#import-datei').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    let neu = null; try { neu = JSON.parse(await f.text()); } catch {}
    if (!neu || neu.version !== 1 || !Array.isArray(neu.plaene)) { toast('Diese Datei ist keine MemoFit-Sicherung'); return; }
    bestaetigen('Sicherung laden?', `${neu.plaene.length} ${neu.plaene.length === 1 ? 'Plan' : 'Pläne'}. Das ersetzt alles, was jetzt auf diesem Gerät ist.`, 'Laden', () => {
      S = zustandAus(neu); speichern(); zeige('start'); toast('Sicherung geladen');
    });
  };
  $('#btn-beispiel').onclick = () => { S.plaene.push(beispielplan()); speichern(); toast('Beispielplan hinzugefügt'); };
  $('#btn-alles-loeschen').onclick = () => bestaetigen('Alles löschen?', 'Alle Pläne, Übungen und Gewichte auf diesem Gerät werden gelöscht. Das lässt sich nicht rückgängig machen. Vorher eine Sicherung?', 'Alles löschen', () => {
    const e = S.einst; S = leer(); S.einst = e; speichern();
    videoSchluessel().then(keys => keys.forEach(videoEntsorgen)); zeige('start'); toast('Alles gelöscht');
  });
}

// ── Töne (Web Audio, erst nach einem Tipp möglich) ─────
let ac = null;
// iOS (Safari 17+): „ambient“ mischt. Musik aus anderen Apps läuft in voller Lautstärke weiter,
// 3-2-1 und Videoton liegen darüber. Preis: Im Lautlos-Modus bleibt MemoFit stumm.
function audioSession(typ) { try { if (navigator.audioSession && navigator.audioSession.type !== typ) navigator.audioSession.type = typ; } catch {} }
function audioPruefen() { audioSession('ambient'); }
function audioAn() {
  audioSession('ambient');
  try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch {}
}
function piep(f, start, dauer, laut = 0.22) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(laut, start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
  o.connect(g).connect(ac.destination); o.start(start); o.stop(start + dauer + 0.05);
}
function ton(art) {
  if (!S.einst.toene || !ac) return;
  try {
    const t = ac.currentTime + 0.01;
    if (art === 'tick') piep(660, t, 0.14);
    else if (art === 'los') piep(990, t, 0.45, 0.26);
    else if (art === 'ende') { piep(520, t, 0.2); piep(520, t + 0.26, 0.32); }
    else if (art === 'leise') piep(740, t, 0.08, 0.1);
  } catch {}
}

// ── Bildschirm anlassen (Wake Lock) ─────────────────────
let wakeLock = null;
async function wachHalten() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch {}
}
function wachLoslassen() { try { wakeLock?.release(); } catch {} wakeLock = null; }

// ══ TRAINING ═════════════════════════════════════════════
// Zeit mit Zeitstempeln (Date.now), nicht mit gezählten Intervallen: stimmt auch nach einer Hintergrundpause.
let L = null, tickTimer = null, gewTimer = null;
const jetzt = () => Date.now();
const RING_U = 2 * Math.PI * 45;

function trainingStart(planId) {
  const plan = S.plaene.find(p => p.id === planId); if (!plan) return;
  const { ues, out } = ablauf(plan);
  if (!out.length) return;
  audioAn();
  navigator.storage?.persist?.().catch(() => {});
  L = { plan, ues, out, i: 0, t0: jetzt(), start: 0, dauerMs: 0, halt: false, haltRest: 0, warte: false, piep: -1, einschub: null, gewOffen: false, ende: false,
    video: videoElement(), urls: {}, videoUe: null, tonGehoert: new Set(), karte: 'vorn',
    hatVideo: ues.some(x => x.ue.video) };
  clipsLaden(L);
  document.documentElement.classList.add('im-training');
  $('#training').classList.remove('hidden');
  wachHalten();
  geheZu(0, jetzt(), false);
  clearInterval(tickTimer); tickTimer = setInterval(tick, 100);
}
function trainingZu() {
  clearInterval(tickTimer); tickTimer = null;
  if (L) { try { L.video.pause(); L.video.removeAttribute('src'); L.video.load(); } catch {} Object.values(L.urls).forEach(u => { if (u !== 'fehlt') URL.revokeObjectURL(u); }); }
  L = null;
  audioSession('ambient');
  wachLoslassen();
  document.documentElement.classList.remove('im-training');
  $('#training').classList.add('hidden'); $('#training').innerHTML = '';
  renderStart();
}

// ── Video im Training ──
// Ein einziges <video> wandert zwischen Kartenrückseite und Pausen-Vorschau. So bleibt es nach dem Start-Tipp „freigeschaltet“.
function videoElement() {
  const v = document.createElement('video');
  v.className = 't-video'; v.playsInline = true; v.muted = true; v.preload = 'auto'; v.loop = true;
  v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
  v.addEventListener('timeupdate', videoLoop);
  v.addEventListener('ended', videoLoop);
  ['play', 'pause', 'volumechange'].forEach(ev => v.addEventListener(ev, () => { audioPruefen(); lautKnopf(); }));
  v.addEventListener('loadedmetadata', () => { const c = L && S.uebungen[L.videoUe]?.video; if (c?.start) v.currentTime = c.start; });
  return v;
}
async function clipsLaden(lauf) {
  const ids = [...new Set(lauf.ues.map(x => x.ue.video?.id).filter(Boolean))];
  for (const id of ids) {
    const blob = await videoLaden(id);
    if (L !== lauf) return;
    if (blob) lauf.urls[id] = URL.createObjectURL(blob); else lauf.urls[id] = 'fehlt';
    videoSync();
  }
}
// Videoton: einmal (erster Durchlauf je Übung) · stumm · immer. Der Lautsprecher im Training schaltet weiter.
const tonStumm = ueId => S.einst.videoTon === 'aus' || (S.einst.videoTon === 'erst' && L.tonGehoert.has(ueId));
const TON_NAME = { erst: 'einmal', aus: 'stumm', immer: 'immer' };
const LAUTSPR = '<path d="M2.5 9.5h3L10 5.5v13l-4.5-4h-3Z"/>';
const TON_ICON = {
  erst: svg(LAUTSPR + '<path d="M16 8.2l2-1.4v10.4"/>', 1.9),
  immer: svg(LAUTSPR + '<path d="M13 12c0-1.3.9-2.2 2-2.2 2 0 3 4.4 5 4.4 1.1 0 2-.9 2-2.2s-.9-2.2-2-2.2c-2 0-3 4.4-5 4.4-1.1 0-2-.9-2-2.2Z"/>', 1.9),
  aus: svg(LAUTSPR + '<path d="M14.5 9.5l5 5M19.5 9.5l-5 5"/>', 1.9),
};
function lautKnopf() {
  const b = L && $('#training .t-laut'); if (!b) return;
  const m = S.einst.videoTon;
  b.innerHTML = TON_ICON[m] || TON_ICON.erst;
  b.dataset.ton = m;
  b.setAttribute('aria-label', `Videoton: ${TON_NAME[m]}`);
}
function lautUmschalten() {
  const folge = { erst: 'immer', immer: 'aus', aus: 'erst' };
  S.einst.videoTon = folge[S.einst.videoTon] || 'erst'; speichern();
  if (S.einst.videoTon === 'erst' && L.videoUe) L.tonGehoert.delete(L.videoUe);   // „einmal“: das laufende Video noch einmal mit Ton
  const v = L.video;
  if (L.videoUe) {
    v.muted = tonStumm(L.videoUe);
    if (!v.muted && v.isConnected && !v.paused) v.play()?.catch(() => {});   // der Tipp gibt iOS die Freigabe für Ton
  }
  toast(`Videoton: ${TON_NAME[S.einst.videoTon]}`);
  audioPruefen(); lautKnopf();
}
function videoSpielen() {
  const v = L.video;
  v.play()?.catch(() => { if (!v.muted) { v.muted = true; v.play()?.catch(() => {}); } });   // ohne Freigabe: stumm weiter
}
// Ausschnitt im Loop: am Ende zurück zum Start. Nach dem ersten Durchlauf stumm, wenn so eingestellt.
function videoLoop() {
  if (!L || !L.videoUe) return;
  const v = L.video, c = S.uebungen[L.videoUe]?.video; if (!c) return;
  const start = c.start || 0, t = v.currentTime, vorher = L.vZeit ?? t;
  L.vZeit = t;
  const amEnde = v.ended || (c.ende != null && t >= c.ende - 0.05);
  const herum = t < vorher - 0.5;   // das Video ist von selbst wieder vorn (loop)
  if (amEnde || herum) {
    const lief = !v.paused || v.ended;
    L.tonGehoert.add(L.videoUe);
    v.muted = tonStumm(L.videoUe);
    if (amEnde || t < start - 0.3) { v.currentTime = start; L.vZeit = start; }
    if (lief && v.paused) videoSpielen();
  } else if (t < start - 0.3) { v.currentTime = start; L.vZeit = start; }
}
function videoSync() {
  if (!L || !L.video) return;
  const v = L.video, slot = L.ende ? null : $('#training .t-video-slot');
  if (!slot) { v.pause(); v.remove(); return; }
  const ue = S.uebungen[slot.dataset.ue], url = ue?.video && L.urls[ue.video.id];
  slot.classList.toggle('laedt', !url);
  slot.classList.toggle('fehlt', url === 'fehlt');
  if (!url || url === 'fehlt') { v.pause(); v.remove(); return; }
  if (L.videoUe !== ue.id) { L.videoUe = ue.id; L.vZeit = null; v.src = url; }
  if (v.parentNode !== slot) slot.appendChild(v);
  const st = cur();
  const sichtbar = st.typ === 'arbeit' && L.karte === 'hinten' && !L.halt;
  v.muted = tonStumm(ue.id);
  if (sichtbar) videoSpielen(); else v.pause();
  lautKnopf();
}

const cur = () => L.einschub || L.out[L.i];
function phaseDauerMs(st) {
  if (st.typ === 'arbeit') { const w = L.ues[st.ui].w; return w.modus === 'zeit' ? w.zeit * 1000 : Infinity; }
  return st.dauer * 1000;
}
function restMs() { return L.halt ? L.haltRest : L.dauerMs - (jetzt() - L.start); }

function geheZu(k, startZeit = jetzt(), einschub = false) {
  L.i = k; L.halt = false; L.warte = false; L.piep = -1; L.gewOffen = false; L.einschub = null;
  if (k >= L.out.length) { ende(); return; }
  const st = L.out[k];
  // Sprung per Wischen oder ‹ ›: 3 s „Bereit“, damit die Übung nicht sofort losläuft
  if (einschub && st.typ === 'arbeit') L.einschub = { typ: 'bereit', dauer: 3, ui: st.ui, einschub: true };
  L.start = startZeit;
  L.dauerMs = phaseDauerMs(cur());
  if (L.dauerMs <= 0) { geheZu(k + 1, startZeit); return; }
  if (cur().typ === 'arbeit' && jetzt() - startZeit < 1500) ton('los');
  render();
}
function phaseFertig(endZeit) {
  const st = cur();
  if (L.einschub) { L.einschub = null; L.start = endZeit; L.dauerMs = phaseDauerMs(cur()); L.piep = -1; if (jetzt() - endZeit < 1500) ton('los'); render(); return; }
  geheZu(L.i + 1, endZeit);
}
function tick() {
  if (!L || L.ende) return;
  for (let n = 0; n < 500; n++) {
    if (!L || L.ende || L.halt || L.warte || !Number.isFinite(L.dauerMs)) break;
    const rest = restMs();
    if (rest > 0) {
      const s = Math.ceil(rest / 1000);
      if (s <= 3 && s !== L.piep) { L.piep = s; ton('tick'); }
      break;
    }
    const endZeit = L.start + L.dauerMs, frisch = jetzt() - endZeit < 1500;
    const st = cur();
    if (st.typ === 'arbeit') { if (frisch) ton('ende'); phaseFertig(endZeit); continue; }
    if (!S.einst.auto && !st.einschub) { L.warte = true; L.haltRest = 0; if (frisch) ton('leise'); render(); break; }
    phaseFertig(endZeit);
  }
  ringAktualisieren();
  audioPruefen();
}
function ringAktualisieren() {
  if (!L || L.ende) return;
  if (L.video && !L.video.paused) videoLoop();
  const bogen = $('#training .bogen'), zahlen = $$('#training .zahl-wert');
  if (!bogen || !zahlen.length) return;
  const rest = Math.max(0, restMs());
  const anteil = L.dauerMs > 0 ? rest / L.dauerMs : 0;
  bogen.style.strokeDashoffset = String(RING_U * (1 - anteil));
  zahlen.forEach(z => { z.textContent = sek(Math.ceil(rest / 1000)); });
  $('.t-ring')?.classList.toggle('drei', rest <= 3000 && rest > 0 && !L.halt && !L.warte);
}

function ende() {
  L.ende = true;
  videoSync();
  const min = Math.max(1, Math.round((jetzt() - L.t0) / 60000));
  S.verlauf.push({ datum: new Date().toISOString(), plan: L.plan.id, name: L.plan.name, min });
  if (S.verlauf.length > 500) S.verlauf.shift();
  speichern();
  wachLoslassen();
  const t = $('#training');
  t.className = 'training ph-bereit';
  t.innerHTML = `<div class="t-ende"><h2>Training beendet</h2><p>${esc(L.plan.name)} · ${min} min</p>
    <button class="btn-primary" type="button" data-a="schliessen">Schließen</button></div>`;
}

// Was kommt als Nächstes (für „Gleich“ und die Vorschau in der Pause)
function naechsteArbeit(ab) { for (let k = ab; k < L.out.length; k++) if (L.out[k].typ === 'arbeit') return k; return -1; }
function satzText(st) {
  const teile = [`Satz ${st.satz} von ${st.saetze}`];
  if (st.seite) teile.push(seitenText(st.seite));
  return teile.join(' · ');
}
function gleichText() {
  const st = cur(), k = naechsteArbeit(L.i + 1);
  if (k < 0) return 'Gleich: Ende';
  const n = L.out[k];
  if (n.ui === st.ui) return n.satz === st.satz ? `Gleich: ${seitenText(n.seite)}` : `Gleich: Satz ${n.satz}${n.kann ? ' (freiwillig)' : ''}`;
  return `Gleich: <b>${esc(L.ues[n.ui].ue.name)}</b>`;
}

function ringHtml(label) {
  return `<div class="t-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="bahn" cx="50" cy="50" r="45" stroke-width="6"/><circle class="bogen" cx="50" cy="50" r="45" stroke-width="6" stroke-dasharray="${RING_U}" stroke-dashoffset="0"/></svg>
    <div class="zahl"><span class="zahl-wert"></span>${label ? `<small>${label}</small>` : ''}</div></div>`;
}
function gewichtHtml(ue) {
  if (ue.kg == null) return '';
  if (L.gewOffen) return `<div class="t-gewicht-pm" style="order:5"><button type="button" data-a="kg-">−</button><span class="wert">${esc(kgText(ue))}</span><button type="button" data-a="kg+">+</button></div>`;
  return `<button class="t-gewicht" type="button" data-a="kg" style="order:5">${esc(kgText(ue))}</button>`;
}
const O = n => `style="order:${n}"`;

function render() {
  if (!L || L.ende) return;
  const st = cur(), t = $('#training');
  const arbeit = st.typ === 'arbeit';
  t.className = `training ph-${st.typ === 'wechsel' ? 'wechsel' : st.typ}${L.halt ? ' halt' : ''}`;

  // Bei Pausen gehört die Anzeige schon zur nächsten Übung
  const kNext = arbeit ? L.i : naechsteArbeit(L.einschub ? L.i : L.i + 1);
  const ziel = kNext >= 0 ? L.out[kNext] : null;
  const x = L.ues[(ziel || st).ui];
  const ort = `<b>${esc(x.b.name)}</b> · Übung ${(ziel || st).ui + 1} von ${L.ues.length}`;

  let vorn = '', hinten = '';
  if (arbeit) {
    const w = x.w;
    const links = w.modus === 'zeit'
      ? ringHtml(L.halt ? 'angehalten' : '')
      : `<div class="t-wdh" ${O(4)}>${w.wdh}${w.wdhBis ? '–' + w.wdhBis : ''}<small>×</small></div><button class="btn-fertig" type="button" data-a="fertig" ${O(6)}>fertig</button>`;
    vorn = `<div class="t-links">${links.replace('class="t-ring"', `class="t-ring" ${O(4)}`)}${gewichtHtml(x.ue)}</div>
      <div class="t-rechts">
        <div class="t-zeile" ${O(1)}><b>${satzText(st)}</b>${st.kann ? ' · freiwillig' : ''}</div>
        <div class="t-name" ${O(2)}>${esc(x.ue.name)}</div>
        ${x.ue.hinweis ? `<div class="t-hinweis" ${O(3)}>${esc(x.ue.hinweis)}</div>` : ''}
        <div class="t-gleich" ${O(7)}>${gleichText()}</div>
        ${x.ue.video ? `<div class="t-video-tipp" ${O(8)}>Antippen: Video</div>` : ''}
      </div>`;
    const unten = w.modus === 'zeit'
      ? `<span class="t-vzahl"><span class="zahl-wert"></span>${L.halt ? '<small>angehalten</small>' : ''}</span>`
      : `<button class="btn-fertig klein" type="button" data-a="fertig">fertig</button>`;
    hinten = x.ue.video
      ? `<div class="t-video-slot" data-ue="${x.ue.id}"></div>
         <div class="t-video-leiste"><div class="t-vtext"><div class="t-vname">${esc(x.ue.name)}</div><div class="t-zeile"><b>${satzText(st)}</b></div></div>${unten}</div>`
      : x.ue.hinweis
      ? `<div class="t-zeile">${esc(x.ue.name)} · ${satzText(st)}</div><div class="t-hinweis-gross">${esc(x.ue.hinweis)}</div>`
      : `<div class="t-name">${esc(x.ue.name)}</div><div class="t-rueck-leer">Kein Hinweis eingetragen.</div>`;
  } else {
    const titel = st.typ === 'bereit' ? 'Bereit' : st.typ === 'wechsel' ? 'Seite wechseln' : 'Pause';
    let unten = '';
    if (L.warte) unten = `<div class="t-stopp" ${O(10)}><button type="button" data-a="plus15">+15 s</button><button type="button" class="haupt" data-a="los">weiter</button></div>`;
    else if (L.halt) unten = `<div class="t-stopp-text" ${O(9)}>angehalten</div><div class="t-stopp" ${O(10)}><button type="button" data-a="plus15">+15 s</button><button type="button" class="haupt" data-a="los">weiter</button></div>`
      + (st.kannNaechster ? `<button class="btn-auslassen" type="button" data-a="auslassen" ${O(11)}>Satz auslassen, zur nächsten Übung</button>` : '');
    else if (st.kannNaechster) unten = `<div class="t-kann" ${O(9)}><p>Noch einer?</p><button class="btn-auslassen" type="button" data-a="auslassen">auslassen, zur nächsten Übung</button></div>`;
    const vor = ziel ? `<div class="t-vorschau" ${O(8)}>
        <div class="t-gleich">Gleich · ${satzText(ziel)}${x.ue.kg != null ? ' · ' + esc(kgText(x.ue)) : ''}</div>
        <div class="t-name">${esc(x.ue.name)}</div>
        ${x.ue.hinweis ? `<div class="t-hinweis">${esc(x.ue.hinweis)}</div>` : ''}
      </div>` : '';
    vorn = `<div class="t-links">${ringHtml(L.warte ? 'bereit?' : '').replace('class="t-ring"', `class="t-ring" ${O(4)}`)}</div>
      <div class="t-rechts"><div class="t-zeile" ${O(1)}><b>${titel}</b></div>${vor}${unten}</div>`;
  }

  t.innerHTML = `
    <div class="t-oben">
      <button class="t-x" type="button" data-a="abbrechen" aria-label="Training beenden">✕</button>
      <div class="t-ort">${ort}</div>
      ${L.hatVideo ? `<button class="t-x t-laut" type="button" data-a="laut" aria-label="Videoton"></button>` : '<span class="t-platz"></span>'}
    </div>
    <div class="t-mitte">
      <div class="t-karte ${arbeit && L.karte === 'hinten' ? 'hinten' : ''}" role="group" aria-label="Übungskarte">
        <div class="t-seite t-vorn">${vorn}</div>
        ${arbeit ? `<div class="t-seite t-rueck${x.ue.video ? ' mit-video' : ''}">${hinten}</div>` : ''}
      </div>
    </div>
    <div class="t-unten">
      <button class="t-knopf" type="button" data-a="zurueck" aria-label="Vorige Übung">${ICON.zurueck}</button>
      <button class="t-knopf gross" type="button" data-a="halt" aria-label="${L.halt ? 'Fortsetzen' : 'Anhalten'}">${L.halt || L.warte ? ICON.play : ICON.pause}</button>
      <button class="t-knopf" type="button" data-a="weiter" aria-label="Nächste Übung">${ICON.vor}</button>
    </div>`;
  videoSync();
  ringAktualisieren();
}

function anhalten(an) {
  if (!L || L.ende) return;
  const getaktet = Number.isFinite(L.dauerMs);   // Wiederholungen laufen ohne Uhr
  if (an && !L.halt) { if (getaktet) L.haltRest = restMs(); L.halt = true; }
  else if (!an && L.halt) { if (getaktet) L.start = jetzt() + L.haltRest - L.dauerMs; L.halt = false; L.piep = -1; }
  render();
}
function uebungStart(ui) { return L.out.findIndex(s => s.typ === 'arbeit' && s.ui === ui); }
function springe(richtung) {
  const st = cur();
  const basis = st.uebungsPause ? st.ui + 1 : st.ui;   // die Pause vor Übung n+1 gehört schon zu n+1
  const anfang = uebungStart(basis);
  if (richtung > 0) {
    // Noch vor dem Start dieser Übung (Bereit, Pause davor): direkt los, sonst zur nächsten
    const k = L.i < anfang ? anfang : uebungStart(basis + 1);
    if (k < 0) { toast('Das ist die letzte Übung'); return; }
    geheZu(k, jetzt(), true);
  } else {
    // Mitten in der Übung: von vorn · schon am Anfang: die vorige
    const k = L.i > anfang ? anfang : uebungStart(basis - 1);
    geheZu(k >= 0 ? k : anfang, jetzt(), true);
  }
}
function aktion(a) {
  if (!L) return;
  const st = L.ende ? null : cur();
  switch (a) {
    case 'schliessen': trainingZu(); break;
    case 'abbrechen': {
      const warHalt = L.halt; anhalten(true);
      bestaetigen('Training beenden?', 'Der Plan bleibt, wie er ist.', 'Beenden', () => trainingZu(), 'Weiter trainieren', () => { if (!warHalt) anhalten(false); });
      break;
    }
    case 'halt': if (L.warte) aktion('los'); else anhalten(!L.halt); break;
    case 'fertig': ton('leise'); geheZu(L.i + 1); break;
    case 'los': phaseFertig(jetzt()); break;
    case 'plus15':
      if (L.warte) { L.warte = false; L.start = jetzt(); L.dauerMs = 15000; L.piep = -1; }
      else if (L.halt) { L.dauerMs += 15000; L.haltRest += 15000; anhalten(false); return; }
      else L.dauerMs += 15000;
      render(); break;
    case 'auslassen': {
      let k = L.i + 1;
      while (k < L.out.length && L.out[k].ui === st.ui && !L.out[k].uebungsPause) k++;
      geheZu(k); break;
    }
    case 'weiter': springe(1); break;
    case 'laut': lautUmschalten(); break;
    case 'zurueck': springe(-1); break;
    case 'kg': L.gewOffen = true; render(); gewZu(); break;
    case 'kg+': case 'kg-': {
      const ue = L.ues[st.ui].ue;
      ue.kg = Math.max(0, Math.round((ue.kg + (a === 'kg+' ? 1 : -1) * (ue.schritt || 2.5)) * 100) / 100);
      speichern(); render(); gewZu(); break;
    }
  }
}
function gewZu() { clearTimeout(gewTimer); gewTimer = setTimeout(() => { if (L && L.gewOffen) { L.gewOffen = false; render(); } }, 5000); }
function kartenTipp() {
  if (!L || L.ende) return;
  const st = cur();
  if (st.typ === 'arbeit') {
    if (L.gewOffen) { L.gewOffen = false; render(); return; }
    L.karte = L.karte === 'hinten' ? 'vorn' : 'hinten';
    $('#training .t-karte')?.classList.toggle('hinten', L.karte === 'hinten');
    videoSync();
  } else if (!L.halt && !L.warte) anhalten(true);   // Easy Stop: ein Tipp in der Pause hält an
}
function trainingVerbinden() {
  const t = $('#training');
  t.addEventListener('click', e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a) { audioAn(); aktion(a); return; }
    if (e.target.closest('.t-karte')) kartenTipp();
  });
  let x0 = null, y0 = 0;
  t.addEventListener('touchstart', e => { if (e.touches.length === 1) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; } }, { passive: true });
  t.addEventListener('touchend', e => {
    if (x0 == null || !L || L.ende) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 60) springe(dx < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && L && !L.ende) { wachHalten(); tick(); } });
}

// ── Sheet, Toast, Navigation ────────────────────────────
function sheet(titel, html) { $('#sheet-titel').textContent = titel; $('#sheet-body').innerHTML = html; $('#sheet').classList.remove('hidden'); $('#sheet .modal').scrollTop = 0; fensterOffen(); }
function sheetZu() { $('#sheet').classList.add('hidden'); fensterOffen(); }
function fensterOffen() {
  const offen = !$('#sheet').classList.contains('hidden') || !$('#hilfe').classList.contains('hidden');
  document.documentElement.classList.toggle('fenster-offen', offen);
}
let toastTimer = null;
function toast(text, rueckgaengig) {
  $('#toast-text').textContent = text;
  const btn = $('#toast-btn');
  btn.classList.toggle('hidden', !rueckgaengig);
  btn.onclick = rueckgaengig ? () => { rueckgaengig(); $('#toast').classList.add('hidden'); toast('Wiederhergestellt'); } : null;
  $('#toast').classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.add('hidden'), rueckgaengig ? 5000 : 2200);
}

function verschiebe(arr, i, d) { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }
function verbinden() {
  $$('.nav-item').forEach(b => b.onclick = () => zeige(b.dataset.view === 'plaene' ? (S.einst.planTab || 'plaene') : b.dataset.view));
  $('#btn-einstellungen').onclick = () => zeige(ansicht === 'einst' ? vorEinst : 'einst');
  $('#einst-zurueck').onclick = () => zeige(vorEinst === 'einst' ? 'start' : vorEinst);
  $('#btn-info').onclick = () => { $('#hilfe').classList.remove('hidden'); fensterOffen(); };
  $('#hilfe-zu').onclick = () => { $('#hilfe').classList.add('hidden'); fensterOffen(); };
  $('#sheet-zu').onclick = () => { sheetZu(); if (L && L.halt && !L.ende) anhalten(false); };
  $('#hilfe').addEventListener('click', e => { if (e.target.id === 'hilfe') { $('#hilfe').classList.add('hidden'); fensterOffen(); } });
  $$('#hilfe .hz-i').forEach(el => { const p = HZ[el.dataset.i]; if (p) el.innerHTML = svg(p); });

  $('#start-liste').addEventListener('click', e => {
    const p = e.target.closest('[data-plan]'); if (p) { trainingStart(p.dataset.plan); return; }
    if (e.target.closest('[data-a="zu-plaenen"]')) { if (S.plaene.length) { aktPlanId = S.plaene[0].id; zeige('plan'); } else neuerPlan(); }
  });

  $('#btn-plaene-sort').onclick = () => { plaeneSort = !plaeneSort; renderPlaene(); };
  $$('.plan-tabs button').forEach(b => b.onclick = () => zeige(b.dataset.wert));
  $('#bib-suche').oninput = () => renderBib();
  $('#btn-bib-neu').onclick = () => uebungSheet(null, null, null);
  $('#bib-liste').addEventListener('click', e => { const d = e.target.closest('[data-bib]')?.dataset.bib; if (d) uebungSheet(null, null, d); });
  $('#btn-plan-neu').onclick = neuerPlan;
  $('#plaene-liste').addEventListener('click', e => {
    const d = e.target.closest('button')?.dataset; if (!d) return;
    if (d.planEdit) { aktPlanId = d.planEdit; zeige('plan'); }
    if (d.planHoch) { verschiebe(S.plaene, +d.planHoch, -1); speichern(); renderPlaene(); }
    if (d.planRunter) { verschiebe(S.plaene, +d.planRunter, 1); speichern(); renderPlaene(); }
  });

  $('#plan-zurueck').onclick = () => zeige('plaene');
  $('#plan-name').onclick = () => planNameSheet(false);
  $('#plan-sort').onclick = () => { planSort = !planSort; renderPlan(); };
  $('#plan-kopie').onclick = () => {
    const p = aktPlan(), k = kopie(p);
    k.id = uid(); k.name = p.name + ' (Kopie)';
    k.bloecke.forEach(b => { b.id = uid(); b.items.forEach(i => i.id = uid()); });
    S.plaene.splice(S.plaene.indexOf(p) + 1, 0, k); aktPlanId = k.id;
    speichern(); renderPlan(); toast('Kopie angelegt');
  };
  $('#plan-weg').onclick = () => {
    const p = aktPlan(), i = S.plaene.indexOf(p);
    S.plaene.splice(i, 1); speichern(); zeige('plaene');
    toast(`${p.name} gelöscht`, () => { S.plaene.splice(i, 0, p); speichern(); renderPlaene(); renderStart(); });
  };
  $('#btn-block-neu').onclick = () => blockSheet(null);
  $('#plan-bloecke').addEventListener('click', e => {
    const d = e.target.closest('button')?.dataset; if (!d) return;
    const p = aktPlan();
    if (d.blockEdit != null) blockSheet(+d.blockEdit);
    if (d.ueNeu != null) uebungSheet(+d.ueNeu, null);
    if (d.ueEdit) { const [bi, ii] = d.ueEdit.split('.').map(Number); uebungSheet(bi, ii); }
    if (d.blockHoch) { verschiebe(p.bloecke, +d.blockHoch, -1); speichern(); renderPlan(); }
    if (d.blockRunter) { verschiebe(p.bloecke, +d.blockRunter, 1); speichern(); renderPlan(); }
    const ueZug = d.ueHoch || d.ueRunter;
    if (ueZug) {
      const [bi, ii] = ueZug.split('.').map(Number), dir = d.ueHoch ? -1 : 1, b = p.bloecke[bi];
      const j = ii + dir;
      if (j >= 0 && j < b.items.length) verschiebe(b.items, ii, dir);
      else {
        // Am Rand: in den Block davor oder danach wandern
        let nb = bi + dir; while (nb >= 0 && nb < p.bloecke.length && !p.bloecke[nb]) nb += dir;
        if (nb >= 0 && nb < p.bloecke.length) { const [it] = b.items.splice(ii, 1); if (dir < 0) p.bloecke[nb].items.push(it); else p.bloecke[nb].items.unshift(it); }
      }
      speichern(); renderPlan();
    }
  });
  einstVerbinden();
  trainingVerbinden();
}
function neuerPlan() {
  const p = { id: uid(), name: 'Neuer Plan', bloecke: [
    { id: uid(), name: 'Warm-up', items: [] },
    { id: uid(), name: 'Hauptteil A', items: [] },
    { id: uid(), name: 'Hauptteil B', items: [] },
  ] };
  S.plaene.push(p); aktPlanId = p.id; speichern();
  zeige('plan'); planNameSheet(true);
}

// Hinweis „Neue Version verfügbar“ (wie MemoFix)
function zeigeUpdateHinweis() {
  if (document.getElementById('update-hinweis')) return;
  const el = document.createElement('div');
  el.id = 'update-hinweis'; el.className = 'update-hinweis'; el.setAttribute('role', 'status');
  el.innerHTML = `<span>Neue Version verfügbar</span>
    <button type="button" data-u="neu">Neu laden</button>
    <button type="button" data-u="zu" aria-label="Später">✕</button>`;
  el.addEventListener('click', e => {
    const a = e.target.closest('[data-u]')?.dataset.u;
    if (a === 'neu') location.reload(); else if (a === 'zu') el.remove();
  });
  document.body.appendChild(el);
}

(async function start() {
  const gespeichert = await laden();
  if (gespeichert && gespeichert.version === 1) { S = zustandAus(gespeichert); aufraeumen(); }
  else { S = leer(); S.plaene.push(beispielplan()); }
  speichern();
  verbinden();
  zeige('start');
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    const hatteController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then(reg => {
      document.addEventListener('visibilitychange', () => { if (!document.hidden && !L) reg.update().catch(() => {}); });
    }).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hatteController) zeigeUpdateHinweis(); });
  }
})();
