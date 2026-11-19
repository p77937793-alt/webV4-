/* =====================================================================
   畫面產生器 v4（一般不用改）
   ---------------------------------------------------------------------
   資料（data/*.js）→ 畫面。這個檔案分成兩層：
     A. 產生畫面：導覽列、各種內容區塊、故事章節、頁尾
     B. 互動效果：捲動進度、時間軸水位線、數字跑動、卡牌翻面
   要改文字請改 data/ 裡的檔案（或用後台 admin.html），不用動這裡。

   v4 改版重點（對照 DESIGN_SYSTEM.md）：
     - 每個區塊都標上所屬的區域 data-zone：
         exhibit＝產品展示、stage＝探索舞台（深色）、archive＝歷史檔案
     - 拿掉玻璃卡片、按鈕漣漪、卡牌傾斜反光、逐字彈跳
     - 資料格式完全不變，後台與舊資料檔都能直接使用
   ===================================================================== */
(function () {
  'use strict';

  var SITE = window.SITE || { nav: [], footer: '' };
  var PAGE = window.PAGE || window.STORY || { blocks: [] };
  var REDUCE = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- 小工具 ---------- */
  // 放進屬性（網址、圖片說明）的文字要跳脫；內文允許 <b>、<br> 等標籤
  function attr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function list(arr, fn) { return (arr || []).map(fn).join(''); }
  function plain(s) { return String(s == null ? '' : s).replace(/<[^>]+>/g, ''); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function btn(b, cls) {
    if (!b || !b.label) return '';
    return '<a class="btn ' + (cls || '') + '" href="' + attr(b.href) + '"><span>' + b.label + '</span></a>';
  }
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  function head(title) {
    if (!title) return '';
    return '<header class="sec-head" data-reveal><h2>' + title + '</h2></header>';
  }

  /* 四個展區：依連結的頁面判斷（選單文字仍來自 data/site.js） */
  var ZONES = {
    'cards.html': '產品', 'play.html': '產品',
    'story.html': '歷史',
    'map.html': '地圖',
    'index1.html': '遊戲'
  };
  function pageOf(href) { return String(href || '').split(/[?#]/)[0].toLowerCase(); }
  function zoneOf(href) { return ZONES[pageOf(href)] || ''; }

  /* 這一頁的區塊屬於哪個區域：桌遊介紹頁全部是產品展示；其他頁面的數字與時間軸屬於歷史檔案 */
  var PRODUCT_PAGE = PAGE.id === 'cards';
  var infoZone = PRODUCT_PAGE ? 'exhibit' : 'archive';

  /* =================================================================
     A. 產生畫面
     ================================================================= */

  /* ---------- 導覽列：策展式，標出四個展區 ---------- */
  function navLinks() {
    return list(SITE.nav, function (n, i) {
      var cur = pageOf(n.href) === here ? ' aria-current="page"' : '';
      var z = zoneOf(n.href);
      return '<a href="' + attr(n.href) + '"' + cur + ' style="--i:' + i + '">' +
        (z ? '<small class="nav-zone">' + z + '</small>' : '') +
        '<span class="nav-label">' + n.label + '</span></a>';
    });
  }

  function renderNav() {
    var el = document.getElementById('site-nav');
    if (!el) return;
    el.className = 'nav';
    el.innerHTML =
      '<a class="logo" href="index.html"><img src="' + attr(SITE.logo) + '" alt=""><span>' + SITE.name + '</span></a>' +
      '<nav class="nav-links" id="navLinks" aria-label="主選單">' + navLinks() + '</nav>' +
      '<button class="nav-toggle" type="button" aria-label="打開選單" aria-expanded="false" aria-controls="menuSheet"><i></i><i></i></button>';

    // 手機用的全螢幕選單（放在選單外面，才能蓋滿整個畫面）
    var sheet = document.createElement('nav');
    sheet.className = 'menu-sheet'; sheet.id = 'menuSheet'; sheet.setAttribute('aria-label', '主選單');
    sheet.innerHTML = navLinks();
    el.parentNode.insertBefore(sheet, el.nextSibling);

    var toggle = el.querySelector('.nav-toggle');
    function setOpen(open) {
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? '關閉選單' : '打開選單');
    }
    toggle.addEventListener('click', function () { setOpen(!document.body.classList.contains('menu-open')); });
    sheet.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }

  /* ---------- 頁尾 ---------- */
  function renderFooter() {
    var el = document.getElementById('site-footer');
    if (!el) return;
    el.setAttribute('data-zone', 'archive');
    el.innerHTML =
      '<div class="grid foot-inner">' +
        '<a class="logo" href="index.html"><img src="' + attr(SITE.logo) + '" alt=""><span>' + SITE.name + '</span></a>' +
        '<nav class="foot-links" aria-label="頁尾選單">' + list(SITE.nav, function (n) {
          var z = zoneOf(n.href);
          return '<a href="' + attr(n.href) + '">' + (z ? '<small>' + z + '</small>' : '') + n.label + '</a>';
        }) + '</nav>' +
        '<p class="foot-text">' + (PAGE.footer || SITE.footer || '') + '</p>' +
      '</div>';
  }

  /* ---------- 各種內容區塊 ---------- */
  var BLOCKS = {
    // 首屏：大字、純淨底色；照片在下方，捲動時從畫面中央放大到滿版
    hero: function (b) {
      return '<section class="hero" data-zone="exhibit">' +
        '<div class="hero-copy">' +
          (b.eyebrow ? '<p class="hero-eyebrow">' + b.eyebrow + '</p>' : '') +
          '<h1>' + b.title + '</h1>' +
          (b.lead ? '<p class="hero-lead">' + b.lead + '</p>' : '') +
          '<div class="hero-buttons">' + list(b.buttons, function (x, i) { return btn(x, i === 0 ? 'btn-primary' : 'btn-secondary'); }) + '</div>' +
        '</div>' +
        (b.bg ? '<figure class="hero-media scrub" aria-hidden="true"><div class="hero-img" style="--hero-bg:url(\'' + attr(b.bg) + '\')"></div></figure>' : '') +
        (b.next ? '<a class="scroll-cue" href="' + attr(b.next) + '" aria-label="往下看"><i></i></a>' : '') +
        '</section>';
    },

    // 重點數字：直接放在網格上，沒有卡片
    facts: function (b) {
      return '<section class="facts" data-zone="' + infoZone + '"' + (b.id ? ' id="' + attr(b.id) + '"' : '') + '>' +
        '<div class="grid"><dl class="facts-row" data-reveal>' +
        list(b.items, function (f) {
          return '<div class="fact"><dt data-count>' + f.num + '</dt><dd>' + f.label + '</dd></div>';
        }) + '</dl></div></section>';
    },

    // 3D 模型：深色舞台＋遊戲式 HUD。元素的 id 給 tres-scene.js 使用，不要改
    model3d: function (b) {
      return '<section class="tres-section" id="model3d" data-zone="stage" hidden>' +
        '<div class="grid">' + head(b.title) + '</div>' +
        '<div class="tres-stage hud" id="tresStage" aria-label="桃園大圳立體模型，可以左右拖曳旋轉">' +
          '<div class="tres-loading" id="tresLoading"><span class="spinner" aria-hidden="true"></span>3D 模型載入中…</div>' +
          '<div id="tresApp"></div>' +
          '<div class="tres-ui tres-year" id="tresYear">1916 以前</div>' +
          '<div class="tres-ui tres-controls">' +
            '<button type="button" id="tresPlay" aria-label="暫停">⏸</button>' +
            '<button type="button" id="tresReplay" aria-label="從頭播放">↺</button>' +
            '<button type="button" id="tresIn" aria-label="放大">＋</button>' +
            '<button type="button" id="tresOut" aria-label="縮小">－</button>' +
          '</div>' +
          '<div class="tres-progress"><i id="tresBar"></i></div>' +
        '</div>' +
        '<div class="grid tres-foot">' +
          '<p class="tres-caption" id="tresCaption" aria-live="polite">' + (b.firstCaption || '') + '</p>' +
          '<ul class="tres-legend">' + list(b.legend, function (l) {
            return '<li><i style="background:' + attr(l.color) + '"></i>' + l.label + '</li>';
          }) + '</ul>' +
          (b.note ? '<p class="tres-note">' + b.note + '</p>' : '') +
        '</div>' +
        '</section>';
    },

    // 文字段落（產品特色）：標題＋大字內文；連續兩塊並排
    text: function (b) {
      return '<article class="feature-item" data-reveal>' +
        (b.title ? '<h2>' + b.title + '</h2>' : '') +
        list(b.paragraphs, function (p) { return '<p>' + p + '</p>'; }) +
        (b.list ? '<ul class="spec-list">' + list(b.list, function (li) { return '<li>' + li + '</li>'; }) + '</ul>' : '') +
        '</article>';
    },

    // 時間軸：左側年份欄＋水位線，右側內文欄
    timeline: function (b) {
      return '<section class="chronicle" data-zone="' + infoZone + '"><div class="grid">' + head(b.title) +
        '<ol class="timeline">' + list(b.items, function (t) {
          return '<li><b>' + t.when + '</b><p>' + t.text + '</p></li>';
        }) + '</ol>' +
        (b.note ? '<p class="note">' + b.note + '</p>' : '') +
        '</div></section>';
    },

    // 互動地圖：全幅深色容器
    map: function (b) {
      return '<section class="map-block" data-zone="stage"><div class="grid">' + head(b.title) + '</div>' +
        '<div class="map-frame hud"><iframe src="' + attr(b.src) + '" title="桃園大圳互動灌溉地圖" loading="lazy"></iframe></div>' +
        '<div class="grid map-foot">' +
          (b.text ? '<p>' + b.text + '</p>' : '') +
          '<a class="btn btn-primary" href="map.html"><span>' + (b.moreLabel || '在新頁面打開互動地圖') + '</span></a>' +
        '</div>' +
        '</section>';
    },

    // 行動呼籲：深色舞台，靠左大字
    cta: function (b) {
      return '<section class="cta" data-zone="stage"><div class="grid">' +
        '<div class="cta-copy" data-reveal><h2>' + b.title + '</h2>' + (b.text ? '<p>' + b.text + '</p>' : '') + '</div>' +
        '<div class="cta-action">' + btn(b.button, 'btn-primary') + '</div>' +
        '</div></section>';
    },

    // 桌遊介紹頁首：置中大標題，構想圖隨捲動放大
    intro: function (b) {
      return '<section class="intro" data-zone="exhibit">' +
        '<div class="intro-copy">' +
          '<h1>' + b.title + '</h1>' + (b.lead ? '<p class="intro-lead">' + b.lead + '</p>' : '') +
        '</div>' +
        (b.image ? '<figure class="intro-figure scrub"><img src="' + attr(b.image) + '" alt="' + attr(b.alt) + '">' +
          (b.caption ? '<figcaption>' + b.caption + '</figcaption>' : '') + '</figure>' : '') +
        '</section>';
    },

    // 翻面卡牌：一列實體卡，手機可左右滑
    cards: function (b) {
      return '<section class="card-shelf" data-zone="exhibit"><div class="grid">' + head(b.title) +
        (b.note ? '<p class="note">' + b.note + '</p>' : '') + '</div>' +
        '<div class="cards" data-reveal>' + list(b.cards, function (c) {
          return '<div class="card" tabindex="0" role="button" aria-pressed="false" aria-label="' + attr(plain(c.title)) + '：翻面看卡牌背後的歷史">' +
            '<div class="card-inner">' +
              '<div class="front"><small>' + c.kind + '</small><h3>' + c.title + '</h3><p>' + (c.sub || '') + '</p>' +
                '<span class="flip-hint" aria-hidden="true">點一下翻面</span></div>' +
              '<div class="back" aria-hidden="true"><p>' + c.back + '</p>' +
                (c.more && c.more.label ? '<a class="more" href="' + attr(c.more.href) + '" tabindex="-1">' + c.more.label + '</a>' : '') + '</div>' +
            '</div></div>';
        }) + '</div>' +
        (b.button && b.button.label ? '<div class="grid card-shelf-foot">' + btn(b.button, 'btn-primary') + '</div>' : '') +
        '</section>';
    }
  };

  function renderBlocks() {
    var app = document.getElementById('app');
    if (!app || !PAGE.blocks) return;
    var html = '', B = PAGE.blocks;
    for (var i = 0; i < B.length; i++) {
      var b = B[i];
      if (b.type === 'text') {
        // 連續的 text 區塊收成一組，電腦上並排
        var group = [];
        while (i < B.length && B[i].type === 'text') group.push(B[i++]);
        i--;
        html += '<section class="feature" data-zone="exhibit"><div class="grid feature-grid' + (group.length === 1 ? ' one' : '') + '">' +
          list(group, BLOCKS.text) + '</div></section>';
        continue;
      }
      if (!BLOCKS[b.type]) { console.warn('不認得的區塊類型：' + b.type); continue; }
      html += BLOCKS[b.type](b);
    }
    app.innerHTML = html;
  }

  /* ---------- 大圳故事頁：線上特展，一格一個章節 ---------- */
  function renderStory() {
    var app = document.getElementById('app');
    if (!app || !PAGE.panels) return;
    var P = PAGE.panels;
    document.documentElement.classList.add('snap');
    document.body.setAttribute('data-zone', 'archive');
    if (!REDUCE) document.documentElement.classList.add('motion-story');

    // 這一頁沒有可見的大標題：給螢幕閱讀器一個主標題（文字取自選單）
    var me = (SITE.nav || []).filter(function (n) { return pageOf(n.href) === here; })[0];
    var h1 = '<h1 class="sr-only">' + (me ? me.label : plain(P[0] && P[0].title)) + '</h1>';

    app.innerHTML = h1 + list(P, function (p, i) {
      var style = (p.bg ? '--img:url(\'' + attr(p.bg) + '\');' : '') +
        (p.bgMobile ? '--img-m:url(\'' + attr(p.bgMobile) + '\');' : '') +
        (p.bgPos ? '--bg-pos:' + attr(p.bgPos) + ';' : '') +
        (p.color ? '--bg-color:' + attr(p.color) + ';' : '');
      var next = P[i + 1];
      return '<section class="chapter' + (p.bg ? '' : ' no-media') + '" id="' + attr(p.id) + '" style="' + style + '">' +
        (p.bg ? '<figure class="chapter-media" aria-hidden="true"><div class="chapter-img"></div></figure>' : '') +
        '<div class="chapter-label">' +
          '<span class="chapter-no">' + pad(i + 1) + ' / ' + pad(P.length) + '</span>' +
          (p.big ? '<div class="big" data-count>' + p.big + '</div>' : '') +
          '<h2>' + p.title + '</h2>' +
          (p.text ? '<p>' + p.text + '</p>' : '') +
          (p.buttons ? '<div class="chapter-buttons">' + list(p.buttons, function (x) {
            return '<a class="btn btn-primary" href="' + attr(x.href) + '"' + (x.color ? ' style="--btn-bg:' + attr(x.color) + '"' : '') + '><span>' + x.label + '</span></a>';
          }) + '</div>' : '') +
          (p.credit ? '<small class="credit">' + p.credit + '</small>' : '') +
        '</div>' +
        (next ? '<a class="scroll-cue" href="#' + attr(next.id) + '" aria-label="下一段"><i></i></a>' : '') +
        '</section>';
    });

    // 章節索引：桌機在左側，手機在右側；可以點了直接跳過去
    var dots = document.createElement('nav');
    dots.className = 'story-dots';
    dots.setAttribute('aria-label', '故事段落');
    dots.innerHTML = list(P, function (p, i) {
      return '<a href="#' + attr(p.id) + '" aria-label="第 ' + (i + 1) + ' 段：' + attr(plain(p.title)) + '"><b>' + pad(i + 1) + '</b><span>' + plain(p.title) + '</span></a>';
    });
    document.body.appendChild(dots);
    var dotLinks = $$('a', dots);
    var chapters = $$('.chapter', app);

    // 進到某一章：索引亮起、圖片緩慢推近、數字跑動
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        e.target.classList.toggle('active', e.isIntersecting);
        if (!e.isIntersecting) return;
        var idx = chapters.indexOf(e.target);
        dotLinks.forEach(function (d, j) {
          d.classList.toggle('on', j === idx);
          if (j === idx) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
        });
        var big = e.target.querySelector('[data-count]');
        if (big) countUp(big);
      });
    }, { threshold: 0.55 });
    chapters.forEach(function (s) { watch.observe(s); });

    if (location.hash) {
      var t = document.getElementById(location.hash.slice(1));
      if (t) requestAnimationFrame(function () { t.scrollIntoView({ behavior: 'auto' }); });
    }
  }

  /* =================================================================
     B. 互動效果
     ================================================================= */

  /* ---------- 捲動：導覽列在深色區翻轉、閱讀進度、回到頂端 ---------- */
  function setupScroll() {
    var nav = document.getElementById('site-nav');
    var bar = document.createElement('div');
    bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var top = null;
    if (!PAGE.panels) {
      top = document.createElement('button');
      top.className = 'to-top'; top.type = 'button'; top.setAttribute('aria-label', '回到頂端');
      top.innerHTML = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M13 23l7-7 7 7"/></svg>';
      top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' }); });
      document.body.appendChild(top);
    }

    var darkZones = $$('[data-zone="stage"]');
    var ticking = false;
    function update() {
      ticking = false;
      var y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
      var p = max > 0 ? Math.min(1, y / max) : 0;
      bar.style.transform = 'scaleX(' + p + ')';
      if (nav) {
        nav.classList.toggle('scrolled', y > 8);
        // 導覽列底下是深色舞台時，整條翻成深色
        var probe = nav.offsetHeight / 2, dark = false;
        for (var i = 0; i < darkZones.length; i++) {
          if (darkZones[i].hidden) continue;
          var r = darkZones[i].getBoundingClientRect();
          if (r.top <= probe && r.bottom >= probe) { dark = true; break; }
        }
        nav.classList.toggle('on-dark', dark);
      }
      if (top) top.classList.toggle('show', y > innerHeight * 0.8);
      timelineFill();
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ---------- 時間軸：捲動時，水位線往下注滿 ---------- */
  var timelines = [];
  function timelineFill() {
    timelines.forEach(function (ol) {
      var r = ol.getBoundingClientRect(), mid = innerHeight * 0.6;
      var p = Math.max(0, Math.min(1, (mid - r.top) / r.height));
      ol.style.setProperty('--fill', p);
      $$('li', ol).forEach(function (li) {
        li.classList.toggle('lit', li.getBoundingClientRect().top + 14 < mid);
      });
    });
  }

  /* ---------- 章節進場（只用在區塊標題與主要群組）＋數字跑動 ---------- */
  function setupReveal() {
    var items = $$('[data-reveal]');
    timelines = $$('.timeline');
    var counters = $$('[data-count]').filter(function (el) { return !el.closest('.chapter'); });
    if (REDUCE || !('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('in'); }); return; }
    document.documentElement.classList.add('motion');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); co.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* ---------- 數字跑動：1916、231、15.62 公里…（只跑一次） ---------- */
  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    var m = /^(\d+(?:\.\d+)?)([^\d.].*)?$/.exec(el.textContent.trim());   // 開頭是數字才跑（1924.5.26 這種不跑）
    if (!m || REDUCE) return;
    var end = parseFloat(m[1]), rest = m[2] || '', dec = (m[1].split('.')[1] || '').length;
    var start = end >= 1000 ? end - 120 : 0, t0 = null, dur = 1400;
    function frame(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);   // 先快後慢，不超過終點
      el.textContent = (start + (end - start) * e).toFixed(dec) + rest;
      if (k < 1) requestAnimationFrame(frame); else el.textContent = m[1] + rest;
    }
    el.textContent = start.toFixed(dec) + rest;
    requestAnimationFrame(frame);
  }

  /* ---------- 卡牌：翻面（滑鼠與鍵盤） ---------- */
  function setupCards() {
    $$('.card').forEach(function (card) {
      var back = card.querySelector('.back'), front = card.querySelector('.front'), link = card.querySelector('.more');
      function flip() {
        var on = card.classList.toggle('flipped');
        card.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (back)  back.setAttribute('aria-hidden', on ? 'false' : 'true');
        if (front) front.setAttribute('aria-hidden', on ? 'true' : 'false');
        if (link)  link.tabIndex = on ? 0 : -1;          // 翻到背面時，連結才能用 Tab 選到
      }
      card.addEventListener('click', function (e) { if (!e.target.closest('a')) flip(); });
      card.addEventListener('keydown', function (e) {
        if (e.target !== card) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
      });
    });
  }

  /* ---------- 開始 ---------- */
  renderNav();
  if (PAGE.panels) renderStory(); else renderBlocks();
  renderFooter();
  setupReveal();
  setupScroll();
  setupCards();
})();
