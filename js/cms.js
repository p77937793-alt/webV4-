/* =====================================================================
   後台草稿預覽（一般不用改）
   ---------------------------------------------------------------------
   在後台（admin.html）按下「儲存變更」後，內容會先存在「這台裝置的瀏覽器」裡。
   這支程式放在資料檔（data/*.js）之後、畫面產生器（js/render.js）之前：
   如果瀏覽器裡有比線上更新的草稿，就先用草稿的內容來顯示，讓你發佈前可以預覽。
   一般訪客的瀏覽器裡沒有草稿，所以看到的永遠是線上已發佈的內容。
   ===================================================================== */
(function () {
  'use strict';
  var KEY = 'yq-cms-draft-v1';   // 需與 admin/js/store.js 相同
  var draft = null;
  try { draft = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { draft = null; }

  var rev = window.CMS_REV || {};   // 各資料檔上次由後台發佈的時間
  var used = false;

  // 草稿裡有這個檔案，而且比線上版本新，才採用
  function fresh(name) {
    return !!(draft && draft.files && draft.files[name] && String(draft.savedAt || '') > String(rev[name] || ''));
  }

  if (window.SITE && fresh('site')) { window.SITE = draft.files.site; used = true; }
  if (window.PAGE && window.PAGE.id === 'home' && fresh('home')) { window.PAGE = draft.files.home; used = true; }
  if (window.PAGE && window.PAGE.id === 'cards' && fresh('boardgame')) { window.PAGE = draft.files.boardgame; used = true; }
  if (window.STORY && fresh('story')) { window.STORY = draft.files.story; used = true; }

  // 互動地圖的資料是 const，不能整個換掉，所以把內容改寫進原本的物件
  if (typeof BRANCH !== 'undefined' && typeof POI !== 'undefined' && fresh('map')) {
    var m = draft.files.map;
    Object.keys(BRANCH).forEach(function (k) { delete BRANCH[k]; });
    Object.keys(m.BRANCH || {}).forEach(function (k) { BRANCH[k] = m.BRANCH[k]; });
    POI.length = 0;
    (m.POI || []).forEach(function (p) { POI.push(p); });
    used = true;
  }

  // 後台在另一個分頁儲存或發佈時，這一頁自動重新整理
  window.addEventListener('storage', function (e) { if (e.key === KEY) location.reload(); });

  // 正在看草稿時，左下角顯示提示
  if (used) {
    var show = function () {
      var a = document.createElement('a');
      a.href = 'admin.html';
      a.textContent = '👀 正在預覽後台草稿（尚未發佈）';
      a.setAttribute('style', 'position:fixed;left:14px;bottom:14px;z-index:9999;padding:8px 16px;border-radius:999px;' +
        'background:#ffc857;color:#221a00;font:700 13px/1.4 system-ui,sans-serif;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.3)');
      document.body.appendChild(a);
    };
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
  }
})();
