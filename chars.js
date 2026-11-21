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
  const V = "20261122a";      // 22.11: кадры talk/blink выровнены по голове (align_frames.ps1) — персонаж больше не «прыгает»
  // какие кадры уже есть (исходники — Desktop\Клод\Фото от ChatGPT\sheetNN_*.png).
  // Все кадры — холст 360×768, один масштаб, ступни на одной линии (slice_sheet.ps1)
  const A = ["neutral", "talk", "blink", "happy", "oops"], AB = A.concat(["think", "wave", "point", "listen", "surprised"]);
  const CHARS = { david: AB, tzila: AB, hero_m1: A, hero_m2: A, hero_m3: A };
  const has = (id) => !!CHARS[id];

  window.charImgHTML = function (id, cls) {
    if (!has(id)) return "";
    const b = CHARS[id].includes("think") ? " ci-b" : "";   // есть лист B (думает, машет…)
    return `<div class="ci${b} ${cls || ""}" data-char="${id}">${CHARS[id].map(f =>
      `<img class="ci-f ci-${f}" src="assets/chars/${id}_${f}.webp?v=${V}" width="360" height="768" decoding="async" alt="" draggable="false">`).join("")}</div>`;
  };

  // моргание: всем видимым персонажам-картинкам по очереди
  setInterval(() => {
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
  window.HirbisChars = { has, CHARS };
})();
