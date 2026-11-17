// =====================================================
// КАРТОЧКИ СЛОВ — первый шаг каждого уровня.
// Все новые слова уровня (из его 7 уроков) делятся на 5–6 частей по 6–10 карточек.
// Карточка: спереди слово на иврите + картинка + звук, нажал — переворот: перевод и транскрипция.
// «✓ Запомнил» — карточка улетает вправо, «🔁 Ещё раз» — уходит в конец стопки.
// Урок 1 уровня открывается, когда пройдены все части (у тех, кто уже проходил уроки уровня, — не обязательно).
//
// Прогресс: часть = "cards-<уровень>-<номер>" в store "done"; весь уровень — store "cardsDone" (список уровней).
// =====================================================
(function () {
  const cache = {};                                   // уровень → { words, parts }

  function levelById(id) {
    const ch = course && course.chapters[0];
    return ch ? ch.levels.find(l => l.id === id) : null;
  }
  // все НОВЫЕ слова уровня по порядку уроков, без повторов
  async function levelWords(lvl) {
    if (cache[lvl.id]) return cache[lvl.id];
    const all = await Promise.all(lvl.lessons.map(id => fetch(`content/${COURSE_LANG}/lessons/${id}.json`).then(r => r.json()).catch(() => null)));
    const words = [], seen = new Set();
    all.filter(Boolean).forEach(d => d.words.slice(0, d.newCount || d.words.length).forEach(w => {
      if (!seen.has(w.he)) { seen.add(w.he); words.push(w); }
    }));
    // 5 частей, если слов немного, иначе 6; поровну, по порядку уроков
    const n = words.length <= 40 ? 5 : 6, parts = [];
    for (let k = 0; k < n; k++) parts.push(words.slice(Math.round(k * words.length / n), Math.round((k + 1) * words.length / n)));
    return (cache[lvl.id] = { words, parts: parts.filter(p => p.length) });
  }

  const partId = (lvlId, k) => `cards-${lvlId}-${k + 1}`;
  const partDone = (lvlId, k) => doneLessons().includes(partId(lvlId, k));
  const levelCardsDone = (lvlId) => store.get("cardsDone", []).includes(lvlId);

  // Нужно ли сначала пройти карточки (тогда уроки уровня закрыты)
  window.cardsNeeded = function (lvl) {
    if (!lvl || !lvl.lessons || testMode() || levelCardsDone(lvl.id)) return false;
    return !lvl.lessons.some(id => doneLessons().includes(id));   // уже проходил уроки уровня — не заставляем
  };

  // Блок на дорожке (над кружками уроков). Число частей подставляется, когда слова загрузятся.
  window.cardsBlockHTML = function (lvl, need) {
    const all = levelCardsDone(lvl.id);
    return `<button class="cd-path${need ? " need" : ""}${all ? " done" : ""}" id="cd-path">
      <span class="cd-path-ico">${all ? "✓" : "📇"}</span>
      <span class="cd-path-txt"><b>Карточки слов</b><small id="cd-path-sub">${need ? "Начни отсюда: новые слова уровня" : all ? "Все слова уровня просмотрены · можно повторить" : "Новые слова уровня"}</small>
      <span class="cd-dots" id="cd-dots"></span></span>
    </button>`;
  };
  window.cardsMount = function (lvl) {
    const btn = document.getElementById("cd-path");
    if (!btn) return;
    btn.onclick = () => startCards(lvl.id);
    levelWords(lvl).then(({ words, parts }) => {
      if (!btn.isConnected) return;
      const dn = parts.filter((_, k) => partDone(lvl.id, k)).length;
      const sub = document.getElementById("cd-path-sub");
      if (sub && !levelCardsDone(lvl.id)) sub.textContent = `${words.length} новых слов · ${dn ? `пройдено ${dn} из ${parts.length}` : `${parts.length} частей по 3 минуты`}`;
      const next = parts.findIndex((_, k) => !partDone(lvl.id, k));
      document.getElementById("cd-dots").innerHTML = parts.map((_, k) =>
        `<i class="${partDone(lvl.id, k) ? "on" : k === next ? "cur" : ""}" data-k="${k}"></i>`).join("");
      // можно открыть любую пройденную часть или следующую
      btn.querySelectorAll(".cd-dots i").forEach(i => i.onclick = (e) => {
        const k = +i.dataset.k;
        if (partDone(lvl.id, k) || k === next) { e.stopPropagation(); startCards(lvl.id, k); }
      });
    }).catch(() => {});
  };

  // ---------- Экран карточек ----------
  let S = null;                                       // состояние текущей части

  window.startCards = async function (lvlId, k) {
    const lvl = levelById(lvlId);
    if (!lvl) return;
    stopHomeBird(); hideFeedback();
    document.querySelectorAll("body > section").forEach(sec => sec.hidden = sec.id !== "lesson");
    if (tg && tg.BackButton) tg.BackButton.show();
    bar.style.width = "0%"; bar.classList.remove("hot", "max", "run");
    comboBox.innerHTML = ""; comboBox.className = "combo";
    if (window.showLoading) showLoading(screen, "Раскладываем карточки"); else screen.innerHTML = `<p class="task">Загрузка…</p>`;
    setIconHero(lvl.lessons[0]);
    let data;
    try { data = await levelWords(lvl); } catch (e) { screen.textContent = "Не удалось загрузить слова 😕"; return; }
    if (k == null) { k = data.parts.findIndex((_, i) => !partDone(lvlId, i)); if (k < 0) k = 0; }
    const words = data.parts[k].map(w => Object.assign({}, w, { he: g(w.he), tr: g(w.tr), ru: g(w.ru) }));
    S = { lvl, k, total: data.parts.length, words, queue: words.map((_, i) => i), learned: 0, again: {}, busy: false };
    askTranslit(() => { renderShell(); nextCard(true); });
  };

  function renderShell() {
    screen.className = "";
    screen.innerHTML = `
      <div class="cd-wrap">
        <div class="cd-head">Карточки слов · часть ${S.k + 1} из ${S.total}</div>
        <div class="cd-sub" id="cd-sub">Послушай слово и нажми на карточку</div>
        <div class="cd-deck" id="cd-deck"><div class="cd-stack s2"></div><div class="cd-stack s1"></div></div>
        <div class="cd-count" id="cd-count"></div>
        <div class="cd-btns" id="cd-btns"></div>
      </div>`;
  }

  function progress() {
    bar.style.width = (S.learned / S.words.length * 100) + "%";
    const c = document.getElementById("cd-count");
    if (c) c.textContent = `Запомнено ${S.learned} из ${S.words.length}`;
    const deck = document.getElementById("cd-deck");
    if (deck) deck.dataset.left = Math.min(2, S.queue.length - 1);   // сколько карточек «в стопке» за текущей
  }

  function cardHTML(w) {
    const pic = typeof wordIcon === "function" ? wordIcon(w, 104) : "";
    return `<div class="cd-card enter" id="cd-card" role="button" tabindex="0" aria-label="Перевернуть карточку">
      <div class="cd-inner">
        <div class="cd-face cd-front">
          ${pic ? `<div class="cd-pic">${pic}</div>` : `<div class="cd-pic none">🐦</div>`}
          <div class="cd-he" dir="rtl">${w.he}</div>
          <button class="cd-say" id="cd-say" aria-label="Послушать">🔊</button>
          <div class="cd-tap">нажми, чтобы перевернуть</div>
        </div>
        <div class="cd-face cd-back">
          <div class="cd-ru">${w.ru}</div>
          <div class="cd-tr tr">${w.tr}</div>
          <div class="cd-he-sm" dir="rtl">${w.he}</div>
          <button class="cd-say" id="cd-say2" aria-label="Послушать">🔊</button>
        </div>
      </div>
    </div>`;
  }

  function nextCard(first) {
    progress();
    if (!S.queue.length) { finishPart(); return; }
    const w = S.words[S.queue[0]];
    const deck = document.getElementById("cd-deck");
    deck.insertAdjacentHTML("beforeend", cardHTML(w));
    const card = document.getElementById("cd-card");
    S.flipped = false; S.busy = false;
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove("enter")));
    const sayIt = (e) => { if (e) e.stopPropagation(); speak(w.he, { audio: w.audio }); };
    document.getElementById("cd-say").onclick = sayIt;
    document.getElementById("cd-say2").onclick = sayIt;
    setTimeout(() => sayIt(), first ? 450 : 250);
    card.onclick = () => flip(card);
    card.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(card); } };
    swipe(card);
    const sub = document.getElementById("cd-sub");
    if (sub) sub.textContent = S.again[S.queue[0]] ? "Это слово уже было, вспомнишь перевод?" : "Послушай слово и нажми на карточку";
    buttons(false);
  }

  function buttons(open) {
    const b = document.getElementById("cd-btns");
    if (!open) {
      b.innerHTML = `<button class="btn blue cd-flipbtn" id="cd-flip">Показать перевод</button>`;
      document.getElementById("cd-flip").onclick = () => flip(document.getElementById("cd-card"));
      return;
    }
    b.innerHTML = `<button class="cd-again" id="cd-again">🔁 Ещё раз</button><button class="cd-know" id="cd-know">✓ Запомнил${g("{m:}{f:а}")}</button>`;
    document.getElementById("cd-again").onclick = () => answer(false);
    document.getElementById("cd-know").onclick = () => answer(true);
  }

  function flip(card) {
    if (!card || S.busy) return;
    S.flipped = !S.flipped;
    card.classList.toggle("flipped", S.flipped);
    vibrate("light");
    if (S.flipped) { buttons(true); document.getElementById("cd-sub").textContent = g("Запомнил{m:}{f:а}? Если нет — вернётся в конце"); }
  }

  // Смахнуть перевёрнутую карточку: вправо — запомнил, влево — ещё раз
  function swipe(card) {
    let x0 = null, dx = 0;
    card.addEventListener("pointerdown", (e) => { if (!S.flipped || S.busy) return; x0 = e.clientX; dx = 0; card.classList.add("drag"); });
    card.addEventListener("pointermove", (e) => {
      if (x0 === null) return;
      dx = e.clientX - x0;
      card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
      card.classList.toggle("hint-yes", dx > 50); card.classList.toggle("hint-no", dx < -50);
    });
    const end = () => {
      if (x0 === null) return;
      x0 = null; card.classList.remove("drag", "hint-yes", "hint-no");
      if (Math.abs(dx) > 90) { card._swiped = true; answer(dx > 0); }   // улетает оттуда, куда дотащили
      else card.style.transform = "";                                   // не дотащили — пружиной назад
    };
    card.addEventListener("pointerup", end); card.addEventListener("pointercancel", end);
    // после смахивания не считаем это нажатием (переворотом)
    card.addEventListener("click", (e) => { if (card._swiped) { e.stopImmediatePropagation(); } }, true);
  }

  function answer(know) {
    if (S.busy) return;
    S.busy = true;
    const card = document.getElementById("cd-card");
    const i = S.queue.shift();
    if (know) {
      S.learned++;
      vibrate("success"); playSound("right");
      if (window.HAnim && HAnim.sparkle) HAnim.sparkle(card, { count: 7 });
      card.classList.add("out-yes");
    } else {
      S.again[i] = (S.again[i] || 0) + 1;
      S.queue.push(i);                                  // вернётся в конце части
      vibrate("light"); playSound("pop");
      card.classList.add("out-no");
    }
    document.getElementById("cd-btns").innerHTML = "";
    setTimeout(() => { card.remove(); nextCard(false); }, 380);
  }

  // ---------- Карточка «Новое слово» ВНУТРИ урока (шаг { type: "card", word: i }) ----------
  // Показываем слово: картинка, иврит, звук → нажал — перевод → «Понятно, дальше». Без оценки и без ошибок.
  window.showWordCard = function (ex) {
    const w = lesson.words[ex.word];
    if (!w) { goNext(); return; }
    S = { flipped: false, busy: false };
    screen.innerHTML = `
      <div class="cd-wrap cd-inlesson">
        <div class="cd-newtag">✨ Новое слово</div>
        <div class="cd-deck one" id="cd-deck">${cardHTML(w)}</div>
        <div class="cd-btns" id="cd-btns"><button class="btn blue cd-flipbtn" id="cd-flip">Показать перевод</button></div>
      </div>`;
    const card = document.getElementById("cd-card");
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove("enter")));
    const sayIt = (e) => { if (e) e.stopPropagation(); speak(w.he, { audio: w.audio }); };
    document.getElementById("cd-say").onclick = sayIt;
    document.getElementById("cd-say2").onclick = sayIt;
    setTimeout(sayIt, 350);
    const turn = () => {
      S.flipped = !S.flipped;
      card.classList.toggle("flipped", S.flipped);
      vibrate("light");
      if (S.flipped && !document.getElementById("cd-go")) {
        document.getElementById("cd-btns").innerHTML = `<button class="btn blue" id="cd-go">Понятно, дальше</button>`;
        document.getElementById("cd-go").onclick = () => { playSound("pop"); goNext(); };
      }
    };
    card.onclick = turn;
    document.getElementById("cd-flip").onclick = turn;
  };

  // ---------- Конец части ----------
  function finishPart() {
    const { lvl, k, total, words } = S;
    const id = partId(lvl.id, k);
    const firstTime = !doneLessons().includes(id);
    markDone(id);
    const parts = cache[lvl.id].parts;
    const allNow = parts.every((_, i) => partDone(lvl.id, i));
    const levelFirst = allNow && !levelCardsDone(lvl.id);
    if (levelFirst) {
      store.set("cardsDone", store.get("cardsDone", []).concat(lvl.id));
      store.set("pathCur", id);                         // на дорожке у «Урок 1» сломается замок
    }
    bar.style.width = "100%";
    const nextK = parts.findIndex((_, i) => !partDone(lvl.id, i));
    const hard = words.filter((_, i) => S.again[i]).length;
    screen.innerHTML = `
      <div class="cd-end">
        <div class="cd-end-bird" id="cd-bird">${window.HAnim ? "" : `<img src="assets/udod.png" alt="Хибри">`}</div>
        <h2>${levelFirst ? "Все слова уровня — твои! 🎉" : `Часть ${k + 1} из ${total} готова!`}</h2>
        <p class="cd-end-sub">${levelFirst ? "Теперь эти слова встретятся в уроках. Урок 1 открыт!"
          : `${words.length} новых слов${hard ? ` · повторил${g("{m:}{f:а}")} ещё раз: ${hard}` : " · все с первого раза 💪"}`}</p>
        <div class="cd-chips">${words.map((w, i) => `<span class="cd-chip" style="--i:${i}"><b dir="rtl">${w.he}</b>${w.ru}</span>`).join("")}</div>
        <div class="cd-end-btns">
          ${levelFirst ? `<button class="btn blue" id="cd-go">К урокам 🎯</button>`
            : nextK >= 0 ? `<button class="btn blue" id="cd-go">Дальше: часть ${nextK + 1}</button>`
            : `<button class="btn blue" id="cd-go">К урокам</button>`}
          <button class="link-btn" id="cd-path-back">Вернуться на дорожку</button>
        </div>
      </div>`;
    if (window.HAnim) {
      const m = HAnim.mascot(document.getElementById("cd-bird"), levelFirst ? "cheer" : "happy", { size: 130 });
      if (m && m.talk) setTimeout(() => m.talk(1200), 300);
      if (levelFirst && HAnim.confetti) HAnim.confetti({ size: "big" });
      else if (HAnim.confetti && firstTime) HAnim.confetti({ size: "small" });
    }
    playSound("finish");
    vibrate("success");
    const go = document.getElementById("cd-go");
    go.onclick = () => { if (!levelFirst && nextK >= 0) startCards(lvl.id, nextK); else showPath(); };
    document.getElementById("cd-path-back").onclick = () => showPath();
    S = null;
  }
})();
