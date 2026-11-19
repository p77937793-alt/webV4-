/**
 * admin/js/schemas.js — 後台「有哪些欄位可以編輯」的唯一定義處
 * ------------------------------------------------------------
 * 每個欄位的 key 對應資料檔裡的同名欄位（和 data/*.js 開頭註解說明的欄位一致）。
 * 想讓後台多一個可編輯欄位：在對應的陣列加一行 { key, label, type } 即可。
 */

const PAGES = ['index.html', 'story.html', 'map.html', 'cards.html', 'index1.html', 'play.html'];
const HTML_HINT = '可以用 <b>粗體</b>、<br> 換行';
const plain = (s) => String(s ?? '').replace(/<[^>]+>/g, '');

const linkFields = [
  { key: 'label', label: '按鈕文字', required: true, maxLength: 40 },
  { key: 'href', label: '連到哪裡', required: true, suggest: PAGES, help: '可選擇站內頁面，或貼上完整網址' },
];
const buttonGroup = (key, label) => ({ key, label, type: 'group', fields: [
  { key: 'label', label: '按鈕文字', maxLength: 40, help: '留空就不顯示按鈕' },
  { key: 'href', label: '連到哪裡', suggest: PAGES, validate: (v, o) => (o.label && !v ? '有按鈕文字時必須填連結' : '') },
] });

/* ============================================================
 * 全站設定（data/site.js）
 * ============================================================ */
export const SITE_FIELDS = [
  { key: 'name', label: '網站名稱', required: true, maxLength: 30 },
  { key: 'footer', label: '頁尾文字', maxLength: 200, help: '個別頁面可以另外設定自己的頁尾' },
  { key: 'logo', label: 'Logo 圖片', type: 'image' },
  { key: 'nav', label: '上方選單（每一頁都會用到）', type: 'repeater', itemName: '選單項目', minItems: 1,
    itemTitle: (x) => `${x.label || '（未命名）'} → ${x.href || ''}`, newItem: { label: '新頁面', href: 'index.html' },
    fields: [
      { key: 'label', label: '顯示文字', required: true, maxLength: 20 },
      { key: 'href', label: '連到哪一頁', required: true, suggest: PAGES },
    ] },
];

/* ============================================================
 * 頁面區塊（首頁 data/home.js、桌遊介紹 data/boardgame.js 共用）
 * 每種區塊的長相由 js/render.js 決定，這裡只定義可以填的內容。
 * ============================================================ */
const factItems = { key: 'items', label: '數字', type: 'repeater', itemName: '數字', minItems: 1, maxItems: 4,
  itemTitle: (x) => `${x.num || ''} ${plain(x.label)}`, newItem: { num: '0', label: '說明' },
  fields: [
    { key: 'num', label: '數字', required: true, maxLength: 12, help: '進場時會從 0 跑到這個數字' },
    { key: 'label', label: '說明', required: true, maxLength: 30 },
  ] };
const timelineItems = { key: 'items', label: '時間點', type: 'repeater', itemName: '時間點', minItems: 1,
  itemTitle: (x) => `${x.when || ''}｜${plain(x.text)}`, newItem: { when: '', text: '' },
  fields: [
    { key: 'when', label: '年份 / 標籤', required: true, maxLength: 12 },
    { key: 'text', label: '內容', type: 'textarea', rows: 2, required: true, help: HTML_HINT },
  ] };

export const BLOCKS = {
  hero: { icon: '🌊', label: '大標題區', make: () => ({ type: 'hero', title: '新標題', lead: '', buttons: [] }), fields: [
    { key: 'eyebrow', label: '標題上方的小字', maxLength: 40 },
    { key: 'title', label: '大標題', required: true, maxLength: 30 },
    { key: 'lead', label: '副標語', type: 'textarea', rows: 2 },
    { key: 'bg', label: '背景照片', type: 'image' },
    { key: 'buttons', label: '按鈕', type: 'repeater', itemName: '按鈕', maxItems: 3, itemTitle: (x) => x.label || '（未命名）',
      newItem: { label: '新按鈕', href: 'index.html' }, fields: linkFields },
    { key: 'next', label: '往下箭頭要跳到哪裡', placeholder: '#facts', help: '留空就不顯示箭頭' },
  ] },
  facts: { icon: '🔢', label: '重點數字', make: () => ({ type: 'facts', items: [{ num: '100', label: '說明文字' }] }), fields: [factItems] },
  text: { icon: '📝', label: '文字段落', make: () => ({ type: 'text', title: '新段落', paragraphs: ['在這裡輸入內容。'] }), fields: [
    { key: 'title', label: '標題', maxLength: 40 },
    { key: 'paragraphs', label: '段落', type: 'lines', rows: 5, help: `每行一段。${HTML_HINT}。連續兩個文字區塊會自動並排成兩欄` },
    { key: 'list', label: '條列清單', type: 'lines', help: '每行一項（不需要就留空）' },
  ] },
  timeline: { icon: '🕰️', label: '時間軸', make: () => ({ type: 'timeline', title: '新時間軸', items: [{ when: '年份', text: '發生了什麼事' }] }), fields: [
    { key: 'title', label: '標題', maxLength: 40 },
    timelineItems,
    { key: 'note', label: '補充說明（小字）', maxLength: 200 },
  ] },
  map: { icon: '🗺️', label: '互動地圖', make: () => ({ type: 'map', title: '從地圖看千塘之鄉', src: 'map.html?panel=300&text=16' }), fields: [
    { key: 'title', label: '標題', maxLength: 40 },
    { key: 'src', label: '地圖網址', required: true, help: 'panel＝右側文字欄寬度、text＝文字大小，一般不用改' },
    { key: 'text', label: '地圖下方的說明', type: 'textarea', rows: 2 },
    { key: 'moreLabel', label: '「在新頁面打開」的連結文字', full: true },
  ] },
  cta: { icon: '📣', label: '行動呼籲', make: () => ({ type: 'cta', title: '新的標題', text: '', button: { label: '前往', href: 'index.html' } }), fields: [
    { key: 'title', label: '標題', required: true, maxLength: 40 },
    { key: 'text', label: '一句話說明', type: 'textarea', rows: 2 },
    buttonGroup('button', '按鈕'),
  ] },
  intro: { icon: '🎴', label: '頁首介紹（標題＋圖片）', make: () => ({ type: 'intro', title: '新標題', lead: '' }), fields: [
    { key: 'title', label: '標題', required: true, maxLength: 40 },
    { key: 'lead', label: '副標語', type: 'textarea', rows: 2 },
    { key: 'image', label: '圖片', type: 'image' },
    { key: 'alt', label: '圖片的文字描述（給視障者與搜尋引擎）', full: true },
    { key: 'caption', label: '圖片下方的小字', full: true },
  ] },
  cards: { icon: '🃏', label: '翻面卡牌', make: () => ({ type: 'cards', title: '點一下卡牌，看看背後的歷史', cards: [] }), fields: [
    { key: 'title', label: '標題', maxLength: 40 },
    { key: 'note', label: '標題下方的說明', type: 'textarea', rows: 2 },
    { key: 'cards', label: '卡牌', type: 'repeater', itemName: '卡牌',
      itemTitle: (c) => `${c.kind || '卡牌'}｜${plain(c.title) || '（未命名）'}`,
      newItem: { kind: '歷史事件卡', title: '新卡牌', sub: '', back: '' },
      fields: [
        { key: 'title', label: '卡名', required: true, maxLength: 30 },
        { key: 'kind', label: '卡的種類（左上角小字）', required: true, suggest: ['公共發展卡', '歷史事件卡', '個人發展卡', '人物角色卡', '資源卡', '埤塘板塊'] },
        { key: 'sub', label: '正面的一句說明', full: true, maxLength: 60 },
        { key: 'back', label: '翻面後的歷史說明', type: 'textarea', rows: 3, required: true },
        { key: 'more', label: '翻面後的延伸閱讀連結', type: 'group', fields: [
          { key: 'label', label: '連結文字', placeholder: '延伸閱讀：大圳故事 →', help: '留空就不顯示連結' },
          { key: 'href', label: '連到哪裡', suggest: ['story.html#p4', 'map.html?branch=L1', ...PAGES], validate: (v, o) => (o.label && !v ? '有連結文字時必須填網址' : '') },
        ] },
      ] },
    buttonGroup('button', '卡牌下方的按鈕'),
  ] },
  model3d: { icon: '🧊', label: '3D 立體模型', fields: [
    { key: 'title', label: '標題', maxLength: 40 },
    { key: 'firstCaption', label: '一開始顯示的字幕', full: true, help: '動畫播放中的字幕在 tres-scene.js 裡' },
    { key: 'legend', label: '圖例', type: 'repeater', itemName: '圖例', itemTitle: (x) => x.label || '', newItem: { color: '#1e88e5', label: '說明' },
      fields: [{ key: 'label', label: '說明', required: true }, { key: 'color', label: '顏色', type: 'color', required: true }] },
    { key: 'note', label: '模型下方的說明', type: 'textarea', rows: 3 },
  ] },
};

/** 區塊清單欄位；kinds 決定這一頁可以新增哪些種類的區塊 */
const blocksField = (kinds) => ({
  key: 'blocks', label: '頁面區塊（由上到下就是頁面的順序）', type: 'repeater', minItems: 1,
  fields: (b) => BLOCKS[b.type]?.fields || [],
  itemTitle: (b) => {
    const m = BLOCKS[b.type];
    return `${m?.icon || '▫️'} ${m?.label || b.type}${b.title ? `｜${plain(b.title)}` : ''}`;
  },
  addOptions: kinds.map((k) => ({ label: `${BLOCKS[k].icon} ${BLOCKS[k].label}`, make: BLOCKS[k].make })),
});

export const HOME_FIELDS = [
  { key: 'footer', label: '首頁專用的頁尾文字', full: true, help: '留空就使用全站設定的頁尾' },
  blocksField(['hero', 'facts', 'text', 'timeline', 'map', 'cta']),
];
export const BOARDGAME_FIELDS = [blocksField(['intro', 'facts', 'text', 'timeline', 'cards', 'cta'])];

/* ============================================================
 * 大圳故事（data/story.js）
 * ============================================================ */
export const STORY_FIELDS = [
  { key: 'panels', label: '故事段落（一格一頁，由上往下滑）', type: 'repeater', itemName: '一格', minItems: 1,
    itemTitle: (p) => `${p.id || '?'}｜${p.big ? `${p.big}　` : ''}${plain(p.title)}`,
    newItem: (items) => {
      let n = items.length + 1;
      while (items.some((p) => p.id === `p${n}`)) n++;
      return { id: `p${n}`, title: '新的一格', text: '', shade: 0.5, color: '#2b7bb9' };
    },
    onCopy: (copy, items) => { let n = items.length + 1; while (items.some((p) => p.id === `p${n}`)) n++; copy.id = `p${n}`; },
    fields: [
      { key: 'title', label: '標題', required: true, maxLength: 40 },
      { key: 'big', label: '大數字（選填）', placeholder: '例如 1916', maxLength: 16 },
      { key: 'text', label: '說明文字', type: 'textarea', rows: 3 },
      { key: 'bg', label: '背景圖片', type: 'image' },
      { key: 'bgMobile', label: '直式手機專用的背景圖（選填）', type: 'image' },
      { key: 'bgPos', label: '圖片對齊位置', placeholder: 'center 35%', suggest: ['center', 'center 20%', 'center 35%', 'center 60%', 'center 80%'], help: '百分比越小越靠上' },
      { key: 'shade', label: '圖片上的遮罩深度', type: 'number', min: 0, max: 1, step: 0.05, help: '0＝不蓋、1＝全蓋，讓字看得清楚' },
      { key: 'color', label: '圖片載入前的底色', type: 'color' },
      { key: 'light', label: '淺色模式', type: 'toggle', onLabel: '淺色背景配深色字' },
      { key: 'credit', label: '左下角的圖片出處', full: true },
      { key: 'id', label: '代號', required: true, maxLength: 12, help: '連結可以用 story.html#代號 直接跳到這一格；改了代號，其他地方的連結也要跟著改',
        validate: (v) => (/^[A-Za-z][\w-]*$/.test(v || '') ? '' : '只能用英文、數字、底線，且以英文開頭') },
      { key: 'buttons', label: '按鈕（選填）', type: 'repeater', itemName: '按鈕', maxItems: 3, itemTitle: (x) => x.label || '（未命名）',
        newItem: { label: '新按鈕', href: 'index.html', color: '#2b7bb9' },
        fields: [...linkFields, { key: 'color', label: '按鈕顏色', type: 'color' }] },
    ] },
];

/* ============================================================
 * 互動地圖文字（data/map.js）
 * 支線的代號（L1、L2…）對應地圖上畫好的範圍，所以只能改內容，不能增刪。
 * ============================================================ */
export function mapFields(map) {
  const branchGroups = Object.entries(map.BRANCH).map(([id, b]) => ({
    key: id, label: `${id}｜${b.name || ''}`, type: 'group', collapsible: true,
    fields: b.other
      ? [{ key: 'name', label: '名稱', required: true }, { key: 'text', label: '說明', type: 'textarea', rows: 3 }]
      : [
          { key: 'name', label: '支線名稱', required: true },
          { key: 'orig', label: '原有埤塘數', type: 'number', min: 0, max: 999, required: true },
          { key: 'removed', label: '已廢除數', type: 'number', min: 0, max: 999, required: true,
            validate: (v, o) => (v <= o.orig ? '' : '已廢除數不可大於原有埤塘數') },
          { key: 'text', label: '說明', type: 'textarea', rows: 2 },
          { key: 'uses', label: '廢除後的用途', type: 'lines', help: '每行一項' },
        ],
  }));
  return {
    branch: [{ key: 'BRANCH', label: '各支線的資料（點一下展開）', type: 'group', fields: branchGroups }],
    poi: [{ key: 'POI', label: '地圖上的編號地點（順序就是地圖上的編號）', type: 'repeater', itemName: '地點', minItems: 1,
      itemTitle: (p) => p.name || '（未命名地點）', newItem: { name: '新地點', text: '', status: 'ok', x: 2400, y: 1700 },
      fields: [
        { key: 'name', label: '地點名稱', required: true, maxLength: 40 },
        { key: 'status', label: '查證狀態', type: 'select', options: [{ value: 'ok', label: '已確認' }, { value: 'wait', label: '待查證' }] },
        { key: 'text', label: '說明', type: 'textarea', rows: 3, required: true },
        { key: 'x', label: '在原圖上的 X 位置（0–4796）', type: 'number', min: 0, max: 4796, required: true },
        { key: 'y', label: '在原圖上的 Y 位置（0–3471）', type: 'number', min: 0, max: 3471, required: true },
      ] }],
  };
}

/* ============================================================
 * 互動小遊戲（content.json）
 * 遊戲有 5 個區域、2 個分歧、4 種結局，這個結構寫在遊戲程式裡，
 * 所以這裡只能改內容（台詞、史料、選項文字…），不能增減區域。
 * ============================================================ */
const LINE_LABEL = { A: 'A 線（真實歷史）', B: 'B 線（IF：下游取水）', C: 'C 線（IF：填平池塘）', D: 'D 線（IF：兩者皆是）' };
const IF_LABEL = { B: '選了「下游取水」才出現的史料卡', d2B: '選了「填平池塘」才出現的史料卡' };

export function gameTabs(content, meta) {
  const kinds = Object.entries(meta?.kinds || { fact: ['', '史料'] }).map(([value, [, label]]) => ({ value, label }));
  const srcKeys = Object.keys(content.sources || {});
  const srcName = (k) => content.sources?.[k]?.t || k;

  const factRepeater = (key, label) => ({
    key, label, type: 'repeater', itemName: '史料卡', itemTitle: (x) => `${kinds.find((k) => k.value === x.k)?.label || ''}｜${x.t || ''}`,
    newItem: { k: 'fact', t: '', s: [] },
    fields: [
      { key: 't', label: '內容', type: 'textarea', rows: 2, required: true },
      { key: 'k', label: '類型', type: 'select', options: kinds },
      { key: 's', label: '資料來源代號', type: 'tags', suggest: srcKeys, tagLabel: (k) => `${k}：${srcName(k).slice(0, 14)}`,
        help: `可用的代號：${srcKeys.join('、')}（在「資料來源」分頁管理）`,
        validate: (v) => { const bad = (v || []).filter((k) => !srcKeys.includes(k)); return bad.length ? `找不到來源代號：${bad.join('、')}` : ''; } },
    ],
  });

  const stationFields = (S) => {
    const linesField = Array.isArray(S.lines)
      ? { key: 'lines', label: '角色台詞', type: 'lines', rows: 5, minItems: 1, help: '每行是一句對話（玩家點一下看下一句）' }
      : { key: 'lines', label: '角色台詞（依玩家之前的選擇而不同）', type: 'group',
          fields: Object.keys(S.lines || {}).map((k) => ({ key: k, label: LINE_LABEL[k] || k, type: 'lines', rows: 4, minItems: 1, help: '每行是一句對話' })) };
    return [
      { key: 'name', label: '區域名稱', required: true, maxLength: 40 },
      { key: 'short', label: '簡稱（下方區域條）', required: true, maxLength: 8 },
      { key: 'place', label: '地點', maxLength: 30 },
      { key: 'era', label: '年代標籤', maxLength: 20 },
      { key: 'icon', label: '圖示（表情符號）', maxLength: 4 },
      { key: 'person', label: '登場角色', type: 'group', fields: [
        { key: 'name', label: '角色名字', required: true, maxLength: 20 },
        { key: 'icon', label: '角色圖示（表情符號）', maxLength: 4 },
        { key: 'kind', label: '角色說明（真實人物 / 綜合描寫…）', full: true },
      ] },
      linesField,
      factRepeater('facts', '史料卡'),
      ...(S.ifFacts ? [{ key: 'ifFacts', label: 'IF 路線專用的史料卡', type: 'group',
        fields: Object.keys(S.ifFacts).map((k) => factRepeater(k, IF_LABEL[k] || k)) }] : []),
      { key: 'photos', label: '圖片說明文字', type: 'repeater', fixed: true, itemTitle: (p) => `${p.tag || ''}｜${p.cap || ''}`,
        fields: [{ key: 'tag', label: '標籤', maxLength: 16 }, { key: 'cap', label: '圖說', maxLength: 80 }] },
    ];
  };

  const choiceGroup = (key, label) => ({ key, label, type: 'group', fields: [
    { key: 'q', label: '問題', required: true, full: true },
    { key: 'opts', label: '兩個選項', type: 'repeater', fixed: true, itemTitle: (o) => `${o.id}｜${o.t || ''}`,
      fields: [
        { key: 't', label: '選項文字', required: true, full: true },
        { key: 'pro', label: '優點', type: 'textarea', rows: 2 },
        { key: 'con', label: '缺點', type: 'textarea', rows: 2 },
      ] },
    ...(content.choices?.[key]?.marks ? [{ key: 'marks', label: '地圖上的標記文字', type: 'repeater', fixed: true, itemTitle: (m) => m.l || '',
      fields: [{ key: 'l', label: '標記文字', required: true, full: true }] }] : []),
    { key: 'note', label: '給玩家的提示', type: 'textarea', rows: 2 },
  ] });

  const whyGroup = (key, label) => ({ key, label, type: 'group',
    fields: Object.keys(content.why?.[key] || {}).map((o) => ({ key: o, label: `選 ${o} 的因果說明`, type: 'lines', rows: 3, minItems: 3, maxItems: 3, help: '固定三行：做了什麼 → 造成什麼 → 結果' })) });

  return [
    { id: 'intro', label: '開場說明', fields: [{ key: 'text', label: '一進遊戲看到的說明', type: 'group', fields: [
      { key: 'introTitle', label: '標題', required: true, full: true },
      { key: 'introQ', label: '任務說明', type: 'textarea', rows: 3, required: true, help: '用 **文字** 可以變粗體' },
      { key: 'introList', label: '遊戲規則（每行一條）', type: 'lines', rows: 4 },
      { key: 'introNote', label: '最下方的小字', type: 'textarea', rows: 2 },
    ] }] },
    { id: 'stations', label: '五個區域', fields: [{ key: 'stations', label: '區域（關卡）', type: 'repeater', fixed: true, fields: stationFields,
      itemTitle: (S) => `${S.icon || ''} ${S.name || S.id}` }] },
    { id: 'choices', label: '兩個分歧', fields: [
      { key: 'choices', label: '玩家要做的決定', type: 'group', fields: [choiceGroup('d1', '分歧一（1915 取水口）'), choiceGroup('d2', '分歧二（1919 池塘）')] },
      { key: 'why', label: '結局畫面的因果說明', type: 'group', fields: [whyGroup('d1', '分歧一'), whyGroup('d2', '分歧二')] },
    ] },
    { id: 'endings', label: '四種結局', fields: [{ key: 'endings', label: '結局', type: 'group',
      fields: Object.keys(content.endings || {}).map((k) => ({ key: k, label: `${k} 線`, type: 'group', collapsible: true, fields: [
        { key: 't', label: '結局標題', required: true },
        { key: 'tag', label: '標籤', maxLength: 12 },
        { key: 'body', label: '結局內容（每行一段）', type: 'lines', rows: 5, minItems: 1 },
        { key: 'why', label: '推演依據（選填）', type: 'textarea', rows: 2 },
      ] })) }] },
    { id: 'games', label: '小遊戲規則', fields: [{ key: 'games', label: '區域裡的互動小遊戲', type: 'group',
      fields: Object.keys(content.games || {}).map((k) => ({ key: k, label: content.games[k].title || k, type: 'group', fields: [
        { key: 'title', label: '小遊戲名稱', required: true, full: true },
        { key: 'how', label: '玩法說明', type: 'textarea', rows: 2, required: true },
      ] })) }] },
    { id: 'sources', label: '資料來源', fields: [{ key: 'sources', label: '史料卡引用的資料來源（點一下展開）', type: 'group',
      fields: srcKeys.map((k) => ({ key: k, label: `${k}｜${srcName(k)}`, type: 'group', collapsible: true, fields: [
        { key: 't', label: '標題', required: true, full: true },
        { key: 'p', label: '出處說明', full: true },
        { key: 'u', label: '網址（選填）', type: 'url', full: true },
      ] })) }] },
  ];
}
