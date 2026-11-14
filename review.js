// =====================================================
// ПОВТОРЕНИЕ ПОСЛЕ КВЕСТА: если в квесте разговор шёл тяжело — 4 урока-выжимки по словам уровня и по твоим ошибкам
// Уроки собираются прямо в приложении из уроков уровня + слабых фраз квеста (store "weak_q-…")
// id урока: "rev-<уровень>-<номер>", например rev-a1-4-2
// =====================================================
(function () {
  const TITLES = ["Выжимка: слова (1/2)", "Выжимка: слова (2/2)", "Фразы для разговора", "Работа над ошибками"];
  const EX = [["choose_translation", 0], ["listen", 1], ["choose_hebrew", 2], ["build_phrase", 0], ["choose_translation", 3], ["blitz"], ["match_pairs"], ["listen", 4], ["build_phrase", 1], ["choose_hebrew", 5], ["build_phrase", 2], ["listen", 0]];
  const N = TITLES.length;
  function levelById(id) { const ch = course && course.chapters[0]; return ch ? ch.levels.find(l => l.id === id) : null; }
  async function levelData(lvl) {
    const all = await Promise.all(lvl.lessons.map(id => fetch(`content/${COURSE_LANG}/lessons/${id}.json`).then(r => r.json()).catch(() => null)));
    const words = [], phrases = [], seen = new Set();
    all.filter(Boolean).forEach(d => {
      d.words.slice(0, d.newCount || d.words.length).forEach(w => { if (!seen.has(w.he)) { seen.add(w.he); words.push(w); } });
      (d.phrases || []).forEach(p => phrases.push(p));
    });
    return { words, phrases };
  }
  const shuf = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // какие слова встречаются в трудных фразах — их ставим первыми
  function weakFirst(words, weak) {
    const txt = weak.map(x => x.he).join(" ");
    const strip = s => String(s).replace(/[֑-ׇ]/g, "").replace(/\{[mf]:([^}]*)\}/g, "$1");
    const w1 = words.filter(w => strip(txt).includes(strip(w.he).split(" ")[0]));
    return [...w1, ...words.filter(w => !w1.includes(w))];
  }
  window.buildReview = async function (levelId, k) {
    const lvl = levelById(levelId);
    if (!lvl) throw new Error("no level");
    const { words, phrases } = await levelData(lvl);
    const weak = store.get("weak_q-" + lvl.quest, []);
    const ordered = weakFirst(words, weak);
    let ws, ps;
    const half = Math.ceil(ordered.length / 2);
    if (k === 0) { ws = ordered.slice(0, Math.min(10, half)); ps = phrases.slice(0, 3); }
    else if (k === 1) { ws = ordered.slice(half, half + 10); ps = phrases.slice(3, 6); }
    else if (k === 2) { ws = shuf(ordered).slice(0, 10); ps = shuf(phrases).slice(0, 3); }
    else { ws = ordered.slice(0, 10); ps = (weak.length ? weak : phrases).slice(-3); }
    if (ws.length < 6) ws = ws.concat(shuf(words.filter(w => !ws.includes(w)))).slice(0, 8);
    if (!ps.length) ps = phrases.slice(0, 2);
    // работа над ошибками: трудные фразы квеста — в начало и в «собери фразу»
    const exs = EX.filter(([t, v]) => t !== "build_phrase" || v < ps.length).map(([t, v]) => {
      const e = { type: t };
      if (t === "build_phrase") e.phrase = v; else if (v !== undefined) e.word = Math.min(v, ws.length - 1);
      return e;
    });
    return { id: `rev-${levelId}-${k + 1}`, level: "A1", title: `🔁 ${TITLES[k]}`, words: ws, newCount: Math.min(ws.length, 8), exercises: exs, phrases: ps, review: true };
  };
  window.reviewCount = N;
  window.reviewTitles = TITLES;
  // уровень помечен «нужно повторение» после трудного квеста
  window.reviewNeeded = (levelId) => store.get("review_" + levelId, false);
  window.reviewDoneN = (levelId) => Array.from({ length: N }, (_, k) => `rev-${levelId}-${k + 1}`).filter(id => doneLessons().includes(id)).length;
  window.startReview = function (levelId, k) {
    if (k == null) { k = 0; while (k < N - 1 && doneLessons().includes(`rev-${levelId}-${k + 1}`)) k++; }
    buildReview(levelId, k).then(d => startLesson(d)).catch(() => showToast("Не получилось собрать повторение 😕"));
  };
})();
