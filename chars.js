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
  const V = "20261121f";
  // какие кадры уже есть (исходники — Desktop\Клод\Project\ivrit-app\Фото от ChatGPT\sheetNN_*.png)
  const CHARS = { david: ["neutral", "talk", "blink", "happy", "oops", "think", "wave", "point", "listen", "surprised"] };
  const has = (id) => !!CHARS[id];

  window.charImgHTML = function (id, cls) {
    if (!has(id)) return "";
    return `<div class="ci ${cls || ""}" data-char="${id}">${CHARS[id].map(f =>
      `<img class="ci-f ci-${f}" src="assets/chars/${id}_${f}.webp?v=${V}" alt="" draggable="false">`).join("")}</div>`;
  };

  // моргание: всем видимым персонажам-картинкам по очереди
  setInterval(() => {
    document.querySelectorAll(".ci").forEach(el => {
      if (Math.random() < .45 && el.offsetParent) { el.classList.add("ci-blinking"); setTimeout(() => el.classList.remove("ci-blinking"), 160); }
    });
  }, 1700);

  // Друг в уроке (Давид для парня). Для девушки — Циля, пока по-старому (картинки ещё нет)
  const oldFriend = window.friendFigureSVG;
  window.friendFigureSVG = function (gender) {
    const id = gender === "f" ? "tzila" : "david";
    return has(id) ? charImgHTML(id) : (oldFriend ? oldFriend(gender) : "");
  };
  window.HirbisChars = { has, CHARS };
})();
