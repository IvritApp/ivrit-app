// =====================================================
// КВЕСТЫ И СЦЕНЫ-ДИАЛОГИ.
// Экран делится на две части:
//   сверху — картинка (такси едет / шаурмичная), реплики выскакивают пузырями над героями;
//   снизу — панель с вариантами ответа.
// Картинку рисует scene.js (createStage), здесь — только логика разговора.
// Тексты с {m:...}{f:...} подстраиваются под пол игрока.
// =====================================================
const questView = document.getElementById("quest");
let quest = null, qStep = 0, qMistakes = 0, qBag = [], qHinted = false;
let stage = null;            // текущая картинка-сцена
let qCombo = 0, qPoints = 0; // огоньки и очки в квесте

// Очки за квест: идеальный квест = в 1,5 раза больше, чем идеальный урок (10 заданий, ×2)
const QUEST_RATIO = 1.5;
function perfectRaw(n) { let s = 0; for (let i = 1; i <= n; i++) s += FIRE[fireLevel(i)].points; return s; }
// Сколько «ответов» в квесте: шаги-диалоги + каждый товар из списка покупок
function questSize() { return quest.steps.reduce((n, st) => n + (st.shop ? st.shop.list.length : 1), 0); }
function questFactor() { return QUEST_RATIO * perfectRaw(10) / perfectRaw(questSize()); }
function updateQuestFire(bump) {
  const box = document.getElementById("stFire");
  if (!box) return;
  if (qCombo < 1) { box.innerHTML = ""; box.className = "combo st-fire"; return; }
  box.className = "combo st-fire lvl" + fireLevel(qCombo);
  box.innerHTML = `${flameSVG(fireLevel(qCombo))}<span>${qCombo}</span>`;
  if (bump) { box.classList.remove("bump"); void box.offsetWidth; box.classList.add("bump"); }
}
let stageToken = 0;          // защита от «старых» таймеров, если ушли со сцены

// Названия того, что собираем, берутся из файла квеста (поле "items")
function itemName(x) { return (quest && quest.items && quest.items[x]) || x; }
// Уровень, к которому относится квест (ищем в course.json по полю "quest")
function questLevel(qid) {
  if (typeof course === "undefined" || !course) return null;
  for (const ch of course.chapters) for (let i = 0; i < ch.levels.length; i++)
    if (ch.levels[i].quest && "q-" + ch.levels[i].quest === qid) return { ch, lvl: ch.levels[i], n: i + 1 };
  return null;
}

// --- Общие помощники ---
function openQuestSection() {
  stopHomeBird();
  closeStage();
  document.querySelectorAll("body > section").forEach(sec => sec.hidden = sec.id !== "quest");
  if (tg && tg.BackButton) tg.BackButton.show();
}
function closeStage() {
  stageToken++;
  if (stage) { stage.destroy(); stage = null; }
}
// Каркас экрана: картинка сверху, ответы снизу
function renderStageShell(place, title, icon) {
  questView.innerHTML = `
    <div class="st-wrap">
      <div class="st-view" id="stView">
        <button class="st-order" id="stOrder" hidden>🧾 Мой заказ</button>
        <div class="combo st-fire" id="stFire"></div>
        <div class="q-tray" id="qTray" hidden></div>
        <div class="st-tap" id="stTap">нажми, чтобы дальше ›</div>
      </div>
      <div class="st-panel">
        <div class="st-hint" id="qHint" hidden></div>
        <div class="q-options" id="qOpts"></div>
      </div>
    </div>`;
  const make = place === "makolet" && window.createStore ? window.createStore
    : (window.PLACES && window.PLACES[place] && window.createPlace) ? window.createPlace : window.createStage;
  stage = make(document.getElementById("stView"), { gender: profile ? profile.gender : "m", profile, place });
  return stageToken;
}
// Пауза: ждём время ИЛИ нажатие на картинку (чтобы читающие быстро не скучали)
function waitOrTap(ms, token) {
  return new Promise(res => {
    const view = document.getElementById("stView");
    const tap = document.getElementById("stTap");
    const t2 = setTimeout(() => tap && tap.classList.add("show"), 2500);
    const done = () => { clearTimeout(t1); clearTimeout(t2); if (tap) tap.classList.remove("show"); if (view) view.onclick = null; if (token === stageToken) res(); };
    const t1 = setTimeout(done, ms);
    if (view) view.onclick = done;
  });
}
const readTime = (text) => 2000 + String(text).replace(/<[^>]+>/g, "").length * 60;
const nameTag = (n) => `<div class="hs-who">${n}</div>`;

// Реплика друга по-русски
function friendSays(text) { stage.say("friend", nameTag(friendName()) + `<div>${text}</div>`); }
// Реплика игрока
function meSays(html) { stage.say("me", nameTag(profile && profile.name ? profile.name : "Я") + html); }

// =====================================================
// СЦЕНА В ТАКСИ (перед уроками первого уровня)
// Сначала (один раз) — кино прилёта из второго чата.
// =====================================================
function showTaxi(onDone) {
  openQuestSection();
  const run = () => fetch(`content/${COURSE_LANG}/scenes/taxi.json`).then(r => r.json()).then(sc => playTaxi(sc, onDone));
  if (window.playArrivalScene && !store.get("arrivalSeen", false)) {
    questView.innerHTML = `<div id="sceneBox"></div>`;
    window.playArrivalScene(document.getElementById("sceneBox"), { gender: profile ? profile.gender : "m", profile, part: "arrival" }, () => {
      store.set("arrivalSeen", true); run();
    });
  } else run();
}

async function playTaxi(sc, onDone) {
  const token = renderStageShell("taxi", sc.title, "🚕");
  const opts = document.getElementById("qOpts");
  const alive = () => token === stageToken;
  await waitOrTap(1500, token);
  // Все реплики, кроме последней, — по очереди; последняя (вопрос) остаётся, пока игрок выбирает
  const lines = sc.lines;
  for (let k = 0; k < lines.length - 1; k++) { if (!alive()) return; friendSays(g(lines[k].ru)); await waitOrTap(readTime(g(lines[k].ru)), token); }
  if (!alive()) return;
  friendSays(g(lines[lines.length - 1].ru));
  await waitOrTap(1200, token); if (!alive()) return;
  sc.choice.forEach(ch => {
    const b = document.createElement("button");
    b.className = "option q-opt"; b.textContent = g(ch.ru);
    b.onclick = async () => {
      opts.innerHTML = "";
      playSound("pop");
      meSays(`<div>${g(ch.ru)}</div>`);
      await waitOrTap(2200, token); if (!alive()) return;
      friendSays(g(ch.reply)); await waitOrTap(readTime(g(ch.reply)), token);
      for (const l of sc.after) { if (!alive()) return; friendSays(g(l.ru)); await waitOrTap(readTime(g(l.ru)), token); }
      if (!alive()) return;
      opts.innerHTML = `<button class="btn blue">${sc.button}</button>`;
      opts.firstChild.onclick = () => { store.set("taxiSeen", true); closeStage(); onDone(); };
    };
    opts.appendChild(b);
  });
}

// =====================================================
// КВЕСТ «ПЕРВАЯ ШАУРМА»
// =====================================================
startQuest.preludeShown = {};
function startQuest(id) {
  openQuestSection();
  questView.innerHTML = `<div class="q-loading">Загрузка…</div>`;
  fetch(`content/${COURSE_LANG}/quests/${id}.json`)
    .then(r => r.json())
    .then(d => {
      // Перед первым прохождением — кусочек кино (поле "prelude" в файле квеста)
      const pre = d.prelude;
      if (pre && window.playArrivalScene && !startQuest.preludeShown[id] && !(pre.once && store.get("quest_" + d.id, false))) {
        startQuest.preludeShown[id] = true;
        questView.innerHTML = `<div id="sceneBox"></div>`;
        window.playArrivalScene(document.getElementById("sceneBox"), { gender: profile ? profile.gender : "m", profile, part: pre.scene }, () => startQuest(id));
        return;
      }
      quest = d; qStep = 0; qMistakes = 0; qBag = []; qCombo = 0; qPoints = 0;
      const token = renderStageShell(d.place || "counter", d.placeTitle || d.title, d.icon || "⭐");
      // Список заказа — по кнопке, а главное видно на прилавке
      const ob = document.getElementById("stOrder"), tray = document.getElementById("qTray");
      ob.hidden = false;
      ob.onclick = (e) => { e.stopPropagation(); tray.hidden = !tray.hidden; };
      tray.onclick = (e) => { e.stopPropagation(); tray.hidden = true; };
      tray.dataset.empty = d.emptyOrder || "Пока пусто";
      setTimeout(() => { if (token === stageToken) showQuestStep(); }, (stage && stage.introMs) ? stage.introMs + 300 : 1500);
    })
    .catch(() => { questView.innerHTML = `<p class="task">Не удалось загрузить квест 😕</p>`; });
}

// Реплика продавца: иврит + транскрипция + кнопки «послушать» и «перевод»
function sellerHTML(s, who) {
  const he = g(s.he), tr = g(s.tr);
  const id = "ru" + Math.floor(Math.random() * 1e6);
  const name = who || (stage && stage.hostName) || "Продавец";
  if (typeof ruMode === "function" && ruMode()) return `${nameTag(name)}<div class="ru-only">${g(s.ru)}</div>`;
  return `${nameTag(name)}<div class="he" dir="rtl">${he}</div>
    <div class="tr">${tr}</div>
    <div class="q-tools">
      <button class="q-tool" onclick="event.stopPropagation();speak(${JSON.stringify(he).replace(/"/g, "&quot;")})">🔊</button>
      <button class="q-tool" onclick="event.stopPropagation();document.getElementById('${id}').hidden=false;this.remove()">Перевод</button>
    </div>
    <div class="ru" id="${id}" hidden>${g(s.ru)}</div>`;
}

function showQuestStep() {
  if (qStep >= quest.steps.length) { finishQuest(); return; }
  const st = quest.steps[qStep];
  qHinted = false;
  if (st.shop) { startShopping(st); return; }
  if (st.ride) { startRide(st); return; }
  if (st.walk) { startWalkStep(st); return; }
  if (st.go) { startGoStep(st); return; }
  if (st.catch) { startCatch(st); return; }
  if (st.family) { startFamily(st); return; }
  document.getElementById("qHint").hidden = true;
  if (st.seller) { stage.say("seller", sellerHTML(st.seller)); speak(g(st.seller.he), { audio: st.seller.audio }); }
  else if (st.npc) { stage.say("npc", sellerHTML(st.npc, st.npc.name || (stage && stage.npcName) || "Прохожий")); speak(g(st.npc.he), { audio: st.npc.audio }); }
  else if (st.friend) friendSays(g(st.friend));

  const opts = document.getElementById("qOpts");
  opts.innerHTML = "";
  const token = stageToken;
  setTimeout(() => { if (token === stageToken) addQuestOptions(st, opts); }, 1100);
}
// =====================================================
// ГОЛОС: вместо нажатия на вариант — говоришь его вслух
// Работает там, где телефон умеет распознавать речь (Chrome, Safari…). Где не умеет — обычные кнопки.
// =====================================================
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function canSpeakNow() { return !!SR && !ruMode() && Date.now() >= store.get("nospeak_until", 0); }
function heNorm(t) {
  return String(t || "").replace(/[\u0591-\u05C7]/g, "").replace(/[־\-]/g, " ").replace(/[^\u05D0-\u05EA ]/g, "")
    .replace(/ך/g, "כ").replace(/ם/g, "מ").replace(/ן/g, "נ").replace(/ף/g, "פ").replace(/ץ/g, "צ").replace(/\s+/g, " ").trim();
}
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function heSim(a, b) { a = heNorm(a); b = heNorm(b); if (!a || !b) return 0; return 1 - lev(a, b) / Math.max(a.length, b.length); }
let qRec = null;
function listenHe(onText, onFail) {
  try { if (qRec) qRec.abort(); } catch (e) {}
  const r = new SR();
  qRec = r;
  r.lang = "he-IL"; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
  let got = false;
  r.onresult = (e) => { got = true; const alts = [...e.results[0]].map(x => x.transcript); onText(alts); };
  r.onerror = (e) => { got = true; onFail(e.error || "error"); };
  r.onend = () => { if (!got) onFail("no-speech"); qRec = null; };
  try { r.start(); } catch (e) { onFail("start"); }
}
function addQuestOptions(st, opts) {
  const voice = canSpeakNow();
  const btns = [];
  if (voice) {
    opts.insertAdjacentHTML("beforeend", `<div class="q-say-head">🎤 Скажи вслух правильную фразу</div>`);
  }
  shuffle([...st.options]).forEach(o => {
    const b = document.createElement("button");
    btns.push([b, o]);
    b.className = "option q-opt" + (voice ? " q-say" : "");
    b.innerHTML = ruMode() ? `<span class="ru-only">${g(o.ru)}</span><span class="he" hidden>${g(o.he)}</span>`
      : `<span class="he" dir="rtl">${g(o.he)}</span><span class="tr">${g(o.tr)}</span>`;
    b.onclick = () => { if (b.classList.contains("q-say")) { showToast("Скажи эту фразу вслух — нажми 🎤"); return; } chooseOption(b, o, st); };
    opts.appendChild(b);
  });
  if (!voice) return;
  const row = document.createElement("div");
  row.className = "q-mic-row";
  row.innerHTML = `<button class="q-mic" type="button"><span>🎤</span><b>Нажми и говори</b></button>
    <button class="q-mic-off" type="button">🙊 Не могу говорить</button><div class="q-heard" hidden></div>`;
  opts.appendChild(row);
  const mic = row.querySelector(".q-mic"), heard = row.querySelector(".q-heard");
  const tapMode = () => { btns.forEach(([b]) => b.classList.remove("q-say")); row.remove(); const h = opts.querySelector(".q-say-head"); if (h) h.remove(); };
  row.querySelector(".q-mic-off").onclick = () => { store.set("nospeak_until", Date.now() + 15 * 60000); showToast("Хорошо, 15 минут выбираешь кнопками"); tapMode(); };
  let misses = 0;
  mic.onclick = () => {
    if (mic.classList.contains("on")) { try { qRec && qRec.stop(); } catch (e) {} return; }
    mic.classList.add("on"); mic.querySelector("b").textContent = "Слушаю…";
    heard.hidden = true;
    listenHe((alts) => {
      mic.classList.remove("on"); mic.querySelector("b").textContent = "Нажми и говори";
      // какой вариант ближе всего к сказанному
      let best = null, bs = 0;
      btns.forEach(([b, o]) => { if (b.disabled) return; alts.forEach(t => { const sim = heSim(t, g(o.he)); if (sim > bs) { bs = sim; best = [b, o]; } }); });
      heard.hidden = false;
      heard.innerHTML = `Услышал: <span dir="rtl">${alts[0] || "…"}</span>`;
      if (best && bs >= 0.55) { best[0].classList.remove("q-say"); chooseOption(best[0], best[1], st); if (!best[1].ok) best[0].classList.add("q-say"); }
      else {
        misses++;
        playSound("wrong");
        heard.innerHTML += misses >= 2 ? " — не похоже. Можно нажать «🙊 Не могу говорить»" : " — не похоже ни на одну фразу. Ещё раз!";
      }
    }, (err) => {
      mic.classList.remove("on"); mic.querySelector("b").textContent = "Нажми и говори";
      if (err === "not-allowed" || err === "service-not-allowed" || err === "start" || err === "network" || err === "language-not-supported") {
        store.set("nospeak_until", Date.now() + 24 * 3600000);   // на сутки — кнопками
        showToast("Голос на этом телефоне не работает — выбирай кнопками");
        tapMode();
      } else { heard.hidden = false; heard.textContent = "Ничего не услышал 🙉 Нажми 🎤 и скажи погромче"; }
    });
  };
}

function chooseOption(btn, o, st) {
  const token = stageToken;
  if (o.ok) {
    document.querySelectorAll(".q-opt").forEach(b => b.disabled = true);
    btn.classList.add("right");
    playSound("right"); vibrate("success");
    document.getElementById("qHint").hidden = true;
    // огоньки, как в уроке
    const before = fireLevel(qCombo);
    qCombo++;
    const lvl = fireLevel(qCombo);
    qPoints += FIRE[lvl].points;
    updateQuestFire(true);
    if (lvl > before) setTimeout(() => showMilestone(lvl), 400);
    meSays(ruMode() ? `<div class="ru-only">${g(o.ru)}</div>` : `<div class="he" dir="rtl">${g(o.he)}</div><div class="tr2"><span class="tr">${g(o.tr)} — </span>${g(o.ru)}</div>`);
    speak(g(o.he), { audio: o.audio });
    if (o.add) addToTray([].concat(o.add));
    qStep++;
    setTimeout(() => { if (token !== stageToken) return; document.getElementById("qOpts").innerHTML = ""; stage.hide(); }, 2400);
    setTimeout(() => { if (token !== stageToken) return; showQuestStep(); }, 3000);
  } else {
    btn.classList.remove("wrong"); void btn.offsetWidth; btn.classList.add("wrong");
    btn.disabled = true;
    qMistakes++;
    if (qCombo >= 5) showToast(`Серия из ${qCombo} прервалась — начнём новую!`);
    qCombo = 0; updateQuestFire(false);
    playSound("wrong"); vibrate("error");
    if (!qHinted) {
      const h = document.getElementById("qHint");
      h.innerHTML = `💡 <b>${friendName()}:</b> ${st.hint}`;
      h.hidden = false; qHinted = true;
    }
  }
}

// =====================================================
// ПОКУПКИ ПО СПИСКУ (маколет): список на иврите, ходишь налево/направо и нажимаешь товары
// =====================================================
const VIEW_NAMES = ["Овощи и фрукты", "Касса и хлеб", "Холодильник"];
function startShopping(st) {
  const token = stageToken, sh = st.shop;
  const need = sh.list.map(x => x.item), got = [];
  friendSays(g(sh.intro));
  const opts = document.getElementById("qOpts");
  opts.innerHTML = `
    <div class="mk-list">${sh.list.map(x => `<button class="mk-chip" data-item="${x.item}">${ruMode() ? `<span class="ru-only">${g(x.ru)}</span>` : `<span class="he" dir="rtl">${g(x.he)}</span><span class="tr">${g(x.tr)}</span>`}</button>`).join("")}</div>
    <div class="mk-where" id="mkWhere">${(stage.viewNames || VIEW_NAMES)[stage.current()]}</div>
    <div class="mk-nav"><button class="btn ghost" id="mkL">◀ Налево</button><button class="btn ghost" id="mkR">Направо ▶</button></div>`;
  opts.querySelectorAll(".mk-chip").forEach(c => c.onclick = () => {
    const x = sh.list.find(y => y.item === c.dataset.item);
    speak(g(x.he), { audio: x.audio });
  });
  const go = (d) => {
    stage.look(stage.current() + d);
    const i = stage.current();
    document.getElementById("mkWhere").textContent = (stage.viewNames || VIEW_NAMES)[i];
    document.getElementById("mkL").disabled = i === 0;
    document.getElementById("mkR").disabled = i === stage.views - 1;
    stage.hide();
  };
  document.getElementById("mkL").onclick = () => go(-1);
  document.getElementById("mkR").onclick = () => go(1);
  stage.onSwipe = go;
  go(0);
  stage.onPick = listPicker(st, sh, need, got, opts, token, () => {
    stage.onSwipe = null;
    setTimeout(() => {
      if (token !== stageToken) return;
      friendSays(g(sh.done));
      opts.innerHTML = "";
      setTimeout(() => {
        if (token !== stageToken) return;
        stage.look(1); stage.hide();
        // покупки ложатся на прилавок
        got.forEach((k, i) => setTimeout(() => { if (token === stageToken) stage.food(k); }, 900 + i * 350));
        qStep++;
        setTimeout(() => { if (token === stageToken) showQuestStep(); }, 1300 + got.length * 350);
      }, 1800);
    }, 900);
  });
}

// Общая проверка «нажал на предмет»: правильный — галочка, огоньки, в «Мой заказ»; не тот — трясётся и подсказка
function listPicker(st, sh, need, got, opts, token, onAll) {
  return (kind, el) => {
    if (token !== stageToken) return;
    const x = sh.list.find(y => y.item === kind);
    if (x && !got.includes(kind)) {
      got.push(kind);
      stage.pick(el);
      const before = fireLevel(qCombo);
      qCombo++;
      const lvl = fireLevel(qCombo);
      qPoints += FIRE[lvl].points;
      updateQuestFire(true);
      if (lvl > before) setTimeout(() => showMilestone(lvl), 400);
      playSound("right"); vibrate("success");
      speak(g(x.he), { audio: x.audio });
      document.getElementById("qHint").hidden = true;
      const chip = opts.querySelector(`.mk-chip[data-item="${kind}"]`); if (chip) chip.classList.add("got");
      addToTray([kind], true);
      if (got.length === need.length) { stage.onPick = null; onAll(); }
    } else {
      if (x) { showToast("Это уже есть 🙂"); return; }
      stage.shake(el);
      qMistakes++;
      if (qCombo >= 5) showToast(`Серия из ${qCombo} прервалась — начнём новую!`);
      qCombo = 0; updateQuestFire(false);
      playSound("wrong"); vibrate("error");
      const h = document.getElementById("qHint");
      h.innerHTML = `💡 <b>${friendName()}:</b> ${(sh.wrong && sh.wrong[kind]) ? g(sh.wrong[kind]) : st.hint}`;
      h.hidden = false;
    }
  };
}

// =====================================================
// ПОЕЗДКА (автобус): садишься у окна, город едет мимо — нажимай места из списка, пока проезжаешь
// =====================================================
function startRide(st) {
  const token = stageToken, sh = st.ride;
  const need = sh.list.map(x => x.item), got = [];
  stage.hide();
  stage.startRide();
  friendSays(g(sh.intro));
  const opts = document.getElementById("qOpts");
  opts.innerHTML = `<div class="mk-list">${sh.list.map(x => `<button class="mk-chip" data-item="${x.item}">${ruMode() ? `<span class="ru-only">${g(x.ru)}</span>` : `<span class="he" dir="rtl">${g(x.he)}</span><span class="tr">${g(x.tr)}</span>`}</button>`).join("")}</div>
    <div class="mk-where">🚌 Едем… нажимай в окне, пока проезжаешь</div>`;
  opts.querySelectorAll(".mk-chip").forEach(c => c.onclick = () => {
    const x = sh.list.find(y => y.item === c.dataset.item);
    speak(g(x.he), { audio: x.audio });
  });
  stage.onPick = listPicker(st, sh, need, got, opts, token, () => {
    setTimeout(() => {
      if (token !== stageToken) return;
      stage.stopRide(false);
      friendSays(g(sh.done));
      opts.innerHTML = "";
      qStep++;
      setTimeout(() => { if (token === stageToken) { stage.hide(); showQuestStep(); } }, 2400);
    }, 900);
  });
}

// =====================================================
// ХОЖУ ДЖОЙСТИКОМ (шабат): подходишь к вещи из списка, берёшь, несёшь к столу — она встаёт на место
// =====================================================
function startWalkStep(st) {
  const token = stageToken, sh = st.walk;
  const need = sh.list.map(x => x.item), got = [];
  stage.hide();
  stage.startWalk();
  friendSays(g(sh.intro));
  const opts = document.getElementById("qOpts");
  opts.innerHTML = `<div class="mk-list">${sh.list.map(x => `<button class="mk-chip" data-item="${x.item}">${ruMode() ? `<span class="ru-only">${g(x.ru)}</span>` : `<span class="he" dir="rtl">${g(x.he)}</span><span class="tr">${g(x.tr)}</span>`}</button>`).join("")}</div>
    <div class="mk-where">🕹️ Иди джойстиком · подойди к вещи и нажми «Взять» · отнеси к столу</div>`;
  opts.querySelectorAll(".mk-chip").forEach(c => c.onclick = () => {
    const x = sh.list.find(y => y.item === c.dataset.item);
    speak(g(x.he), { audio: x.audio });
  });
  stage.onPick = listPicker(st, sh, need, got, opts, token, () => {});
  stage.onPlaced((k, n) => {
    if (token !== stageToken) return;
    const chip = opts.querySelector(`.mk-chip[data-item="${k}"]`); if (chip) chip.classList.add("placed");
    if (n < need.length) { friendSays(g(sh.placed || "На стол! Дальше.")); return; }
    setTimeout(() => {
      if (token !== stageToken) return;
      friendSays(g(sh.done));
      opts.innerHTML = "";
      qStep++;
      setTimeout(() => { if (token === stageToken) { stage.hide(); showQuestStep(); } }, 2400);
    }, 700);
  });
}

// =====================================================
// ЛОВИ ОШИБКУ НА СЛУХ (кафе): официантка повторяет заказ / называет сумму — и где-то ошибается.
// Текст сначала скрыт: слушаешь. Нажимаешь то, что она перепутала.
// catch = { intro, say:{he,tr,ru}, chips:[{id, he, tr, ru}], right: id, receipt:[{he, tr, price}], done, wrong:{id: текст} }
// =====================================================
function startCatch(st) {
  const token = stageToken, c = st.catch;
  stage.hide();
  document.getElementById("qHint").hidden = true;
  friendSays(g(c.intro));
  const opts = document.getElementById("qOpts");
  const chip = (x) => `<button class="mk-chip q-catch" data-id="${x.id}">${x.he ? `<span class="he" dir="rtl">${g(x.he)}</span>` : ""}${x.tr ? `<span class="tr">${g(x.tr)}</span>` : ""}${!x.he && x.ru ? `<span class="q-catch-ru">${g(x.ru)}</span>` : ""}</button>`;
  const receipt = c.receipt ? `<div class="q-receipt"><div class="q-receipt-h">🧾 Чек</div>${c.receipt.map(r => `<div class="q-receipt-row"><span class="he" dir="rtl">${g(r.he)}</span><b>${r.price} ₪</b></div>`).join("")}
    <div class="q-receipt-row sum"><span>Итого</span><b>${c.receipt.reduce((a, r) => a + r.price, 0)} ₪</b></div></div>` : "";
  opts.innerHTML = `${receipt}<div class="mk-where">👂 ${g(c.task || "Слушай! Что она перепутала? Нажми это.")}</div>
    <div class="mk-list">${c.chips.map(chip).join("")}</div>`;
  let answered = false;
  // официантка говорит; текст спрятан — только звук
  setTimeout(() => {
    if (token !== stageToken) return;
    const he = g(c.say.he), id = "cs" + Math.floor(Math.random() * 1e6);
    stage.say("seller", `${nameTag(stage.hostName || "Официантка")}
      <div class="q-hidden-say" id="${id}"><div class="he" dir="rtl">${he}</div><div class="tr">${g(c.say.tr)}</div></div>
      <div class="q-tools"><button class="q-tool" onclick="event.stopPropagation();speak(${JSON.stringify(he).replace(/"/g, "&quot;")})">🔊 Ещё раз</button>
      <button class="q-tool" onclick="event.stopPropagation();document.getElementById('${id}').classList.add('open');this.remove()">Показать текст</button></div>`);
    speak(he, { audio: c.say.audio });
  }, 2200);
  opts.querySelectorAll(".q-catch").forEach(b => b.onclick = () => {
    if (answered || token !== stageToken) return;
    if (b.dataset.id === c.right) {
      answered = true;
      b.classList.add("got");
      const before = fireLevel(qCombo); qCombo++; const lvl = fireLevel(qCombo);
      qPoints += FIRE[lvl].points; updateQuestFire(true);
      if (lvl > before) setTimeout(() => showMilestone(lvl), 400);
      playSound("right"); vibrate("success");
      document.getElementById("qHint").hidden = true;
      const hs = document.querySelector(".q-hidden-say"); if (hs) hs.classList.add("open");
      setTimeout(() => {
        if (token !== stageToken) return;
        stage.hide(); friendSays(g(c.done)); opts.innerHTML = "";
        qStep++;
        setTimeout(() => { if (token === stageToken) { stage.hide(); showQuestStep(); } }, 2600);
      }, 1100);
    } else {
      b.classList.remove("wrong"); void b.offsetWidth; b.classList.add("wrong");
      qMistakes++;
      if (qCombo >= 5) showToast(`Серия из ${qCombo} прервалась — начнём новую!`);
      qCombo = 0; updateQuestFire(false);
      playSound("wrong"); vibrate("error");
      const h = document.getElementById("qHint");
      h.innerHTML = `💡 <b>${friendName()}:</b> ${g((c.wrong && c.wrong[b.dataset.id]) || c.hint || "Послушай ещё раз — нажми 🔊")}`;
      h.hidden = false;
    }
  });
}

// =====================================================
// ДОЙДИ ДЖОЙСТИКОМ (автобус): идёшь по улице к двери, нажимаешь — заходишь внутрь, там новая сцена
// =====================================================
function startGoStep(st) {
  const token = stageToken, go = st.go;
  stage.hide();
  document.getElementById("qHint").hidden = true;
  const opts = document.getElementById("qOpts");
  opts.innerHTML = `<div class="mk-where">🕹️ ${g(go.how || "Иди джойстиком и нажми на дверь")}</div>`;
  stage.startWalk({ onGo: () => {
    if (token !== stageToken) return;
    opts.innerHTML = "";
    stage.hide();
    if (go.scene) stage.showFamily(null, null, go.scene);
    if (go.done) friendSays(g(go.done));
    qStep++;
    setTimeout(() => { if (token === stageToken) { stage.hide(); showQuestStep(); } }, go.done ? 2200 : 600);
  } });
  friendSays(g(go.intro));
}

// =====================================================
// СЕМЬЯ ЗА СТОЛОМ: все знакомятся, потом мини-тест «покажи, кто здесь …»
// =====================================================
function startFamily(st) {
  const token = stageToken, fm = st.family, gk = profile && profile.gender === "f" ? "f" : "m";
  const members = fm.members[gk], quiz = fm.quiz[gk];
  const opts = document.getElementById("qOpts");
  opts.innerHTML = "";
  let q = -1, answering = false;
  stage.hide();
  stage.showFamily(members, (id, el) => {
    if (token !== stageToken || !answering) return;
    const cur = quiz[q];
    if (id === cur.id) {
      answering = false;
      stage.famHappy(el); el.classList.add("pl-ok");
      const before = fireLevel(qCombo); qCombo++; const lvl = fireLevel(qCombo);
      qPoints += FIRE[lvl].points; updateQuestFire(true);
      if (lvl > before) setTimeout(() => showMilestone(lvl), 400);
      playSound("right"); vibrate("success");
      document.getElementById("qHint").hidden = true;
      const m = members.find(x => x.id === id);
      speak(g(cur.he));
      friendSays(`Да! ${m.name} — ${g(cur.ru)} 👏`);
      setTimeout(() => { if (token === stageToken) { el.classList.remove("pl-ok"); nextQ(); } }, 1900);
    } else {
      stage.famShake(el);
      qMistakes++;
      if (qCombo >= 5) showToast(`Серия из ${qCombo} прервалась — начнём новую!`);
      qCombo = 0; updateQuestFire(false);
      playSound("wrong"); vibrate("error");
      const h = document.getElementById("qHint");
      h.innerHTML = `💡 <b>${friendName()}:</b> ${g(cur.he)} — это «${g(cur.ru)}».`;
      h.hidden = false;
    }
  });
  friendSays(g(fm.intro));
  // по очереди: каждый говорит, кто он
  let i = 0;
  const hello = () => {
    if (token !== stageToken) return;
    if (i >= members.length) { stage.hide(); setTimeout(nextQ, 500); return; }
    const m = members[i++];
    stage.say(m.id, sellerHTML(m, m.name));
    speak(g(m.he), { audio: m.audio });
    setTimeout(hello, Math.max(2600, readTime(g(m.ru)) + 900));
  };
  setTimeout(hello, 2200);
  function nextQ() {
    if (token !== stageToken) return;
    q++;
    if (q >= quiz.length) {
      friendSays(g(fm.done));
      opts.innerHTML = "";
      qStep++;
      setTimeout(() => { if (token === stageToken) { stage.hide(); showQuestStep(); } }, 2400);
      return;
    }
    const cur = quiz[q];
    friendSays(`Покажи, кто здесь <b dir="rtl">${g(cur.he)}</b>?`);
    opts.innerHTML = `<div class="q-fam-ask">${ruMode() ? `Нажми на того, кто «${g(cur.ru)}»` : `<span class="he" dir="rtl">${g(cur.he)}</span> <span class="tr">${g(cur.tr)}</span> — нажми на этого человека за столом`} <button class="q-tool" id="famSay">🔊</button></div>`;
    document.getElementById("famSay").onclick = (e) => { e.stopPropagation(); speak(g(cur.he)); };
    speak(g(cur.he));
    answering = true;
  }
}

// Ингредиенты появляются на подносе (поверх картинки)
function addToTray(items, noStage) {
  const tray = document.getElementById("qTray");
  items.forEach((it, k) => setTimeout(() => {
    if (!tray.isConnected) return;
    qBag.push(it);
    const el = document.createElement("div");
    el.className = "q-ing";
    el.innerHTML = `${stage && stage.itemIcon ? `<i class="q-ing-svg">${stage.itemIcon(it, 40)}</i>` : `<img src="assets/ing-${it}.png" alt="">`}<span>${itemName(it)}</span>`;
    tray.appendChild(el);
    if (stage && stage.food && !noStage) stage.food(it);
    playSound("pop");
  }, k * 250));
}

// --- Финал ---
function finishQuest() {
  if (typeof streakDone === "function") streakDone();     // квест тоже засчитывает день
  const token = stageToken;
  const o = quest.outro;
  stage.say("seller", sellerHTML(o.seller)); speak(g(o.seller.he), { audio: o.seller.audio });
  document.getElementById("qOpts").innerHTML = "";
  const perfect = qMistakes === 0;
  const pts = Math.round(qPoints * questFactor() * (perfect ? 2 : 1));
  store.set(todayKey(), store.get(todayKey(), 0) + pts);
  store.set("quest_" + quest.id, true);
  if (perfect) store.set("questGold_" + quest.id, true);
  // итог уровня
  const where = questLevel(quest.id);
  const lvlInfo = where ? where.lvl : null;
  const goldN = lvlInfo ? lvlInfo.lessons.filter(id => perfectLessons().includes(id)).length : 0;
  const totalN = lvlInfo ? lvlInfo.lessons.length : 7;
  const fin = quest.final || {};
  const rule = (fin.imgIf || []).find(r => qBag.includes(r.has));
  const finalImg = rule ? rule.img : (fin.img || "gift-shawarma");
  const order = qBag.map(itemName).join(", ");
  // продавец заворачивает шаурму и протягивает тебе
  setTimeout(() => { if (token === stageToken && stage) stage.wrap(finalImg); }, 2600);
  setTimeout(() => {
    if (token !== stageToken) return;
    closeStage();
    playSound("finish"); vibrate("success");
    questView.innerHTML = `
      <div class="q-final">
        ${window.placeGift && placeGift(finalImg) ? `<div class="q-final-img q-final-svg">${placeGift(finalImg)}</div>` : `<img class="q-final-img" src="assets/${finalImg}.png" alt="${fin.alt || quest.title}">`}
        <h2 class="done${perfect ? " gold" : ""}">${perfect ? "Идеальный квест! 🏆" : "Квест пройден! 🎉"}</h2>
        ${lvlInfo && levelGold(lvlInfo) ? `<div class="lvl-gold">🏅 Уровень золотой! ${where.ch.levels.every(levelGold) ? "Все уровни главы золотые 🥇" : `Ещё ${where.ch.levels.length - where.ch.levels.filter(levelGold).length} — и золотая медаль главы 🥇`}</div>` : ""}
        <div class="lvl-done">
          <div class="lvl-badge">🏁</div>
          <div><b>Уровень ${where ? where.n : 1} «${lvlInfo ? lvlInfo.title : quest.title}» пройден!</b><br>
          <span>Золотых уроков: ★ ${goldN} из ${totalN}${perfect ? " · квест золотой 🏆" : ""}</span></div>
        </div>
        <p class="task">Твой заказ: ${order}</p>
        <div class="points-row" style="animation-delay:.3s">
          <div class="pts-big">+${pts}</div>
          <div class="pts-label">очков за квест${perfect ? " (×2)" : ""}<br>Ошибок: ${qMistakes}</div>
        </div>
        <div class="q-friend-say"><b>${friendName()}:</b> ${g(qMistakes ? o.friend_mistakes : o.friend)}</div>
        <button class="btn blue" onclick="showPath()">К уровню</button>
        <button class="btn ghost" onclick="startQuest('${quest.id.replace("q-", "")}')">Пройти ещё раз</button>
      </div>`;
    window.scrollTo(0, 0);
  }, 6600);
}
