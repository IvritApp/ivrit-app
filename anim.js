/*! Hirbis Animations — anim.js · window.HAnim · без зависимостей · нужен anim.css
 *
 * ┌──────────────┬───────────────────────────────────────────────────────────┬──────────────┐
 * │ ИМЯ          │ ГДЕ ВЫЗЫВАТЬ  →  HAnim.play("имя", {параметры})            │ ДЛИТЕЛЬНОСТЬ │
 * ├──────────────┼───────────────────────────────────────────────────────────┼──────────────┤
 * │ МАСКОТ: HAnim.mascot(el, mood) — idle talk think sleep wave dance point sad surprised run│
 * │   (идут по кругу) · happy 1,0 с · cheer 1,9 с · fly 1,3 с · flyout 0,9 с (потом idle)    │
 * ├──────────────┼───────────────────────────────────────────────────────────┼──────────────┤
 * │ correct      │ ответ верный {el}                                          │ 0,42 с       │
 * │ wrong        │ ответ неверный {el, correctEl}                             │ 0,42 с       │
 * │ banner       │ плашка-итог {ok, answer, text, button, onReport}           │ до нажатия   │
 * │ progress     │ полоска урока {el, value 0..1, streak}                     │ 0,45–1,1 с   │
 * │ pairPick     │ «Найди пары»: нажали плитку {el, on}                       │ 0,3 с        │
 * │ pairMatch    │ пара совпала {a, b}                                        │ 0,9 с        │
 * │ pairWrong    │ пара не совпала {a, b}                                     │ 0,45 с       │
 * │ chipMove     │ «Собери фразу»: слово летит {el, to}                       │ 0,32 с       │
 * │ blitz        │ таймер блица {el, seconds} → .stop()                       │ seconds      │
 * │ combo        │ огонь 5х/10х/15х {level}                                   │ 1,5–2,1 с    │
 * │ lessonEnd    │ конец урока {xp, streak, time, accuracy, counterEl, total} │ до нажатия   │
 * │ perfect      │ идеальный урок {xp}                                        │ 2,3 с        │
 * │ nodePulse    │ текущий узел дорожки {el, progress 0..1}                   │ 0,6 с + цикл │
 * │ unlock       │ открыть урок/уровень {el}                                  │ 1,2 с        │
 * │ chest        │ сундук {title, rewards:[{icon,text}]}                      │ до нажатия   │
 * │ medal        │ медаль главы {type: gold|silver|bronze, title, text}       │ до нажатия   │
 * │ homeSky      │ главный экран: небо {el, mascotEl}                         │ цикл         │
 * │ flip         │ счётчик в шапке {el, to}                                   │ 0,4 с        │
 * │ streak       │ серия продлена {day, first, week:[7×bool]}                 │ до нажатия   │
 * │ freeze       │ заморозка использована {day}                               │ до нажатия   │
 * │ streakRisk   │ серия под угрозой {day} → "go" | "later"                   │ до нажатия   │
 * │ alarm        │ экран «Поставь будильник» → "set" | "skip"                 │ до нажатия   │
 * │ gift         │ подари заморозку другу {name, avatar} → "gift" | "skip"    │ до нажатия   │
 * │ doors        │ квест: двери {el, inner}                                   │ 0,5 + 0,5 с  │
 * │ speech       │ персонаж говорит {el, text, hold}                          │ hold + 0,5 с │
 * │ tip          │ подсказка у элемента {el, text, hold}                      │ hold + 0,5 с │
 * │ found        │ предмет найден {el, to}                                    │ 1,0 с        │
 * │ voice        │ запись голоса {el, ms, text, out}                          │ ms + печать  │
 * │ questEnd     │ конец квеста {stars 1..3, title, next}                     │ до нажатия   │
 * │ call         │ сценка «звонок» {name, avatar} → "accept" | "decline"      │ до нажатия   │
 * │ chat         │ сценка «переписка» {name, messages:[{me,text}]}            │ до нажатия   │
 * │ screen       │ переход между экранами {from, to, dir}                     │ 0,24 с       │
 * │ press        │ нажатие кнопки {el} (обычно хватает класса ha-btn)         │ 0,12 с       │
 * │ toast        │ тост {text, pos: top|bottom, icon, ms}                     │ ms + 0,5 с   │
 * │ loading      │ загрузка {el, ms, text} → .stop()                          │ до stop()    │
 * │ confetti     │ {size: small|big}  (или HAnim.confetti)                    │ 0,9 / 2,6 с  │
 * └──────────────┴───────────────────────────────────────────────────────────┴──────────────┘
 *
 * ЗВУК: каждая анимация в свой «пик» вызывает options.onPeak(detail) и шлёт событие
 *   window.addEventListener("hanim:peak", e => playSound(...e.detail.name...))
 * Мелочи: HAnim.fire (живой огонь) · confetti · sparkle · countUp · shake · pop · flyTo · rec · type · clear
 * Уменьшение движения: само по prefers-reduced-motion; вручную HAnim.setReduced(true).
 */
(function () {
  "use strict";
  var D = document, W = window;
  var SPRING = "cubic-bezier(.34,1.56,.64,1)", OUT = "cubic-bezier(.22,1,.36,1)";
  var mq = W.matchMedia ? W.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var H = { reduced: !!mq.matches, version: "1.0" };

  H.setReduced = function (v) {
    H.reduced = !!v;
    D.documentElement.classList.toggle("ha-rm", H.reduced);
  };
  H.setReduced(H.reduced);
  if (mq.addEventListener) mq.addEventListener("change", function (e) { H.setReduced(e.matches); });

  /* ───────── помощники ───────── */
  function el(tag, cls, html) {
    var e = D.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function realWait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function wait(ms) { return realWait(H.reduced ? Math.min(ms, 60) : ms); }
  function rect(x) { return x && x.getBoundingClientRect ? x.getBoundingClientRect() : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function plural(n, a, b, c) {
    var d = n % 10, h = n % 100;
    return d === 1 && h !== 11 ? a : d >= 2 && d <= 4 && (h < 12 || h > 14) ? b : c;
  }
  /* Web Animations API; при «уменьшении движения» — мгновенно */
  function go(node, frames, o) {
    if (!node || !node.animate) return Promise.resolve();
    o = Object.assign({ duration: 300, easing: OUT, fill: "none" }, o);
    if (H.reduced) { o.duration = 1; o.delay = 0; }
    try { return node.animate(frames, o).finished.catch(function () {}); }
    catch (e) { return Promise.resolve(); }
  }
  function enter(node, delay, from) {
    return go(node, [{ opacity: 0, transform: from || "translateY(18px) scale(.86)" }, { opacity: 1, transform: "none" }],
      { duration: 420, delay: delay || 0, easing: SPRING, fill: "backwards" });
  }
  /* класс на время (CSS-анимация) */
  function once(node, cls, ms) {
    if (!node) return Promise.resolve();
    node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls);
    return wait(ms).then(function () { node.classList.remove(cls); });
  }
  function layer() {
    var l = D.getElementById("ha-layer");
    if (!l) { l = el("div"); l.id = "ha-layer"; D.body.appendChild(l); }
    return l;
  }
  function peak(name, o, detail) {
    var d = Object.assign({ name: name }, detail || {});
    try { if (o && typeof o.onPeak === "function") o.onPeak(d); } catch (e) {}
    try { W.dispatchEvent(new CustomEvent("hanim:peak", { detail: d })); } catch (e) {}
  }
  var bags = {};
  function pick(key, list) {               /* фразы без повторов подряд */
    if (!bags[key] || !bags[key].length) bags[key] = list.slice().sort(function () { return Math.random() - .5; });
    return bags[key].pop();
  }
  var PRAISE = ["Здорово!", "Превосходно!", "Сабаба!", "Отлично!", "Ялла, дальше!", "Так держать!", "Метуям!"];

  /* ───────── рисунки (SVG) ───────── */
  var CHECK = '<svg class="ha-ic" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var CROSS = '<svg class="ha-ic" viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>';
  var FLAG = '<svg class="ha-ic" viewBox="0 0 24 24"><path d="M6 21V4M6 5h11l-2.5 4L17 13H6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var MIC = '<svg class="ha-ic" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M6 11a6 6 0 0012 0M12 17v4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  var PHONE_IC = '<svg class="ha-ic" viewBox="0 0 24 24"><path d="M6.6 3.5l3 .4 1.2 4-2 1.6a12 12 0 005.7 5.7l1.6-2 4 1.2.4 3c.1 1.3-1 2.4-2.3 2.3C10.6 19.2 4.8 13.4 4.3 5.8 4.2 4.5 5.3 3.4 6.6 3.5z" fill="currentColor"/></svg>';
  var STAR_D = "M32 4l8.5 17.6 19.3 2.6-14.1 13.5 3.5 19.2L32 47.6 14.8 56.9l3.5-19.2L4.2 24.2l19.3-2.6z";
  var SPARK = '<svg viewBox="0 0 16 16"><path d="M8 0l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="currentColor"/></svg>';

  function flameSVG(cls) {
    return '<svg class="ha-flame ' + (cls || "") + '" viewBox="0 0 64 80"><path class="ha-fl-o" d="M32 2C36 18 54 26 54 48 54 66 44 78 32 78 20 78 10 66 10 48 10 38 16 32 20 24 22 32 26 34 28 30 30 22 28 12 32 2Z"/><path class="ha-fl-i" d="M32 40C36 48 42 52 42 60 42 68 38 74 32 74 26 74 22 68 22 60 22 52 28 48 32 40Z"/></svg>';
  }
  function iceSVG(cls) {
    return '<svg class="ha-ice ' + (cls || "") + '" viewBox="0 0 64 80"><path d="M32 2L56 22 50 62 32 78 14 62 8 22Z" fill="#bfe6ff"/><path d="M32 2L40 30 32 78 24 30Z" fill="#eefaff"/><path d="M8 22L24 30 14 62ZM56 22L40 30 50 62Z" fill="#8fd0f7"/></svg>';
  }
  function starSVG(cls) {
    return '<svg class="ha-star ' + (cls || "") + '" viewBox="0 0 64 64"><path d="' + STAR_D + '" fill="currentColor"/></svg>';
  }
  function medalSVG(type) {
    var c = { gold: ["#ffcf3f", "#f0a21c"], silver: ["#e3e8f0", "#a3aebf"], bronze: ["#eaa56e", "#c0723a"] }[type] || ["#ffcf3f", "#f0a21c"];
    return '<svg class="ha-medal-svg" viewBox="0 0 100 130"><path d="M28 0h18l10 46H40z" fill="#3a8ad6"/><path d="M72 0H54L44 46h16z" fill="#7a5ce0"/><circle cx="50" cy="86" r="40" fill="' + c[0] + '"/><circle cx="50" cy="86" r="31" fill="none" stroke="' + c[1] + '" stroke-width="5"/><path transform="translate(26 61) scale(.75)" d="' + STAR_D + '" fill="' + c[1] + '"/></svg>';
  }
  function chestSVG() {
    return '<svg class="ha-chest-svg" viewBox="0 0 120 112"><ellipse class="ha-chest-glow" cx="60" cy="52" rx="46" ry="16" fill="#ffcf3f"/><rect x="12" y="52" width="96" height="52" rx="10" fill="#c9792e"/><rect x="12" y="52" width="96" height="12" fill="#a85f1f"/><rect x="18" y="70" width="8" height="28" rx="3" fill="#ffcf3f"/><rect x="94" y="70" width="8" height="28" rx="3" fill="#ffcf3f"/><g transform="translate(12 54)"><g class="ha-chest-lid"><path d="M0 0V-14C0-28 12-36 26-36H70C84-36 96-28 96-14V0Z" fill="#e0913d"/><rect y="-9" width="96" height="9" fill="#ffcf3f"/><rect x="40" y="-14" width="16" height="20" rx="4" fill="#fff3c4"/></g></g></svg>';
  }
  function giftSVG() {
    return '<svg class="ha-gift-svg" viewBox="0 0 120 120"><rect x="18" y="54" width="84" height="58" rx="8" fill="#7a5ce0"/><rect x="52" y="54" width="16" height="58" fill="#ffcf3f"/><g transform="translate(60 54)"><g class="ha-gift-lid"><rect x="-48" y="-18" width="96" height="20" rx="6" fill="#9279ee"/><rect x="-8" y="-18" width="16" height="20" fill="#ffcf3f"/><path d="M0-18C-14-42-36-30-22-18ZM0-18C14-42 36-30 22-18Z" fill="#ffcf3f"/></g></g></svg>';
  }
  function lockSVG() {
    return '<svg class="ha-lock-svg" viewBox="0 0 48 56"><g class="ha-lock-sh"><path d="M14 26V16a10 10 0 0120 0v10" fill="none" stroke="#8d97a8" stroke-width="6" stroke-linecap="round"/></g><g class="ha-lock-b"><rect x="6" y="24" width="36" height="28" rx="7" fill="#b3bcc9"/><circle cx="24" cy="38" r="4.5" fill="#6f7a8c"/></g></svg>';
  }
  function phoneSVG(inner) {
    return '<svg class="ha-phone-svg" viewBox="0 0 70 120"><rect x="5" y="3" width="60" height="114" rx="13" fill="#2b2733"/><rect x="10" y="12" width="50" height="94" rx="6" fill="#eaf3fc"/><rect x="28" y="6" width="14" height="3" rx="1.5" fill="#514a5c"/>' + (inner || "") + "</svg>";
  }
  function avatarSVG(who) {
    var f = who === "tzila" || who === "f";
    return '<svg class="ha-ava" viewBox="0 0 64 64">' +
      (f ? '<path d="M10 34C10 16 20 7 32 7s22 9 22 27v25H10z" fill="#2f2622"/>' : "") +
      '<circle cx="32" cy="37" r="19" fill="#f2c6a0"/>' +
      (f ? '<path d="M13 33C14 19 22 13 32 13s18 6 19 20C42 31 36 25 33 20 28 27 20 31 13 33Z" fill="#2f2622"/>'
         : '<g fill="#2f2622"><circle cx="18" cy="23" r="7"/><circle cx="27" cy="17" r="8"/><circle cx="38" cy="17" r="8"/><circle cx="46" cy="23" r="7"/><circle cx="32" cy="21" r="7"/><circle cx="14" cy="30" r="5"/><circle cx="50" cy="30" r="5"/></g>') +
      '<circle cx="25" cy="39" r="3.8" fill="#2b2733"/><circle cx="39" cy="39" r="3.8" fill="#2b2733"/><circle cx="26.3" cy="37.7" r="1.3" fill="#fff"/><circle cx="40.3" cy="37.7" r="1.3" fill="#fff"/><path d="M26 47q6 5 12 0" fill="none" stroke="#b5654a" stroke-width="2.4" stroke-linecap="round"/></svg>';
  }
  /* Хибри — удод. Каждая подвижная часть лежит в своей группе с центром в (0,0). */
  function hibriSVG() {
    var K = "#2b2733", O = "#ff8f4e";
    var feathers = [-52, -26, 0, 26, 52].map(function (a) {
      return '<g class="ha-m-f" style="--a:' + a + 'deg"><path d="M0 4C-9-10-8-32 0-46 8-32 9-10 0 4Z" fill="' + O + '"/><path d="M0-46C-4.6-40-6-34-5.6-29L5.6-29C6-34 4.6-40 0-46Z" fill="' + K + '"/><path d="M-5.6-29L5.6-29 5.2-25.5-5.2-25.5Z" fill="#fff"/></g>';
    }).join("");
    var wing = '<path d="M2-4C-18 2-26 34-12 60 4 48 14 22 8-2Z" fill="' + K + '"/><path d="M-14 20L6 13M-16 33L5 26M-12 46L-1 40" stroke="#fff" stroke-width="5.5" stroke-linecap="round" fill="none"/>';
    function eye(x, px) {
      return '<g transform="translate(' + x + ' 78)"><g class="ha-m-eye"><g class="ha-m-eyeopen"><circle r="12.5" fill="#fff"/><g class="ha-m-pupil"><circle cx="' + px + '" cy="1" r="7.5" fill="' + K + '"/><circle cx="' + (px + 2.5) + '" cy="-2" r="2.6" fill="#fff"/></g></g><path class="ha-m-eyeshut" d="M-10 3Q0-9 10 3" fill="none" stroke="' + K + '" stroke-width="4" stroke-linecap="round"/></g></g>';
    }
    var leg = '<path d="M0 0V13M-6 14H6" stroke="#d9713a" stroke-width="4" stroke-linecap="round" fill="none"/>';
    return '<svg class="ha-m-svg" viewBox="0 0 200 210" aria-hidden="true">' +
      '<g transform="translate(100 198)"><ellipse class="ha-m-shadow" rx="42" ry="6" fill="#000"/></g>' +
      '<g transform="translate(100 196)"><g class="ha-m-root"><g class="ha-m-torso"><g transform="translate(-100 -196)">' +
        '<path d="M72 158L42 182 50 190 62 186 84 172Z" fill="' + K + '"/><path d="M53 180L72 166" stroke="#fff" stroke-width="4" stroke-linecap="round"/>' +
        '<g transform="translate(88 180)"><g class="ha-m-leg ha-m-legL">' + leg + '</g></g><g transform="translate(112 180)"><g class="ha-m-leg ha-m-legR">' + leg + "</g></g>" +
        '<ellipse cx="100" cy="140" rx="46" ry="44" fill="' + O + '"/><ellipse cx="100" cy="151" rx="29" ry="27" fill="#ffd2ad"/>' +
        '<g transform="translate(60 120)"><g class="ha-m-wing ha-m-wingL">' + wing + "</g></g>" +
        '<g transform="translate(140 120) scale(-1 1)"><g class="ha-m-wing ha-m-wingR">' + wing + "</g></g>" +
        '<g transform="translate(100 108)"><g class="ha-m-head"><g transform="translate(-100 -108)">' +
          '<g transform="translate(100 52)"><g class="ha-m-crest">' + feathers + "</g></g>" +
          '<circle cx="100" cy="80" r="40" fill="' + O + '"/>' +
          '<ellipse cx="70" cy="95" rx="8" ry="5" fill="#ff5d8f" opacity=".45"/><ellipse cx="130" cy="95" rx="8" ry="5" fill="#ff5d8f" opacity=".45"/>' +
          eye(83, 1.5) + eye(117, -1.5) +
          '<path class="ha-m-brow" d="M72 66L91 60M128 66L109 60" stroke="' + K + '" stroke-width="3.5" stroke-linecap="round" fill="none"/>' +
          '<g transform="translate(100 90)"><g class="ha-m-beak"><path class="ha-m-mouth" d="M-6 1L6 1 5 12 0 23-4 14Z" fill="#e5484d"/><g class="ha-m-jaw"><path d="M-5 1Q0-1 5 1 5 12-1 21-1 10-5 1Z" fill="#2a2230"/></g><g class="ha-m-beakup"><path d="M-7 0Q0-4 7 0 7 14-3 26-1 12-7 0Z" fill="#3a3140"/></g></g></g>' +
        "</g></g></g>" +
      "</g></g></g></g>" +
      '<g class="ha-m-zzz" fill="#3a8ad6" font-family="Arial,sans-serif" font-weight="700"><text x="146" y="52" font-size="22">z</text><text x="161" y="36" font-size="17">z</text><text x="173" y="23" font-size="13">z</text></g>' +
      '<g class="ha-m-dots"><circle cx="140" cy="50" r="4" fill="#fff" stroke="#d5dbe5"/><rect x="140" y="12" width="52" height="28" rx="14" fill="#fff" stroke="#d5dbe5"/><circle class="ha-m-dot" cx="154" cy="26" r="4" fill="#8d97a8"/><circle class="ha-m-dot" cx="166" cy="26" r="4" fill="#8d97a8"/><circle class="ha-m-dot" cx="178" cy="26" r="4" fill="#8d97a8"/></g>' +
      '<g class="ha-m-wind" stroke="#9cc6ee" stroke-width="4" stroke-linecap="round"><path d="M-6 96h26"/><path d="M-18 128h22"/><path d="M-4 160h20"/></g>' +
      "</svg>";
  }
  H.svg = { hibri: hibriSVG, flame: flameSVG, ice: iceSVG, star: starSVG, medal: medalSVG, avatar: avatarSVG, check: CHECK };

  /* ───────── МАСКОТ ───────── */
  var ONE = { happy: 1000, cheer: 1900, fly: 1300, flyout: 900 };
  H.mascot = function (host, mood, o) {
    if (!host) return null;
    o = o || {};
    var c = host._haM;
    if (!c || !c.el.isConnected) {
      var w = el("div", "ha-m", hibriSVG());
      host.appendChild(w);
      c = host._haM = { el: w, mood: null, timer: 0, done: Promise.resolve() };
      c.set = function (m, oo) {
        oo = oo || {};
        clearTimeout(c.timer);
        w.className = "ha-m"; void w.offsetWidth;
        w.className = "ha-m ha-m--" + m + (oo.flip ? " ha-m--flip" : "");
        if (oo.size) w.style.setProperty("--ha-m-size", oo.size + "px");
        c.mood = m;
        if (ONE[m]) {
          if (m === "cheer" && !H.reduced) setTimeout(function () { if (w.isConnected) H.sparkle(w, { count: 8 }); }, 480);
          c.done = new Promise(function (res) {
            c.timer = setTimeout(function () {
              if (m === "flyout") w.classList.add("ha-m--gone");
              else if (!oo.hold) c.set(oo.then || "idle");
              res();
            }, H.reduced ? 160 : ONE[m]);
          });
        } else c.done = Promise.resolve();
        return c;
      };
      /* клюв «говорит» ms миллисекунд поверх любого настроения: HAnim.mascot(el).talk(1500) */
      c.talk = function (ms) {
        w.classList.add("ha-m-talk"); clearTimeout(c.tt);
        c.tt = setTimeout(function () { w.classList.remove("ha-m-talk"); }, ms || 1200);
        return c;
      };
      c.destroy = function () { clearTimeout(c.timer); clearTimeout(c.bt); w.remove(); host._haM = null; };
      (function blink() {                      /* моргает раз в 3–5 с, иногда смотрит в сторону */
        c.bt = setTimeout(function () {
          if (!w.isConnected) return;
          if (c.mood !== "sleep" && c.mood !== "happy" && c.mood !== "dance") {
            w.classList.add("ha-m-blink");
            setTimeout(function () { w.classList.remove("ha-m-blink"); }, 130);
            if (c.mood === "idle" && Math.random() < .35) {
              var k = Math.random() < .5 ? "ha-m-lookL" : "ha-m-lookR";
              w.classList.add(k);
              setTimeout(function () { w.classList.remove(k); }, 1200);
            }
          }
          blink();
        }, 3000 + Math.random() * 2000);
      })();
    }
    if (mood == null && c.mood) return c;
    return c.set(mood || "idle", o);
  };

  /* ───────── МЕЛОЧИ ───────── */
  H.shake = function (node) { return once(node, "ha-shake", 420); };
  H.pop = function (node) { return once(node, "ha-pop", 360); };

  H.sparkle = function (node, o) {
    o = o || {};
    if (H.reduced || !node) return Promise.resolve();
    var r = rect(node), L = layer(), n = o.count || 6, ps = [];
    var cols = o.colors || ["#ffcf3f", "#ffffff", "#ffe58a", "#ff8a35"];
    for (var i = 0; i < n; i++) {
      var s = el("div", "ha-spark", SPARK), x, y;
      if (o.corners) {                       /* блёстки по углам кнопки */
        x = i % 2 ? r.right - 6 : r.left + 6; y = i % 4 < 2 ? r.top + 4 : r.bottom - 4;
        x += (Math.random() - .5) * 26; y += (Math.random() - .5) * 14;
      } else {
        var a = (i / n) * 6.283 + Math.random() * .5, rad = Math.max(r.width, r.height) * (.42 + Math.random() * .22);
        x = r.left + r.width / 2 + Math.cos(a) * rad; y = r.top + r.height / 2 + Math.sin(a) * rad;
      }
      var size = 10 + Math.random() * 12;
      s.style.cssText = "left:" + x + "px;top:" + y + "px;width:" + size + "px;height:" + size + "px;color:" + cols[i % cols.length];
      L.appendChild(s);
      var dx = (x - (r.left + r.width / 2)) * .25, dy = (y - (r.top + r.height / 2)) * .25 - 8;
      ps.push(go(s, [
        { transform: "translate(-50%,-50%) scale(0) rotate(0deg)", opacity: 0 },
        { transform: "translate(calc(-50% + " + dx * .6 + "px),calc(-50% + " + dy * .6 + "px)) scale(1.2) rotate(60deg)", opacity: 1, offset: .4 },
        { transform: "translate(calc(-50% + " + dx + "px),calc(-50% + " + dy + "px)) scale(0) rotate(140deg)", opacity: 0 }
      ], { duration: 520 + Math.random() * 260, delay: i * 35, fill: "both" }).then(s.remove.bind(s)));
    }
    return Promise.all(ps);
  };

  H.countUp = function (node, from, to, ms, fmt) {
    fmt = fmt || function (v) { return String(v); };
    return new Promise(function (res) {
      if (!node) return res();
      if (H.reduced || !ms) { node.textContent = fmt(to); return res(); }
      var t0 = performance.now();
      (function step(t) {
        var k = clamp((t - t0) / ms, 0, 1), e = 1 - Math.pow(1 - k, 3);
        node.textContent = fmt(Math.round(from + (to - from) * e));
        if (k < 1 && node.isConnected) requestAnimationFrame(step); else { node.textContent = fmt(to); res(); }
      })(t0);
    });
  };

  /* предмет летит по дуге от одного элемента к другому */
  H.flyTo = function (a, b, html, o) {
    o = o || {};
    var ra = rect(a), rb = rect(b);
    if (!ra || !rb) return Promise.resolve();
    var x0 = ra.left + ra.width / 2, y0 = ra.top + ra.height / 2;
    var dx = rb.left + rb.width / 2 - x0, dy = rb.top + rb.height / 2 - y0;
    var n = o.count || 1, dur = o.duration || 650, L = layer(), ps = [];
    var lift = o.arc == null ? clamp(50 + Math.abs(dx) * .3, 50, 150) : o.arc;
    for (var i = 0; i < n; i++) (function (i) {
      var ox = el("div", "ha-fly"), iy = el("div", "ha-fly-y"), c = el("div", "ha-fly-c", html == null ? "" : html);
      iy.appendChild(c); ox.appendChild(iy); L.appendChild(ox);
      ox.style.left = x0 + (n > 1 ? (Math.random() - .5) * 24 : 0) + "px"; ox.style.top = y0 + "px";
      var p;
      if (H.reduced) p = realWait(120);
      else p = Promise.all([
        go(ox, [{ transform: "translateX(0)" }, { transform: "translateX(" + dx + "px)" }],
          { duration: dur, delay: i * 70, easing: "ease-in-out", fill: "both" }),
        go(iy, [
          { transform: "translateY(0) scale(.6)", opacity: 0, easing: "ease-out" },
          { transform: "translateY(" + ((Math.min(0, dy) - lift) * .25) + "px) scale(1.1)", opacity: 1, offset: .12, easing: "ease-out" },
          { transform: "translateY(" + (Math.min(0, dy) - lift) + "px) scale(1.25)", opacity: 1, offset: .5, easing: "ease-in" },
          { transform: "translateY(" + dy + "px) scale(" + (o.endScale || .6) + ")", opacity: 1 }
        ], { duration: dur, delay: i * 70, easing: "linear", fill: "both" })
      ]);
      ps.push(p.then(function () { ox.remove(); if (b && b.classList) H.pop(b); }));
    })(i);
    return Promise.all(ps);
  };

  H.confetti = function (o) {
    if (typeof o === "string") o = { size: o };
    o = o || {};
    if (H.reduced) return Promise.resolve();
    var big = o.size === "big", n = o.count || (big ? 130 : 32), dur = o.duration || (big ? 2600 : 900);
    var w = W.innerWidth, h = W.innerHeight, dpr = Math.min(W.devicePixelRatio || 1, 2);
    var cv = el("canvas", "ha-confetti");
    cv.width = w * dpr; cv.height = h * dpr;
    D.body.appendChild(cv);
    var ctx = cv.getContext("2d");
    var cols = o.colors || ["#3a8ad6", "#3cae5c", "#e5484d", "#ff8a35", "#ffcf3f", "#7a5ce0"];
    var ox = (o.x == null ? .5 : o.x) * w, oy = (o.y == null ? .55 : o.y) * h, P = [];
    for (var i = 0; i < n; i++) {
      var p = { c: cols[i % cols.length], w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * 6.3, vr: (Math.random() - .5) * .35, t: Math.random() * 6.3, vt: .12 + Math.random() * .2 };
      if (big && i % 3) {                    /* дождь сверху */
        p.x = Math.random() * w; p.y = -20 - Math.random() * h * .5; p.vx = (Math.random() - .5) * 2.4; p.vy = 2.5 + Math.random() * 4; p.g = .05;
      } else {                               /* хлопушка */
        var ang = big ? (i % 2 ? -1.1 : -2.05) + (Math.random() - .5) * .7 : -1.57 + (Math.random() - .5) * 2.2;
        var sp = (big ? 9 : 5) + Math.random() * (big ? 9 : 6);
        p.x = big ? (i % 2 ? 0 : w) : ox; p.y = big ? h * .75 : oy;
        p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp; p.g = .32;
      }
      P.push(p);
    }
    return new Promise(function (res) {
      var t0 = performance.now(), last = t0;
      function frame(t) {
        var dt = Math.min((t - last) / 16.7, 3), k = (t - t0) / dur; last = t;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
        ctx.globalAlpha = k > .75 ? Math.max(0, (1 - k) / .25) : 1;
        for (var i = 0; i < P.length; i++) {
          var p = P[i];
          p.vy += p.g * dt; p.vx *= .985; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.t += p.vt * dt;
          var c = Math.cos(p.r), s = Math.sin(p.r);
          ctx.setTransform(c * dpr, s * dpr, -s * dpr, c * dpr, p.x * dpr, p.y * dpr);
          ctx.fillStyle = p.c;
          var hh = p.h * Math.abs(Math.cos(p.t));
          ctx.fillRect(-p.w / 2, -hh / 2, p.w, hh);
        }
        if (k < 1 && cv.isConnected) requestAnimationFrame(frame); else { cv.remove(); res(); }
      }
      requestAnimationFrame(frame);
    });
  };

  /* живой огонь на canvas. Язык пламени — поток кругов: у основания широкий, кверху сужается,
     по нему бежит волна (качается как настоящий), сверху отрываются маленькие язычки.
     HAnim.fire(el, {colors:[внешний, средний, ядро], sides:true}) → {stop()} */
  H.fire = function (host, o) {
    o = o || {};
    if (!host || H.reduced) return { stop: function () {} };
    var cols = o.colors || ["#ff8a35", "#ffcf3f", "#fff3c0"], w = o.width || host.clientWidth || 150;
    var cw = Math.round(w * 2.5), ch = Math.round(w * 2.5), dpr = Math.min(W.devicePixelRatio || 1, 2);
    var cv = el("canvas", "ha-fire-cv");
    cv.width = cw * dpr; cv.height = ch * dpr;
    cv.style.cssText = "width:" + cw + "px;height:" + ch + "px;margin-left:" + -cw / 2 + "px";
    host.innerHTML = ""; host.classList.add("ha-fire"); host.style.height = w * 1.25 + "px"; host.appendChild(cv);
    var ctx = cv.getContext("2d"), P = [], live = true, acc = 0, t0 = performance.now(), last = t0, baseY = ch - w * .36;
    var em = o.sides ? [[0, 1, 0], [-.5, .56, 2.1], [.5, .56, 4.2]] : [[0, 1, 0]];
    var SZ = [1, .6, .3], CUT = [1, .66, .4], rate = o.rate || 90;
    function frame(t) {
      if (!cv.isConnected) return;
      var dt = Math.min(Math.max(t - last, 0) / 1000, .05), pw = Math.max(0, Math.min(1, (t - t0) / (o.grow || 450))), ts = t / 1000, i, p, e, k;
      last = t;
      if (live) {
        acc += dt * rate;
        while (acc >= 1) {
          acc--;
          for (i = 0; i < em.length; i++) {
            e = em[i];
            var lick = Math.random() < .13;        /* маленький язычок, который отрывается выше */
            P.push({ e: e, off: (Math.random() - .5) * w * (lick ? .5 : .2) * e[1], k: 0,
              h: w * (1.12 + Math.random() * .25) * e[1] * (lick ? 1.32 : 1), r: w * .4 * e[1] * (lick ? .4 : .9 + Math.random() * .2),
              life: (.62 + Math.random() * .2) * (lick ? 1.15 : 1) });
          }
        }
      }
      for (i = P.length - 1; i >= 0; i--) { p = P[i]; p.k += dt / p.life; if (p.k >= 1) P.splice(i, 1); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cw, ch);
      for (k = 0; k < 3; k++) {                    /* три слоя: внешний, средний, ядро */
        ctx.fillStyle = cols[k]; ctx.beginPath();
        for (i = 0; i < P.length; i++) {
          p = P[i]; if (p.k > CUT[k]) continue;
          var kk = p.k, q1 = 1 - kk / CUT[k];
          var rr = p.r * pw * Math.min(1, kk * 9 + .55) * Math.pow(q1, 1.05) * SZ[k];
          if (rr < .7) continue;
          var wave = Math.sin(ts * 6.5 - kk * 4.6 + p.e[2]) * .17 + Math.sin(ts * 11 - kk * 7 + p.e[2] * 2) * .05;
          var x = cw / 2 + p.e[0] * w + p.off * (1 - kk) + wave * w * kk * p.e[1];
          var y = baseY - p.h * pw * kk + p.r * .32 * k * (1 - kk);
          ctx.moveTo(x + rr, y); ctx.arc(x, y, rr, 0, 6.2832);
        }
        ctx.fill();
      }
      if (live || P.length) requestAnimationFrame(frame); else cv.remove();
    }
    requestAnimationFrame(frame);
    return { stop: function () { live = false; }, el: cv };
  };

  /* запись голоса: HAnim.rec(btn, true/false);  печать по буквам: HAnim.type(el, text) */
  H.rec = function (btn, on) {
    if (!btn) return;
    var w = btn.querySelector(".ha-wave");
    if (on === false) { btn.classList.remove("ha-rec"); if (w) w.remove(); return; }
    if (getComputedStyle(btn).position === "static") btn.style.position = "relative";
    btn.classList.add("ha-rec");
    if (!w) btn.appendChild(el("span", "ha-wave", "<i></i><i></i><i></i><i></i><i></i>"));
  };
  H.type = function (node, text, cps) {
    return new Promise(function (res) {
      if (!node) return res();
      text = String(text || "");
      node.classList.add("ha-typing");
      if (H.reduced) { node.textContent = text; node.classList.remove("ha-typing"); return res(); }
      var chars = Array.from(text), i = 0; node.textContent = "";
      var t = setInterval(function () {
        /* огласовки добавляем вместе с буквой, чтобы точки не «прыгали» */
        do { node.textContent += chars[i++]; } while (i < chars.length && /[֑-ׇ]/.test(chars[i]));
        if (i >= chars.length || !node.isConnected) { clearInterval(t); node.classList.remove("ha-typing"); res(); }
      }, 1000 / (cps || 28));
    });
  };
  /* снять все состояния (зелёный/красный/галочку) с элемента */
  H.clear = function (node) {
    if (!node) return;
    node.classList.remove("ha-correct", "ha-wrong", "ha-picked", "ha-done", "ha-found", "ha-bounce", "ha-shake", "ha-pop");
    var c = node.querySelector(":scope > .ha-check"); if (c) c.remove();
  };

  /* ───────── окна поверх экрана ───────── */
  function ov(cls, inner, btn) {
    var o = el("div", "ha-ov " + cls, '<div class="ha-ov-body">' + inner + "</div>" + (btn || ""));
    D.body.appendChild(o); void o.offsetWidth; o.classList.add("ha-in");
    return o;
  }
  function BTN(text, color, key) {
    return '<button type="button" class="ha-btn ha-btn--' + (color || "blue") + ' ha-ov-btn" data-k="' + (key || "ok") + '">' + esc(text) + "</button>";
  }
  function closeOv(o) { o.classList.remove("ha-in"); return realWait(210).then(function () { o.remove(); }); }
  function tap(o) {                         /* ждём любую кнопку окна, отдаём её data-k */
    return new Promise(function (res) {
      o.addEventListener("click", function h(e) {
        var b = e.target.closest ? e.target.closest("[data-k]") : null;
        if (b) { o.removeEventListener("click", h); res(b.getAttribute("data-k")); }
      });
    });
  }
  function q(o, s) { return o.querySelector(s); }
  function addCheck(b) {
    if (getComputedStyle(b).position === "static") b.style.position = "relative";
    if (!b.querySelector(":scope > .ha-check")) b.appendChild(el("span", "ha-check", CHECK));
  }

  /* ───────── АНИМАЦИИ ───────── */
  var A = {};

  /* B · урок */
  A.correct = async function (o, pk) {
    var b = o.el; if (!b) return;
    b.classList.remove("ha-wrong", "ha-picked"); b.classList.add("ha-correct");
    addCheck(b); pk();
    H.sparkle(b, { corners: true, count: 6 });
    await once(b, "ha-bounce", 420);
  };
  A.wrong = async function (o, pk) {
    var b = o.el; if (!b) return;
    b.classList.remove("ha-picked"); b.classList.add("ha-wrong"); pk();
    var p = once(b, "ha-shake", 420);
    if (o.correctEl) { await wait(180); o.correctEl.classList.add("ha-correct"); addCheck(o.correctEl); H.pop(o.correctEl); }
    await p;
  };
  A.banner = function (o, pk) {
    return new Promise(function (res) {
      var old = D.querySelector(".ha-banner"); if (old) old.remove();
      var ok = o.ok !== false;
      var title = o.text || (ok ? pick("praise", PRAISE) : "Правильный ответ:");
      var b = el("div", "ha-banner " + (ok ? "ha-banner--ok" : "ha-banner--bad"),
        '<div class="ha-banner-row"><div class="ha-banner-ic">' + (ok ? CHECK : CROSS) + '</div><div class="ha-banner-tx"><b>' + esc(title) + "</b>" +
        (o.answer ? '<span dir="auto">' + esc(o.answer) + "</span>" : "") + '</div><button type="button" class="ha-banner-flag" aria-label="Пожаловаться">' + FLAG + "</button></div>" +
        '<button type="button" class="ha-btn ha-btn--' + (ok ? "green" : "red") + ' ha-banner-go">' + esc(o.button || (ok ? "ДАЛЕЕ" : "ПОНЯТНО")) + "</button>");
      D.body.appendChild(b); void b.offsetWidth; b.classList.add("ha-in"); pk({ ok: ok });
      q(b, ".ha-banner-flag").onclick = function () { if (o.onReport) o.onReport(); };
      q(b, ".ha-banner-go").onclick = function () {
        b.classList.remove("ha-in"); setTimeout(function () { b.remove(); }, 260); res();
      };
    });
  };
  A.progress = async function (o, pk) {
    var p = o.el; if (!p) return;
    if (!p.querySelector(".ha-pb-fill")) {
      p.classList.add("ha-pb");
      p.innerHTML = '<div class="ha-pb-track"><div class="ha-pb-fill"><i class="ha-pb-c1"></i><i class="ha-pb-c2"></i><i class="ha-pb-c3"></i><i class="ha-pb-shine"></i></div></div>';
    }
    var v = clamp(o.value == null ? 0 : o.value, 0, 1), s = o.streak || 0;
    q(p, ".ha-pb-fill").style.transform = "translateX(" + (v - 1) * 100 + "%)";
    p.classList.toggle("ha-pb--hot", s >= 5 && s < 10);
    p.classList.toggle("ha-pb--max", s >= 10);
    if (s >= 5) once(p, "ha-pb--run", 900);
    if (s === 2 || s === 5 || s === 10 || o.label) {
      pk({ streak: s });
      var l = el("div", "ha-pb-label", esc(o.label || s + " ПОДРЯД"));
      l.style.left = clamp(v * 100, 16, 84) + "%";
      p.appendChild(l);
      await wait(1100); l.remove();
    } else await wait(450);
  };
  A.pairPick = async function (o) {
    if (!o.el) return;
    o.el.classList.toggle("ha-picked", o.on !== false);
    await H.pop(o.el);
  };
  A.pairMatch = async function (o, pk) {
    var t = [o.a, o.b].filter(Boolean);
    t.forEach(function (x) { x.classList.remove("ha-picked", "ha-wrong"); x.classList.add("ha-correct"); once(x, "ha-bounce", 420); H.sparkle(x, { corners: true, count: 4 }); });
    pk(); await wait(700);
    t.forEach(function (x) { x.classList.remove("ha-correct"); x.classList.add("ha-done"); });
    await wait(200);
  };
  A.pairWrong = async function (o, pk) {
    var t = [o.a, o.b].filter(Boolean);
    t.forEach(function (x) { x.classList.remove("ha-picked"); x.classList.add("ha-wrong"); H.shake(x); });
    pk(); await wait(450);
    t.forEach(function (x) { x.classList.remove("ha-wrong"); });
  };
  A.chipMove = async function (o, pk) {
    var c = o.el, to = o.to; if (!c || !to) return;
    var r0 = rect(c);
    if (o.before) to.insertBefore(c, o.before); else to.appendChild(c);
    var r1 = rect(c), dx = r0.left - r1.left, dy = r0.top - r1.top;
    var lift = clamp(26 + Math.abs(dx) * .12, 26, 56);
    c.classList.add("ha-flying");
    await go(c, [
      { transform: "translate(" + dx + "px," + dy + "px) scale(1)", easing: "ease-out" },
      { transform: "translate(" + dx * .5 + "px," + (dy * .5 - lift) + "px) scale(1.1)", easing: "ease-in" },
      { transform: "translate(0,0) scale(1)" }
    ], { duration: 320, easing: "linear" });
    c.classList.remove("ha-flying"); pk();
    once(c, "ha-land", 220);
  };
  A.blitz = function (o, pk) {
    var host = o.el, total = o.seconds || 30, C = 163.4, stopped = false, tm;
    if (!host) return Promise.resolve();
    host.classList.add("ha-blitz"); host.classList.remove("ha-blitz--hurry");
    host.innerHTML = '<svg viewBox="0 0 64 64"><circle class="ha-blitz-bg" cx="32" cy="32" r="26"/><circle class="ha-blitz-arc" cx="32" cy="32" r="26" stroke-dasharray="' + C + '" stroke-dashoffset="0" transform="rotate(-90 32 32)"/></svg><b>' + total + "</b>";
    var arc = q(host, ".ha-blitz-arc"), num = q(host, "b"), t0 = performance.now(), res0;
    arc.style.setProperty("transition", "stroke-dashoffset " + total + "s linear", "important");
    requestAnimationFrame(function () { requestAnimationFrame(function () { arc.style.strokeDashoffset = C; }); });
    var p = new Promise(function (res) {
      res0 = res;
      tm = setInterval(function () {
        var left = Math.max(0, total - Math.floor((performance.now() - t0) / 1000));
        num.textContent = left;
        if (left <= 5 && left > 0) { if (!host.classList.contains("ha-blitz--hurry")) { host.classList.add("ha-blitz--hurry"); } pk({ left: left }); }
        if (left <= 0 || !host.isConnected) { clearInterval(tm); host.classList.remove("ha-blitz--hurry"); if (!stopped) res("timeout"); }
      }, 250);
    });
    var lastLeft = -1; var pk0 = pk;
    pk = function (d) { if (d.left !== lastLeft) { lastLeft = d.left; pk0(d); } };
    p.stop = function () {
      stopped = true; clearInterval(tm); host.classList.remove("ha-blitz--hurry");
      var cur = getComputedStyle(arc).strokeDashoffset; arc.style.setProperty("transition", "none", "important"); arc.style.strokeDashoffset = cur; res0("stopped");
    };
    return p;
  };
  A.combo = async function (o, pk) {
    var lv = o.level || 5, tier = lv >= 15 ? 3 : lv >= 10 ? 2 : 1;
    var side = function (k) { return '<div class="ha-combo-side ha-combo-side--' + k + '">' + flameSVG() + "</div>"; };
    var w = ov("ha-ov--clear ha-combo ha-combo--" + [5, 10, 15][tier - 1],
      '<div class="ha-combo-flash"></div><div class="ha-combo-stage"><div class="ha-combo-rays"></div><i class="ha-combo-ring"></i><i class="ha-combo-ring"></i><i class="ha-combo-ring"></i>' +
      (H.reduced && tier > 1 ? side("l") + side("r") : "") + '<div class="ha-combo-fl">' + flameSVG() + '</div></div><div class="ha-combo-num">' + lv + 'х</div><div class="ha-combo-tx">' +
      esc(o.text || (tier === 3 ? "ВАУ! ОГОНЬ!" : tier === 2 ? "ТЫ В УДАРЕ!" : "ОГОНЬ!")) + '</div><div class="ha-combo-bird"></div>');
    var stage = q(w, ".ha-combo-stage"), fl = q(w, ".ha-combo-fl"), num = q(w, ".ha-combo-num"), body = q(w, ".ha-ov-body");
    H.mascot(q(w, ".ha-combo-bird"), tier === 3 ? "surprised" : "happy", { hold: true });
    var FC = [["#ff8a35", "#ffcf3f", "#fff3c0"], ["#f0503a", "#ffa63a", "#ffe9a8"], ["#7a5ce0", "#b9a4ff", "#f3edff"]][tier - 1];
    var fire = H.fire(fl, { colors: FC, sides: tier > 1, });
    /* 1 · вспышка, огонь вырастает из искры */
    go(q(w, ".ha-combo-flash"), [{ opacity: 0 }, { opacity: .55, offset: .25 }, { opacity: 0 }], { duration: 800, fill: "both" });
    go(fl, [{ transform: "translateY(50px) scale(.06)", opacity: 0 }, { transform: "translateY(0) scale(1.2)", opacity: 1, offset: .6 }, { transform: "translateY(0) scale(1)", opacity: 1 }], { duration: 560, easing: SPRING, fill: "both" });
    w.querySelectorAll(".ha-combo-side").forEach(function (s, i) {
      var r = i ? 16 : -16;
      go(s, [{ transform: "translateY(50px) scale(.15) rotate(" + r * 2 + "deg)", opacity: 0 }, { transform: "translateY(0) scale(1) rotate(" + r + "deg)", opacity: 1 }], { duration: 480, delay: 240 + i * 90, easing: SPRING, fill: "both" });
    });
    if (tier > 1) go(q(w, ".ha-combo-rays"), [{ opacity: 0 }, { opacity: tier === 3 ? .34 : .22 }], { duration: 400, delay: 250, fill: "both" });
    enter(q(w, ".ha-combo-bird"), 200, "translateY(70px)");
    await wait(330);
    /* 2 · пик: ударные кольца, искры летят вверх, цифра «впечатывается» и досчитывает */
    pk({ level: lv });
    w.querySelectorAll(".ha-combo-ring").forEach(function (r, i) {
      if (i < tier) go(r, [{ transform: "scale(.3)", opacity: .9 }, { transform: "scale(" + (2.6 + i * .6) + ")", opacity: 0 }], { duration: 720, delay: i * 150, fill: "both" });
    });
    if (!H.reduced) for (var i = 0, n = [9, 16, 26][tier - 1]; i < n; i++) {
      var e = el("i", "ha-ember"), sz = 5 + Math.random() * 7;
      e.style.cssText = "width:" + sz + "px;height:" + sz + "px;margin-left:" + (Math.random() - .5) * 70 + "px" + (i % 3 ? "" : ";background:var(--ha-fl)");
      stage.appendChild(e);
      go(e, [{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: "translate(" + (Math.random() - .5) * (150 + tier * 60) + "px," + -(130 + Math.random() * (140 + tier * 50)) + "px) scale(.3)", opacity: 0 }],
        { duration: 700 + Math.random() * 600, delay: Math.random() * (350 + tier * 150), easing: "ease-out", fill: "both" });
    }
    go(num, [{ transform: "scale(3.4) rotate(-14deg)", opacity: 0 }, { transform: "scale(.88) rotate(4deg)", opacity: 1, offset: .6 }, { transform: "scale(1) rotate(0deg)", opacity: 1 }], { duration: 430, easing: "cubic-bezier(.3,0,.2,1)", fill: "both" });
    H.countUp(num, Math.max(1, lv - 4), lv, 420, function (v) { return v + "х"; });
    enter(q(w, ".ha-combo-tx"), 280);
    await wait(260);
    go(fl, [{ transform: "scale(1)" }, { transform: "scale(1.16)" }, { transform: "scale(1)" }], { duration: 340 });
    if (tier > 1) go(body, [{ transform: "translate(0,0)" }, { transform: "translate(-7px,3px)" }, { transform: "translate(6px,-3px)" }, { transform: "translate(-4px,2px)" }, { transform: "translate(0,0)" }], { duration: 300 });
    if (tier > 1) H.confetti({ size: "small", y: .42, count: tier === 3 ? 70 : 36 });
    if (tier === 3) H.sparkle(fl, { count: 14 });
    await wait([900, 1150, 1450][tier - 1]);
    fire.stop();
    await closeOv(w);
  };
  A.lessonEnd = async function (o, pk) {
    var xp = o.xp == null ? 40 : o.xp, st = o.streak == null ? 1 : o.streak;
    /* 1 · Хибри празднует на весь экран (нажатие — пропустить) */
    var a = ov("ha-end1", '<div class="ha-end1-bird"></div><div class="ha-h1">' + esc(o.title || "Урок пройден!") + "</div>");
    a.setAttribute("data-k", "skip");
    H.mascot(q(a, ".ha-end1-bird"), "cheer", { then: "dance" });
    enter(q(a, ".ha-h1"), 250);
    H.confetti("big");
    setTimeout(function () { pk({ stage: "cheer" }); }, H.reduced ? 0 : 450);
    await Promise.race([wait(1900), tap(a)]);
    await closeOv(a);
    /* 2 · итоги: три карточки по очереди */
    var useAcc = o.accuracy != null && (o.time == null || o.accuracy === 100 || o.third === "accuracy") && o.third !== "time";
    var secs = 0;
    if (o.time != null) { var m = String(o.time).split(":"); secs = m.length > 1 ? (+m[0]) * 60 + (+m[1]) : +o.time; }
    var card = function (cls, label, icon) { return '<div class="ha-card ' + cls + '"><span>' + label + '</span><div class="ha-card-v">' + icon + "<b>0</b></div></div>"; };
    var b = ov("ha-end2",
      '<div class="ha-end2-bird"></div><div class="ha-h1">' + esc(o.perfect ? "Идеально!" : "Вот это результат!") + '</div><div class="ha-cards">' +
      card("ha-card--xp", "Очки опыта", starSVG()) + card("ha-card--st", "Серия", flameSVG()) +
      card(useAcc ? "ha-card--acc" : "ha-card--time", useAcc ? "Точность" : "Время", "") + "</div>",
      BTN(o.button || "ЗАБРАТЬ ОПЫТ", "blue"));
    H.mascot(q(b, ".ha-end2-bird"), "happy", { then: "idle" });
    var cards = b.querySelectorAll(".ha-card"), vals = b.querySelectorAll(".ha-card-v b");
    var skip = false, done = tap(b).then(function () { skip = true; });
    var plan = [
      [0, xp, function (v) { return "+" + v; }],
      [0, st, function (v) { return "×" + v; }],
      useAcc ? [0, o.accuracy, function (v) { return v + "%"; }] : [0, secs, function (v) { return Math.floor(v / 60) + ":" + ("0" + (v % 60)).slice(-2); }]
    ];
    for (var i = 0; i < 3; i++) {
      if (skip) { vals[i].textContent = plan[i][2](plan[i][1]); cards[i].classList.add("ha-on"); continue; }
      cards[i].classList.add("ha-on"); enter(cards[i], 0); pk({ stage: "card", index: i });
      await Promise.race([H.countUp(vals[i], plan[i][0], plan[i][1], 550, plan[i][2]), done]);
      if (!skip) await Promise.race([wait(120), done]);
    }
    await done;
    var from = rect(cards[0]);
    await closeOv(b);
    if (o.counterEl) {
      await H.flyTo(from, o.counterEl, starSVG(), { count: 5, endScale: .5 });
      pk({ stage: "collect" });
      if (o.total != null) await A.flip({ el: o.counterEl, to: o.total }, function () {});
    }
  };
  A.perfect = async function (o, pk) {
    var xp = o.xp == null ? 40 : o.xp;
    var w = ov("ha-ov--dim ha-perfect",
      '<div class="ha-perfect-star"><div class="ha-rays"></div>' + starSVG() + '</div><div class="ha-h1">' + esc(o.title || "Идеальный урок!") + '</div><div class="ha-perfect-xp"><b>+' + xp + '</b><i>×2</i></div>');
    w.setAttribute("data-k", "skip");
    var star = q(w, ".ha-perfect-star"), num = q(w, ".ha-perfect-xp b"), x2 = q(w, ".ha-perfect-xp i");
    go(star, [{ transform: "scale(0) rotate(-200deg)", opacity: 0 }, { transform: "scale(1) rotate(0)", opacity: 1 }], { duration: 650, easing: SPRING, fill: "both" });
    enter(q(w, ".ha-h1"), 300); enter(num, 450);
    var t = tap(w);
    await Promise.race([wait(650), t]);
    H.sparkle(star, { count: 10 });
    await Promise.race([wait(350), t]);
    go(x2, [{ transform: "scale(3) rotate(-14deg)", opacity: 0 }, { transform: "scale(1) rotate(-8deg)", opacity: 1 }], { duration: 320, easing: "cubic-bezier(.5,0,.3,1.4)", fill: "both" });
    await Promise.race([wait(300), t]);
    pk({ xp: xp * 2 }); H.pop(num);
    await Promise.race([H.countUp(num, xp, xp * 2, 600, function (v) { return "+" + v; }), t]);
    num.textContent = "+" + xp * 2;
    await Promise.race([wait(700), t]);
    await closeOv(w);
  };

  /* C · дорожка и главная */
  A.nodePulse = async function (o) {
    var n = o.el; if (!n) return;
    if (getComputedStyle(n).position === "static") n.style.position = "relative";
    n.classList.add("ha-node-cur");
    var r = n.querySelector(":scope > .ha-node-ring");
    if (!r) {
      r = el("span", "ha-node-ring", '<svg viewBox="0 0 100 100"><circle class="ha-ring-bg" cx="50" cy="50" r="46"/><circle class="ha-ring-arc" cx="50" cy="50" r="46" stroke-dasharray="289" stroke-dashoffset="289" transform="rotate(-90 50 50)"/></svg>');
      n.appendChild(r); void r.offsetWidth;
    }
    q(r, ".ha-ring-arc").style.strokeDashoffset = 289 * (1 - clamp(o.progress == null ? 0 : o.progress, 0, 1));
    await wait(600);
  };
  A.unlock = async function (o, pk) {
    var n = o.el; if (!n) return;
    var r = rect(n), lk = el("div", "ha-lock", lockSVG());
    lk.style.left = r.left + r.width / 2 + "px"; lk.style.top = r.top + r.height / 2 + "px";
    layer().appendChild(lk);
    await once(lk, "ha-lock--shake", 520);
    lk.classList.add("ha-lock--break"); pk();
    n.classList.remove(o.lockedClass || "ha-locked"); n.classList.add(o.openClass || "ha-unlocked");
    go(n, [{ transform: "scale(.6)" }, { transform: "scale(1.22)", offset: .55 }, { transform: "scale(1)" }], { duration: 520, easing: SPRING });
    H.sparkle(n, { count: 8 });
    H.confetti({ size: "small", x: (r.left + r.width / 2) / W.innerWidth, y: (r.top + r.height / 2) / W.innerHeight, count: 22 });
    await wait(600); lk.remove();
  };
  A.chest = async function (o, pk) {
    var rw = o.rewards || [{ icon: "❄️", text: "Заморозка" }, { icon: "⭐", text: "+20 очков" }];
    var w = ov("ha-ov--dim ha-chest",
      '<div class="ha-h1">' + esc(o.title || "Сундук!") + '</div><div class="ha-chest-box"><div class="ha-rays"></div>' + chestSVG() + '</div><div class="ha-rewards">' +
      rw.map(function (r) { return '<div class="ha-reward"><span>' + (r.icon || "🎁") + "</span><b>" + esc(r.text || "") + "</b></div>"; }).join("") + "</div>",
      BTN(o.button || "ЗАБРАТЬ", "blue"));
    var box = q(w, ".ha-chest-box"), t = tap(w);
    await Promise.race([once(box, "ha-hop", 900), t]);
    w.classList.add("ha-open"); pk();
    H.sparkle(box, { count: 8 });
    var items = w.querySelectorAll(".ha-reward"), br = rect(box);
    items.forEach(function (it, i) {
      it.classList.add("ha-on");
      var ir = rect(it), dx = br.left + br.width / 2 - (ir.left + ir.width / 2), dy = br.top + br.height / 2 - (ir.top + ir.height / 2);
      go(it, [{ transform: "translate(" + dx + "px," + dy + "px) scale(.2)", opacity: 0, easing: "ease-out" },
        { transform: "translate(" + dx * .5 + "px," + (dy - 70) + "px) scale(1.15)", opacity: 1, easing: "ease-in" },
        { transform: "none", opacity: 1 }], { duration: 620, delay: 120 + i * 140, fill: "backwards", easing: "linear" });
    });
    await t; await closeOv(w);
  };
  A.medal = async function (o, pk) {
    var type = o.type || "gold";
    var names = { gold: "Золото", silver: "Серебро", bronze: "Бронза" };
    var w = ov("ha-ov--dim ha-medal",
      '<div class="ha-medal-box"><div class="ha-rays"></div><div class="ha-medal-m">' + medalSVG(type) + '</div></div><div class="ha-h1">' + esc(o.title || "Глава пройдена!") + '</div><div class="ha-sub">' + esc(o.text || names[type] + " — ялла, дальше!") + '</div><div class="ha-medal-bird"></div>',
      BTN(o.button || "ДАЛЕЕ", "blue"));
    var m = q(w, ".ha-medal-m"), t = tap(w);
    H.mascot(q(w, ".ha-medal-bird"), "dance");
    go(m, [{ transform: "translateY(-110vh) rotateY(0deg)", easing: "cubic-bezier(.5,0,.9,.6)" },
      { transform: "translateY(0) rotateY(540deg)", offset: .55, easing: "ease-out" },
      { transform: "translateY(-26px) rotateY(660deg)", offset: .75, easing: "ease-in" },
      { transform: "translateY(0) rotateY(720deg)" }], { duration: 1300, easing: "linear", fill: "both" });
    enter(q(w, ".ha-h1"), 700); enter(q(w, ".ha-sub"), 850);
    await Promise.race([wait(720), t]);
    pk({ type: type }); w.classList.add("ha-open");
    H.confetti("big"); H.sparkle(m, { count: 10 });
    await t; await closeOv(w);
  };
  A.homeSky = async function (o) {
    var h = o.el;
    if (h && !h.querySelector(":scope > .ha-sky")) {
      if (getComputedStyle(h).position === "static") h.style.position = "relative";
      h.insertBefore(el("div", "ha-sky", '<i class="ha-sun"></i><i class="ha-cloud ha-cloud--1"></i><i class="ha-cloud ha-cloud--2"></i><i class="ha-cloud ha-cloud--3"></i>'), h.firstChild);
    }
    if (o.mascotEl) H.mascot(o.mascotEl, "wave");
  };
  A.flip = async function (o, pk) {
    var n = o.el; if (!n) return;
    var a = n._haTo != null ? n._haTo : String(n.textContent), b = String(o.to);
    if (a === b) return;
    if (H.reduced) { n.textContent = b; return; }
    n._haTo = b.trim();
    var len = Math.max(a.length, b.length), up = (parseFloat(b) || 0) >= (parseFloat(a) || 0), html = "";
    a = a.padStart(len, " "); b = b.padStart(len, " ");
    for (var i = 0; i < len; i++) {
      html += a[i] === b[i] ? '<span class="ha-flip-d">' + esc(b[i]) + "</span>"
        : '<span class="ha-flip-d ha-flip-ch"><span class="ha-flip-old">' + esc(a[i]) + '</span><span class="ha-flip-new">' + esc(b[i]) + "</span></span>";
    }
    n.innerHTML = html; pk();
    var ch = n.querySelectorAll(".ha-flip-ch"), ps = [];
    ch.forEach(function (d, i) {
      var dl = (ch.length - 1 - i) * 60, y = up ? -100 : 100;
      ps.push(go(d.firstChild, [{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(" + y + "%)", opacity: 0 }], { duration: 260, delay: dl, easing: "ease-in", fill: "both" }));
      ps.push(go(d.lastChild, [{ transform: "translateY(" + -y + "%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 340, delay: dl + 60, easing: SPRING, fill: "both" }));
    });
    await Promise.all(ps);
    if (n._haTo === b.trim()) { n.textContent = b.trim(); n._haTo = null; }
  };

  /* D · серия */
  function bigFlame(day, cls) {
    return '<div class="ha-bigfl ' + (cls || "") + '"><div class="ha-bigfl-f">' + flameSVG() + '</div><div class="ha-bigfl-n">' + day + "</div></div>";
  }
  A.streak = async function (o, pk) {
    var day = o.day == null ? 1 : o.day, first = o.first || day === 1;
    var week = o.week || [0, 0, 0, 0, 0, 0, 0].map(function (_, i) { return i < Math.min(day, 7); });
    var today = o.today == null ? Math.min(day, 7) - 1 : o.today;
    var w = ov("ha-streak",
      bigFlame(first ? 0 : day - 1) + '<div class="ha-h1">' + esc(o.title || (first ? "Вы начали серию!" : "Серия продлена!")) + '</div><div class="ha-sub">' +
      esc(o.text || (first ? "Заходи каждый день — и огонёк будет расти" : day + " " + plural(day, "день", "дня", "дней") + " подряд. Сабаба!")) + '</div><div class="ha-week">' +
      ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(function (d, i) { return '<div class="ha-day' + (week[i] && i !== today ? " ha-on" : "") + '"><i>' + CHECK + "</i><span>" + d + "</span></div>"; }).join("") +
      '</div><div class="ha-streak-bird"></div>', BTN(o.button || "ДАЛЕЕ", "blue"));
    var t = tap(w), num = q(w, ".ha-bigfl-n");
    H.mascot(q(w, ".ha-streak-bird"), "idle");
    H.fire(q(w, ".ha-bigfl-f"));
    go(q(w, ".ha-bigfl"), [{ transform: "scale(.3)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 520, easing: SPRING, fill: "backwards" });
    enter(q(w, ".ha-h1"), 200); enter(q(w, ".ha-sub"), 300); enter(q(w, ".ha-week"), 400);
    await Promise.race([wait(750), t]);
    pk({ day: day });
    await A.flip({ el: num, to: day }, function () {});
    H.pop(q(w, ".ha-bigfl")); H.sparkle(q(w, ".ha-bigfl"), { count: 8 });
    var d = w.querySelectorAll(".ha-day")[today];
    if (d) { d.classList.add("ha-on"); H.pop(d); }
    H.mascot(q(w, ".ha-streak-bird"), "happy");
    await t; await closeOv(w);
  };
  A.freeze = async function (o, pk) {
    var day = o.day == null ? 1 : o.day;
    var w = ov("ha-freeze",
      '<i class="ha-frost ha-frost--t"></i><i class="ha-frost ha-frost--b"></i><i class="ha-frost ha-frost--l"></i><i class="ha-frost ha-frost--r"></i>' +
      '<div class="ha-freeze-box">' + bigFlame(day) + '<div class="ha-freeze-ice">' + iceSVG() + '</div></div><div class="ha-h1">' + esc(o.title || "Заморозка спасла серию!") + '</div><div class="ha-sub">' +
      esc(o.text || day + " " + plural(day, "день", "дня", "дней") + " в безопасности. Завтра — урок, ялла!") + "</div>", BTN(o.button || "ПОНЯТНО", "blue"));
    var t = tap(w);
    enter(q(w, ".ha-h1"), 500); enter(q(w, ".ha-sub"), 600);
    await Promise.race([wait(500), t]);
    go(q(w, ".ha-freeze-ice"), [{ transform: "translateY(-60vh) scale(1.6) rotate(-30deg)", opacity: 0 }, { transform: "translateY(0) scale(1.1) rotate(0)", opacity: .7, offset: .7 }, { transform: "scale(1)", opacity: .62 }], { duration: 560, easing: "cubic-bezier(.5,0,.6,1)", fill: "both" });
    await Promise.race([wait(400), t]);
    pk(); w.classList.add("ha-open");
    H.sparkle(q(w, ".ha-freeze-box"), { count: 10, colors: ["#bfe6ff", "#ffffff", "#8fd0f7"] });
    await t; await closeOv(w);
  };
  A.streakRisk = async function (o, pk) {
    var day = o.day == null ? 1 : o.day;
    var w = ov("ha-ov--dim ha-risk",
      '<div class="ha-sheet"><div class="ha-risk-row">' + bigFlame(day, "ha-bigfl--shiver") + '<div class="ha-risk-bird"></div></div><div class="ha-h1">' + esc(o.title || "Серия под угрозой!") + '</div><div class="ha-sub">' +
      esc(o.text || "Один короткий урок — и " + day + " " + plural(day, "день", "дня", "дней") + " останутся с тобой") + "</div>" +
      BTN(o.button || "УЧИТЬСЯ 3 МИНУТЫ", "orange", "go") + BTN("Позже", "ghost", "later") + "</div>");
    H.mascot(q(w, ".ha-risk-bird"), o.mood || "sleep"); pk();
    var k = await tap(w); await closeOv(w); return k;
  };
  A.alarm = async function (o, pk) {
    var w = ov("ha-alarm",
      '<div class="ha-alarm-row"><div class="ha-alarm-ph">' + phoneSVG('<circle cx="35" cy="54" r="17" fill="#ffcf3f"/><path d="M35 44v11l7 5" stroke="#2b2733" stroke-width="3.5" fill="none" stroke-linecap="round"/><rect x="18" y="82" width="34" height="8" rx="4" fill="#3a8ad6"/>') + '<i class="ha-ring-w"></i><i class="ha-ring-w ha-ring-w--2"></i></div><div class="ha-alarm-bird"></div></div><div class="ha-h1">' +
      esc(o.title || "Поставь будильник, чтобы не потерять серию") + '</div><div class="ha-sub">' + esc(o.text || "Хибри напомнит в удобное время — 3 минуты в день хватит") + "</div>",
      BTN(o.button || "ПОСТАВИТЬ НАПОМИНАНИЕ", "blue", "set") + BTN("Не сейчас", "ghost", "skip"));
    H.mascot(q(w, ".ha-alarm-bird"), "point", { flip: true });
    enter(q(w, ".ha-alarm-row"), 0); enter(q(w, ".ha-h1"), 150); enter(q(w, ".ha-sub"), 250); pk();
    var k = await tap(w); await closeOv(w); return k;
  };
  A.gift = async function (o, pk) {
    var name = o.name || "Друг";
    var w = ov("ha-ov--dim ha-gift",
      '<div class="ha-sheet"><div class="ha-h1">' + esc(o.title || "У друга кончились заморозки — подари одну!") + '</div><div class="ha-gift-row"><div class="ha-gift-me">' + iceSVG() + '<span>У тебя: ' + (o.have == null ? 2 : o.have) + '</span></div><div class="ha-gift-arrow"><i></i><i></i><i></i></div><div class="ha-gift-fr"><div class="ha-gift-ava">' + (o.avatar || avatarSVG("david")) + "</div><span>" + esc(name) + "</span></div></div>" +
      BTN(o.button || "ПОДАРИТЬ ЗАМОРОЗКУ", "blue", "gift") + BTN("Не сейчас", "ghost", "skip") + "</div>");
    var k = await tap(w);
    if (k === "gift") {
      var ava = q(w, ".ha-gift-ava");
      q(w, ".ha-gift-me").classList.add("ha-sent");
      await H.flyTo(q(w, ".ha-gift-me svg"), ava, iceSVG(), { duration: 750, arc: 90, endScale: .7 });
      pk(); H.sparkle(ava, { count: 8, colors: ["#bfe6ff", "#ffffff", "#ffcf3f"] });
      q(w, ".ha-h1").textContent = o.thanks || "Тода! " + name + " в безопасности";
      await wait(1100);
    }
    await closeOv(w); return k;
  };

  /* E · квесты */
  A.doors = async function (o, pk) {
    var h = o.el; if (!h) return;
    if (getComputedStyle(h).position === "static") h.style.position = "relative";
    h.classList.add("ha-doors-host");
    var inner = o.inner || h.firstElementChild;
    var l = el("i", "ha-door ha-door--l"), r = el("i", "ha-door ha-door--r");
    h.appendChild(l); h.appendChild(r);
    if (inner) go(inner, [{ transform: "scale(.84)" }, { transform: "scale(.84)" }], { duration: 300 });
    await wait(300); pk();
    var d = o.duration || 500;
    go(l, [{ transform: "translateX(0)" }, { transform: "translateX(-101%)" }], { duration: d, easing: "cubic-bezier(.6,0,.3,1)", fill: "both" });
    go(r, [{ transform: "translateX(0)" }, { transform: "translateX(101%)" }], { duration: d, easing: "cubic-bezier(.6,0,.3,1)", fill: "both" });
    if (inner) await go(inner, [{ transform: "scale(.84)" }, { transform: "scale(.84)", offset: .3 }, { transform: "scale(1)" }], { duration: d + 500, easing: "cubic-bezier(.4,0,.2,1)" });
    else await wait(d);
    l.remove(); r.remove(); h.classList.remove("ha-doors-host");
  };
  function bubble(o, cls) {
    var r = rect(o.el), b = el("div", "ha-bubble " + cls, '<span dir="auto">' + esc(o.text || "") + "</span>");
    layer().appendChild(b);
    var bw = Math.min(260, W.innerWidth - 24); b.style.maxWidth = bw + "px";
    var br = rect(b), cx = r.left + r.width / 2;
    var left = clamp(cx - br.width / 2, 12, W.innerWidth - br.width - 12);
    var below = o.pos === "below" || (o.pos !== "above" && r.top - br.height - 14 < 8);
    b.style.left = left + "px";
    b.style.top = (below ? r.bottom + 12 : r.top - br.height - 12) + "px";
    b.style.setProperty("--ha-tail", clamp(cx - left, 18, br.width - 18) + "px");
    b.style.transformOrigin = clamp(cx - left, 18, br.width - 18) + "px " + (below ? "-10px" : "calc(100% + 10px)");
    b.classList.add(below ? "ha-bubble--below" : "ha-bubble--above");
    return b;
  }
  async function showBubble(o, pk, cls, nod) {
    if (!o.el) return;
    var b = bubble(o, cls);
    go(b, [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 380, easing: SPRING, fill: "both" });
    pk();
    if (nod) once(o.el, "ha-nod", 1400);
    await wait(o.hold == null ? 1300 + String(o.text || "").length * 35 : o.hold);
    await go(b, [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(.6)", opacity: 0 }], { duration: 180, easing: "ease-in", fill: "both" });
    b.remove();
  }
  A.speech = function (o, pk) { return showBubble(o, pk, "ha-bubble--speech", true); };
  A.tip = function (o, pk) { return showBubble(o, pk, "ha-bubble--tip", false); };
  A.found = async function (o, pk) {
    var it = o.el; if (!it) return;
    await once(it, "ha-bounce", 380);
    addCheck(it); pk();
    H.sparkle(it, { count: 5 });
    await wait(220);
    if (o.to) await H.flyTo(it, o.to, o.html || it.innerHTML.replace(/<span class="ha-check">.*?<\/span>/, ""), { duration: 620 });
    it.classList.add("ha-found");
  };
  A.voice = async function (o, pk) {
    var b = o.el; if (!b) return;
    H.rec(b, true); pk({ stage: "rec" });
    if (o.out) o.out.textContent = "";
    await realWait(H.reduced ? 300 : (o.ms || 1800));
    H.rec(b, false);
    if (o.out && o.text) { pk({ stage: "text" }); await H.type(o.out, o.text, o.cps); }
  };
  A.questEnd = async function (o, pk) {
    var stars = o.stars == null ? 3 : o.stars;
    var w = ov("ha-ov--dim ha-qend",
      '<div class="ha-qend-box"><div class="ha-rays"></div>' + giftSVG() + '</div><div class="ha-qend-stars">' + [0, 1, 2].map(function (i) { return starSVG(i < stars ? "ha-star--on" : "ha-star--off"); }).join("") +
      '</div><div class="ha-h1">' + esc(o.title || "Квест пройден!") + '</div><div class="ha-qend-next">' + esc(o.next || "Следующий уровень открыт") + "</div>",
      BTN(o.button || "ДАЛЬШЕ", "blue"));
    var box = q(w, ".ha-qend-box"), t = tap(w), ss = w.querySelectorAll(".ha-qend-stars .ha-star");
    enter(q(w, ".ha-h1"), 250);
    await Promise.race([once(box, "ha-hop", 800), t]);
    w.classList.add("ha-open"); pk({ stage: "open" });
    H.confetti("big"); H.sparkle(box, { count: 8 });
    for (var i = 0; i < 3; i++) {
      go(ss[i], [{ transform: "scale(0) rotate(-120deg)", opacity: 0 }, { transform: "scale(1) rotate(0)", opacity: 1 }], { duration: 420, delay: 250 + i * 220, easing: SPRING, fill: "both" });
    }
    await Promise.race([wait(1000), t]);
    q(w, ".ha-qend-next").classList.add("ha-on"); pk({ stage: "next" });
    await t; await closeOv(w);
  };
  A.call = async function (o, pk) {
    var ring = el("div", "ha-ringer", phoneSVG('<circle cx="35" cy="58" r="14" fill="#3cae5c"/>'));
    D.body.appendChild(ring); pk({ stage: "ring" });
    await once(ring, "ha-ringer--on", 900); ring.remove();
    var w = ov("ha-call",
      '<div class="ha-call-top"><div class="ha-call-ava"><i></i><i></i>' + (o.avatar || avatarSVG(o.who || "david")) + '</div><div class="ha-h1">' + esc(o.name || "Давид") + '</div><div class="ha-sub ha-call-st">' + esc(o.text || "входящий звонок") + '<em class="ha-dots"><i></i><i></i><i></i></em></div></div>' +
      '<div class="ha-call-btns"><button type="button" class="ha-call-b ha-call-b--no" data-k="decline" aria-label="Отклонить">' + PHONE_IC + '</button><button type="button" class="ha-call-b ha-call-b--yes" data-k="accept" aria-label="Ответить">' + PHONE_IC + "</button></div>");
    pk({ stage: "screen" });
    var k = await tap(w); await closeOv(w); return k;
  };
  A.chat = async function (o, pk) {
    var msgs = o.messages || [], host = o.el, w = null;
    if (!host) {
      w = ov("ha-chat", '<div class="ha-chat-head"><div class="ha-chat-ava">' + (o.avatar || avatarSVG(o.who || "david")) + "</div><b>" + esc(o.name || "Давид") + '</b><span class="ha-chat-st"></span></div><div class="ha-chat-list"></div>', BTN(o.button || "ДАЛЕЕ", "blue"));
      host = q(w, ".ha-chat-list");
    }
    var st = w && q(w, ".ha-chat-st"), stop = false, t = w ? tap(w).then(function () { stop = true; }) : new Promise(function () {});
    for (var i = 0; i < msgs.length && !stop; i++) {
      var m = msgs[i];
      if (!m.me) {
        var ty = el("div", "ha-msg ha-msg--typing", '<em class="ha-dots"><i></i><i></i><i></i></em>');
        host.appendChild(ty); enter(ty, 0, "scale(.5)");
        if (st) st.textContent = "печатает…";
        await Promise.race([wait(m.delay || clamp(500 + String(m.text).length * 22, 600, 1500)), t]);
        ty.remove(); if (st) st.textContent = "в сети";
      } else await Promise.race([wait(m.delay || 500), t]);
      var b = el("div", "ha-msg" + (m.me ? " ha-msg--me" : ""), '<span dir="auto">' + esc(m.text) + "</span>");
      host.appendChild(b); host.scrollTop = host.scrollHeight;
      if (!stop) { enter(b, 0, "translateY(10px) scale(.7)"); pk({ index: i, me: !!m.me }); }
      await Promise.race([wait(350), t]);
    }
    for (; i < msgs.length; i++) host.appendChild(el("div", "ha-msg" + (msgs[i].me ? " ha-msg--me" : ""), '<span dir="auto">' + esc(msgs[i].text) + "</span>"));
    if (w) { await t; await closeOv(w); }
  };

  /* F · общие */
  A.screen = async function (o, pk) {
    var a = o.from, b = o.to, k = o.dir === "back" ? -1 : 1;
    if (a) await go(a, [{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: "translateX(" + -20 * k + "px)" }], { duration: 100, easing: "ease-in" });
    if (a) a.hidden = true;
    if (b) { b.hidden = false; pk(); await go(b, [{ opacity: 0, transform: "translateX(" + 24 * k + "px)" }, { opacity: 1, transform: "translateX(0)" }], { duration: 140, easing: OUT }); }
  };
  A.press = function (o) { return once(o.el, "ha-pressed", 120); };
  A.toast = async function (o, pk) {
    var top = o.pos !== "bottom";
    var t = el("div", "ha-toast " + (top ? "ha-toast--top" : "ha-toast--bottom"), (o.icon ? "<i>" + o.icon + "</i>" : "") + "<span>" + esc(o.text || "") + "</span>");
    D.body.appendChild(t); void t.offsetWidth; t.classList.add("ha-in"); pk();
    await realWait(o.ms || 2000);
    t.classList.remove("ha-in"); await realWait(280); t.remove();
  };
  A.loading = function (o, pk) {
    var host = o.el, w = null, res0;
    var inner = '<div class="ha-load"><div class="ha-load-bird"></div><div class="ha-load-ground"><i></i><i></i><i></i><i></i></div><div class="ha-sub">' + esc(o.text || "Загружаем") + '<em class="ha-dots"><i></i><i></i><i></i></em></div></div>';
    if (host) { host.innerHTML = inner; } else { w = ov("ha-loading", inner); host = w; }
    H.mascot(q(host, ".ha-load-bird"), "run"); pk();
    var p = new Promise(function (res) { res0 = res; });
    p.stop = function () {
      if (w) closeOv(w).then(res0); else { var l = q(host, ".ha-load"); if (l) l.remove(); res0(); }
    };
    if (o.ms) realWait(o.ms).then(p.stop);
    return p;
  };
  A.confetti = function (o, pk) { pk(); return H.confetti(o); };
  A.sparkle = function (o) { return H.sparkle(o.el, o); };

  H.play = function (name, o) {
    var f = A[name];
    if (!f) return Promise.reject(new Error("HAnim: нет анимации «" + name + "»"));
    o = o || {};
    try { return f(o, function (d) { peak(name, o, d); }) || Promise.resolve(); }
    catch (e) { return Promise.reject(e); }
  };
  H.list = function () { return Object.keys(A); };
  W.HAnim = H;
})();
