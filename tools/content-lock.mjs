/**
 * tools/content-lock.mjs — 文案鎖定檢查
 * ------------------------------------------------------------
 * 改版前先「拍一張內容快照」，改版後再比對，確保文案與資料一個字都沒有少。
 *
 *   node tools/content-lock.mjs snapshot   產生 docs/content-lock.json（改版前執行一次）
 *   node tools/content-lock.mjs check      比對目前的檔案和快照，列出所有差異
 *
 * 檢查範圍：
 *   - data/site.js、home.js、story.js、boardgame.js、map.js：逐字比對每一段文字與數值
 *   - play.html：內建的卡牌資料（<script id="default-data">）
 *   - index1.html：小遊戲的內容常數（SRC、STATIONS、CHOICES、ENDINGS、HOT、WHY、TEXT、GAMES）
 *   - content.json：若存在（後台發佈的小遊戲內容）
 * 版面、樣式、程式邏輯的修改不會被當成差異。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const LOCK = 'docs/content-lock.json';
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

/** 把巢狀物件攤平成 { "路徑": 值 }，方便逐條比對 */
function flatten(v, path = '', out = {}) {
  if (Array.isArray(v)) v.forEach((x, i) => flatten(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) flatten(x, path ? `${path}.${k}` : k, out);
  else if (typeof v !== 'function') out[path] = v;
  return out;
}

/** 在沙盒裡執行資料檔，取出內容（不會碰到任何網路或檔案） */
function runData(file, expr) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(`${readFileSync(file, 'utf8')}\n;globalThis.__out = (${expr});`, sandbox);
  return JSON.parse(JSON.stringify(sandbox.__out));
}

function extractIndex1() {
  const s = readFileSync('index1.html', 'utf8');
  // 取出內容常數所在的程式碼片段，用最小的假環境執行後讀值
  const grab = (name) => {
    const start = s.indexOf(`const ${name}=`);
    if (start < 0) throw new Error(`index1.html 找不到 const ${name}`);
    let i = s.indexOf('=', start) + 1, depth = 0, inStr = null;
    for (; i < s.length; i++) {
      const c = s[i];
      if (inStr) { if (c === '\\') i++; else if (c === inStr) inStr = null; continue; }
      if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
      if (c === '{' || c === '[' || c === '(') depth++;
      else if (c === '}' || c === ']' || c === ')') { depth--; if (depth === 0) { i++; break; } }
    }
    return s.slice(start, i) + ';';
  };
  const names = ['SRC', 'K', 'STATIONS', 'CHOICES', 'ENDINGS', 'HOT', 'WHY', 'TEXT', 'GAMES'];
  const code = names.map(grab).join('\n');
  const stub = 'const V={add:(a,b)=>a};const RN=[];const cen=()=>0;const W3=()=>0;const BIAN=[];const PONDPX=[];' +
    'function gameGuess(){}function gameRotate(){}function gameStore(){}';
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${stub}\n${code}\nglobalThis.__out={${names.join(',')}};`, sandbox);
  const o = sandbox.__out;
  // HOT 的文字由函式產生：在四種路線下各算一次，記錄結果
  o.HOT = o.HOT.map((h) => ({ k: h.k, n: h.n, st: [[1, 1], [1, 0], [0, 1], [0, 0]].map(([a, b]) => h.st(!!a, !!b)), sh: [[1, 1], [1, 0], [0, 1], [0, 0]].map(([a, b]) => h.sh(!!a, !!b)) }));
  o.GAMES = Object.fromEntries(Object.entries(o.GAMES).map(([k, g]) => [k, { title: g.title, how: g.how }]));
  return JSON.parse(JSON.stringify(o));
}

function extractPlay() {
  const s = readFileSync('play.html', 'utf8');
  const m = s.match(/<script id="default-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('play.html 找不到 default-data');
  return JSON.parse(m[1]);
}

function collect() {
  const src = {
    'data/site.js': runData('data/site.js', 'window.SITE'),
    'data/home.js': runData('data/home.js', 'window.PAGE'),
    'data/story.js': runData('data/story.js', 'window.STORY'),
    'data/boardgame.js': runData('data/boardgame.js', 'window.PAGE'),
    'data/map.js': runData('data/map.js', '{ BRANCH, POI }'),
    'play.html#default-data': extractPlay(),
    'index1.html#content': extractIndex1(),
  };
  if (existsSync('content.json')) src['content.json'] = JSON.parse(readFileSync('content.json', 'utf8'));
  const out = {};
  for (const [name, data] of Object.entries(src)) {
    const flat = flatten(data);
    out[name] = { hash: sha(JSON.stringify(flat)), entries: Object.keys(flat).length, flat };
  }
  return out;
}

const mode = process.argv[2];
if (mode === 'snapshot') {
  const now = collect();
  writeFileSync(LOCK, JSON.stringify({ createdAt: new Date().toISOString(), sources: now }, null, 1) + '\n');
  for (const [k, v] of Object.entries(now)) console.log(`${k.padEnd(26)} ${String(v.entries).padStart(5)} 條  ${v.hash}`);
  console.log(`\n已寫入 ${LOCK}`);
} else if (mode === 'check') {
  const lock = JSON.parse(readFileSync(LOCK, 'utf8')).sources;
  const now = collect();
  let diffs = 0;
  for (const [name, old] of Object.entries(lock)) {
    const cur = now[name];
    if (!cur) { console.log(`✗ ${name}：檔案不見了`); diffs++; continue; }
    if (cur.hash === old.hash) { console.log(`✓ ${name}（${old.entries} 條，完全相同）`); continue; }
    console.log(`✗ ${name}`);
    const keys = new Set([...Object.keys(old.flat), ...Object.keys(cur.flat)]);
    for (const k of keys) {
      const a = old.flat[k], b = cur.flat[k];
      if (a === b) continue;
      diffs++;
      if (b === undefined) console.log(`   刪除  ${k}：${JSON.stringify(a)}`);
      else if (a === undefined) console.log(`   新增  ${k}：${JSON.stringify(b)}`);
      else console.log(`   修改  ${k}：${JSON.stringify(a)}  →  ${JSON.stringify(b)}`);
    }
  }
  console.log(diffs ? `\n共 ${diffs} 處差異。若是你同意的修改，確認後重新執行 snapshot。` : '\n全部內容與快照一致。');
  process.exit(diffs ? 1 : 0);
} else {
  console.log('用法：node tools/content-lock.mjs snapshot | check');
}
