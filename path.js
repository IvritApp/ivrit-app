// =====================================================
// ОСНОВНОЕ ОБУЧЕНИЕ: дорожка уровня.
// Глава (A1) → уровни → в уровне 7 уроков и в конце квест.
// Структура курса — в файле content/<язык>/course.json, прогресс — в памяти устройства (потом — на сервере).
// =====================================================
const pathView = document.getElementById("path");
let course = null;
// ВРЕМЕННО для проверки: все уроки и квест открыты сразу. Потом поставить false.
// Режим тестировщика: всё открыто. Включается в ⚙️ Настройках по паролю (только на этом телефоне).
function testMode() { return store.get("testmode", false) === true; }

// =====================================================
// МЕДАЛИ
// Уровень ЗОЛОТОЙ: все уроки золотые + квест золотой.
// Медаль главы (в процентах золотых уровней): 🥇 100%, 🥈 от 85%, 🥉 от 70%. Меньше — медали нет.
// Для 10 уровней: золото 10, серебро 9, бронза 7.
const MEDAL_PCT = { silver: 0.85, bronze: 0.70 };
function medalNeed(n, k) { return k === "gold" ? n : Math.ceil(n * MEDAL_PCT[k] - 1e-9); }
// Медали видны в профиле (потом — и друзьям, когда будет сервер).
// =====================================================
function levelGold(l) {
  if (!l.lessons || !l.lessons.length) return false;
  const gold = store.get("perfect", []);
  return l.lessons.every(id => gold.includes(id)) && store.get("questGold_q-" + l.quest, false);
}
function levelDone(l) {
  if (!l.lessons || !l.lessons.length) return false;
  return l.lessons.every(id => store.get("done", []).includes(id)) && store.get("quest_q-" + l.quest, false);
}
function chapterMedal(ch) {
  const n = ch.levels.length, g = ch.levels.filter(levelGold).length, d = ch.levels.filter(levelDone).length;
  if (d < n) return null;
  return g >= medalNeed(n, "gold") ? "gold" : g >= medalNeed(n, "silver") ? "silver" : g >= medalNeed(n, "bronze") ? "bronze" : null;
}
const MEDAL = { gold: ["🥇", "Золотая"], silver: ["🥈", "Серебряная"], bronze: ["🥉", "Бронзовая"] };
function updateMedals() {                       // запоминаем лучшие медали за главы
  if (!course) return;
  const m = store.get("medals", {});
  const rank = { bronze: 1, silver: 2, gold: 3 };
  let won = null;                                 // новая (или лучшая, чем была) медаль
  course.chapters.forEach(ch => { const md = chapterMedal(ch); if (md && (!m[ch.id] || rank[md] > rank[m[ch.id]])) { m[ch.id] = md; won = { type: md, ch: ch }; } });
  store.set("medals", m);
  // медаль падает сверху, крутится, конфетти (anim.js)
  if (won && window.HAnim) setTimeout(() => HAnim.play("medal", { type: won.type, title: (won.ch.title || "Глава") + " — пройдена!",
    text: MEDAL[won.type][1] + " медаль — твоя!", onPeak: () => { if (typeof playSound === "function") playSound("finish"); } }).catch(() => {}), 500);
}

function doneLessons() { return store.get("done", []); }
function perfectLessons() { return store.get("perfect", []); }
function markPerfect(id) { const d = perfectLessons(); if (!d.includes(id)) { d.push(id); store.set("perfect", d); } }
function markDone(id) { const d = doneLessons(); if (!d.includes(id)) { d.push(id); store.set("done", d); } }

function showPath() {
  stopHomeBird(); hideFeedback();
  if (typeof closeStage === "function") closeStage();
  document.querySelectorAll("body > section").forEach(sec => sec.hidden = sec.id !== "path");
  if (tg && tg.BackButton) tg.BackButton.show();
  if (course) { if (!autoIntro()) renderPath(); return; }
  pathView.innerHTML = `<p class="task">Загрузка…</p>`;
  fetch(`content/${COURSE_LANG}/course.json`).then(r => r.json()).then(c => { course = c; if (!autoIntro()) renderPath(); });
}

// Первый заход в «Основное обучение»: сразу запускаем кино и сцену в такси,
// после «Учить слова» — сразу первый урок. Если игрок вышел посередине — второй раз не навязываем
// (сцену можно открыть кнопкой «Сцена: в такси»).
function autoIntro() {
  const lvl = course.chapters[0].levels[0];
  if (lvl.intro !== "taxi" || store.get("taxiSeen", false) || autoIntro.tried) return false;
  autoIntro.tried = true;
  // после такси — сразу первый урок (его часть 1 начинается с карточек новых слов)
  showTaxi(() => window.startLessonPart ? startLessonPart(lvl.lessons[0]) : startLesson(lvl.lessons[0]));
  return true;
}

// Какой уровень показывать: выбранный игроком, иначе первый ещё не пройденный (из готовых)
// Уровень открыт, если пройден предыдущий (или включён режим тестировщика)
function levelOpen(ch, i) { return testMode() || i === 0 || levelDone(ch.levels[i - 1]); }
function currentLevelIdx(ch) {
  const ready = ch.levels.map((l, i) => l.soon ? -1 : i).filter(i => i >= 0);
  const picked = store.get("level_" + ch.id, null);
  if (picked !== null && ready.includes(picked) && levelOpen(ch, picked)) return picked;
  const open = ready.find(i => !levelDone(ch.levels[i]));
  return open !== undefined ? open : ready[ready.length - 1];
}
// Значок квеста: нарисованный подарок (places.js) или старая картинка-файл
function questIcon(img) {
  img = img || "gift-shawarma";
  const svg = window.placeGift && window.placeGift(img);
  return svg ? `<i class="p-quest-svg">${svg}</i>` : `<img src="assets/${img}.png" alt="">`;
}

function renderPath() {
  const ch = course.chapters[0];                 // пока одна глава — A1
  const lvlIdx = currentLevelIdx(ch);
  const lvl = ch.levels[lvlIdx];
  updateMedals();
  const goldLevels = ch.levels.filter(levelGold).length;
  const myMedal = store.get("medals", {})[ch.id];
  const isGoldLvl = levelGold(lvl);
  const done = doneLessons();
  const gold = perfectLessons();
  const goldCount = lvl.lessons.filter(id => gold.includes(id)).length;
  const allDone = testMode() || lvl.lessons.every(id => done.includes(id));
  const questDone = store.get("quest_q-" + lvl.quest, false);
  const questGold = store.get("questGold_q-" + lvl.quest, false);
  const nextIdx = lvl.lessons.findIndex(id => !done.includes(id));   // первый непройденный

  // змейка: смещение кружков влево-вправо
  const offs = [0, 60, 90, 60, 0, -60, -90];
  const nodes = lvl.lessons.map((id, k) => {
    const st = done.includes(id) ? (gold.includes(id) ? "done gold" : "done") : (k === nextIdx || testMode()) ? "current" : "locked";
    const icon = st === "done gold" ? "★" : st === "done" ? "✓" : st === "locked" ? "🔒" : (k + 1);
    return `<div class="p-node-wrap${st === "current" && k === nextIdx ? " cur" : ""}" style="transform:translateX(${offs[k % offs.length]}px)">
      ${st === "current" && k === nextIdx ? `<div class="p-start">Старт</div>` : ""}
      <button class="p-node ${st}" data-lesson="${id}" data-k="${k}">${icon}</button>
      <div class="p-label">Урок ${k + 1}</div>
    </div>`;
  }).join("");

  // 21.11: «для тупых» — пока не пройден ни один урок, не грузим новичка медалями и правилами «золотого уровня»
  pathView.classList.toggle("p-fresh", !testMode() && !done.some(id => /^a1-/.test(id)));
  pathView.innerHTML = `
    <button class="p-settings" id="p-settings" aria-label="Настройки">⚙️</button>
    ${testMode() ? `<div class="p-test">🔓 Режим тестировщика: всё открыто</div>` : ""}
    <div class="p-chapter">
      <div class="p-ch-badge">${ch.id}</div>
      <div><div class="p-ch-title">${ch.title}</div><div class="p-ch-sub">Уровень ${lvlIdx + 1} из ${ch.levels.length}</div></div>
    </div>
    <div class="p-medals">
      ${["gold", "silver", "bronze"].map(k => `<div class="p-medal ${myMedal === k ? "won" : ""}"><span>${MEDAL[k][0]}</span><small>${
        k === "gold" ? `все ${ch.levels.length} уровней золотые` : `${medalNeed(ch.levels.length, k)} из ${ch.levels.length} золотые (${Math.round(MEDAL_PCT[k] * 100)}%)`}</small></div>`).join("")}
      <div class="p-medal-note">Золотых уровней: <b>${goldLevels} из ${ch.levels.length}</b></div>
    </div>
    <div id="p-cur-level">
    <div class="p-level">
      <div class="p-level-title">Уровень ${lvlIdx + 1} · ${lvl.title}${isGoldLvl ? ` <span class="p-lvl-gold">🏅 золотой</span>` : ""}</div>
      <div class="p-level-sub">${done.filter(id => lvl.lessons.includes(id)).length} из ${lvl.lessons.length} уроков${goldCount ? ` · <span class="p-gold">★ ${goldCount} золот${goldCount === 1 ? "ой" : "ых"}</span>` : ""}</div>
      ${isGoldLvl ? "" : `<div class="p-level-hint">Золотой уровень: все уроки ★ золотые + квест без ошибок</div>`}
      <div class="p-level-bar"><div style="width:${done.filter(id => lvl.lessons.includes(id)).length / lvl.lessons.length * 100}%"></div></div>
    </div>
    ${lvl.introButton ? `<button class="p-scene" id="p-taxi">${lvl.introButton}</button>` : ""}
    <div class="p-track">${nodes}</div>
    <button class="p-quest ${allDone ? (questDone ? (questGold ? "done gold" : "done") : "open") : "locked"}" id="p-quest">
      ${questIcon(lvl.questImg)}
      <span><b>Квест: ${lvl.questTitle || lvl.title}</b><br>${allDone ? (questDone ? (questGold ? "Идеально 🏆 · можно ещё раз" : "Пройден ✓ · можно ещё раз") : "Открыт — вперёд!") : `Откроется после ${lvl.lessons.length} уроков 🔒`}</span>
    </button>
    ${testMode() && window.startQuest2 && (window.Q2_READY || []).includes(lvl.quest) ? `<button class="p-q2" id="p-q2" data-q="${lvl.quest}">🧪 Новый квест (тест, видно только тестировщику)</button>` : ""}
    ${(window.reviewNeeded && (reviewNeeded(lvl.id) || reviewDoneN(lvl.id) > 0)) ? `<div class="p-review">
      <div class="p-review-h">🔁 Повторение после квеста <small>${reviewDoneN(lvl.id)} из ${reviewCount}</small></div>
      <div class="p-review-row">${reviewTitles.map((t, k) => { const id = `rev-${lvl.id}-${k + 1}`, dn = doneLessons().includes(id);
        return `<button class="p-rev${dn ? " done" : ""}" data-rev="${k}"><b>${dn ? "✓" : k + 1}</b><span>${t}</span></button>`; }).join("")}</div></div>` : ""}
    ${window.WordMarks ? WordMarks.pathHTML() : ""}
    </div>
    <div class="p-lvl-list-title">Все уровни</div>
    ${ch.levels.map((l, i) => l.soon ? `<div class="p-soon"><b>Уровень ${i + 1} · ${l.title}</b><span>скоро</span></div>`
      : `<button class="p-soon p-lvl-go${i === lvlIdx ? " sel" : ""}${levelOpen(ch, i) ? "" : " locked"}" data-lvl="${i}"><b>Уровень ${i + 1} · ${l.title}</b><span>${i === lvlIdx ? "сейчас" : levelGold(l) ? "🏅" : levelDone(l) ? "✓" : levelOpen(ch, i) ? "›" : "🔒"}</span></button>`).join("")}
    ${(() => { const open = testMode() || ch.levels.every(levelDone), passed = doneLessons().includes("exam-" + ch.id);
      return `<button class="p-soon exam p-exam${open ? " open" : " locked"}" id="p-exam"><b>📝 ${ch.exam.title}</b><span>${passed ? "сдан ✓" : open ? "открыт — вперёд!" : `после ${ch.levels.length} уровней 🔒`}</span></button>`; })()}
    <div class="p-soon next"><b>Дальше — глава ${ch.next}</b><span>🔒</span></div>`;

  // Анимации дорожки (anim.js): если открылся новый урок — ломается замок. Кольцо частей рисует parts.js
  if (window.HAnim && !testMode()) {
    const curId = nextIdx >= 0 ? lvl.lessons[nextIdx] : null;
    const curBtn = curId ? pathView.querySelector(`.p-node[data-lesson="${curId}"]`) : null;
    if (curBtn) {
      const was = store.get("pathCur", null);
      if (was && was !== curId && done.includes(was)) setTimeout(() => { if (curBtn.isConnected) HAnim.play("unlock", { el: curBtn, lockedClass: "p-was-locked", openClass: "p-just-open",
        onPeak: () => { if (typeof playSound === "function") playSound("pop"); } }); }, 450);
    }
    if (curId) store.set("pathCur", curId);
  }

  pathView.querySelectorAll(".p-node").forEach(b => b.onclick = () => {
    if (b.classList.contains("locked")) { showToast("Сначала пройди предыдущий урок"); vibrate("warning"); return; }
    const id = b.dataset.lesson;
    const go = (k) => window.startLessonPart ? startLessonPart(id, k) : startLesson(id);
    const run = (k) => { if (+b.dataset.k === 0 && lvl.intro === "taxi" && !store.get("taxiSeen", false)) showTaxi(() => go(k)); else go(k); };
    // как в Duolingo: нажал кружок — под ним окошко «Урок 1 · часть 2 из 4 · НАЧАТЬ» (parts.js)
    if (window.partsPopover) partsPopover(b, +b.dataset.k, run); else run();
  });
  if (window.partsDecorate) partsDecorate(lvl, pathView);
  document.getElementById("p-settings").onclick = openSettings;
  pathView.querySelectorAll(".p-rev").forEach(b => b.onclick = () => startReview(lvl.id, +b.dataset.rev));
  const q2 = document.getElementById("p-q2");                      // новый квест «что сказал — то появилось» (quest2.js), пока только тестировщику
  if (q2) q2.onclick = () => startQuest2(q2.dataset.q);
  const rp = document.getElementById("p-repeat");                 // «🔁 Повтори слова» — слова, которые игрок отметил «повторить» (wordmarks.js)
  if (rp) rp.onclick = () => WordMarks.startRepeat();
  const tb = document.getElementById("p-taxi");
  if (tb) tb.onclick = () => showTaxi(() => showPath());
  pathView.querySelectorAll(".p-lvl-go").forEach(b => b.onclick = () => {
    if (b.classList.contains("locked")) { showToast("Сначала пройди предыдущий уровень — все уроки и квест"); vibrate("warning"); return; } store.set("level_" + ch.id, +b.dataset.lvl); renderPath();
    pathView.scrollTo ? pathView.scrollTo({ top: 0, behavior: "smooth" }) : 0; window.scrollTo({ top: 0, behavior: "smooth" }); });
  // экзамен главы (parts.js startExam): открывается, когда пройдены все уровни главы
  const ex = document.getElementById("p-exam");
  if (ex) ex.onclick = () => {
    if (ex.classList.contains("locked")) { showToast(`Экзамен откроется, когда пройдёшь все ${ch.levels.length} уровней`); vibrate("warning"); return; }
    if (window.startExam) startExam(ch);
  };
  document.getElementById("p-quest").onclick = () => {
    if (!allDone) { showToast(`Пройди все ${lvl.lessons.length} уроков — и квест откроется`); vibrate("warning"); return; }
    startQuest(lvl.quest);
  };
  const cur = pathView.querySelector(".p-node.current");
  if (cur) setTimeout(() => cur.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
}
