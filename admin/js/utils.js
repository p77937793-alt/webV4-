/**
 * utils.js — 前後台共用的小工具
 * ------------------------------------------------------------
 * 重點：所有畫面都用 h() 建立 DOM，文字一律以 textContent 寫入，
 * 不使用 innerHTML，因此後台輸入的任何內容都不會被當成程式碼執行（防 XSS）。
 */

/** 建立 HTML 元素：h('div', {class:'x', onclick: fn}, 子元素...) */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv);
        else el.style[sk] = sv;
      }
    } else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k in el && k !== 'list' && k !== 'form') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  appendChildren(el, children);
  return el;
}

/** 建立 SVG 元素（雷達圖使用） */
export function s(tag, attrs, ...children) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, v);
  appendChildren(el, children);
  return el;
}

function appendChildren(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false || c === '') continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** 產生不重複 ID，例如 uid('bg') → "bg-k3x9a1" */
export const uid = (prefix = 'id') => `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

/** 深層複製 */
export const clone = (v) => JSON.parse(JSON.stringify(v));

/** 陣列洗牌（Fisher–Yates），回傳新陣列 */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 由字串算出固定色相（0–359），讓沒有圖片的桌遊也有專屬封面色 */
export function hashHue(str = '') {
  let n = 0;
  for (const ch of String(str)) n = (n * 31 + ch.codePointAt(0)) % 360;
  return n;
}

/**
 * 過濾網址：只允許 http(s)、mailto、tel、站內相對路徑、# 錨點與圖片 data URL，
 * 擋掉 javascript: 之類的危險連結。
 */
export function safeUrl(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  if (/^data:image\/(png|jpe?g|webp|gif|avif);/i.test(u)) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return ''; // 其他通訊協定一律拒絕
  return u; // 相對路徑、#錨點
}

/* ---------------- Toast 提示 ---------------- */
let toastBox;
/** 顯示提示：type = 'success' | 'error' | 'info' */
export function toast(message, type = 'info', ms = 3200) {
  if (!toastBox) {
    toastBox = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(toastBox);
  }
  // 若有開啟中的對話框，把提示放進去才不會被蓋住
  const host = document.querySelector('dialog[open]') || document.body;
  if (toastBox.parentNode !== host) host.append(toastBox);
  const icon = { success: '✓', error: '!', info: 'i' }[type] || 'i';
  const el = h('div', { class: `toast ${type}` }, h('b', {}, icon), h('span', {}, message));
  toastBox.append(el);
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
  setTimeout(close, type === 'error' ? ms + 2500 : ms);
  el.addEventListener('click', close);
}

/* ---------------- 確認對話框 ---------------- */
/** 回傳 Promise<boolean>；danger=true 時確認鈕為紅色 */
export function confirmDialog(message, { okLabel = '確定', cancelLabel = '取消', danger = false } = {}) {
  return new Promise((resolve) => {
    let result = false;
    const dlg = h('dialog', { class: 'confirm' },
      h('p', {}, message),
      h('div', { class: 'row end' },
        h('button', { class: 'btn ghost', onclick: () => dlg.close() }, cancelLabel),
        h('button', { class: `btn ${danger ? 'danger' : 'primary'}`, onclick: () => { result = true; dlg.close(); } }, okLabel)));
    dlg.addEventListener('close', () => { dlg.remove(); resolve(result); });
    document.body.append(dlg);
    dlg.showModal();
  });
}

/** 觸發瀏覽器下載一個文字檔 */
export function downloadText(filename, text, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
