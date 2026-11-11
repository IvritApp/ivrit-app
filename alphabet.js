// =====================================================
// АЛФАВИТ — заглушка. Этот файл целиком делает второй чат.
// Договорённость («стык»):
//   window.openAlphabet(sectionEl)  — показать раздел внутри <section id="alphabet">
//   window.alphabetBack()           — кнопка «Назад» Telegram: вернуть true, если обработали сами
//                                     (например, из урока — к карте алфавита), false — уйти на главный
// =====================================================
(function () {
  window.openAlphabet = function (el) {
    el.innerHTML = `<div style="padding:40px 20px;text-align:center">
      <div style="font-size:64px">אב</div>
      <h2>Алфавит</h2>
      <p class="task">Раздел готовится — скоро здесь можно будет выучить все буквы и огласовки ✨</p>
      <button class="btn blue" onclick="showHome()">На главный</button></div>`;
  };
  window.alphabetBack = function () { return false; };
})();
