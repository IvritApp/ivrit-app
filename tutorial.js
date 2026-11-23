// =====================================================
// ОБУЧЕНИЕ «Как играть»: 5 карточек сразу после знакомства (имя → ник/согласие → обучение → главная).
// Показывается один раз; повторить можно в ⚙️ → «📖 Как играть».
// На 4-й карточке — проверка микрофона: заодно телефон спросит разрешение заранее, а не посреди квеста.
// =====================================================
(function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const fn = () => (typeof friendName === "function" ? friendName() : "Давид");
  const slides = () => [
    { pic: window.HAnim ? `<div class="tu-bird" id="tuBird"></div>` : `<img src="assets/udod.png" alt="Хибри" class="tu-bird">`, h: "Шалом! Я Хибри 👋",
      p: `Здесь ты учишься <b>говорить</b> на иврите — как живут в Израиле. Ты прилетаешь к ${fn() === "Циля" ? "Циле" : "Давиду"}, и каждый уровень — новая глава вашей истории.`,
      list: ["📚 1 уровень = 7 коротких уроков", "🎬 потом — квест: живая сцена", "🏁 10 уровней — и экзамен A1"] },
    { pic: `<div class="tu-icons"><span>👆</span><span>🔊</span><span>🧩</span><span>⚡</span></div>`, h: "Уроки — это мини-игры",
      p: "Выбери перевод, послушай и угадай, собери фразу, блиц на 30 секунд. Урок делится на короткие части по 2–3 минуты.",
      list: ["Ошибся — не страшно, слово вернётся", "Без ошибок — урок ★ золотой, очки ×2", "Забыл, как читается? Нажми на динамик"] },
    { pic: `<div class="tu-icons"><span>🔥</span><span>📅</span><span>❄️</span></div>`, h: "Огоньки и серия",
      p: "Отвечай правильно подряд — разгорается огонь: 5х, 10х… и очков больше. Занимайся каждый день — растёт серия.",
      list: ["❄️ Заморозка спасёт, если пропустил день", "Очки за день видны на главной", "Квест даёт в 1,5 раза больше очков"] },
    { pic: `<div class="tu-icons"><span>🗣️</span></div>`, h: "В квестах ты говоришь сам",
      p: "В квесте ты видишь подсказку — фразу на иврите с переводом. Отвечаешь кнопкой, а потом можешь <b>сказать фразу вслух</b> 🎤 — так запоминается лучше всего.",
      mic: true,
      list: ["💡 Не знаешь как — есть подсказка", "🙊 Нельзя говорить вслух — можно кнопками", "Говорить тяжело — дам уроки повторения"] },
    { pic: `<div class="tu-icons"><span>👥</span><span>🏆</span></div>`, h: "Друзья и награды",
      p: "Добавляй друзей по нику во вкладке «Друзья». Проходи уровни на золото — получишь медаль главы.",
      list: ["🥇 все уровни золотые — золотая медаль", "⚙️ настройки — звук, транскрипция, аккаунт", "Готов? Первый урок уже ждёт 👇"], last: true },
  ];
  window.showTutorial = function (onDone) {
    const S = slides();
    let i = 0;
    let box = document.getElementById("tutorial");
    if (box) box.remove();
    box = document.createElement("div");
    box.id = "tutorial"; box.className = "tu";
    document.body.appendChild(box);
    const close = () => { try { store.set("tutorSeen", true); } catch (e) {} box.classList.remove("show"); setTimeout(() => box.remove(), 300); if (onDone) onDone(); };
    const render = () => {
      const s = S[i];
      box.innerHTML = `<div class="tu-card">
        <div class="tu-top"><div class="tu-dots">${S.map((_, k) => `<i class="${k === i ? "on" : k < i ? "was" : ""}"></i>`).join("")}</div><button class="tu-skip" id="tuSkip">Пропустить</button></div>
        <div class="tu-body slide-in">${s.pic}<h2>${s.h}</h2><p>${s.p}</p>
          ${s.mic ? `<div class="tu-mic"><button class="q-mic" id="tuMic" type="button"><span>🎤</span><b>Проверить: скажи «שָׁלוֹם»</b></button><div class="tu-mic-res" id="tuMicRes"></div></div>` : ""}
          <ul>${s.list.map(x => `<li>${x}</li>`).join("")}</ul></div>
        <div class="tu-nav">${i ? `<button class="btn ghost" id="tuBack">Назад</button>` : ""}<button class="btn blue" id="tuNext">${s.last ? "Поехали! 🚀" : "Дальше"}</button></div></div>`;
      const tb = box.querySelector("#tuBird");            // новый живой Хибри машет крылом
      if (tb && window.HAnim) HAnim.mascot(tb, "wave", { size: 120 });
      box.querySelector("#tuSkip").onclick = close;
      box.querySelector("#tuNext").onclick = () => { if (S[i].last) close(); else { i++; render(); } if (typeof playSound === "function") playSound("pop"); };
      const b = box.querySelector("#tuBack"); if (b) b.onclick = () => { i--; render(); };
      const mic = box.querySelector("#tuMic");
      if (mic) {
        const res = box.querySelector("#tuMicRes");
        if (!SR) { mic.disabled = true; res.innerHTML = "На этом устройстве голос не работает — в квестах будешь отвечать кнопками. Это нормально 👍"; }
        else mic.onclick = () => {
          mic.classList.add("on"); mic.querySelector("b").textContent = "Слушаю…";
          listenHe((alts) => {
            mic.classList.remove("on"); mic.querySelector("b").textContent = "Ещё раз";
            const ok = alts.some(t => heSim(t, "שָׁלוֹם") >= 0.6);
            res.innerHTML = ok ? `✅ Отлично! Я услышал «${alts[0]}» — голос работает` : `Услышал «${alts[0] || "…"}». Скажи ещё раз: <b>шалом</b>`;
            if (ok && typeof playSound === "function") playSound("right");
          }, (err) => {
            mic.classList.remove("on"); mic.querySelector("b").textContent = "Ещё раз";
            res.innerHTML = (err === "not-allowed" || err === "service-not-allowed") ? "Микрофон не разрешён. Ничего страшного — в квестах будешь отвечать кнопками, а разрешить можно потом."
              : err === "no-speech" ? "Ничего не услышал 🙉 Нажми и скажи погромче" : "Голос здесь не заработал — в квестах будут кнопки 👍";
          });
        };
      }
    };
    render();
    requestAnimationFrame(() => box.classList.add("show"));
  };
})();
