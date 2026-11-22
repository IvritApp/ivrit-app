// =====================================================
// ЭКРАН УРОКА (18.11): крестик «выйти» и СЕРДЕЧКИ-ЖИЗНИ (как в Duolingo).
//  • 10 ❤️ (22.11, решение владельца: чтобы чаще заходили). Ошибка в уроке — минус сердечко. Новое сердечко — каждые 9 минут (полная шкала за 1,5 часа).
//  • Кончились — окно «Сердечки кончились»: подождать или «Тренировка» (старый урок без потери ❤️) → +1 ❤️.
//  • Карточки «Новое слово», повторение после квеста и тренировка сердечки не тратят. Тестировщику — без ограничений.
// store "hearts" = { n, t } (t — когда начался отсчёт до следующего сердечка).
// =====================================================
(function () {
  const MAX = 10, REGEN_MS = 9 * 60 * 1000;            // 22.11: полная шкала (10 ❤️) — за 1,5 часа, 1 ❤️ каждые 9 мин
  const HEART = `<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21.2 10.6 20C5.4 15.3 2 12.2 2 8.4 2 5.3 4.4 3 7.4 3c1.8 0 3.5.8 4.6 2.1C13.1 3.8 14.8 3 16.6 3 19.6 3 22 5.3 22 8.4c0 3.8-3.4 6.9-8.6 11.6z" fill="currentColor"/><path d="M6.4 6.6c.9-.9 2.2-1.1 3.2-.6" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".55"/></svg>`;
  // ∞ сердечек: тестировщик или подписка Hirbis Plus (plus.js)
  const unlimited = () => (typeof testMode === "function" && testMode()) || !!(window.Plus && Plus.active());

  function state() {
    const s = Object.assign({ n: MAX, t: Date.now() }, store.get("hearts", {}));
    if (!(s.t <= Date.now())) s.t = Date.now();          // время «из будущего» (сбились часы) — считаем от сейчас
    if (s.n < MAX) {                                     // восстановление со временем
      const gained = Math.floor((Date.now() - s.t) / REGEN_MS);
      if (gained > 0) { s.n = Math.min(MAX, s.n + gained); s.t += gained * REGEN_MS; store.set("hearts", s); }
    }
    return s;
  }
  function msToNext() { const s = state(); return s.n >= MAX ? 0 : Math.max(0, REGEN_MS - (Date.now() - s.t)); }
  function minsText(ms) { const m = Math.ceil(ms / 60000); return m + " мин"; }
  // 22.11 (владелец): ❤️ тратятся во ВСЕХ частях урока, включая «знакомство» (1–2); без потерь — только тренировка и повторение
  const spends = () => lesson && !lesson.practice && !lesson.review && !unlimited();

  const Hearts = {
    MAX,                                                   // сколько ❤️ в полной шкале (eco.js «Полные сердечки»)
    n: () => (unlimited() ? Infinity : state().n),
    render(bump) {
      const el = document.getElementById("hearts");
      if (!el) return;
      const n = Hearts.n();
      el.className = "hearts" + (n === 0 ? " empty" : "") + (bump ? " lost" : "") + (window.Plus && Plus.active() ? " plus" : "");
      el.innerHTML = HEART + `<b>${n === Infinity ? "∞" : n}</b>`;
      el.onclick = () => { if (window.Plus) Plus.open("hearts"); };       // нажал на сердечки → Hirbis Plus
    },
    lose() {
      if (!spends()) return;
      const s = state();
      if (s.n >= MAX) s.t = Date.now();                   // отсчёт до нового — с первой потери
      s.n = Math.max(0, s.n - 1);
      store.set("hearts", s);
      Hearts.render(true);
      if (window.HAnim) { const el = document.getElementById("hearts"); if (el) HAnim.shake(el); }
    },
    gain(k) { const s = state(); s.n = Math.min(MAX, s.n + (k || 1)); if (s.n >= MAX) s.t = Date.now(); store.set("hearts", s); Hearts.render(); },
    out: () => spends() && state().n <= 0,
    // окно «Сердечки кончились»
    outModal(onClose) {
      const old = document.getElementById("hOut"); if (old) old.remove();
      // для тренировки: пройденные уроки → начатые (есть пройденные части) → первый урок курса (новичку тоже есть куда идти)
      const begun = Object.keys(store.get("parts", {})).filter(id => store.get("parts", {})[id] > 0);
      let practiceIds = doneLessons().filter(id => /^a1-\d+-\d+$/.test(id));
      if (!practiceIds.length) practiceIds = begun.length ? begun : ["a1-1-1"];
      const w = document.createElement("div");
      w.id = "hOut";
      w.innerHTML = `<div class="ho-card">
          <div class="ho-heart">${HEART}</div>
          <h2>Сердечки кончились</h2>
          <p>Новое ❤️ через <b id="hoLeft">${minsText(msToNext())}</b></p>
          ${window.Plus ? `<button class="btn plus-btn" id="hoPlus">✨ Hirbis Plus: ∞ ❤️</button>` : ""}
          ${practiceIds.length ? `<button class="btn blue" id="hoPractice">💪 Тренировка: +1 ❤️</button>` : ""}
          <button class="btn ghost" id="hoWait">Подожду</button>
        </div>`;
      document.body.appendChild(w);
      requestAnimationFrame(() => w.classList.add("show"));
      if (typeof vibrate === "function") vibrate("warning");
      if (window.track) track("hearts_out");
      // «Новое ❤️ через N мин» обновляется, пока окно открыто
      const tick = setInterval(() => { const el = document.getElementById("hoLeft"); if (!el) return clearInterval(tick); el.textContent = minsText(msToNext()); }, 20000);
      const close = () => { clearInterval(tick); w.classList.remove("show"); setTimeout(() => w.remove(), 250); };
      w.querySelector("#hoWait").onclick = () => { close(); (onClose || showPath)(); };
      const hp = w.querySelector("#hoPlus");
      if (hp) hp.onclick = () => { close(); Plus.open("out", () => (onClose || showPath)()); };
      const pb = w.querySelector("#hoPractice");
      if (pb) pb.onclick = () => { close(); startPractice(practiceIds[Math.floor(Math.random() * practiceIds.length)]); };
    }
  };

  // Тренировка: задания уже пройденного урока, сердечки не тратятся, в конце +1 ❤️
  function startPractice(id) {
    getLesson(id).then(raw => {
      const data = JSON.parse(JSON.stringify(raw));
      data.id = "practice"; data.practice = true; data.title = "Тренировка 💪";
      startLesson(data);
    }).catch(() => showPath());
  }

  // ---------- крестик «выйти» с вопросом ----------
  function askExit() {
    if (document.getElementById("exAsk")) return;
    const w = document.createElement("div");
    w.id = "exAsk";
    w.innerHTML = `<div class="ho-card"><div class="ho-bird" id="exBird"></div><h2>Точно выйти?</h2>
      <p>Прогресс этой части не сохранится</p>
      <button class="btn blue" id="exStay">Остаться</button><button class="btn ghost ex-leave" id="exLeave">Выйти</button></div>`;
    document.body.appendChild(w);
    requestAnimationFrame(() => w.classList.add("show"));
    if (window.HAnim) HAnim.mascot(document.getElementById("exBird"), "sad", { size: 90 });
    const close = () => { w.classList.remove("show"); setTimeout(() => w.remove(), 250); };
    w.querySelector("#exStay").onclick = close;
    w.querySelector("#exLeave").onclick = () => {
      if (window.track && typeof lessonTag === "function") track("lesson_exit", lessonTag(lesson));   // где бросают урок (админка «🐞»)
      close(); hideFeedback(); showPath();
    };
  }
  const x = document.getElementById("exClose");
  if (x) x.onclick = askExit;

  window.Hearts = Hearts;
  window.startPractice = startPractice;
})();
