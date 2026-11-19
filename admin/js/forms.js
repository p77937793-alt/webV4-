/**
 * admin/js/forms.js — 「欄位定義 → 表單」的通用表單引擎
 * ------------------------------------------------------------
 * 後台所有表單都由 schemas.js 的欄位定義自動產生。
 *
 * 欄位定義：{ key, label, type, required, help, placeholder, min, max, ... }
 * 支援的 type：
 *   text / email / url / textarea / number / color / toggle / select
 *   image    圖片路徑 + 上傳壓縮 + 預覽
 *   tags     標籤（字串陣列）
 *   lines    一行一項（字串陣列）
 *   group    巢狀物件（collapsible: true 時可收合）
 *   repeater 物件陣列：可增刪、排序、複製
 *            - fields 可以是函式 (item) => 欄位陣列（不同種類的項目用不同表單）
 *            - addOptions: [{ label, make() }] 提供多種「新增」按鈕
 *            - fixed: true 時不能增刪排序（只能改內容）
 *
 * ctx：{ onChange(), showErrors }
 */
import { h, uid, clone, toast, confirmDialog, safeUrl } from './utils.js';

/* ============================================================
 * 驗證
 * ============================================================ */
const isEmpty = (v) => v == null || v === '' || (Array.isArray(v) && v.length === 0);
const fieldsOf = (f, item) => (typeof f.fields === 'function' ? f.fields(item) : f.fields) || [];

/** 檢查單一欄位，回傳錯誤訊息（空字串代表通過） */
export function checkField(f, v, obj) {
  if (f.required && isEmpty(v)) return '此欄位必填';
  if (f.type === 'number' && !isEmpty(v)) {
    if (!Number.isFinite(v)) return '請輸入數字';
    if (f.min != null && v < f.min) return `不可小於 ${f.min}`;
    if (f.max != null && v > f.max) return `不可大於 ${f.max}`;
  }
  if (f.type === 'email' && !isEmpty(v) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Email 格式不正確';
  if (f.type === 'url' && !isEmpty(v) && !safeUrl(v)) return '網址格式不正確';
  if (f.type === 'color' && !isEmpty(v) && !/^#[0-9a-f]{6}$/i.test(v)) return '顏色格式需為 #RRGGBB';
  if (['tags', 'lines', 'repeater'].includes(f.type)) {
    const n = (v || []).length;
    if (f.minItems && n < f.minItems) return `至少需要 ${f.minItems} 項`;
    if (f.maxItems && n > f.maxItems) return `最多 ${f.maxItems} 項`;
  }
  return f.validate ? f.validate(v, obj) || '' : '';
}

/** 檢查整組欄位（含巢狀），回傳錯誤訊息陣列 */
export function validateFields(fields, obj, prefix = '') {
  const errors = [];
  for (const f of fields) {
    const v = obj?.[f.key];
    if (f.type === 'group') {
      errors.push(...validateFields(f.fields, v || {}, `${prefix}${f.label}・`));
      continue;
    }
    const msg = checkField(f, v, obj);
    if (msg) errors.push(`${prefix}${f.label}：${msg}`);
    if (f.type === 'repeater') {
      (v || []).forEach((item, i) => errors.push(...validateFields(fieldsOf(f, item), item, `${prefix}${f.label} 第 ${i + 1} 項・`)));
    }
  }
  return errors;
}

/* ============================================================
 * 渲染
 * ============================================================ */
export function renderFields(fields, obj, ctx) {
  return h('div', { class: 'fields' }, fields.map((f) => renderField(f, obj, ctx)));
}

const FULL_WIDTH = new Set(['textarea', 'image', 'tags', 'lines', 'group', 'repeater']);

function renderField(f, obj, ctx) {
  if (f.type === 'group') {
    if (!obj[f.key] || typeof obj[f.key] !== 'object') obj[f.key] = {};
    const body = renderFields(f.fields, obj[f.key], ctx);
    if (f.collapsible) {
      // 可收合的群組：有錯誤要顯示時自動展開
      const open = ctx.showErrors && validateFields(f.fields, obj[f.key]).length > 0;
      return h('details', { class: 'group full', open }, h('summary', {}, f.label), body);
    }
    return h('fieldset', { class: 'group full' }, h('legend', {}, f.label), body);
  }

  const errEl = h('small', { class: 'err', role: 'alert' });
  const wrap = h('div', { class: 'field' + (FULL_WIDTH.has(f.type) || f.full ? ' full' : '') });
  const id = uid('f');

  const revalidate = () => {
    const msg = checkField(f, obj[f.key], obj);
    errEl.textContent = msg;
    wrap.classList.toggle('invalid', !!msg);
  };
  /** 欄位值改變時統一走這裡：寫回資料 → 驗證 → 通知外層「有變更」 */
  const set = (value) => {
    obj[f.key] = value;
    revalidate();
    ctx.onChange();
  };

  const control = (CONTROLS[f.type] || CONTROLS.text)(f, obj, set, ctx, id);
  wrap.append(h('label', { class: 'field-label', for: id }, f.label, f.required && h('i', { title: '必填' }, ' *')), control);
  if (f.help) wrap.append(h('small', { class: 'help' }, f.help));
  wrap.append(errEl);
  if (ctx.showErrors) revalidate();
  return wrap;
}

const CONTROLS = {
  text(f, obj, set, ctx, id) {
    const input = h('input', { id, type: f.type === 'email' ? 'email' : 'text', placeholder: f.placeholder || '', value: obj[f.key] ?? '',
      maxLength: f.maxLength || 600, oninput: (e) => set(e.target.value) });
    if (!f.suggest) return input;
    // 提供常用選項的下拉建議（仍可自行輸入）
    const listId = `${id}-list`;
    input.setAttribute('list', listId);
    return h('div', {}, input, h('datalist', { id: listId }, f.suggest.map((v) => h('option', { value: v }))));
  },

  textarea(f, obj, set, ctx, id) {
    return h('textarea', { id, rows: f.rows || 3, placeholder: f.placeholder || '', value: obj[f.key] ?? '', oninput: (e) => set(e.target.value) });
  },

  number(f, obj, set, ctx, id) {
    return h('input', { id, type: 'number', min: f.min ?? null, max: f.max ?? null, step: f.step || 1, value: obj[f.key] ?? '',
      oninput: (e) => set(e.target.value === '' ? null : Number(e.target.value)) });
  },

  color(f, obj, set, ctx, id) {
    const valid = /^#[0-9a-f]{6}$/i.test(obj[f.key] || '');
    const code = h('code', {}, valid ? obj[f.key] : '（未設定）');
    const picker = h('input', { id, type: 'color', value: valid ? obj[f.key] : '#2b7bb9',
      oninput: (e) => { code.textContent = e.target.value; set(e.target.value); } });
    return h('div', { class: 'color-row' }, picker, code,
      !f.required && h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { code.textContent = '（未設定）'; set(''); } }, '清除'));
  },

  toggle(f, obj, set, ctx, id) {
    return h('label', { class: 'switch' },
      h('input', { id, type: 'checkbox', checked: !!obj[f.key], onchange: (e) => set(e.target.checked) }),
      h('span', { class: 'track' }), h('span', {}, f.onLabel || '啟用'));
  },

  select(f, obj, set, ctx, id) {
    const sel = h('select', { id, onchange: (e) => set(f.options[e.target.selectedIndex].value) },
      f.options.map((o) => h('option', {}, o.label)));
    sel.selectedIndex = Math.max(0, f.options.findIndex((o) => o.value === obj[f.key]));
    return sel;
  },

  /* ---- 一行一項 ---- */
  lines(f, obj, set, ctx, id) {
    return h('textarea', { id, rows: f.rows || 4, placeholder: f.placeholder || '每行輸入一項', value: (obj[f.key] || []).join('\n'),
      oninput: (e) => set(e.target.value.split('\n').map((x) => x.trim()).filter(Boolean)) });
  },

  /* ---- 標籤 ---- */
  tags(f, obj, set, ctx, id) {
    const box = h('div', { class: 'tags' });
    const input = h('input', { id, type: 'text', placeholder: f.placeholder || '輸入後按 Enter 新增' });
    const draw = () => {
      box.replaceChildren(
        ...(obj[f.key] || []).map((t, i) => h('span', { class: 'chip static' }, f.tagLabel ? f.tagLabel(t) : t,
          h('button', { type: 'button', 'aria-label': `移除 ${t}`, onclick: () => { set(obj[f.key].filter((_, k) => k !== i)); draw(); } }, '×'))),
        input);
    };
    const add = () => {
      const parts = input.value.split(/[,，、]/).map((x) => x.trim()).filter(Boolean);
      if (!parts.length) return;
      set([...new Set([...(obj[f.key] || []), ...parts])]);
      input.value = '';
      draw();
      input.focus();
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } });
    input.addEventListener('blur', add);
    if (f.suggest) {
      const listId = `${id}-list`;
      input.setAttribute('list', listId);
      box.append(h('datalist', { id: listId }, f.suggest.map((v) => h('option', { value: v }))));
    }
    draw();
    return box;
  },

  /* ---- 圖片：可填路徑，也可上傳（自動壓縮後內嵌進資料） ---- */
  image(f, obj, set, ctx, id) {
    const EXAMPLE = '圖片路徑，例如 images/story/p2-drought.jpg';
    const preview = h('div', { class: 'img-preview' });
    const path = h('input', { id, type: 'text', placeholder: EXAMPLE, oninput: (e) => { set(e.target.value.trim()); draw(); } });
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => {
      const picked = e.target.files[0];
      e.target.value = '';
      if (!picked) return;
      try {
        set(await compressImage(picked));
        draw();
        toast('圖片已上傳並壓縮', 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
    } });
    const draw = () => {
      const v = obj[f.key] || '';
      const embedded = v.startsWith('data:');
      path.value = embedded ? '' : v;
      path.placeholder = embedded ? `已內嵌上傳的圖片（約 ${Math.round(v.length / 1370)} KB）` : EXAMPLE;
      preview.replaceChildren(v && safeUrl(v)
        ? h('img', { src: safeUrl(v), alt: '預覽', onerror: (e) => e.target.replaceWith(h('span', { class: 'muted' }, '⚠ 圖片無法載入，請確認路徑')) })
        : h('span', { class: 'muted' }, '尚未設定圖片'));
    };
    draw();
    return h('div', { class: 'img-field' }, preview,
      h('div', { class: 'img-ctl' }, path,
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn sm', onclick: () => file.click() }, '⬆ 上傳圖片'),
          h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { set(''); draw(); } }, '清除')),
        file));
  },

  /* ---- 可增刪排序的清單 ---- */
  repeater(f, obj, set, ctx) {
    if (!Array.isArray(obj[f.key])) obj[f.key] = [];
    const list = h('div', { class: 'rep-list' });
    let openIndex = -1; // 目前展開的項目

    const commit = () => { set(obj[f.key]); draw(); };
    const titleOf = (item, i) => f.itemTitle?.(item, i) || `第 ${i + 1} 項`;
    const push = (item) => {
      if (f.maxItems && obj[f.key].length >= f.maxItems) return toast(`最多只能有 ${f.maxItems} 項`, 'error');
      obj[f.key].push(item);
      openIndex = obj[f.key].length - 1;
      commit();
    };

    const draw = () => {
      const items = obj[f.key];
      list.replaceChildren(...items.map((item, i) => {
        const title = h('span', { class: 'rep-title' }, titleOf(item, i));
        const btn = (label, tip, fn, disabled) => h('button', { type: 'button', class: 'icon-btn', title: tip, 'aria-label': tip, disabled,
          onclick: (e) => { e.preventDefault(); e.stopPropagation(); fn(); } }, label);
        const move = (to) => { items.splice(to, 0, items.splice(i, 1)[0]); openIndex = to; commit(); };
        const itemFields = fieldsOf(f, item);
        const hasError = ctx.showErrors && validateFields(itemFields, item).length > 0;
        const details = h('details', { class: 'rep-item', open: i === openIndex || hasError },
          h('summary', {}, h('span', { class: 'rep-no' }, String(i + 1)), title,
            !f.fixed && h('span', { class: 'rep-actions' },
              btn('↑', '上移', () => move(i - 1), i === 0),
              btn('↓', '下移', () => move(i + 1), i === items.length - 1),
              btn('⧉', '複製', () => { const copy = clone(item); f.onCopy?.(copy, items); items.splice(i + 1, 0, copy); openIndex = i + 1; commit(); }),
              btn('🗑', '刪除', async () => {
                if (!(await confirmDialog(`確定要刪除「${title.textContent}」嗎？`, { okLabel: '刪除', danger: true }))) return;
                items.splice(i, 1); openIndex = -1; commit();
              }))),
          itemFields.length
            // 項目內的欄位改變時，同步更新摘要標題
            ? renderFields(itemFields, item, { ...ctx, onChange: () => { title.textContent = titleOf(item, i); ctx.onChange(); } })
            : h('p', { class: 'empty' }, '這個區塊沒有可以編輯的文字。'));
        details.addEventListener('toggle', () => { if (details.open) openIndex = i; else if (openIndex === i) openIndex = -1; });
        return details;
      }));
      if (!items.length) list.append(h('p', { class: 'empty' }, '目前沒有項目，按下方按鈕新增。'));
    };
    draw();

    if (f.fixed) return h('div', { class: 'repeater' }, list);
    const make = () => (typeof f.newItem === 'function' ? f.newItem(obj[f.key]) : clone(f.newItem || {}));
    const adders = f.addOptions
      ? h('div', { class: 'rep-add' }, h('span', {}, '＋ 新增：'), f.addOptions.map((o) => h('button', { type: 'button', class: 'btn sm', onclick: () => push(o.make()) }, o.label)))
      : h('button', { type: 'button', class: 'btn sm', onclick: () => push(make()) }, `＋ 新增${f.itemName || '項目'}`);
    return h('div', { class: 'repeater' }, list, adders);
  },
};

/**
 * 圖片壓縮：最長邊縮到 1400px、轉成 WebP，再以 data URL 內嵌進資料。
 * 這樣不需要伺服器也能「上傳」圖片，且會跟著資料檔一起發佈。
 */
function compressImage(file, maxSide = 1400, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('請選擇圖片檔（JPG / PNG / WebP）'));
    if (file.size > 20 * 1024 * 1024) return reject(new Error('圖片超過 20 MB，請先縮小後再上傳'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/webp', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('無法讀取這張圖片')); };
    img.src = url;
  });
}
