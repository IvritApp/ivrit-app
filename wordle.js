// =====================================================
// ВОРДЛ — слово дня на иврите. 6 попыток угадать слово из 5 букв.
// 🟩 буква на своём месте · 🟨 буква есть, но в другом месте · ⬜ такой буквы нет.
// Слова — из курса (content/he/wordle.json), одно и то же слово у всех в один день.
// Конечные формы букв (ך ם ן ף ץ) считаются той же буквой и ставятся сами в конце слова.
// Прогресс: store "wordle" (сегодняшняя игра), "wordleStats" (статистика), очки — в очки дня.
// =====================================================
(function () {
  const LEN = 5, TRIES = 6, START = Date.UTC(2026, 10, 16);
  const FINAL = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
  const TO_FINAL = { "כ": "ך", "מ": "ם", "נ": "ן", "פ": "ף", "צ": "ץ" };
  const KEYS = [["ק", "ר", "א", "ט", "ו", "ן", "ם", "פ"], ["ש", "ד", "ג", "כ", "ע", "י", "ח", "ל", "ך", "ף"], ["ז", "ס", "ב", "ה", "נ", "מ", "צ", "ת", "ץ"]];
  const norm = (c) => FINAL[c] || c;
  const view = () => document.getElementById("wordle");
  let words = null, G = null;          // G — текущая игра

  function dayNum() { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - START) / 864e5); }
  // одинаковый для всех «перемешанный» порядок слов (простой генератор с постоянным зерном)
  function order(n) {
    const a = Array.from({ length: n }, (_, i) => i); let s = 20261116;
    const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function todayWord() { const ord = order(words.length), d = ((dayNum() % words.length) + words.length) % words.length; return words[ord[d]]; }
  // как показать набранные буквы: последняя — конечной формой, остальные — обычной
  const shape = (arr) => arr.map((c, i) => (i === LEN - 1 ? (TO_FINAL[norm(c)] || norm(c)) : norm(c)));

  // оценка попытки: 2 — на месте, 1 — есть в слове, 0 — нет (с учётом повторов букв)
  function score(guess, answer) {
    const g = guess.map(norm), a = [...answer].map(norm), res = Array(LEN).fill(0), left = {};
    a.forEach((c, i) => { if (g[i] === c) res[i] = 2; else left[c] = (left[c] || 0) + 1; });
    g.forEach((c, i) => { if (res[i] !== 2 && left[c] > 0) { res[i] = 1; left[c]--; } });
    return res;
  }

  function stats() { return Object.assign({ played: 0, won: 0, streak: 0, best: 0, dist: [0, 0, 0, 0, 0, 0], lastDay: null }, store.get("wordleStats", {})); }

  window.openWordle = async function () {
    if (typeof stopHomeBird === "function") stopHomeBird();
    document.querySelectorAll("body > section").forEach(s => s.hidden = s.id !== "wordle");
    if (tg && tg.BackButton) tg.BackButton.show();
    const v = view();
    if (!words) {
      if (window.showLoading) showLoading(v, "Ищем слово дня"); else v.textContent = "Загрузка…";
      try { words = (await fetch(`content/${COURSE_LANG}/wordle.json`).then(r => r.json())).words; }
      catch (e) { v.innerHTML = `<p class="task">Не удалось загрузить слово дня 😕</p>`; return; }
    }
    const day = dayNum(), saved = store.get("wordle", null);
    const w = todayWord();
    G = saved && saved.day === day && saved.w === w.w ? saved : { day, w: w.w, rows: [], done: false, won: false, hint: false };
    G.word = w; G.cur = [];
    render();
  };

  function save() { const { word, cur, ...rest } = G; store.set("wordle", rest); }

  function render() {
    const v = view();
    v.innerHTML = `
      <div class="wd-top"><div class="wd-title">Вордл <span>слово дня</span></div>
        <button class="wd-help" id="wdHelp" aria-label="Как играть">?</button></div>
      <div class="wd-sub" id="wdSub">${G.done ? "" : "Угадай слово на иврите из 5 букв за 6 попыток"}</div>
      <div class="wd-grid" id="wdGrid" dir="rtl">${Array.from({ length: TRIES }, (_, r) =>
        `<div class="wd-row" data-r="${r}">${Array.from({ length: LEN }, () => `<div class="wd-cell"></div>`).join("")}</div>`).join("")}</div>
      <div class="wd-hint" id="wdHint"></div>
      <div id="wdBottom"></div>`;
    G.rows.forEach((row, r) => paintRow(r, row.g, row.s, false));
    document.getElementById("wdHelp").onclick = help;
    if (G.done) showResult(false); else keyboard();
    hintLine();
  }

  function hintLine() {
    const h = document.getElementById("wdHint");
    if (!h) return;
    if (G.hint || G.done) { h.innerHTML = G.hint && !G.done ? `💡 Перевод: <b>${g(G.word.ru)}</b>` : ""; return; }
    h.innerHTML = `<button class="wd-hint-b" id="wdHintB">💡 Подсказка: перевод</button>`;
    document.getElementById("wdHintB").onclick = () => { G.hint = true; save(); hintLine(); vibrate("light"); };
  }

  function rowEl(r) { return document.querySelector(`.wd-row[data-r="${r}"]`); }
  function paintRow(r, guess, sc, animate) {
    const cells = rowEl(r).children, shown = shape(guess);
    [...cells].forEach((c, i) => {
      c.textContent = shown[i];
      const cls = ["wd-no", "wd-near", "wd-ok"][sc[i]];
      if (!animate) { c.className = "wd-cell " + cls; return; }
      c.className = "wd-cell full";
      c.style.animationDelay = (i * 0.22) + "s";
      c.classList.add("wd-flip");
      setTimeout(() => { c.classList.add(cls); }, i * 220 + 250);   // цвет меняется посреди переворота
    });
  }
  function typing() {
    const r = G.rows.length; if (r >= TRIES) return;
    const cells = rowEl(r).children, shown = shape(G.cur.concat(Array(LEN - G.cur.length).fill(""))).map((c, i) => (i < G.cur.length ? c : ""));
    [...cells].forEach((c, i) => {
      const had = c.textContent;
      c.textContent = shown[i];
      c.className = "wd-cell" + (shown[i] ? " full" : "");
      if (shown[i] && !had && window.HAnim) HAnim.pop(c);
    });
  }

  function keyboard() {
    const used = {};
    G.rows.forEach(row => row.g.forEach((c, i) => { const k = norm(c); used[k] = Math.max(used[k] != null ? used[k] : -1, row.s[i]); }));
    const st = (k) => { const u = used[norm(k)]; return u === 2 ? " wd-ok" : u === 1 ? " wd-near" : u === 0 ? " wd-no" : ""; };
    document.getElementById("wdBottom").innerHTML = `<div class="wd-kb" dir="rtl">${KEYS.map((row, i) => `<div class="wd-kr">${row.map(k =>
      `<button class="wd-k${st(k)}" data-k="${k}">${k}</button>`).join("")}${i === 2 ? `<button class="wd-k wd-del" data-k="del" aria-label="Стереть">⌫</button>` : ""}</div>`).join("")}</div>
      <button class="btn blue wd-enter" id="wdEnter">Проверить</button>`;
    document.querySelectorAll(".wd-k").forEach(b => b.onpointerdown = (e) => { e.preventDefault(); press(b.dataset.k); });
    document.getElementById("wdEnter").onclick = enter;
  }
  function press(k) {
    if (!G || G.done) return;
    if (k === "del") G.cur.pop();
    else if (G.cur.length < LEN) G.cur.push(k);
    vibrate("light"); typing();
  }
  // физическая клавиатура (на компьютере)
  document.addEventListener("keydown", (e) => {
    const v = view(); if (!v || v.hidden || !G || G.done) return;
    if (e.key === "Enter") { e.preventDefault(); enter(); }
    else if (e.key === "Backspace") { e.preventDefault(); press("del"); }
    else if (/^[א-ת]$/.test(e.key)) press(e.key);
  });

  function enter() {
    if (!G || G.done || G._busy) return;
    const r = G.rows.length;
    if (G.cur.length < LEN) {
      const row = rowEl(r); row.classList.remove("wd-shake"); void row.offsetWidth; row.classList.add("wd-shake");
      vibrate("warning"); showToast("Нужно 5 букв"); return;
    }
    const guess = [...G.cur], sc = score(guess, G.word.w);
    G.rows.push({ g: guess, s: sc }); G.cur = [];
    G._busy = true;
    paintRow(r, guess, sc, true);
    playSound("pop");
    const won = sc.every(x => x === 2), over = won || G.rows.length >= TRIES;
    setTimeout(() => {
      G._busy = false;
      if (over) finish(won); else { keyboard(); save(); }
    }, LEN * 220 + 450);
  }

  function finish(won) {
    G.done = true; G.won = won;
    const s = stats(), day = G.day;
    if (s.lastDay !== day) {
      s.played++;
      if (won) { s.won++; s.dist[G.rows.length - 1]++; s.streak = s.lastWinDay === day - 1 ? s.streak + 1 : 1; s.best = Math.max(s.best, s.streak); s.lastWinDay = day; }
      else s.streak = 0;
      s.lastDay = day;
      store.set("wordleStats", s);
      if (won) {                                           // очки дня: чем быстрее, тем больше (подсказка — половина)
        const pts = (TRIES + 1 - G.rows.length) * 10 / (G.hint ? 2 : 1);
        G.pts = pts; store.set(todayKey(), store.get(todayKey(), 0) + pts);
      }
    }
    save();
    if (won) {
      const row = rowEl(G.rows.length - 1);
      [...row.children].forEach((c, i) => { c.style.animationDelay = (i * 0.09) + "s"; c.classList.remove("wd-flip"); c.classList.add("wd-win"); });
      playSound("finish"); vibrate("success");
      if (window.HAnim) HAnim.confetti({ size: "big" });
    } else { playSound("wrong"); vibrate("error"); }
    setTimeout(() => showResult(true), won ? 900 : 500);
  }

  function showResult(fresh) {
    const w = G.word, s = stats(), won = G.won, n = G.rows.length;
    document.getElementById("wdSub").textContent = won ? `Угадано с ${n}-й попытки${G.hint ? " (с подсказкой)" : ""}!` : "Попытки кончились — вот это слово:";
    hintLine();                                            // игра окончена — кнопку подсказки убираем
    const max = Math.max(1, ...s.dist);
    document.getElementById("wdBottom").innerHTML = `
      <div class="wd-res${fresh ? " fresh" : ""}">
        <div class="wd-bird" id="wdBird"></div>
        <div class="wd-word" dir="rtl">${w.he}</div>
        <div class="wd-tr"><span class="tr">${w.tr}</span> <button class="listen small" id="wdSay" aria-label="Послушать">🔊</button></div>
        <div class="wd-ru">${g(w.ru)}</div>
        ${won && G.pts ? `<div class="wd-pts">+${G.pts} очков</div>` : ""}
        <div class="wd-stats">
          <div><b>${s.played}</b><span>сыграно</span></div><div><b>${s.played ? Math.round(s.won / s.played * 100) : 0}%</b><span>побед</span></div>
          <div><b>${s.streak}</b><span>подряд</span></div><div><b>${s.best}</b><span>рекорд</span></div>
        </div>
        <div class="wd-dist">${s.dist.map((c, i) => `<div class="wd-dr"><i>${i + 1}</i><b class="${won && n === i + 1 ? "me" : ""}" style="--w:${Math.max(8, c / max * 100)}%">${c}</b></div>`).join("")}</div>
        <div class="wd-next">Новое слово через <b id="wdLeft"></b></div>
        <button class="btn blue" id="wdShare">Поделиться результатом</button>
        <button class="btn ghost" id="wdHome">На главную</button>
      </div>`;
    const say = () => speak(w.he, { audio: w.audio });
    document.getElementById("wdSay").onclick = say; if (fresh) setTimeout(say, 400);
    document.getElementById("wdShare").onclick = share;
    document.getElementById("wdHome").onclick = () => showHome();
    if (window.HAnim) HAnim.mascot(document.getElementById("wdBird"), won ? (fresh ? "cheer" : "happy") : "sad", { size: 90 });
    const left = document.getElementById("wdLeft");
    const tick = () => {
      if (!left.isConnected) return clearInterval(t);
      const d = new Date(), ms = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) - d;
      const h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4);
      left.textContent = `${h} ч ${String(m).padStart(2, "0")} мин`;
    };
    const t = setInterval(tick, 30000); tick();
  }

  function share() {
    const grid = G.rows.map(r => [...r.s].reverse().map(x => ["⬜", "🟨", "🟩"][x]).join("")).join("\n");
    const text = `Hirbis · Вордл на иврите #${G.day + 1} — ${G.won ? G.rows.length : "X"}/${TRIES}${G.hint ? " 💡" : ""}\n${grid}`;
    const link = "https://t.me/HIRBIS_APP_Bot";
    if (tg && tg.openTelegramLink) { tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(text + "\n" + link).then(() => showToast("Скопировано — вставь другу 📋")).catch(() => {});
  }

  function help() {
    const old = document.getElementById("wdHow"); if (old) old.remove();
    const s = document.createElement("div");
    s.id = "wdHow";
    s.innerHTML = `<div class="pt-card"><div class="pt-h">Как играть</div>
      <p>Угадай слово на иврите из 5 букв. После каждой попытки клетки покажут:</p>
      <div class="wd-ex" dir="rtl"><span class="wd-cell wd-ok">ש</span><span class="wd-cell">ל</span><span class="wd-cell wd-near">ו</span><span class="wd-cell">ם</span><span class="wd-cell wd-no">ת</span></div>
      <p>🟩 буква на своём месте · 🟨 есть в слове, но в другом месте · ⬜ такой буквы нет.</p>
      <p>Слова — из нашего курса. Конечные буквы (ך ם ן ף ץ) — та же буква, в конце слова они ставятся сами. Пишется справа налево.</p>
      <p>Каждый день — новое слово, одно на всех. Чем быстрее угадаешь, тем больше очков.</p>
      <button class="btn blue" id="wdHowOk">Понятно</button></div>`;
    document.body.appendChild(s);
    requestAnimationFrame(() => s.classList.add("show"));
    const close = () => { s.classList.remove("show"); setTimeout(() => s.remove(), 250); };
    s.onclick = (e) => { if (e.target === s) close(); };
    document.getElementById("wdHowOk").onclick = close;
  }

  // Карточка на главной
  const card = document.getElementById("go-wordle");
  if (card) card.onclick = () => openWordle();
  window.wordleTodayDone = () => { const s = store.get("wordle", null); return !!(s && s.day === dayNum() && s.done); };
  // на главной у карточки — «сегодня ✓», если слово дня уже разгадано
  const prevToday = window.updateToday;
  window.updateToday = function () { prevToday(); if (card) card.classList.toggle("done", wordleTodayDone()); };
  if (card) card.classList.toggle("done", wordleTodayDone());
})();
