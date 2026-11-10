// =====================================================
// Логика приложения Hirbis.
// JavaScript похож на Python: переменные (let/const),
// функции (function), списки [ ], словари { }.
// =====================================================

// --- Настройки (можно менять, ничего не ломая) ---
const COURSE_LANG   = "he";     // язык курса: he = иврит. Новый язык = новая папка content/<код>/
const LESSON_ID     = "a1-01";  // какой урок открыть
const AUTO_NEXT_MS  = 1100;     // через сколько миллисекунд после ВЕРНОГО ответа идти дальше (1000 = 1 сек)
const WRONG_AUTO    = false;    // true = после ошибки тоже идти дальше само, false = кнопка «Понятно»
const SOUND_ON      = true;     // звуки вкл/выкл

// Фразы похвалы. Берутся из «мешка» без повторов: пока не прозвучат все — ни одна не повторится
const PRAISE = [
  "Отлично!", "Верно!", "Супер!", "Так держать!", "Точно в цель!", "Красота!", "Блестяще!",
  "В яблочко!", "Ты в ударе!", "Идёшь как по маслу!", "Чётко!", "Без единой ошибки!", "Огонь!",
  "Ещё чуть-чуть — и заговоришь!", "Шикарно!", "Вот это да!", "Уверенно!", "Мастерски!",
  "Знаешь своё дело!", "Легко и красиво!", "Так и надо!", "Браво!",
  "Всё супер! סבבה", "Прекрасно! יופי", "Молодец! כל הכבוד", "Классно! אחלה"
];
let praiseBag = [];
function nextPraise() {
  if (!praiseBag.length) praiseBag = shuffle([...PRAISE]);
  return praiseBag.pop();
}

// --- Серия правильных ответов (огоньки) и очки ---
// 5 подряд — оранжевый огонёк, 10 — синий, 15 — фиолетовый. Чем ярче огонь, тем больше очков за ответ.
const FIRE = [
  { from: 0,  name: "",                    points: 10, outer: "#c9d3de", inner: "#eef2f6" },
  { from: 5,  name: "Огонь",               points: 15, outer: "#ff8a35", inner: "#ffd166" },
  { from: 10, name: "Огонь",               points: 20, outer: "#2f86e0", inner: "#a8e0ff" },
  { from: 15, name: "Огонь",               points: 30, outer: "#8b45f0", inner: "#e2c6ff" }
];
// Фиолетовый «Огонь 15х» можно получить только на контрольной (у такого урока в файле "exam": true)
function maxFire() { return lesson && lesson.exam ? 3 : 2; }
function fireLevel(c) { let l = 0; FIRE.forEach((f, i) => { if (c >= f.from && i <= maxFire()) l = i; }); return l; }

// Хранилище на устройстве (временно — потом перенесём на сервер, чтобы работало и в приложении)
const store = {
  get(k, d) { try { const v = localStorage.getItem("hirbis_" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("hirbis_" + k, JSON.stringify(v)); } catch (e) {} }
};
function todayKey() { const d = new Date(); return "points_" + d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
let combo = 0;                          // серия правильных ответов подряд — считается внутри урока
let lessonPoints = 0;

// --- Telegram ---
const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) { tg.ready(); tg.expand(); }

// --- Состояние урока ---
let lesson = null;     // данные урока из JSON-файла
let step = 0;          // номер текущего задания
let mistakes = 0;      // сколько ошибок
let queue = [];        // очередь заданий (ошибочные добавляются в конец)

const screen   = document.getElementById("screen");
const bar      = document.getElementById("progress-bar");
const feedback = document.getElementById("feedback");
const flash    = document.getElementById("flash");
const homeView   = document.getElementById("home");
const lessonView = document.getElementById("lesson");
const toast      = document.getElementById("toast");
const comboBox   = document.getElementById("combo");
const milestone  = document.getElementById("milestone");
const todayBox   = document.getElementById("today");

// =====================================================
// ГЛАВНЫЙ ЭКРАН
// =====================================================

// Здороваемся по имени из Telegram
const user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
if (user) document.getElementById("hello").textContent = "Шалом, " + user.first_name + "!";

updateToday();

// =====================================================
// УДОД НА ГЛАВНОМ ЭКРАНЕ: машет крылом, улетает и прилетает с подарком,
// а если человек долго ничего не делает — «Чего так долго думаешь?» и улетает
// =====================================================
const rig = document.getElementById("rig");
const bubble = document.getElementById("bubble");
const carry = document.getElementById("carry");
const GIFTS = ["🎁", "✉️", "🍊", "📚", "🫒", "⭐", "🥙"];
const IDLE_MS = 20000;        // через сколько миллисекунд без действий удод «скучает» (20000 = 20 сек)
let birdBusy = false, idleTimer = null, waveTimer = null, tripTimer = null;

function birdWave() {
  if (birdBusy) return;
  rig.classList.remove("waving"); void rig.offsetWidth; rig.classList.add("waving");
}
function say(text, ms = 2600) {
  bubble.textContent = text;
  bubble.classList.add("show");
  clearTimeout(say.t); say.t = setTimeout(() => bubble.classList.remove("show"), ms);
}
// Улететь и вернуться (с подарком в лапках или без)
function birdTrip(withGift, awayMs = 2500, onBack) {
  if (birdBusy) return;
  birdBusy = true;
  rig.className = "bird-rig flap fly-away";
  setTimeout(() => {
    carry.textContent = withGift ? random(GIFTS) : "";
    rig.className = "bird-rig flap fly-in";
    setTimeout(() => {
      rig.className = "bird-rig";
      birdBusy = false;
      if (withGift) {                                   // кладёт подарок на землю
        carry.classList.add("drop");
        setTimeout(() => { carry.classList.remove("drop"); carry.textContent = ""; }, 1600);
      }
      if (onBack) onBack();
    }, 1200);
  }, 1100 + awayMs);
}
function resetIdle() { clearTimeout(idleTimer); idleTimer = setTimeout(onIdle, IDLE_MS); }
function onIdle() {
  if (homeView.hidden || birdBusy) { resetIdle(); return; }
  say("Чего так долго думаешь? 🤔", 2200);
  setTimeout(() => birdTrip(true, 3000, () => say("Я вернулся! Давай учиться? 😉", 2600)), 2200);
  resetIdle();
}
function startHomeBird() {
  stopHomeBird();
  setTimeout(birdWave, 700);
  waveTimer = setInterval(birdWave, 5000);                                         // машет каждые 5 сек
  tripTimer = setInterval(() => { if (Math.random() < 0.5) birdTrip(true); }, 17000); // иногда летает за подарком
  resetIdle();
}
function stopHomeBird() { clearInterval(waveTimer); clearInterval(tripTimer); clearTimeout(idleTimer); }
["pointerdown", "touchstart", "keydown", "scroll"].forEach(ev =>
  document.addEventListener(ev, () => { if (!homeView.hidden) resetIdle(); }, { passive: true }));
rig.onclick = () => {                                    // если нажать на удода
  birdWave();
  say(random(["Шалом! 👋", "Погнали учиться!", "Я удод, кстати 🙂", "Ой, щекотно!", "יאללה! Поехали!"]), 1800);
};
startHomeBird();

// «Основное обучение» → открыть урок
document.getElementById("go-learn").onclick = startLesson;

// Карточки «Скоро» → короткое сообщение
document.querySelectorAll(".card.soon").forEach(card => {
  card.onclick = () => {
    showToast(card.dataset.soon + " — скоро появится ✨");
    vibrate("warning");
  };
});

function showHome() {
  hideFeedback();
  lessonView.hidden = true;
  homeView.hidden = false;
  homeView.classList.remove("slide-in"); void homeView.offsetWidth; homeView.classList.add("slide-in");
  if (tg && tg.BackButton) tg.BackButton.hide();
  updateToday();
  startHomeBird();
}

function updateToday() {
  const pts = store.get(todayKey(), 0);
  todayBox.innerHTML = pts > 0 ? `${flameSVG(fireLevel(combo))}<span>Сегодня: <b>${pts}</b> очков</span>` : "";
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

// Кнопка «Назад» Telegram (вверху окна) возвращает на главный экран
if (tg && tg.BackButton) tg.BackButton.onClick(showHome);

// =====================================================
// УРОК
// =====================================================

// --- 1. Загружаем урок из файла и начинаем ---
function startLesson() {
  stopHomeBird();
  homeView.hidden = true;
  lessonView.hidden = false;
  if (tg && tg.BackButton) tg.BackButton.show();
  step = 0; mistakes = 0; lessonPoints = 0;
  combo = 0; store.set("combo", 0);      // каждый урок — новая серия
  bar.style.width = "0%";
  updateCombo(false);
  screen.textContent = "Загрузка…";

  fetch(`content/${COURSE_LANG}/lessons/${LESSON_ID}.json`)
    .then(response => response.json())
    .then(data => {
      lesson = data;
      queue = shuffle([...lesson.exercises]);
      showStep();
    })
    .catch(() => { screen.textContent = "Не удалось загрузить урок 😕"; });
}

// --- 2. Показываем текущее задание (с плавной сменой) ---
function showStep() {
  bar.style.width = (step / queue.length * 100) + "%";

  if (step >= queue.length) { showFinish(); return; }

  const ex = queue[step];
  if (ex.type === "choose_translation") showChooseTranslation(ex);
  else if (ex.type === "choose_hebrew") showChooseHebrew(ex);
  // Здесь потом появятся другие игры:
  // else if (ex.type === "build_phrase") { ... }

  // анимация появления
  screen.classList.remove("slide-out");
  screen.classList.add("slide-in");
}

// Перейти к следующему заданию: старое уезжает, новое въезжает
function goNext() {
  hideFeedback();
  screen.classList.remove("slide-in");
  screen.classList.add("slide-out");
  setTimeout(() => { step++; showStep(); }, 250);
}

// --- Мини-игра «Выбери перевод» ---
function showChooseTranslation(ex) {
  const word = lesson.words[ex.word];
  const others = lesson.words.filter(w => w !== word);
  const options = shuffle([word, ...shuffle(others).slice(0, 3)]);

  screen.innerHTML = `
    <div class="task">Выбери перевод</div>
    <div class="word" dir="rtl">${word.he}</div>
    <div class="translit">${word.tr}</div>
    <button class="listen" id="listen" aria-label="Послушать">🔊</button>
    <div id="options"></div>
  `;

  document.getElementById("listen").onclick = () => speak(word.he);
  speak(word.he);

  const box = document.getElementById("options");
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = opt.ru;
    if (opt === word) btn.dataset.right = "1";
    btn.onclick = () => checkAnswer(btn, opt === word, ex, word);
    box.appendChild(btn);
  });
}

// --- Мини-игра «Как это на иврите?» (обратное направление: русское слово → выбрать иврит) ---
function showChooseHebrew(ex) {
  const word = lesson.words[ex.word];
  const others = lesson.words.filter(w => w !== word);
  const options = shuffle([word, ...shuffle(others).slice(0, 3)]);

  screen.innerHTML = `
    <div class="task">Как это на иврите?</div>
    <div class="word ru-word">${word.ru}</div>
    <div id="options" class="he-options"></div>
  `;
  const box = document.getElementById("options");
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "option he-option";
    btn.innerHTML = `<span class="he" dir="rtl">${opt.he}</span><span class="tr">${opt.tr}</span>`;
    if (opt === word) btn.dataset.right = "1";
    btn.onclick = () => { speak(opt.he); checkAnswer(btn, opt === word, ex, word); };
    box.appendChild(btn);
  });
}

// --- 3. Проверяем ответ ---
function checkAnswer(btn, isRight, ex, word) {
  const all = document.querySelectorAll(".option");
  all.forEach(b => {
    b.disabled = true;
    if (b.dataset.right) b.classList.add("right");
    else if (b !== btn) b.classList.add("dim");
  });

  if (isRight) {
    const before = fireLevel(combo);
    combo++; store.set("combo", combo);
    const level = fireLevel(combo);
    const pts = FIRE[level].points;
    lessonPoints += pts;
    store.set(todayKey(), store.get(todayKey(), 0) + pts);
    updateCombo(true);
    playSound("right");
    vibrate("success");
    showFeedback(true, nextPraise(), `+${pts} очков`);
    if (level > before) {                       // новый огонёк: 5, 10 или 15 подряд
      setTimeout(() => showMilestone(level), 350);
      setTimeout(goNext, AUTO_NEXT_MS + 1700);
    } else {
      setTimeout(goNext, AUTO_NEXT_MS);
    }
  } else {
    const lost = combo;
    combo = 0; store.set("combo", 0);
    updateCombo(false);
    if (lost >= 5) showToast(`Серия из ${lost} прервалась — начнём новую!`);
    btn.classList.add("wrong");
    mistakes++;
    queue.push(ex);                        // повторим в конце урока
    playSound("wrong");
    vibrate("error");
    flashRed();
    showFeedback(false, "Правильный ответ:", `${word.ru} — ${word.he} (${word.tr})`);
    if (WRONG_AUTO) setTimeout(goNext, 2500);
  }
}

// Панель снизу: зелёная или красная
function showFeedback(good, title, detail) {
  feedback.className = good ? "good" : "bad";
  feedback.innerHTML = `
    <div class="title">${good ? "✓ " : "✗ "}${title}</div>
    ${detail ? `<div class="detail">${detail}</div>` : ""}
    ${!good && !WRONG_AUTO ? `<button class="btn red" id="ok">Понятно</button>` : ""}
  `;
  const ok = document.getElementById("ok");
  if (ok) ok.onclick = goNext;
  // маленькая пауза, чтобы браузер успел «увидеть» начальное положение — тогда панель выезжает плавно
  requestAnimationFrame(() => requestAnimationFrame(() => feedback.classList.add("show")));
}
function hideFeedback() { feedback.classList.remove("show"); }

// Значок серии рядом с полоской прогресса
function updateCombo(bump) {
  if (combo < 1) { comboBox.innerHTML = ""; comboBox.className = "combo"; return; }
  comboBox.className = "combo lvl" + fireLevel(combo);
  comboBox.innerHTML = `${flameSVG(fireLevel(combo))}<span>${combo}</span>`;
  if (bump) { comboBox.classList.remove("bump"); void comboBox.offsetWidth; comboBox.classList.add("bump"); }
}

// Большой огонь посреди экрана на 5, 10, 15 подряд: влетает с прокруткой, горит, летят искры, число крутится
function showMilestone(level) {
  const f = FIRE[level];
  const embers = Array.from({ length: 10 }, () =>
    `<i style="--x:${Math.round(Math.random() * 90 - 45)}px;--d:${(Math.random() * 0.9).toFixed(2)}s;--s:${(4 + Math.random() * 5).toFixed(1)}px;background:${f.inner}"></i>`).join("");
  milestone.innerHTML = `
    <div class="ms-card">
      <div class="ms-fire">
        <div class="ms-glow" style="background:radial-gradient(circle, ${f.inner}cc 0%, ${f.outer}55 45%, transparent 70%)"></div>
        ${flameSVG(level)}
        <div class="embers">${embers}</div>
      </div>
      <div class="ms-title" style="color:${f.outer}">${f.name} <span id="msNum">0</span>х</div>
      <div class="ms-sub">${f.from} правильных подряд · теперь +${f.points} за ответ</div>
    </div>`;
  milestone.classList.remove("show"); void milestone.offsetWidth; milestone.classList.add("show");
  // «прокрутка» числа: 0 → 5 / 10 / 15
  let n = 0; const num = document.getElementById("msNum");
  const tick = setInterval(() => { n++; num.textContent = n; if (n >= f.from) clearInterval(tick); }, 500 / f.from);
  playSound("combo");
  if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred("heavy");
  setTimeout(() => milestone.classList.remove("show"), 1900);
}

// Рисунок огонька нужного цвета (вектор — чёткий в любом размере)
function flameSVG(level) {
  const f = FIRE[level], id = "fg" + level + Math.floor(Math.random() * 1e6);
  return `<svg class="flame${level > 0 ? " lit" : ""}" viewBox="0 0 24 32" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${f.outer}"/><stop offset="1" stop-color="${f.inner}"/></linearGradient></defs>
    <path class="f-outer" d="M12 1 C14 8 22 12 22 21 A10 10 0 0 1 2 21 C2 15 6 12 7 7 C9 11 10 12 11 12 C11 8 11 4 12 1 Z" fill="${f.outer}"/>
    <path class="f-inner" d="M12 13 C13 17 17 19 17 23.5 A5 5 0 0 1 7 23.5 C7 20 10 18 12 13 Z" fill="url(#${id})"/>
    <ellipse class="f-core" cx="12" cy="25.5" rx="2.4" ry="3" fill="#ffffff" opacity=".55"/>
  </svg>`;
}

function flashRed() {
  flash.classList.add("on");
  setTimeout(() => flash.classList.remove("on"), 350);
}

// --- 4. Конец урока ---
function showFinish() {
  bar.style.width = "100%";
  vibrate("success");
  screen.innerHTML = `
    <div class="finish">
      <!-- Сцена: ветка оливы, удод прилетает и садится на неё -->
      <div class="scene">
        <svg class="branch" viewBox="0 0 320 120" aria-hidden="true">
          <path d="M-10 92 Q120 70 300 84" stroke="#8a5a3b" stroke-width="9" fill="none" stroke-linecap="round"/>
          <path d="M70 80 Q90 104 118 112" stroke="#8a5a3b" stroke-width="5" fill="none" stroke-linecap="round"/>
          <g class="leaves" fill="#7fae5a">
            <ellipse cx="40" cy="74" rx="18" ry="6" transform="rotate(-25 40 74)"/>
            <ellipse cx="62" cy="96" rx="17" ry="6" transform="rotate(30 62 96)"/>
            <ellipse cx="104" cy="110" rx="16" ry="5.5" transform="rotate(15 104 110)"/>
            <ellipse cx="128" cy="64" rx="18" ry="6" transform="rotate(-35 128 64)"/>
            <ellipse cx="270" cy="70" rx="18" ry="6" transform="rotate(-30 270 70)"/>
            <ellipse cx="292" cy="96" rx="17" ry="6" transform="rotate(25 292 96)"/>
          </g>
          <g fill="#5e7f3f"><circle cx="92" cy="94" r="5"/><circle cx="248" cy="94" r="5"/></g>
        </svg>
        <img class="bird" src="assets/udod.png" alt="Удод">
      </div>

      <h2 class="done">Урок пройден!</h2>
      <p class="task">«${lesson.title}» · Ошибок: ${mistakes}</p>
      <div class="points-row">
        <div class="pts-big">+${lessonPoints}</div>
        <div class="pts-label">очков за урок<br>Сегодня всего: <b>${store.get(todayKey(), 0)}</b></div>
        ${combo >= 1 ? `<div class="pts-fire">${flameSVG(fireLevel(combo))}<span>${combo}</span></div>` : ""}
      </div>

      <!-- Бонус: сленговое выражение -->
      <div class="bonus" id="bonus"></div>

      <button class="btn blue" onclick="startLesson()">Пройти ещё раз</button>
      <button class="btn ghost" onclick="showHome()">На главную</button>
    </div>
  `;
  screen.classList.remove("slide-out");
  screen.classList.add("slide-in");
  setTimeout(() => playSound("finish"), 900);   // фанфара — когда удод сел на ветку

  // Бонусная фраза берётся из файла content/<язык>/bonus.json
  fetch(`content/${COURSE_LANG}/bonus.json`)
    .then(r => r.json())
    .then(data => {
      const p = random(data.phrases);
      const box = document.getElementById("bonus");
      box.innerHTML = `
        <div class="bonus-label">🎁 Бонус · ${data.title}</div>
        <div class="bonus-he" dir="rtl">${p.he}</div>
        <div class="bonus-tr">${p.tr} <button class="listen small" id="bonus-listen" aria-label="Послушать">🔊</button></div>
        <div class="bonus-ru">${p.ru}</div>
      `;
      document.getElementById("bonus-listen").onclick = () => speak(p.he);
    })
    .catch(() => {});
}

// =====================================================
// Вспомогательные функции
// =====================================================

function shuffle(list) {                    // перемешать (как random.shuffle)
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
function random(list) { return list[Math.floor(Math.random() * list.length)]; }

// Произнести слово голосом устройства (временно, пока нет настоящей озвучки)
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "he-IL";
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// Вибрация телефона (работает внутри Telegram)
function vibrate(kind) {
  if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred(kind);
}

// --- Звуки ---
// Звуки «синтезируются» прямо в браузере — никаких файлов не нужно.
// Каждая нота: [частота в герцах, когда начать (сек), длительность (сек)]
let audioCtx = null;
const SOUNDS = {
  right:  { wave: "sine",     notes: [[660, 0, .12], [880, .1, .2]] },             // «дзынь» вверх
  wrong:  { wave: "triangle", notes: [[220, 0, .18], [180, .14, .25]] },           // глухое «бум» вниз
  finish: { wave: "sine",     notes: [[523, 0, .15], [659, .15, .15], [784, .3, .15], [1047, .45, .35]] },
  combo:  { wave: "triangle", notes: [[784, 0, .1], [988, .08, .1], [1175, .16, .1], [1568, .24, .3]] }  // «вжух» вверх
};
function playSound(name) {
  if (!SOUND_ON) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const s = SOUNDS[name], now = audioCtx.currentTime;
    s.notes.forEach(([freq, start, dur]) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = s.wave;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.25, now + start + 0.02);   // плавно громче
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);  // плавно тише
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    });
  } catch (e) { /* звук не обязателен — если не вышло, просто молчим */ }
}
