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

// Фразы похвалы — случайная каждый раз, чтобы не надоедало
const PRAISE = ["Отлично!", "Верно!", "Так держать!", "Супер!", "Молодец! כָּל הַכָּבוֹד"];

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

// --- 1. Загружаем урок из файла ---
fetch(`content/${COURSE_LANG}/lessons/${LESSON_ID}.json`)
  .then(response => response.json())
  .then(data => {
    lesson = data;
    queue = shuffle([...lesson.exercises]);
    showStep();
  })
  .catch(() => { screen.textContent = "Не удалось загрузить урок 😕"; });

// --- 2. Показываем текущее задание (с плавной сменой) ---
function showStep() {
  bar.style.width = (step / queue.length * 100) + "%";

  if (step >= queue.length) { showFinish(); return; }

  const ex = queue[step];
  if (ex.type === "choose_translation") showChooseTranslation(ex);
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
    btn.onclick = () => checkAnswer(btn, opt === word, ex, word);
    box.appendChild(btn);
  });
}

// --- 3. Проверяем ответ ---
function checkAnswer(btn, isRight, ex, word) {
  const all = document.querySelectorAll(".option");
  all.forEach(b => {
    b.disabled = true;
    if (b.textContent === word.ru) b.classList.add("right");
    else if (b !== btn) b.classList.add("dim");
  });

  if (isRight) {
    playSound("right");
    vibrate("success");
    showFeedback(true, random(PRAISE), "");
    setTimeout(goNext, AUTO_NEXT_MS);
  } else {
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

function flashRed() {
  flash.classList.add("on");
  setTimeout(() => flash.classList.remove("on"), 350);
}

// --- 4. Конец урока ---
function showFinish() {
  bar.style.width = "100%";
  playSound("finish");
  vibrate("success");
  screen.innerHTML = `
    <div class="finish">
      <div class="big">🎉</div>
      <h2>Урок «${lesson.title}» пройден!</h2>
      <p class="task">Ошибок: ${mistakes}</p>
      <button class="btn blue" onclick="location.reload()">Пройти ещё раз</button>
    </div>
  `;
  screen.classList.remove("slide-out");
  screen.classList.add("slide-in");
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
  finish: { wave: "sine",     notes: [[523, 0, .15], [659, .15, .15], [784, .3, .15], [1047, .45, .35]] }
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
