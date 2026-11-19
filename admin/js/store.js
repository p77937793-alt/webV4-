/**
 * admin/js/store.js — 資料層：讀取網站的資料檔、產生新的資料檔、管理草稿
 * ------------------------------------------------------------
 * 這個網站的內容放在 6 個檔案裡。後台做的事只有兩件：
 *   讀：把檔案內容讀成物件 → 給表單編輯
 *   寫：把物件寫回同樣格式的檔案（發佈時）
 *
 * 草稿（localStorage）：{ savedAt, files: { 檔案代號: 內容 } }，只存「和線上不同」的檔案。
 * 每個發佈出去的檔案都帶一個發佈時間（CMS_REV）；草稿比它新才會被採用，
 * 所以發佈之後、或別台裝置發佈了更新的版本，舊草稿會自動失效。
 */

export const DRAFT_KEY = 'yq-cms-draft-v1'; // 需與 js/cms.js 相同

/** 後台管理的檔案。kind：page＝window.X = {…}；map＝const BRANCH / POI；json＝純 JSON */
export const FILES = {
  site:      { path: 'data/site.js',      label: '全站設定（選單、頁尾）', kind: 'page', global: 'SITE' },
  home:      { path: 'data/home.js',      label: '首頁',                 kind: 'page', global: 'PAGE' },
  story:     { path: 'data/story.js',     label: '大圳故事',             kind: 'page', global: 'STORY' },
  map:       { path: 'data/map.js',       label: '互動地圖文字',         kind: 'map' },
  boardgame: { path: 'data/boardgame.js', label: '桌遊介紹',             kind: 'page', global: 'PAGE' },
  game:      { path: 'content.json',      label: '互動小遊戲內容',       kind: 'json' },
};

const noCache = (path) => `${path}?t=${Date.now()}`;

/**
 * 讀取線上的資料檔。回傳 { data, rev, header }
 *   header：檔案開頭的說明註解（寫回時原樣保留）
 * 資料檔是 JavaScript，所以用 Function 在隔離的假 window 上執行後取值（只執行本站自己的檔案）。
 */
export async function loadPublished(key) {
  const f = FILES[key];
  const res = await fetch(noCache(f.path), { cache: 'no-store' });
  if (!res.ok) {
    if (f.kind === 'json' && res.status === 404) return { data: null, rev: '', header: '' };
    throw new Error(`讀取 ${f.path} 失敗（HTTP ${res.status}）`);
  }
  const text = await res.text();
  if (f.kind === 'json') {
    const data = JSON.parse(text);
    return { data, rev: data.rev || '', header: '' };
  }
  const header = (text.match(/^\s*\/\*[\s\S]*?\*\//) || [''])[0].trim();
  const win = {};
  let data;
  if (f.kind === 'map') data = new Function('window', `${text}\n;return { BRANCH: BRANCH, POI: POI };`)(win);
  else { new Function('window', text)(win); data = win[f.global]; }
  if (!data) throw new Error(`${f.path} 的格式無法辨識`);
  return { data: JSON.parse(JSON.stringify(data)), rev: (win.CMS_REV || {})[key] || '', header };
}

/** 移除空白內容（''、null、[]、{}），避免前台出現空的清單或「undefined」按鈕 */
function prune(v) {
  if (Array.isArray(v)) {
    const out = v.map(prune).filter((x) => x !== undefined);
    return out.length ? out : undefined;
  }
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      const p = prune(val);
      if (p !== undefined) out[k] = p;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return v === '' || v == null ? undefined : v;
}

/** 整理成「要存檔的樣子」。比較是否有變更、存草稿、發佈都用這份。 */
export function clean(key, data) {
  const copy = JSON.parse(JSON.stringify(data));
  if (key === 'map') {
    copy.POI.forEach((p, i) => { p.id = i + 1; }); // 地點編號必須從 1 依序排列
    return copy;
  }
  if (key === 'game') { delete copy.rev; return copy; }
  return prune(copy) || {};
}

/** 產生要寫回檔案的文字 */
export function serialize(key, data, rev, header) {
  const f = FILES[key];
  const body = clean(key, data);
  if (f.kind === 'json') return JSON.stringify({ ...body, rev }, null, 1) + '\n';
  const json = (v) => JSON.stringify(v, null, 2);
  const stamp = `// 後台發佈時間（由後台自動寫入，請勿手動修改）\n(window.CMS_REV = window.CMS_REV || {}).${key} = ${JSON.stringify(rev)};\n`;
  const head = header ? `${header}\n` : '';
  if (f.kind === 'map') return `${head}const BRANCH = ${json(body.BRANCH)};\n\nconst POI = ${json(body.POI)};\n\n${stamp}`;
  return `${head}window.${f.global} = ${json(body)};\n\n${stamp}`;
}

/* ---------------- 草稿 ---------------- */
export function readDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    return d && d.files ? d : null;
  } catch {
    return null;
  }
}
export function writeDraft(files) {
  if (!Object.keys(files).length) return clearDraft();
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: new Date().toISOString(), files }));
}
export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}
