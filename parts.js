// =====================================================
// ЧАСТИ УРОКА: каждый урок = 3–6 коротких частей (как в Duolingo — кольцо вокруг кружка урока).
// Часть 1 — задания из файла урока (как раньше). Части 2…N собираются здесь из тех же слов и фраз,
// и каждая следующая — сложнее: больше «на слух», «собери фразу», блиц, иногда слова прошлых уроков.
// Сколько частей — по числу и сложности новых слов (длинные слова и выражения из нескольких слов — сложнее).
//
// Прогресс: store "parts" = { "<урок>": сколько частей пройдено }, урок пройден (done) после последней части.
// Золотой урок — все части без ошибок: store "partsGold" = { "<урок>": [номера идеальных частей] }.
// =====================================================
(function () {
  const cache = {};
  window.getLesson = function (id) {
    if (!cache[id]) cache[id] = fetch(`content/${COURSE_LANG}/lessons/${id}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(e => { delete cache[id]; throw e; });
    return cache[id];
  };

  const strip = (s) => String(s || "").replace(/[֑-ׇ]/g, "").replace(/\{[mf]:([^}]*)\}/g, "$1").replace(/[?!.,]/g, "").trim();

  // Сколько частей в уроке: 3 базовые + за количество слов + за сложные слова + за много фраз
  window.partsCount = function (data) {
    const n = data.newCount || data.words.length;
    const hard = data.words.slice(0, n).filter(w => { const s = strip(w.he); return s.includes(" ") || s.length >= 6; }).length;
    const ph = (data.phrases || []).length;
    return Math.min(6, 3 + (n >= 6 ? 1 : 0) + (hard >= 2 ? 1 : 0) + (hard >= 4 || ph >= 3 ? 1 : 0));
  };

  // Порядок заданий частей 2…6 (чем дальше, тем больше «на слух» и «собери фразу»)
  const PLAN = [
    null,
    ["choose_hebrew", "listen", "choose_translation", "match_pairs", "choose_hebrew", "build_phrase", "listen", "choose_hebrew", "choose_translation"],
    ["listen", "build_phrase", "choose_hebrew", "listen", "match_pairs", "choose_translation", "build_phrase", "listen", "blitz", "choose_hebrew"],
    ["build_phrase", "listen", "choose_hebrew", "build_phrase", "listen", "match_pairs", "choose_hebrew", "blitz", "build_phrase", "listen"],
    ["listen", "choose_hebrew", "build_phrase", "listen", "build_phrase", "choose_hebrew", "match_pairs", "listen", "build_phrase", "blitz"],
    ["build_phrase", "listen", "listen", "choose_hebrew", "build_phrase", "match_pairs", "choose_hebrew", "build_phrase", "blitz", "listen"]
  ];
  const shuf = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function buildExercises(data, k) {
    const n = data.newCount || data.words.length;
    const fresh = Array.from({ length: n }, (_, i) => i);
    const old = Array.from({ length: data.words.length - n }, (_, i) => n + i);
    // каждая часть начинает с других слов; с 3-й части иногда попадаются слова прошлых уроков
    let bag = [];
    const nextWord = (avoid) => {
      if (!bag.length) bag = shuf(fresh).concat(k >= 3 && old.length ? shuf(old).slice(0, 2) : []);
      let i = bag.findIndex(x => x !== avoid);
      if (i < 0) i = 0;
      return bag.splice(i, 1)[0];
    };
    const phrases = (data.phrases || []).length;
    let ph = k % Math.max(1, phrases), last = -1;
    return PLAN[Math.min(k, PLAN.length - 1)].map(t => {
      if (t === "build_phrase") {
        if (!phrases) t = "choose_hebrew";
        else { const e = { type: t, phrase: ph % phrases }; ph++; return e; }
      }
      if (t === "match_pairs" || t === "blitz") return { type: t };
      const w = nextWord(last); last = w;
      return { type: t, word: w };
    });
  }

  // ---------- прогресс ----------
  window.partsDoneOf = function (id, total) {
    if (doneLessons().includes(id)) return total;                 // урок уже пройден (в том числе до появления частей)
    return Math.min(total, (store.get("parts", {})[id] || 0));
  };
  function setPartsDone(id, v) { const m = store.get("parts", {}); m[id] = Math.max(m[id] || 0, v); store.set("parts", m); }
  function markPartGold(id, k, total) {
    const m = store.get("partsGold", {}), list = m[id] || [];
    if (!list.includes(k)) list.push(k);
    m[id] = list; store.set("partsGold", m);
    return list.length >= total;
  }

  // ---------- запуск части ----------
  window.startLessonPart = function (id, k) {
    getLesson(id).then(raw => {
      const data = JSON.parse(JSON.stringify(raw));
      const total = partsCount(data);
      if (k == null) k = partsDoneOf(id, total) % total;
      k = Math.max(0, Math.min(total - 1, k));
      if (k > 0) data.exercises = buildExercises(data, k);
      data.part = k; data.partsTotal = total;
      startLesson(data);
    }).catch(() => startLesson(id));                              // нет файла / нет сети — как раньше
  };

  // Вызывается из showFinish (app.js) вместо markDone/markPerfect для уроков с частями.
  // Возвращает { lessonDone, gold, next } — next = номер следующей части или -1.
  window.finishLessonPart = function (lessonData, perfect) {
    const id = lessonData.id, k = lessonData.part, total = lessonData.partsTotal;
    const before = partsDoneOf(id, total);
    if (k + 1 > before) setPartsDone(id, k + 1);
    const allGold = perfect ? markPartGold(id, k, total) : false;
    const nowDone = partsDoneOf(id, total) >= total;
    if (nowDone) markDone(id);
    if (allGold && nowDone) markPerfect(id);
    const next = nowDone ? -1 : partsDoneOf(id, total);
    return { lessonDone: nowDone, justDone: nowDone && before < total, gold: allGold && nowDone, next };
  };

  // ---------- дорожка: подписи «2/4», полоски частей и кольцо ----------
  window.partsDecorate = function (lvl, pathEl) {
    lvl.lessons.forEach(id => getLesson(id).then(data => {
      const total = partsCount(data), dn = partsDoneOf(id, total);
      const btn = pathEl.querySelector(`.p-node[data-lesson="${id}"]`);
      if (!btn || !btn.isConnected) return;
      btn.dataset.parts = total; btn.dataset.pdone = dn;
      const wrap = btn.parentNode, lab = wrap.querySelector(".p-label");
      if (lab && !wrap.querySelector(".p-parts")) {
        const bar = document.createElement("div");
        bar.className = "p-parts";
        bar.innerHTML = Array.from({ length: total }, (_, i) => `<i class="${i < dn ? "on" : ""}" style="--i:${i}"></i>`).join("");
        lab.after(bar);
        if (!btn.classList.contains("locked")) lab.textContent += ` · ${dn}/${total}`;
      }
      // кольцо вокруг текущего урока = сколько его частей пройдено
      if (btn.classList.contains("ha-node-cur") && window.HAnim) HAnim.play("nodePulse", { el: btn, progress: dn / total });
    }).catch(() => {}));
  };

  // Пройденный урок: выбрать, какую часть повторить
  window.partsPicker = function (id) {
    getLesson(id).then(data => {
      const total = partsCount(data), gold = (store.get("partsGold", {})[id] || []);
      const old = document.getElementById("ptSheet"); if (old) old.remove();
      const s = document.createElement("div");
      s.id = "ptSheet";
      s.innerHTML = `<div class="pt-card"><div class="pt-h">${g(data.title)}</div><div class="pt-sub">Какую часть повторить?</div>
        <div class="pt-grid">${Array.from({ length: total }, (_, i) => `<button class="pt-b${gold.includes(i) ? " gold" : ""}" data-k="${i}" style="--i:${i}"><b>${gold.includes(i) ? "★" : i + 1}</b><span>Часть ${i + 1}</span></button>`).join("")}</div>
        <button class="btn ghost" id="ptClose">Закрыть</button></div>`;
      document.body.appendChild(s);
      requestAnimationFrame(() => s.classList.add("show"));
      const close = () => { s.classList.remove("show"); setTimeout(() => s.remove(), 250); };
      s.onclick = (e) => { if (e.target === s) close(); };
      s.querySelector("#ptClose").onclick = close;
      s.querySelectorAll(".pt-b").forEach(b => b.onclick = () => { close(); startLessonPart(id, +b.dataset.k); });
    }).catch(() => startLesson(id));
  };
})();
