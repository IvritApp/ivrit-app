// =====================================================
// «ЗАПОМНИЛ / ПОВТОРИТЬ» (22.11, просьба владельца)
// 1) Карточка «✨ Новое слово»: кнопка «Уже знаю — пропустить» → слово помечено «знаю», задание с ним в этой части пропускается.
// 2) Конец урока: «Какие слова ты запомнил?» — у каждого слова ✓ Запомнил / 🔁 Повторить (слово с ошибкой — сразу 🔁).
// 3) «Знаю» — эти слова больше не гоняем в собранных частях (4…N) и в повторении; «Повторить» — ставим первыми,
//    а на дорожке появляется «🔁 Повтори слова (N)» — отдельное короткое занятие из этих слов (сердечки не тратит).
// store "wordMarks" = { "<иврит без огласовок>": "k" | {m:"r", he, tr, ru, audio} } — синхронизируется сам (sync.js).
// =====================================================
(function () {
  const KEY = "wordMarks";
  const norm = (he) => String(typeof g === "function" ? g(he || "") : he || "").replace(/[֑-ׇ]/g, "").replace(/[?!.,]/g, "").trim();
  const all = () => store.get(KEY, {});
  function get(w) { const v = all()[norm(w.he)]; return v === "k" ? "k" : v && v.m === "r" ? "r" : ""; }
  function set(w, m) {
    const s = all(), k = norm(w.he);
    if (!k) return;
    if (m === "k") s[k] = "k";
    else if (m === "r") s[k] = { m: "r", he: w.he, tr: w.tr, ru: w.ru, audio: w.audio || undefined };
    else delete s[k];
    store.set(KEY, s);
  }
  const known = (w) => get(w) === "k";
  const repeat = (w) => get(w) === "r";
  function repeatList() { return Object.values(all()).filter(v => v && v.m === "r" && v.he); }

  // ---------- 1) карточка нового слова: «Уже знаю» ----------
  function wrapCard() {
    const orig = window.showWordCard;
    if (!orig || orig._wm) return;
    window.showWordCard = function (ex) {
      orig(ex);
      const w = lesson && lesson.words[ex.word], box = document.getElementById("cd-btns");
      if (!w || !box || lesson.review || lesson.practice) return;
      const b = document.createElement("button");
      b.className = "btn ghost wm-skip"; b.id = "cd-skip";
      b.textContent = "Уже знаю — пропустить";
      box.appendChild(b); box.classList.add("has-skip");   // кнопки столбиком (без :has — для старых телефонов)
      b.onclick = function () {
        if (this.disabled) return;
        box.querySelectorAll("button").forEach(x => x.disabled = true);   // и «Запомнил, дальше» тоже — иначе двойной goNext
        set(w, "k");
        // задание с этим словом сразу за карточкой — тоже пропускаем (оно было бы слишком лёгким)
        const nx = queue[step + 1];
        if (nx && nx.type !== "card" && nx.word === ex.word && nx.type !== "match_pairs") queue.splice(step + 1, 1);
        if (typeof showToast === "function") showToast("Отлично! Это слово не будем повторять ✓");
        playSound("pop"); vibrate("light"); goNext();
      };
    };
    window.showWordCard._wm = true;
  }

  // ---------- 2) конец урока ----------
  // какие слова были в этом занятии (без фраз): из заданий урока + все новые слова частей «знакомство»
  function lessonWords(l) {
    const idx = new Set();
    (l.exercises || []).forEach(e => { if (e.word != null && e.type !== "build_phrase") idx.add(e.word); });
    const seen = new Set();
    return [...idx].sort((a, b) => a - b).map(i => ({ i, w: l.words[i] }))
      .filter(x => x.w && !seen.has(norm(x.w.he)) && seen.add(norm(x.w.he)));
  }
  function finishBox(l, el) {
    if (!el || !l || String(l.id).startsWith("exam-")) return;
    const list = lessonWords(l);
    if (!list.length) return;
    const missed = l._missed || {};
    // слово с ошибкой — сразу «повторить» (игрок может передумать);
    // в «🔁 Повтори слова» слово без ошибки уходит из списка повторения (отметить снова можно кнопками ниже)
    list.forEach(x => { if (missed[x.i]) { if (!repeat(x.w)) set(x.w, "r"); } else if (l.id === "repeat" && repeat(x.w)) set(x.w, ""); });
    const row = (x) => {
      const m = get(x.w);
      return `<div class="wm-row" data-i="${x.i}">
        <div class="wm-w"><b dir="rtl">${x.w.he}</b><span>${x.w.ru}</span></div>
        <button class="wm-b ok${m === "k" ? " on" : ""}" data-m="k">✓ Запомнил${typeof g === "function" ? g("{m:}{f:а}") : ""}</button>
        <button class="wm-b rep${m === "r" ? " on" : ""}" data-m="r">🔁 Повторить</button>
      </div>`;
    };
    el.innerHTML = `<div class="wm-h">Какие слова ты уже запомнил${typeof g === "function" ? g("{m:}{f:а}") : ""}?</div>
      <div class="wm-sub">«Запомнил» — больше не будем их гонять. «Повторить» — вернутся в следующих уроках и в «🔁 Повтори слова».</div>
      <div class="wm-list">${list.map(row).join("")}</div>
      <button class="wm-all" id="wmAll">✓ Запомнил${typeof g === "function" ? g("{m:}{f:а}") : ""} все</button>`;
    el.hidden = false;
    const paint = (r, m) => r.querySelectorAll(".wm-b").forEach(b => b.classList.toggle("on", b.dataset.m === m));
    el.querySelectorAll(".wm-row").forEach(r => {
      const x = list.find(y => y.i === +r.dataset.i);
      r.querySelector(".wm-w").onclick = () => speak(x.w.he, { audio: x.w.audio });
      r.querySelectorAll(".wm-b").forEach(b => b.onclick = () => {
        const m = get(x.w) === b.dataset.m ? "" : b.dataset.m;     // повторное нажатие — снять выбор
        set(x.w, m); paint(r, m); vibrate("light");
      });
    });
    el.querySelector("#wmAll").onclick = () => {
      list.forEach(x => set(x.w, "k"));
      el.querySelectorAll(".wm-row").forEach(r => paint(r, "k"));
      vibrate("success");
    };
  }

  // ---------- 3) занятие «🔁 Повтори слова» ----------
  function startRepeat() {
    const ws = repeatList().slice(-12);
    if (!ws.length) { showToast("Слов для повторения пока нет 👍"); return; }
    // для неверных вариантов нужны ещё слова — берём из последнего пройденного урока (и из первого урока — про запас)
    const last = doneLessons().filter(id => /^a1-\d+-\d+$/.test(id)).pop() || "a1-1-1";
    const get1 = (id) => getLesson(id).catch(() => ({ words: [] }));
    Promise.all([get1(last), get1("a1-1-1")]).then(([d1, d2]) => {
      const have = new Set(ws.map(w => norm(w.he)));
      const pool = (d1.words || []).concat(d2.words || []).map(w => Object.assign({}, w, { he: g(w.he), tr: g(w.tr), ru: g(w.ru) }));
      const pad = pool.filter(w => !have.has(norm(w.he)) && have.add(norm(w.he))).slice(0, Math.max(0, 6 - ws.length) + 3);
      const words = ws.concat(pad);
      if (words.length < 4) { showToast("Не получилось собрать повторение — проверь интернет 😕"); return; }
      if (window.track) track("repeat_start");
      const T = ["choose_translation", "listen", "choose_hebrew"];
      const ex = [];
      ws.forEach((_, i) => ex.push({ type: T[i % 3], word: i }));
      if (words.length >= 3) ex.push({ type: "match_pairs" });
      ws.forEach((_, i) => ex.push({ type: T[(i + 1) % 3], word: i }));
      startLesson({ id: "repeat", level: "A1", title: "🔁 Повтори слова", words, newCount: ws.length, phrases: [], exercises: ex, review: true });
    });
  }
  // кнопка на дорожке (path.js зовёт после отрисовки)
  function pathHTML() {
    const n = repeatList().length;
    return n ? `<button class="p-soon p-repeat" id="p-repeat"><b>🔁 Повтори слова</b><span>${n}</span></button>` : "";
  }

  window.WordMarks = { get, set, known, repeat, repeatList, finishBox, startRepeat, pathHTML, norm };
  wrapCard();
  window.addEventListener("DOMContentLoaded", wrapCard);
})();
