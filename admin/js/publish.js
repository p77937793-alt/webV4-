/**
 * admin/js/publish.js — 「發佈與備份」頁
 * ------------------------------------------------------------
 * 後台的「儲存」只寫進這台裝置的瀏覽器；要讓所有訪客看到，必須更新主機上的資料檔。
 * 只有「內容和線上不同」的檔案才需要更新。三種方式：
 *   1. GitHub 一鍵發佈：呼叫 GitHub API 把檔案提交到儲存庫（推薦）
 *   2. 直接寫入電腦上的網站資料夾（電腦版 Chrome / Edge）
 *   3. 逐一下載檔案，自行上傳覆蓋
 */
import { h, toast, downloadText, confirmDialog } from './utils.js';

const GH_KEY = 'yq-cms-github-v1';
const readGh = () => { try { return JSON.parse(localStorage.getItem(GH_KEY)) || {}; } catch { return {}; } };

/** 網站放在 GitHub Pages 時，從網址猜出帳號與儲存庫名稱（https://帳號.github.io/儲存庫/） */
function guessRepo() {
  const m = location.hostname.match(/^([\w-]+)\.github\.io$/i);
  if (!m) return {};
  return { owner: m[1], repo: location.pathname.split('/').filter(Boolean)[0] || `${m[1]}.github.io` };
}

/** 把 UTF-8 文字轉成 base64（GitHub API 要求的格式，需正確處理中文） */
function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** 透過 GitHub Contents API 建立或更新一個檔案 */
async function githubPut({ owner, repo, branch, token }, path, text) {
  const enc = encodeURIComponent;
  const api = `https://api.github.com/repos/${enc(owner)}/${enc(repo)}/contents/${path.split('/').map(enc).join('/')}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };

  // 更新既有檔案時必須附上它目前的 sha
  let sha;
  const cur = await fetch(`${api}?ref=${enc(branch)}`, { headers, cache: 'no-store' });
  if (cur.ok) sha = (await cur.json()).sha;
  else if (cur.status === 401) throw new Error('存取權杖無效或已過期');
  else if (cur.status !== 404) throw new Error(`無法讀取儲存庫（HTTP ${cur.status}），請確認帳號、儲存庫名稱與權杖權限`);

  const res = await fetch(api, { method: 'PUT', headers, body: JSON.stringify({ message: `後台更新 ${path}`, content: toBase64(text), branch, sha }) });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(`${path} 發佈失敗（HTTP ${res.status}）${detail.message ? `：${detail.message}` : ''}`);
  }
}

/**
 * ctx：{
 *   list()            → [{ key, path, label, changed }]  所有管理中的檔案
 *   ensureSaved()     → boolean  先驗證並儲存
 *   buildChanges()    → [{ key, path, text, rev }]  需要更新的檔案內容
 *   markPublished(changes)   發佈成功後呼叫
 *   exportAll() / importAll(obj) / resetAll() / rerender()
 * }
 */
export function renderPublish(ctx) {
  const files = ctx.list();
  const changedCount = files.filter((f) => f.changed).length;
  const gh = { owner: '', repo: '', branch: 'main', token: '', ...guessRepo(), ...readGh() };

  /** 三種方式共用：儲存 → 取得要更新的檔案 → 執行 → 標記為已發佈 */
  async function run(action, doneMsg) {
    if (!(await ctx.ensureSaved())) return;
    const changes = ctx.buildChanges();
    if (!changes.length) return toast('目前的內容和線上版本相同，沒有需要發佈的檔案', 'info');
    try {
      const ok = await action(changes);
      if (ok === false) return;
      ctx.markPublished(changes);
      toast(doneMsg(changes.length), 'success', 6000);
    } catch (err) {
      if (err.name !== 'AbortError') toast(err.message, 'error');
    }
  }

  /* ---- 待發佈清單 ---- */
  const statusCard = h('section', { class: 'panel glass' },
    h('h3', {}, changedCount ? `有 ${changedCount} 個檔案等待發佈` : '線上內容已是最新'),
    h('ul', { class: 'file-list' }, files.map((f) => h('li', {},
      h('span', { class: `pill ${f.changed ? 'changed' : 'same'}` }, f.changed ? '已修改' : '未變更'),
      h('span', {}, f.label), h('code', {}, f.path)))));

  /* ---- 1. GitHub ---- */
  const ghInput = (key, label, opts = {}) => h('div', { class: 'field' + (opts.full ? ' full' : '') },
    h('label', { class: 'field-label' }, label),
    h('input', { type: opts.type || 'text', value: gh[key], placeholder: opts.placeholder || '', autocomplete: 'off',
      oninput: (e) => { gh[key] = e.target.value.trim(); } }),
    opts.help && h('small', { class: 'help' }, opts.help));

  const publishBtn = h('button', { class: 'btn primary', onclick: async () => {
    if (!gh.owner || !gh.repo || !gh.token) return toast('請先填寫 GitHub 帳號、儲存庫名稱與存取權杖', 'error');
    publishBtn.disabled = true;
    await run(async (changes) => {
      localStorage.setItem(GH_KEY, JSON.stringify(gh));
      for (const [i, c] of changes.entries()) {
        publishBtn.textContent = `發佈中… ${i + 1} / ${changes.length}`;
        await githubPut(gh, c.path, c.text);
      }
    }, (n) => `已發佈 ${n} 個檔案到 GitHub！網站通常會在 1–2 分鐘內更新`);
    publishBtn.disabled = false;
    publishBtn.textContent = '🚀 發佈上線';
  } }, '🚀 發佈上線');

  const ghCard = h('section', { class: 'panel glass' },
    h('h3', {}, '① GitHub 一鍵發佈', h('span', { class: 'badge' }, '推薦')),
    h('p', { class: 'muted' }, '網站放在 GitHub Pages 時，填一次設定，之後用手機或任何電腦都能直接按鈕發佈。'),
    h('div', { class: 'fields' },
      ghInput('owner', 'GitHub 帳號', { placeholder: 'your-name' }),
      ghInput('repo', '儲存庫名稱', { placeholder: 'WEBV2' }),
      ghInput('branch', '分支', { placeholder: 'main' }),
      ghInput('token', '存取權杖（Fine-grained token）', { type: 'password', full: true,
        help: '只需開啟這一個儲存庫的「Contents：Read and write」權限。權杖只會存在這台裝置的瀏覽器裡，請勿在公用電腦上儲存。' })),
    h('div', { class: 'row' }, publishBtn,
      h('button', { class: 'btn ghost', onclick: () => { localStorage.removeItem(GH_KEY); toast('已清除這台裝置上的 GitHub 設定', 'info'); ctx.rerender(); } }, '清除已存的設定')));

  /* ---- 2. 寫入電腦上的資料夾 ---- */
  const fsSupported = 'showDirectoryPicker' in window;
  const fsCard = h('section', { class: 'panel glass' },
    h('h3', {}, '② 直接寫入電腦上的網站資料夾'),
    h('p', { class: 'muted' }, fsSupported
      ? '選擇你電腦上的網站資料夾（裡面有 index.html 的那一層），修改過的檔案會直接覆寫進去，之後再照平常的方式上傳。'
      : '這個瀏覽器不支援直接寫入資料夾（需要電腦版 Chrome 或 Edge），請改用其他方式。'),
    h('button', { class: 'btn', disabled: !fsSupported, onclick: () => run(async (changes) => {
      const root = await window.showDirectoryPicker({ mode: 'readwrite' });
      try { await root.getFileHandle('index.html'); } catch {
        if (!(await confirmDialog('這個資料夾裡沒有 index.html，看起來不是網站的資料夾。仍然要寫入嗎？', { okLabel: '仍然寫入', danger: true }))) return false;
      }
      for (const c of changes) {
        const parts = c.path.split('/');
        let dir = root;
        for (const name of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(name, { create: true });
        const w = await (await dir.getFileHandle(parts.at(-1), { create: true })).createWritable();
        await w.write(c.text);
        await w.close();
      }
    }, (n) => `已寫入 ${n} 個檔案`) }, '💾 選擇網站資料夾並寫入'));

  /* ---- 3. 下載 ---- */
  const dlCard = h('section', { class: 'panel glass' },
    h('h3', {}, '③ 下載修改過的檔案'),
    h('p', { class: 'muted' }, '下載後上傳到主機，覆蓋同名檔案（data/ 裡的檔案要放回 data 資料夾；content.json 放在和 index1.html 同一層）。瀏覽器可能會詢問是否允許下載多個檔案。'),
    h('button', { class: 'btn', onclick: () => run(async (changes) => {
      for (const c of changes) {
        downloadText(c.path.split('/').pop(), c.text, c.path.endsWith('.json') ? 'application/json' : 'text/javascript');
        await new Promise((r) => setTimeout(r, 350));
      }
      return confirmDialog('檔案下載完成了嗎？上傳並覆蓋到主機之後，按「已上傳」讓後台知道這些修改已經發佈。', { okLabel: '已上傳', cancelLabel: '還沒' });
    }, (n) => `已標記 ${n} 個檔案為已發佈`) }, '⬇ 下載檔案'));

  /* ---- 備份 / 還原 ---- */
  const fileInput = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || parsed.app !== 'yq-cms' || !parsed.files) throw new Error('這不是本後台匯出的備份檔');
      if (!(await confirmDialog('匯入後會取代目前後台裡的內容，確定要匯入嗎？', { okLabel: '匯入' }))) return;
      ctx.importAll(parsed.files);
    } catch (err) {
      toast(`匯入失敗：${err.message}`, 'error');
    }
  } });
  const backupCard = h('section', { class: 'panel glass' },
    h('h3', {}, '備份與還原'),
    h('p', { class: 'muted' }, '把後台目前的全部內容存成一個備份檔，需要時可以匯入回來。大改之前建議先備份。'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: () => {
        downloadText(`一水千田-內容備份-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: 'yq-cms', exportedAt: new Date().toISOString(), files: ctx.exportAll() }, null, 1));
        toast('已下載備份檔', 'success');
      } }, '⬇ 下載備份'),
      h('button', { class: 'btn ghost', onclick: () => fileInput.click() }, '⬆ 匯入備份'), fileInput,
      h('button', { class: 'btn danger', onclick: async () => {
        if (await confirmDialog('確定要捨棄這台裝置上所有尚未發佈的修改、還原成線上版本嗎？這個動作無法復原。', { okLabel: '還原', danger: true })) ctx.resetAll();
      } }, '↺ 還原為線上版本')));

  return h('div', { class: 'stack' }, statusCard, ghCard, fsCard, dlCard, backupCard);
}
