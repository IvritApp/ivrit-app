// =====================================================
// АЛФАВИТ — простой вариант: таблица букв → страница буквы.
// На странице буквы: название, как читается (варианты: бет б/в и т.п.),
// слоги со всеми огласовками и слова, которые надо прочитать самому.
// Данные: content/he/alphabet/letters.json
// «Стык» с приложением:
//   window.openAlphabet(sectionEl) — показать раздел
//   window.alphabetBack()          — «Назад» Telegram: true = обработали сами
// Ключ хранилища: hirbis_ab_seen — список id открытых букв.
// =====================================================
(function () {
  let root = null;        // <section id="alphabet">
  let data = null;        // содержимое letters.json
  let current = -1;       // номер открытой буквы, -1 = таблица

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const say = (text, audio) => { if (typeof speak === "function") speak(text, audio ? { audio } : undefined); };
  const pop = () => { if (typeof playSound === "function") playSound("pop"); };
  const seen = () => (typeof store !== "undefined" ? store.get("ab_seen", []) : []);
  function markSeen(id) {
    if (typeof store === "undefined") return;
    const s = seen();
    if (!s.includes(id)) { s.push(id); store.set("ab_seen", s); }
  }

  async function load() {
    if (data) return data;
    const r = await fetch("content/he/alphabet/letters.json");
    data = await r.json();
    return data;
  }

  window.openAlphabet = async function (el) {
    root = el;
    root.innerHTML = `<div class="ab-loading">Загрузка…</div>`;
    try { await load(); } catch (e) {
      root.innerHTML = `<div class="ab-loading">Не получилось загрузить буквы 😕<br><button class="btn blue" onclick="showHome()">На главный</button></div>`;
      return;
    }
    showGrid();
  };

  window.alphabetBack = function () {
    if (current >= 0) { showGrid(); return true; }
    return false;
  };

  // ---------- Таблица всех букв ----------
  function showGrid() {
    current = -1;
    const s = seen();
    const tiles = data.letters.map((L, i) => `
      <button class="ab-tile${s.includes(L.id) ? " ab-seen" : ""}" data-i="${i}">
        <span class="ab-tile-he" dir="rtl">${L.ch}</span>
        <span class="ab-tile-name">${esc(L.name)}</span>
      </button>`).join("");
    root.innerHTML = `
      <div class="ab-wrap ab-in">
        <h2 class="ab-title">Алфавит</h2>
        <p class="ab-sub">Нажми на букву — узнаешь, как она называется и читается</p>
        <div class="ab-count">Изучено: <b>${s.length}</b> из ${data.letters.length}</div>
        <div class="ab-grid" dir="rtl">${tiles}</div>
        <button class="btn ghost" id="abHome">На главный</button>
      </div>`;
    root.querySelectorAll(".ab-tile").forEach(b => b.onclick = () => { pop(); showLetter(+b.dataset.i); });
    root.querySelector("#abHome").onclick = () => showHome();
    window.scrollTo(0, 0);
  }

  // ---------- Страница одной буквы ----------
  function syllables(form) {
    // согласная «в» у вав — только а/е/и (с о и у вав сама становится гласной)
    const vowels = form.ch === "ו" ? data.vowels.slice(0, 3) : data.vowels;
    return vowels.map(v => ({ he: form.ch + v.mark, tr: form.tr + v.tr }));
  }

  function showLetter(i) {
    current = i;
    const L = data.letters[i];
    markSeen(L.id);

    const forms = L.forms.map(f => `
      <button class="ab-form" data-say="${esc(f.ch)}">
        <span class="ab-form-he" dir="rtl">${f.ch}</span>
        <span class="ab-form-sound">${f.tr ? "«" + esc(f.sound) + "»" : esc(f.sound)}</span>
        ${f.label ? `<span class="ab-form-label">${esc(f.label)}</span>` : ""}
      </button>`).join("");

    const rows = L.forms.filter(f => !f.final && !f.noSyl).map(f => `
      <div class="ab-syl-row" dir="rtl">
        ${syllables(f).map(s => `
          <button class="ab-syl" data-say="${esc(s.he)}">
            <span class="ab-syl-he">${s.he}</span>
            <span class="ab-syl-tr" dir="ltr">${esc(s.tr)}</span>
          </button>`).join("")}
      </div>`).join("");

    const legend = data.vowels.map(v =>
      `<span class="ab-vw"><bdi class="ab-vw-he" dir="rtl">◌${v.mark}${v.alt ? "\u2009◌" + v.alt : ""}</bdi> = ${v.tr}</span>`).join("");

    const words = L.words.map((w, k) => `
      <button class="ab-word" data-k="${k}">
        <span class="ab-word-he" dir="rtl">${w.he}</span>
        <span class="ab-word-ans"><span class="ab-word-tr">${esc(w.tr)}</span> — ${esc(w.ru)}</span>
        <span class="ab-word-hint">нажми, чтобы проверить</span>
      </button>`).join("");

    const prev = data.letters[i - 1], next = data.letters[i + 1];

    root.innerHTML = `
      <div class="ab-wrap ab-in">
        <div class="ab-top">
          <button class="ab-back" id="abBack">‹ Все буквы</button>
          <span class="ab-num">${i + 1} / ${data.letters.length}</span>
        </div>

        <button class="ab-big" id="abBig" dir="rtl">${L.ch}</button>
        <div class="ab-name">${esc(L.name)} <span class="ab-name-he" dir="rtl">${L.nameHe}</span> <span class="ab-spk">🔊</span></div>

        <h3 class="ab-h">Как читается</h3>
        <div class="ab-forms">${forms}</div>
        ${L.note ? `<p class="ab-note">${esc(L.note)}</p>` : ""}

        ${rows ? `<h3 class="ab-h">С огласовками</h3>
        ${rows}
        <div class="ab-legend">${legend}</div>` : ""}

        <h3 class="ab-h">Прочитай сам</h3>
        <p class="ab-sub">Попробуй прочитать слово, потом нажми на него</p>
        <div class="ab-words">${words}</div>

        <div class="ab-nav">
          ${prev ? `<button class="btn ghost ab-prev" id="abPrev">‹ <bdi>${prev.ch}</bdi> ${esc(prev.name)}</button>` : "<span></span>"}
          ${next ? `<button class="btn blue ab-next" id="abNext">${esc(next.name)} <bdi>${next.ch}</bdi> ›</button>`
                 : `<button class="btn blue ab-next" id="abDone">Все буквы ✓</button>`}
        </div>
      </div>`;

    root.querySelector("#abBack").onclick = showGrid;
    const sayName = () => say(L.nameHe, L.audio);
    root.querySelector("#abBig").onclick = () => { bounce(root.querySelector("#abBig")); sayName(); };
    root.querySelector(".ab-name").onclick = sayName;
    root.querySelectorAll("[data-say]").forEach(b => b.onclick = () => { bounce(b); say(b.dataset.say); });
    root.querySelectorAll(".ab-word").forEach(b => b.onclick = () => {
      const w = L.words[+b.dataset.k];
      b.classList.add("ab-open");
      say(w.he, w.audio);
    });
    if (prev) root.querySelector("#abPrev").onclick = () => { pop(); showLetter(i - 1); };
    if (next) root.querySelector("#abNext").onclick = () => { pop(); showLetter(i + 1); };
    else root.querySelector("#abDone").onclick = () => { if (typeof playSound === "function") playSound("finish"); showGrid(); };
    window.scrollTo(0, 0);
  }

  function bounce(el) { el.classList.remove("ab-bounce"); void el.offsetWidth; el.classList.add("ab-bounce"); }
})();
