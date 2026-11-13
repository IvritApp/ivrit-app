// =====================================================
// Логика приложения Hirbis.
// JavaScript похож на Python: переменные (let/const),
// функции (function), списки [ ], словари { }.
// =====================================================

// --- Настройки (можно менять, ничего не ломая) ---
const COURSE_LANG   = "he";     // язык курса: he = иврит. Новый язык = новая папка content/<код>/
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
// Уроки и сцены всегда берём свежими (GitHub Pages кэширует файлы на 10 минут)
const _fetch = window.fetch.bind(window);
window.fetch = (url, opts) => _fetch(url, Object.assign({ cache: "no-cache" }, opts));

const store = {
  get(k, d) { try { const v = localStorage.getItem("hirbis_" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("hirbis_" + k, JSON.stringify(v)); } catch (e) {} }
};
function todayKey() { const d = new Date(); return "points_" + d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
let combo = 0;                          // серия правильных ответов подряд — считается внутри урока
let lessonPoints = 0;

// =====================================================
// НАСТРОЙКИ (⚙️ на дорожке уроков): тема, звуки, голос, музыка, вибрация, транскрипция
// =====================================================
const SET_DEFAULT = { theme: "auto", sfx: 80, voice: 100, music: 50, vibro: true, translit: null };
let settings = Object.assign({}, SET_DEFAULT, store.get("settings", {}));
function saveSettings() { store.set("settings", settings); applySettings(); }
function applySettings() {
  const b = document.body;
  b.classList.toggle("theme-dark", settings.theme === "dark");
  b.classList.toggle("theme-light", settings.theme === "light");
  b.classList.toggle("no-tr", settings.translit === false);
}

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

// =====================================================
// ПРОФИЛЬ И ЗНАКОМСТВО
// Пол важен: в иврите глаголы и прилагательные меняются в зависимости от того, кто говорит.
// От пола зависит и сюжет: парня встречает друг детства Давид, девушку — бывшая одноклассница Циля.
// =====================================================
let profile = store.get("profile", null);   // { name, gender: "m" | "f" }
const STORY = {
  m: { friend: "Давид", who: "твой друг детства Давид", met: "Он", ready: { he: "אני מוכן", tr: "ани мухан", ru: "я готов" } },
  f: { friend: "Циля", who: "твоя бывшая одноклассница Циля", met: "Она", ready: { he: "אני מוכנה", tr: "ани мухана", ru: "я готова" } }
};
const onboardView = document.getElementById("onboarding");

// Подставить форму для парня / девушки: «голод{m:ен}{f:на}» → «голоден» или «голодна»
function g(t) {
  if (!t) return t;
  const male = !profile || profile.gender !== "f";
  return t.replace(/\{m:([^}]*)\}/g, male ? "$1" : "").replace(/\{f:([^}]*)\}/g, male ? "" : "$1");
}
function friendName() { return profile && profile.gender === "f" ? "Циля" : "Давид"; }
const obStep = document.getElementById("ob-step");

function setGreeting() {
  const name = profile ? profile.name : (user ? user.first_name : "");
  document.getElementById("hello").textContent = name ? "Шалом, " + name + "!" : "Шалом!";
}

function showOnboarding() {
  homeView.hidden = true; lessonView.hidden = true; onboardView.hidden = false;
  // тот же живой Хибри, что и на главном экране: машет, улетает за гостинцами, скучает через 7 сек
  document.getElementById("ob-bird-slot").appendChild(document.getElementById("homeBird"));
  startHomeBird();
  let draft = { name: profile ? profile.name : (user ? user.first_name : ""), gender: profile ? profile.gender : null,
                avatar: profile ? profile.avatar : null, avatarGender: profile ? profile.gender : null };

  const steps = [
    // 1. Хибри здоровается
    () => `
      <h1 class="ob-title">Шалом! Я Хибри 👋</h1>
      <p class="ob-text">Я удод — национальная птица Израиля. Научу тебя говорить на иврите. Сначала давай познакомимся!</p>
      <button class="btn blue" data-next>Привет, Хибри!</button>`,
    // 2. Имя и пол
    () => `
      <h1 class="ob-title">Как тебя зовут?</h1>
      <input class="ob-input" id="ob-name" maxlength="20" placeholder="Твоё имя" value="${draft.name || ""}">
      <p class="ob-text small">В иврите слова меняются в зависимости от того, кто говорит. Я буду учить тебя твоей форме.</p>
      <div class="ob-gender">
        <button class="g-card ${draft.gender === "m" ? "on" : ""}" data-g="m"><span>🙋‍♂️</span>Я парень</button>
        <button class="g-card ${draft.gender === "f" ? "on" : ""}" data-g="f"><span>🙋‍♀️</span>Я девушка</button>
      </div>
      <button class="btn blue" data-next id="ob-go" ${draft.gender && draft.name ? "" : "disabled"}>Дальше</button>`,
    // 3. Завязка истории
    () => {
      const st = STORY[draft.gender];
      return `
      <div class="ob-hero">${HirbisAvatar.svg(draft.avatar)}</div>
      <h1 class="ob-title">Твоя история</h1>
      <p class="ob-text">Представь: ты скоро переезжаешь в Израиль. Там уже 10 лет живёт ${st.who}. ${st.met} встретит тебя в аэропорту и поможет обосноваться.</p>
      <p class="ob-text">А пока я научу тебя первым словам. Кстати, вот твоя первая фраза:</p>
      <div class="ob-phrase"><div class="he" dir="rtl">${st.ready.he}</div><div class="tr2"><span class="tr">${st.ready.tr} — </span>«${st.ready.ru}»</div></div>
      <button class="btn blue" data-next>${draft.gender === "m" ? "Я готов!" : "Я готова!"}</button>`;
    }
  ];
  let i = 0;
  function render() {
    obStep.innerHTML = steps[i]();
    obStep.classList.remove("slide-in"); void obStep.offsetWidth; obStep.classList.add("slide-in");
    const nameInput = document.getElementById("ob-name");
    const go = document.getElementById("ob-go");
    const check = () => { if (go) go.disabled = !(draft.gender && draft.name.trim()); };
    if (nameInput) nameInput.oninput = () => { draft.name = nameInput.value; check(); };
    obStep.querySelectorAll(".g-card").forEach(c => c.onclick = () => {
      draft.gender = c.dataset.g;
      obStep.querySelectorAll(".g-card").forEach(x => x.classList.toggle("on", x === c));
      vibrate("success"); check();
    });
    const next = obStep.querySelector("[data-next]");
    next.onclick = () => {
      if (i === 2 && "speechSynthesis" in window) speak(STORY[draft.gender].ready.he);
      if (i === 1) {                                   // после имени и пола — создаём героя
        const base = draft.avatar && draft.avatarGender === draft.gender ? draft.avatar : HirbisAvatar.defaults(draft.gender);
        stopHomeBird();
        HirbisAvatar.openEditor(base, cfg => {
          draft.avatar = cfg; draft.avatarGender = draft.gender;
          onboardView.hidden = false; startHomeBird();
          i = 2; render();
        });
        return;
      }
      if (i < steps.length - 1) { i++; render(); return; }
      homeView.insertBefore(document.getElementById("homeBird"), homeView.firstChild);
      profile = { name: draft.name.trim(), gender: draft.gender, avatar: draft.avatar };
      store.set("profile", profile);
      onboardView.hidden = true;
      setGreeting();
      updateHeroCard();
      showHome();
    };
  }
  render();
}

updateToday();
document.getElementById("reset-profile").onclick = showOnboarding;
// «Начать сначала»: стереть весь прогресс (с подтверждением).
function resetAll() {
  try { Object.keys(localStorage).filter(k => k.startsWith("hirbis_")).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  // перезапуск с «чистого листа» (адрес с меткой времени, чтобы ничего не взялось из кэша)
  location.replace(location.pathname + "?reset=" + Date.now() + location.hash);
}
document.getElementById("reset-all").onclick = (e) => {
  const b = e.currentTarget;
  vibrate("warning");
  // В Telegram — родное окошко «Да / Отмена»
  if (tg && tg.showConfirm && tg.initData) {
    tg.showConfirm("Начать сначала? Весь прогресс, очки и герой сотрутся.", ok => { if (ok) resetAll(); });
    return;
  }
  // В обычном браузере — второе нажатие
  if (!b.classList.contains("confirm")) {
    b.classList.add("confirm"); b.textContent = "Точно? Всё сотрётся. Нажми ещё раз";
    clearTimeout(b.t); b.t = setTimeout(() => { b.classList.remove("confirm"); b.textContent = "Начать сначала"; }, 4000);
    return;
  }
  resetAll();
};

// «Мой герой» — открыть конструктор аватара
function myAvatar() { return (profile && profile.avatar) || HirbisAvatar.defaults(profile ? profile.gender : "m"); }
function updateHeroCard() { document.getElementById("heroIcon").innerHTML = HirbisAvatar.svg(myAvatar(), { view: "head" }); }
updateHeroCard();
document.getElementById("go-hero").onclick = () => {
  stopHomeBird();
  HirbisAvatar.openEditor(myAvatar(), cfg => {
    if (profile) { profile.avatar = cfg; store.set("profile", profile); }
    updateHeroCard(); showHome();
  });
};

// =====================================================
// УДОД НА ГЛАВНОМ ЭКРАНЕ: машет крылом, улетает и прилетает с подарком,
// а если человек долго ничего не делает — «Чего так долго думаешь?» и улетает
// =====================================================
const rig = document.getElementById("rig");
const bubble = document.getElementById("bubble");
const carry = document.getElementById("carry");
// Гостинцы нарисованы в стиле Хибри: assets/gift-<имя>.png
const GIFTS = ["fig", "passion", "pita", "shawarma", "olive"];   // инжир, маракуйя, пита, шаурма, оливка
const IDLE_MS = 7000;         // через сколько миллисекунд без действий удод «скучает» (7000 = 7 сек)
const IDLE_AGAIN_MS = 25000;  // если человек так и не нажал ничего — повторить не раньше, чем через 25 сек
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
    carry.innerHTML = withGift ? `<img src="assets/gift-${random(GIFTS)}.png" alt="">` : "";
    rig.className = "bird-rig flap fly-in";
    setTimeout(() => {
      rig.className = "bird-rig";
      birdBusy = false;
      if (withGift) {                                   // кладёт подарок на землю
        carry.classList.add("drop");
        setTimeout(() => { carry.classList.remove("drop"); carry.innerHTML = ""; }, 1600);
      }
      if (onBack) onBack();
    }, 1200);
  }, 1100 + awayMs);
}
function resetIdle() { clearTimeout(idleTimer); idleTimer = setTimeout(onIdle, IDLE_MS); }
function onIdle() {
  if (!birdOnScreen() || birdBusy) { resetIdle(); return; }
  say("Чего так долго думаешь? 🤔", 2200);
  setTimeout(() => birdTrip(true, 3000, () => say("Я вернулся! Давай учиться? 😉", 2600)), 2200);
  clearTimeout(idleTimer); idleTimer = setTimeout(onIdle, IDLE_AGAIN_MS);
}
function startHomeBird() {
  stopHomeBird();
  setTimeout(birdWave, 1400);
  waveTimer = setInterval(birdWave, 5000);                                         // машет каждые 5 сек
  tripTimer = setInterval(() => { if (Math.random() < 0.5) birdTrip(true); }, 17000); // иногда летает за подарком
  resetIdle();
}
function stopHomeBird() { clearInterval(waveTimer); clearInterval(tripTimer); clearTimeout(idleTimer); }
["pointerdown", "touchstart", "keydown", "scroll"].forEach(ev =>
  document.addEventListener(ev, () => { if (birdOnScreen()) resetIdle(); }, { passive: true }));
function birdOnScreen() { return !homeView.hidden || !onboardView.hidden; }
rig.onclick = () => {                                    // если нажать на удода
  birdWave();
  say(random(["Шалом! 👋", "Погнали учиться!", "Я удод, кстати 🙂", "Ой, щекотно!", "יאללה! Поехали!"]), 1800);
};
// Первый запуск — знакомство, иначе сразу главный экран
setGreeting();
if (!profile) showOnboarding(); else startHomeBird();

// «Основное обучение» → открыть урок
document.getElementById("go-learn").onclick = () => showPath();

// Алфавит — отдельный раздел (alphabet.js задаёт window.openAlphabet)
document.getElementById("go-alphabet").onclick = () => {
  if (typeof window.openAlphabet !== "function") { showToast("Алфавит загружается… попробуй ещё раз"); return; }
  stopHomeBird();
  if (!document.getElementById("alphabetCss")) {         // стили алфавита — только когда открыли алфавит
    const l = document.createElement("link");
    l.id = "alphabetCss"; l.rel = "stylesheet"; l.href = "alphabet.css?v=" + (window.ALPHABET_V || Date.now());
    document.head.appendChild(l);
  }
  document.querySelectorAll("body > section").forEach(sec => sec.hidden = sec.id !== "alphabet");
  if (tg && tg.BackButton) tg.BackButton.show();
  window.openAlphabet(document.getElementById("alphabet"));
};

// Карточки «Скоро» → короткое сообщение
document.querySelectorAll(".card.soon").forEach(card => {
  card.onclick = () => {
    showToast(card.dataset.soon + " — скоро появится ✨");
    vibrate("warning");
  };
});

function showHome() {
  hideFeedback();
  if (typeof closeStage === "function") closeStage();
  document.querySelectorAll("body > section").forEach(sec => sec.hidden = sec.id !== "home");
  homeView.classList.remove("slide-in"); void homeView.offsetWidth; homeView.classList.add("slide-in");
  if (tg && tg.BackButton) tg.BackButton.hide();
  updateToday();
  startHomeBird();
}

function updateToday() {
  const pts = store.get(todayKey(), 0);
  const medals = store.get("medals", {});
  const icons = { gold: "🥇", silver: "🥈", bronze: "🥉" };
  const list = Object.keys(medals).map(ch => `<span class="h-medal" title="Глава ${ch}">${icons[medals[ch]]}<small>${ch}</small></span>`).join("");
  const sk = typeof streakInfo === "function" ? streakInfo() : null;
  todayBox.innerHTML = (sk ? `<button class="h-streak${sk.todayDone ? " lit" : ""}" id="hStreak">🔥 <b>${sk.count}</b> ${daysWord(sk.count)}${sk.freezes ? ` <span class="h-ice">❄️${sk.freezes}</span>` : ""}</button>` : "") +
    (pts > 0 ? `${flameSVG(fireLevel(combo))}<span>Сегодня: <b>${pts}</b> очков</span>` : "") +
    (list ? `<span class="h-medals">Медали: ${list}</span>` : "");
  const hs = document.getElementById("hStreak");
  if (hs) hs.onclick = () => openStreak();
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

// Кнопка «Назад» Telegram (вверху окна) возвращает на главный экран
// Урок и квест → к дорожке уровня; дорожка → на главный
if (tg && tg.BackButton) tg.BackButton.onClick(() => {
  // в алфавите «Назад» сначала обрабатывает сам раздел (например, из урока — к списку уроков)
  if (!document.getElementById("alphabet").hidden && typeof window.alphabetBack === "function" && window.alphabetBack()) return;
  if (!lessonView.hidden || !document.getElementById("quest").hidden) showPath(); else showHome();
});

// =====================================================
// УРОК
// =====================================================

// Человечек на картинках к словам = герой главы (глава 1: Давид / Циля). Пишется в course.json: "hero": {"m": "...", "f": "..."}
function setIconHero(lessonId) {
  const ch = course && course.chapters.find(c => c.levels.some(l => (l.lessons || []).includes(lessonId)));
  const hero = ch && ch.hero;
  window.iconHero = hero ? hero[profile && profile.gender === "f" ? "f" : "m"] : null;
}

// --- 1. Загружаем урок из файла и начинаем ---
function startLesson(id) {
  stopHomeBird();
  document.querySelectorAll("body > section").forEach(sec => sec.hidden = sec.id !== "lesson");
  if (tg && tg.BackButton) tg.BackButton.show();
  step = 0; mistakes = 0; lessonPoints = 0;
  combo = 0; store.set("combo", 0);      // каждый урок — новая серия
  bar.style.width = "0%";
  updateCombo(false);
  screen.textContent = "Загрузка…";
  setIconHero(id);

  fetch(`content/${COURSE_LANG}/lessons/${id}.json`)
    .then(response => response.json())
    .then(data => {
      // слова и названия — в форме игрока (парень / девушка)
      data.title = g(data.title);
      data.words = data.words.map(w => Object.assign({}, w, { he: g(w.he), tr: g(w.tr), ru: g(w.ru) }));
      data.phrases = (data.phrases || []).map(w => Object.assign({}, w, { he: g(w.he), tr: g(w.tr), ru: g(w.ru) }));
      lesson = data;
      queue = [...lesson.exercises];          // порядок заданий продуман в файле урока
      askTranslit(showStep);
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
  else if (ex.type === "listen") { if (noListen()) showChooseTranslation(ex); else showListen(ex); }
  else if (ex.type === "build_phrase") showBuildPhrase(ex);
  else if (ex.type === "match_pairs") showMatchPairs(ex);
  else if (ex.type === "blitz") showBlitz(ex);
  else { step++; showStep(); return; }       // незнакомый тип — пропускаем

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
// --- Друг-ведущий: Давид (или Циля) стоит и задаёт вопросы ---
const ASK_TR = [                       // «что значит слово на иврите?»
  "Что значит это слово?", "Как это перевести?", "Слышал{m:}{f:а} такое? Что это значит?",
  "Я тут часто это слышу. Это…", "Проверим! Что это значит?", "Ну-ка, переведи!"
];
const ASK_HE = [                       // «как сказать по-русски → на иврите?»
  "Как сказать на иврите «$»?", "Помоги: как будет «$»?", "А как на иврите «$»?",
  "Представь, нужно сказать «$». Что скажешь?", "Вспомнишь, как будет «$»?"
];
const askBag = {};
function ask(list, key) {                // вопрос без повторов подряд
  if (!askBag[key] || !askBag[key].length) askBag[key] = shuffle([...list]);
  return g(askBag[key].pop());
}
// Друг в уроке не стоит столбом: говорит, радуется, огорчается, машет, ест шаурму…
let hostTimer = null;
function hostAct(name, ms) {
  const f = document.querySelector(".host-fig");
  if (!f) return;
  f.className = "host-fig act-" + name;
  clearTimeout(f._t);
  f._t = setTimeout(() => { f.className = "host-fig"; }, ms || 1400);
}
function hostIdle() {
  clearInterval(hostTimer);
  hostTimer = setInterval(() => {
    const f = document.querySelector(".host-fig");
    if (!f || document.getElementById("lesson").hidden) return;
    if (f.className !== "host-fig") return;                  // уже что-то делает
    const acts = [["wave", 1700], ["eat", 2600], ["think", 1800], ["thumb", 1400], ["eat", 2600]];
    const [n, ms] = acts[Math.floor(Math.random() * acts.length)];
    hostAct(n, ms);
  }, 4200);
}
function hostHTML(question, inner) {
  const fig = window.friendFigureSVG ? window.friendFigureSVG(profile ? profile.gender : "m") : "";
  setTimeout(() => hostAct("talk", 1300), 60);   // задаёт вопрос — жестикулирует
  hostIdle();
  return `<div class="host">
      <div class="host-fig">${fig}<img class="host-food" src="assets/gift-shawarma.png" alt=""></div>
      <div class="host-bubble">
        <div class="host-name">${friendName()}</div>
        <div class="host-q">${question}</div>
        ${inner}
      </div>
    </div>`;
}

function showChooseTranslation(ex) {
  const word = lesson.words[ex.word];
  const others = lesson.words.filter(w => w !== word);
  const options = shuffle([word, ...shuffle(others).slice(0, 3)]);

  screen.innerHTML = hostHTML(ask(ASK_TR, "tr"), `
      <div class="word" dir="rtl">${word.he}</div>
      <div class="translit"><span class="tr">${word.tr}</span> <button class="listen small" id="listen" aria-label="Послушать">🔊</button></div>`) + `
    <div id="options"></div>
  `;

  document.getElementById("listen").onclick = () => speak(word.he, { audio: word.audio });
  speak(word.he, { audio: word.audio });

  const box = document.getElementById("options");
  // Картинки к вариантам — только если они есть у всех четырёх (иначе картинка подсказывала бы ответ)
  const withPics = typeof wordIcon === "function" && options.every(o => wordIcon(o, 10));
  if (withPics) box.classList.add("pic-options");
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "option";
    if (withPics) { btn.innerHTML = wordIcon(opt, 54) + "<span></span>"; btn.lastChild.textContent = opt.ru; }
    else btn.textContent = opt.ru;
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

  const pic = typeof wordIcon === "function" ? wordIcon(word, 72) : "";
  screen.innerHTML = hostHTML(ask(ASK_HE, "he").replace("$", word.ru), pic ? `<div class="q-pic">${pic}</div>` : "") + `
    <div id="options" class="he-options"></div>
  `;
  const box = document.getElementById("options");
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "option he-option";
    btn.innerHTML = `<span class="he" dir="rtl">${opt.he}</span><span class="tr">${opt.tr}</span>`;
    if (opt === word) btn.dataset.right = "1";
    btn.onclick = () => { speak(opt.he, { audio: opt.audio }); checkAnswer(btn, opt === word, ex, word); };
    box.appendChild(btn);
  });
}

// =====================================================
// НОВЫЕ ИГРЫ
// =====================================================
const ASK_LISTEN = [
  "Послушай, что я скажу. Что это значит?", "Угадай на слух!", "Слушай внимательно… Что я сказал{m:}{f:а}?",
  "Я скажу слово, а ты переведи", "Закрой глаза и послушай. Что это?"
];
const ASK_BUILD = [
  "Собери фразу: «$»", "Как сказать: «$»? Собери из слов", "Представь, что говоришь продавцу: «$»",
  "Скажи по-нашему, на иврите: «$»"
];
const ASK_MATCH = ["Соедини пары: слово — перевод", "Быстро! Найди пары", "Проверим память: найди пары"];

// --- «Выбери на слух»: слово не показываем, только звук ---
// «Не могу слушать» (как в Duolingo): на 15 минут задания на слух заменяются обычными
const NO_LISTEN_MIN = 15;
function noListen() { return Date.now() < store.get("nolisten_until", 0); }
function noListenText() {
  const t = new Date(store.get("nolisten_until", 0));
  return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}
function setNoListen(on) {
  store.set("nolisten_until", on ? Date.now() + NO_LISTEN_MIN * 60000 : 0);
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

function showListen(ex) {
  const word = lesson.words[ex.word];
  const others = lesson.words.filter(w => w !== word && w.ru !== word.ru);
  const options = shuffle([word, ...shuffle(others).slice(0, 3)]);
  screen.innerHTML = hostHTML(ask(ASK_LISTEN, "listen"), `
      <button class="listen big" id="listen" aria-label="Послушать">🔊</button>
      <div class="listen-hint">нажми, чтобы послушать ещё раз</div>
      <div class="word reveal" dir="rtl" id="reveal" hidden>${word.he}</div>`) + `
    <div id="options"></div>`;
  const play = () => { speak(word.he, { audio: word.audio }); const b = document.getElementById("listen"); b.classList.remove("ping"); void b.offsetWidth; b.classList.add("ping"); };
  document.getElementById("listen").onclick = play;
  setTimeout(play, 500);
  const box = document.getElementById("options");
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = opt.ru;
    if (opt === word) btn.dataset.right = "1";
    btn.onclick = () => { document.getElementById("reveal").hidden = false; checkAnswer(btn, opt === word, ex, word); };
    box.appendChild(btn);
  });
  const nl = document.createElement("button");
  nl.className = "no-listen"; nl.textContent = "🔇 Сейчас не могу слушать";
  nl.onclick = () => {
    setNoListen(true); playSound("pop");
    showToast(`Задания на слух выключены на ${NO_LISTEN_MIN} минут`);
    showChooseTranslation(ex);           // это же слово — но без звука
  };
  box.after(nl);
}

// --- «Собери фразу»: нажимай слова по порядку ---
const cleanTok = (t) => t.replace(/[?!.,]/g, "");
function showBuildPhrase(ex) {
  const ph = lesson.phrases[ex.phrase];
  const target = ph.he.split(" ").map(cleanTok);
  const extra = shuffle(lesson.words.filter(w => !w.he.includes(" ") && !target.includes(w.he)).map(w => w.he)).slice(0, 2);
  const tiles = shuffle([...target, ...extra]);
  screen.innerHTML = hostHTML(ask(ASK_BUILD, "build").replace("$", ph.ru), "") + `
    <div class="build-line" dir="rtl" id="bLine"><span class="build-empty">нажимай слова по порядку</span></div>
    <div class="build-pool" dir="rtl" id="bPool"></div>
    <button class="option check-btn" id="bCheck" disabled>Проверить</button>`;
  const line = document.getElementById("bLine"), pool = document.getElementById("bPool"), check = document.getElementById("bCheck");
  const refresh = () => {
    const n = line.querySelectorAll(".tile").length;
    check.disabled = n === 0;
    line.querySelector(".build-empty").hidden = n > 0;
  };
  tiles.forEach(t => {
    const b = document.createElement("button");
    b.className = "tile"; b.textContent = t; b.dir = "rtl";
    b.onclick = () => {
      if (b.parentNode === pool) { line.appendChild(b); speak(t); playSound("pop"); }
      else pool.appendChild(b);
      refresh();
    };
    pool.appendChild(b);
  });
  check.onclick = () => {
    const got = [...line.querySelectorAll(".tile")].map(b => b.textContent);
    const ok = got.join(" ") === target.join(" ");
    document.querySelectorAll(".tile").forEach(b => b.disabled = true);
    if (ok) { line.classList.add("good"); speak(ph.he, { audio: ph.audio }); }
    else line.classList.add("bad");
    checkAnswer(check, ok, ex, ph);
  };
}

// --- «Найди пары»: иврит слева, перевод справа ---
function showMatchPairs(ex) {
  const seen = new Set();
  const pairs = shuffle(lesson.words.slice(0, lesson.newCount || lesson.words.length)).concat(shuffle(lesson.words))
    .filter(w => !seen.has(w.ru) && seen.add(w.ru)).slice(0, 4);   // сначала новые слова урока
  screen.innerHTML = hostHTML(ask(ASK_MATCH, "match"), "") + `
    <div class="match">
      <div class="match-col" id="mHe"></div>
      <div class="match-col" id="mRu"></div>
    </div>`;
  let pick = null, left = pairs.length, hadError = false;
  const mk = (box, w, side) => {
    const b = document.createElement("button");
    b.className = "m-card " + side;
    b.innerHTML = side === "he" ? `<span class="he" dir="rtl">${w.he}</span><span class="tr">${w.tr}</span>` : w.ru;
    b.onpointerdown = (e) => { e.preventDefault(); b.onclick(); };   // срабатывает сразу при касании
    b.onclick = () => {
      if (b.disabled || b._busy) return;
      b._busy = true; setTimeout(() => b._busy = false, 250);         // защита от двойного срабатывания
      if (side === "he") speak(w.he, { audio: w.audio });
      if (pick && pick.b === b) { b.classList.remove("sel"); pick = null; return; }   // повторное касание — снять выбор
      if (!pick || pick.side === side) {          // выбрали первую карточку (или передумали)
        if (pick) pick.b.classList.remove("sel");
        pick = { b, w, side }; b.classList.add("sel"); playSound("pop"); return;
      }
      if (pick.w === w) {                          // пара!
        [pick.b, b].forEach(x => { x.classList.remove("sel"); x.classList.add("ok"); x.disabled = true; });
        playSound("pop"); vibrate("success");
        pick = null; left--;
        if (left === 0) setTimeout(() => checkAnswer(document.createElement("button"), !hadError, ex,
          { ru: "пары", he: "", tr: "" }, hadError ? "Были ошибки в парах — повторим это задание в конце урока" : ""), 400);
      } else {                                     // не пара
        hadError = true;
        [pick.b, b].forEach(x => { x.classList.remove("sel"); x.classList.add("no"); setTimeout(() => x.classList.remove("no"), 500); });
        playSound("wrong"); vibrate("error");
        pick = null;
      }
    };
    box.appendChild(b);
  };
  shuffle([...pairs]).forEach(w => mk(document.getElementById("mHe"), w, "he"));
  shuffle([...pairs]).forEach(w => mk(document.getElementById("mRu"), w, "ru"));
}

// --- «Блиц»: 30 секунд, слово за словом, два варианта — успей как можно больше ---
const BLITZ_SEC = 30;
function showBlitz(ex) {
  const pool = lesson.words.filter((w, i, arr) => arr.findIndex(x => x.ru === w.ru) === i);
  screen.innerHTML = hostHTML("Блиц! 30 секунд — успей перевести как можно больше слов!", `
      <div class="blitz-start"><button class="btn blue" id="blGo">Поехали! ⚡</button></div>`) + `<div id="blitz"></div>`;
  document.getElementById("blGo").onclick = () => {
    document.querySelector(".blitz-start").remove();
    let right = 0, total = 0, left = BLITZ_SEC, last = null, over = false;
    const box = document.getElementById("blitz");
    box.innerHTML = `<div class="bl-top"><div class="bl-bar"><div id="blBar"></div></div><b id="blTime">${left}</b></div>
      <div class="bl-score">✓ <b id="blOk">0</b></div>
      <div class="bl-word" dir="rtl" id="blWord"></div>
      <div class="bl-opts" id="blOpts"></div>`;
    const bar = document.getElementById("blBar");
    requestAnimationFrame(() => { bar.style.transition = `width ${BLITZ_SEC}s linear`; bar.style.width = "0%"; });
    const timer = setInterval(() => {
      left--; document.getElementById("blTime").textContent = left;
      if (left <= 5) document.getElementById("blTime").classList.add("hot");
      if (left <= 0) finish();
    }, 1000);
    const next = () => {
      let w; do { w = random(pool); } while (pool.length > 1 && w === last);
      last = w;
      const wrong = random(pool.filter(x => x !== w));
      const el = document.getElementById("blWord");
      el.textContent = w.he; el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
      const opts = document.getElementById("blOpts");
      opts.innerHTML = "";
      shuffle([w, wrong]).forEach(o => {
        const b = document.createElement("button");
        b.className = "bl-opt"; b.textContent = o.ru;
        b.onpointerdown = (e) => { e.preventDefault(); pick(o === w, b); };
        opts.appendChild(b);
      });
    };
    const pick = (ok, b) => {
      if (over) return;
      total++;
      if (ok) { right++; document.getElementById("blOk").textContent = right; playSound("pop"); b.classList.add("ok"); hostAct("thumb", 500); }
      else { playSound("wrong"); vibrate("error"); b.classList.add("no"); }
      setTimeout(next, ok ? 180 : 420);
    };
    const finish = () => {
      if (over) return; over = true; clearInterval(timer);
      const good = total > 0 && right / total >= 0.7 && right >= 5;
      document.getElementById("blOpts").innerHTML = "";
      document.getElementById("blWord").innerHTML = `<span class="bl-res">${right} из ${total}</span>`;
      setTimeout(() => checkAnswer(document.createElement("button"), good, ex, { ru: "", he: "", tr: "" },
        good ? "" : `Верно ${right} из ${total}. Нужно хотя бы 5 и 70% — попробуем ещё раз в конце урока`), 700);
    };
    next();
  };
}

// --- 3. Проверяем ответ ---
function checkAnswer(btn, isRight, ex, word, wrongDetail) {
  const all = document.querySelectorAll(".option");
  all.forEach(b => {
    b.disabled = true;
    if (b.dataset.right) b.classList.add("right");
    else if (b !== btn) b.classList.add("dim");
  });

  hostAct(isRight ? "cheer" : "oops", isRight ? 1300 : 1500);
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
    showFeedback(false, wrongDetail ? "Не страшно!" : "Правильный ответ:", wrongDetail || `${word.ru} — ${word.he} (${word.tr})`);
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
  markDone(lesson.id);
  if (typeof streakDone === "function") streakDone();     // день засчитан в серию
  // Идеальный урок (ни одной ошибки) — золотой, очки за урок ×2
  const perfect = mistakes === 0;
  if (perfect) {
    store.set(todayKey(), store.get(todayKey(), 0) + lessonPoints);   // добавляем ещё столько же
    lessonPoints *= 2;
    markPerfect(lesson.id);
  }
  const lvl = course && course.chapters[0].levels[0];
  const left = lvl ? lvl.lessons.filter(id => !doneLessons().includes(id)).length : 1;
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

      <h2 class="done${perfect ? " gold" : ""}">${perfect ? "Идеальный урок! 🏆" : "Урок пройден!"}</h2>
      <p class="task">«${lesson.title}» · Ошибок: ${mistakes}</p>
      ${perfect ? `<div class="perfect-badge">Без единой ошибки — урок стал <b>золотым</b>, очки <b>×2</b></div>` : ""}
      <div class="points-row">
        <div class="pts-big">+${lessonPoints}</div>
        <div class="pts-label">очков за урок${perfect ? " (×2)" : ""}<br>Сегодня всего: <b>${store.get(todayKey(), 0)}</b></div>
        ${combo >= 1 ? `<div class="pts-fire">${flameSVG(fireLevel(combo))}<span>${combo}</span></div>` : ""}
      </div>

      <!-- Бонус: сленговое выражение -->
      <div class="bonus" id="bonus"></div>

      ${left === 0 ? `<div class="unlock">🌯 Все 7 уроков пройдены — <b>квест «Первая шаурма» открыт!</b></div>` : ""}
      <button class="btn blue" onclick="showPath()">Дальше</button>
      <button class="btn ghost" onclick="startLesson('${lesson.id}')">Пройти ещё раз</button>
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
        <div class="bonus-tr"><span class="tr">${p.tr}</span> <button class="listen small" id="bonus-listen" aria-label="Послушать">🔊</button></div>
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
// ОЗВУЧКА. Сейчас — голос устройства. Место под настоящие голоса уже готово:
// если у слова/реплики в файле данных есть поле "audio" (например "audio": "seller/hello.mp3"),
// играется файл content/<язык>/audio/<путь>. Голос персонажа задаётся полем "voice" (seller, david, tsilya, hibri…).
let currentAudio = null;
function speak(text, opts) {
  const audio = opts && opts.audio;
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (audio) {
    currentAudio = new Audio(`content/${COURSE_LANG}/audio/${audio}`);
    currentAudio.volume = settings.voice / 100;
    currentAudio.play().catch(() => ttsFallback(text));      // файла нет — говорит устройство
    return;
  }
  ttsFallback(text);
}
function ttsFallback(text) {
  if (!("speechSynthesis" in window) || !text) return;
  if (!settings.voice) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "he-IL";
  u.volume = settings.voice / 100;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// Вибрация телефона (работает внутри Telegram)
function vibrate(kind) {
  if (!settings.vibro) return;
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
  pop:    { wave: "sine",     notes: [[520, 0, .07], [780, .05, .09]] },   // ингредиент лёг на поднос
  combo:  { wave: "triangle", notes: [[784, 0, .1], [988, .08, .1], [1175, .16, .1], [1568, .24, .3]] }  // «вжух» вверх
};
function playSound(name) {
  if (!SOUND_ON || !settings.sfx) return;
  const vol = 0.25 * settings.sfx / 100;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const s = SOUNDS[name], now = audioCtx.currentTime;
    s.notes.forEach(([freq, start, dur]) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = s.wave;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), now + start + 0.02);   // плавно громче
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);  // плавно тише
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    });
  } catch (e) { /* звук не обязателен — если не вышло, просто молчим */ }
}


// ---------- Окно настроек ----------
function openSettings() {
  let box = document.getElementById("settings");
  if (!box) { box = document.createElement("div"); box.id = "settings"; document.body.appendChild(box); }
  const seg = (key, list) => `<div class="set-seg">${list.map(([v, t]) =>
    `<button data-k="${key}" data-v="${v}" class="${String(settings[key]) === String(v) ? "on" : ""}">${t}</button>`).join("")}</div>`;
  const slider = (key, label, soon) => `<label class="set-row"><span>${label}${soon ? ` <i>скоро</i>` : ""}</span>
      <input type="range" min="0" max="100" step="10" data-k="${key}" value="${settings[key]}"><b>${settings[key]}</b></label>`;
  box.innerHTML = `<div class="set-sheet">
      <div class="set-head"><b>⚙️ Настройки</b><button class="set-x" id="setClose">✕</button></div>
      <div class="set-title">Тема</div>${seg("theme", [["auto", "Как в Telegram"], ["light", "Светлая"], ["dark", "Тёмная"]])}
      <div class="set-title">Звук</div>
      ${slider("sfx", "Звуки (верно, ошибка, огоньки)")}
      ${slider("voice", "Голос иврита")}
      ${slider("music", "Музыка", true)}
      ${noListen()
        ? `<div class="set-test"><span>🔇 Задания на слух выключены до ${noListenText()}</span><button class="btn ghost" id="listenOn">Включить</button></div>`
        : `<div class="set-test"><span>Нет наушников или шумно?</span><button class="btn ghost" id="listenOff">🔇 Не могу слушать</button></div>`}
      <div class="set-title">Транскрипция русскими буквами</div>
      ${seg("translit", [["false", "Без неё ⭐"], ["true", "Показывать"]])}
      <div class="set-note">⭐ Советуем учить без транскрипции — так слова запоминаются лучше. Но выбор за тобой.</div>
      <div class="set-title">Вибрация</div>${seg("vibro", [["true", "Вкл"], ["false", "Выкл"]])}
      <div class="set-title">Режим тестировщика</div>
      ${store.get("testmode", false)
        ? `<div class="set-test"><span>🔓 Включён: все уроки и уровни открыты</span><button class="btn ghost" id="testOff">Выключить</button></div>`
        : `<div class="set-test"><input type="password" inputmode="numeric" id="testPass" placeholder="Пароль" autocomplete="off"><button class="btn blue" id="testOn">Включить</button></div>`}
    </div>`;
  box.className = "show";
  box.onclick = (e) => { if (e.target === box) closeSettings(); };
  document.getElementById("setClose").onclick = closeSettings;
  box.querySelectorAll(".set-seg button").forEach(b => b.onclick = () => {
    const v = b.dataset.v; settings[b.dataset.k] = v === "true" ? true : v === "false" ? false : v;
    saveSettings(); playSound("pop"); openSettings();
  });
  // Режим тестировщика (пароль хранится не открытым текстом — защита от случайных игроков)
  const lOn = document.getElementById("listenOn"), lOff = document.getElementById("listenOff");
  if (lOn) lOn.onclick = () => { setNoListen(false); showToast("Задания на слух снова включены 🔊"); openSettings(); };
  if (lOff) lOff.onclick = () => { setNoListen(true); showToast(`Задания на слух выключены на ${NO_LISTEN_MIN} минут`); openSettings(); };
  const tOn = document.getElementById("testOn"), tOff = document.getElementById("testOff");
  if (tOn) tOn.onclick = () => {
    const v = document.getElementById("testPass").value.trim();
    if (testHash(v) === TEST_HASH) { store.set("testmode", true); showToast("Режим тестировщика включён 🔓"); vibrate("success"); afterTestToggle(); }
    else { showToast("Неверный пароль"); vibrate("error"); }
  };
  if (tOff) tOff.onclick = () => { store.set("testmode", false); showToast("Режим тестировщика выключен"); afterTestToggle(); };
  box.querySelectorAll("input[type=range]").forEach(r => {
    r.oninput = () => { settings[r.dataset.k] = +r.value; r.nextElementSibling.textContent = r.value; };
    r.onchange = () => { saveSettings(); if (r.dataset.k === "sfx") playSound("right"); if (r.dataset.k === "voice") speak("שָׁלוֹם"); };
  });
}
const TEST_HASH = 9530;
function testHash(t) { let h = 7; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) % 1000003; return h; }
function afterTestToggle() {
  openSettings();
  if (!document.getElementById("path").hidden && typeof renderPath === "function") renderPath();
}
function closeSettings() { const b = document.getElementById("settings"); if (b) b.className = ""; }

// ---------- Перед первым уроком: транскрипция или нет ----------
function askTranslit(then) {
  if (settings.translit !== null) { then(); return; }
  screen.innerHTML = hostHTML("Показывать, как читаются слова, русскими буквами?", `
      <div class="word" dir="rtl">שָׁלוֹם</div><div class="translit"><span class="tr-demo">шалом</span></div>`) + `
    <button class="option tr-choice" data-v="false"><b>Без транскрипции ⭐</b><br><small>Учу иврит по-настоящему — так лучше запоминается</small></button>
    <button class="option tr-choice" data-v="true"><b>С транскрипцией</b><br><small>Так проще на старте</small></button>
    <p class="set-note">Поменять можно в любой момент: ⚙️ Настройки на странице уроков.</p>`;
  screen.querySelectorAll(".tr-choice").forEach(b => b.onclick = () => {
    settings.translit = b.dataset.v === "true"; saveSettings(); playSound("pop"); then();
  });
}
applySettings();
// Серия дней: при открытии проверяем пропуски (заморозки тратятся сами)
if (typeof streakCheck === "function") { const m = streakCheck(); if (m) setTimeout(() => showToast(m), 900); updateToday(); }


// =====================================================
// ДОСКА ПОЧЁТА: золотая медаль главы → имя и фамилия на общей доске.
// Общая доска (видна всем) заработает, когда подключим сервер.
// Пока запись хранится на телефоне с пометкой «отправится на сервер».
// =====================================================
function showHonor() {
  stopHomeBird();
  document.querySelectorAll("body > section").forEach(sec => sec.hidden = sec.id !== "honor");
  if (tg && tg.BackButton) tg.BackButton.show();
  const box = document.getElementById("honor");
  const medals = store.get("medals", {});
  const goldCh = Object.keys(medals).filter(ch => medals[ch] === "gold");
  const me = store.get("honor", null);
  let form = "";
  if (me) {
    form = `<div class="hn-me"><div class="hn-row mine"><span class="hn-medal">🥇</span><b>${esc(me.first)} ${esc(me.last)}</b><small>глава ${me.chapter}</small></div>
      <p class="set-note">⏳ Твоя запись сохранена. Все увидят её на общей доске, как только мы подключим сервер.</p>
      <button class="link-btn" id="hnRemove">Убрать меня с доски</button></div>`;
  } else if (goldCh.length) {
    form = `<div class="hn-form">
      <b>Поздравляем! У тебя золотая медаль главы ${goldCh[0]} 🥇</b>
      <p>Впиши имя и фамилию — и попадёшь на доску почёта.</p>
      <input class="ob-input" id="hnFirst" maxlength="20" placeholder="Имя" value="${profile ? esc(profile.name) : ""}">
      <input class="ob-input" id="hnLast" maxlength="25" placeholder="Фамилия">
      <label class="hn-ok"><input type="checkbox" id="hnAgree"> Согласен(на), чтобы имя и фамилию видели другие пользователи</label>
      <button class="btn blue" id="hnSend" disabled>Попасть на доску почёта</button></div>`;
  } else {
    form = `<div class="hn-how">Как сюда попасть: пройди все уровни главы на золото — все уроки ★ и квесты без ошибок — и получи
      <b>золотую медаль главы 🥇</b>. Тогда здесь появится твоё имя.</div>`;
  }
  box.innerHTML = `
    <div class="hn-head">🏆</div>
    <h2 class="hn-title">Доска почёта</h2>
    <p class="task">Здесь все, кто прошёл главу на золотую медаль</p>
    ${form}
    <div class="hn-board">
      <div class="hn-empty">Общая доска заработает вместе с сервером — скоро здесь будут все обладатели золотых медалей.</div>
    </div>
    <button class="btn ghost" id="hnBack">На главную</button>`;
  document.getElementById("hnBack").onclick = showHome;
  const send = document.getElementById("hnSend");
  if (send) {
    const f = document.getElementById("hnFirst"), l = document.getElementById("hnLast"), ag = document.getElementById("hnAgree");
    const check = () => { send.disabled = !(f.value.trim().length >= 2 && l.value.trim().length >= 2 && ag.checked); };
    [f, l].forEach(x => x.oninput = check); ag.onchange = check; check();
    send.onclick = () => {
      store.set("honor", { first: f.value.trim(), last: l.value.trim(), chapter: goldCh[0], date: Date.now(), pending: true });
      playSound("finish"); vibrate("success"); showHonor();
    };
  }
  const rm = document.getElementById("hnRemove");
  if (rm) rm.onclick = () => { store.set("honor", null); showHonor(); };
}
function esc(s) { return String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }
document.getElementById("go-honor").onclick = showHonor;
