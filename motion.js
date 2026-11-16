// =====================================================
// ЖИВОСТЬ ПРИЛОЖЕНИЯ (поверх anim.js): плавное появление экранов, тосты с пружиной,
// небо на главной, «перещёлкивание» очков, Хибри вместо «Загрузка…».
// Всё — только transform/opacity, без anim.js работает как раньше. Меньше движения — по настройке телефона.
// =====================================================
(function () {
  const reduced = () => (window.HAnim && HAnim.reduced) || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  // 1) Экран появляется плавно, когда с него снимают hidden (следим ТОЛЬКО за body > section, только за hidden)
  function enter(sec) {
    if (reduced()) return;
    sec.classList.remove("sec-in"); void sec.offsetWidth; sec.classList.add("sec-in");
    clearTimeout(sec._secT); sec._secT = setTimeout(() => sec.classList.remove("sec-in"), 450);
  }
  const mo = new MutationObserver(list => list.forEach(m => { if (m.oldValue !== null && !m.target.hidden) enter(m.target); }));
  document.querySelectorAll("body > section").forEach(sec => mo.observe(sec, { attributes: true, attributeFilter: ["hidden"], attributeOldValue: true }));

  // 2) Тосты: выезжают сверху с пружиной (anim.js); без него — старый тост
  const oldToast = window.showToast;
  window.showToast = function (text) {
    if (!window.HAnim) return oldToast(text);
    document.querySelectorAll(".ha-toast").forEach(t => t.remove());   // не копим тосты стопкой
    HAnim.play("toast", { text: String(text), pos: "top", ms: 1900 }).catch(() => oldToast(text));
  };

  // 3) Главная: небо с солнцем и облаками + очки за сегодня «перещёлкиваются», как табло
  let lastPts = null;
  const oldToday = window.updateToday;
  window.updateToday = function () {
    oldToday();
    const home = document.getElementById("home");
    if (window.HAnim && home && !reduced()) HAnim.play("homeSky", { el: home }).catch(() => {});
    const pts = store.get(todayKey(), 0);
    const b = [...document.querySelectorAll("#today span b")].find(x => !x.closest("#hStreak"));
    if (b && window.HAnim && lastPts !== null && lastPts !== pts && !reduced()) {
      b.textContent = lastPts;
      setTimeout(() => HAnim.play("flip", { el: b, to: pts }).catch(() => { b.textContent = pts; }), 350);
    }
    lastPts = pts;
  };

  // 4) Загрузка урока / слов: бегущий Хибри вместо слова «Загрузка…»
  window.showLoading = function (el, text) {
    if (!el) return;
    if (window.HAnim) { HAnim.play("loading", { el, text: text || "Загружаем" }); return; }
    el.textContent = "Загрузка…";
  };
})();
