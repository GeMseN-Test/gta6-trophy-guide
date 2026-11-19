// GTA VI Trophy Guide — tracker + guide, offline static app.
// One state, one progress count: every number on the page (big card, grade
// breakdown, stage breakdown, roadmap) is computed by computeProgress()
// from the same earned set, so they can never disagree.

const DATA_URL = 'data/trophies.json';
const STORAGE_KEY = 'gta6-trophy-guide-v1';
const SAMPLE_KEY = 'gta6-trophy-guide-sample-applied-v1';

const GRADES = ['platinum', 'gold', 'silver', 'bronze'];
const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const CATEGORY_LABEL = {
  story: 'Story', missable: 'Missable', collectible: 'Collectibles', collectibles: 'Collectibles',
  combat: 'Combat', driving: 'Driving', exploration: 'Exploration', money: 'Money',
  misc: 'Activities', activities: 'Activities', online: 'Online',
};
// The Kind filter follows the brief (story / missable / collectibles /
// activities / online); the data's own categories map onto it: combat,
// driving, exploration, money and misc are all "activities" in the guide.
const ACTIVITY_CATEGORIES = ['combat', 'driving', 'exploration', 'money', 'misc'];

let DATA = null;
let earned = new Set();
let spoilerOn = false;
let openGuideId = null;
let filters = { grade: 'all', category: 'all', query: '' };

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

// ---------- state: load / save ----------
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.earned)) earned = new Set(parsed.earned.filter(Number.isInteger));
      spoilerOn = parsed.spoiler === true;
      return true;
    }
  } catch { /* corrupted state: start fresh */ }
  return false;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ earned: [...earned].sort((a, b) => a - b), spoiler: spoilerOn }));
  } catch { /* storage full or blocked: checklist still works for the session */ }
}

function applySampleProgress() {
  if (!DATA || !Array.isArray(DATA.sampleProgress)) return;
  if (localStorage.getItem(SAMPLE_KEY)) return;
  for (const id of DATA.sampleProgress) earned.add(id);
  localStorage.setItem(SAMPLE_KEY, '1');
  saveState();
}

// ---------- progress: the single source of truth ----------
function computeProgress() {
  const total = DATA.trophies.length;
  const byGrade = {};
  const byStage = {};
  for (const g of GRADES) byGrade[g] = { earned: 0, total: 0 };
  for (const t of DATA.trophies) {
    if (byGrade[t.grade]) byGrade[t.grade].total += 1;
    const s = String(t.stage ?? '—');
    if (!byStage[s]) byStage[s] = { earned: 0, total: 0 };
    byStage[s].total += 1;
    if (earned.has(t.id)) {
      if (byGrade[t.grade]) byGrade[t.grade].earned += 1;
      byStage[s].earned += 1;
    }
  }
  return { total, count: earned.size, pct: total ? Math.round((earned.size / total) * 100) : 0, byGrade, byStage };
}

function renderProgress() {
  const p = computeProgress();
  $('earned-count').textContent = String(p.count);
  $('earned-pct').textContent = p.pct + '%';
  $('progress-fill').style.width = p.pct + '%';
  $('progress-note').textContent = `${p.count} of ${p.total} trophies earned — ${p.pct}% to the platinum`;

  const gradeList = $('grade-counts');
  gradeList.replaceChildren();
  for (const g of GRADES) {
    const row = el('li');
    const dot = el('span', 'grade-dot dot-' + g);
    row.append(dot, document.createTextNode(`${GRADE_LABEL[g]} `));
    row.append(el('b', null, `${p.byGrade[g].earned}/${p.byGrade[g].total}`));
    gradeList.append(row);
  }

  const stageList = $('stage-counts');
  stageList.replaceChildren();
  const stages = Object.keys(p.byStage).sort((a, b) => Number(a) - Number(b));
  for (const s of stages) {
    const row = el('li', null, `Stage ${s} `);
    row.append(el('b', null, `${p.byStage[s].earned}/${p.byStage[s].total}`));
    stageList.append(row);
  }
  return p;
}

// ---------- roadmap ----------
function renderRoadmap() {
  const p = computeProgress();
  const list = $('stages');
  list.replaceChildren();
  const stages = Array.isArray(DATA.stages) ? DATA.stages : [];
  for (const st of stages) {
    const item = el('li');
    const key = String(st.n ?? st.stage);
    const got = p.byStage[key] || { earned: 0, total: 0 };
    const h = el('h3');
    h.append(el('span', 'stage-num', `Stage ${key} — `), document.createTextNode(st.name || st.title || ''));
    item.append(h);
    if (st.blurb || st.text) item.append(el('p', null, st.blurb || st.text));
    const meta = `${got.earned}/${got.total} trophies in this stage` + (st.estHours ? ` · ~${st.estHours} hours` : '');
    item.append(el('p', 'stage-count', meta));
    list.append(item);
  }
}

// ---------- spoiler masking ----------
function isHidden(t) {
  return spoilerOn && t.spoiler === true && !earned.has(t.id);
}

// ---------- trophy list ----------
function trophyMatches(t) {
  if (filters.grade !== 'all' && t.grade !== filters.grade) return false;
  if (filters.category === 'missable') {
    if (!t.missable) return false;
  } else if (filters.category === 'collectibles') {
    if (t.category !== 'collectible') return false;
  } else if (filters.category === 'activities') {
    if (!ACTIVITY_CATEGORIES.includes(t.category)) return false;
  } else if (filters.category !== 'all' && t.category !== filters.category) {
    return false;
  }
  if (filters.query) {
    const q = filters.query.toLowerCase();
    const hay = `${t.name} ${t.description || ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function renderList() {
  const list = $('trophy-list');
  list.replaceChildren();
  const shown = DATA.trophies.filter(trophyMatches);
  $('list-count').textContent = `Showing ${shown.length} of ${DATA.trophies.length} trophies`;
  $('empty-note').hidden = shown.length !== 0;

  for (const t of shown) {
    const hidden = isHidden(t);
    const item = el('li', 'trophy' + (earned.has(t.id) ? ' earned' : ''));
    item.id = 'trophy-' + t.id;

    const row = el('div', 'trophy-row');
    const check = el('input', 'trophy-check');
    check.type = 'checkbox';
    check.checked = earned.has(t.id);
    check.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
    check.addEventListener('change', () => {
      if (check.checked) earned.add(t.id); else earned.delete(t.id);
      saveState();
      renderProgress();
      renderRoadmap();
      renderList();
    });
    row.append(check);

    const main = el('div', 'trophy-main');
    const name = el('p', 'trophy-name' + (hidden ? ' hidden-name' : ''), hidden ? '??? — hidden story trophy' : t.name);
    main.append(name);
    main.append(el('p', 'trophy-desc', hidden ? 'Hidden until earned — spoiler-safe mode is on.' : (t.description || '')));

    const tags = el('div', 'trophy-tags');
    tags.append(el('span', 'tag grade-' + t.grade, GRADE_LABEL[t.grade] || t.grade));
    if (t.category) tags.append(el('span', 'tag', CATEGORY_LABEL[t.category] || t.category));
    if (t.stage !== undefined && t.stage !== null) tags.append(el('span', 'tag', 'Stage ' + t.stage));
    if (t.missable) tags.append(el('span', 'tag missable', 'MISSABLE'));
    if (t.spoiler) tags.append(el('span', 'tag spoiler-tag', 'Story spoiler'));
    main.append(tags);
    row.append(main);

    const btn = el('button', 'guide-btn', openGuideId === t.id ? 'Hide guide' : 'Guide');
    btn.type = 'button';
    btn.addEventListener('click', () => {
      openGuideId = openGuideId === t.id ? null : t.id;
      renderList();
    });
    row.append(btn);
    item.append(row);

    if (openGuideId === t.id) {
      const guide = el('div', 'guide');
      guide.append(el('h3', null, 'Guide — ' + (hidden ? '???' : t.name)));
      if (hidden) {
        guide.append(el('p', null, 'Earn this trophy first — its guide is hidden while spoiler-safe mode is on.'));
      } else {
        guide.append(el('p', null, t.guide || 'No guide written yet.'));
        const src = el('div', 'sources');
        src.append(el('strong', null, 'Sources: '));
        const sources = Array.isArray(t.sources) && t.sources.length ? t.sources : [{ name: 'Official trophy description (PlayStation)' }];
        const ul = el('ul');
        for (const s of sources) {
          const li = el('li');
          if (s.url) {
            const a = el('a', null, s.name || s.url);
            a.href = s.url;
            a.target = '_blank';
            a.rel = 'noopener';
            li.append(a);
          } else {
            li.textContent = s.name || 'Official trophy description (PlayStation)';
          }
          ul.append(li);
        }
        src.append(ul);
        guide.append(src);
      }
      item.append(guide);
    }
    list.append(item);
  }
}

function renderAll() {
  renderProgress();
  renderRoadmap();
  renderList();
}

// ---------- export / import / reset ----------
function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportProgress() {
  const p = computeProgress();
  downloadJson('gta6-trophy-progress.json', {
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
    total: p.total,
  });
  setStatus(`Exported ${p.count}/${p.total} trophies.`);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const ids = Array.isArray(parsed) ? parsed : parsed.earned;
      if (!Array.isArray(ids)) throw new Error('no earned list');
      const valid = new Set(DATA.trophies.map((t) => t.id));
      const next = new Set();
      for (const id of ids) if (valid.has(id)) next.add(id);
      earned = next;
      saveState();
      renderAll();
      setStatus(`Imported ${earned.size}/${DATA.trophies.length} trophies.`);
    } catch {
      setStatus('That file is not a valid progress export.');
    }
  };
  reader.readAsText(file);
}

function setStatus(msg) {
  $('tool-status').textContent = msg;
}

// ---------- URL params (for deep links and screenshots) ----------
function applyUrlParams() {
  const q = new URLSearchParams(location.search);
  if (q.get('grade') && GRADES.includes(q.get('grade'))) filters.grade = q.get('grade');
  if (q.get('category')) filters.category = q.get('category');
  if (q.get('q')) filters.query = q.get('q');
  if (q.get('spoiler') === 'on') spoilerOn = true;
  if (q.get('spoiler') === 'off') spoilerOn = false;
  const open = Number(q.get('open'));
  if (Number.isInteger(open)) openGuideId = open;
  $('filter-grade').value = filters.grade;
  $('filter-category').value = filters.category;
  $('search').value = filters.query;
  $('spoiler-toggle').checked = spoilerOn;
  if (q.get('view') === 'roadmap') {
    requestAnimationFrame(() => $('roadmap').scrollIntoView());
  }
  if (q.get('view') === 'cover') {
    // Cover view: tuck the roadmap away so the progress card, the missable
    // banner, the toolbar and the checklist with one open guide all fit in
    // one 1280x800 frame. It is the same app, same data, same state.
    document.body.classList.add('cover-view');
  }
  if (openGuideId && q.get('view') !== 'cover') {
    requestAnimationFrame(() => {
      const node = $('trophy-' + openGuideId);
      if (node) node.scrollIntoView({ block: 'center' });
    });
  }
}

// ---------- boot ----------
async function boot() {
  const res = await fetch(DATA_URL);
  DATA = await res.json();
  const hadState = loadState();
  if (!hadState) applySampleProgress();
  applyUrlParams();
  renderAll();

  $('search').addEventListener('input', (e) => { filters.query = e.target.value.trim(); renderList(); });
  $('filter-grade').addEventListener('change', (e) => { filters.grade = e.target.value; renderList(); });
  $('filter-category').addEventListener('change', (e) => { filters.category = e.target.value; renderList(); });
  $('spoiler-toggle').addEventListener('change', (e) => {
    spoilerOn = e.target.checked;
    saveState();
    renderList();
    setStatus(spoilerOn ? 'Spoiler-safe mode on: story trophies hidden until earned.' : 'Spoiler-safe mode off.');
  });
  $('btn-export').addEventListener('click', exportProgress);
  $('btn-import').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) importProgress(e.target.files[0]);
    e.target.value = '';
  });
  $('btn-sample').addEventListener('click', () => {
    localStorage.removeItem(SAMPLE_KEY);
    applySampleProgress();
    renderAll();
    setStatus(`Sample progress loaded: ${earned.size}/${DATA.trophies.length} trophies.`);
  });
  $('btn-reset').addEventListener('click', () => {
    earned = new Set();
    localStorage.setItem(SAMPLE_KEY, '1');
    saveState();
    renderAll();
    setStatus('Progress reset to 0/55.');
  });
}

boot();
