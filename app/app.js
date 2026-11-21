// Leonida Ledger — GTA VI trophy guide & tracker (offline, no network at run time).
// Data: app/data/trophies.json (55 official trophies + guides) and app/data/sources.json
// (12 numbered sources). Progress lives in localStorage; export/import is plain JSON.

const trophiesDoc = await (await fetch('data/trophies.json')).json();
const sourcesDoc = await (await fetch('data/sources.json')).json();
const trophies = trophiesDoc.trophies;
const stages = trophiesDoc.stages ?? [];
const disputes = trophiesDoc.disputes ?? [];
const sources = Array.isArray(sourcesDoc) ? sourcesDoc : (sourcesDoc.sources ?? []);

// ---------- data helpers ----------
const byId = new Map(trophies.map((t) => [t.id, t]));
const gradeOf = (t) => (t.grade ?? '').toLowerCase();
const sourceName = (n) => sources.find((s) => (s.n ?? sources.indexOf(s) + 1) === n)?.name ?? `Source ${n}`;
const allSteps = () => trophies.flatMap((t) => (t.steps ?? []).map((s) => ({ ...s, trophy: t })));

// Kind values are the SINGULAR values stored in trophies.json ('stranger', not
// 'strangers'). Chip keys MUST equal those values exactly, or the filter matches
// nothing and the chip shows 0. Labels are plural display text only.
const KIND_CHIPS = [
  ['all', 'All'],
  ['story', 'Story'],
  ['stranger', 'Strangers'],
  ['missable', 'Missable'],
  ['collectible', 'Collectibles'],
  ['activity', 'Activities'],
  ['robbery', 'Robbery'],
  ['exploration', 'Exploration'],
  ['misc', 'Misc'],
  ['hidden', 'PSN-hidden'],
  ['disputed', 'Disputed'],
  ['notearned', 'Not earned'],
];
const KIND_LABELS = {
  story: 'Story', stranger: 'Stranger', collectible: 'Collectible',
  activity: 'Activity', robbery: 'Robbery', exploration: 'Exploration', misc: 'Misc',
};
const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

// Which trophies a dispute is about: an explicit trophy id wins; otherwise match
// the dispute's title by keyword (meditation -> id 28, "100%" -> id 14).
const disputedIds = new Set();
for (const d of disputes) {
  const explicit = d.trophyId ?? d.trophy ?? d.id;
  if (typeof explicit === 'number' && byId.has(explicit)) { disputedIds.add(explicit); continue; }
  const hay = `${d.title ?? ''} ${d.name ?? ''} ${d.a ?? ''} ${d.b ?? ''}`.toLowerCase();
  if (hay.includes('meditation') || hay.includes('mental attitude')) disputedIds.add(28);
  if (hay.includes('100%')) disputedIds.add(14);
}

// ---------- audit counts (same math as main.ts computeAuditCounts) ----------
function auditCounts() {
  const steps = allSteps();
  const guideChars = steps.reduce((n, s) => n + (s.t ?? '').length, 0)
    + trophies.reduce((n, t) => n + (t.guide ?? '').length, 0);
  return {
    total: trophies.length,
    platinum: trophies.filter((t) => gradeOf(t) === 'platinum').length,
    gold: trophies.filter((t) => gradeOf(t) === 'gold').length,
    silver: trophies.filter((t) => gradeOf(t) === 'silver').length,
    bronze: trophies.filter((t) => gradeOf(t) === 'bronze').length,
    hidden: trophies.filter((t) => t.hidden).length,
    missable: trophies.filter((t) => t.missable).length,
    atRisk: trophies.filter((t) => t.atRisk).length,
    steps: steps.length,
    cited: steps.filter((s) => (s.s ?? []).length >= 1).length,
    backed2: steps.filter((s) => (s.s ?? []).length >= 2).length,
    guideChars,
    sources: sources.length,
    disputes: disputes.length,
    stages: stages.length || new Set(trophies.map((t) => t.stage)).size,
  };
}

// ---------- state ----------
const SAMPLE_EARNED = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 20, 21, 44];
const LS_EARNED = 'leonida-ledger-earned-v2';
const LS_COUNTS = 'leonida-ledger-counts-v2';
const LS_SPOILER = 'leonida-ledger-spoiler-v2';
const params = new URLSearchParams(location.search);

function loadJson(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key) ?? 'null'); return v ?? fallback; }
  catch { return fallback; }
}
let earned = new Set(loadJson(LS_EARNED, null) ?? (() => { const s = SAMPLE_EARNED; return s; })());
if (localStorage.getItem(LS_EARNED) === null) {
  localStorage.setItem(LS_EARNED, JSON.stringify(SAMPLE_EARNED));
}
let counts = loadJson(LS_COUNTS, {});
let spoilerOn = params.get('spoiler') === 'off' ? false
  : params.get('spoiler') === 'on' ? true
  : (localStorage.getItem(LS_SPOILER) ?? 'on') === 'on';
const state = {
  view: params.get('view') ?? 'tracker',
  kind: params.get('kind') ?? 'all',
  grade: params.get('grade') ?? 'all',
  sort: 'roadmap',
  query: '',
  earnedOnly: false,
  openId: Number(params.get('open')) || SAMPLE_EARNED[0],
};
if (!byId.has(state.openId)) state.openId = trophies[0].id;
if (!KIND_CHIPS.some(([k]) => k === state.kind)) state.kind = 'all';

function save() {
  localStorage.setItem(LS_EARNED, JSON.stringify([...earned].sort((a, b) => a - b)));
  localStorage.setItem(LS_COUNTS, JSON.stringify(counts));
  localStorage.setItem(LS_SPOILER, spoilerOn ? 'on' : 'off');
  document.querySelector('#saved-note').textContent = '\u2713 Saved in this browser';
}

// ---------- small DOM helpers ----------
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = () => Math.round((earned.size / trophies.length) * 100);
const isShielded = (t) => spoilerOn && t.hidden && !earned.has(t.id);

// ---------- render: header, audit, tabs ----------
function renderProgress() {
  const a = auditCounts();
  $('#earned-count').textContent = earned.size;
  $('#pct-line').textContent = `${pct()}% to the platinum`;
  $('#bar-fill').style.width = `${pct()}%`;
  const byGrade = (g) => trophies.filter((t) => gradeOf(t) === g && earned.has(t.id)).length;
  $('#grade-line').textContent =
    `P ${byGrade('platinum')}/${a.platinum} \u00b7 G ${byGrade('gold')}/${a.gold} \u00b7 S ${byGrade('silver')}/${a.silver} \u00b7 B ${byGrade('bronze')}/${a.bronze}`;
  $('#spoiler-toggle').checked = spoilerOn;
}

function renderAudit() {
  const a = auditCounts();
  $('#audit-strip').innerHTML =
    `<b>${a.total}/${a.total}</b> official name, description, grade &nbsp;` +
    `<b>${a.platinum}P ${a.gold}G ${a.silver}S ${a.bronze}B</b> &nbsp;` +
    `<b>${a.hidden}</b> PSN-hidden &nbsp;` +
    `<b>${a.cited}/${a.steps}</b> claims cited &nbsp;` +
    `<b>${a.backed2}</b> backed by 2+ sources &nbsp;` +
    `<b>${a.steps}</b> cited steps &nbsp;` +
    `<b>${a.guideChars.toLocaleString('en-US')}</b> guide chars &nbsp;` +
    `<b>${a.sources}</b> sources &nbsp;` +
    `<span class="warn">${a.missable} possibly missable</span> &nbsp;` +
    `<b>${a.atRisk}</b> at risk &nbsp;` +
    `<b>${a.disputes}</b> disputes shown both ways`;
  $('#missable-badge').textContent = a.missable;
}

function renderTabs() {
  document.querySelectorAll('.tabs button').forEach((b) => {
    const active = b.dataset.view === state.view;
    b.classList.toggle('active', active);
    document.querySelector(`#view-${b.dataset.view}`).hidden = !active;
  });
}

// ---------- render: chips + list ----------
function kindChipCounts() {
  const perKind = {};
  for (const t of trophies) perKind[t.kind] = (perKind[t.kind] ?? 0) + 1;
  return KIND_CHIPS.map(([key, label]) => {
    let n = 0;
    if (key === 'all') n = trophies.length;
    else if (key === 'missable') n = trophies.filter((t) => t.missable).length;
    else if (key === 'hidden') n = trophies.filter((t) => t.hidden).length;
    else if (key === 'disputed') n = disputes.length;
    else if (key === 'notearned') n = trophies.length - earned.size;
    else n = perKind[key] ?? 0;
    return [key, label, n];
  });
}

function renderChips() {
  $('#kind-chips').innerHTML = kindChipCounts().map(([key, label, n]) =>
    `<button type="button" class="chip${state.kind === key ? ' active' : ''}" data-kind="${key}">${esc(label)} <span class="n">${n}</span></button>`).join('');
}

function filteredTrophies() {
  let out = trophies.filter((t) => {
    if (state.kind === 'missable') return !!t.missable;
    if (state.kind === 'hidden') return !!t.hidden;
    if (state.kind === 'disputed') return disputedIds.has(t.id);
    if (state.kind === 'notearned') return !earned.has(t.id);
    if (state.kind === 'all') return true;
    return t.kind === state.kind;
  });
  if (state.grade !== 'all') out = out.filter((t) => gradeOf(t) === state.grade);
  if (state.earnedOnly) out = out.filter((t) => earned.has(t.id));
  if (state.query) {
    const q = state.query.toLowerCase();
    out = out.filter((t) => `${t.name} ${t.description ?? ''} ${t.guide ?? ''}`.toLowerCase().includes(q));
  }
  if (state.sort === 'id') out = [...out].sort((a, b) => a.id - b.id);
  else if (state.sort === 'name') out = [...out].sort((a, b) => a.name.localeCompare(b.name));
  else if (state.sort === 'grade') out = [...out].sort((a, b) => (GRADE_ORDER[gradeOf(a)] - GRADE_ORDER[gradeOf(b)]) || (a.id - b.id));
  else out = [...out].sort((a, b) => ((a.stage ?? 99) - (b.stage ?? 99)) || (a.id - b.id));
  return out;
}

function renderList() {
  const rows = filteredTrophies();
  $('#trophy-list').innerHTML = rows.map((t) => {
    const got = earned.has(t.id);
    const shielded = isShielded(t);
    const name = shielded ? 'Hidden trophy' : esc(t.name);
    const counter = t.count ? `<span>${esc(t.countLabel ?? '')} ${counts[t.id] ?? 0}/${t.count}</span>` : '';
    return `<button type="button" role="listitem" class="t-row${got ? ' earned' : ''}${t.id === state.openId ? ' sel' : ''}" data-id="${t.id}">
      <span class="t-check">${got ? '\u2713' : ''}</span><span class="t-name${shielded ? ' hidden-name' : ''}">${name}</span>
      <span class="t-meta"><span class="badge ${gradeOf(t)}">${esc(t.grade)}</span><span>${t.hidden ? 'PSN-HIDDEN' : 'Visible'}</span><span>${esc(KIND_LABELS[t.kind] ?? t.kind)}</span><span>Stage ${t.stage ?? '?'}</span>${t.missable ? '<span class="badge missable">Missable</span>' : ''}${t.atRisk ? '<span class="badge atrisk">At risk</span>' : ''}${counter}<span>${(t.steps ?? []).length} src</span></span>
    </button>`;
  }).join('') || '<p class="lede">Nothing matches this filter.</p>';
  $('#shown-count').textContent = `${rows.length} shown \u00b7 ${earned.size} earned`;
  document.querySelectorAll('#trophy-list .t-row').forEach((row) => {
    row.addEventListener('click', () => { state.openId = Number(row.dataset.id); renderAll(); });
  });
}

// ---------- render: detail ----------
function renderDetail() {
  const t = byId.get(state.openId) ?? trophies[0];
  const got = earned.has(t.id);
  const shielded = isShielded(t);
  const steps = (t.steps ?? []).map((s) =>
    `<li>${esc(s.t)} <span class="refs">${(s.s ?? []).map((n) => `[${n}]`).join(' ')}</span></li>`).join('');
  const counterBox = t.count ? `<div class="counter-box">
    <strong>${esc(t.countLabel ?? 'Count')}:</strong>
    <button type="button" id="count-minus" aria-label="Decrease count">&minus;</button>
    <span id="count-value">${counts[t.id] ?? 0} / ${t.count}</span>
    <button type="button" id="count-plus" aria-label="Increase count">+</button>
    <span class="d-sub">Saved in this browser.</span></div>` : '';
  const missableBox = t.missable ? `<div class="missable-box">
    <h3>\u26a0 Possibly missable &mdash; do this in Chapter 1</h3>
    <p><strong>Missable window:</strong> the Chapter 1 balcony meditation ends with Chapter 1; whether the trophy needs it is unconfirmed <span class="refs">[2] [11]</span>. Do it in Chapter 1 and keep a Chapter 1 save. There is no mission replay and no New Game+ for this, and never use cheats on your trophy save.</p>
    <p>Meditation spots (7): Smooth Sand west Capri sandbar, Buckskin Swamp dock, Emerald River, Manifest Canyon red rocks, Moreau ruined mill wheel, Jutting Cliff tower, Ascent Mountain peak at Mount Kalaga.</p>
  </div>` : '';
  const disputeBox = disputedIds.has(t.id) ? `<div class="dispute-box">
    <h3>Sources differ &mdash; both versions shown</h3>
    <p>See the Missables tab for the full dispute. Short version: the guides disagree on whether this one can be missed or how it is counted; we show both sides and say which we follow.</p>
  </div>` : '';
  const body = shielded
    ? `<p class="lede">Hidden on PlayStation until earned &mdash; and hidden here too, while the spoiler shield is on. Earn it (or switch the shield off) to see its name, description and guide.</p>`
    : `<p class="d-sub">${esc(t.grade)} <span class="sep">&middot;</span> #${t.id} of 55 <span class="sep">&middot;</span> ${t.hidden ? 'Hidden on PSN until earned' : 'Visible on PSN'} <span class="sep">&middot;</span> ${esc(KIND_LABELS[t.kind] ?? t.kind)} <span class="sep">&middot;</span> Stage ${t.stage ?? '?'}</p>
    <blockquote><p>&ldquo;${esc(t.description)}&rdquo;</p><footer>Official description, as PlayStation publishes it. [1]</footer></blockquote>
    <h3>Guide &mdash; in our own words</h3>
    <p>${esc(t.guide ?? '')}</p>
    <ol class="steps">${steps}</ol>`;
  $('#trophy-detail').innerHTML = `
    <h2>${shielded ? 'Hidden trophy' : esc(t.name)}</h2>
    ${body}
    ${missableBox}${disputeBox}${counterBox}
    <button type="button" class="mark-btn" id="mark-btn">${got ? '\u2713 Earned \u2014 mark not earned' : 'Mark earned'}</button>`;
  $('#mark-btn').addEventListener('click', () => {
    if (earned.has(t.id)) earned.delete(t.id); else earned.add(t.id);
    save(); renderAll();
  });
  const minus = $('#count-minus');
  const plus = $('#count-plus');
  if (minus) minus.addEventListener('click', () => {
    counts[t.id] = Math.max(0, (counts[t.id] ?? 0) - 1); save(); renderAll();
  });
  if (plus) plus.addEventListener('click', () => {
    counts[t.id] = Math.min(t.count, (counts[t.id] ?? 0) + 1); save(); renderAll();
  });
}

// ---------- render: next up + rail ----------
function renderNextUp() {
  const order = [...trophies].sort((a, b) => ((a.stage ?? 99) - (b.stage ?? 99)) || (a.id - b.id));
  const next = order.filter((t) => !earned.has(t.id)).slice(0, 5);
  $('#next-up').innerHTML = next.map((t) => {
    const name = isShielded(t) ? 'Hidden trophy' : esc(t.name);
    const sub = `${t.missable ? 'missable \u00b7 do first \u00b7 ' : ''}stage ${t.stage ?? '?'}${t.count ? ` \u00b7 ${counts[t.id] ?? 0}/${t.count} ${esc(t.countLabel ?? '')}` : ''}`;
    return `<li><a href="#" data-open="${t.id}">${name}</a><span class="sub">${sub}</span></li>`;
  }).join('');
  document.querySelectorAll('#next-up a').forEach((a) => {
    a.addEventListener('click', (e) => { e.preventDefault(); state.openId = Number(a.dataset.open); state.view = 'tracker'; renderAll(); });
  });
}

function renderRailSources() {
  $('#rail-sources').innerHTML = sources.map((s, i) => {
    const n = s.n ?? i + 1;
    return `<li>[${n}] ${esc(s.name)}${s.url ? ` <a href="${esc(s.url)}" rel="noopener" target="_blank">visit</a>` : ''}</li>`;
  }).join('');
}

// ---------- render: roadmap / missables / sources ----------
function renderRoadmap() {
  const stageDefs = stages.length ? stages : [...new Set(trophies.map((t) => t.stage))].sort((a, b) => a - b).map((n) => ({ n, title: `Stage ${n}`, hours: '', text: '' }));
  $('#stage-cards').innerHTML = stageDefs.map((st) => {
    const n = st.n ?? st.number;
    const members = trophies.filter((t) => t.stage === n).sort((a, b) => a.id - b.id);
    const done = members.filter((t) => earned.has(t.id)).length;
    const rows = members.map((t) => {
      const got = earned.has(t.id);
      const name = isShielded(t) ? 'Hidden trophy' : esc(t.name);
      return `<li class="${got ? 'earned' : ''}">${name} <span class="d-sub">${esc(t.grade)[0].toUpperCase()}</span>${t.missable ? ' <span class="badge missable">Missable</span>' : ''}</li>`;
    }).join('');
    return `<article class="stage-card"><h3>Stage ${n} &mdash; ${esc(st.title ?? '')}</h3>
      <p><span class="done">${done}/${members.length} earned</span>${st.hours ? ` &middot; about ${esc(st.hours)}` : ''}</p>
      <p class="d-sub">${esc(st.text ?? '')}</p><ul>${rows}</ul></article>`;
  }).join('');
}

function renderMissables() {
  $('#dispute-list').innerHTML = disputes.map((d) => {
    const title = d.title ?? d.name ?? 'Dispute';
    const a = d.a ?? d.sideA ?? d.claimA ?? '';
    const b = d.b ?? d.sideB ?? d.claimB ?? '';
    const call = d.call ?? d.verdict ?? d.ourCall ?? '';
    return `<div class="dispute-box"><h3>${esc(title)}</h3>
      <p><strong>One guide says:</strong> ${esc(a)}</p>
      <p><strong>Another says:</strong> ${esc(b)}</p>
      <p><strong>Our call:</strong> ${esc(call)}</p></div>`;
  }).join('') || '<p class="lede">No disputes recorded.</p>';
}

function renderSources() {
  $('#source-list').innerHTML = sources.map((s, i) => {
    const n = s.n ?? i + 1;
    return `<li><strong>[${n}] ${esc(s.name)}</strong>${s.url ? ` &mdash; <a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.url)}</a>` : ''}${s.note ? `<br><span class="src-note">${esc(s.note)}</span>` : ''}</li>`;
  }).join('');
  const rows = sources.map((s, i) => {
    const n = s.n ?? i + 1;
    const stepHits = allSteps().filter((st) => (st.s ?? []).includes(n)).length;
    const guideHits = trophies.filter((t) => (t.steps ?? []).some((st) => (st.s ?? []).includes(n))).length;
    return `<tr><td>[${n}] ${esc(s.name)}</td><td>${stepHits}</td><td>${guideHits}</td></tr>`;
  }).join('');
  document.querySelector('#source-matrix tbody').innerHTML = rows;
}

// ---------- render all + events ----------
function renderAll() {
  renderProgress(); renderAudit(); renderTabs();
  renderChips(); renderList(); renderDetail(); renderNextUp(); renderRailSources();
  renderRoadmap(); renderMissables(); renderSources();
}

document.querySelectorAll('.tabs button').forEach((b) => {
  b.addEventListener('click', () => { state.view = b.dataset.view; renderAll(); });
});
$('#kind-chips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (chip) { state.kind = chip.dataset.kind; renderAll(); }
});
$('#search').addEventListener('input', (e) => { state.query = e.target.value; renderList(); });
$('#grade-filter').addEventListener('change', (e) => { state.grade = e.target.value; renderAll(); });
$('#sort').addEventListener('change', (e) => { state.sort = e.target.value; renderAll(); });
$('#earned-only').addEventListener('change', (e) => { state.earnedOnly = e.target.checked; renderAll(); });
$('#spoiler-toggle').addEventListener('change', (e) => { spoilerOn = e.target.checked; save(); renderAll(); });
$('#demo-btn').addEventListener('click', () => { earned = new Set(SAMPLE_EARNED); save(); renderAll(); });
$('#reset-btn').addEventListener('click', () => { earned = new Set(); counts = {}; save(); renderAll(); });
$('#export-btn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ earned: [...earned].sort((a, b) => a - b), counts }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leonida-ledger-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('#import-btn').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (Array.isArray(data.earned)) earned = new Set(data.earned.filter((id) => byId.has(id)));
    if (data.counts && typeof data.counts === 'object') counts = data.counts;
    save(); renderAll();
  } catch { alert('That file is not a Leonida Ledger export.'); }
  e.target.value = '';
});
$('#full-roadmap-link').addEventListener('click', (e) => { e.preventDefault(); state.view = 'roadmap'; renderAll(); });
$('#all-sources-link').addEventListener('click', (e) => { e.preventDefault(); state.view = 'sources'; renderAll(); });

renderAll();
