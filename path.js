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
  course.chapters.forEach(ch => { const md = chapterMedal(ch); if (md && (!m[ch.id] || rank[md] > rank[m[ch.id]])) m[ch.id] = md; });
  store.set("medals", m);
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
  showTaxi(() => startLesson(lvl.lessons[0]));
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
    ${ch.levels.map((l, i) => i !== lvlIdx
      ? (l.soon ? `<div class="p-soon"><b>Уровень ${i + 1} · ${l.title}</b><span>скоро</span></div>`
        : `<button class="p-soon p-lvl-go${levelOpen(ch, i) ? "" : " locked"}" data-lvl="${i}"><b>Уровень ${i + 1} · ${l.title}</b><span>${levelGold(l) ? "🏅" : levelDone(l) ? "✓" : levelOpen(ch, i) ? "›" : "🔒"}</span></button>`)
      : `<div class="p-cur-level" id="p-cur-level">
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
    </div>`).join("")}
    <div class="p-soon exam"><b>📝 ${ch.exam.title}</b><span>после ${ch.levels.length} уровней</span></div>
    <div class="p-soon next"><b>Дальше — глава ${ch.next}</b><span>🔒</span></div>`;

  pathView.querySelectorAll(".p-node").forEach(b => b.onclick = () => {
    if (b.classList.contains("locked")) { showToast("Сначала пройди предыдущий урок"); vibrate("warning"); return; }
    const id = b.dataset.lesson;
    if (+b.dataset.k === 0 && lvl.intro === "taxi" && !store.get("taxiSeen", false)) showTaxi(() => startLesson(id));
    else startLesson(id);
  });
  document.getElementById("p-settings").onclick = openSettings;
  const tb = document.getElementById("p-taxi");
  if (tb) tb.onclick = () => showTaxi(() => showPath());
  pathView.querySelectorAll(".p-lvl-go").forEach(b => b.onclick = () => {
    if (b.classList.contains("locked")) { showToast("Сначала пройди предыдущий уровень — все уроки и квест"); vibrate("warning"); return; } store.set("level_" + ch.id, +b.dataset.lvl); renderPath();
    const cl = document.getElementById("p-cur-level"); if (cl) cl.scrollIntoView({ behavior: "smooth", block: "start" }); });
  document.getElementById("p-quest").onclick = () => {
    if (!allDone) { showToast(`Пройди все ${lvl.lessons.length} уроков — и квест откроется`); vibrate("warning"); return; }
    startQuest(lvl.quest);
  };
  const cur = pathView.querySelector(".p-node.current");
  if (cur) setTimeout(() => cur.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
}
