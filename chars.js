// =====================================================
// ПЕРСОНАЖИ-КАРТИНКИ (3D, из ChatGPT/Codex; нарезка — claude-docs/tools/slice_sheet.ps1 → PNG,
// потом claude-docs/tools/to_webp.ps1 → assets/chars/<id>_<кадр>.webp (~45 КБ вместо ~280 КБ); PNG в репозиторий не кладём)
// Кадры лежат стопкой, видимый выбирается классом:
//   обычный neutral · моргает blink (сам, раз в 3–5 с) · говорит — talk/neutral по очереди (.talking или .act-talk)
//   радуется happy (.act-cheer / .ci-happy) · «ой» oops (.act-oops / .ci-oops)
//   лист B: думает think (.act-think) · машет wave (.act-wave) · показывает point · слушает listen · удивлён surprised (.ci-<кадр>)
// Пока у персонажа нет картинок — рисуется прежний SVG (avatar.js).
// =====================================================
(function () {
  const V = "20261123b";      // 22.11: плоский стиль «B» (Codex, листы flat_*.png); talk/blink выровнены по голове (align_frames.ps1)
  // какие кадры уже есть (исходники — Desktop\Клод\Фото от ChatGPT\*.png).
  // Люди — холст 360×768, один масштаб, ступни на одной линии (slice_sheet.ps1). Хибри — холст 600×640 (он круглый и широкий).
  const A = ["neutral", "talk", "blink", "happy", "oops"], AB = A.concat(["think", "wave", "point", "listen", "surprised"]);
  // 23.11: 20 готовых героев плоского стиля (assets/chars/hero_*_{neutral,talk,blink,happy,oops}.webp) — для экрана «Выбери героя» (ещё не сделан)
  const HEROES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(x => "hero_m" + x).concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(x => "hero_f" + x));
  // 22.11: 3D отменено («слишком нейросетевое», резерв — Desktop\Клод\Project\ivrit-app\Картинки 3D (резерв)).
  // Теперь плоский стиль «B»: пока только Давид и Циля, лист A (лист B Codex нарисовал неверно — ждём переделку, тогда A → AB).
  // ХИБРИ СЮДА НЕ ДОБАВЛЯТЬ: он остаётся рисованным SVG из anim.js (решение владельца). Герои — когда нарисуют (CHARS[h] = A).
  const CHARS = { david: AB, tzila: AB };
  // 23.11: люди квестов (Codex, плоский стиль, лист A) — для новых квестов quest2.js ("npc" в content/he/quests2/*.json)
  ["seller", "grocer", "driver", "neighbor", "waitress", "vendor", "doctor", "boss", "clerk", "landlord",
   "avi", "rina", "tova", "shlomo", "talia", "yosef", "irit", "batya", "moti", "igor"].concat(HEROES).forEach(id => { CHARS[id] = A; });   // + семьи Давида и Цили + 20 героев игрока
  const SIZE = { hibri: [600, 640] };                          // у остальных 360×768
  const ENABLED = true;
  const has = (id) => ENABLED && !!CHARS[id];
  // живые персонажи (гибрид: части из одного рисунка + целые кадры для «ура» и «машет») — ВКЛЮЧЕНЫ (владелец 27.11);
  // выключить для сравнения — localStorage hirbis_rig_on = 0 (ключ в NOSYNC)
  const RIG_ON = () => { try { return localStorage.getItem("hirbis_rig_on") !== "0"; } catch (e) { return true; } };

  window.charImgHTML = function (id, cls) {
    if (!has(id)) return "";
    // 27.11: у кого есть части (rig.js: Давид, Циля) — живой персонаж из частей вместо кадров
    if (window.HirbisRig && HirbisRig.has(id) && RIG_ON()) return HirbisRig.html(id, cls);
    const b = CHARS[id].includes("think") ? " ci-b" : "";   // есть лист B (думает, машет…)
    const [w, h] = SIZE[id] || [360, 768];
    return `<div class="ci${b} ${cls || ""}" data-char="${id}" style="aspect-ratio:${w}/${h}">${CHARS[id].map(f =>
      `<img class="ci-f ci-${f}" src="assets/chars/${id}_${f}.webp?v=${V}" width="${w}" height="${h}" decoding="async" alt="" draggable="false">`).join("")}</div>`;
  };

  // моргание: всем видимым персонажам-картинкам по очереди (если картинки выключены — таймер не нужен)
  if (ENABLED) setInterval(() => {
    document.querySelectorAll(".ci").forEach(el => {
      // без offsetParent — он заставляет браузер пересчитывать раскладку
      if (Math.random() < .45 && !el.closest("[hidden]")) { el.classList.add("ci-blinking"); setTimeout(() => el.classList.remove("ci-blinking"), 160); }
    });
  }, 1700);

  // Друг в уроке: Давид для парня, Циля для девушки
  const oldFriend = window.friendFigureSVG;
  window.friendFigureSVG = function (gender) {
    const id = gender === "f" ? "tzila" : "david";
    return has(id) ? charImgHTML(id) : (oldFriend ? oldFriend(gender) : "");
  };
  window.HirbisChars = { has, CHARS, HEROES, V };

  // ===== 3D-ХИБРИ вместо нарисованного кодом (22.11) =====
  // anim.js грузится ПОСЛЕ chars.js, поэтому подменяем HAnim.mascot, когда все скрипты загружены.
  // API тот же: HAnim.mascot(el, mood, {size}) → {el, mood, set(mood, o), talk(ms), destroy(), done}.
  // Настроения → кадры: idle — обычный; talk — говорит; happy/cheer/dance/fly — радуется (cheer/dance — с прыжком);
  // sad — «ой»; think, wave, point, listen, surprised — свои кадры; sleep — глаза закрыты; flyout — улетает (исчезает).
  const MOOD = { happy: "ci-happy", cheer: "ci-happy ci-hop", dance: "ci-happy ci-hop", fly: "ci-happy ci-hop", run: "ci-happy ci-hop",
    sad: "ci-oops", think: "ci-think", wave: "ci-wave", point: "ci-point", listen: "ci-listen", surprised: "ci-surprised", sleep: "ci-sleep",
    flyout: "ci-happy ci-flyout", talk: "talking" };
  const ONE = { happy: 1000, cheer: 1900, fly: 1300, flyout: 900 };     // как в anim.js: эти настроения сами возвращаются в idle
  function mascot3D(host, mood, o) {
    if (!host) return null;
    o = o || {};
    let c = host._haM;
    if (!c || !c.el.isConnected) {
      if (c && c.destroy) c.destroy();
      const w = document.createElement("div");
      w.className = "ha-m ha-m3d";
      w.innerHTML = charImgHTML("hibri");
      host.appendChild(w);
      const ci = w.firstElementChild;
      c = host._haM = { el: w, mood: null, timer: 0, done: Promise.resolve() };
      c.set = function (m, oo) {
        oo = oo || {};
        clearTimeout(c.timer);
        ci.className = "ci ci-b " + (MOOD[m] || "");
        if (oo.size) w.style.setProperty("--ha-m-size", oo.size + "px");
        w.classList.toggle("ha-m--flip", !!oo.flip);
        c.mood = m;
        if (m === "cheer" && window.HAnim && HAnim.sparkle && !HAnim.reduced) setTimeout(() => { if (w.isConnected) HAnim.sparkle(w, { count: 8 }); }, 480);
        if (ONE[m]) {
          c.done = new Promise(res => {
            c.timer = setTimeout(() => {
              if (m === "flyout") w.classList.add("ha-m--gone");
              else if (!oo.hold) c.set(oo.then || "idle");
              res();
            }, ONE[m]);
          });
        } else c.done = Promise.resolve();
        return c;
      };
      c.talk = function (ms) { ci.classList.add("talking"); clearTimeout(c.tt); c.tt = setTimeout(() => ci.classList.remove("talking"), ms || 1200); return c; };
      c.destroy = function () { clearTimeout(c.timer); clearTimeout(c.tt); w.remove(); host._haM = null; };
    }
    return c.set(mood || "idle", o);
  }
  function wrapMascot() {
    if (!window.HAnim || !has("hibri") || HAnim._mascotSVG) return;
    HAnim._mascotSVG = HAnim.mascot;                 // старый нарисованный — на всякий случай
    HAnim.mascot = mascot3D;
  }
  window.HirbisChars.wrapMascot = wrapMascot;          // app.js зовёт сразу (главная рисует Хибри ещё до DOMContentLoaded)
  window.addEventListener("DOMContentLoaded", wrapMascot);
})();
