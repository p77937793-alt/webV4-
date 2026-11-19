/* =====================================================================
   立體看大圳（TresJS = 用 Vue 寫 Three.js）
   - 需要網路：第一次會從 esm.sh 下載 Vue、Three.js 和 TresJS。
   - 下載失敗、沒有網路或裝置不支援 3D 時，首頁那一段會自動隱藏。
   - 水路、灌區、埤塘的位置來自 tres-data.js（由灌溉區域圖辨識）。
   ===================================================================== */
(function () {
  // ★ 可以調整的數字
  var TILT_DEG = 9;        // 台地傾斜的角度（誇張示意，數字越大越斜）
  var HOLD_END = 6;        // 全部通水後停留幾秒再重播
  var SWAY     = 0.18;     // 自動左右擺動的幅度（0 = 不動）
  var BG       = '#E2E0DB';   // 混凝土灰，和全站色彩一致（css/tokens.css 的 --concrete-100）

  // 套件的實際網址寫在 index.html 的 importmap 裡（三個套件共用同一份 three.js）
  var VUE_URL   = 'vue';
  var THREE_URL = 'three';
  var TRES_URL  = '@tresjs/core';

  var D = window.YQ3D;
  var section = document.getElementById('model3d');
  var stage   = document.getElementById('tresStage');
  if (!D || !section || !stage) return;
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function webglOK() {
    try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
    catch (e) { return false; }
  }

  // 1. 裝置支援 3D 才顯示；快捲到的時候才開始下載（不拖慢首頁）
  if (webglOK() && 'IntersectionObserver' in window) {
    section.hidden = false;
    var lazy = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { lazy.disconnect(); start(); }
    }, { rootMargin: '400px' });
    lazy.observe(section);
  }

  function start() {
    var done = false;
    var giveUp = setTimeout(function () { if (!done) section.hidden = true; }, 20000);
    Promise.all([import(VUE_URL), import(TRES_URL), import(THREE_URL)]).then(function (m) {
      build(m[0], m[1], m[2]);
      done = true; clearTimeout(giveUp); section.hidden = false;
      var l = $('tresLoading'); if (l) l.remove();
      stage.classList.add('ready');
    }).catch(function (err) {
      clearTimeout(giveUp);
      console.warn('3D 模型載入失敗，已略過這一段：', err);
      section.hidden = true;
    });
  }

  var clamp = function (v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.min(b, Math.max(a, v)); };

  // 時間軸（秒）：對應 tres-data.js 裡每條水路、每口埤塘的「at」
  var T1 = D.trunk.t1.t, T2 = D.trunk.t2.t, T3 = D.trunk.t3.t;
  var FLOW_END = T3[1] + 0.8;
  var PHASES = [
    { until: T1[0],    year: '1916 以前',  text: '看天田的年代：埤塘各自蓄雨水，久旱就見底。' },
    { until: T1[1],    year: '1916–1924', text: '開鑿導水路：從石門取水，8 段隧道合計約 15.62 公里。' },
    { until: T2[1],    year: '1924.5.26', text: '通水：幹線一路向西，沿途分出一條條支線，水流進埤塘。' },
    { until: FLOW_END, year: '之後',       text: '水再往西南：圖上的光復圳把水送到新屋、湖口一帶（年代待核）。' },
    { until: Infinity, year: '千塘之鄉',   text: '1928 年整體系統完成，線內貯水池 231 口。旱田變成了水田。' }
  ];
  var BRANCH_NAME = { 'L1': '1', 'L2': '2', 'L3': '3', 'L4': '4', 'L5': '5', 'L6': '6', 'L7': '7', 'L8-1': '8-1', 'L8': '8', 'L9': '9', 'L10': '10', 'L11': '11', 'L12-1': '12-1' };

  function build(Vue, Tres, THREE) {
    var S = 12 / D.size[0];                                   // 地圖像素 → 3D 單位
    var W = 12, H = D.size[1] * S;
    var X = function (mx) { return (mx - D.size[0] / 2) * S; };
    var Z = function (my) { return (my - D.size[1] / 2) * S; };

    var root = new THREE.Group();                             // 整個模型（拖曳時轉這個）
    var land = new THREE.Group();                             // 傾斜的台地，地圖上的東西都放這裡
    root.add(land);

    // ---- 台地傾斜：以海岸線為軸，往內陸（東南）抬高 ----
    var axis = new THREE.Vector3(D.coast.dir[0], 0, D.coast.dir[1]).normalize();
    var pivot = new THREE.Vector3(X(D.coast.p[0]), 0, Z(D.coast.p[1]));
    var inland = new THREE.Vector3(-axis.z, 0, axis.x); if (inland.z < 0) inland.negate();
    var ang = TILT_DEG * Math.PI / 180;
    var q = new THREE.Quaternion().setFromAxisAngle(axis, ang);
    if (inland.clone().applyQuaternion(q).y < 0) { ang = -ang; q.setFromAxisAngle(axis, ang); }
    land.quaternion.copy(q);
    land.position.copy(pivot).sub(pivot.clone().applyQuaternion(q));
    var toWorld = function (x, y, z) { return new THREE.Vector3(x, y, z).applyQuaternion(q).add(land.position); };

    // ---- 地圖表面 ----
    var tex = new THREE.TextureLoader().load(D.tex);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    var topGeo = new THREE.PlaneGeometry(W, H); topGeo.rotateX(-Math.PI / 2);
    land.add(new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 })));

    // ---- 模型的側面（紅土色的楔形底座，底部是平的） ----
    var corners = [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]];
    var tops = corners.map(function (c) { return toWorld(c[0], 0, c[1]); });
    var baseY = Math.min.apply(null, tops.map(function (v) { return v.y; })) - 0.18;
    var bots = tops.map(function (v) { return new THREE.Vector3(v.x, baseY, v.z); });
    var tri = [];
    function quad(a, b, c, d) { [a, b, c, a, c, d].forEach(function (v) { tri.push(v.x, v.y, v.z); }); }
    for (var i = 0; i < 4; i++) { var j = (i + 1) % 4; quad(tops[i], tops[j], bots[j], bots[i]); }
    quad(bots[0], bots[1], bots[2], bots[3]);
    var sideGeo = new THREE.BufferGeometry();
    sideGeo.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3));
    sideGeo.computeVertexNormals();
    root.add(new THREE.Mesh(sideGeo, new THREE.MeshStandardMaterial({ color: '#a8572f', roughness: 1, side: THREE.DoubleSide })));

    // ---- 小工具：把地圖上的多邊形變成貼在台地上的平面 ----
    function flat(rings, y, material, order) {
      var shapes = rings.map(function (r) {
        var pts = [];
        for (var k = 0; k < r.length; k += 2) pts.push(new THREE.Vector2(X(r[k]), Z(r[k + 1])));
        return new THREE.Shape(pts);
      });
      var g = new THREE.ShapeGeometry(shapes); g.rotateX(Math.PI / 2);
      var m = new THREE.Mesh(g, material); m.position.y = y; m.renderOrder = order;
      land.add(m); return m;
    }
    function overlay(color, opacity) {
      return new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity, depthWrite: false, side: THREE.DoubleSide });
    }

    // ---- 海：海岸線以外塗上半透明的藍 ----
    (function () {
      var p = D.coast.p, d = D.coast.dir, len = Math.hypot(d[0], d[1]), nx = -d[1] / len, ny = d[0] / len;
      if (ny < 0) { nx = -nx; ny = -ny; }                       // (nx, ny) 指向內陸
      var side = function (pt) { return (pt[0] - p[0]) * nx + (pt[1] - p[1]) * ny; };
      var rect = [[0, 0], [D.size[0], 0], [D.size[0], D.size[1]], [0, D.size[1]]], out = [];
      for (var i = 0; i < 4; i++) {                             // 把地圖長方形切出「靠海的那一半」
        var a = rect[i], b = rect[(i + 1) % 4], sa = side(a), sb = side(b);
        if (sa <= 0) out.push(a[0], a[1]);
        if ((sa < 0) !== (sb < 0)) { var t = sa / (sa - sb); out.push(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); }
      }
      if (out.length >= 6) flat([out], 0.004, overlay('#3d8fc9', 0.5), 1);
    })();

    // ---- 灌區：通水後慢慢變綠（旱田變水田） ----
    var regions = Object.keys(D.regions).map(function (k) {
      var r = D.regions[k];
      return { at: r.at, mesh: flat(r.rings, 0.008, overlay('#3f9b3a', 0), 2) };
    });

    // ---- 支線：沒水是土色，有水變藍 ----
    var DRY = new THREE.Color('#8f7b63'), WET = new THREE.Color('#1976d2');
    var PDRY = new THREE.Color('#b59a6e'), PWET = new THREE.Color('#1e88e5');
    var branches = Object.keys(D.branches).map(function (k) {
      var b = D.branches[k];
      var mat = new THREE.MeshBasicMaterial({ color: DRY.clone(), side: THREE.DoubleSide });
      return { key: k, at: b.at, mat: mat, mesh: flat(b.rings, 0.014, mat, 3), rings: b.rings };
    });

    // ---- 幹線與導水路：立體的水管，水流到哪裡就藍到哪裡 ----
    function tube(def, radius) {
      var pts = [];
      for (var k = 0; k < def.pts.length; k += 2) pts.push(new THREE.Vector3(X(def.pts[k]), 0.03, Z(def.pts[k + 1])));
      var curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      var seg = Math.max(60, pts.length * 5), radial = 6;
      var dry = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, radius * 0.85, radial, false),
                               new THREE.MeshStandardMaterial({ color: '#8f7b63', roughness: 1 }));
      var wetGeo = new THREE.TubeGeometry(curve, seg, radius, radial, false);
      var wet = new THREE.Mesh(wetGeo, new THREE.MeshStandardMaterial({ color: '#1e88e5', emissive: '#0b5cad', emissiveIntensity: 0.6, roughness: 0.25 }));
      wetGeo.setDrawRange(0, 0);
      land.add(dry); land.add(wet);
      return { t: def.t, curve: curve, geo: wetGeo, seg: seg, per: radial * 6 };
    }
    var trunks = [tube(D.trunk.t1, 0.045), tube(D.trunk.t2, 0.05), tube(D.trunk.t3, 0.04)];

    // ---- 埤塘：每一口都在地圖上真實的位置 ----
    var N = D.ponds.length;
    var pondMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 14),
                                           new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.1 }), N);
    var dummy = new THREE.Object3D(), tmpColor = new THREE.Color(), pondWet = new Float32Array(N).fill(-1);
    D.ponds.forEach(function (p, i) {
      var r = Math.max(0.04, p[2] * S * 1.15);
      dummy.position.set(X(p[0]), 0.025, Z(p[1])); dummy.scale.set(r, 0.03, r); dummy.updateMatrix();
      pondMesh.setMatrixAt(i, dummy.matrix); pondMesh.setColorAt(i, PDRY);
    });
    pondMesh.instanceMatrix.needsUpdate = true; pondMesh.frustumCulled = false; pondMesh.renderOrder = 4;
    land.add(pondMesh);

    // ---- 導水路穿過的山丘（示意）、石門取水口的水閘 ----
    var hillGeo = new THREE.ConeGeometry(0.2, 0.36, 6), hillMat = new THREE.MeshStandardMaterial({ color: '#5d8c5a', roughness: 1, flatShading: true });
    var c1 = trunks[0].curve;
    for (var hI = 1; hI < 12; hI++) {
      var u = hI / 12, pt = c1.getPointAt(u), tg = c1.getTangentAt(u), nx = -tg.z, nz = tg.x;
      [-1, 1].forEach(function (sgn, kk) {
        var off = 0.26 + ((hI * 7 + kk * 3) % 5) * 0.045, sc = 0.8 + ((hI * 5 + kk) % 4) * 0.18;
        var hill = new THREE.Mesh(hillGeo, hillMat);
        hill.position.set(pt.x + nx * off * sgn, 0.18 * sc, pt.z + nz * off * sgn); hill.scale.setScalar(sc);
        land.add(hill);
      });
    }
    var gate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.12), new THREE.MeshStandardMaterial({ color: '#9aa5ad', roughness: 0.8 }));
    gate.position.set(X(D.intake[0]), 0.11, Z(D.intake[1])); land.add(gate);

    // ---- 文字標籤（永遠面向鏡頭） ----
    function label(text, mx, my, opt) {
      opt = opt || {};
      var fs = 44, pad = 16, cv = document.createElement('canvas'), ctx = cv.getContext('2d');
      var font = 'bold ' + fs + 'px "Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
      ctx.font = font;
      var w = Math.ceil(ctx.measureText(text).width) + pad * 2, hh = fs + pad * 2;
      cv.width = w; cv.height = hh; ctx = cv.getContext('2d'); ctx.font = font; ctx.textBaseline = 'middle';
      if (opt.bg !== false) {
        ctx.fillStyle = opt.bg || 'rgba(255,255,255,.92)';
        var rr = hh / 2; ctx.beginPath(); ctx.moveTo(rr, 0); ctx.lineTo(w - rr, 0); ctx.arc(w - rr, rr, rr, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(rr, hh); ctx.arc(rr, rr, rr, Math.PI / 2, Math.PI * 1.5); ctx.fill();
      }
      ctx.fillStyle = opt.color || '#2d2a26'; ctx.fillText(text, pad, hh / 2 + 2);
      var t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false }));
      var size = opt.size || 0.3;
      sp.scale.set(size * w / hh, size, 1); sp.center.set(0.5, 0);
      sp.position.set(X(mx), opt.y || 0.2, Z(my)); sp.renderOrder = 10;
      land.add(sp); return sp;
    }
    label('石門取水口', D.intake[0], D.intake[1], { y: 0.3 });
    label('導水路（8 段隧道）', 3652, 2598, { y: 0.55, size: 0.26 });
    label('桃園大圳幹線', 3050, 1790, { y: 0.14, size: 0.26, bg: 'rgba(25,118,210,.92)', color: '#ffffff' });
    label('光復圳', 1700, 2380, { y: 0.14, size: 0.24 });
    label('台灣海峽', 1900, 620, { bg: false, color: '#ffffff', size: 0.34, y: 0.05 });
    branches.forEach(function (b) {
      if (!BRANCH_NAME[b.key]) return;
      var sx = 0, sy = 0, n = 0;                               // 標在支線的中間
      b.rings.forEach(function (r) { for (var k = 0; k < r.length; k += 2) { sx += r[k]; sy += r[k + 1]; n++; } });
      b.label = label(BRANCH_NAME[b.key], sx / n, sy / n, { size: 0.2, bg: 'rgba(181,83,45,.95)', color: '#ffffff', y: 0.06 });
      b.label.material.opacity = 0;
    });

    // ---- 水滴：走在水流的最前面 ----
    var drop = new THREE.Group();
    var dropMat = new THREE.MeshStandardMaterial({ color: '#4fb3ff', roughness: 0.15, metalness: 0.2, emissive: '#1e88e5', emissiveIntensity: 0.25 });
    drop.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 16), dropMat));
    var tip = new THREE.Mesh(new THREE.ConeGeometry(0.094, 0.18, 16), dropMat); tip.position.y = 0.145; drop.add(tip);
    land.add(drop);

    // ---- 每一格畫面：依時間更新 ----
    var phaseNow = -1, wasRegion = [];
    function update(te, clock) {
      trunks.forEach(function (tr) {
        var f = clamp((te - tr.t[0]) / (tr.t[1] - tr.t[0]));
        tr.geo.setDrawRange(0, Math.round(f * tr.seg) * tr.per);
      });
      branches.forEach(function (b) {
        var w = clamp((te - b.at) / 0.8);
        b.mat.color.lerpColors(DRY, WET, w);
        if (b.label) b.label.material.opacity = w;
      });
      regions.forEach(function (r, i) {
        var o = 0.4 * clamp((te - r.at) / 2.5);
        if (o !== wasRegion[i]) { wasRegion[i] = o; r.mesh.material.opacity = o; r.mesh.visible = o > 0.001; }
      });
      var changed = false;
      for (var i = 0; i < N; i++) {
        var w = clamp((te - D.ponds[i][3]) / 0.6);
        if (w !== pondWet[i]) { pondWet[i] = w; pondMesh.setColorAt(i, tmpColor.lerpColors(PDRY, PWET, w)); changed = true; }
      }
      if (changed && pondMesh.instanceColor) pondMesh.instanceColor.needsUpdate = true;

      // 水滴的位置
      var tr = te < T1[1] ? trunks[0] : (te < T2[1] ? trunks[1] : trunks[2]);
      var p = tr.curve.getPointAt(clamp((te - tr.t[0]) / (tr.t[1] - tr.t[0])));
      drop.position.set(p.x, p.y + 0.2 + Math.sin(clock * 3) * 0.03, p.z);

      // 上方的年代、下方的說明、進度條
      var ph = 0; while (te >= PHASES[ph].until) ph++;
      if (ph !== phaseNow) {
        phaseNow = ph;
        if ($('tresYear')) $('tresYear').textContent = PHASES[ph].year;
        if ($('tresCaption')) $('tresCaption').textContent = PHASES[ph].text;
      }
      if ($('tresBar')) $('tresBar').style.width = (clamp(te / FLOW_END) * 100).toFixed(1) + '%';
    }

    // ---- 播放控制、拖曳旋轉、縮放 ----
    var time = reduce ? FLOW_END + 1 : 0, playing = !reduce, onScreen = true, clock = 0;
    var yaw = -0.22, zoom = 1, drag = null, last = performance.now();
    var REWIND = 1.2, CYCLE = FLOW_END + HOLD_END + REWIND;

    var stopped = false;
    function frame(now) {
      if (stopped) return;
      requestAnimationFrame(frame);
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!onScreen) return;                                    // 不在畫面上就暫停，省電
      clock += dt;
      if (playing) time += dt;
      if (time >= CYCLE) time -= CYCLE;
      var te = time < FLOW_END + HOLD_END ? time : (1 - (time - FLOW_END - HOLD_END) / REWIND) * FLOW_END;   // 最後快速倒帶
      try {
        update(te, clock);
        root.rotation.y = yaw + (reduce || drag ? 0 : Math.sin(clock * 0.25) * SWAY);
        root.scale.setScalar(zoom);
      } catch (err) {                                           // 萬一出錯：停止動畫並藏起這一段，不影響其他內容
        stopped = true; section.hidden = true;
        console.warn('3D 模型執行時發生錯誤，已略過這一段：', err);
      }
    }
    new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; }).observe(stage);

    stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('.tres-ui')) return;
      drag = { x: e.clientX, yaw: yaw }; stage.classList.add('dragging');
    });
    window.addEventListener('pointermove', function (e) { if (drag) yaw = drag.yaw + (e.clientX - drag.x) * 0.008; });
    var endDrag = function () { drag = null; stage.classList.remove('dragging'); };
    window.addEventListener('pointerup', endDrag); window.addEventListener('pointercancel', endDrag);

    var btn = function (id, fn) { var b = $(id); if (b) b.addEventListener('click', fn); };
    btn('tresPlay', function () {
      playing = !playing;
      this.textContent = playing ? '⏸' : '▶'; this.setAttribute('aria-label', playing ? '暫停' : '播放');
    });
    btn('tresReplay', function () { time = 0; playing = true; var b = $('tresPlay'); if (b) { b.textContent = '⏸'; b.setAttribute('aria-label', '暫停'); } });
    btn('tresIn',  function () { zoom = clamp(zoom * 1.2, 0.7, 2.2); });
    btn('tresOut', function () { zoom = clamp(zoom / 1.2, 0.7, 2.2); });
    if (reduce && $('tresPlay')) { $('tresPlay').textContent = '▶'; $('tresPlay').setAttribute('aria-label', '播放'); }

    // ---- 交給 TresJS：畫布、鏡頭、燈光用 Tres 的元件，模型用 primitive 放進去 ----
    var h = Vue.h;
    var aspect = stage.clientWidth / Math.max(1, stage.clientHeight);
    var dist = Math.max(15.5, (W * 1.12) / (2 * Math.tan(17.5 * Math.PI / 180) * aspect));   // 窄螢幕把鏡頭拉遠，整張圖才放得下
    var pitch = 42 * Math.PI / 180;
    var CAM = [0, Math.sin(pitch) * dist, Math.cos(pitch) * dist], LOOK = [0, 0.2, 0], SUN = [-5, 9, 6];
    var App = {
      setup: function () {
        Vue.onMounted(function () { update(time, 0); last = performance.now(); requestAnimationFrame(frame); });
        return function () {
          return h(Tres.TresCanvas, { clearColor: BG, antialias: true, toneMapping: THREE.NoToneMapping }, {
            default: function () {
              return [
                h('TresPerspectiveCamera', { position: CAM, fov: 35, 'look-at': LOOK }),
                h('TresAmbientLight', { intensity: 1.9 }),
                h('TresDirectionalLight', { position: SUN, intensity: 1.3 }),
                h('primitive', { object: root })
              ];
            }
          });
        };
      }
    };
    Vue.createApp(App).mount('#tresApp');
  }
})();
