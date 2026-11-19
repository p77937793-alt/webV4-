/* =====================================================================
   畫面產生器（一般不用改）
   ---------------------------------------------------------------------
   讀取 data/ 資料夾裡的內容，自動做出：上方選單、頁面內容、頁尾、
   滑到才淡入的動畫、翻面卡牌。要改文字請改 data/ 裡的檔案，不用動這裡。
   ===================================================================== */
(function () {
  'use strict';

  var SITE  = window.SITE  || { nav: [], footer: '' };
  var PAGE  = window.PAGE  || window.STORY || { blocks: [] };
  var REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 小工具 ---------- */
  // 放進屬性（網址、圖片說明）的文字要跳脫引號；內文允許 <b>、<br> 等標籤，所以不跳脫
  function attr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function list(arr, fn) { return (arr || []).map(fn).join(''); }
  function btn(b, extra) {
    if (!b) return '';
    return '<a class="btn' + (extra ? ' ' + extra : '') + '" href="' + attr(b.href) + '">' + b.label + '</a>';
  }
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  /* ---------- 1. 上方選單、頁尾 ---------- */
  function renderNav() {
    var el = document.getElementById('site-nav');
    if (!el) return;
    el.className = 'nav';
    el.innerHTML =
      '<a class="logo" href="index.html"><img src="' + attr(SITE.logo) + '" alt="">' + SITE.name + '</a>' +
      '<nav aria-label="主選單">' + list(SITE.nav, function (n) {
        var cur = n.href.toLowerCase() === here ? ' aria-current="page"' : '';
        return '<a href="' + attr(n.href) + '"' + cur + '>' + n.label + '</a>';
      }) + '</nav>';
    // 往下捲動後，選單加一點陰影
    var onScroll = function () { el.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    // 手機版：目前的頁面如果被擠到右邊看不到，自動捲到看得見
    var cur = el.querySelector('[aria-current="page"]');
    if (cur && cur.scrollIntoView) { var nav = cur.parentNode; nav.scrollLeft = cur.offsetLeft - nav.clientWidth / 2 + cur.clientWidth / 2; }
  }
  function renderFooter() {
    var el = document.getElementById('site-footer');
    if (el) el.innerHTML = PAGE.footer || SITE.footer || '';
  }

  /* ---------- 2. 各種內容區塊 ---------- */
  var BLOCKS = {
    hero: function (b) {
      return '<section class="hero"' + (b.bg ? ' style="--hero-bg:url(\'' + attr(b.bg) + '\')"' : '') + '>' +
        '<h1>' + b.title + '</h1><p>' + (b.lead || '') + '</p>' +
        '<div class="hero-buttons">' + list(b.buttons, function (x) { return btn(x); }) + '</div>' +
        (b.next ? '<a class="arrow" href="' + attr(b.next) + '" aria-label="往下看">⌄</a>' : '') +
        '</section>';
    },

    facts: function (b) {
      return '<section class="facts"' + (b.id ? ' id="' + attr(b.id) + '"' : '') + '>' +
        list(b.items, function (f) { return '<div class="fact"><b>' + f.num + '</b><span>' + f.label + '</span></div>'; }) +
        '</section>';
    },

    // 3D 模型：元素的 id 給 tres-scene.js 使用，不要改
    model3d: function (b) {
      return '<section class="tres-section" id="model3d" hidden>' +
        '<h2>' + b.title + '</h2>' +
        '<div class="tres-stage" id="tresStage" aria-label="桃園大圳立體模型，可以左右拖曳旋轉">' +
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
        '<p class="tres-caption" id="tresCaption" aria-live="polite">' + (b.firstCaption || '') + '</p>' +
        '<ul class="tres-legend">' + list(b.legend, function (l) {
          return '<li><i style="background:' + attr(l.color) + '"></i>' + l.label + '</li>';
        }) + '</ul>' +
        (b.note ? '<p class="tres-note">' + b.note + '</p>' : '') +
        '</section>';
    },

    text: function (b) {
      return '<section class="content">' +
        (b.title ? '<h2>' + b.title + '</h2>' : '') +
        list(b.paragraphs, function (p) { return '<p>' + p + '</p>'; }) +
        (b.list ? '<ul>' + list(b.list, function (li) { return '<li>' + li + '</li>'; }) + '</ul>' : '') +
        '</section>';
    },

    timeline: function (b) {
      return '<section class="content">' +
        (b.title ? '<h2>' + b.title + '</h2>' : '') +
        '<ol class="timeline">' + list(b.items, function (t) { return '<li><b>' + t.when + '</b>' + t.text + '</li>'; }) + '</ol>' +
        (b.note ? '<p class="game-note">' + b.note + '</p>' : '') +
        '</section>';
    },

    map: function (b) {
      return '<section class="content">' +
        '<h2>' + b.title + '</h2>' +
        '<div class="map-frame"><iframe src="' + attr(b.src) + '" title="桃園大圳互動灌溉地圖" loading="lazy"></iframe></div>' +
        '<p class="map-more"><a href="map.html">' + (b.moreLabel || '在新頁面打開互動地圖') + '</a></p>' +
        (b.text ? '<p>' + b.text + '</p>' : '') +
        '</section>';
    },

    cta: function (b) {
      return '<section class="content story-link">' +
        '<h2>' + b.title + '</h2>' + (b.text ? '<p>' + b.text + '</p>' : '') + btn(b.button, 'btn-blue') +
        '</section>';
    },

    intro: function (b) {
      return '<section class="content game-intro">' +
        '<h1>' + b.title + '</h1>' + (b.lead ? '<p class="game-lead">' + b.lead + '</p>' : '') +
        (b.image ? '<figure class="game-figure"><img src="' + attr(b.image) + '" alt="' + attr(b.alt) + '">' +
          (b.caption ? '<figcaption>' + b.caption + '</figcaption>' : '') + '</figure>' : '') +
        '</section>';
    },

    cards: function (b) {
      return '<section class="content">' +
        '<h2>' + b.title + '</h2>' + (b.note ? '<p class="qr-note">' + b.note + '</p>' : '') +
        '<div class="cards">' + list(b.cards, function (c) {
          return '<div class="card" tabindex="0" role="button" aria-pressed="false" aria-label="' + attr(c.title) + '：翻面看卡牌背後的歷史">' +
            '<div class="card-inner">' +
              '<div class="front"><small>' + c.kind + '</small><h3>' + c.title + '</h3><p>' + (c.sub || '') + '</p>' +
                '<span class="flip-hint" aria-hidden="true">點一下翻面 ↻</span></div>' +
              '<div class="back" aria-hidden="true"><p>' + c.back + '</p>' +
                (c.more ? '<a class="more" href="' + attr(c.more.href) + '" tabindex="-1">' + c.more.label + '</a>' : '') + '</div>' +
            '</div></div>';
        }) + '</div>' +
        (b.button ? '<p class="cards-cta">' + btn(b.button, 'btn-blue') + '</p>' : '') +
        '</section>';
    }
  };

  function renderBlocks() {
    var app = document.getElementById('app');
    if (!app || !PAGE.blocks) return;
    app.innerHTML = list(PAGE.blocks, function (b) {
      var fn = BLOCKS[b.type];
      if (!fn) { console.warn('不認得的區塊類型：' + b.type); return ''; }
      return fn(b);
    });
  }

  /* ---------- 3. 大圳故事頁（一格一格往下滑） ---------- */
  function renderStory() {
    var app = document.getElementById('app');
    if (!app || !PAGE.panels) return;
    var P = PAGE.panels;
    document.documentElement.classList.add('snap');   // 整頁一格一格停下來（樣式在 style.css 第 14 節）
    app.innerHTML = list(P, function (p, i) {
      var tint = p.light ? '244,239,228' : '0,0,0';
      var s = p.shade == null ? 0.5 : p.shade;
      var style = '--shade:linear-gradient(rgba(' + tint + ',' + s + '),rgba(' + tint + ',' + s + '));' +
        (p.bg ? '--img:url(\'' + attr(p.bg) + '\');' : '') +
        (p.bgMobile ? '--img-m:url(\'' + attr(p.bgMobile) + '\');' : '') +
        (p.bgPos ? '--bg-pos:' + attr(p.bgPos) + ';' : '') +
        (p.color ? '--bg-color:' + attr(p.color) + ';' : '');
      var next = P[i + 1];
      return '<section class="panel' + (p.light ? ' light' : '') + '" id="' + attr(p.id) + '" style="' + style + '">' +
        (p.credit ? '<small class="credit">' + p.credit + '</small>' : '') +
        (p.big ? '<div class="big reveal">' + p.big + '</div>' : '') +
        '<h2 class="reveal">' + p.title + '</h2>' +
        (p.text ? '<p class="reveal">' + p.text + '</p>' : '') +
        (p.buttons ? '<div class="reveal panel-buttons">' + list(p.buttons, function (x) {
          return '<a class="btn" href="' + attr(x.href) + '"' + (x.color ? ' style="background:' + attr(x.color) + ';color:#fff"' : '') + '>' + x.label + '</a>';
        }) + '</div>' : '') +
        (next ? '<a class="arrow" href="#' + attr(next.id) + '" aria-label="下一段">⌄</a>' : '') +
        '</section>';
    });

    // 右側的小圓點：看得出讀到第幾格，也可以點了直接跳過去
    var dots = document.createElement('nav');
    dots.className = 'story-dots';
    dots.setAttribute('aria-label', '故事段落');
    dots.innerHTML = list(P, function (p, i) {
      return '<a href="#' + attr(p.id) + '" aria-label="第 ' + (i + 1) + ' 段：' + attr(String(p.title).replace(/<[^>]+>/g, '')) + '"><span>' + p.title + '</span></a>';
    });
    document.body.appendChild(dots);

    var dotLinks = dots.querySelectorAll('a');
    var panelWatch = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var idx = Array.prototype.indexOf.call(app.children, e.target);
        dotLinks.forEach(function (d, j) { d.classList.toggle('on', j === idx); });
        document.body.classList.toggle('on-light', e.target.classList.contains('light'));
      });
    }, { threshold: 0.55 });
    Array.prototype.forEach.call(app.children, function (s) { panelWatch.observe(s); });

    // 文字滑進畫面時淡入；滑走後移除，下次回來會再淡入一次
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle('show', e.isIntersecting); });
    }, { threshold: 0.3 });
    app.querySelectorAll('.reveal').forEach(function (el) { watcher.observe(el); });

    // 從其他頁面用 story.html#p4 連過來時，畫面產生後再跳到那一格
    if (location.hash) {
      var t = document.getElementById(location.hash.slice(1));
      if (t) requestAnimationFrame(function () { t.scrollIntoView({ behavior: 'auto' }); });
    }
  }

  /* ---------- 4. 滑到才淡入（一般頁面） ---------- */
  function setupReveal() {
    var targets = Array.prototype.filter.call(document.querySelectorAll(
      '.fact, .content h2, .content p, .content li, .content figure, .content .btn, .map-frame, .card, .tres-section h2'
    ), function (el) {
      // 卡牌裡面的文字不要個別淡入（背面一開始是藏起來的）
      return el.classList.contains('card') || !el.closest('.card');
    });
    if (REDUCE || !('IntersectionObserver' in window)) return;
    targets.forEach(function (el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = (i % 3) * 0.1 + 's';   // 同一排錯開一點點，比較有層次
    });
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('show');
          watcher.unobserve(e.target);                   // 出現過一次就不再消失
          // 淡入跑完後拿掉 reveal，之後滑鼠滑過的效果（浮起來等）才會正常、立刻反應
          var el = e.target;
          setTimeout(function () { el.classList.remove('reveal', 'show'); el.style.transitionDelay = ''; }, 1100);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function (el) { watcher.observe(el); });
  }

  /* ---------- 5. 翻面卡牌 ---------- */
  function setupCards() {
    document.querySelectorAll('.card').forEach(function (card) {
      var back = card.querySelector('.back'), front = card.querySelector('.front');
      var link = card.querySelector('.more');
      function flip() {
        var on = card.classList.toggle('flipped');
        card.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (back)  back.setAttribute('aria-hidden', on ? 'false' : 'true');
        if (front) front.setAttribute('aria-hidden', on ? 'true' : 'false');
        if (link)  link.tabIndex = on ? 0 : -1;          // 翻到背面時，連結才能用 Tab 選到
      }
      card.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;               // 點的是「延伸閱讀」：直接換頁，不翻面
        flip();
      });
      card.addEventListener('keydown', function (e) {
        if (e.target !== card) return;                   // 焦點在連結上時，交給連結自己處理
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
      });
    });
  }

  /* ---------- 開始 ---------- */
  renderNav();
  if (PAGE.panels) renderStory(); else renderBlocks();
  renderFooter();
  if (!PAGE.panels) { setupReveal(); setupCards(); }
  document.documentElement.classList.add('ready');
})();
