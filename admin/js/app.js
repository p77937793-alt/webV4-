/**
 * admin/js/app.js — 後台主程式
 * ------------------------------------------------------------
 * 狀態：
 *   state.files[代號]  正在編輯的內容（表單直接改這個物件）
 *   state.saved[代號]  上次按「儲存」時的內容（JSON 字串）→ 判斷「有沒有未儲存的變更」
 *   state.pub[代號]    線上版本 { json, rev, header }      → 判斷「有沒有尚未發佈的修改」
 *
 * 資料流：表單輸入 → 改 state.files → 「儲存變更」→ 驗證 → 寫入瀏覽器草稿
 *         → 前台分頁自動重新整理並顯示草稿 → 「發佈上線」→ 更新主機上的資料檔
 */
import { FILES, loadPublished, clean, serialize, readDraft, writeDraft, clearDraft } from './store.js';
import { h, toast, confirmDialog } from './utils.js';
import { renderFields, validateFields } from './forms.js';
import { SITE_FIELDS, HOME_FIELDS, STORY_FIELDS, BOARDGAME_FIELDS, mapFields, gameTabs } from './schemas.js';
import { renderPublish } from './publish.js';

const VIEWS = [
  { id: 'dashboard', icon: '🏠', label: '總覽' },
  { id: 'content', icon: '🌐', label: '網站內容' },
  { id: 'game', icon: '🎮', label: '互動小遊戲' },
  { id: 'boardgame', icon: '🃏', label: '桌遊介紹' },
  { id: 'publish', icon: '🚀', label: '發佈與備份' },
];
const CONTENT_TABS = [
  { id: 'site', label: '全站設定' }, { id: 'home', label: '首頁' }, { id: 'story', label: '大圳故事' }, { id: 'map', label: '互動地圖' },
];
const MAP_TABS = [{ id: 'branch', label: '支線資料' }, { id: 'poi', label: '地圖地點' }];

const state = {
  files: {}, saved: {}, pub: {},
  view: 'dashboard',
  tab: { content: 'site', map: 'branch', game: 'intro' },
  showErrors: false,   // 儲存失敗後，讓所有欄位顯示錯誤
  gameMeta: null,      // 小遊戲回報的資訊（史料類型等）
  gameError: '',
};

const root = document.getElementById('admin');
const json = (key) => JSON.stringify(clean(key, state.files[key]));
const loadedKeys = () => Object.keys(state.files);
const isDirty = () => loadedKeys().some((k) => json(k) !== state.saved[k]);
const changedKeys = () => loadedKeys().filter((k) => state.saved[k] !== state.pub[k]?.json);

let viewEl, statusEl, saveBtn, discardBtn, navBtns, previewEl;

init();

async function init() {
  const draft = readDraft();
  // 小遊戲的內容要等遊戲本身載入後才拿得到（見 ensureGame），其餘五個檔案先讀
  const keys = Object.keys(FILES).filter((k) => k !== 'game');
  const results = await Promise.allSettled(keys.map(loadPublished));
  results.forEach((r, i) => {
    const key = keys[i];
    if (r.status === 'rejected') { console.error(r.reason); toast(`${FILES[key].label} 讀取失敗：${r.reason.message}`, 'error'); return; }
    const { data, rev, header } = r.value;
    state.pub[key] = { json: JSON.stringify(clean(key, data)), rev, header };
    // 草稿比線上新 → 接續上次的編輯
    const useDraft = draft?.files[key] && draft.savedAt > rev;
    state.files[key] = useDraft ? draft.files[key] : data;
    state.saved[key] = json(key);
  });

  buildShell();
  go(location.hash.slice(1) || 'dashboard');

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  });
  window.addEventListener('beforeunload', (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
}

/* ============================================================
 * 外框：側邊選單 + 頂部工具列 + 小遊戲預覽面板
 * ============================================================ */
function buildShell() {
  navBtns = VIEWS.map((v) => h('button', { class: 'side-link', onclick: () => go(v.id) }, h('span', {}, v.icon), h('em', {}, v.label)));
  statusEl = h('span', { class: 'status' });
  discardBtn = h('button', { class: 'btn ghost', onclick: discard }, '捨棄變更');
  saveBtn = h('button', { class: 'btn primary', onclick: save, title: 'Ctrl / ⌘ + S' }, '儲存變更');
  viewEl = h('div', { class: 'view' });
  previewEl = h('aside', { class: 'game-preview', 'aria-label': '小遊戲預覽' });

  root.replaceChildren(
    h('aside', { class: 'side glass' },
      h('div', { class: 'side-brand' }, h('span', {}, '💧'), h('b', {}, '一水千田後台')),
      h('nav', {}, navBtns),
      h('a', { class: 'side-link preview', href: 'index.html', target: '_blank', rel: 'noopener' }, h('span', {}, '↗'), h('em', {}, '開啟前台'))),
    h('div', { class: 'main' },
      h('header', { class: 'topbar glass' },
        h('h1', { id: 'view-title' }),
        h('div', { class: 'row' }, statusEl, discardBtn, saveBtn)),
      viewEl),
    previewEl);
  updateStatus();
}

function updateStatus() {
  const dirty = isDirty();
  const pending = changedKeys().length;
  statusEl.textContent = dirty ? '● 有未儲存的變更' : pending ? `✓ 已儲存（${pending} 個檔案尚未發佈）` : '✓ 與線上版本相同';
  statusEl.className = 'status ' + (dirty ? 'dirty' : 'clean');
  saveBtn.disabled = discardBtn.disabled = !dirty;
}

/** 表單任何欄位改變時呼叫 */
function onChange() {
  updateStatus();
  if (state.view === 'game') scheduleGameApply();
}

function go(view) {
  state.view = VIEWS.some((v) => v.id === view) ? view : 'dashboard';
  history.replaceState(null, '', `#${state.view}`);
  navBtns.forEach((b, i) => b.classList.toggle('active', VIEWS[i].id === state.view));
  document.getElementById('view-title').textContent = VIEWS.find((v) => v.id === state.view).label;
  if (state.view !== 'game') setPreview(false);
  renderView();
}

function renderView() {
  const ctx = { onChange, showErrors: state.showErrors };
  const views = { dashboard: Dashboard, content: ContentView, game: GameView, boardgame: BoardgameView, publish: PublishView };
  viewEl.replaceChildren(views[state.view](ctx));
}

function Tabs(tabs, activeId, onPick) {
  return h('div', { class: 'tabs', role: 'tablist' }, tabs.map((t) =>
    h('button', { class: 'tab' + (t.id === activeId ? ' active' : ''), role: 'tab', 'aria-selected': String(t.id === activeId), onclick: () => onPick(t.id) }, t.label)));
}

const missing = (key) => h('section', { class: 'panel glass' }, h('p', { class: 'empty' }, `${FILES[key].label}（${FILES[key].path}）讀取失敗，無法編輯。請重新整理頁面再試一次。`));

/* ============================================================
 * 儲存 / 捨棄 / 驗證
 * ============================================================ */
/** 每個檔案對應的表單與所在位置。回傳 [{ key, fields, obj, where, nav }] */
function formsOf() {
  const f = state.files, out = [];
  if (f.site) out.push({ fields: SITE_FIELDS, obj: f.site, where: '全站設定', nav: { view: 'content', content: 'site' } });
  if (f.home) out.push({ fields: HOME_FIELDS, obj: f.home, where: '首頁', nav: { view: 'content', content: 'home' } });
  if (f.story) out.push({ fields: STORY_FIELDS, obj: f.story, where: '大圳故事', nav: { view: 'content', content: 'story' } });
  if (f.map) {
    const m = mapFields(f.map);
    out.push({ fields: m.branch, obj: f.map, where: '互動地圖', nav: { view: 'content', content: 'map', map: 'branch' } });
    out.push({ fields: m.poi, obj: f.map, where: '互動地圖', nav: { view: 'content', content: 'map', map: 'poi' } });
  }
  if (f.boardgame) out.push({ fields: BOARDGAME_FIELDS, obj: f.boardgame, where: '桌遊介紹', nav: { view: 'boardgame' } });
  if (f.game && state.gameMeta) {
    for (const t of gameTabs(f.game, state.gameMeta)) out.push({ fields: t.fields, obj: f.game, where: `互動小遊戲・${t.label}`, nav: { view: 'game', game: t.id } });
  }
  return out;
}

/** 儲存：成功回傳 true */
function save() {
  if (!isDirty()) return true;
  const errors = formsOf().flatMap((x) => validateFields(x.fields, x.obj).map((msg) => ({ msg: `${x.where}・${msg}`, nav: x.nav })));
  if (errors.length) {
    // 自動跳到第一個有問題的地方，並讓所有欄位顯示錯誤
    const { nav, msg } = errors[0];
    state.showErrors = true;
    Object.assign(state.tab, nav);
    go(nav.view);
    toast(`還有 ${errors.length} 個欄位需要修正。${msg}`, 'error');
    return false;
  }
  try {
    const snapshot = Object.fromEntries(loadedKeys().map((k) => [k, json(k)]));
    // 草稿只存「和線上不同」的檔案
    const draftFiles = {};
    for (const k of loadedKeys()) if (snapshot[k] !== state.pub[k]?.json) draftFiles[k] = JSON.parse(snapshot[k]);
    writeDraft(draftFiles);
    state.saved = snapshot;
    state.showErrors = false;
    updateStatus();
    toast('儲存成功！開著的前台分頁會自動更新（發佈後訪客才看得到）', 'success');
    return true;
  } catch (err) {
    const full = err?.name === 'QuotaExceededError';
    toast(full ? '儲存失敗：瀏覽器空間不足。請減少上傳的圖片，改把圖檔放進 images 資料夾並填寫路徑。' : `儲存失敗：${err.message}`, 'error');
    return false;
  }
}

async function discard() {
  if (!isDirty()) return;
  if (!(await confirmDialog('確定要捨棄所有尚未儲存的變更嗎？', { okLabel: '捨棄', danger: true }))) return;
  for (const k of loadedKeys()) state.files[k] = JSON.parse(state.saved[k]);
  state.showErrors = false;
  updateStatus();
  renderView();
  if (state.files.game) scheduleGameApply();
  toast('已還原到上次儲存的內容', 'info');
}

/* ============================================================
 * 總覽
 * ============================================================ */
function Dashboard() {
  const f = state.files;
  const blocks = (page, type) => (page?.blocks || []).filter((b) => b.type === type);
  const stat = (n, label, nav) => h('button', { class: 'stat-card glass', onclick: () => { Object.assign(state.tab, nav); go(nav.view); } }, h('b', {}, String(n)), h('span', {}, label));
  const pending = changedKeys();
  return h('div', { class: 'stack' },
    h('div', { class: 'stat-grid' },
      stat(f.home?.blocks?.length ?? '—', '個首頁區塊', { view: 'content', content: 'home' }),
      stat(f.story?.panels?.length ?? '—', '格大圳故事', { view: 'content', content: 'story' }),
      stat(blocks(f.boardgame, 'cards').reduce((n, b) => n + (b.cards?.length || 0), 0), '張翻面卡牌', { view: 'boardgame' }),
      stat(f.map?.POI?.length ?? '—', '個地圖地點', { view: 'content', content: 'map', map: 'poi' })),
    h('section', { class: 'panel glass' },
      h('h3', {}, '目前狀態'),
      h('p', {}, pending.length
        ? `有 ${pending.length} 個檔案的修改還沒發佈：${pending.map((k) => FILES[k].label).join('、')}。訪客目前看到的仍是舊內容。`
        : '後台內容與線上版本相同。')),
    h('section', { class: 'panel glass' },
      h('h3', {}, '三步驟更新網站'),
      h('ol', { class: 'steps' },
        h('li', {}, h('b', {}, '編輯'), '：從左側選單進入要修改的地方。'),
        h('li', {}, h('b', {}, '儲存'), '：按右上角「儲存變更」。開著的前台分頁會自動更新，讓你先預覽。'),
        h('li', {}, h('b', {}, '發佈'), '：到「發佈與備份」按「發佈上線」，所有訪客就會看到新內容。'))),
    h('section', { class: 'panel glass' },
      h('h3', {}, '這個後台管不到的地方'),
      h('ul', { class: 'steps' },
        h('li', {}, h('b', {}, '桌遊試玩（play.html）'), '：它有自己內建的卡牌編輯器，在該頁按 Ctrl＋Shift＋D（或網址加 #dev）開啟。'),
        h('li', {}, h('b', {}, '3D 模型的動畫字幕、地圖的線條與範圍'), '：寫在程式與圖資檔裡，需要修改程式。'),
        h('li', {}, h('b', {}, '版面設計與配色'), '：由 style.css 決定，後台不會動到它。'))));
}

/* ============================================================
 * 模組 A：網站內容（全站設定 / 首頁 / 大圳故事 / 互動地圖）
 * ============================================================ */
function ContentView(ctx) {
  const tab = state.tab.content;
  const f = state.files;
  let body;
  if (!f[tab]) body = missing(tab);
  else if (tab === 'site') body = h('section', { class: 'panel glass' }, renderFields(SITE_FIELDS, f.site, ctx));
  else if (tab === 'home') body = h('section', { class: 'panel glass' }, renderFields(HOME_FIELDS, f.home, ctx));
  else if (tab === 'story') body = h('section', { class: 'panel glass' }, renderFields(STORY_FIELDS, f.story, ctx));
  else {
    const fields = mapFields(f.map);
    body = h('div', { class: 'stack' },
      Tabs(MAP_TABS, state.tab.map, (id) => { state.tab.map = id; renderView(); }),
      h('section', { class: 'panel glass' },
        state.tab.map === 'branch' && h('p', { class: 'muted' }, '支線的代號（L1、L2…）對應地圖上畫好的範圍，所以只能修改內容，不能新增或刪除支線。'),
        renderFields(fields[state.tab.map], f.map, ctx)));
  }
  return h('div', { class: 'stack' }, Tabs(CONTENT_TABS, tab, (id) => { state.tab.content = id; renderView(); }), body);
}

/* ============================================================
 * 模組 C：桌遊介紹
 * ============================================================ */
function BoardgameView(ctx) {
  if (!state.files.boardgame) return missing('boardgame');
  return h('div', { class: 'stack' },
    h('section', { class: 'panel glass' },
      h('p', { class: 'muted' }, '這裡管理「桌遊介紹」頁（cards.html）：頁首介紹、盒內數字、玩法時間軸，以及可以翻面的卡牌。展開「🃏 翻面卡牌」區塊就能新增、修改、刪除卡牌。'),
      renderFields(BOARDGAME_FIELDS, state.files.boardgame, ctx)));
}

/* ============================================================
 * 模組 B：互動小遊戲控制台
 * ------------------------------------------------------------
 * 小遊戲（index1.html）本身支援「編輯模式」：把它放進 iframe 並在網址加 ?editor，
 * 它會把目前的內容傳給我們，也接受我們傳回去的新內容並立刻套用。
 * iframe 一旦搬動就會重新載入，所以放在固定的預覽面板裡，只用 CSS 顯示或隱藏。
 * ============================================================ */
let gameFrame = null, gameReady = null, applyTimer = null, lastJump = null, msgId = 0;

function ensureGame() {
  if (gameReady) return gameReady;
  gameReady = new Promise((resolve, reject) => {
    gameFrame = h('iframe', { src: 'index1.html?editor', title: '互動小遊戲預覽' });
    const timeout = setTimeout(() => reject(new Error('小遊戲沒有回應（載入逾時）')), 30000);
    window.addEventListener('message', async (e) => {
      if (e.source !== gameFrame.contentWindow || !e.data || e.data.yq !== 'ready') return;
      clearTimeout(timeout);
      // 小遊戲回報的內容＝線上版本（content.json 存在的話已經套用過了）
      const published = e.data.content;
      let rev = '';
      try { rev = (await loadPublished('game')).rev; } catch { /* 沒有 content.json：使用遊戲內建內容 */ }
      state.gameMeta = e.data.meta;
      state.pub.game = { json: JSON.stringify(clean('game', published)), rev, header: '' };
      if (!state.files.game) {
        const draft = readDraft();
        const useDraft = draft?.files.game && draft.savedAt > rev;
        state.files.game = useDraft ? draft.files.game : published;
        state.saved.game = json('game');
        if (useDraft) sendGame({ yq: 'apply', content: clean('game', state.files.game), reopen: false });
      }
      resolve();
    });
    const jump = (label, msg) => h('button', { class: 'btn', onclick: () => { lastJump = msg; sendGame(msg); } }, label);
    previewEl.replaceChildren(
      h('header', {}, h('span', {}, '🎮 即時預覽'), h('button', { class: 'btn sm ghost', onclick: () => setPreview(false) }, '收起 ✕')),
      gameFrame,
      h('div', { class: 'jump' },
        jump('開場', { yq: 'intro' }),
        [1, 2, 3, 4, 5].map((n) => jump(`區域 ${n}`, { yq: 'goto', i: n - 1 })),
        ['A', 'B', 'C', 'D'].map((l) => jump(`結局 ${l}`, { yq: 'ending', line: l })),
        jump('↺ 重置', { yq: 'reset' })));
  });
  gameReady.catch((err) => { state.gameError = err.message; gameReady = null; });
  return gameReady;
}

/** 開關預覽面板；寬螢幕時主畫面會往左讓出空間，不會擋到「儲存變更」 */
function setPreview(open) {
  previewEl.classList.toggle('open', open);
  root.classList.toggle('with-preview', open);
}

function sendGame(msg) {
  gameFrame?.contentWindow?.postMessage({ ...msg, id: ++msgId }, location.origin);
}

/** 內容改變後稍等一下再送進預覽，避免每打一個字就重繪 */
function scheduleGameApply() {
  if (!state.files.game || !gameFrame) return;
  clearTimeout(applyTimer);
  applyTimer = setTimeout(() => {
    sendGame({ yq: 'apply', content: clean('game', state.files.game), reopen: false });
    if (lastJump && lastJump.yq !== 'reset') sendGame(lastJump); // 重新打開剛才看的畫面，才看得到新文字
  }, 500);
}

function GameView(ctx) {
  if (!state.files.game || !state.gameMeta) {
    state.gameError = '';
    ensureGame().then(() => { if (state.view === 'game') { updateStatus(); renderView(); } })
      .catch(() => { if (state.view === 'game') renderView(); });
    return h('section', { class: 'panel glass' }, h('p', { class: 'empty' }, '正在載入小遊戲的內容…（檔案較大，第一次需要幾秒鐘）'));
  }
  const tabs = gameTabs(state.files.game, state.gameMeta);
  const tab = tabs.find((t) => t.id === state.tab.game) || tabs[0];
  return h('div', { class: 'stack' },
    h('section', { class: 'panel glass' },
      h('div', { class: 'panel-head' },
        h('p', { class: 'muted' }, '修改《時光水滴：大圳的分歧》的台詞、史料卡、選項、結局與小遊戲說明。右側預覽會即時套用你的修改。'),
        h('button', { class: 'btn', onclick: () => setPreview(!previewEl.classList.contains('open')) }, '👀 顯示 / 收起預覽'))),
    Tabs(tabs, tab.id, (id) => { state.tab.game = id; renderView(); }),
    h('section', { class: 'panel glass' },
      tab.id === 'stations' && h('p', { class: 'muted' }, '遊戲固定有 5 個區域，這裡可以修改每一區的角色、台詞與史料卡；區域數量與互動玩法寫在遊戲程式裡，無法在這裡增減。'),
      renderFields(tab.fields, state.files.game, ctx)));
}

/* ============================================================
 * 發佈與備份
 * ============================================================ */
function PublishView() {
  return renderPublish({
    list: () => Object.keys(FILES).filter((k) => state.files[k]).map((k) => ({ key: k, path: FILES[k].path, label: FILES[k].label, changed: state.saved[k] !== state.pub[k]?.json })),
    ensureSaved: async () => save(),
    rerender: renderView,
    // 產生每個「有修改」檔案的新內容，並蓋上這次的發佈時間
    buildChanges: () => {
      const rev = new Date().toISOString();
      return changedKeys().map((k) => ({ key: k, path: FILES[k].path, rev, text: serialize(k, JSON.parse(state.saved[k]), rev, state.pub[k]?.header || '') }));
    },
    markPublished: (changes) => {
      for (const c of changes) state.pub[c.key] = { ...state.pub[c.key], json: state.saved[c.key], rev: c.rev };
      clearDraft(); // 線上已經是最新，草稿不再需要
      updateStatus();
      renderView();
    },
    exportAll: () => Object.fromEntries(loadedKeys().map((k) => [k, clean(k, state.files[k])])),
    importAll: (files) => {
      let n = 0;
      for (const k of loadedKeys()) if (files[k]) { state.files[k] = files[k]; n++; }
      updateStatus();
      renderView();
      if (state.files.game) scheduleGameApply();
      toast(`已匯入 ${n} 份內容，確認後請按「儲存變更」`, 'success');
    },
    resetAll: () => { clearDraft(); state.saved = Object.fromEntries(loadedKeys().map((k) => [k, json(k)])); location.reload(); },
  });
}
