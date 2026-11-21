/* chest.js — анимация открытия сундука Hirbis.
 *
 * window.ChestFX.play({ kind: "chest"|"big"|"daily", steps: ["rare","super",…], reward: {type, amount, item} }) → Promise(reward)
 *   Результат уже решил сервер (/hapi/eco/open); здесь только показ:
 *   каждое касание экрана — сундук подпрыгивает; если в steps есть следующая ступень — редкость растёт
 *   («Уровень повышен!»), иначе через 1–2 касания сундук раскрывается и показывает награду.
 *   Promise выполняется, когда игрок нажал «Забрать».
 * Ещё: ChestFX.RARITY (имена и цвета), ChestFX.label(reward) → «+35 бурекасов», ChestFX.ORDER.
 * КАРТИНКИ (3D): assets/items/chest_<rarity>_closed|open.webp, cur_bur, cur_gem, rw_hearts, rw_freeze, rw_plus,
 *   rw_nick_coupon, badge_<…> (скин с id badge_*). Перед показом проверяется, есть ли файлы (кэш на сессию, ждём ≤0,9 с);
 *   есть все кадры сундука → <img> (кроссфейд при повышении, closed → open при раскрытии), иначе — SVG; награда так же.
 *   ChestFX.preload() — заранее прогреть все картинки (например, при входе в «Сундуки»). ChestFX.src(name) можно подменить.
 * Звук: в момент раскрытия window событие "hanim:peak" с detail {rarity, chest:true}.
 * Хибри (HAnim.mascot) — только на эпическом и выше; на легендарном салют и конфетти (HAnim.confetti).
 */
(function () {
  "use strict";
  var W = window, D = document;

  var ORDER = ["rare", "super", "epic", "mythic", "legendary"];
  var RARITY = {
    rare:      { name: "Редкий",       color: "#43c463", glow: "#4dff7d", light: "#a6f2b6" },
    super:     { name: "Сверхредкий",  color: "#3d8ff2", glow: "#4fadff", light: "#acd4ff" },
    epic:      { name: "Эпический",    color: "#9b5df2", glow: "#be85ff", light: "#dcc2ff" },
    mythic:    { name: "Мифический",   color: "#f04b4b", glow: "#ff5c5c", light: "#ffb6ad" },
    legendary: { name: "Легендарный",  color: "#ffc634", glow: "#ffd84d", light: "#fff2ab" }
  };
  var KIND = { chest: "Сундук", big: "Большой сундук", daily: "Ежедневный сундук" };
  var uid = 0, active = null;

  function reduced() {
    if (W.HAnim && W.HAnim.reduced) return true;
    return !!(W.matchMedia && W.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function vib(kind) {
    try {
      if (typeof W.vibrate === "function") { W.vibrate(kind); return; }      /* app.js: учитывает настройку «вибрация» */
      var hf = W.Telegram && W.Telegram.WebApp && W.Telegram.WebApp.HapticFeedback;
      if (hf) { if (kind === "success") hf.notificationOccurred("success"); else hf.impactOccurred(kind); return; }
      if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive)
        navigator.vibrate(kind === "heavy" ? 60 : kind === "medium" ? 30 : kind === "success" ? [30, 60, 40] : 12);
    } catch (e) {}
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function plural(n, one, few, many) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b === 1) return one;
    if (b >= 2 && b <= 4) return few;
    return many;
  }
  function el(tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function restart(node, cls) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }

  /* ───────── награда: иконка, заголовок, пояснение ───────── */
  function view(rw) {
    rw = rw || {};
    var n = Math.max(0, Math.round(+rw.amount || 0)), it = rw.item || {};
    switch (rw.type) {
      case "bur":   return { icon: "🥐", n: n, word: plural(n, "бурекас", "бурекаса", "бурекасов"), sub: "Трать на мини-игры, сундуки и полезные вещи" };
      case "gems":  return { icon: "💎", n: n, word: plural(n, "хибриллиант", "хибриллианта", "хибриллиантов"), sub: "Редкая валюта: скины, ники, большие сундуки" };
      case "plus":  return { icon: "👑", n: n || 1, word: plural(n || 1, "день", "дня", "дней") + " Hirbis Plus", sub: "Бесконечные ❤️ — учись без остановки" };
      case "skin":  return { icon: it.icon || "🎨", frame: !it.icon, title: "Скин: " + (it.name || "новый"), sub: "Надень его в «Мои вещи»" };
      case "hearts":return { icon: "❤️", title: "Полные сердечки", sub: "Все ❤️ снова полные" };
      case "freeze":return { icon: "❄️", title: "Заморозка серии", sub: "Серия не сгорит, если пропустишь день" };
      case "nick_coupon": return { icon: "🎟️", title: "Купон: редкий ник", sub: "Выбери себе особый ник" };
      default:      return { icon: "🎁", title: "Награда", sub: "" };
    }
  }
  function label(rw) {
    var v = view(rw);
    return v.n != null ? "+" + v.n + " " + v.word : v.title;
  }

  /* ───────── сундук (SVG, свой дизайн) ───────── */
  function chestSVG(kind) {
    var k = ++uid, g = function (s) { return s + k; };
    var OUT = 'stroke="#1b1030" stroke-width="4" stroke-linejoin="round"';
    var big = kind === "big", daily = kind === "daily";
    var metalBand = function (x) {
      return '<rect x="' + x + '" y="104" width="20" height="98" fill="url(#' + g("cxM") + ')" ' + OUT + '/>' +
        '<circle cx="' + (x + 10) + '" cy="120" r="3.6" fill="#fff6d0" stroke="#7d5413" stroke-width="1.6"/>' +
        '<circle cx="' + (x + 10) + '" cy="186" r="3.6" fill="#fff6d0" stroke="#7d5413" stroke-width="1.6"/>';
    };
    return '<svg viewBox="0 0 240 230" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      "<defs>" +
        '<linearGradient id="' + g("cxB") + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--c1)"/><stop offset="1" style="stop-color:var(--c2)"/></linearGradient>' +
        '<linearGradient id="' + g("cxL") + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--c3)"/><stop offset=".5" style="stop-color:var(--c1)"/><stop offset="1" style="stop-color:var(--c2)"/></linearGradient>' +
        '<linearGradient id="' + g("cxM") + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7d8"/><stop offset=".45" stop-color="#ecc764"/><stop offset="1" stop-color="#a06e1c"/></linearGradient>' +
        '<linearGradient id="' + g("cxS") + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".3"/><stop offset=".18" stop-color="#000" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></linearGradient>' +
        '<radialGradient id="' + g("cxI") + '"><stop offset="0" stop-color="#fff"/><stop offset=".45" style="stop-color:var(--c3)"/><stop offset="1" style="stop-color:var(--glow)" stop-opacity="0"/></radialGradient>' +
        '<clipPath id="' + g("cxD") + '"><path d="M28 106V84C28 56 48 44 76 44H164C192 44 212 56 212 84V106Z"/></clipPath>' +
        '<filter id="' + g("cxF") + '" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="4"/></filter>' +
      "</defs>" +
      '<ellipse cx="120" cy="212" rx="96" ry="13" fill="#000" opacity=".45"/>' +
      /* корпус */
      '<rect x="28" y="104" width="184" height="98" rx="18" fill="url(#' + g("cxB") + ')" ' + OUT + '/>' +
      '<rect x="30" y="106" width="180" height="94" rx="16" fill="url(#' + g("cxS") + ')"/>' +
      '<path d="M32 140H208M32 172H208" stroke="#000" stroke-opacity=".2" stroke-width="3"/>' +
      '<rect x="38" y="112" width="9" height="80" rx="4.5" fill="#fff" opacity=".2"/>' +
      metalBand(56) + metalBand(164) +
      (big ? '<path d="M28 172V184C28 194 36 202 46 202H62V172Z" fill="url(#' + g("cxM") + ')" ' + OUT + '/><path d="M212 172V184C212 194 204 202 194 202H178V172Z" fill="url(#' + g("cxM") + ')" ' + OUT + '/>' : "") +
      /* замок с камнем */
      '<rect x="95" y="110" width="50" height="56" rx="13" fill="url(#' + g("cxM") + ')" ' + OUT + '/>' +
      '<path d="M120 121L135 137L120 155L105 137Z" style="fill:var(--c1);stroke:var(--c2)" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M120 125L127 135L120 137L111 135Z" fill="#fff" opacity=".65"/>' +
      (daily ? '<path d="M200 108C214 116 214 130 206 140" fill="none" stroke="#5b3a12" stroke-width="3"/>' +
        '<g transform="translate(206 152)"><circle r="17" fill="#ffe27a" stroke="#1b1030" stroke-width="3.5"/>' +
        '<g stroke="#d48a08" stroke-width="3" stroke-linecap="round"><path d="M0-10V-6M0 6V10M-10 0H-6M6 0H10M-7-7L-4.5-4.5M4.5 4.5L7 7M-7 7L-4.5 4.5M4.5-4.5L7-7"/></g>' +
        '<circle r="4.5" fill="#ffb31a"/></g>' : "") +
      /* свет изнутри (виден при раскрытии) */
      '<ellipse class="cx-inner" cx="120" cy="104" rx="92" ry="18" fill="url(#' + g("cxI") + ')"/>' +
      '<rect class="cx-seam" x="30" y="99" width="180" height="8" rx="4" style="fill:var(--glow)" filter="url(#' + g("cxF") + ')"/>' +
      /* крышка */
      '<g class="cx-lid">' +
        '<path d="M28 106V84C28 56 48 44 76 44H164C192 44 212 56 212 84V106Z" fill="url(#' + g("cxL") + ')" ' + OUT + '/>' +
        '<g clip-path="url(#' + g("cxD") + ')"><rect x="56" y="40" width="20" height="70" fill="url(#' + g("cxM") + ')" stroke="#1b1030" stroke-width="3"/><rect x="164" y="40" width="20" height="70" fill="url(#' + g("cxM") + ')" stroke="#1b1030" stroke-width="3"/></g>' +
        '<path d="M28 106V84C28 56 48 44 76 44H164C192 44 212 56 212 84V106Z" fill="none" ' + OUT + '/>' +
        '<path d="M42 84C42 66 54 56 78 56H118C96 60 70 64 54 88Z" fill="#fff" opacity=".38"/>' +
        '<rect x="20" y="96" width="200" height="16" rx="8" fill="url(#' + g("cxM") + ')" ' + OUT + '/>' +
        '<rect x="28" y="99" width="150" height="4" rx="2" fill="#fff" opacity=".55"/>' +
        (big ? '<path d="M96 46L100 22L110 36L120 16L130 36L140 22L144 46Z" fill="url(#' + g("cxM") + ')" ' + OUT + '/><circle cx="120" cy="16" r="5" style="fill:var(--c1)" stroke="#1b1030" stroke-width="3"/>' : "") +
      "</g>" +
      "</svg>";
  }

  /* ───────── картинки (3D от Codex): assets/items/<имя>.webp; нет файла → SVG/эмодзи ───────── */
  var PROBE = {};                                  /* url → Promise(url|null), кэш на всю сессию */
  function probe(name) {
    if (!W.ChestFX.base) return Promise.resolve(null);   /* картинки выключены (22.11: вернулись к рисованному стилю) */
    var url = W.ChestFX.src(name);
    if (!PROBE[url]) PROBE[url] = new Promise(function (res) {
      var im = new Image();
      im.onload = function () { res(im.naturalWidth ? url : null); };
      im.onerror = function () { res(null); };
      im.src = url;
    });
    return PROBE[url];
  }
  function upTo(p, ms) { return Promise.race([p, new Promise(function (r) { setTimeout(function () { r(null); }, ms); })]); }
  var RW_IMG = { bur: "cur_bur", gems: "cur_gem", hearts: "rw_hearts", freeze: "rw_freeze", plus: "rw_plus", nick_coupon: "rw_nick_coupon" };
  function rewardImg(rw) {
    rw = rw || {};
    var it = rw.item || {};
    if (rw.type === "skin") return /^badge_/.test(it.id || "") ? it.id : null;   /* рамки и цвета ника — как раньше */
    return RW_IMG[rw.type] || null;
  }
  /* что из картинок есть для этого сундука: {closed:{rarity:url}, open:url, reward:url} */
  function prepare(steps, reward) {
    var last = steps[steps.length - 1];
    var names = steps.map(function (r) { return "chest_" + r + "_closed"; }).concat(["chest_" + last + "_open"]);
    var rn = rewardImg(reward);
    if (rn) names.push(rn);
    return Promise.all(names.map(function (n) { return upTo(probe(n), 900); })).then(function (urls) {
      var pics = { reward: rn ? urls[urls.length - 1] : null };
      var chest = urls.slice(0, steps.length + 1);
      if (chest.every(Boolean)) {                  /* только если есть ВСЕ кадры этого сундука — без смеси стилей */
        pics.closed = {};
        steps.forEach(function (r, j) { pics.closed[r] = chest[j]; });
        pics.open = chest[steps.length];
      }
      return pics;
    });
  }
  function preload() {
    var n = [];
    ORDER.forEach(function (r) { n.push("chest_" + r + "_closed", "chest_" + r + "_open"); });
    for (var k in RW_IMG) n.push(RW_IMG[k]);
    return Promise.all(n.map(probe));
  }

  /* ───────── эффекты ───────── */
  function sparks(host, n, o) {
    if (reduced()) return;
    o = o || {};
    var cols = o.colors || ["#fff"], d = o.dist || 160;
    for (var i = 0; i < n; i++) {
      var s = el("span", "cx-spark" + (i % 3 === 0 ? " cx-star" : ""));
      var a = Math.random() * Math.PI * 2, r = d * (.45 + Math.random() * .6);
      s.style.setProperty("--dx", Math.cos(a) * r + "px");
      s.style.setProperty("--dy", Math.sin(a) * r + (o.lift || 0) + "px");
      s.style.setProperty("--s", (o.size || 6) + Math.random() * 6 + "px");
      s.style.setProperty("--sc", cols[i % cols.length]);
      s.style.setProperty("--d", .6 + Math.random() * .5 + "s");
      if (o.y != null) s.style.top = o.y;
      host.appendChild(s);
      (function (s) { setTimeout(function () { s.remove(); }, 1300); })(s);
    }
  }
  function ring(host) {
    if (reduced()) return;
    var r = el("span", "cx-ring"); host.appendChild(r);
    setTimeout(function () { r.remove(); }, 800);
  }
  function firework(host, x, y) {
    var cols = ["#ffd84d", "#fff2ab", "#ff9a3c", "#ffffff", "#ffc634"];
    for (var i = 0; i < 18; i++) {
      var p = el("span", "cx-fw"), a = i / 18 * Math.PI * 2, r = 70 + Math.random() * 40;
      p.style.left = x + "%"; p.style.top = y + "%";
      p.style.setProperty("--dx", Math.cos(a) * r + "px");
      p.style.setProperty("--dy", Math.sin(a) * r + 20 + "px");
      p.style.setProperty("--sc", cols[i % cols.length]);
      host.appendChild(p);
      (function (p) { setTimeout(function () { p.remove(); }, 1200); })(p);
    }
  }

  /* ───────── экран ───────── */
  function play(o) {
    o = o || {};
    var steps = (o.steps || []).filter(function (s) { return RARITY[s]; });
    if (!steps.length) steps = [o.rarity && RARITY[o.rarity] ? o.rarity : "rare"];
    return prepare(steps, o.reward).catch(function () { return {}; }).then(function (pics) { return show(o, steps, pics); });
  }
  function show(o, steps, pics) {
    if (active) active.finish();
    var IMG = !!pics.closed;
    var kind = KIND[o.kind] ? o.kind : "chest", reward = o.reward || {}, v = view(reward);
    var RM = reduced(), timers = [], i = 0, topTaps = 0, need = Math.random() < .5 ? 1 : 2, busy = false, phase = "tap", lastTap = 0;
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

    var ov = el("div", "cx-ov" + (RM ? " cx-rm" : ""));
    ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", KIND[kind]); ov.tabIndex = -1;
    ov.innerHTML =
      '<div class="cx-bg"></div><div class="cx-flash"></div>' +
      '<div class="cx-top"><div class="cx-kind">' + KIND[kind] + '</div><div class="cx-rname"></div><div class="cx-pips">' +
        ORDER.map(function (r) { return '<i class="cx-pip" style="--pc:' + RARITY[r].color + '"></i>'; }).join("") + "</div></div>" +
      '<div class="cx-up">⬆ Уровень повышен!</div>' +
      '<div class="cx-stage"><div class="cx-rays"></div><div class="cx-beam"></div>' +
        '<div class="cx-chest' + (IMG ? " cx-imgmode" : "") + '" data-k="' + kind + '"><div class="cx-wrap"><div class="cx-body">' +
          (IMG ? '<div class="cx-pic"><span class="cx-shadow"></span><img class="cx-im" alt="" draggable="false" src="' + esc(pics.closed[steps[0]]) + '"></div>' : chestSVG(kind)) +
        "</div></div></div>" +
        '<div class="cx-reward"><div class="cx-ico">' +
          (pics.reward ? '<img class="cx-rimg" alt="" draggable="false" src="' + esc(pics.reward) + '">' :
            v.frame ? '<span class="cx-frame"></span>' : '<span class="cx-emo">' + v.icon + "</span>") + "</div>" +
          '<div class="cx-title">' + (v.n != null ? '<span class="cx-num">+0</span> ' + esc(v.word) : esc(v.title)) + "</div>" +
          (v.sub ? '<div class="cx-sub">' + esc(v.sub) + "</div>" : "") + '<div class="cx-rtag"></div></div>' +
      "</div>" +
      '<div class="cx-bird"></div>' +
      '<div class="cx-foot"><div class="cx-hint">ЖМИ!<small>касайся экрана</small></div><button class="cx-take" type="button" tabindex="-1">ЗАБРАТЬ</button></div>';
    D.body.appendChild(ov);
    var q = function (s) { return ov.querySelector(s); };
    var body = q(".cx-body"), stage = q(".cx-stage"), rname = q(".cx-rname"), pips = ov.querySelectorAll(".cx-pip");
    var rays = q(".cx-rays"), up = q(".cx-up"), flash = q(".cx-flash"), bird = q(".cx-bird"), take = q(".cx-take"), hint = q(".cx-hint");

    function setRarity(r, pop) {
      ov.setAttribute("data-r", r);
      rname.textContent = RARITY[r].name;
      q(".cx-rtag").textContent = RARITY[r].name;
      var n = ORDER.indexOf(r);
      for (var j = 0; j < pips.length; j++) { pips[j].classList.toggle("on", j <= n); pips[j].classList.toggle("cur", j === n && phase === "tap"); }
      if (pop) restart(rname, "cx-pop");
    }
    function cols() { var r = RARITY[steps[i]]; return [r.glow, "#ffffff", r.light]; }
    /* режим картинок: новая картинка ложится сверху и проявляется, старая уходит */
    function swapPic(url, cls) {
      var box = q(".cx-pic"); if (!box || !url) return;
      var olds = box.querySelectorAll(".cx-im");
      var im = el("img", "cx-im " + cls); im.alt = ""; im.draggable = false; im.src = url;
      box.appendChild(im);
      later(function () { for (var j = 0; j < olds.length; j++) olds[j].remove(); }, RM ? 0 : 480);
    }
    function showBird(mood, opt) {
      if (!W.HAnim || !W.HAnim.mascot) return;
      bird.classList.add("cx-show");
      W.HAnim.mascot(bird, mood, opt);
    }
    function hit() {
      body.style.setProperty("--amp", 1 + i * .25 + topTaps * .35);
      restart(body, "cx-hit");
      sparks(stage, 6, { colors: cols(), dist: 110, size: 4 });
      vib("light");
    }
    function upgrade() {
      i++;
      var r = steps[i], n = ORDER.indexOf(r);
      hit();
      setRarity(r, true);
      if (IMG) swapPic(pics.closed[r], "cx-fadein");
      restart(flash, "cx-go"); ring(stage); restart(up, "cx-go");
      rays.classList.add("cx-burst"); later(function () { rays.classList.remove("cx-burst"); }, 520);
      sparks(stage, 16 + n * 4, { colors: cols(), dist: 190 });
      vib(n >= 2 ? "heavy" : "medium");
      if (n >= 2) showBird("surprised", { hold: true });
    }
    function open() {
      phase = "open";
      for (var j = 0; j < pips.length; j++) pips[j].classList.remove("cur");
      hint.style.visibility = "hidden";
      restart(body, "cx-charge");
      vib("medium");
      var r = steps[i], n = ORDER.indexOf(r);
      later(function () {
        restart(flash, "cx-go");
        ov.classList.add("cx-open");
        if (IMG) swapPic(pics.open, "cx-openin");
        ring(stage);
        sparks(stage, 30 + n * 6, { colors: cols(), dist: 230, lift: -40 });
        vib(n >= 3 ? "heavy" : "success");
        try { W.dispatchEvent(new CustomEvent("hanim:peak", { detail: { rarity: r, chest: true, kind: kind, reward: reward.type, mode: IMG ? "img" : "svg" } })); } catch (e) {}
        later(function () { ov.classList.add("cx-shown"); }, RM ? 0 : 200);
        if (v.n != null) later(roll, RM ? 0 : 520);
        if (n >= 2) later(function () { showBird("cheer", { then: "dance" }); }, RM ? 0 : 450);
        if (W.HAnim && W.HAnim.confetti && !RM) {
          if (n === 4) {
            later(function () { W.HAnim.confetti("big"); }, 500);
            [[22, 18, 650], [76, 14, 950], [50, 9, 1250], [18, 34, 1550], [82, 30, 1850]].forEach(function (f) {
              later(function () { firework(ov, f[0], f[1]); }, f[2]);
            });
          } else if (n === 3) later(function () { W.HAnim.confetti({ size: "small", y: .42, count: 46, colors: ["#ff5c5c", "#ffb6ad", "#ffffff", "#ffd84d"] }); }, 500);
        }
        later(function () {
          phase = "done"; ov.classList.add("cx-done");
          take.classList.add("cx-show"); take.tabIndex = 0;
          try { take.focus({ preventScroll: true }); } catch (e) {}
        }, RM ? 250 : 1350);
      }, RM ? 60 : 560);
    }
    function roll() {
      var num = q(".cx-num"); if (!num) return;
      var to = v.n, t0 = 0, dur = RM ? 0 : Math.min(1100, 500 + to * 6), last = -1;
      if (!dur) { num.textContent = "+" + to; return; }
      function fr(t) {
        if (!ov.isConnected) return;
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / dur), val = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (val !== last) {
          last = val; num.textContent = "+" + val;
          if (val !== to) restart(num, "cx-tick");
        }
        if (p < 1) W.requestAnimationFrame(fr);
        else { restart(num, "cx-tick"); sparks(q(".cx-reward"), 10, { colors: cols(), dist: 90, size: 4, y: "60%" }); }
      }
      W.requestAnimationFrame(fr);
      later(function () { last = to; num.textContent = "+" + to; }, dur + 400);   /* если вкладка в фоне и кадры стоят */
    }
    function tap() {
      if (phase !== "tap" || busy) return;
      lastTap = Date.now();
      if (i < steps.length - 1) { busy = true; upgrade(); later(function () { busy = false; }, RM ? 150 : 620); return; }
      topTaps++;
      if (topTaps >= need) open();
      else { busy = true; hit(); later(function () { busy = false; }, RM ? 120 : 380); }
    }

    /* сундук «просится»: покачивается, если долго не трогают */
    (function idle() {
      later(function () {
        if (phase !== "tap") return;
        if (Date.now() - lastTap > 1800 && !RM) restart(body, "cx-idle");
        idle();
      }, 2300);
    })();

    var resolveFn;
    var promise = new Promise(function (res) { resolveFn = res; });
    function finish() {
      if (!ov.isConnected || ov._closing) return;
      ov._closing = true;
      timers.forEach(clearTimeout);
      if (active === api) active = null;
      ov.classList.add("cx-out");
      setTimeout(function () { ov.remove(); }, RM ? 0 : 240);
      resolveFn(reward);
    }
    var api = { finish: finish };
    active = api;

    ov.addEventListener("pointerdown", function (e) {
      if (e.target === take || e.button > 0) return;
      e.preventDefault();
      tap();
    });
    ov.addEventListener("keydown", function (e) {
      if ((e.key === " " || e.key === "Enter") && phase === "tap") { e.preventDefault(); tap(); }
    });
    take.addEventListener("click", function (e) { e.stopPropagation(); if (phase === "done") { vib("light"); finish(); } });

    setRarity(steps[0]);
    W.requestAnimationFrame(function () { ov.classList.add("cx-in"); try { ov.focus({ preventScroll: true }); } catch (e) {} });
    return promise;
  }

  W.ChestFX = {
    play: play, label: label, preload: preload, RARITY: RARITY, ORDER: ORDER, KIND: KIND,
    base: "",            /* 22.11: 3D-картинки выключены (владелец: «слишком нейросетевые»); включить — "assets/items/" */
    src: function (name) { return W.ChestFX.base + name + ".webp"; }   /* можно подменить (тесты) */
  };
})();
