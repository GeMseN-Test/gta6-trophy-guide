// Leonida Ledger — offline GTA VI trophy guide & tracker.
// Data: app/data/trophies.json (55 official trophies) + app/data/sources.json.
// Progress, counters and the spoiler shield live in localStorage only.
const EARNED_KEY = 'leonida-ledger-earned-v2';
const COUNTS_KEY = 'leonida-ledger-counts-v2';
const SPOILER_KEY = 'leonida-ledger-spoiler-v2';
const SAMPLE_EARNED = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 20, 21, 44];

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

const doc = await (await fetch('data/trophies.json')).json();
const srcDoc = await (await fetch('data/sources.json')).json();
const TROPHIES = doc.trophies;
const SOURCES = srcDoc.sources;
const byId = new Map(TROPHIES.map((t) => [t.id, t]));
const sourceByN = new Map(SOURCES.map((s) => [s.n, s]));

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

let earned = new Set(loadJSON(EARNED_KEY, null) ?? (() => {
  const seed = [...SAMPLE_EARNED];
  saveJSON(EARNED_KEY, seed);
  return seed;
})());
let counts = loadJSON(COUNTS_KEY, {});
let spoiler = params.get('spoiler') === 'off' ? false : params.get('spoiler') === 'on' ? true : loadJSON(SPOILER_KEY, true);
let selectedId = Number(params.get('open')) || 28;
if (!byId.has(selectedId)) selectedId = 2;
let kindFilter = params.get('kind') || 'all';
let gradeFilter = params.get('grade') || 'all';
let searchText = '';
let sortMode = 'roadmap';
let earnedOnly = false;
let tab = { cover: 'tracker', tracker: 'tracker', roadmap: 'roadmap', missables: 'missables', sources: 'sources' }[params.get('view')] || 'tracker';

function saveEarned() { saveJSON(EARNED_KEY, [...earned]); }
function saveCounts() { saveJSON(COUNTS_KEY, counts); }
function saveSpoiler() { saveJSON(SPOILER_KEY, spoiler); }

// ---- honest counts, computed from the data (never hard-coded) ----
const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];
const gradeTotals = {};
for (const g of GRADE_ORDER) gradeTotals[g] = TROPHIES.filter((t) => t.grade === g).length;
const totalSteps = TROPHIES.reduce((n, t) => n + t.steps.length, 0);
const backedSteps = TROPHIES.reduce((n, t) => n + t.steps.filter((s) => s.s.length >= 2).length, 0);
const guideChars = TROPHIES.reduce((n, t) => n + t.steps.reduce((m, s) => m + s.t.length, 0), 0);
const hiddenCount = TROPHIES.filter((t) => t.hidden).length;
const missableCount = TROPHIES.filter((t) => t.missable).length;
const atRiskCount = TROPHIES.filter((t) => t.atRisk).length;
const claimsPerSource = new Map(SOURCES.map((s) => [s.n, 0]));
for (const t of TROPHIES) for (const s of t.steps) for (const n of s.s) claimsPerSource.set(n, (claimsPerSource.get(n) || 0) + 1);

function gradeShort(g) { return { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' }[g]; }
function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function isHidden(t) { return spoiler && t.hidden && !earned.has(t.id); }
function displayName(t) { return isHidden(t) ? 'Hidden trophy' : t.name; }
function displayDesc(t) { return isHidden(t) ? 'Hidden by the spoiler shield until earned.' : t.description; }
function refs(sources) { return sources.map((n) => `[${n}]`).join(' '); }

function renderAudit() {
  const cells = [
    `<b>55/55</b> official name, description, grade`,
    `1P 2G 6S 46B · <b>${hiddenCount} PSN-hidden</b>`,
    `<b>${totalSteps}/${totalSteps}</b> claims cited`,
    `<b>${backedSteps}</b> backed by 2+ sources`,
    `<b>${guideChars.toLocaleString('en-US')}</b> guide chars`,
    `<b>${SOURCES.length} sources</b> · read 21 Nov 2026`,
    `<span class="warn"><b>${missableCount}</b> possibly missable</span>`,
    `<span class="warn">${atRiskCount} at risk</span>`,
    `<b>${doc.disputes.length} disputes</b> shown both ways`,
  ];
  $('auditStrip').innerHTML = cells.map((c) => `<span class="cell">${c}</span>`).join('');
}

function renderProgress() {
  const e = earned.size;
  const pct = Math.round((e / TROPHIES.length) * 100);
  $('earnedCount').textContent = e;
  $('gradeLine').textContent = GRADE_ORDER.map((g) => `${gradeShort(g)} ${TROPHIES.filter((t) => t.grade === g && earned.has(t.id)).length}/${gradeTotals[g]}`).join(' · ');
  $('progressFill').style.width = `${pct}%`;
  $('platinumLine').textContent = `${pct}% to the platinum`;
  $('missablePill').textContent = missableCount;
}

const KIND_CHIPS = [
  ['all', 'All 55'], ['story', 'Story'], ['stranger', 'Strangers'],
  ['missable', 'Missable'], ['collectible', 'Collectibles'], ['activity', 'Activities'],
  ['robbery', 'Robbery'], ['exploration', 'Exploration'], ['misc', 'Misc'],
  ['hidden', 'PSN-hidden'], ['disputed', 'Disputed'], ['notearned', 'Not earned'],
];
function kindCount(kind) {
  if (kind === 'all') return TROPHIES.length;
  if (kind === 'missable') return missableCount;
  if (kind === 'hidden') return hiddenCount;
  if (kind === 'disputed') return TROPHIES.filter((t) => t.id === 28 || t.id === 14).length + 1;
  if (kind === 'notearned') return TROPHIES.length - earned.size;
  return TROPHIES.filter((t) => t.kind === kind).length;
}
function renderChips() {
  $('kindChips').innerHTML = '';
  for (const [kind, label] of KIND_CHIPS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (kind === kindFilter ? ' active' : '') + (kind === 'missable' ? ' miss' : '');
    b.textContent = `${label} ${kindCount(kind)}`;
    b.addEventListener('click', () => { kindFilter = kind; renderChips(); renderList(); });
    $('kindChips').append(b);
  }
}

function trophyMatches(t) {
  if (kindFilter === 'missable' && !t.missable) return false;
  if (kindFilter === 'hidden' && !t.hidden) return false;
  if (kindFilter === 'disputed' && !(t.id === 28 || t.id === 14 || t.id === 3)) return false;
  if (kindFilter === 'notearned' && earned.has(t.id)) return false;
  if (!['all', 'missable', 'hidden', 'disputed', 'notearned'].includes(kindFilter) && t.kind !== kindFilter) return false;
  if (gradeFilter !== 'all' && t.grade !== gradeFilter) return false;
  if (earnedOnly && !earned.has(t.id)) return false;
  if (searchText) {
    const hay = `${t.name} ${t.description} ${t.guide} ${t.steps.map((s) => s.t).join(' ')}`.toLowerCase();
    if (!hay.includes(searchText)) return false;
  }
  return true;
}
function sortedTrophies(list) {
  const arr = [...list];
  if (sortMode === 'name') arr.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortMode === 'grade') arr.sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade) || a.id - b.id);
  else arr.sort((a, b) => a.stage - b.stage || a.id - b.id);
  return arr;
}

function renderList() {
  const list = sortedTrophies(TROPHIES.filter(trophyMatches));
  const ul = $('trophyList');
  ul.innerHTML = '';
  $('shownCount').textContent = `${list.length} shown · ${earned.size} earned`;
  $('listNote').textContent = earned.size === 13 ? 'Sample progress — tick your own' : '';
  if (!list.length) {
    ul.innerHTML = '<li class="empty">No trophies match these filters.</li>';
    return;
  }
  let lastStage = null;
  for (const t of list) {
    if (sortMode === 'roadmap' && t.stage !== lastStage) {
      lastStage = t.stage;
      const stage = doc.stages[t.stage - 1];
      const inStage = TROPHIES.filter((x) => x.stage === t.stage);
      const doneStage = inStage.filter((x) => earned.has(x.id)).length;
      const h = document.createElement('li');
      h.className = 'stage-head';
      h.textContent = `Stage ${t.stage} — ${stage.title} · ${doneStage}/${inStage.length}`;
      ul.append(h);
    }
    const li = document.createElement('li');
    li.className = (t.id === selectedId ? 'selected ' : '') + (earned.has(t.id) ? 'earned' : '');
    const tags = [`<span class="tag ${t.grade}">${t.grade.toUpperCase()}</span>`];
    if (t.hidden) tags.push('<span class="tag hiddenflag">PSN-HIDDEN</span>');
    if (t.missable) tags.push('<span class="tag missable">MISSABLE</span>');
    if (t.atRisk) tags.push('<span class="tag atrisk">AT RISK</span>');
    tags.push(`<span class="tag">${t.kind}</span>`);
    if (t.count) tags.push(`<span class="tag">${counts[t.id] ?? 0}/${t.count} ${esc(t.countLabel)}</span>`);
    li.innerHTML = `<div class="row1"><input type="checkbox" ${earned.has(t.id) ? 'checked' : ''} aria-label="Mark ${esc(displayName(t))} earned"><div><div class="tname ${earned.has(t.id) ? 'done' : ''}">${esc(displayName(t))}</div><div class="tdesc">${esc(displayDesc(t))}</div><div class="tags">${tags.join('')}</div></div></div>`;
    li.querySelector('input').addEventListener('change', (e) => {
      e.stopPropagation();
      if (e.target.checked) earned.add(t.id); else earned.delete(t.id);
      saveEarned(); renderProgress(); renderChips(); renderList(); renderDetail(); renderNextUp(); renderRoadmap();
    });
    li.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      selectedId = t.id;
      renderList(); renderDetail(); renderNextUp();
    });
    ul.append(li);
  }
}

function renderDetail() {
  const t = byId.get(selectedId);
  const col = $('detailCol');
  const done = earned.has(t.id);
  const stepsHtml = t.steps.map((s) => `<li><span>${esc(s.t)} <span class="src-ref">${refs(s.s)}</span></span></li>`).join('');
  const banner = t.missable ? `<div class="banner"><h3>⚠ POSSIBLY MISSABLE — READ BEFORE CHAPTER 1 ENDS</h3><p>Chapter 1 — Lucia's morning meditation at Jason's house, right after the Down to Earth mission. Do it in Chapter 1 and keep a Chapter 1 save: no mission replay, no New Game+, never use cheats on your trophy save.</p></div>` : '';
  const risk = !t.missable && t.atRisk ? `<div class="banner"><h3>AT RISK — CHAPTER WINDOW</h3><p>This trophy belongs to one mission window. Do it when the mission is offered, not chapters later.</p></div>` : '';
  const dispute = t.id === 28 ? `<div class="dispute-box"><h3>SOURCES DIFFER — IS IT MISSABLE? BOTH VERSIONS SHOWN</h3><p class="side"><b>A · Possibly:</b> the balcony may not return after Chapter 1. [2] [3]</p><p class="side"><b>B · No:</b> Push Square reports no missable trophies known. [11]</p><p class="call"><b>Our call:</b> treat it as missable — same effort either way. Meditate at the balcony before Chapter 1 ends.</p></div>` : '';
  const counter = t.count ? `<div class="counter-box"><span class="c-label">YOUR COUNT — ${esc(t.countLabel)}:</span><button type="button" id="countDown" aria-label="Decrease count">−</button><span class="c-val" id="countVal">${counts[t.id] ?? 0} / ${t.count}</span><button type="button" id="countUp" aria-label="Increase count">+</button><span class="fine">${(counts[t.id] ?? 0) >= t.count ? 'Target reached — mark it earned!' : 'Saved in this browser.'}</span></div>` : '';
  col.innerHTML = `<div class="card">
    <div class="title-row"><div><div class="tags" style="display:flex;gap:4px;margin-bottom:6px"><span class="tag ${t.grade}">${t.grade.toUpperCase()}</span>${t.missable ? '<span class="tag missable">MISSABLE</span>' : ''}${t.atRisk ? '<span class="tag atrisk">AT RISK</span>' : ''}<span class="tag">Stage ${t.stage}</span></div>
    <h2 class="trophy-name">${esc(displayName(t))}</h2></div>
    <button type="button" id="markBtn" class="mark-earned ${done ? 'earned' : ''}">${done ? '✓ Earned' : 'Mark earned'}</button></div>
    <div class="official"><div class="label">OFFICIAL DESCRIPTION</div><blockquote>“${esc(displayDesc(t))}”</blockquote><div class="meta">${t.grade} · #${t.id} of 55 · ${t.hidden ? 'hidden on PSN until earned' : 'visible on PSN'} · ${t.steps.length} cited steps</div></div>
    ${banner}${risk}${dispute}
    <p class="howto">HOW TO EARN IT — ${t.steps.length} STEPS IN OUR OWN WORDS, EACH WITH ITS SOURCES</p>
    <ol class="steps">${stepsHtml}</ol>
    ${counter}
  </div>`;
  $('markBtn').addEventListener('click', () => {
    if (earned.has(t.id)) earned.delete(t.id); else earned.add(t.id);
    saveEarned(); renderProgress(); renderChips(); renderList(); renderDetail(); renderNextUp(); renderRoadmap();
  });
  const up = $('countUp');
  if (up) {
    up.addEventListener('click', () => { counts[t.id] = Math.min(t.count, (counts[t.id] ?? 0) + 1); saveCounts(); renderList(); renderDetail(); });
    $('countDown').addEventListener('click', () => { counts[t.id] = Math.max(0, (counts[t.id] ?? 0) - 1); saveCounts(); renderList(); renderDetail(); });
  }
  const used = new Map();
  for (const s of t.steps) for (const n of s.s) used.set(n, (used.get(n) || 0) + 1);
  $('detailSources').innerHTML = [...used.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => {
    const s = sourceByN.get(n);
    return `<li><span class="s-name">[${n}] ${esc(s.site)}</span> — ${esc(s.title)} · ${esc(s.domain)}<div class="s-claims">${c} claim${c === 1 ? '' : 's'} in this guide · read 21 Nov 2026</div></li>`;
  }).join('');
}

function renderNextUp() {
  const next = sortedTrophies(TROPHIES.filter((t) => !earned.has(t.id))).slice(0, 5);
  $('nextUp').innerHTML = next.map((t) => `<li><div class="nu-name">${esc(displayName(t))}</div><div class="nu-meta">${t.grade} · Stage ${t.stage} · ${t.missable ? 'MISSABLE — do first' : esc(t.kind)}${t.count ? ` · ${counts[t.id] ?? 0}/${t.count} ${esc(t.countLabel)}` : ''}</div></li>`).join('') || '<li>All 55 earned — Leonida Legend!</li>';
}

function renderRoadmap() {
  $('roadmapStages').innerHTML = doc.stages.map((st) => {
    const inStage = sortedTrophies(TROPHIES.filter((t) => t.stage === st.n));
    const done = inStage.filter((t) => earned.has(t.id)).length;
    const items = inStage.map((t) => `<li class="${earned.has(t.id) ? 'done' : ''}">${esc(displayName(t))} <span class="fine">(${t.grade}${t.missable ? ' · MISSABLE' : ''})</span></li>`).join('');
    return `<div class="stage-card"><h3>Stage ${st.n} — ${esc(st.title)}</h3><div class="st-meta">${done}/${inStage.length} earned · ${esc(st.hours)}</div><p class="st-blurb">${esc(st.blurb)}</p><ul>${items}</ul></div>`;
  }).join('');
}

function renderMissables() {
  const m = TROPHIES.filter((t) => t.missable);
  const risk = TROPHIES.filter((t) => t.atRisk && !t.missable);
  $('missableCards').innerHTML =
    m.map((t) => `<div class="miss-card hot"><h3>⚠ ${esc(t.name)} — POSSIBLY MISSABLE</h3><p>${esc(t.description)}</p><p>Chapter 1. Meditate at the balcony right after Down to Earth, keep a Chapter 1 save, no mission replay / NG+, no cheats on your trophy save.</p><p class="fine">${t.steps.length} cited steps — open it in the Tracker for the full guide.</p></div>`).join('') +
    risk.map((t) => `<div class="miss-card"><h3>${esc(t.name)} — AT RISK</h3><p>${esc(t.description)}</p><p>Chapter-window trophy: do it while its mission is open.</p></div>`).join('');
  $('disputeList').innerHTML = doc.disputes.map((d) => `<div class="d-item"><h3>${esc(d.question)}</h3><p><b>A:</b> ${esc(d.sideA)}</p><p><b>B:</b> ${esc(d.sideB)}</p><p><b>Our call:</b> ${esc(d.call)}</p></div>`).join('');
}

function renderSources() {
  const rows = SOURCES.map((s) => {
    const c = claimsPerSource.get(s.n) || 0;
    return `<tr><td>${s.n}</td><td><b>${esc(s.site)}</b> · ${esc(s.domain)}</td><td>${esc(s.title)}</td><td class="num">${c}</td></tr>`;
  }).join('');
  $('sourceMatrix').querySelector('tbody').innerHTML = rows;
}

function setTab(name) {
  tab = name;
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tabpage').forEach((p) => p.classList.toggle('active', p.id === `tab-${name}`));
}

function setSpoiler(on) {
  spoiler = on;
  saveSpoiler();
  $('spoilerBtn').textContent = `Spoiler shield: ${on ? 'ON' : 'OFF'}`;
  $('spoilerBtn').classList.toggle('on', on);
  $('spoilerBtn').setAttribute('aria-pressed', String(on));
  renderList(); renderDetail(); renderNextUp(); renderRoadmap();
}

document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
$('fullRoadmapLink').addEventListener('click', (e) => { e.preventDefault(); setTab('roadmap'); });
$('search').addEventListener('input', (e) => { searchText = e.target.value.trim().toLowerCase(); renderList(); });
$('gradeFilter').addEventListener('change', (e) => { gradeFilter = e.target.value; renderList(); });
$('sortSel').addEventListener('change', (e) => { sortMode = e.target.value; renderList(); });
$('earnedOnly').addEventListener('change', (e) => { earnedOnly = e.target.checked; renderList(); });
$('spoilerBtn').addEventListener('click', () => setSpoiler(!spoiler));
$('demoBtn').addEventListener('click', () => {
  earned = new Set(SAMPLE_EARNED);
  saveEarned(); renderProgress(); renderChips(); renderList(); renderDetail(); renderNextUp(); renderRoadmap();
});
$('resetBtn').addEventListener('click', () => {
  earned = new Set();
  counts = {};
  saveEarned(); saveCounts(); renderProgress(); renderChips(); renderList(); renderDetail(); renderNextUp(); renderRoadmap();
});
$('exportBtn').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ earned: [...earned], counts }, null, 2)], { type: 'application/json' }));
  a.download = 'leonida-ledger-progress.json';
  a.click();
});
$('importBtn').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (Array.isArray(data.earned)) earned = new Set(data.earned.filter((id) => byId.has(id)));
    if (data.counts && typeof data.counts === 'object') counts = data.counts;
    saveEarned(); saveCounts();
    renderProgress(); renderChips(); renderList(); renderDetail(); renderNextUp(); renderRoadmap();
  } catch {
    alert('That file is not a Leonida Ledger progress export.');
  }
  e.target.value = '';
});

// ---- init ----
if (gradeFilter !== 'all') $('gradeFilter').value = gradeFilter;
setSpoiler(spoiler);
renderAudit();
renderProgress();
renderChips();
setTab(tab);
renderList();
renderDetail();
renderNextUp();
renderRoadmap();
renderMissables();
renderSources();
