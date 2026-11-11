// =====================================================
// ОСНОВНОЕ ОБУЧЕНИЕ: дорожка уровня.
// Глава (A1) → уровни → в уровне 7 уроков и в конце квест.
// Структура курса — в файле content/<язык>/course.json, прогресс — в памяти устройства (потом — на сервере).
// =====================================================
const pathView = document.getElementById("path");
let course = null;
// ВРЕМЕННО для проверки: все уроки и квест открыты сразу. Потом поставить false.
const TEST_UNLOCK_ALL = true;

// =====================================================
// МЕДАЛИ
// Уровень ЗОЛОТОЙ: все уроки золотые + квест золотой.
// Медаль главы: 🥇 все уровни золотые, 🥈 золотых на один меньше (4 из 5), 🥉 глава пройдена.
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
  return g === n ? "gold" : g >= n - 1 ? "silver" : "bronze";
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

function renderPath() {
  const ch = course.chapters[0];                 // пока одна глава — A1
  const lvl = ch.levels[0];
  updateMedals();
  const goldLevels = ch.levels.filter(levelGold).length;
  const myMedal = store.get("medals", {})[ch.id];
  const isGoldLvl = levelGold(lvl);
  const done = doneLessons();
  const gold = perfectLessons();
  const goldCount = lvl.lessons.filter(id => gold.includes(id)).length;
  const allDone = TEST_UNLOCK_ALL || lvl.lessons.every(id => done.includes(id));
  const questDone = store.get("quest_q-" + lvl.quest, false);
  const questGold = store.get("questGold_q-" + lvl.quest, false);
  const nextIdx = lvl.lessons.findIndex(id => !done.includes(id));   // первый непройденный

  // змейка: смещение кружков влево-вправо
  const offs = [0, 60, 90, 60, 0, -60, -90];
  const nodes = lvl.lessons.map((id, k) => {
    const st = done.includes(id) ? (gold.includes(id) ? "done gold" : "done") : (k === nextIdx || TEST_UNLOCK_ALL) ? "current" : "locked";
    const icon = st === "done gold" ? "★" : st === "done" ? "✓" : st === "locked" ? "🔒" : (k + 1);
    return `<div class="p-node-wrap${st === "current" && k === nextIdx ? " cur" : ""}" style="transform:translateX(${offs[k % offs.length]}px)">
      ${st === "current" && k === nextIdx ? `<div class="p-start">Старт</div>` : ""}
      <button class="p-node ${st}" data-lesson="${id}" data-k="${k}">${icon}</button>
      <div class="p-label">Урок ${k + 1}</div>
    </div>`;
  }).join("");

  pathView.innerHTML = `
    <button class="p-settings" id="p-settings" aria-label="Настройки">⚙️</button>
    ${TEST_UNLOCK_ALL ? `<div class="p-test">🔓 Тестовый режим: всё открыто</div>` : ""}
    <div class="p-chapter">
      <div class="p-ch-badge">${ch.id}</div>
      <div><div class="p-ch-title">${ch.title}</div><div class="p-ch-sub">Уровень 1 из ${ch.levels.length}</div></div>
    </div>
    <div class="p-medals">
      ${["gold", "silver", "bronze"].map(k => `<div class="p-medal ${myMedal === k ? "won" : ""}"><span>${MEDAL[k][0]}</span><small>${
        k === "gold" ? `все ${ch.levels.length} уровней золотые` : k === "silver" ? `${ch.levels.length - 1} из ${ch.levels.length} золотые` : "глава пройдена"}</small></div>`).join("")}
      <div class="p-medal-note">Золотых уровней: <b>${goldLevels} из ${ch.levels.length}</b></div>
    </div>
    <div class="p-level">
      <div class="p-level-title">Уровень 1 · ${lvl.title}${isGoldLvl ? ` <span class="p-lvl-gold">🏅 золотой</span>` : ""}</div>
      <div class="p-level-sub">${done.filter(id => lvl.lessons.includes(id)).length} из ${lvl.lessons.length} уроков${goldCount ? ` · <span class="p-gold">★ ${goldCount} золот${goldCount === 1 ? "ой" : "ых"}</span>` : ""}</div>
      ${isGoldLvl ? "" : `<div class="p-level-hint">Золотой уровень: все уроки ★ золотые + квест без ошибок</div>`}
      <div class="p-level-bar"><div style="width:${done.filter(id => lvl.lessons.includes(id)).length / lvl.lessons.length * 100}%"></div></div>
    </div>
    <button class="p-scene" id="p-taxi">🚕 Сцена: в такси из аэропорта</button>
    <div class="p-track">${nodes}</div>
    <button class="p-quest ${allDone ? (questDone ? (questGold ? "done gold" : "done") : "open") : "locked"}" id="p-quest">
      <img src="assets/gift-shawarma.png" alt="">
      <span><b>Квест: Первая шаурма</b><br>${allDone ? (questDone ? (questGold ? "Идеально 🏆 · можно ещё раз" : "Пройден ✓ · можно ещё раз") : "Открыт — вперёд!") : "Откроется после 7 уроков 🔒"}</span>
    </button>
    ${ch.levels.slice(1).map((l, i) => `<div class="p-soon"><b>Уровень ${i + 2} · ${l.title}</b><span>скоро</span></div>`).join("")}
    <div class="p-soon exam"><b>📝 ${ch.exam.title}</b><span>после 5 уровней</span></div>
    <div class="p-soon next"><b>Дальше — глава ${ch.next}</b><span>🔒</span></div>`;

  pathView.querySelectorAll(".p-node").forEach(b => b.onclick = () => {
    if (b.classList.contains("locked")) { showToast("Сначала пройди предыдущий урок"); vibrate("warning"); return; }
    const id = b.dataset.lesson;
    if (+b.dataset.k === 0 && lvl.intro === "taxi" && !store.get("taxiSeen", false)) showTaxi(() => startLesson(id));
    else startLesson(id);
  });
  document.getElementById("p-settings").onclick = openSettings;
  document.getElementById("p-taxi").onclick = () => showTaxi(() => showPath());
  document.getElementById("p-quest").onclick = () => {
    if (!allDone) { showToast("Пройди все 7 уроков — и квест откроется"); vibrate("warning"); return; }
    startQuest(lvl.quest);
  };
  const cur = pathView.querySelector(".p-node.current");
  if (cur) setTimeout(() => cur.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
}
