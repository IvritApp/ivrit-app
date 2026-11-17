// =====================================================
// ЧАСТИ УРОКА: каждый урок = 3–6 коротких частей (как в Duolingo — кольцо вокруг кружка урока).
// Часть 1 и 2 — ЗНАКОМСТВО: каждое новое слово сначала карточкой («✨ Новое слово»), сразу за ней задание с ним
// (первая половина слов — в части 1, вторая — в части 2). Часть 3 — задания из файла урока.
// Части 4…N собираются здесь: больше «на слух», «собери фразу», блиц, иногда слова прошлых уроков.
// На дорожке — кольцо из отрезков вокруг кружка (1 отрезок = 1 часть), нажал — окошко «НАЧАТЬ».
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

  // Знакомство с новыми словами: КАРТОЧКА слова → сразу простое задание с ним (ведём за руку)
  function introExercises(data, from, to) {
    const out = [];
    for (let i = from; i < to; i++) {
      out.push({ type: "card", word: i });
      out.push({ type: (i - from) % 2 ? "listen" : "choose_translation", word: i });
    }
    if (to >= 3) out.push({ type: "match_pairs" });               // пары — из уже показанных слов
    return out;
  }

  // ---------- запуск части ----------
  // Часть 1 — первая половина новых слов (карточка + задание), часть 2 — вторая половина + «собери фразу»,
  // часть 3 — задания из файла урока, части 4…N — собираются (buildExercises), всё сложнее.
  window.startLessonPart = function (id, k) {
    getLesson(id).then(raw => {
      const data = JSON.parse(JSON.stringify(raw));
      const total = partsCount(data);
      if (k == null) k = partsDoneOf(id, total) % total;
      k = Math.max(0, Math.min(total - 1, k));
      const n = data.newCount || data.words.length, half = Math.ceil(n / 2);
      if (k === 0) { data.exercises = introExercises(data, 0, half); data.newCount = half; }
      else if (k === 1) {
        data.exercises = introExercises(data, half, n);
        if ((data.phrases || []).length) data.exercises.push({ type: "build_phrase", phrase: 0 });
        data.newCount = n;
      }
      else if (k >= 3) data.exercises = buildExercises(data, k - 2);
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

  // ---------- дорожка: кольцо из отрезков вокруг кружка урока (как в Duolingo) ----------
  // Один отрезок = одна часть. Пройденные — зелёные (у золотого урока — золотые), остальные — серые.
  const R = 45, C = 2 * Math.PI * R;
  function ringSVG(total, dn, gold) {
    const gap = total > 1 ? 7 : 0, seg = C / total - gap;
    return `<svg class="p-ring" viewBox="0 0 100 100" aria-hidden="true">${Array.from({ length: total }, (_, i) =>
      `<circle cx="50" cy="50" r="${R}" class="p-ring-s${i < dn ? (gold ? " gold" : " on") : ""}" style="--i:${i}"
        stroke-dasharray="${seg.toFixed(2)} ${C.toFixed(2)}" transform="rotate(${(-90 + i * 360 / total + (gap / C) * 180).toFixed(2)} 50 50)"/>`).join("")}</svg>`;
  }
  window.partsDecorate = function (lvl, pathEl) {
    lvl.lessons.forEach(id => getLesson(id).then(data => {
      const total = partsCount(data), dn = partsDoneOf(id, total);
      const btn = pathEl.querySelector(`.p-node[data-lesson="${id}"]`);
      if (!btn || !btn.isConnected || btn.querySelector(".p-ring")) return;
      btn.dataset.parts = total; btn.dataset.pdone = dn; btn.dataset.title = g(data.title || "");
      btn.insertAdjacentHTML("beforeend", ringSVG(total, dn, perfectLessons().includes(id)));
    }).catch(() => {}));
  };

  // ---------- окошко под кружком: «Урок 2 · Доброе утро! · Часть 2 из 4 · НАЧАТЬ» ----------
  window.partsPopover = function (btn, k, run) {
    const track = btn.closest(".p-track");
    const old = track && track.querySelector(".p-pop");
    if (old) { const same = old._for === btn; old.remove(); if (same) return; }   // повторное нажатие — закрыть
    const id = btn.dataset.lesson;
    getLesson(id).then(data => {
      const total = partsCount(data), dn = partsDoneOf(id, total), done = doneLessons().includes(id);
      const gold = (store.get("partsGold", {})[id] || []);
      const next = done ? 0 : dn;
      const pop = document.createElement("div");
      pop.className = "p-pop" + (done ? " done" : "");
      pop._for = btn;
      pop.innerHTML = `
        <div class="p-pop-h">Урок ${k + 1} · ${esc(g(data.title || ""))}</div>
        <div class="p-pop-sub">${done ? "Пройден! Можно повторить любую часть" : dn ? `Часть ${dn + 1} из ${total}` : `${total} ${total < 5 ? "части" : "частей"} · начни с новых слов`}</div>
        <div class="p-pop-parts">${Array.from({ length: total }, (_, i) =>
          `<button class="p-pop-p${i < dn ? " on" : ""}${gold.includes(i) ? " gold" : ""}${i === next && !done ? " now" : ""}" data-k="${i}"${!done && i > dn ? " disabled" : ""}>${gold.includes(i) ? "★" : i + 1}</button>`).join("")}</div>
        <button class="p-pop-go" id="pPopGo">${done ? "ПОВТОРИТЬ" : dn ? "ПРОДОЛЖИТЬ" : "НАЧАТЬ"}</button>`;
      track.appendChild(pop);
      // ставим окошко под кружком, но не за краем экрана; стрелка смотрит на кружок
      const tr = track.getBoundingClientRect(), br = btn.getBoundingClientRect();
      const w = Math.min(300, tr.width - 8), cx = br.left + br.width / 2 - tr.left;
      const left = Math.max(4, Math.min(tr.width - w - 4, cx - w / 2));
      pop.style.width = w + "px"; pop.style.left = left + "px"; pop.style.top = (br.bottom - tr.top + 14) + "px";
      pop.style.setProperty("--ax", (cx - left) + "px");
      requestAnimationFrame(() => { pop.classList.add("show"); setTimeout(() => pop.scrollIntoView && pop.scrollIntoView({ block: "nearest", behavior: "smooth" }), 120); });
      if (typeof vibrate === "function") vibrate("light");
      pop.querySelector("#pPopGo").onclick = () => { pop.remove(); run(next); };
      pop.querySelectorAll(".p-pop-p:not([disabled])").forEach(b => b.onclick = () => { pop.remove(); run(+b.dataset.k); });
      // нажатие мимо окошка — закрыть
      setTimeout(() => document.addEventListener("pointerdown", function off(e) {
        if (!pop.isConnected) return document.removeEventListener("pointerdown", off, true);
        if (!pop.contains(e.target) && e.target !== btn && !btn.contains(e.target)) { pop.remove(); document.removeEventListener("pointerdown", off, true); }
      }, true), 0);
    }).catch(() => run());
  };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

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
