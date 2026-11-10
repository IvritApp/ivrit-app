// =====================================================
// Логика приложения. JavaScript похож на Python:
// переменные (let/const), функции (function), списки [ ], словари { }.
// =====================================================

// --- Настройки ---
// Язык курса. Новый язык = новая папка content/<код>/, код менять не нужно.
const COURSE_LANG = "he";          // he = иврит
const LESSON_ID   = "a1-01";       // какой урок открыть

// --- Telegram ---
const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) { tg.ready(); tg.expand(); }

// --- Состояние урока (как переменные в Python) ---
let lesson = null;     // данные урока из JSON-файла
let step = 0;          // номер текущего задания
let mistakes = 0;      // сколько ошибок
let queue = [];        // очередь заданий (ошибочные добавляются в конец)

const screen = document.getElementById("screen");
const bar = document.getElementById("progress-bar");

// --- 1. Загружаем урок из файла ---
fetch(`content/${COURSE_LANG}/lessons/${LESSON_ID}.json`)
  .then(response => response.json())
  .then(data => {
    lesson = data;
    queue = shuffle([...lesson.exercises]);  // перемешиваем задания
    showStep();
  })
  .catch(() => {
    screen.textContent = "Не удалось загрузить урок 😕";
  });

// --- 2. Показываем текущее задание ---
function showStep() {
  bar.style.width = (step / queue.length * 100) + "%";

  if (step >= queue.length) {
    showFinish();
    return;
  }

  const ex = queue[step];
  if (ex.type === "choose_translation") {
    showChooseTranslation(ex);
  }
  // Здесь потом появятся другие типы игр:
  // else if (ex.type === "repeat_aloud") { ... }
}

// --- Мини-игра «Выбери перевод» ---
function showChooseTranslation(ex) {
  const word = lesson.words[ex.word];

  // 3 неправильных варианта + 1 правильный, в случайном порядке
  const others = lesson.words.filter(w => w !== word);
  const options = shuffle([word, ...shuffle(others).slice(0, 3)]);

  screen.innerHTML = `
    <div class="task">Выбери перевод</div>
    <div class="word" dir="rtl">${word.he}</div>
    <div class="translit">${word.tr}</div>
    <button class="listen" id="listen">🔊</button>
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
  // Блокируем остальные кнопки
  document.querySelectorAll(".option").forEach(b => {
    b.disabled = true;
    if (b.textContent === word.ru) b.classList.add("right");
  });

  if (isRight) {
    vibrate("success");
  } else {
    btn.classList.add("wrong");
    mistakes++;
    queue.push(ex);          // ошибочное задание повторим в конце урока
    vibrate("error");
  }

  const next = document.createElement("button");
  next.className = "next";
  next.textContent = "Дальше";
  next.onclick = () => { step++; showStep(); };
  screen.appendChild(next);
}

// --- 4. Конец урока ---
function showFinish() {
  bar.style.width = "100%";
  screen.innerHTML = `
    <div class="word">🎉</div>
    <h2>Урок «${lesson.title}» пройден!</h2>
    <p class="task">Ошибок: ${mistakes}</p>
    <button class="next" onclick="location.reload()">Пройти ещё раз</button>
  `;
}

// =====================================================
// Вспомогательные функции
// =====================================================

// Перемешать список (как random.shuffle в Python)
function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// Произнести слово голосом устройства (временно, пока нет настоящей озвучки).
// Если на устройстве нет голоса для иврита — просто ничего не произойдёт.
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "he-IL";
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// Лёгкая вибрация телефона при ответе (работает внутри Telegram)
function vibrate(kind) {
  if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred(kind);
}
